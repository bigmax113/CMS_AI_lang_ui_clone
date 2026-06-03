#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WP_SITES = [
  {
    baseURL: 'https://lorgar.com/blog',
    code: 'en',
    displayCode: 'EN',
    name: 'LORGAR Global',
  },
  {
    baseURL: 'https://lorgar.bg/blog',
    code: 'bg',
    displayCode: 'BG',
    name: 'LORGAR Bulgaria',
  },
  {
    baseURL: 'https://lorgar.cz/blog',
    code: 'cs',
    displayCode: 'CS',
    name: 'LORGAR Czech',
  },
  {
    baseURL: 'https://lorgar.ua/blog',
    code: 'uk',
    displayCode: 'UA',
    name: 'LORGAR Ukraine',
  },
]

const DEFAULT_ARTIFACT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'migration_artifacts',
  'wp-migration',
)

const TARGET_COLLECTION = 'articles'
const DEFAULT_TIMEOUT_MS = 45_000

const command = process.argv[2]
const args = parseArgs(process.argv.slice(3))

if (!['baseline', 'export', 'import'].includes(command)) {
  printUsage()
  process.exit(1)
}

const selectedSites = selectSites(args.site)
const runStamp = new Date().toISOString().replace(/[:.]/g, '-')
const artifactRoot = path.resolve(process.env.MIGRATION_ARTIFACT_ROOT || DEFAULT_ARTIFACT_ROOT)
const runDir = args.output ? path.resolve(args.output) : path.join(artifactRoot, runStamp)

try {
  if (command === 'baseline') {
    await runBaseline()
  } else if (command === 'export') {
    await runExport()
  } else {
    await runImport()
  }
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exit(1)
}

async function runBaseline() {
  const baselineDir = path.join(runDir, 'seo-baseline')
  await ensureDir(baselineDir)

  const siteReports = []

  for (const site of selectedSites) {
    console.log(`[baseline] ${site.displayCode} ${site.baseURL}`)
    const postRefs = await collectWPPostRefs(site)
    const pages = []

    for (const postRef of limitItems(postRefs, args.limit)) {
      const page = await fetchHTMLSnapshot(postRef.url, site)
      pages.push({
        ...page,
        languageCode: site.code,
        site: site.baseURL,
        wpPostID: postRef.id,
      })
    }

    const siteReport = {
      generatedAt: new Date().toISOString(),
      pageCount: pages.length,
      pages,
      site,
      sourceCount: postRefs.length,
    }

    siteReports.push(siteReport)
    await writeJSON(path.join(baselineDir, `${site.code}.json`), siteReport)
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: 'seo-baseline-wp',
    totals: summarizeBaseline(siteReports),
  }

  await writeJSON(path.join(baselineDir, 'summary.json'), summary)
  console.log(`[baseline] done ${baselineDir}`)
}

async function runExport() {
  const exportDir = path.join(runDir, 'wp-export')
  await ensureDir(exportDir)

  const exports = []

  for (const site of selectedSites) {
    console.log(`[export] ${site.displayCode} posts/media/categories/tags`)
    const [posts, media, categories, tags] = await Promise.all([
      fetchWPRestAll(site, '/wp-json/wp/v2/posts', {
        _embed: '1',
        context: 'view',
        status: 'publish',
      }),
      fetchWPRestAll(site, '/wp-json/wp/v2/media', {
        context: 'view',
      }),
      fetchWPRestAll(site, '/wp-json/wp/v2/categories', {
        context: 'view',
      }),
      fetchWPRestAll(site, '/wp-json/wp/v2/tags', {
        context: 'view',
      }),
    ])
    const categoryByID = new Map(categories.map((category) => [category.id, category]))
    const tagByID = new Map(tags.map((tag) => [tag.id, tag]))
    const mediaByID = new Map(media.map((item) => [item.id, item]))
    const exportedPosts = limitItems(posts, args.limit).map((post) =>
      normalizeExportedPost({
        categoryByID,
        mediaByID,
        post,
        site,
        tagByID,
      }),
    )
    const siteExport = {
      categories,
      exportedAt: new Date().toISOString(),
      media,
      posts: exportedPosts,
      site,
      tags,
    }

    exports.push(siteExport)
    await writeJSON(path.join(exportDir, `${site.code}.json`), siteExport)
  }

  const summary = {
    exportedAt: new Date().toISOString(),
    mediaCount: exports.reduce((sum, item) => sum + item.media.length, 0),
    mode: 'wp-export',
    postCount: exports.reduce((sum, item) => sum + item.posts.length, 0),
    sites: exports.map((item) => ({
      code: item.site.code,
      mediaCount: item.media.length,
      postCount: item.posts.length,
      site: item.site.baseURL,
    })),
  }

  await writeJSON(path.join(exportDir, 'summary.json'), summary)
  console.log(`[export] done ${exportDir}`)
}

async function runImport() {
  const inputDir = args.input ? path.resolve(args.input) : await findLatestExportDir()
  const importDir = path.join(runDir, 'cms-import')
  const dryRun = Boolean(args['dry-run'])
  const statusMode = String(process.env.CMS_IMPORT_STATUS || args.status || 'draft').toLowerCase()

  await ensureDir(importDir)

  const cms = {
    baseURL: cleanBaseURL(process.env.CMS_BASE_URL || 'https://cms-ai.onrender.com'),
    email: process.env.CMS_EMAIL || '',
    password: process.env.CMS_PASSWORD || '',
  }
  const token = dryRun ? null : await loginToPayload(cms)
  const results = []

  for (const site of selectedSites) {
    const exportFile = path.join(inputDir, `${site.code}.json`)
    const siteExport = JSON.parse(await fs.readFile(exportFile, 'utf8'))
    const posts = limitItems(siteExport.posts || [], args.limit)

    for (const post of posts) {
      const articleData = mapPostToArticle({ post, site, statusMode })
      const existing = dryRun ? null : await findExistingArticle({ articleData, cms, token })
      const action = existing ? 'update' : 'create'

      if (dryRun) {
        results.push({
          action: 'dry-run',
          languageCode: articleData.languageCode,
          slug: articleData.slug,
          status: articleData.status,
          title: articleData.title,
          wpURL: articleData.legacySource.wpURL,
        })
        continue
      }

      try {
        const saved = existing
          ? await payloadRequest({
              body: articleData,
              cms,
              method: 'PATCH',
              pathname: `/api/${TARGET_COLLECTION}/${existing.id}`,
              token,
            })
          : await payloadRequest({
              body: articleData,
              cms,
              method: 'POST',
              pathname: `/api/${TARGET_COLLECTION}`,
              token,
            })

        results.push({
          action,
          id: saved?.doc?.id || saved?.id || existing?.id || null,
          languageCode: articleData.languageCode,
          slug: articleData.slug,
          status: articleData.status,
          title: articleData.title,
          wpURL: articleData.legacySource.wpURL,
        })
      } catch (error) {
        results.push({
          action,
          error: error instanceof Error ? error.message : String(error),
          languageCode: articleData.languageCode,
          slug: articleData.slug,
          title: articleData.title,
          wpURL: articleData.legacySource.wpURL,
        })
      }
    }
  }

  const summary = {
    created: results.filter((item) => item.action === 'create' && !item.error).length,
    dryRun,
    errors: results.filter((item) => item.error).length,
    importedAt: new Date().toISOString(),
    inputDir,
    mode: 'cms-import',
    statusMode,
    total: results.length,
    updated: results.filter((item) => item.action === 'update' && !item.error).length,
  }

  await writeJSON(path.join(importDir, 'results.json'), { results, summary })
  await writeJSON(path.join(importDir, 'summary.json'), summary)
  console.log(`[import] done ${importDir}`)
  console.log(`[import] ${JSON.stringify(summary)}`)

  if (summary.errors > 0) {
    process.exitCode = 2
  }
}

function printUsage() {
  console.log(`
Usage:
  node scripts/wp-migration.mjs baseline [--site en,bg,cs,uk] [--limit N] [--output DIR]
  node scripts/wp-migration.mjs export   [--site en,bg,cs,uk] [--limit N] [--output DIR]
  node scripts/wp-migration.mjs import   --input DIR [--site en,bg,cs,uk] [--limit N] [--dry-run]

Environment:
  WP_BASIC_USER / WP_BASIC_PASSWORD       Optional HTTP Basic credentials for WP read-only access
  CMS_BASE_URL                            Payload CMS URL, defaults to https://cms-ai.onrender.com
  CMS_EMAIL / CMS_PASSWORD                Payload credentials for import
  CMS_IMPORT_STATUS                       draft (default), published, or preserve
  MIGRATION_ARTIFACT_ROOT                 Where to write migration artifacts
`)
}

function parseArgs(argv) {
  const parsed = {}

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (!value.startsWith('--')) {
      continue
    }

    const key = value.slice(2)
    const next = argv[index + 1]

    if (!next || next.startsWith('--')) {
      parsed[key] = true
      continue
    }

    parsed[key] = next
    index += 1
  }

  return parsed
}

function selectSites(value) {
  if (!value) {
    return WP_SITES
  }

  const requested = new Set(
    String(value)
      .split(',')
      .map((item) => normalizeSiteCode(item))
      .filter(Boolean),
  )

  return WP_SITES.filter((site) => requested.has(site.code))
}

function normalizeSiteCode(value) {
  const code = String(value || '').trim().toLowerCase()

  if (code === 'ua') {
    return 'uk'
  }

  return code
}

function limitItems(items, limitValue) {
  const limit = Number(limitValue || 0)

  return limit > 0 ? items.slice(0, limit) : items
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function writeJSON(file, data) {
  await ensureDir(path.dirname(file))
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

async function collectWPPostRefs(site) {
  const posts = await fetchWPRestAll(site, '/wp-json/wp/v2/posts', {
    context: 'view',
    status: 'publish',
  })

  return posts.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: stripHTML(post.title?.rendered || ''),
    url: post.link || `${site.baseURL.replace(/\/+$/u, '')}/${post.slug}/`,
  }))
}

async function fetchHTMLSnapshot(url, site) {
  const response = await fetchWithTimeout(url, {
    headers: wpHeaders(site, { Accept: 'text/html,application/xhtml+xml' }),
  })
  const html = await response.text()
  const seo = extractSEO(html)

  return {
    canonical: seo.canonical,
    finalURL: response.url,
    headings: seo.headings,
    hreflang: seo.hreflang,
    images: seo.images,
    jsonLd: seo.jsonLd,
    metaDescription: seo.metaDescription,
    og: seo.og,
    status: response.status,
    title: seo.title,
    twitter: seo.twitter,
    url,
    videos: seo.videos,
  }
}

async function fetchWPRestAll(site, endpoint, query = {}) {
  const results = []
  const maxPages = Number(args['max-pages'] || args.maxPages || 100)

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      ...Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)])),
      page: String(page),
      per_page: '100',
    })
    const url = `${site.baseURL.replace(/\/+$/u, '')}${endpoint}?${params.toString()}`
    const response = await fetchWithTimeout(url, {
      headers: wpHeaders(site, { Accept: 'application/json' }),
    })

    if (response.status === 400 && page > 1) {
      break
    }

    if (!response.ok) {
      throw new Error(`WP REST ${site.displayCode} ${endpoint} failed: HTTP ${response.status} ${await response.text()}`)
    }

    const pageItems = await response.json()

    if (!Array.isArray(pageItems) || pageItems.length === 0) {
      break
    }

    results.push(...pageItems)

    const totalPages = Number(response.headers.get('x-wp-totalpages') || 0)

    if (totalPages && page >= totalPages) {
      break
    }
  }

  return results
}

function wpHeaders(_site, extra = {}) {
  const headers = { ...extra }
  const user = process.env.WP_BASIC_USER
  const password = process.env.WP_BASIC_PASSWORD

  if (user && password) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`
  }

  return headers
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeExportedPost({ categoryByID, mediaByID, post, site, tagByID }) {
  const contentHTML = post.content?.rendered || ''
  const featuredMedia = post.featured_media ? mediaByID.get(post.featured_media) || null : null
  const extracted = extractSEO(contentHTML)

  return {
    assets: {
      images: extracted.images,
      videos: extracted.videos,
    },
    categories: (post.categories || []).map((id) => categoryByID.get(id)).filter(Boolean),
    contentHTML,
    date: post.date,
    dateGMT: post.date_gmt,
    excerptHTML: post.excerpt?.rendered || '',
    featuredMedia,
    featuredMediaID: post.featured_media || null,
    id: post.id,
    languageCode: site.code,
    link: post.link,
    modified: post.modified,
    modifiedGMT: post.modified_gmt,
    seo: extractYoastSEO(post),
    site: site.baseURL,
    slug: post.slug,
    status: post.status,
    tags: (post.tags || []).map((id) => tagByID.get(id)).filter(Boolean),
    titleHTML: post.title?.rendered || '',
    type: post.type,
    yoastHead: post.yoast_head || '',
    yoastHeadJson: post.yoast_head_json || null,
  }
}

function mapPostToArticle({ post, site, statusMode }) {
  const title = cleanText(stripHTML(post.titleHTML || post.slug || `WP ${post.id}`)) || post.slug || `WP ${post.id}`
  const summary = cleanText(stripHTML(post.excerptHTML || '')).slice(0, 320)
  const tags = [
    ...(post.categories || []).map((item) => item?.name),
    ...(post.tags || []).map((item) => item?.name),
  ]
    .filter(Boolean)
    .slice(0, 24)
    .map((tag) => ({ tag }))
  const seoTitle = cleanText(post.seo?.title || title).slice(0, 70)
  const seoDescription = cleanText(post.seo?.description || summary || title).slice(0, 160)
  const status = resolveImportStatus({ post, statusMode })
  const translationGroup = inferTranslationGroup(post, site)

  return {
    _status: status === 'published' ? 'published' : 'draft',
    aiAssist: {
      editorialNotes: `Imported from WordPress ${site.displayCode}. Source URL: ${post.link || ''}`,
    },
    category: 'product-content',
    content: lexicalHTMLBlock({
      html: rewriteWPHTMLForImport(post.contentHTML || ''),
      id: `wp-${site.code}-${post.id}-html`,
      label: `Imported WP body ${site.displayCode} #${post.id}`,
    }),
    contentType: 'blog-post',
    languageCode: site.code,
    legacySource: {
      importedAt: new Date().toISOString(),
      platform: 'wordpress',
      site: site.baseURL,
      wpPostID: post.id,
      wpURL: post.link,
    },
    owner: 'WP migration',
    publishedAt: post.dateGMT || post.date || null,
    seo: {
      description: seoDescription,
      title: seoTitle,
    },
    slug: post.slug,
    status,
    summary: summary || undefined,
    tags,
    title,
    translationGroup,
  }
}

function resolveImportStatus({ post, statusMode }) {
  if (statusMode === 'published') {
    return 'published'
  }

  if (statusMode === 'preserve') {
    return post.status === 'publish' ? 'published' : 'draft'
  }

  return 'draft'
}

function inferTranslationGroup(post, site) {
  const hrefGroups = Array.isArray(post.seo?.hreflang)
    ? post.seo.hreflang.map((item) => normalizeURLSlug(item.href)).filter(Boolean)
    : []
  const candidate = hrefGroups[0] || normalizeURLSlug(post.link) || post.slug || `${site.code}-${post.id}`

  return slugify(candidate).slice(0, 120) || `wp-${site.code}-${post.id}`
}

function lexicalHTMLBlock({ html, id, label }) {
  return {
    root: {
      children: [
        {
          fields: {
            blockName: label,
            blockType: 'htmlEmbed',
            html: html || '<p></p>',
            id,
            label,
          },
          format: '',
          type: 'block',
          version: 2,
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

function rewriteWPHTMLForImport(html) {
  return String(html || '')
    .replace(/\sloading=(["'])lazy\1/giu, ' loading="lazy"')
    .trim()
}

function extractYoastSEO(post) {
  const head = post.yoast_head || ''
  const headSEO = extractSEO(head)
  const json = post.yoast_head_json || {}

  return {
    canonical: json.canonical || headSEO.canonical,
    description: json.description || headSEO.metaDescription,
    hreflang: headSEO.hreflang,
    image: json.og_image?.[0]?.url || headSEO.og['og:image'] || null,
    jsonLdTypes: collectJSONLDTypes(json.schema || null),
    title: json.title || headSEO.title,
  }
}

function extractSEO(html) {
  const source = String(html || '')
  const links = parseTags(source, 'link')
  const meta = parseTags(source, 'meta')
  const images = parseTags(source, 'img').map((attrs) => pickAttrs(attrs, ['src', 'alt', 'width', 'height', 'srcset']))
  const iframes = parseTags(source, 'iframe').map((attrs) => pickAttrs(attrs, ['src', 'title', 'width', 'height']))
  const videoTags = parseTags(source, 'video').map((attrs) => pickAttrs(attrs, ['src', 'poster', 'width', 'height', 'controls']))
  const sourceTags = parseTags(source, 'source')
    .map((attrs) => attrs.src)
    .filter(Boolean)
  const mp4Links = [...source.matchAll(/https?:\/\/[^\s"'<>]+?\.(?:mp4|mov|webm)(?:\?[^\s"'<>]*)?/giu)].map((match) => match[0])

  return {
    canonical: links.find((attrs) => lower(attrs.rel) === 'canonical')?.href || null,
    headings: extractHeadings(source),
    hreflang: links
      .filter((attrs) => attrs.hreflang)
      .map((attrs) => ({
        href: attrs.href || null,
        hreflang: attrs.hreflang,
      })),
    images,
    jsonLd: extractJSONLD(source),
    metaDescription: metaByName(meta, 'description'),
    og: Object.fromEntries(
      meta
        .filter((attrs) => lower(attrs.property || attrs.name).startsWith('og:'))
        .map((attrs) => [attrs.property || attrs.name, attrs.content || '']),
    ),
    title: cleanText(stripHTML(source.match(/<title[^>]*>([\s\S]*?)<\/title>/iu)?.[1] || '')),
    twitter: Object.fromEntries(
      meta
        .filter((attrs) => lower(attrs.name || attrs.property).startsWith('twitter:'))
        .map((attrs) => [attrs.name || attrs.property, attrs.content || '']),
    ),
    videos: {
      iframes,
      mp4Links,
      sources: sourceTags,
      videos: videoTags,
    },
  }
}

function parseTags(html, tagName) {
  const results = []
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>`, 'giu')

  for (const match of html.matchAll(pattern)) {
    results.push(parseAttrs(match[1] || ''))
  }

  return results
}

function parseAttrs(source) {
  const attrs = {}
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/giu

  for (const match of source.matchAll(pattern)) {
    attrs[lower(match[1])] = decodeHTML(match[2] ?? match[3] ?? match[4] ?? '')
  }

  return attrs
}

function pickAttrs(attrs, keys) {
  return Object.fromEntries(keys.map((key) => [key, attrs[key] || null]))
}

function metaByName(meta, name) {
  return meta.find((attrs) => lower(attrs.name) === name)?.content || null
}

function extractHeadings(html) {
  const headings = []
  const pattern = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/giu

  for (const match of html.matchAll(pattern)) {
    headings.push({
      level: Number(match[1]),
      text: cleanText(stripHTML(match[2])),
    })
  }

  return headings
}

function extractJSONLD(html) {
  const items = []
  const pattern = /<script\b[^>]*type=(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/giu

  for (const match of html.matchAll(pattern)) {
    const raw = decodeHTML(match[2] || '').trim()
    let parsed = null

    try {
      parsed = JSON.parse(raw)
    } catch (_error) {
      parsed = null
    }

    items.push({
      raw,
      types: collectJSONLDTypes(parsed),
    })
  }

  return items
}

function collectJSONLDTypes(value) {
  const types = []
  const visit = (node) => {
    if (!node || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item)
      }
      return
    }

    const type = node['@type']

    if (Array.isArray(type)) {
      types.push(...type)
    } else if (type) {
      types.push(type)
    }

    for (const item of Object.values(node)) {
      visit(item)
    }
  }

  visit(value)

  return [...new Set(types.map(String))]
}

function summarizeBaseline(siteReports) {
  const pages = siteReports.flatMap((site) => site.pages)

  return {
    canonicalMissing: pages.filter((page) => !page.canonical).length,
    h1Missing: pages.filter((page) => !page.headings.some((heading) => heading.level === 1)).length,
    jsonLdMissing: pages.filter((page) => page.jsonLd.length === 0).length,
    ogMissing: pages.filter((page) => !page.og['og:title'] || !page.og['og:description']).length,
    pages: pages.length,
    statusNot200: pages.filter((page) => page.status < 200 || page.status > 299).length,
    videoPages: pages.filter((page) => hasVideo(page.videos)).length,
  }
}

function hasVideo(videos) {
  return Boolean(
    videos?.iframes?.length ||
      videos?.mp4Links?.length ||
      videos?.sources?.length ||
      videos?.videos?.some((item) => item.src || item.poster),
  )
}

async function loginToPayload(cms) {
  if (!cms.email || !cms.password) {
    throw new Error('CMS_EMAIL and CMS_PASSWORD are required for import.')
  }

  const payload = await payloadRequest({
    body: {
      email: cms.email,
      password: cms.password,
    },
    cms,
    method: 'POST',
    pathname: '/api/users/login',
  })
  const token = payload?.token

  if (!token) {
    throw new Error('Payload login did not return a token.')
  }

  return token
}

async function findExistingArticle({ articleData, cms, token }) {
  const byLegacyURL = await findArticleByParams({
    cms,
    params: {
      'where[legacySource.wpURL][equals]': articleData.legacySource.wpURL,
    },
    token,
  })

  if (byLegacyURL) {
    return byLegacyURL
  }

  return findArticleByParams({
    cms,
    params: {
      'where[and][0][slug][equals]': articleData.slug,
      'where[and][1][languageCode][equals]': articleData.languageCode,
    },
    token,
  })
}

async function findArticleByParams({ cms, params: filterParams, token }) {
  const searchParams = new URLSearchParams({
    depth: '0',
    limit: '1',
    ...filterParams,
  })

  try {
    const payload = await payloadRequest({
      cms,
      method: 'GET',
      pathname: `/api/${TARGET_COLLECTION}?${searchParams.toString()}`,
      token,
    })

    return payload?.docs?.[0] || null
  } catch (_error) {
    return null
  }
}

async function payloadRequest({ body, cms, method, pathname, token }) {
  const response = await fetchWithTimeout(`${cms.baseURL}${pathname}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    },
    method,
  })
  const text = await response.text()
  const payload = text ? safeJSON(text) : null

  if (!response.ok) {
    throw new Error(`Payload ${method} ${pathname} failed: HTTP ${response.status} ${text.slice(0, 800)}`)
  }

  return payload
}

async function findLatestExportDir() {
  const rootItems = await fs.readdir(artifactRoot, { withFileTypes: true }).catch(() => [])
  const dirs = rootItems
    .filter((item) => item.isDirectory())
    .map((item) => path.join(artifactRoot, item.name, 'wp-export'))

  for (const dir of dirs.sort().reverse()) {
    try {
      await fs.access(path.join(dir, 'summary.json'))
      return dir
    } catch (_error) {
      // Continue.
    }
  }

  throw new Error(`No export directory found under ${artifactRoot}. Pass --input DIR.`)
}

function cleanBaseURL(value) {
  return String(value || '').replace(/\/+$/u, '')
}

function normalizeURLSlug(url) {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)

    return parts.at(-1) || ''
  } catch (_error) {
    return ''
  }
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase()
}

function stripHTML(value) {
  return decodeHTML(String(value || '').replace(/<[^>]+>/gu, ' '))
}

function cleanText(value) {
  return decodeHTML(String(value || ''))
    .replace(/\s+/gu, ' ')
    .trim()
}

function lower(value) {
  return String(value || '').toLowerCase()
}

function safeJSON(value) {
  try {
    return JSON.parse(value)
  } catch (_error) {
    return null
  }
}

function decodeHTML(value) {
  return String(value || '')
    .replace(/&nbsp;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
    .replace(/&quot;/giu, '"')
    .replace(/&#039;/giu, "'")
    .replace(/&#8211;/giu, '-')
    .replace(/&#8212;/giu, '-')
    .replace(/&#(\d+);/gu, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/giu, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
}
