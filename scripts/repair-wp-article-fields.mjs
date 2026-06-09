import fs from 'node:fs/promises'
import path from 'node:path'

const WP_SITES = [
  { code: 'en', displayCode: 'EN' },
  { code: 'bg', displayCode: 'BG' },
  { code: 'cs', displayCode: 'CS' },
  { code: 'uk', displayCode: 'UA' },
]

const DEFAULT_ARTIFACT_ROOT = path.resolve(process.cwd(), '..', 'migration_artifacts')
const TARGET_COLLECTION = 'articles'
const DEFAULT_TIMEOUT_MS = 45_000

const args = parseArgs(process.argv.slice(2))
const selectedSites = selectSites(args.site)
const inputDir = args.input
  ? path.resolve(args.input)
  : path.resolve(process.cwd(), '..', 'migration_artifacts', 'wp-migration-20260603-full', 'wp-export')
const outputDir = args.output
  ? path.resolve(args.output)
  : path.join(
      DEFAULT_ARTIFACT_ROOT,
      `wp-article-field-repair-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    )
const dryRun = Boolean(args['dry-run'])
const limit = Number(args.limit || 0)

const cms = {
  baseURL: cleanBaseURL(process.env.CMS_BASE_URL || 'https://cms-ai.onrender.com'),
  email: process.env.CMS_EMAIL || process.env.PAYLOAD_ADMIN_EMAIL || '',
  password: process.env.CMS_PASSWORD || process.env.PAYLOAD_ADMIN_PASSWORD || '',
}

await ensureDir(outputDir)

try {
  const token = await loginToPayload(cms)
  const results = []

  for (const site of selectedSites) {
    const exportFile = path.join(inputDir, `${site.code}.json`)
    const siteExport = JSON.parse(await fs.readFile(exportFile, 'utf8'))
    const posts = limitItems(siteExport.posts || [], limit)

    for (const post of posts) {
      const source = sourceFieldsFromPost({ post, site })
      const existing = await findExistingArticle({ cms, source, token })

      if (!existing) {
        results.push({
          action: 'missing',
          languageCode: source.languageCode,
          slug: source.slug,
          wpURL: source.wpURL,
        })
        continue
      }

      const update = buildFieldRepairUpdate({ existing, source })

      if (!update.changedFields.length) {
        results.push({
          action: 'unchanged',
          id: existing.id,
          languageCode: source.languageCode,
          slug: source.slug,
          title: existing.title,
          wpURL: source.wpURL,
        })
        continue
      }

      if (!dryRun) {
        await payloadRequest({
          body: update.data,
          cms,
          method: 'PATCH',
          pathname: `/api/${TARGET_COLLECTION}/${existing.id}`,
          token,
        })
      }

      results.push({
        action: dryRun ? 'would-update' : 'updated',
        changedFields: update.changedFields,
        id: existing.id,
        languageCode: source.languageCode,
        slug: source.slug,
        title: existing.title,
        wpURL: source.wpURL,
      })
    }
  }

  const summary = {
    baseURL: cms.baseURL,
    dryRun,
    inputDir,
    outputDir,
    totals: {
      missing: results.filter((item) => item.action === 'missing').length,
      unchanged: results.filter((item) => item.action === 'unchanged').length,
      updated: results.filter((item) => item.action === 'updated' || item.action === 'would-update').length,
    },
  }

  await fs.writeFile(path.join(outputDir, 'results.json'), `${JSON.stringify({ results, summary }, null, 2)}\n`)
  await fs.writeFile(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  await fs.writeFile(path.join(outputDir, 'summary.md'), renderSummaryMarkdown(summary))

  console.log(`[repair] done ${outputDir}`)
  console.log(`[repair] ${JSON.stringify(summary.totals)}`)
} catch (error) {
  await fs.writeFile(
    path.join(outputDir, 'error.json'),
    `${JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`,
  )
  throw error
}

function sourceFieldsFromPost({ post, site }) {
  const title = cleanText(stripHTML(post.title?.rendered || post.titleHTML || post.slug || `WP ${post.id}`))
  const seo = post.seo || extractYoastFields(post)

  return {
    languageCode: site.code,
    seoDescription: cleanText(seo.description || cleanText(stripHTML(post.excerpt?.rendered || post.excerptHTML || '')) || title),
    seoTitle: cleanText(seo.title || title),
    slug: post.slug,
    summary: cleanText(stripHTML(post.excerpt?.rendered || post.excerptHTML || '')),
    title,
    wpURL: post.link,
  }
}

function buildFieldRepairUpdate({ existing, source }) {
  const data = {}
  const changedFields = []
  const existingSEO = existing.seo && typeof existing.seo === 'object' ? existing.seo : {}
  const seo = { ...existingSEO }

  if (shouldReplaceFromSource(existing.summary, source.summary)) {
    data.summary = source.summary
    changedFields.push('summary')
  }

  if (shouldReplaceFromSource(existingSEO.title, source.seoTitle)) {
    seo.title = source.seoTitle
    data.seo = seo
    changedFields.push('seo.title')
  }

  if (shouldReplaceFromSource(existingSEO.description, source.seoDescription)) {
    seo.description = source.seoDescription
    data.seo = seo
    changedFields.push('seo.description')
  }

  return { changedFields, data }
}

function shouldReplaceFromSource(currentValue, sourceValue) {
  const source = cleanText(sourceValue)
  const current = cleanText(currentValue)

  if (!source) {
    return false
  }

  if (!current) {
    return true
  }

  if (current === source) {
    return false
  }

  return normalizeForPrefix(source).startsWith(normalizeForPrefix(current))
}

function normalizeForPrefix(value) {
  return cleanText(value).toLowerCase()
}

async function loginToPayload(cmsConfig) {
  if (!cmsConfig.email || !cmsConfig.password) {
    throw new Error('CMS_EMAIL/CMS_PASSWORD or PAYLOAD_ADMIN_EMAIL/PAYLOAD_ADMIN_PASSWORD are required.')
  }

  const payload = await payloadRequest({
    body: {
      email: cmsConfig.email,
      password: cmsConfig.password,
    },
    cms: cmsConfig,
    method: 'POST',
    pathname: '/api/users/login',
  })
  const token = payload?.token

  if (!token) {
    throw new Error('Payload login did not return a token.')
  }

  return token
}

async function findExistingArticle({ cms: cmsConfig, source, token }) {
  return (
    (await findArticleByParams({
      cms: cmsConfig,
      params: {
        'where[legacySource.wpURL][equals]': source.wpURL,
      },
      token,
    })) ||
    findArticleByParams({
      cms: cmsConfig,
      params: {
        'where[and][0][slug][equals]': source.slug,
        'where[and][1][languageCode][equals]': source.languageCode,
      },
      token,
    })
  )
}

async function findArticleByParams({ cms: cmsConfig, params, token }) {
  const searchParams = new URLSearchParams({
    depth: '0',
    limit: '1',
    ...params,
  })

  try {
    const payload = await payloadRequest({
      cms: cmsConfig,
      method: 'GET',
      pathname: `/api/${TARGET_COLLECTION}?${searchParams.toString()}`,
      token,
    })

    return payload?.docs?.[0] || null
  } catch (_error) {
    return null
  }
}

async function payloadRequest({ body, cms: cmsConfig, method, pathname, token }) {
  const response = await fetchWithTimeout(`${cmsConfig.baseURL}${pathname}`, {
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

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeoutID = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutID)
  }
}

function extractYoastFields(post) {
  const yoast = post.yoast_head_json || {}

  return {
    description: yoast.description || yoast.og_description || '',
    title: yoast.title || yoast.og_title || '',
  }
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

  const requested = new Set(String(value).split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))

  return WP_SITES.filter((site) => requested.has(site.code))
}

function limitItems(items, requestedLimit) {
  return requestedLimit > 0 ? items.slice(0, requestedLimit) : items
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

function cleanBaseURL(value) {
  return String(value || '').replace(/\/+$/u, '')
}

function stripHTML(value) {
  return decodeHTML(String(value || '').replace(/<[^>]+>/gu, ' '))
}

function cleanText(value) {
  return decodeHTML(String(value || ''))
    .replace(/\s+/gu, ' ')
    .trim()
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

function renderSummaryMarkdown(summary) {
  return [
    '# WP Article Field Repair',
    '',
    `- Base URL: ${summary.baseURL}`,
    `- Input: ${summary.inputDir}`,
    `- Dry run: ${summary.dryRun ? 'yes' : 'no'}`,
    `- Updated/would update: ${summary.totals.updated}`,
    `- Unchanged: ${summary.totals.unchanged}`,
    `- Missing: ${summary.totals.missing}`,
    '',
  ].join('\n')
}
