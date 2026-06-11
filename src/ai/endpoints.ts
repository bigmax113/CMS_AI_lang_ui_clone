import type { Endpoint, Payload } from 'payload'
import type { ContextChunk, ContextChunkRanker } from './localDocs'
import type { Article } from '../payload-types'

import { buildLocalDocContext, getLocalDocFolders, getLocalDocInventory } from './localDocs'
import {
  articleLanguageDefinitions,
  articleLanguageDisplayCode,
  articleTranslationGroupFromArticle,
  inferArticleLanguageCode,
  normalizeArticleLanguageCode,
  stripArticleLanguagePrefix,
} from '../lib/articleTranslations'
import { slugifyArticleTitle } from '../lib/articleFields'

const DEFAULT_XAI_BASE_URL = 'https://api.x.ai/v1'
const DEFAULT_GROK_TEXT_MODEL = 'grok-4.3'
const DEFAULT_GROK_IMAGE_MODEL = 'grok-imagine-image'
const DEFAULT_GROK_VIDEO_MODEL = 'grok-imagine-video'
const DEFAULT_MAX_EMBEDDING_CANDIDATES = 5_000
const EMBEDDING_BATCH_SIZE = 16
const QUERY_EXPANSION_CACHE_VERSION = 'hybrid-v3'
const LEXICAL_BOOST_LIMIT = 0.18
const MAX_ARTICLE_BRIEF_CHARS = 24_000
const MAX_ARTICLE_TRANSLATION_CHARS = 26_000
const MAX_ARTICLE_TRANSLATION_SEGMENTS = 160
const MAX_ARTICLE_TRANSLATION_SEGMENT_CHARS = 4_000

const embeddingCache = new Map<string, number[]>()
const queryExpansionCache = new Map<string, string[]>()

type AskRequestBody = {
  answerInQuestionLanguage?: boolean
  crossLanguageSearch?: boolean
  dryRun?: boolean
  embeddingModel?: string
  folder?: string | string[]
  include?: string | string[]
  includePDF?: boolean
  maxChunks?: number
  maxContextChars?: number
  maxEmbeddingCandidates?: number
  maxFiles?: number
  model?: string
  question?: string
  temperature?: number
  useEmbeddings?: boolean
}

type GenerateImageRequestBody = {
  aspectRatio?: string
  model?: string
  n?: number
  prompt?: string
  resolution?: string
}

type GenerateVideoRequestBody = {
  duration?: number
  imageURL?: string
  model?: string
  prompt?: string
  waitForResult?: boolean
}

type VideoStatusRequestBody = {
  requestID?: string
}

type GenerateArticleRequestBody = {
  audience?: string
  brief?: string
  keywords?: string[] | string
  language?: string
  model?: string
  title?: string
  tone?: string
}

type SaveArticleDraftRequestBody = {
  draft?: ArticleDraft
  languageCode?: string
  status?: 'draft' | 'published' | 'review'
}

type ArticleTranslationSegment = {
  id: string
  kind?: string
  text: string
}

type ArticleDraft = {
  bodyMarkdown?: string
  faq?: Array<{
    answer: string
    question: string
  }>
  outline?: string[]
  seoDescription?: string
  seoTitle?: string
  segments?: ArticleTranslationSegment[]
  slug?: string
  summary?: string
  title?: string
}

type TranslateArticlesRequestBody = {
  ids?: Array<number | string>
  locales?: string[]
}

type LexicalChild = {
  type: string
  version: number
  [key: string]: unknown
}

type LexicalContent = {
  root: {
    children: LexicalChild[]
    direction: 'ltr' | 'rtl' | null
    format: '' | 'center' | 'end' | 'justify' | 'left' | 'right' | 'start'
    indent: number
    type: string
    version: number
  }
  [key: string]: unknown
}

type TranslateUIRequestBody = {
  locale?: string
  strings?: Record<string, string>
}

const UI_TRANSLATION_LANGUAGES: Record<string, string> = {
  en: 'English',
  pl: 'Polish',
  ro: 'Romanian',
  ru: 'Russian',
  uk: 'Ukrainian',
}

const ARTICLE_TRANSLATION_LANGUAGES: Record<string, { code: string; language: string }> =
  Object.fromEntries(
    articleLanguageDefinitions.map((language) => [
      language.value,
      {
        code: language.displayCode,
        language: language.language,
      },
    ]),
  )

const uiTranslationCache = new Map<string, Record<string, string>>()

export const aiDocsEndpoint: Endpoint = {
  handler: async (req) => {
    const url = new URL(req.url || 'http://payload.local/api/ai-docs')
    const limit = Number(url.searchParams.get('limit') || 100)
    const inventory = await getLocalDocInventory(limit)

    return Response.json(inventory)
  },
  method: 'get',
  path: '/ai-docs',
}

export const aiFoldersEndpoint: Endpoint = {
  handler: async () => {
    return Response.json(await getLocalDocFolders())
  },
  method: 'get',
  path: '/ai-folders',
}

export const askEndpoint: Endpoint = {
  handler: async (req) => {
    let body: AskRequestBody

    try {
      body = typeof req.json === 'function' ? ((await req.json()) as AskRequestBody) : {}
    } catch (_error) {
      body = {}
    }

    const question = body.question?.trim()

    if (!question) {
      return Response.json({ error: 'Field "question" is required.' }, { status: 400 })
    }

    const docContext = await buildLocalDocContext({
      folder: body.folder,
      include: body.include,
      includePDF: body.includePDF ?? true,
      maxChunks: body.maxChunks,
      maxContextChars: body.maxContextChars,
      maxFiles: body.maxFiles,
      question,
      rankChunks:
        body.useEmbeddings === false || !getXAIEmbeddingModel(body.embeddingModel)
          ? undefined
          : createEmbeddingRanker({
              crossLanguageSearch: body.crossLanguageSearch !== false,
              embeddingModel: body.embeddingModel,
              maxEmbeddingCandidates: body.maxEmbeddingCandidates,
            }),
    })

    if (body.dryRun) {
      return Response.json({
        answer: null,
        dryRun: true,
        question,
        ...docContext,
      })
    }

    const grok = await askGrok({
      answerInQuestionLanguage: body.answerInQuestionLanguage !== false,
      context: docContext.context,
      model: body.model,
      question,
      temperature: body.temperature,
    })

    return Response.json({
      answer: grok.answer,
      grok,
      question,
      ...docContext,
    })
  },
  method: 'post',
  path: '/ask',
}

export const generateImageEndpoint: Endpoint = {
  handler: async (req) => {
    let body: GenerateImageRequestBody

    try {
      body = typeof req.json === 'function' ? ((await req.json()) as GenerateImageRequestBody) : {}
    } catch (_error) {
      body = {}
    }

    const prompt = body.prompt?.trim()

    if (!prompt) {
      return Response.json({ error: 'Field "prompt" is required.' }, { status: 400 })
    }

    const result = await generateGrokImage({
      aspectRatio: body.aspectRatio,
      model: body.model,
      n: body.n,
      prompt,
      resolution: body.resolution,
    })

    return Response.json(result, { status: result.ok ? 200 : 502 })
  },
  method: 'post',
  path: '/generate-image',
}

export const generateVideoEndpoint: Endpoint = {
  handler: async (req) => {
    let body: GenerateVideoRequestBody

    try {
      body = typeof req.json === 'function' ? ((await req.json()) as GenerateVideoRequestBody) : {}
    } catch (_error) {
      body = {}
    }

    const prompt = body.prompt?.trim()

    if (!prompt) {
      return Response.json({ error: 'Field "prompt" is required.' }, { status: 400 })
    }

    const result = await generateGrokVideo({
      duration: body.duration,
      imageURL: body.imageURL,
      model: body.model,
      prompt,
      waitForResult: body.waitForResult !== false,
    })

    return Response.json(result, {
      status: result.ok ? 200 : result.status === 'running' ? 202 : 502,
    })
  },
  method: 'post',
  path: '/generate-video',
}

export const videoStatusEndpoint: Endpoint = {
  handler: async (req) => {
    let body: VideoStatusRequestBody

    try {
      body = typeof req.json === 'function' ? ((await req.json()) as VideoStatusRequestBody) : {}
    } catch (_error) {
      body = {}
    }

    const url = new URL(req.url || 'http://payload.local/api/video-status')
    const requestID = body.requestID?.trim() || url.searchParams.get('requestID')?.trim()

    if (!requestID) {
      return Response.json({ error: 'Field "requestID" is required.' }, { status: 400 })
    }

    const result = await getGrokVideoStatus({
      baseURL: getXAIBaseURL(),
      requestID,
    })

    return Response.json(
      {
        model: process.env.GROK_VIDEO_MODEL || DEFAULT_GROK_VIDEO_MODEL,
        ok: result.status === 'done',
        requestID,
        ...result,
      },
      { status: result.status === 'done' || result.status === 'running' ? 200 : 502 },
    )
  },
  method: 'post',
  path: '/video-status',
}

export const generateArticleEndpoint: Endpoint = {
  handler: async (req) => {
    let body: GenerateArticleRequestBody

    try {
      body =
        typeof req.json === 'function' ? ((await req.json()) as GenerateArticleRequestBody) : {}
    } catch (_error) {
      body = {}
    }

    const brief = body.brief?.trim()
    const title = body.title?.trim()

    if (!brief && !title) {
      return Response.json({ error: 'Field "brief" or "title" is required.' }, { status: 400 })
    }

    const result = await generateGrokArticle({
      audience: body.audience,
      brief: brief || '',
      keywords: body.keywords,
      language: body.language,
      model: body.model,
      title: title || '',
      tone: body.tone,
    })

    return Response.json(result, { status: result.ok ? 200 : 502 })
  },
  method: 'post',
  path: '/generate-article',
}

export const saveArticleDraftEndpoint: Endpoint = {
  handler: async (req) => {
    let body: SaveArticleDraftRequestBody

    try {
      body =
        typeof req.json === 'function' ? ((await req.json()) as SaveArticleDraftRequestBody) : {}
    } catch (_error) {
      body = {}
    }

    const draft = normalizeArticleDraft(body.draft || {}, '')
    const title = draft.title?.trim()

    if (!title || !draft.bodyMarkdown?.trim()) {
      return Response.json(
        { error: 'A generated article title and body are required.' },
        { status: 400 },
      )
    }

    try {
      const language = resolveArticleLanguage(body.languageCode)
      const slug = await createUniqueArticleSlug(
        req.payload,
        withLanguageSlugPrefix(language.code, draft.slug || title),
      )
      const languageCode = normalizeArticleLanguageCode(language.code)
      const translationGroup = articleTranslationGroupFromArticle({
        slug,
        title,
      })
      const article = await req.payload.create({
        collection: 'articles',
        data: {
          aiAssist: {
            brief: draft.summary || title,
            editorialNotes: `Saved from AI Workbench as ${language.code}.`,
          },
          content: markdownToLexical(draft.bodyMarkdown),
          contentType: 'article',
          languageCode,
          seo: {
            description: optionalArticleField(draft.seoDescription),
            title: optionalArticleField(draft.seoTitle),
          },
          slug,
          status: body.status || 'draft',
          summary: optionalArticleField(draft.summary),
          title: withLanguageTitlePrefix(language.code, title),
          translationGroup,
        },
        overrideAccess: false,
        user: req.user,
      })

      return Response.json({
        article,
        adminURL: `/admin/collections/articles/${article.id}`,
        ok: true,
        publicURL: `/articles/${encodeURIComponent(article.slug)}`,
      })
    } catch (error) {
      return Response.json({ error: errorMessageFromUnknown(error), ok: false }, { status: 400 })
    }
  },
  method: 'post',
  path: '/save-article-draft',
}

export const translateArticlesEndpoint: Endpoint = {
  handler: async (req) => {
    let body: TranslateArticlesRequestBody

    try {
      body =
        typeof req.json === 'function' ? ((await req.json()) as TranslateArticlesRequestBody) : {}
    } catch (_error) {
      body = {}
    }

    const ids = uniqueStrings(
      (body.ids || []).map((id) => String(id).trim()).filter(Boolean),
    ).slice(0, 10)
    const locales = uniqueStrings((body.locales || []).map((locale) => locale.toLowerCase().trim()))
      .map(resolveArticleLanguage)
      .filter(Boolean)

    if (!ids.length) {
      return Response.json({ error: 'Select at least one article.' }, { status: 400 })
    }

    if (!locales.length) {
      return Response.json({ error: 'Select at least one target language.' }, { status: 400 })
    }

    const created = []
    const failed: Array<{ error: string; id: string; language: string }> = []

    for (const id of ids) {
      let source: Article

      try {
        source = await req.payload.findByID({
          collection: 'articles',
          depth: 0,
          id,
          overrideAccess: false,
          user: req.user,
        })
      } catch (error) {
        for (const locale of locales) {
          failed.push({
            error: errorMessageFromUnknown(error),
            id,
            language: locale.language,
          })
        }
        continue
      }

      const sourceTitle =
        textFromUnknown(source.title) || textFromUnknown(source.slug) || `Article ${source.id}`
      const sourceAIAssist = source.aiAssist || {}
      const sourceSEO = source.seo || {}
      const sourceLanguageCode = inferArticleLanguageCode(source)
      const sourceTranslationGroup = articleTranslationGroupFromArticle(source)

      if (
        source.languageCode !== sourceLanguageCode ||
        source.translationGroup !== sourceTranslationGroup
      ) {
        await req.payload.update({
          collection: 'articles',
          data: {
            languageCode: sourceLanguageCode,
            translationGroup: sourceTranslationGroup,
          },
          id: source.id,
          overrideAccess: false,
          user: req.user,
        })
      }

      for (const locale of locales) {
        try {
          const targetLanguageCode = normalizeArticleLanguageCode(locale.code)

          if (targetLanguageCode === sourceLanguageCode) {
            continue
          }

          const contentPlan = createArticleContentTranslationPlan(source.content)
          const sourceBody =
            contentPlan?.segments
              .map((segment) => segment.text)
              .filter(Boolean)
              .join('\n\n') ||
            lexicalToMarkdown(source.content) ||
            textFromUnknown(source.summary) ||
            textFromUnknown(sourceAIAssist.brief) ||
            sourceTitle
          const translated = await translateArticleFields({
            bodyMarkdown: sourceBody,
            language: locale.language,
            seoDescription: textFromUnknown(sourceSEO.description),
            seoTitle: textFromUnknown(sourceSEO.title),
            segments: contentPlan?.segments || [],
            summary: textFromUnknown(source.summary),
            title: stripLanguageTitlePrefix(sourceTitle),
          })
          const translatedContent = contentPlan?.segments.length
            ? contentPlan.apply(translated.segments || [])
            : markdownToLexical(translated.bodyMarkdown || sourceBody)
          const slug = await createUniqueArticleSlug(
            req.payload,
            withLanguageSlugPrefix(
              locale.code,
              source.slug || translated.slug || translated.title || sourceTitle,
            ),
          )
          const article = await req.payload.create({
            collection: 'articles',
            data: {
              aiAssist: {
                brief: `Translated from article ${source.id} to ${locale.language}.`,
                editorialNotes: `AI translation generated with LORGAR product-content prompt.`,
              },
              authors: source.authors || [],
              category: source.category,
              content: translatedContent,
              contentType: source.contentType || 'article',
              coverImage: source.coverImage,
              languageCode: targetLanguageCode,
              owner: source.owner,
              seo: {
                description: optionalArticleField(translated.seoDescription || sourceSEO.description),
                image: sourceSEO.image,
                title: optionalArticleField(translated.seoTitle || sourceSEO.title),
              },
              slug,
              status: 'draft',
              summary: optionalArticleField(translated.summary || source.summary),
              tags: source.tags || [],
              title: withLanguageTitlePrefix(locale.code, translated.title || sourceTitle),
              translationGroup: sourceTranslationGroup,
            },
            overrideAccess: false,
            user: req.user,
          })

          created.push({
            id: article.id,
            language: locale.language,
            title: article.title,
            url: `/admin/collections/articles/${article.id}`,
          })
        } catch (error) {
          failed.push({
            error: errorMessageFromUnknown(error),
            id,
            language: locale.language,
          })
        }
      }
    }

    return Response.json(
      {
        created,
        failed,
        ok: failed.length === 0,
        total: created.length,
      },
      { status: created.length || !failed.length ? 200 : 400 },
    )
  },
  method: 'post',
  path: '/translate-articles',
}

export const translateUiEndpoint: Endpoint = {
  handler: async (req) => {
    let body: TranslateUIRequestBody

    try {
      body = typeof req.json === 'function' ? ((await req.json()) as TranslateUIRequestBody) : {}
    } catch (_error) {
      body = {}
    }

    const locale = body.locale?.trim().toLowerCase() || 'en'
    const language = UI_TRANSLATION_LANGUAGES[locale]

    if (!language) {
      return Response.json({ error: 'Unsupported locale.' }, { status: 400 })
    }

    const strings = Object.entries(body.strings || {})
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .slice(0, 180)

    if (!strings.length) {
      return Response.json({ error: 'Field "strings" is required.' }, { status: 400 })
    }

    if (locale === 'en') {
      return Response.json({ locale, strings: Object.fromEntries(strings) })
    }

    const cacheKey = `${locale}:${JSON.stringify(strings)}`
    const cached = uiTranslationCache.get(cacheKey)

    if (cached) {
      return Response.json({ cached: true, locale, strings: cached })
    }

    const result = await translateUIStrings({
      language,
      strings: Object.fromEntries(strings),
    })

    if (!result.ok) {
      return Response.json(result, { status: result.status || 502 })
    }

    uiTranslationCache.set(cacheKey, result.strings)

    return Response.json({
      locale,
      model: result.model,
      strings: result.strings,
    })
  },
  method: 'post',
  path: '/translate-ui',
}

function createEmbeddingRanker(args: {
  crossLanguageSearch: boolean
  embeddingModel?: string
  maxEmbeddingCandidates?: number
}): ContextChunkRanker {
  return async ({ chunks, maxChunks, question }) => {
    const baseURL = getXAIBaseURL()
    const model = getXAIEmbeddingModel(args.embeddingModel)

    if (!model) {
      return {
        chunks,
        ranker: 'lexical',
        warnings: ['XAI_EMBEDDING_MODEL is not configured; semantic reranking was skipped.'],
      }
    }

    const candidateLimit = clampNumber(
      args.maxEmbeddingCandidates,
      maxChunks,
      5_000,
      DEFAULT_MAX_EMBEDDING_CANDIDATES,
    )
    const candidates = chunks.slice(0, candidateLimit)
    const searchQueries = args.crossLanguageSearch
      ? await expandSearchQueries({
          baseURL,
          question,
        })
      : [question]
    const embeddings = await embedTexts({
      baseURL,
      model,
      texts: [...searchQueries, ...candidates.map(chunkToEmbeddingText)],
    })

    const questionEmbeddings = embeddings.slice(0, searchQueries.length)
    const chunkEmbeddings = embeddings.slice(searchQueries.length)

    if (!questionEmbeddings.length || chunkEmbeddings.length !== candidates.length) {
      throw new Error('xAI returned an unexpected embeddings response.')
    }

    const rankedChunks = candidates
      .map((chunk, index) => {
        const chunkEmbedding = chunkEmbeddings[index] || []
        const primaryScore = cosineSimilarity(questionEmbeddings[0] || [], chunkEmbedding)
        const expandedScore = Math.max(
          primaryScore,
          ...questionEmbeddings
            .slice(1)
            .map((questionEmbedding) => cosineSimilarity(questionEmbedding, chunkEmbedding)),
        )
        const score =
          args.crossLanguageSearch && questionEmbeddings.length > 1
            ? primaryScore * 0.75 + expandedScore * 0.25
            : primaryScore
        const boostedScore = score + scoreSearchQueries(searchQueries, chunk)

        return {
          ...chunk,
          score: boostedScore,
        }
      })
      .sort((a, b) => b.score - a.score || a.fileName.localeCompare(b.fileName))

    return {
      chunks: rankedChunks,
      ranker: `embeddings:${model}${args.crossLanguageSearch ? ':multi-query' : ''}`,
    }
  }
}

async function expandSearchQueries(args: { baseURL: string; question: string }): Promise<string[]> {
  const cacheKey = `${QUERY_EXPANSION_CACHE_VERSION}:${args.question.trim().toLowerCase()}`
  const cached = queryExpansionCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const deterministicQueries = createRuleBasedSearchQueries(args.question)
  const fallback = uniqueStrings([args.question, ...deterministicQueries])

  try {
    const model = process.env.GROK_TEXT_MODEL || DEFAULT_GROK_TEXT_MODEL
    const response = await fetch(`${args.baseURL}/chat/completions`, {
      body: JSON.stringify({
        max_tokens: 240,
        messages: [
          {
            content: [
              'You create search queries for multilingual document retrieval.',
              'Return ONLY a JSON array of strings.',
              'Include the original meaning, an English query, and likely business-system synonyms.',
              'Every query must preserve the exact user intent; never broaden to a different workflow.',
              'Do not answer the question.',
            ].join(' '),
            role: 'system',
          },
          {
            content: `Question: ${args.question}\nReturn 3 to 5 concise search queries.`,
            role: 'user',
          },
        ],
        model,
        temperature: 0.1,
      }),
      headers: createXAIHeaders(),
      method: 'POST',
    })

    if (!response.ok) {
      return fallback
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
    }
    const content = payload.choices?.[0]?.message?.content || ''
    const match = content.match(/\[[\s\S]*\]/u)
    const parsed = match ? (JSON.parse(match[0]) as unknown) : undefined
    const expanded = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
    const queries = uniqueStrings([args.question, ...deterministicQueries, ...expanded]).slice(0, 8)

    queryExpansionCache.set(cacheKey, queries.length ? queries : fallback)

    return queries.length ? queries : fallback
  } catch (_error) {
    return fallback
  }
}

function textFromUnknown(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(textFromUnknown).filter(Boolean).join('\n')
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return ''
}

function stringArrayFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(textFromUnknown).filter(Boolean)
  }

  const text = textFromUnknown(value)

  return text
    ? text
        .split(/\r?\n|;/u)
        .map((item) => item.replace(/^[-*\d.)\s]+/u, '').trim())
        .filter(Boolean)
    : []
}

function faqFromUnknown(value: unknown): ArticleDraft['faq'] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const record = item as Record<string, unknown>
      const question = textFromUnknown(record.question)
      const answer = textFromUnknown(record.answer)

      return question && answer ? { answer, question } : null
    })
    .filter((item): item is { answer: string; question: string } => Boolean(item))
}

function translationSegmentsFromUnknown(value: unknown): ArticleTranslationSegment[] {
  if (!Array.isArray(value)) {
    return []
  }

  const segments: ArticleTranslationSegment[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const record = item as Record<string, unknown>
    const id = textFromUnknown(record.id)
    const text = textFromUnknown(record.text)
    const kind = textFromUnknown(record.kind)

    if (id && text) {
      segments.push({
        id,
        ...(kind ? { kind } : {}),
        text,
      })
    }
  }

  return segments
}

function parseModelJSONObject(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*|\s*```$/giu, '')

  try {
    return JSON.parse(trimmed || '{}')
  } catch (error) {
    const firstBrace = trimmed.indexOf('{')
    const lastBrace = trimmed.lastIndexOf('}')

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
    }

    throw error
  }
}

function normalizeArticleDraft(value: unknown, fallbackTitle: string): ArticleDraft {
  const source: Record<string, unknown> =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : { bodyMarkdown: value }
  const title = textFromUnknown(source.title) || fallbackTitle || 'Generated article draft'
  const slug =
    textFromUnknown(source.slug) || slugifyArticleTitle(title) || 'generated-article-draft'

  return {
    bodyMarkdown: textFromUnknown(source.bodyMarkdown),
    faq: faqFromUnknown(source.faq),
    outline: stringArrayFromUnknown(source.outline),
    seoDescription: textFromUnknown(source.seoDescription),
    seoTitle: textFromUnknown(source.seoTitle),
    segments: translationSegmentsFromUnknown(source.segments),
    slug,
    summary: textFromUnknown(source.summary),
    title,
  }
}

function plainTextFromMarkdown(value: unknown): string {
  return textFromUnknown(value)
    .replace(/```[\s\S]*?```/gu, ' ')
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/gu, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replace(/^#{1,6}\s+/gmu, '')
    .replace(/^[-*]\s+/gmu, '')
    .replace(/\s+/gu, ' ')
    .trim()
}

const terminalPlainTextPunctuation = /[.!?]["')\]]?$/u
const plainTextSentenceEnd = /[.!?]["')\]]?(?=\s|$)/gu
const danglingPlainEnglishWord = /\b(?:a|an|and|as|at|by|for|from|in|into|of|on|or|the|to|with)$/iu

function excerptPlainText(value: unknown, maxChars = 320): string {
  const text = plainTextFromMarkdown(value)

  if (text.length <= maxChars) {
    return text
  }

  const window = text.slice(0, maxChars).trim()
  let lastSentenceEnd = -1

  for (const match of window.matchAll(plainTextSentenceEnd)) {
    lastSentenceEnd = (match.index || 0) + match[0].length
  }

  const minimumUsefulLength = Math.min(140, Math.floor(maxChars * 0.55))

  if (lastSentenceEnd >= minimumUsefulLength) {
    return window.slice(0, lastSentenceEnd).trim()
  }

  return window.replace(/\s+\S*$/u, '').trim() || window
}

function isLikelyTruncatedPlainText(value: unknown): boolean {
  const text = plainTextFromMarkdown(value)

  if (!text || terminalPlainTextPunctuation.test(text)) {
    return false
  }

  if (danglingPlainEnglishWord.test(text)) {
    return true
  }

  return !/[.!?]/u.test(text.slice(-90))
}

function ensureArticleDraftCompleteness(draft: ArticleDraft, fallbackTitle: string): ArticleDraft {
  const title = textFromUnknown(draft.title) || fallbackTitle || 'Generated article draft'
  const rawSummary = textFromUnknown(draft.summary)
  const bodySummary = excerptPlainText(draft.bodyMarkdown, 420)
  const summary = rawSummary && !isLikelyTruncatedPlainText(rawSummary) ? rawSummary : bodySummary || rawSummary
  const seoTitle = textFromUnknown(draft.seoTitle) || title
  const bodyExcerpt = excerptPlainText(draft.bodyMarkdown, 320)
  const seoDescriptionCandidate =
    textFromUnknown(draft.seoDescription) || summary || bodyExcerpt || `Read the full article: ${title}.`
  const seoDescription =
    seoDescriptionCandidate === seoTitle || seoDescriptionCandidate === title
      ? bodyExcerpt && bodyExcerpt !== title
        ? bodyExcerpt
        : `Read the full article: ${title}.`
      : seoDescriptionCandidate

  return {
    ...draft,
    seoDescription,
    seoTitle,
    summary,
    title,
  }
}

function clipArticleBrief(value: string): string {
  return value.length > MAX_ARTICLE_BRIEF_CHARS ? value.slice(0, MAX_ARTICLE_BRIEF_CHARS) : value
}

function clipArticleTranslationText(value: string): string {
  return value.length > MAX_ARTICLE_TRANSLATION_CHARS
    ? value.slice(0, MAX_ARTICLE_TRANSLATION_CHARS).trim()
    : value
}

function optionalArticleField(value: unknown): string | undefined {
  const text = textFromUnknown(value)

  if (!text) {
    return undefined
  }

  return text
}

function errorMessageFromUnknown(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const data =
      record.data && typeof record.data === 'object'
        ? (record.data as Record<string, unknown>)
        : null
    const errors = Array.isArray(record.errors)
      ? record.errors
      : Array.isArray(data?.errors)
        ? data?.errors
        : []
    const messages = errors
      .map((item) => {
        if (item && typeof item === 'object') {
          const itemRecord = item as Record<string, unknown>

          return textFromUnknown(itemRecord.message || itemRecord.label || itemRecord.path)
        }

        return textFromUnknown(item)
      })
      .filter(Boolean)

    if (messages.length) {
      return messages.join('; ')
    }

    return textFromUnknown(record.message) || JSON.stringify(record)
  }

  return String(error)
}

function resolveArticleLanguage(value?: string): { code: string; language: string } {
  const normalized = normalizeArticleLanguageCode(value)
  const byCode = Object.values(ARTICLE_TRANSLATION_LANGUAGES).find(
    (language) => language.code.toLowerCase() === String(value || '').trim().toLowerCase(),
  )

  return ARTICLE_TRANSLATION_LANGUAGES[normalized] || byCode || ARTICLE_TRANSLATION_LANGUAGES.en
}

function stripLanguageTitlePrefix(value: unknown): string {
  return stripArticleLanguagePrefix(textFromUnknown(value))
}

function withLanguageTitlePrefix(code: string, title: unknown): string {
  const cleanTitle = stripLanguageTitlePrefix(title) || 'Untitled article'

  return `[${articleLanguageDisplayCode(code)}] ${cleanTitle}`
}

function withLanguageSlugPrefix(code: string, value: unknown): string {
  const prefix = articleLanguageDisplayCode(code).toLowerCase()
  const base = slugifyArticleTitle(stripLanguageTitlePrefix(value)) || 'article'
  const withoutLanguagePrefix = slugifyArticleTitle(stripLanguageTitlePrefix(base)) || 'article'

  return `${prefix}-${withoutLanguagePrefix}`
}

function markdownToLexical(markdown: unknown): LexicalContent {
  const markdownText = textFromUnknown(markdown)
  const children: LexicalChild[] = []
  const paragraphLines: string[] = []
  const flushParagraph = () => {
    const text = paragraphLines.join(' ').trim()

    if (text) {
      children.push(createLexicalParagraph(text))
    }

    paragraphLines.length = 0
  }

  for (const rawLine of markdownText.replace(/\r\n/gu, '\n').split('\n')) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/u)

    if (heading) {
      flushParagraph()
      children.push(createLexicalHeading(heading[2] || '', heading[1]?.length || 2))
      continue
    }

    paragraphLines.push(line.replace(/^[-*]\s+/u, '• '))
  }

  flushParagraph()

  return {
    root: {
      children: children.length ? children : [createLexicalParagraph('Draft content is empty.')],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

function createLexicalText(text: string): LexicalChild {
  return {
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text,
    type: 'text',
    version: 1,
  }
}

function createLexicalParagraph(text: string): LexicalChild {
  return {
    children: [createLexicalText(text)],
    direction: null,
    format: '',
    indent: 0,
    type: 'paragraph',
    version: 1,
  }
}

function createLexicalHeading(text: string, level: number): LexicalChild {
  return {
    children: [createLexicalText(text)],
    direction: null,
    format: '',
    indent: 0,
    tag: `h${Math.min(Math.max(level, 1), 6)}`,
    type: 'heading',
    version: 1,
  }
}

function lexicalToMarkdown(content: unknown): string {
  const root = content && typeof content === 'object' ? (content as { root?: unknown }).root : null
  const lines: string[] = []

  collectLexicalMarkdown(root, lines)

  return lines.join('\n\n').trim()
}

function createArticleContentTranslationPlan(content: unknown): {
  apply: (segments: ArticleTranslationSegment[]) => LexicalContent
  content: LexicalContent
  segments: ArticleTranslationSegment[]
} | null {
  const source = cloneLexicalContent(content)

  if (!source?.root) {
    return null
  }

  const targets: Array<{
    apply: (text: string) => void
    segment: ArticleTranslationSegment
  }> = []
  let totalChars = 0

  const addTarget = (kind: string, value: unknown, apply: (text: string) => void) => {
    if (
      targets.length >= MAX_ARTICLE_TRANSLATION_SEGMENTS ||
      totalChars >= MAX_ARTICLE_TRANSLATION_CHARS
    ) {
      return
    }

    const text = textFromUnknown(value)

    if (!text || looksLikeNonTranslatableToken(text)) {
      return
    }

    const clippedText =
      text.length > MAX_ARTICLE_TRANSLATION_SEGMENT_CHARS
        ? text.slice(0, MAX_ARTICLE_TRANSLATION_SEGMENT_CHARS).trim()
        : text

    totalChars += clippedText.length
    targets.push({
      apply,
      segment: {
        id: `s${targets.length + 1}`,
        kind,
        text: clippedText,
      },
    })
  }

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') {
      return
    }

    const record = node as Record<string, unknown>
    const children = Array.isArray(record.children) ? record.children : []

    if (
      (record.type === 'heading' ||
        record.type === 'paragraph' ||
        record.type === 'quote' ||
        record.type === 'listitem') &&
      children.length
    ) {
      const text = inlineTextFromChildren(children)

      addTarget(String(record.type), text, (translatedText) => {
        record.children = [createLexicalText(translatedText)]
      })

      return
    }

    if (record.type === 'block' && record.fields && typeof record.fields === 'object') {
      collectBlockTranslationTargets(record.fields as Record<string, unknown>, addTarget)
    }

    children.forEach(visit)
  }

  visit(source.root)

  if (!targets.length) {
    return null
  }

  return {
    apply: (translatedSegments) => {
      const translatedByID = new Map(
        translatedSegments.map((segment) => [segment.id, segment.text]),
      )

      for (const target of targets) {
        const translatedText = translatedByID.get(target.segment.id)

        if (translatedText) {
          target.apply(translatedText)
        }
      }

      return source
    },
    content: source,
    segments: targets.map((target) => target.segment),
  }
}

function cloneLexicalContent(content: unknown): LexicalContent | null {
  if (!content || typeof content !== 'object') {
    return null
  }

  try {
    const clone = JSON.parse(JSON.stringify(content)) as LexicalContent

    return clone?.root ? clone : null
  } catch (_error) {
    return null
  }
}

function inlineTextFromChildren(children: unknown[]): string {
  return children
    .map((child) => {
      if (!child || typeof child !== 'object') {
        return ''
      }

      const record = child as Record<string, unknown>

      if (record.type === 'text') {
        return textFromUnknown(record.text)
      }

      return Array.isArray(record.children) ? inlineTextFromChildren(record.children) : ''
    })
    .join('')
    .trim()
}

function collectBlockTranslationTargets(
  fields: Record<string, unknown>,
  addTarget: (kind: string, value: unknown, apply: (text: string) => void) => void,
) {
  const blockType = textFromUnknown(fields.blockType)
  const addField = (key: string, kind = `${blockType}.${key}`) => {
    addTarget(kind, fields[key], (translatedText) => {
      fields[key] = translatedText
    })
  }

  if (blockType === 'imageBlock') {
    addField('caption')
    return
  }

  if (blockType === 'imageRow') {
    const images = Array.isArray(fields.images) ? fields.images : []

    images.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>

        addTarget(`imageRow.images.${index}.caption`, record.caption, (translatedText) => {
          record.caption = translatedText
        })
      }
    })
    return
  }

  if (blockType === 'productCard') {
    addProductCardTargets(fields, addTarget, blockType)
    return
  }

  if (blockType === 'productCardCarousel') {
    addField('heading')

    const products = Array.isArray(fields.products) ? fields.products : []

    products.forEach((item, index) => {
      if (item && typeof item === 'object') {
        addProductCardTargets(
          item as Record<string, unknown>,
          addTarget,
          `${blockType}.products.${index}`,
        )
      }
    })
    return
  }

  if (blockType === 'video') {
    ;['title', 'description'].forEach((key) => addField(key))

    if (fields.schema && typeof fields.schema === 'object') {
      const schema = fields.schema as Record<string, unknown>

      ;['name', 'description'].forEach((key) => {
        addTarget(`video.schema.${key}`, schema[key], (translatedText) => {
          schema[key] = translatedText
        })
      })
    }
    return
  }

  if (blockType === 'faq') {
    addField('heading')

    const items = Array.isArray(fields.items) ? fields.items : []

    items.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>

        ;['question', 'answer'].forEach((key) => {
          addTarget(`faq.items.${index}.${key}`, record[key], (translatedText) => {
            record[key] = translatedText
          })
        })
      }
    })
    return
  }

  ;['title', 'heading', 'label', 'body', 'description', 'caption'].forEach((key) => {
    if (typeof fields[key] === 'string') {
      addField(key)
    }
  })
}

function addProductCardTargets(
  fields: Record<string, unknown>,
  addTarget: (kind: string, value: unknown, apply: (text: string) => void) => void,
  prefix: string,
) {
  ;['description', 'ctaLabel', 'priceLabel'].forEach((key) => {
    addTarget(`${prefix}.${key}`, fields[key], (translatedText) => {
      fields[key] = translatedText
    })
  })
}

function looksLikeNonTranslatableToken(value: string): boolean {
  const trimmed = value.trim()

  return (
    /^https?:\/\//iu.test(trimmed) ||
    /^data:/iu.test(trimmed) ||
    /^[A-Z0-9_-]{2,}$/u.test(trimmed) ||
    /^[\d\s.,:/-]+$/u.test(trimmed)
  )
}

function collectLexicalMarkdown(node: unknown, lines: string[]): string {
  if (!node || typeof node !== 'object') {
    return ''
  }

  const record = node as Record<string, unknown>
  const children = Array.isArray(record.children) ? record.children : []

  if (record.type === 'text') {
    return textFromUnknown(record.text)
  }

  const childText = children
    .map((child) => collectLexicalMarkdown(child, lines))
    .join('')
    .trim()

  if (record.type === 'heading' && childText) {
    const tag = typeof record.tag === 'string' ? record.tag : 'h2'
    const level = Number(tag.replace(/^h/u, '')) || 2

    lines.push(`${'#'.repeat(Math.min(Math.max(level, 1), 6))} ${childText}`)
    return ''
  }

  if (
    (record.type === 'paragraph' || record.type === 'quote' || record.type === 'listitem') &&
    childText
  ) {
    lines.push(childText)
    return ''
  }

  if (record.type === 'block' && record.fields && typeof record.fields === 'object') {
    const blockText = blockFieldsToMarkdown(record.fields as Record<string, unknown>)

    if (blockText) {
      lines.push(blockText)
    }
  }

  return childText
}

function blockFieldsToMarkdown(fields: Record<string, unknown>): string {
  const lines: string[] = []
  const add = (value: unknown) => {
    const text = textFromUnknown(value)

    if (text && !looksLikeNonTranslatableToken(text)) {
      lines.push(text)
    }
  }
  const blockType = textFromUnknown(fields.blockType)

  if (blockType === 'imageBlock') {
    add(fields.caption)
  } else if (blockType === 'imageRow') {
    ;(Array.isArray(fields.images) ? fields.images : []).forEach((item) => {
      if (item && typeof item === 'object') {
        add((item as Record<string, unknown>).caption)
      }
    })
  } else if (blockType === 'productCard') {
    ;['description', 'ctaLabel', 'priceLabel'].forEach((key) => add(fields[key]))
  } else if (blockType === 'productCardCarousel') {
    add(fields.heading)
    ;(Array.isArray(fields.products) ? fields.products : []).forEach((item) => {
      if (item && typeof item === 'object') {
        const product = item as Record<string, unknown>

        ;['description', 'ctaLabel', 'priceLabel'].forEach((key) => add(product[key]))
      }
    })
  } else if (blockType === 'video') {
    ;['title', 'description'].forEach((key) => add(fields[key]))
    if (fields.schema && typeof fields.schema === 'object') {
      const schema = fields.schema as Record<string, unknown>

      ;['name', 'description'].forEach((key) => add(schema[key]))
    }
  } else if (blockType === 'faq') {
    add(fields.heading)
    ;(Array.isArray(fields.items) ? fields.items : []).forEach((item) => {
      if (item && typeof item === 'object') {
        const faq = item as Record<string, unknown>

        add(faq.question)
        add(faq.answer)
      }
    })
  } else {
    ;['title', 'heading', 'label', 'body', 'description', 'caption'].forEach((key) =>
      add(fields[key]),
    )
  }

  return lines.join('\n')
}

async function createUniqueArticleSlug(payload: Pick<Payload, 'find'>, baseSlug: string) {
  const base = slugifyArticleTitle(baseSlug) || 'article'
  let candidate = base
  let suffix = 2

  while (true) {
    const existing = await payload.find({
      collection: 'articles',
      limit: 1,
      where: {
        slug: {
          equals: candidate,
        },
      },
    })

    if (!existing.totalDocs) {
      return candidate
    }

    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

async function translateArticleFields(args: {
  bodyMarkdown: string
  language: string
  seoDescription: string
  seoTitle: string
  segments?: ArticleTranslationSegment[]
  summary: string
  title: string
}): Promise<ArticleDraft> {
  const baseURL = getXAIBaseURL()
  const model = process.env.GROK_TEXT_MODEL || DEFAULT_GROK_TEXT_MODEL
  const segments = args.segments || []
  const source = {
    bodyMarkdown: segments.length ? '' : clipArticleTranslationText(args.bodyMarkdown),
    seoDescription: args.seoDescription,
    seoTitle: args.seoTitle,
    segments,
    summary: args.summary,
    title: args.title,
  }
  const prompt = [
    'SYSTEM OVERRIDE FOR TRANSLATION QUALITY:',
    `Translate the provided LORGAR product/article content to ${args.language}.`,
    'Return ONLY valid JSON with keys: title, summary, bodyMarkdown, seoTitle, seoDescription, segments.',
    'If source.segments is present, return segments as an array of {id, text} with the same ids and order.',
    'Translate every human-readable segment, including H2/H3 headings, image captions, FAQ questions and answers, video titles/descriptions, CTA labels, summaries, SEO titles, and SEO descriptions.',
    'Do not leave English headings untranslated unless the heading is only a brand, product name, model, technology name, event name, URL, or SKU.',
    'Keep LORGAR, product names, technology names, model names, URLs, and SKUs unchanged.',
    'Preserve structure, paragraph order, heading levels, and segment IDs. Do not shorten the text or add facts.',
    'Style: natural native marketing copy for gaming products; modern, technological, confident, not overblown.',
    'Do not use long dashes. Prefer short hyphens or normal punctuation.',
    'Do not truncate title, summary, seoTitle, or seoDescription. Preserve full source meaning and field structure.',
    '',
    'Translation brief:',
    'You are a professional translator and content editor for the LORGAR gaming-equipment brand.',
    `Translate the product/article content to ${args.language}.`,
    'Keep the text structure, paragraphs, headings, and block order.',
    'Do not shorten the text. Do not add facts or marketing claims that are not in the source.',
    'The translation must sound natural to a native speaker, not literal.',
    'Style: modern, technological, gaming-oriented, confident, but not too pompous.',
    'Use common English gaming terms when they are normally used in the target market.',
    'Avoid overly formal or corporate wording.',
    'Keep product names, technology names, model names, SKUs, URLs, and the LORGAR brand unchanged.',
    'Adapt slogans so they sound natural and strong in the target language.',
    'Do not use long dashes. Prefer short hyphens or normal punctuation.',
    'Preserve SEO keywords when they are present.',
    'If a fragment sounds unnatural for the local market, adapt it while preserving the meaning.',
    'The final text must feel like original website copy for a gaming-peripherals brand in this market.',
    '',
    'Text to translate:',
    JSON.stringify(source, null, 2),
    '',
    'Return only valid JSON with keys: title, summary, bodyMarkdown, seoTitle, seoDescription, segments. Do not add markdown fences.',
  ].join('\n')

  const response = await fetch(`${baseURL}/chat/completions`, {
    body: JSON.stringify({
      max_tokens: segments.length ? 6_000 : 4_000,
      messages: [
        {
          content: prompt,
          role: 'user',
        },
      ],
      model,
      response_format: { type: 'json_object' },
      temperature: 0.25,
    }),
    headers: createXAIHeaders(),
    method: 'POST',
  })
  const payloadText = await response.text()

  if (!response.ok) {
    throw new Error(payloadText)
  }

  const payload = JSON.parse(payloadText) as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }
  const parsed = parseModelJSONObject(payload.choices?.[0]?.message?.content || '{}')
  const translated = normalizeArticleDraft(parsed, args.title)

  return reviewTranslatedArticleFields({
    baseURL,
    language: args.language,
    model,
    source,
    translated,
  })
}

async function reviewTranslatedArticleFields(args: {
  baseURL: string
  language: string
  model: string
  source: {
    bodyMarkdown: string
    seoDescription: string
    seoTitle: string
    segments: ArticleTranslationSegment[]
    summary: string
    title: string
  }
  translated: ArticleDraft
}): Promise<ArticleDraft> {
  const reviewPrompt = [
    `You are a senior native ${args.language} editor and localization QA specialist.`,
    'Review the translated article JSON against the source JSON. Return only these JSON keys: title, summary, bodyMarkdown, seoTitle, seoDescription, segments.',
    'If source.segments is present, also return segments as {id, text} objects with the same ids and order.',
    '',
    'Fix grammar, agreement, case, number, gender, word order, punctuation, awkward literal translations, and unnatural marketing phrasing.',
    'For Russian, Ukrainian, Polish, and Romanian, pay special attention to adjective-noun agreement and inflection in headings.',
    `Ensure all human-readable headings, including H2/H3 headings, are translated to ${args.language}. Do not leave English headings unless they are only brand/product/model/event names, URLs, or SKUs.`,
    'Example of an error to avoid in Russian: "Более быстрый интерактивная карта". Correct it as "Более быстрая интерактивная карта" or rewrite naturally as "Интерактивная карта стала быстрее".',
    'Do not shorten the article body and do not add new facts. Preserve headings, paragraphs, product names, model names, brands, and SEO keywords.',
    'Keep LORGAR untranslated. Keep common gaming terms in English when that sounds natural locally.',
    'Do not use long dashes. Prefer short hyphens or normal punctuation.',
    'Do not truncate title, summary, seoTitle, or seoDescription. Preserve full source meaning and field structure.',
    '',
    'Source JSON:',
    JSON.stringify(args.source, null, 2),
    '',
    'Translated JSON to proofread:',
    JSON.stringify(args.translated, null, 2),
    '',
    'Return only valid JSON. Do not add markdown fences.',
  ].join('\n')

  const response = await fetch(`${args.baseURL}/chat/completions`, {
    body: JSON.stringify({
      max_tokens: args.source.segments.length ? 6_000 : 4_000,
      messages: [
        {
          content: reviewPrompt,
          role: 'user',
        },
      ],
      model: args.model,
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
    headers: createXAIHeaders(),
    method: 'POST',
  })
  const payloadText = await response.text()

  if (!response.ok) {
    throw new Error(payloadText)
  }

  const payload = JSON.parse(payloadText) as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }
  const parsed = parseModelJSONObject(payload.choices?.[0]?.message?.content || '{}')

  return ensureArticleDraftCompleteness(
    normalizeArticleDraft(parsed, args.translated.title || args.source.title),
    args.translated.title || args.source.title,
  )
}

async function generateGrokArticle(args: {
  audience?: string
  brief: string
  keywords?: string[] | string
  language?: string
  model?: string
  title: string
  tone?: string
}): Promise<{
  baseURL: string
  draft?: ArticleDraft
  error?: string
  model: string
  ok: boolean
  status?: number
}> {
  const baseURL = getXAIBaseURL()
  const model = args.model || process.env.GROK_TEXT_MODEL || DEFAULT_GROK_TEXT_MODEL
  const keywords = Array.isArray(args.keywords)
    ? args.keywords.join(', ')
    : typeof args.keywords === 'string'
      ? args.keywords
      : ''

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      body: JSON.stringify({
        max_tokens: 2_800,
        messages: [
          {
            content: [
              'You are an editorial assistant for a Payload CMS product prototype.',
              'Create practical, publishable CMS article copy.',
              'Return ONLY valid JSON with keys: title, slug, summary, outline, bodyMarkdown, faq, seoTitle, seoDescription.',
              'bodyMarkdown, title, slug, summary, seoTitle, and seoDescription must be strings.',
              'Do not truncate summary, seoTitle, or seoDescription to fit old CMS character limits.',
              'outline must be an array of short strings.',
              'faq must be an array of objects with question and answer.',
              'Write in the requested output language. If the policy says to follow the brief, preserve the primary language of the source brief.',
              'Never translate English source material into Russian unless the user explicitly asks for Russian.',
              'Do not include markdown fences around the JSON.',
            ].join(' '),
            role: 'system',
          },
          {
            content: [
              `Output language policy: ${args.language || 'Use the same primary language as the brief and title. If the input is mostly English, output English only.'}`,
              `Working title: ${args.title || '(create a title)'}`,
              `Audience: ${args.audience || 'business reader'}`,
              `Tone: ${args.tone || 'clear, useful, product-focused'}`,
              `Keywords: ${keywords || '(none)'}`,
              `Brief: ${clipArticleBrief(args.brief || args.title)}`,
            ].join('\n'),
            role: 'user',
          },
        ],
        model,
        response_format: { type: 'json_object' },
        temperature: 0.35,
      }),
      headers: createXAIHeaders(),
      method: 'POST',
    })
    const payloadText = await response.text()

    if (!response.ok) {
      return {
        baseURL,
        error: payloadText,
        model,
        ok: false,
        status: response.status,
      }
    }

    const payload = JSON.parse(payloadText) as {
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
    }
    const parsedDraft = parseModelJSONObject(payload.choices?.[0]?.message?.content || '{}')
    const draft = ensureArticleDraftCompleteness(normalizeArticleDraft(parsedDraft, args.title), args.title)

    return {
      baseURL,
      draft,
      model,
      ok: true,
      status: response.status,
    }
  } catch (error) {
    return {
      baseURL,
      error: error instanceof Error ? error.message : String(error),
      model,
      ok: false,
    }
  }
}

async function generateGrokImage(args: {
  aspectRatio?: string
  model?: string
  n?: number
  prompt: string
  resolution?: string
}): Promise<{
  baseURL: string
  data?: Array<{
    b64_json?: string
    revised_prompt?: string
    url?: string
  }>
  error?: string
  model: string
  ok: boolean
  status?: number
}> {
  const baseURL = getXAIBaseURL()
  const model = args.model || process.env.GROK_IMAGE_MODEL || DEFAULT_GROK_IMAGE_MODEL

  try {
    const response = await fetch(`${baseURL}/images/generations`, {
      body: JSON.stringify({
        aspect_ratio: args.aspectRatio || '16:9',
        model,
        n: clampNumber(args.n, 1, 4, 1),
        prompt: args.prompt,
        resolution: args.resolution || '1k',
      }),
      headers: createXAIHeaders(),
      method: 'POST',
    })
    const payload = (await response.json().catch(async () => ({
      error: await response.text(),
    }))) as {
      data?: Array<{
        b64_json?: string
        revised_prompt?: string
        url?: string
      }>
      error?: string | { message?: string }
    }

    if (!response.ok) {
      return {
        baseURL,
        error: extractAPIError(payload),
        model,
        ok: false,
        status: response.status,
      }
    }

    return {
      baseURL,
      data: payload.data || [],
      model,
      ok: true,
      status: response.status,
    }
  } catch (error) {
    return {
      baseURL,
      error: error instanceof Error ? error.message : String(error),
      model,
      ok: false,
    }
  }
}

async function generateGrokVideo(args: {
  duration?: number
  imageURL?: string
  model?: string
  prompt: string
  waitForResult: boolean
}): Promise<{
  baseURL: string
  error?: string
  model: string
  ok: boolean
  requestID?: string
  status?: number | string
  video?: {
    url?: string
  }
}> {
  const baseURL = getXAIBaseURL()
  const model = args.model || process.env.GROK_VIDEO_MODEL || DEFAULT_GROK_VIDEO_MODEL

  try {
    const response = await fetch(`${baseURL}/videos/generations`, {
      body: JSON.stringify({
        duration: clampNumber(args.duration, 6, 15, 12),
        image: args.imageURL ? { url: args.imageURL } : undefined,
        model,
        prompt: args.prompt,
      }),
      headers: createXAIHeaders(),
      method: 'POST',
    })
    const payload = (await response.json().catch(async () => ({
      error: await response.text(),
    }))) as {
      error?: string | { message?: string }
      request_id?: string
      status?: string
      video?: {
        url?: string
      }
    }

    if (!response.ok) {
      return {
        baseURL,
        error: extractAPIError(payload),
        model,
        ok: false,
        status: response.status,
      }
    }

    const requestID = payload.request_id

    if (!requestID || !args.waitForResult) {
      return {
        baseURL,
        model,
        ok: Boolean(requestID),
        requestID,
        status: payload.status || response.status,
        video: payload.video,
      }
    }

    const completed = await pollGrokVideo({
      baseURL,
      requestID,
    })

    return {
      baseURL,
      model,
      ok: completed.status === 'done',
      requestID,
      status: completed.status,
      video: completed.video,
      ...(completed.error ? { error: completed.error } : {}),
    }
  } catch (error) {
    return {
      baseURL,
      error: error instanceof Error ? error.message : String(error),
      model,
      ok: false,
    }
  }
}

async function translateUIStrings(args: {
  language: string
  strings: Record<string, string>
}): Promise<{
  error?: string
  model: string
  ok: boolean
  status?: number
  strings: Record<string, string>
}> {
  const baseURL = getXAIBaseURL()
  const model = process.env.GROK_TEXT_MODEL || DEFAULT_GROK_TEXT_MODEL

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      body: JSON.stringify({
        max_tokens: 4_000,
        messages: [
          {
            content: [
              'You translate short user-interface strings for a Payload CMS AI prototype.',
              `Target language: ${args.language}.`,
              'Return only valid JSON with exactly the same keys as the input object.',
              'Do not translate product names, model names, API variable names, URLs, or collection slugs.',
              'Keep button labels short and natural for software UI.',
            ].join(' '),
            role: 'system',
          },
          {
            content: JSON.stringify(args.strings),
            role: 'user',
          },
        ],
        model,
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
      headers: createXAIHeaders(),
      method: 'POST',
    })

    const payloadText = await response.text()

    if (!response.ok) {
      return {
        error: payloadText,
        model,
        ok: false,
        status: response.status,
        strings: {},
      }
    }

    const payload = JSON.parse(payloadText) as {
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
    }
    const content = payload.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content) as Record<string, unknown>
    const strings = Object.fromEntries(
      Object.keys(args.strings).map((key) => [
        key,
        typeof parsed[key] === 'string' && parsed[key] ? parsed[key] : args.strings[key],
      ]),
    )

    return {
      model,
      ok: true,
      status: response.status,
      strings,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      model,
      ok: false,
      strings: {},
    }
  }
}

async function pollGrokVideo(args: { baseURL: string; requestID: string }): Promise<{
  error?: string
  status?: string
  video?: {
    url?: string
  }
}> {
  const maxAttempts = Number(process.env.GROK_VIDEO_POLL_ATTEMPTS || 12)
  const interval = Number(process.env.GROK_VIDEO_POLL_INTERVAL_MS || 5_000)

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const status = await getGrokVideoStatus(args)

    if (status.status === 'done' || status.status === 'failed' || status.status === 'expired') {
      return status
    }

    if (status.status?.startsWith('http-')) {
      return status
    }

    await sleep(interval)
  }

  return {
    error: 'Video generation is still running. Use the request ID to poll again later.',
    status: 'running',
  }
}

async function getGrokVideoStatus(args: { baseURL: string; requestID: string }): Promise<{
  error?: string
  status?: string
  video?: {
    url?: string
  }
}> {
  const response = await fetch(`${args.baseURL}/videos/${args.requestID}`, {
    headers: createXAIHeaders(),
    method: 'GET',
  })
  const payload = (await response.json().catch(async () => ({
    error: await response.text(),
  }))) as {
    error?: string | { message?: string }
    status?: string
    video?: {
      url?: string
    }
  }

  if (!response.ok) {
    return {
      error: extractAPIError(payload),
      status: `http-${response.status}`,
    }
  }

  return {
    error:
      payload.status && payload.status !== 'done' && payload.status !== 'running'
        ? extractAPIError(payload) || `Video ${payload.status}`
        : undefined,
    status: payload.status || 'running',
    video: payload.video,
  }
}

async function embedTexts(args: {
  baseURL: string
  model: string
  texts: string[]
}): Promise<number[][]> {
  const results = new Array<number[]>(args.texts.length)
  const missingIndexes: number[] = []
  const missingTexts: string[] = []

  args.texts.forEach((text, index) => {
    const cacheKey = createEmbeddingCacheKey(args.model, text)
    const cached = embeddingCache.get(cacheKey)

    if (cached) {
      results[index] = cached
      return
    }

    missingIndexes.push(index)
    missingTexts.push(text)
  })

  if (missingTexts.length) {
    for (let batchStart = 0; batchStart < missingTexts.length; batchStart += EMBEDDING_BATCH_SIZE) {
      const batchTexts = missingTexts.slice(batchStart, batchStart + EMBEDDING_BATCH_SIZE)
      const batchIndexes = missingIndexes.slice(batchStart, batchStart + EMBEDDING_BATCH_SIZE)
      const payload = await fetchEmbeddingBatch({
        baseURL: args.baseURL,
        input: batchTexts,
        model: args.model,
      })
      const embeddings = payload.data || []

      for (let index = 0; index < batchIndexes.length; index += 1) {
        const embedding = embeddings[index]?.embedding

        if (!embedding) {
          throw new Error(`Missing embedding at batch index ${batchStart + index}.`)
        }

        const textIndex = batchIndexes[index]
        const cacheKey = createEmbeddingCacheKey(args.model, args.texts[textIndex])

        embeddingCache.set(cacheKey, embedding)
        results[textIndex] = embedding
      }
    }
  }

  return results
}

async function fetchEmbeddingBatch(args: {
  baseURL: string
  input: string[]
  model: string
}): Promise<{
  data?: Array<{
    embedding?: number[]
    index?: number
  }>
}> {
  let lastError = ''

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let response: Response

    try {
      response = await fetch(`${args.baseURL}/embeddings`, {
        body: JSON.stringify({
          input: args.input,
          model: args.model,
        }),
        headers: createXAIHeaders(),
        method: 'POST',
      })
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)

      if (!isRetryableEmbeddingError(lastError) || attempt === 3) {
        throw new Error(`xAI embeddings failed: ${lastError}`)
      }

      await sleep(1_200 * attempt)
      continue
    }

    if (response.ok) {
      return (await response.json()) as {
        data?: Array<{
          embedding?: number[]
          index?: number
        }>
      }
    }

    lastError = await response.text()

    if (!isRetryableEmbeddingError(lastError) || attempt === 3) {
      throw new Error(`xAI embeddings failed with ${response.status}: ${lastError}`)
    }

    await sleep(1_500 * attempt)
  }

  throw new Error(`xAI embeddings failed: ${lastError || 'unknown error'}`)
}

function isRetryableEmbeddingError(message: string): boolean {
  const normalized = message.toLowerCase()

  return (
    normalized.includes('model reloaded') ||
    normalized.includes('model has crashed') ||
    normalized.includes('exit code') ||
    normalized.includes('socket') ||
    normalized.includes('econnreset') ||
    normalized.includes('fetch failed')
  )
}

async function askGrok(args: {
  answerInQuestionLanguage: boolean
  context: string
  model?: string
  question: string
  temperature?: number
}): Promise<{
  answer: string | null
  baseURL: string
  error?: string
  model: string
  ok: boolean
  status?: number
}> {
  const baseURL = getXAIBaseURL()
  const model = args.model || process.env.GROK_TEXT_MODEL || DEFAULT_GROK_TEXT_MODEL
  const system = [
    'You are Grok connected to a Payload CMS AI prototype.',
    args.answerInQuestionLanguage
      ? 'Detect the main language of QUESTION and answer in that same language. Do not choose the answer language from the document context. If the relevant source text is in another language, translate the answer into the question language.'
      : 'Answer in Russian unless the user explicitly asks for another language.',
    'Use only the supplied document context. If the context is insufficient, say so clearly.',
    'Cite source filenames in square brackets when possible.',
  ].join(' ')

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      body: JSON.stringify({
        max_tokens: 1_200,
        messages: [
          {
            content: system,
            role: 'system',
          },
          {
            content: `DOCUMENT CONTEXT:\n${args.context || '(no extracted context)'}\n\nQUESTION:\n${args.question}`,
            role: 'user',
          },
        ],
        model,
        temperature: typeof args.temperature === 'number' ? args.temperature : 0.2,
      }),
      headers: createXAIHeaders(),
      method: 'POST',
    })

    if (!response.ok) {
      return {
        answer: null,
        baseURL,
        error: await response.text(),
        model,
        ok: false,
        status: response.status,
      }
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
    }

    return {
      answer: payload.choices?.[0]?.message?.content || null,
      baseURL,
      model,
      ok: true,
      status: response.status,
    }
  } catch (error) {
    return {
      answer: null,
      baseURL,
      error: error instanceof Error ? error.message : String(error),
      model,
      ok: false,
    }
  }
}

function chunkToEmbeddingText(chunk: ContextChunk): string {
  return `${chunk.fileName}\n${chunk.text.slice(0, 2_400)}`
}

function scoreSearchQueries(searchQueries: string[], chunk: ContextChunk): number {
  const haystack = normalizeSearchText(`${chunk.fileName}\n${chunk.relativePath}\n${chunk.text}`)
  let bestScore = 0

  for (const query of searchQueries) {
    const normalizedQuery = normalizeSearchText(query)

    if (!normalizedQuery) {
      continue
    }

    const queryTokens = tokenizeForSearch(normalizedQuery)

    if (!queryTokens.length) {
      continue
    }

    const matchingTokens = queryTokens.filter((token) => haystack.includes(token))
    let score = (matchingTokens.length / queryTokens.length) * 0.08

    if (normalizedQuery.length >= 12 && haystack.includes(normalizedQuery)) {
      score += 0.1
    }

    if (matchingTokens.length >= 4) {
      score += 0.03
    }

    bestScore = Math.max(bestScore, Math.min(score, LEXICAL_BOOST_LIMIT))
  }

  return bestScore
}

function createRuleBasedSearchQueries(question: string): string[] {
  const normalized = normalizeSearchText(question)
  const queries: string[] = []

  if (
    /(\u0441\u043a\u0440\u044b|hide|hidden|hiding)/u.test(normalized) &&
    /(\u0442\u0438\u043f|type)/u.test(normalized) &&
    /(\u043f\u0440\u043e\u0434\u0443\u043a\u0442|product)/u.test(normalized) &&
    /(\u0432\u0435\u043d\u0434\u043e\u0440|vendor|\u043f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0438\u0442\u0435\u043b|manufacturer)/u.test(
      normalized,
    )
  ) {
    queries.push(
      'hide product types and vendors',
      'hidden product types and manufacturers',
      'hide prod types vendors',
      'sales details hidden product types vendors',
      'hide product types and vendors customer price list e-shop',
    )
  }

  return queries
}

function tokenizeForSearch(value: string): string[] {
  const stopWords = new Set([
    'and',
    'are',
    'for',
    'how',
    'the',
    'to',
    'what',
    'with',
    '\u043a\u0430\u043a',
    '\u0433\u0434\u0435',
    '\u0434\u043b\u044f',
    '\u0438\u043b\u0438',
    '\u0447\u0442\u043e',
  ])

  return value
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token))
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9\u0430-\u044f\u0451]+/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  const length = Math.min(a.length, b.length)

  for (let index = 0; index < length; index += 1) {
    const left = a[index] || 0
    const right = b[index] || 0

    dot += left * right
    normA += left * left
    normB += right * right
  }

  if (!normA || !normB) {
    return 0
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function createEmbeddingCacheKey(model: string, text: string): string {
  return `${model}:${text.length}:${text.slice(0, 200)}:${text.slice(-200)}`
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalized = value.trim()
    const key = normalized.toLowerCase()

    if (!normalized || seen.has(key)) {
      continue
    }

    seen.add(key)
    result.push(normalized)
  }

  return result
}

function createXAIHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.XAI_API_KEY || ''}`,
    'Content-Type': 'application/json',
  }
}

function extractAPIError(payload: { error?: string | { message?: string } }): string | undefined {
  if (typeof payload.error === 'string') {
    return payload.error
  }

  return payload.error?.message
}

function getXAIBaseURL(): string {
  return normalizeBaseURL(process.env.XAI_BASE_URL || DEFAULT_XAI_BASE_URL)
}

function getXAIEmbeddingModel(model?: string): string | undefined {
  return model || process.env.XAI_EMBEDDING_MODEL || undefined
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Number(value)))
}

function normalizeBaseURL(value: string): string {
  return value.replace(/\/+$/u, '')
}
