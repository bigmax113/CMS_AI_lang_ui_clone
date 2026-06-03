#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const languages = ['en', 'bg', 'cs', 'uk']
const artifactsRoot = path.resolve('..', 'migration_artifacts')
const exportDir = path.join(artifactsRoot, 'wp-migration-20260603-full', 'wp-export')
const runStamp = new Date().toISOString().replace(/[:.]/g, '-')
const args = parseArgs(process.argv.slice(2))
const outputDir = path.resolve(args.output || path.join(artifactsRoot, `wp-cover-image-backfill-${runStamp}`))
const dryRun = !args.apply
const maxArticles = Number(args.limit || 0)
const concurrency = Math.min(Math.max(Number(args.concurrency || 2), 1), 12)

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
  const wpByURL = new Map(wpPosts.map((post) => [post.link, post]))
  const token = await loginToPayload()
  const articles = await fetchImportedArticles({ token })
  const selectedArticles = maxArticles > 0 ? articles.slice(0, maxArticles) : articles
  const report = await backfillCoverImages({ articles: selectedArticles, token, wpByURL })

  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(path.join(outputDir, 'cover-image-backfill-report.json'), `${JSON.stringify(report, null, 2)}\n`)
  await fs.writeFile(path.join(outputDir, 'cover-image-backfill-summary.md'), renderMarkdown(report), 'utf8')

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

async function backfillCoverImages({ articles, token, wpByURL }) {
  const tasks = articles.map((article) => async () => backfillArticle({ article, token, wpByURL }))
  const results = await runConcurrent(tasks, concurrency)

  return {
    generatedAt: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'apply',
    results,
    summary: summarize(results),
  }
}

async function backfillArticle({ article, token, wpByURL }) {
  const legacyURL = article.legacySource?.wpURL || ''
  const wpPost = wpByURL.get(legacyURL)
  const image = resolveFeaturedImage(wpPost)

  if (!wpPost) {
    return result({ action: 'skip-no-wp-post', article, legacyURL })
  }

  if (!image?.url) {
    return result({ action: 'skip-no-featured-image', article, legacyURL })
  }

  const hasCover = Boolean(article.coverImage)
  const hasSEOImage = Boolean(article.seo?.image)

  if (hasCover && hasSEOImage) {
    return result({ action: 'skip-already-complete', article, image, legacyURL })
  }

  if (dryRun) {
    return result({
      action: 'dry-run-update',
      article,
      image,
      legacyURL,
      mediaID: article.coverImage || article.seo?.image || null,
    })
  }

  try {
    const mediaResponse = await findOrCreateMedia({ article, image, token, wpPost })
    const media = mediaResponse?.doc || mediaResponse
    const mediaID = media?.id

    if (!mediaID) {
      return result({ action: 'error', article, error: 'Media upload returned no id.', image, legacyURL })
    }

    await payloadRequest({
      body: {
        coverImage: article.coverImage || mediaID,
        seo: {
          ...(article.seo || {}),
          image: article.seo?.image || mediaID,
        },
      },
      method: 'PATCH',
      pathname: `/api/articles/${article.id}`,
      token,
    })

    return result({
      action: 'updated',
      article,
      driveStorageStatus: media.driveStorageStatus || null,
      image,
      legacyURL,
      mediaID,
    })
  } catch (error) {
    return result({
      action: 'error',
      article,
      error: error instanceof Error ? error.message : String(error),
      image,
      legacyURL,
    })
  }
}

async function findOrCreateMedia({ article, image, token, wpPost }) {
  const existing = await findMediaByExternalURL({ token, url: image.url })

  if (existing) {
    return existing
  }

  return uploadMediaFromURL({ article, image, token, wpPost })
}

async function findMediaByExternalURL({ token, url }) {
  const payload = await payloadRequest({
    method: 'GET',
    pathname: `/api/media?depth=0&limit=1&where%5BexternalImageURL%5D%5Bequals%5D=${encodeURIComponent(url)}`,
    token,
  })

  return payload.docs?.[0] || null
}

async function uploadMediaFromURL({ article, image, token, wpPost }) {
  const response = await fetchWithTimeout(image.url)

  if (!response.ok) {
    throw new Error(`Image fetch failed: HTTP ${response.status} ${image.url}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const mimeType = response.headers.get('content-type')?.split(';')[0] || image.mimeType || 'application/octet-stream'
  const filename = safeFileName(
    `wp-${wpPost.languageCode || article.languageCode || 'xx'}-${wpPost.id}-${image.filename || filenameFromURL(image.url) || 'cover'}`,
  )
  const payload = {
    alt: image.alt || article.title || '',
    caption: image.caption || `Imported WordPress featured image for ${article.title || article.slug || article.id}.`,
    externalImageURL: image.url,
    tags: [
      { tag: 'wp-migration' },
      { tag: `wp-${wpPost.languageCode || article.languageCode || 'unknown'}` },
      { tag: `wp-post-${wpPost.id}` },
    ],
  }
  const form = new FormData()

  form.append('_payload', JSON.stringify(payload))
  form.append('alt', payload.alt)
  form.append('caption', payload.caption)
  form.append('externalImageURL', payload.externalImageURL)
  form.append('file', new Blob([buffer], { type: mimeType }), filename)

  return payloadRequest({
    body: form,
    method: 'POST',
    pathname: '/api/media',
    token,
  })
}

function resolveFeaturedImage(wpPost) {
  const media = wpPost?.featuredMedia || null
  const fallbackURL = wpPost?.seo?.image || null
  const url = media?.source_url || fallbackURL

  if (!url) {
    return null
  }

  return {
    alt: media?.alt_text || cleanText(stripHTML(media?.title?.rendered || wpPost?.titleHTML || '')),
    caption: cleanText(stripHTML(media?.caption?.rendered || '')),
    filename: media?.filename || filenameFromURL(url),
    mimeType: media?.mime_type || '',
    url,
  }
}

function result({ action, article, driveStorageStatus, error, image, legacyURL, mediaID }) {
  return {
    action,
    coverImageBefore: Boolean(article.coverImage),
    driveStorageStatus,
    error,
    id: article.id,
    imageURL: image?.url || null,
    languageCode: article.languageCode,
    legacyURL,
    mediaID,
    seoImageBefore: Boolean(article.seo?.image),
    slug: article.slug,
    title: article.title,
  }
}

async function readWPPosts() {
  const posts = []

  for (const languageCode of languages) {
    const payload = JSON.parse(await fs.readFile(path.join(exportDir, `${languageCode}.json`), 'utf8'))

    posts.push(...(payload.posts || []).map((post) => ({ ...post, languageCode })))
  }

  return posts
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
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const maxAttempts = 4
  let lastError = ''

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`${cms.baseURL}${pathname}`, {
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      headers: {
        Accept: 'application/json',
        ...(!isFormData && body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `JWT ${token}` } : {}),
      },
      method,
    })
    const text = await response.text()

    if (response.ok) {
      return text ? JSON.parse(text) : null
    }

    lastError = `Payload ${method} ${pathname} failed: HTTP ${response.status} ${text.slice(0, 500)}`

    if (![429, 502, 503, 504].includes(response.status) || attempt === maxAttempts) {
      break
    }

    await sleep(1_500 * attempt)
  }

  throw new Error(lastError)
}

async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function runConcurrent(tasks, size) {
  const results = new Array(tasks.length)
  let nextIndex = 0

  await Promise.all(
    Array.from({ length: Math.min(size, tasks.length) }, async () => {
      while (nextIndex < tasks.length) {
        const index = nextIndex
        nextIndex += 1
        results[index] = await tasks[index]()
      }
    }),
  )

  return results
}

function summarize(results) {
  return {
    articlesChecked: results.length,
    articlesErrored: results.filter((item) => item.action === 'error').length,
    articlesNeedingUpdate: results.filter((item) => item.action === 'dry-run-update' || item.action === 'updated').length,
    articlesUpdated: results.filter((item) => item.action === 'updated').length,
    driveStored: results.filter((item) => item.driveStorageStatus === 'stored-in-drive').length,
    mode: dryRun ? 'dry-run' : 'apply',
    noFeaturedImage: results.filter((item) => item.action === 'skip-no-featured-image').length,
    skippedAlreadyComplete: results.filter((item) => item.action === 'skip-already-complete').length,
  }
}

function renderMarkdown(report) {
  const { summary } = report
  const errors = report.results.filter((item) => item.action === 'error')

  return [
    '# WP Cover Image Backfill',
    '',
    `Generated at: ${report.generatedAt}`,
    `Mode: ${report.mode}`,
    '',
    `Articles checked: ${summary.articlesChecked}`,
    `Articles needing update: ${summary.articlesNeedingUpdate}`,
    `Articles updated: ${summary.articlesUpdated}`,
    `Stored in Google Drive: ${summary.driveStored}`,
    `Already complete: ${summary.skippedAlreadyComplete}`,
    `No featured image: ${summary.noFeaturedImage}`,
    `Errors: ${summary.articlesErrored}`,
    '',
    ...(errors.length
      ? ['## Errors', ...errors.slice(0, 100).map((item) => `- #${item.id} ${item.title}: ${item.error}`), '']
      : []),
  ].join('\n')
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

function safeFileName(value) {
  return String(value || 'cover-image')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 180)
}

function filenameFromURL(value) {
  try {
    const url = new URL(value)
    const filename = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '')

    return filename || null
  } catch (_error) {
    return null
  }
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/gu, ' ')
    .trim()
}

function stripHTML(value) {
  return String(value || '').replace(/<[^>]+>/gu, ' ')
}

function cleanBaseURL(value) {
  return String(value || '').replace(/\/+$/u, '')
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
