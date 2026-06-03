#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const artifactsRoot = path.resolve('..', 'migration_artifacts')
const runStamp = new Date().toISOString().replace(/[:.]/g, '-')
const args = parseArgs(process.argv.slice(2))
const outputDir = path.resolve(args.output || path.join(artifactsRoot, `wp-video-normalization-${runStamp}`))
const dryRun = !args.apply
const maxArticles = Number(args.limit || 0)

const cms = {
  baseURL: cleanBaseURL(process.env.CMS_BASE_URL || 'https://cms-ai.onrender.com'),
  email: process.env.CMS_EMAIL || '',
  password: process.env.CMS_PASSWORD || '',
}

if (!cms.email || !cms.password) {
  console.error('CMS_EMAIL and CMS_PASSWORD are required.')
  process.exit(1)
}

try {
  const token = await loginToPayload()
  const articles = await fetchImportedArticles({ token })
  const selectedArticles = maxArticles > 0 ? articles.slice(0, maxArticles) : articles
  const report = await normalizeArticles({ articles: selectedArticles, token })

  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(path.join(outputDir, 'video-normalization-report.json'), `${JSON.stringify(report, null, 2)}\n`)
  await fs.writeFile(path.join(outputDir, 'video-normalization-summary.md'), renderMarkdown(report), 'utf8')

  console.log(
    JSON.stringify(
      {
        dryRun,
        outputDir,
        summary: report.summary,
      },
      null,
      2,
    ),
  )
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exit(1)
}

async function normalizeArticles({ articles, token }) {
  const results = []

  for (const article of articles) {
    const normalized = normalizeArticleContent(article)

    if (!normalized.changed) {
      results.push({
        action: 'skip',
        id: article.id,
        languageCode: article.languageCode,
        legacyURL: article.legacySource?.wpURL || null,
        slug: article.slug,
        title: article.title,
        ...normalized.metrics,
      })
      continue
    }

    if (dryRun) {
      results.push({
        action: 'dry-run-update',
        id: article.id,
        languageCode: article.languageCode,
        legacyURL: article.legacySource?.wpURL || null,
        slug: article.slug,
        title: article.title,
        ...normalized.metrics,
      })
      continue
    }

    try {
      await payloadRequest({
        body: {
          content: normalized.content,
        },
        method: 'PATCH',
        pathname: `/api/articles/${article.id}`,
        token,
      })

      results.push({
        action: 'updated',
        id: article.id,
        languageCode: article.languageCode,
        legacyURL: article.legacySource?.wpURL || null,
        slug: article.slug,
        title: article.title,
        ...normalized.metrics,
      })
    } catch (error) {
      results.push({
        action: 'error',
        error: error instanceof Error ? error.message : String(error),
        id: article.id,
        languageCode: article.languageCode,
        legacyURL: article.legacySource?.wpURL || null,
        slug: article.slug,
        title: article.title,
        ...normalized.metrics,
      })
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'apply',
    results,
    summary: summarize(results),
  }
}

function normalizeArticleContent(article) {
  const content = clone(article.content || emptyContent())
  const children = Array.isArray(content.root?.children) ? content.root.children : []
  const existingVideoKeys = collectExistingVideoKeys(children)
  const nextChildren = []
  const metrics = {
    htmlEmbedsChanged: 0,
    htmlEmbedsScanned: 0,
    skippedDuplicateVideos: 0,
    videoBlocksBefore: countVideoBlocks(children),
    videoBlocksCreated: 0,
    videoCandidatesFound: 0,
  }

  children.forEach((node, blockIndex) => {
    const fields = node?.fields || {}

    if (node?.type !== 'block' || fields.blockType !== 'htmlEmbed') {
      nextChildren.push(node)
      return
    }

    metrics.htmlEmbedsScanned += 1

    const normalized = normalizeHTMLBlock({
      article,
      blockIndex,
      existingVideoKeys,
      html: String(fields.html || ''),
    })

    metrics.videoCandidatesFound += normalized.candidates
    metrics.videoBlocksCreated += normalized.videoBlocksCreated
    metrics.skippedDuplicateVideos += normalized.skippedDuplicateVideos

    if (!normalized.changed) {
      nextChildren.push(node)
      return
    }

    metrics.htmlEmbedsChanged += 1
    nextChildren.push(...normalized.nodes)
  })

  content.root = {
    ...(content.root || {}),
    children: nextChildren.length ? nextChildren : emptyContent().root.children,
  }

  metrics.videoBlocksAfter = metrics.videoBlocksBefore + metrics.videoBlocksCreated

  return {
    changed: metrics.htmlEmbedsChanged > 0,
    content,
    metrics,
  }
}

function normalizeHTMLBlock({ article, blockIndex, existingVideoKeys, html }) {
  const candidates = collectVideoCandidates(html)

  if (!candidates.length) {
    return {
      candidates: 0,
      changed: false,
      nodes: [],
      skippedDuplicateVideos: 0,
      videoBlocksCreated: 0,
    }
  }

  const nodes = []
  let cursor = 0
  let videoIndex = 0
  let skippedDuplicateVideos = 0

  for (const candidate of candidates) {
    const beforeHTML = html.slice(cursor, candidate.start)

    pushHTMLNodes(nodes, beforeHTML, {
      id: `wp-${article.id}-${blockIndex}-${nodes.length}-html`,
      label: 'Imported WP body',
    })

    const videoFields = buildVideoFields({
      article,
      candidate,
      index: videoIndex,
    })

    if (!videoFields) {
      pushHTMLNodes(nodes, candidate.html, {
        id: `wp-${article.id}-${blockIndex}-${nodes.length}-video-fallback`,
        label: 'Imported WP video fallback',
      })
    } else {
      const videoKey = videoStorageKey(videoFields)

      if (existingVideoKeys.has(videoKey)) {
        skippedDuplicateVideos += 1
      } else {
        existingVideoKeys.add(videoKey)
        nodes.push(blockNode(videoFields))
      }
    }

    videoIndex += 1
    cursor = candidate.end
  }

  pushHTMLNodes(nodes, html.slice(cursor), {
    id: `wp-${article.id}-${blockIndex}-${nodes.length}-html-tail`,
    label: 'Imported WP body',
  })

  return {
    candidates: candidates.length,
    changed: true,
    nodes: nodes.length ? nodes : [htmlBlockNode({ html: '<p></p>', id: `wp-${article.id}-${blockIndex}-empty`, label: 'Imported WP body' })],
    skippedDuplicateVideos,
    videoBlocksCreated: nodes.filter((node) => node?.fields?.blockType === 'video').length,
  }
}

function collectVideoCandidates(html) {
  const source = String(html || '')
  const candidates = []

  addWrappedCandidates({ candidates, pattern: /<figure\b[\s\S]*?<\/figure>/giu, source })
  addWrappedCandidates({ candidates, pattern: /<video\b[\s\S]*?<\/video>/giu, source })
  addSingleTagCandidates({ candidates, pattern: /<iframe\b[^>]*><\/iframe>/giu, source })
  addAnchorMP4Candidates({ candidates, source })

  return candidates
    .filter((candidate) => canBuildVideo(candidate.html))
    .sort((left, right) => left.start - right.start)
    .reduce((cleaned, candidate) => {
      const previous = cleaned[cleaned.length - 1]

      if (previous && candidate.start < previous.end) {
        return cleaned
      }

      cleaned.push(candidate)
      return cleaned
    }, [])
}

function addWrappedCandidates({ candidates, pattern, source }) {
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) {
      continue
    }

    if (!canBuildVideo(match[0])) {
      continue
    }

    candidates.push({
      end: match.index + match[0].length,
      html: match[0],
      start: match.index,
    })
  }
}

function addSingleTagCandidates({ candidates, pattern, source }) {
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined || !canBuildVideo(match[0])) {
      continue
    }

    candidates.push({
      end: match.index + match[0].length,
      html: match[0],
      start: match.index,
    })
  }
}

function addAnchorMP4Candidates({ candidates, source }) {
  const pattern = /<a\b[^>]*href=(["'])(https?:\/\/[^"']+\.(?:mp4|mov|webm)(?:\?[^"']*)?)\1[^>]*>[\s\S]*?<\/a>/giu

  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) {
      continue
    }

    candidates.push({
      end: match.index + match[0].length,
      html: match[0],
      start: match.index,
    })
  }
}

function canBuildVideo(html) {
  const source = String(html || '')

  return /youtube(?:-nocookie)?\.com|youtu\.be|vimeo\.com|https?:\/\/[^\s"'<>]+?\.(?:mp4|mov|webm)(?:[?#][^\s"'<>]*)?/iu.test(
    source,
  )
}

function buildVideoFields({ article, candidate, index }) {
  const iframe = firstTag(candidate.html, 'iframe')
  const video = firstTag(candidate.html, 'video')
  const link = firstTag(candidate.html, 'a')
  const source = firstTag(candidate.html, 'source')
  const caption = extractCaption(candidate.html)
  const title =
    cleanText(iframe?.attrs.title || link?.text || caption || article.title || `Imported video ${index + 1}`) ||
    `Imported video ${index + 1}`
  const description = cleanText(article.summary || caption || 'Imported WordPress video.')
  const dimensions = inferDimensions(iframe?.attrs || video?.attrs || {})
  const orientation = inferOrientation({
    height: dimensions.height,
    sourceURL: iframe?.attrs.src || video?.attrs.src || source?.attrs.src || link?.attrs.href || '',
    width: dimensions.width,
  })
  const common = {
    align: 'center',
    blockName: title,
    blockType: 'video',
    caption,
    description,
    duration: '',
    id: `wp-video-${article.id}-${index}-${hash(candidate.html)}`,
    maxWidth: inferMaxWidth({ orientation, width: dimensions.width }),
    orientation,
    schema: {
      description,
      name: title,
    },
    size: orientation === 'vertical' ? 'medium' : 'full',
    title,
    uploadDate: article.publishedAt || article.createdAt || '',
  }

  if (iframe?.attrs.src) {
    const sourceURL = normalizeExternalURL(iframe.attrs.src)
    const youtubeID = getYouTubeID(sourceURL)
    const vimeoID = getVimeoID(sourceURL)

    if (youtubeID) {
      return {
        ...common,
        contentURL: '',
        embedURL: `https://www.youtube-nocookie.com/embed/${youtubeID}`,
        sourceType: 'youtube',
        thumbnailURL: `https://i.ytimg.com/vi/${youtubeID}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${youtubeID}`,
      }
    }

    if (vimeoID) {
      return {
        ...common,
        contentURL: '',
        embedURL: `https://player.vimeo.com/video/${vimeoID}`,
        sourceType: 'youtube',
        thumbnailURL: `https://vumbnail.com/${vimeoID}.jpg`,
        url: sourceURL,
      }
    }
  }

  const directURL = normalizeExternalURL(
    video?.attrs.src || source?.attrs.src || link?.attrs.href || firstDirectVideoURL(candidate.html) || '',
  )

  if (directURL) {
    return {
      ...common,
      contentURL: directURL,
      embedURL: '',
      sourceType: 'externalMP4',
      thumbnailURL: decodeEntities(video?.attrs.poster || ''),
      url: directURL,
    }
  }

  return null
}

function pushHTMLNodes(nodes, html, { id, label }) {
  const chunks = splitHTMLIntoBlocks(html)

  chunks.forEach((chunk, index) => {
    if (!hasMeaningfulHTML(chunk)) {
      return
    }

    nodes.push(
      htmlBlockNode({
        html: chunk,
        id: chunks.length === 1 ? id : `${id}-${index + 1}`,
        label: chunks.length === 1 ? label : `${label} part ${index + 1}`,
      }),
    )
  })
}

function htmlBlockNode({ html, id, label }) {
  return {
    fields: {
      blockName: label,
      blockType: 'htmlEmbed',
      html,
      id,
      label,
    },
    format: '',
    type: 'block',
    version: 2,
  }
}

function blockNode(fields) {
  return {
    fields,
    format: '',
    type: 'block',
    version: 2,
  }
}

function collectExistingVideoKeys(children) {
  const keys = new Set()

  for (const node of children) {
    if (node?.fields?.blockType !== 'video') {
      continue
    }

    keys.add(videoStorageKey(node.fields))
  }

  return keys
}

function videoStorageKey(fields) {
  return String(fields.embedURL || fields.contentURL || fields.url || '').trim().toLowerCase()
}

function countVideoBlocks(children) {
  return children.filter((node) => node?.fields?.blockType === 'video').length
}

function splitHTMLIntoBlocks(html) {
  const maxLength = 38_000
  const source = String(html || '').trim()

  if (!source) {
    return []
  }

  if (source.length <= maxLength) {
    return [source]
  }

  const boundaryMarked = source.replace(
    /(<\/(?:blockquote|div|figure|h[1-6]|li|ol|p|section|table|tbody|td|th|thead|tr|ul)>)/giu,
    '$1\n<!--WP_VIDEO_NORMALIZE_SPLIT-->',
  )
  const pieces = boundaryMarked.split('<!--WP_VIDEO_NORMALIZE_SPLIT-->').filter((piece) => piece.trim())
  const chunks = []
  let current = ''

  for (const piece of pieces.length ? pieces : [source]) {
    if ((current + piece).length > maxLength && current.trim()) {
      chunks.push(current.trim())
      current = piece
      continue
    }

    current += piece
  }

  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks
}

function hasMeaningfulHTML(html) {
  const source = String(html || '').trim()

  if (!source) {
    return false
  }

  const withoutEmptyWrappers = source
    .replace(/<p>\s*<\/p>/giu, '')
    .replace(/<figure[^>]*>\s*<\/figure>/giu, '')
    .replace(/\s+/gu, '')

  return Boolean(withoutEmptyWrappers)
}

function firstTag(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'iu')
  const paired = pattern.exec(String(html || ''))
  const single = paired ? null : new RegExp(`<${tagName}\\b([^>]*)>`, 'iu').exec(String(html || ''))
  const match = paired || single

  if (!match) {
    return null
  }

  return {
    attrs: parseAttrs(match[1] || ''),
    text: paired ? cleanText(stripHTML(paired[2] || '')) : '',
  }
}

function parseAttrs(source) {
  const attrs = {}

  for (const attr of String(source || '').matchAll(/([a-z_:][-a-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/giu)) {
    attrs[attr[1].toLowerCase()] = decodeEntities(attr[3] ?? attr[4] ?? attr[5] ?? '')
  }

  return attrs
}

function extractCaption(html) {
  const figcaption = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/iu.exec(String(html || ''))?.[1]

  return cleanText(stripHTML(figcaption || ''))
}

function firstDirectVideoURL(html) {
  return String(html || '').match(/https?:\/\/[^\s"'<>]+?\.(?:mp4|mov|webm)(?:[?#][^\s"'<>]*)?/iu)?.[0] || ''
}

function inferDimensions(attrs) {
  return {
    height: numberFromAttr(attrs.height),
    width: numberFromAttr(attrs.width),
  }
}

function numberFromAttr(value) {
  const parsed = Number(String(value || '').replace(/[^\d.]/gu, ''))

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function inferOrientation({ height, sourceURL, width }) {
  if (/\/shorts\//iu.test(sourceURL)) {
    return 'vertical'
  }

  if (width && height) {
    if (height > width * 1.15) {
      return 'vertical'
    }

    if (Math.abs(width - height) <= Math.max(width, height) * 0.15) {
      return 'square'
    }
  }

  return 'horizontal'
}

function inferMaxWidth({ orientation, width }) {
  if (orientation === 'vertical') {
    return width && width <= 360 ? '360' : '480'
  }

  if (orientation === 'square') {
    return '480'
  }

  return '720'
}

function getYouTubeID(value) {
  const url = parseURL(value)

  if (!url) {
    return null
  }

  if (url.hostname.includes('youtu.be')) {
    return url.pathname.replace(/^\/+/u, '').split('/')[0] || null
  }

  if (url.hostname.includes('youtube.com') || url.hostname.includes('youtube-nocookie.com')) {
    return url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/u)?.[1] || null
  }

  return null
}

function getVimeoID(value) {
  const url = parseURL(value)

  if (!url || !url.hostname.includes('vimeo.com')) {
    return null
  }

  return url.pathname.match(/\/(?:video\/)?(\d+)/u)?.[1] || null
}

function parseURL(value) {
  try {
    return new URL(normalizeExternalURL(value))
  } catch (_error) {
    return null
  }
}

function normalizeExternalURL(value) {
  const decoded = decodeEntities(value).trim()

  if (decoded.startsWith('//')) {
    return `https:${decoded}`
  }

  return decoded
}

function cleanText(value) {
  return decodeEntities(String(value || ''))
    .replace(/\s+/gu, ' ')
    .trim()
}

function stripHTML(value) {
  return String(value || '').replace(/<[^>]+>/gu, ' ')
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/gu, '&')
    .replace(/&quot;/gu, '"')
    .replace(/&#039;/gu, "'")
    .replace(/&apos;/gu, "'")
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
}

function hash(value) {
  let result = 2166136261

  for (let index = 0; index < String(value).length; index += 1) {
    result ^= String(value).charCodeAt(index)
    result = Math.imul(result, 16777619)
  }

  return (result >>> 0).toString(36)
}

function emptyContent() {
  return {
    root: {
      children: [
        {
          children: [],
          direction: null,
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

function summarize(results) {
  return {
    articlesChecked: results.length,
    articlesErrored: results.filter((item) => item.action === 'error').length,
    articlesNeedingUpdate: results.filter((item) => item.action === 'dry-run-update' || item.action === 'updated').length,
    articlesUpdated: results.filter((item) => item.action === 'updated').length,
    htmlEmbedsChanged: sum(results, (item) => item.htmlEmbedsChanged),
    mode: dryRun ? 'dry-run' : 'apply',
    skippedDuplicateVideos: sum(results, (item) => item.skippedDuplicateVideos),
    videoBlocksCreated: sum(results, (item) => item.videoBlocksCreated),
    videoCandidatesFound: sum(results, (item) => item.videoCandidatesFound),
  }
}

function renderMarkdown(report) {
  const { summary } = report
  const changed = report.results.filter((item) => item.action === 'dry-run-update' || item.action === 'updated')

  return [
    '# WP Video Normalization',
    '',
    `Generated at: ${report.generatedAt}`,
    `Mode: ${report.mode}`,
    '',
    `Articles checked: ${summary.articlesChecked}`,
    `Articles needing update: ${summary.articlesNeedingUpdate}`,
    `Articles updated: ${summary.articlesUpdated}`,
    `Video candidates found: ${summary.videoCandidatesFound}`,
    `Video blocks created: ${summary.videoBlocksCreated}`,
    `HTML embeds changed: ${summary.htmlEmbedsChanged}`,
    `Skipped duplicate videos: ${summary.skippedDuplicateVideos}`,
    `Errors: ${summary.articlesErrored}`,
    '',
    '## Changed Articles',
    ...changed.slice(0, 200).map((item) => `- ${item.languageCode?.toUpperCase() || '??'} #${item.id}: ${item.title} (${item.videoBlocksCreated} video blocks)`),
    changed.length > 200 ? `- ...and ${changed.length - 200} more` : '',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

async function fetchImportedArticles({ token }) {
  const docs = []

  for (let page = 1; page <= 20; page += 1) {
    const payload = await payloadRequest({
      method: 'GET',
      pathname: `/api/articles?depth=0&limit=100&page=${page}&where%5BlegacySource.platform%5D%5Bequals%5D=wordpress`,
      token,
    })

    docs.push(...(payload.docs || []))

    if (!payload.hasNextPage) {
      break
    }
  }

  return docs
}

async function loginToPayload() {
  const login = await payloadRequest({
    body: {
      email: cms.email,
      password: cms.password,
    },
    method: 'POST',
    pathname: '/api/users/login',
  })

  return login.token
}

async function payloadRequest({ body, method, pathname, token }) {
  const response = await fetch(`${cms.baseURL}${pathname}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    },
    method,
  })
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Payload ${method} ${pathname} failed: HTTP ${response.status} ${text.slice(0, 500)}`)
  }

  return text ? JSON.parse(text) : null
}

function parseArgs(items) {
  const parsed = {}

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]

    if (!item.startsWith('--')) {
      continue
    }

    const key = item.slice(2)
    const next = items[index + 1]

    if (!next || next.startsWith('--')) {
      parsed[key] = true
      continue
    }

    parsed[key] = next
    index += 1
  }

  return parsed
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function cleanBaseURL(value) {
  return String(value || '').replace(/\/+$/u, '')
}

function sum(items, getValue) {
  return items.reduce((total, item) => total + Number(getValue(item) || 0), 0)
}
