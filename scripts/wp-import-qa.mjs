#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const languages = ['en', 'bg', 'cs', 'uk']
const artifactsRoot = path.resolve('..', 'migration_artifacts')
const exportDir = path.join(artifactsRoot, 'wp-migration-20260603-full', 'wp-export')
const baselineDir = path.join(artifactsRoot, 'wp-migration-20260603-full', 'seo-baseline')
const outputDir = path.join(artifactsRoot, 'wp-import-qa-20260603')

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
  const wpPosts = await readWPPosts()
  const wpBaseline = await readWPBaseline()
  const cmsArticles = await fetchCMSArticles()
  const report = buildQAReport({ cmsArticles, wpBaseline, wpPosts })

  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(path.join(outputDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await fs.writeFile(path.join(outputDir, 'qa-summary.md'), renderMarkdown(report), 'utf8')

  console.log(
    JSON.stringify(
      {
        outDir: outputDir,
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

async function readWPPosts() {
  const posts = []

  for (const languageCode of languages) {
    const payload = JSON.parse(await fs.readFile(path.join(exportDir, `${languageCode}.json`), 'utf8'))
    posts.push(...(payload.posts || []).map((post) => ({ ...post, languageCode })))
  }

  return posts
}

async function readWPBaseline() {
  const pages = []

  for (const languageCode of languages) {
    const payload = JSON.parse(await fs.readFile(path.join(baselineDir, `${languageCode}.json`), 'utf8'))
    pages.push(...(payload.pages || []).map((page) => ({ ...page, languageCode })))
  }

  return pages
}

async function fetchCMSArticles() {
  const login = await payloadRequest({
    body: {
      email: cms.email,
      password: cms.password,
    },
    method: 'POST',
    pathname: '/api/users/login',
  })
  const token = login.token
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

function buildQAReport({ cmsArticles, wpBaseline, wpPosts }) {
  const wpByURL = new Map(wpPosts.map((post) => [post.link, post]))
  const baselineByURL = new Map(wpBaseline.map((page) => [page.url, page]))
  const articles = cmsArticles.map((article) => qaArticle({ article, baselineByURL, wpByURL }))
  const issueCounts = countIssues(articles)

  return {
    articles,
    summary: {
      cmsArticles: cmsArticles.length,
      content: summarizeContent(articles),
      generatedAt: new Date().toISOString(),
      headings: summarizeHeadings({ articles, wpBaseline }),
      issueCounts,
      missing: summarizeMissing(articles),
      seoReadiness: summarizeSEOReadiness({ articles, wpBaseline }),
      statuses: countBy(articles, (article) => article.status),
      wpBaselinePages: wpBaseline.length,
      wpExportPosts: wpPosts.length,
    },
  }
}

function qaArticle({ article, baselineByURL, wpByURL }) {
  const legacyURL = article.legacySource?.wpURL || ''
  const wpPost = wpByURL.get(legacyURL)
  const baseline = baselineByURL.get(legacyURL)
  const cmsHTML = htmlFromContent(article.content)
  const wpHTML = wpPost?.contentHTML || ''
  const cmsMetrics = metrics(cmsHTML)
  const wpMetrics = metrics(wpHTML)
  const blockTypes = contentBlockTypes(article.content)
  const structuredVideoBlocks = blockTypes.filter((type) => type === 'video').length
  const cmsVideoCoverage = cmsMetrics.videoLikeCount + structuredVideoBlocks

  cmsMetrics.blockVideoCount = structuredVideoBlocks

  const issues = []

  if (article.status !== 'draft') {
    issues.push('status-not-draft')
  }

  if (!article.title) {
    issues.push('missing-title')
  }

  if (!article.slug) {
    issues.push('missing-slug')
  }

  if (!article.summary) {
    issues.push('missing-summary')
  }

  if (!article.seo?.title) {
    issues.push('missing-seo-title')
  }

  if (!article.seo?.description) {
    issues.push('missing-seo-description')
  }

  if (!article.seo?.image) {
    issues.push('missing-seo-image')
  }

  if (!article.coverImage) {
    issues.push('missing-cover-image')
  }

  if (!legacyURL) {
    issues.push('missing-legacy-url')
  }

  if (!wpPost) {
    issues.push('wp-export-not-found')
  }

  if (!baseline) {
    issues.push('wp-baseline-not-found')
  }

  if (!cmsHTML.trim()) {
    issues.push('missing-content-html')
  }

  if (wpHTML && cmsHTML.length < Math.min(500, wpHTML.length * 0.5)) {
    issues.push('content-html-too-short')
  }

  if (wpMetrics.imageCount && cmsMetrics.imageCount < wpMetrics.imageCount) {
    issues.push('image-count-lower-than-wp-export')
  }

  if (wpMetrics.iframeCount && cmsMetrics.iframeCount + structuredVideoBlocks < wpMetrics.iframeCount) {
    issues.push('iframe-count-lower-than-wp-export')
  }

  if (wpMetrics.mp4LikeCount && cmsVideoCoverage < wpMetrics.mp4LikeCount) {
    issues.push('mp4-video-count-lower-than-wp-export')
  }

  if (cmsMetrics.videoLikeCount) {
    issues.push('videoobject-not-ready-html-embed-video')
  }

  return {
    cms: {
      coverImage: Boolean(article.coverImage),
      htmlEmbedBlocks: blockTypes.filter((type) => type === 'htmlEmbed').length,
      metrics: cmsMetrics,
      seoDescription: Boolean(article.seo?.description),
      seoImage: Boolean(article.seo?.image),
      seoTitle: Boolean(article.seo?.title),
      structuredVideoBlocks,
      videoCoverage: cmsVideoCoverage,
      summary: Boolean(article.summary),
    },
    id: article.id,
    issues,
    languageCode: article.languageCode,
    legacyURL,
    publicUrl: article.publicUrl,
    slug: article.slug,
    source: {
      baselineCanonical: baseline?.canonical || null,
      baselineHeadings: (baseline?.headings || []).length,
      baselineJsonLdTypes: (baseline?.jsonLd || [])
        .map((schema) => schema.type || schema['@type'])
        .filter(Boolean),
      baselineOgPresent: Boolean(baseline?.og && Object.keys(baseline.og).length),
      baselineStatus: baseline?.status,
      baselineVideos: baseline?.videos || null,
      status: wpPost?.status,
      title: strip(wpPost?.titleHTML || ''),
    },
    status: article.status,
    title: article.title,
    translationGroup: article.translationGroup,
    wpExportMetrics: wpMetrics,
    wpPostID: article.legacySource?.wpPostID,
  }
}

function summarizeContent(articles) {
  return {
    articlesWithHTMLVideo: articles.filter((article) => article.cms.metrics.videoLikeCount > 0).length,
    articlesWithImages: articles.filter((article) => article.cms.metrics.imageCount > 0).length,
    articlesWithMP4OrVideoTags: articles.filter((article) => article.cms.metrics.mp4LikeCount > 0).length,
    imageCountLowerThanWP: articles.filter((article) =>
      article.issues.includes('image-count-lower-than-wp-export'),
    ).length,
    imagesMissingSrc: sum(articles, (article) => article.cms.metrics.imagesMissingSrc),
    totalCMSImages: sum(articles, (article) => article.cms.metrics.imageCount),
    totalIframes: sum(articles, (article) => article.cms.metrics.iframeCount),
    totalMP4Links: sum(articles, (article) => article.cms.metrics.mp4LinkCount),
    totalSourceTags: sum(articles, (article) => article.cms.metrics.sourceTagCount),
    totalStructuredVideoBlocks: sum(articles, (article) => article.cms.structuredVideoBlocks),
    totalVideoTags: sum(articles, (article) => article.cms.metrics.videoTagCount),
    totalVimeoIframes: sum(articles, (article) => article.cms.metrics.vimeoCount),
    totalYouTubeIframes: sum(articles, (article) => article.cms.metrics.youtubeCount),
    videoObjectNotReadyHTMLVideos: articles.filter((article) =>
      article.issues.includes('videoobject-not-ready-html-embed-video'),
    ).length,
  }
}

function summarizeHeadings({ articles, wpBaseline }) {
  return {
    articlesWithH2H6InCMSHTML: articles.filter((article) =>
      article.cms.metrics.headings.some((heading) => heading.level >= 2),
    ).length,
    sourceBaselineH1Missing: wpBaseline.filter((page) => !(page.headings || []).some((heading) => heading.level === 1))
      .length,
    totalCMSH1: sum(articles, (article) =>
      article.cms.metrics.headings.filter((heading) => heading.level === 1).length,
    ),
    totalCMSH2H6: sum(articles, (article) =>
      article.cms.metrics.headings.filter((heading) => heading.level >= 2).length,
    ),
  }
}

function summarizeMissing(articles) {
  return {
    contentHTML: countIssue(articles, 'missing-content-html'),
    coverImage: countIssue(articles, 'missing-cover-image'),
    legacyURL: countIssue(articles, 'missing-legacy-url'),
    seoDescription: countIssue(articles, 'missing-seo-description'),
    seoImage: countIssue(articles, 'missing-seo-image'),
    seoTitle: countIssue(articles, 'missing-seo-title'),
    slug: countIssue(articles, 'missing-slug'),
    summary: countIssue(articles, 'missing-summary'),
    title: countIssue(articles, 'missing-title'),
  }
}

function summarizeSEOReadiness({ articles, wpBaseline }) {
  return {
    cmsHasTitleDescription: articles.filter((article) => article.cms.seoTitle && article.cms.seoDescription).length,
    cmsOgImageReady: articles.filter((article) => article.cms.coverImage || article.cms.seoImage).length,
    publicCanonicalJsonLdOgE2E: 'not-tested-imported-articles-are-draft',
    wpCanonicalMissing: wpBaseline.filter((page) => !page.canonical).length,
    wpJsonLdMissing: wpBaseline.filter((page) => !(page.jsonLd || []).length).length,
    wpOgMissing: wpBaseline.filter((page) => !page.og || !Object.keys(page.og).length).length,
  }
}

function renderMarkdown(report) {
  const { summary } = report
  const issueLines = Object.entries(summary.issueCounts)
    .sort((left, right) => right[1] - left[1])
    .map(([issue, count]) => `- ${issue}: ${count}`)

  return [
    '# WP Import QA - 2026-06-03',
    '',
    `CMS imported articles: ${summary.cmsArticles}`,
    `WP export posts: ${summary.wpExportPosts}`,
    `WP SEO baseline pages: ${summary.wpBaselinePages}`,
    '',
    `Statuses: ${JSON.stringify(summary.statuses)}`,
    '',
    `SEO title+description ready: ${summary.seoReadiness.cmsHasTitleDescription}/${summary.cmsArticles}`,
    `Cover/SEO images ready for OG: ${summary.seoReadiness.cmsOgImageReady}/${summary.cmsArticles}`,
    `Content images: ${summary.content.totalCMSImages} across ${summary.content.articlesWithImages} articles`,
    `HTML videos/iframes: ${summary.content.articlesWithHTMLVideo} articles`,
    `Structured video blocks: ${summary.content.totalStructuredVideoBlocks}`,
    `YouTube iframes: ${summary.content.totalYouTubeIframes}`,
    `Vimeo iframes: ${summary.content.totalVimeoIframes}`,
    `MP4/video-tag articles: ${summary.content.articlesWithMP4OrVideoTags}`,
    `VideoObject not ready for HTML embedded videos: ${summary.content.videoObjectNotReadyHTMLVideos}`,
    `CMS H2-H6 tags in imported HTML: ${summary.headings.totalCMSH2H6} across ${summary.headings.articlesWithH2H6InCMSHTML} articles`,
    '',
    '## Issue Counts',
    ...issueLines,
    '',
  ].join('\n')
}

function countIssues(articles) {
  const counts = {}

  for (const article of articles) {
    for (const issue of article.issues) {
      counts[issue] = (counts[issue] || 0) + 1
    }
  }

  return counts
}

function countIssue(articles, issue) {
  return articles.filter((article) => article.issues.includes(issue)).length
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item) || 'unknown'

    counts[key] = (counts[key] || 0) + 1

    return counts
  }, {})
}

function sum(items, getValue) {
  return items.reduce((total, item) => total + Number(getValue(item) || 0), 0)
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

function htmlFromContent(content) {
  return (content?.root?.children || [])
    .map((node) => (node?.fields?.blockType === 'htmlEmbed' ? String(node.fields.html || '') : ''))
    .join('\n')
}

function contentBlockTypes(content) {
  return (content?.root?.children || []).map((node) => node?.fields?.blockType || node?.type).filter(Boolean)
}

function metrics(html) {
  const imageTags = tags(html, 'img')
  const iframeTags = tags(html, 'iframe')
  const videoTags = tags(html, 'video')
  const sourceTags = tags(html, 'source')
  const links = [...String(html || '').matchAll(/https?:\/\/[^\s"'<>]+/giu)].map((match) => match[0])
  const mp4Links = links.filter((url) => /\.(mp4|mov|webm)(\?|$)/iu.test(url))
  const uniqueMP4Links = [...new Set(mp4Links.map((url) => url.replace(/[?#].*$/u, '')))]
  const youtube = iframeTags.filter((iframe) => /youtube\.com|youtu\.be/iu.test(iframe.src || ''))
  const vimeo = iframeTags.filter((iframe) => /vimeo\.com/iu.test(iframe.src || ''))
  const mp4LikeCount = Math.max(videoTags.length, uniqueMP4Links.length)

  return {
    blockVideoCount: 0,
    headings: headings(html),
    htmlLength: String(html || '').length,
    iframeCount: iframeTags.length,
    imageCount: imageTags.length,
    imagesMissingSrc: imageTags.filter((image) => !image.src).length,
    mp4LikeCount,
    mp4LinkCount: mp4Links.length,
    sourceTagCount: sourceTags.length,
    videoLikeCount: iframeTags.length + mp4LikeCount,
    videoTagCount: videoTags.length,
    vimeoCount: vimeo.length,
    youtubeCount: youtube.length,
  }
}

function tags(html, tagName) {
  const parsed = []
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>`, 'giu')

  for (const match of String(html || '').matchAll(pattern)) {
    const attrs = {}

    for (const attr of match[1].matchAll(/([a-z_:][-a-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/giu)) {
      attrs[attr[1].toLowerCase()] = attr[3] ?? attr[4] ?? attr[5] ?? ''
    }

    parsed.push(attrs)
  }

  return parsed
}

function headings(html) {
  const parsed = []
  const pattern = /<h([1-6])\b[^>]*>(.*?)<\/h\1>/gis

  for (const match of String(html || '').matchAll(pattern)) {
    parsed.push({
      level: Number(match[1]),
      text: strip(match[2]),
    })
  }

  return parsed
}

function strip(value) {
  return String(value || '')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

function cleanBaseURL(value) {
  return String(value || '').replace(/\/+$/u, '')
}
