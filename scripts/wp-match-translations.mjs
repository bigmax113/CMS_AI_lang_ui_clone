#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const SITE_CODES = ['en', 'bg', 'cs', 'uk']
const DEFAULT_EXPORT_DIR = path.resolve('..', 'migration_artifacts', 'wp-migration-20260603-full', 'wp-export')
const DEFAULT_OUTPUT_DIR = path.resolve('..', 'migration_artifacts', 'wp-translation-matching')
const HIGH_CONFIDENCE_SCORE = Number(process.env.WP_MATCH_HIGH_CONFIDENCE_SCORE || 80)
const REVIEW_SCORE = Number(process.env.WP_MATCH_REVIEW_SCORE || 52)

const STOP_TOKENS = new Set([
  'and',
  'blog',
  'com',
  'for',
  'from',
  'game',
  'games',
  'gaming',
  'how',
  'jpg',
  'lorgar',
  'png',
  'the',
  'with',
  'your',
])

const VERY_COMMON_TOKENS = new Set([
  'blog',
  'content',
  'game',
  'games',
  'gaming',
  'image',
  'lorgar',
  'main',
  'mouse',
  'platform',
])

const MODEL_WORDS = new Set([
  'aim',
  'asbis',
  'astral',
  'battlefield',
  'cha41',
  'clair',
  'comic',
  'counter-strike',
  'cs2',
  'de90',
  'direct',
  'dpi',
  'dp80',
  'elite',
  'esports',
  'expedition',
  'gta',
  'hytale',
  'kbp70',
  'kbp70tklw',
  'lan',
  'marathon',
  'msa10w',
  'mse90w',
  'msp80',
  'passion',
  'raf1',
  'rankings',
  'redsec',
  'rx1fm',
  'smp40',
  'stake',
  'v3',
])

const GENERIC_ASSET_NAMES = new Set([
  '1',
  '2',
  '3',
  '4',
  '5',
  'frame',
  'image',
  'image-1',
  'image-scaled',
  'img',
  'lp',
  'main',
  'main-1',
  'main-2',
  'main-3',
  'main-4',
  'main-5',
  'photo',
  'slide',
  'untitled-1',
  'untitled-2',
])

let cachedPayloadToken = null

const command = process.argv[2] || 'report'
const args = parseArgs(process.argv.slice(3))

if (!['report', 'apply'].includes(command)) {
  console.log('Usage: node scripts/wp-match-translations.mjs report|apply [--input DIR] [--output DIR]')
  process.exit(1)
}

try {
  const inputDir = path.resolve(args.input || DEFAULT_EXPORT_DIR)
  const outputDir = path.resolve(args.output || DEFAULT_OUTPUT_DIR)
  const runDir = path.join(outputDir, new Date().toISOString().replace(/[:.]/g, '-'))
  const posts = await readExportedPosts(inputDir)
  const matches = buildMatches(posts)
  const cmsArticles = command === 'apply' ? await fetchCMSImportedArticles() : []
  const applyResult = command === 'apply' ? await applyMatches({ cmsArticles, groups: matches.highConfidenceGroups }) : null

  await fs.mkdir(runDir, { recursive: true })
  await writeJSON(path.join(runDir, 'high-confidence-groups.json'), matches.highConfidenceGroups)
  await writeJSON(path.join(runDir, 'review-candidates.json'), matches.reviewCandidates)
  await writeJSON(path.join(runDir, 'skipped-ambiguous-groups.json'), matches.skippedAmbiguousGroups)
  await writeJSON(path.join(runDir, 'summary.json'), {
    applied: applyResult,
    generatedAt: new Date().toISOString(),
    highConfidenceGroups: matches.highConfidenceGroups.length,
    highConfidencePosts: matches.highConfidenceGroups.reduce((sum, group) => sum + group.posts.length, 0),
    inputDir,
    mode: command,
    reviewCandidates: matches.reviewCandidates.length,
    skippedAmbiguousGroups: matches.skippedAmbiguousGroups.length,
    threshold: {
      highConfidence: HIGH_CONFIDENCE_SCORE,
      review: REVIEW_SCORE,
    },
    totalPosts: posts.length,
  })

  console.log(`[wp-match] done ${runDir}`)
  console.log(
    JSON.stringify(
      {
        applied: applyResult?.updated ?? 0,
        errors: applyResult?.errors?.length ?? 0,
        highConfidenceGroups: matches.highConfidenceGroups.length,
        highConfidencePosts: matches.highConfidenceGroups.reduce((sum, group) => sum + group.posts.length, 0),
        reviewCandidates: matches.reviewCandidates.length,
        skippedAmbiguousGroups: matches.skippedAmbiguousGroups.length,
      },
      null,
      2,
    ),
  )

  if (applyResult?.errors?.length) {
    process.exitCode = 2
  }
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exit(1)
}

async function readExportedPosts(inputDir) {
  const allPosts = []

  for (const languageCode of SITE_CODES) {
    const payload = JSON.parse(await fs.readFile(path.join(inputDir, `${languageCode}.json`), 'utf8'))

    for (const post of payload.posts || []) {
      allPosts.push(enrichPost(post, languageCode))
    }
  }

  const assetFrequency = new Map()

  for (const post of allPosts) {
    for (const asset of post.assets) {
      assetFrequency.set(asset, (assetFrequency.get(asset) || 0) + 1)
    }
  }

  return allPosts.map((post) => ({
    ...post,
    uniqueAssets: new Set([...post.assets].filter((asset) => (assetFrequency.get(asset) || 0) <= 4)),
  }))
}

function enrichPost(post, languageCode) {
  const title = cleanText(stripHTML(post.titleHTML || ''))
  const text = cleanText(stripHTML(`${post.slug || ''} ${post.titleHTML || ''} ${post.excerptHTML || ''}`))
  const assets = new Set([
    fileKey(post.featuredMedia?.source_url),
  ].filter(Boolean))
  const tokens = extractTokens(`${post.slug || ''} ${title} ${text}`)
  const date = new Date(post.dateGMT || post.date || 0)

  return {
    assets,
    date,
    id: post.id,
    languageCode,
    link: post.link,
    modelTokens: new Set([...tokens].filter(isModelToken)),
    slug: post.slug,
    title,
    tokens,
  }
}

function buildMatches(posts) {
  const pairScores = []

  for (let leftIndex = 0; leftIndex < posts.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < posts.length; rightIndex += 1) {
      const left = posts[leftIndex]
      const right = posts[rightIndex]

      if (left.languageCode === right.languageCode) {
        continue
      }

      const score = scorePair(left, right)

      if (score.total >= REVIEW_SCORE) {
        pairScores.push({
          left: postRef(left),
          reasons: score.reasons,
          right: postRef(right),
          score: score.total,
        })
      }
    }
  }

  const highEdges = mutualBestEdges(pairScores)
  const graphGroups = connectedGroups(highEdges)
  const highConfidenceGroups = []
  const skippedAmbiguousGroups = []

  for (const group of graphGroups) {
    const languages = new Set(group.posts.map((post) => post.languageCode))
    const hasDuplicateLanguage = languages.size !== group.posts.length

    if (hasDuplicateLanguage) {
      skippedAmbiguousGroups.push(group)
      continue
    }

    highConfidenceGroups.push({
      confidence: Math.min(...group.edges.map((edge) => edge.score)),
      edges: group.edges,
      posts: group.posts.sort(sortPostRefs),
      translationGroup: translationGroupFor(group.posts),
    })
  }

  return {
    highConfidenceGroups: highConfidenceGroups.sort((a, b) => b.confidence - a.confidence),
    reviewCandidates: pairScores
      .filter((edge) => edge.score >= REVIEW_SCORE && edge.score < HIGH_CONFIDENCE_SCORE)
      .sort((a, b) => b.score - a.score),
    skippedAmbiguousGroups,
  }
}

function mutualBestEdges(edges) {
  const bestByPairAndSource = new Map()

  for (const edge of edges.filter((item) => item.score >= HIGH_CONFIDENCE_SCORE)) {
    for (const [source, target] of [
      [edge.left, edge.right],
      [edge.right, edge.left],
    ]) {
      const key = `${source.languageCode}:${source.id}->${target.languageCode}`
      const current = bestByPairAndSource.get(key)

      if (!current || edge.score > current.score) {
        bestByPairAndSource.set(key, { edge, target })
      }
    }
  }

  return edges.filter((edge) => {
    if (edge.score < HIGH_CONFIDENCE_SCORE) {
      return false
    }

    const leftBest = bestByPairAndSource.get(`${edge.left.languageCode}:${edge.left.id}->${edge.right.languageCode}`)
    const rightBest = bestByPairAndSource.get(`${edge.right.languageCode}:${edge.right.id}->${edge.left.languageCode}`)

    return leftBest?.target.id === edge.right.id && rightBest?.target.id === edge.left.id
  })
}

function connectedGroups(edges) {
  const nodes = new Map()
  const adjacency = new Map()

  for (const edge of edges) {
    const leftKey = nodeKey(edge.left)
    const rightKey = nodeKey(edge.right)

    nodes.set(leftKey, edge.left)
    nodes.set(rightKey, edge.right)
    adjacency.set(leftKey, [...(adjacency.get(leftKey) || []), { edge, key: rightKey }])
    adjacency.set(rightKey, [...(adjacency.get(rightKey) || []), { edge, key: leftKey }])
  }

  const visited = new Set()
  const groups = []

  for (const key of nodes.keys()) {
    if (visited.has(key)) {
      continue
    }

    const stack = [key]
    const groupKeys = new Set()
    const groupEdges = new Map()

    while (stack.length) {
      const current = stack.pop()

      if (!current || visited.has(current)) {
        continue
      }

      visited.add(current)
      groupKeys.add(current)

      for (const next of adjacency.get(current) || []) {
        groupEdges.set(edgeKey(next.edge), next.edge)

        if (!visited.has(next.key)) {
          stack.push(next.key)
        }
      }
    }

    const posts = [...groupKeys].map((item) => nodes.get(item)).filter(Boolean)

    if (posts.length > 1) {
      groups.push({
        edges: [...groupEdges.values()].sort((a, b) => b.score - a.score),
        posts,
      })
    }
  }

  return groups
}

function scorePair(left, right) {
  const reasons = []
  let total = 0

  if (left.slug && left.slug === right.slug) {
    total += 100
    reasons.push('same slug +100')
  }

  const modelOverlap = intersection(left.modelTokens, right.modelTokens)
  const modelScore = Math.min(modelOverlap.length * 18, 72)

  if (modelScore) {
    total += modelScore
    reasons.push(`model/product tokens ${modelOverlap.join(', ')} +${modelScore}`)
  }

  const assetOverlap = intersection(left.uniqueAssets, right.uniqueAssets)
  const assetScore = Math.min(assetOverlap.length * 28, 56)

  if (assetScore) {
    total += assetScore
    reasons.push(`shared unique assets ${assetOverlap.slice(0, 5).join(', ')} +${assetScore}`)
  }

  const tokenOverlap = intersection(left.tokens, right.tokens).filter((token) => !isVeryCommonToken(token))
  const tokenScore = Math.min(tokenOverlap.length * 5, 35)

  if (tokenScore) {
    total += tokenScore
    reasons.push(`shared title/content tokens ${tokenOverlap.slice(0, 8).join(', ')} +${tokenScore}`)
  }

  const dateDays = Math.abs(left.date.getTime() - right.date.getTime()) / 86_400_000
  let dateScore = 0

  if (dateDays <= 7) {
    dateScore = 20
  } else if (dateDays <= 14) {
    dateScore = 14
  } else if (dateDays <= 30) {
    dateScore = 8
  } else if (dateDays <= 60) {
    dateScore = 3
  }

  if (dateScore) {
    total += dateScore
    reasons.push(`published within ${Math.round(dateDays)} days +${dateScore}`)
  }

  return {
    reasons,
    total,
  }
}

async function fetchCMSImportedArticles() {
  const cms = {
    baseURL: cleanBaseURL(process.env.CMS_BASE_URL || 'https://cms-ai.onrender.com'),
    email: process.env.CMS_EMAIL || '',
    password: process.env.CMS_PASSWORD || '',
  }

  if (!cms.email || !cms.password) {
    throw new Error('CMS_EMAIL and CMS_PASSWORD are required for apply.')
  }

  const login = await payloadRequest({
    body: {
      email: cms.email,
      password: cms.password,
    },
    cms,
    method: 'POST',
    pathname: '/api/users/login',
  })
  const token = login.token
  const docs = []

  for (let page = 1; page <= 20; page += 1) {
    const payload = await payloadRequest({
      cms,
      method: 'GET',
      pathname: `/api/articles?depth=0&limit=100&page=${page}&where%5BlegacySource.platform%5D%5Bequals%5D=wordpress`,
      token,
    })

    docs.push(...(payload.docs || []))

    if (!payload.hasNextPage) {
      break
    }
  }

  return docs.map((doc) => ({ ...doc, cms }))
}

async function applyMatches({ cmsArticles, groups }) {
  const byWPURL = new Map(cmsArticles.map((article) => [article.legacySource?.wpURL, article]))
  const updated = []
  const skipped = []
  const errors = []

  for (const group of groups) {
    for (const post of group.posts) {
      const article = byWPURL.get(post.link)

      if (!article) {
        skipped.push({ reason: 'CMS article not found by legacySource.wpURL', post })
        continue
      }

      try {
        await payloadRequest({
          body: {
            translationGroup: group.translationGroup,
          },
          cms: article.cms,
          method: 'PATCH',
          pathname: `/api/articles/${article.id}`,
          token: await getPayloadToken(article.cms),
        })
        updated.push({
          cmsID: article.id,
          languageCode: post.languageCode,
          title: post.title,
          translationGroup: group.translationGroup,
          wpURL: post.link,
        })
      } catch (error) {
        errors.push({
          error: error instanceof Error ? error.message : String(error),
          post,
          translationGroup: group.translationGroup,
        })
      }
    }
  }

  return {
    errors,
    skipped,
    updated: updated.length,
    updatedItems: updated,
  }
}

async function getPayloadToken(cms) {
  if (cachedPayloadToken) {
    return cachedPayloadToken
  }

  const login = await payloadRequest({
    body: {
      email: cms.email,
      password: cms.password,
    },
    cms,
    method: 'POST',
    pathname: '/api/users/login',
  })

  cachedPayloadToken = login.token

  return cachedPayloadToken
}

async function payloadRequest({ body, cms, method, pathname, token }) {
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

function postRef(post) {
  return {
    date: Number.isNaN(post.date.getTime()) ? null : post.date.toISOString(),
    id: post.id,
    languageCode: post.languageCode,
    link: post.link,
    slug: post.slug,
    title: post.title,
  }
}

function sortPostRefs(left, right) {
  return SITE_CODES.indexOf(left.languageCode) - SITE_CODES.indexOf(right.languageCode)
}

function translationGroupFor(posts) {
  const en = posts.find((post) => post.languageCode === 'en')
  const anchor = en || posts.slice().sort(sortPostRefs)[0]

  return `wp-${slugify(anchor.slug || anchor.title || `${anchor.languageCode}-${anchor.id}`)}`
}

function nodeKey(post) {
  return `${post.languageCode}:${post.id}`
}

function edgeKey(edge) {
  return [nodeKey(edge.left), nodeKey(edge.right)].sort().join('|')
}

function extractTokens(value) {
  const text = cleanText(value)
  const tokens = new Set()

  for (const match of text.matchAll(/[\p{Letter}\p{Number}][\p{Letter}\p{Number}\-+._]{1,}/gu)) {
    const raw = match[0]
    const token = normalizeToken(raw)

    if (token.length >= 3 && !STOP_TOKENS.has(token)) {
      tokens.add(token)
    }
  }

  for (const match of text.matchAll(/\b[A-Z]{2,}\d+[A-Z0-9]*\b|\b[A-Z]+[0-9]+[A-Z0-9]*\b|\b\d+[A-Z]{2,}\b/gu)) {
    tokens.add(match[0].toLowerCase())
  }

  return tokens
}

function isModelToken(token) {
  return (
    /^[a-z]{2,}\d+[a-z0-9]*$/u.test(token) ||
    /^\d+[a-z]{2,}$/u.test(token) ||
    MODEL_WORDS.has(token)
  )
}

function isVeryCommonToken(token) {
  return VERY_COMMON_TOKENS.has(token) || token.length < 4
}

function fileKey(value) {
  if (!value) {
    return ''
  }

  try {
    const url = new URL(String(value))
    const file = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) || '')
    const cleaned = file
      .toLowerCase()
      .replace(/-\d+x\d+(?=\.)/u, '')
      .replace(/\.(jpe?g|png|webp|gif|mp4|mov|webm)$/u, '')

    if (!cleaned || GENERIC_ASSET_NAMES.has(cleaned)) {
      return ''
    }

    return cleaned
  } catch (_error) {
    return ''
  }
}

function videoKey(value) {
  if (!value) {
    return ''
  }

  const source = String(value)
  const youtube = source.match(/(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/u)?.[1]

  if (youtube) {
    return `youtube:${youtube}`
  }

  const vimeo = source.match(/vimeo\.com\/(?:video\/)?(\d+)/u)?.[1]

  if (vimeo) {
    return `vimeo:${vimeo}`
  }

  return fileKey(source)
}

function srcSetKeys(value) {
  return String(value || '')
    .split(',')
    .map((item) => fileKey(item.trim().split(/\s+/u)[0]))
    .filter(Boolean)
}

function intersection(left, right) {
  const result = []

  for (const item of left) {
    if (right.has(item)) {
      result.push(item)
    }
  }

  return result
}

async function writeJSON(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function cleanBaseURL(value) {
  return String(value || '').replace(/\/+$/u, '')
}

function cleanText(value) {
  return decodeHTML(String(value || ''))
    .replace(/\s+/gu, ' ')
    .trim()
}

function stripHTML(value) {
  return String(value || '').replace(/<[^>]+>/gu, ' ')
}

function normalizeToken(value) {
  return decodeHTML(String(value || ''))
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/^[^\p{Letter}\p{Number}]+|[^\p{Letter}\p{Number}]+$/gu, '')
}

function slugify(value) {
  return normalizeToken(value)
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 120)
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
