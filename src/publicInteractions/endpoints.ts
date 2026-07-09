import type { Endpoint } from 'payload'

import { normalizeArticleLanguageCode } from '@/lib/articleTranslations'

type ArticleReactionBody = {
  articleSlug?: string
  reactionType?: string
}

type NewsletterSubscriptionBody = {
  email?: string
  languageCode?: string
  sourceURL?: string
}

const reactionTypes = ['like', 'discuss'] as const
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u
const payloadKVCollection = 'payload-kv'

const stringField = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

const payloadKVKey = (parts: string[]) =>
  parts
    .map((part) => part.trim().toLowerCase().replace(/[^a-z0-9._:-]+/gu, '-'))
    .filter(Boolean)
    .join(':')

const readKV = async (req: Parameters<Endpoint['handler']>[0], key: string) => {
  const result = await req.payload.find({
    collection: payloadKVCollection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      key: {
        equals: key,
      },
    },
  })

  return result.docs[0] as { data?: unknown; id?: number | string } | undefined
}

const upsertKV = async ({
  data,
  key,
  req,
}: {
  data: Record<string, unknown>
  key: string
  req: Parameters<Endpoint['handler']>[0]
}) => {
  const existing = await readKV(req, key)

  if (existing?.id) {
    return req.payload.update({
      collection: payloadKVCollection,
      data: {
        data,
        key,
      },
      id: existing.id,
      overrideAccess: true,
    })
  }

  return req.payload.create({
    collection: payloadKVCollection,
    data: {
      data,
      key,
    },
    overrideAccess: true,
  })
}

const readReactionCount = async (
  req: Parameters<Endpoint['handler']>[0],
  articleSlug: string,
  reactionType: (typeof reactionTypes)[number],
) => {
  const key = payloadKVKey(['frontend', 'article-reaction', articleSlug, reactionType])
  const current = await readKV(req, key)
  const currentData = current?.data && typeof current.data === 'object' && !Array.isArray(current.data)
    ? (current.data as { count?: number })
    : {}

  return Math.max(Number(currentData.count || 0), 0)
}
export const articleReactionCountsEndpoint: Endpoint = {
  handler: async (req) => {
    const requestURL = new URL(req.url || 'http://localhost/api/article-reactions')
    const articleSlug = stringField(requestURL.searchParams.get('articleSlug')).slice(0, 160)

    if (!articleSlug) {
      return Response.json({ error: 'Field "articleSlug" is required.', ok: false }, { status: 400 })
    }

    const countEntries = await Promise.all(
      reactionTypes.map(async (reactionType) => [
        reactionType,
        await readReactionCount(req, articleSlug, reactionType),
      ] as const),
    )

    return Response.json({
      counts: Object.fromEntries(countEntries),
      ok: true,
    })
  },
  method: 'get',
  path: '/article-reactions',
}
export const articleReactionEndpoint: Endpoint = {
  handler: async (req) => {
    const body = typeof req.json === 'function' ? ((await req.json()) as ArticleReactionBody) : {}
    const articleSlug = stringField(body.articleSlug).slice(0, 160)
    const reactionType = stringField(body.reactionType)

    if (!articleSlug) {
      return Response.json({ error: 'Field "articleSlug" is required.', ok: false }, { status: 400 })
    }

    if (!reactionTypes.includes(reactionType as (typeof reactionTypes)[number])) {
      return Response.json({ error: 'Choose a valid reaction type.', ok: false }, { status: 400 })
    }

    const validatedReactionType = reactionType as (typeof reactionTypes)[number]
    const key = payloadKVKey(['frontend', 'article-reaction', articleSlug, validatedReactionType])
    const current = await readKV(req, key)
    const currentData = current?.data && typeof current.data === 'object' && !Array.isArray(current.data)
      ? (current.data as { count?: number })
      : {}
    const count = Math.max(Number(currentData.count || 0), 0) + 1
    const data = {
      articleSlug,
      count,
      lastReactedAt: new Date().toISOString(),
      reactionType: validatedReactionType,
    }

    await upsertKV({ data, key, req })

    return Response.json({
      count,
      ok: true,
      reactionType: validatedReactionType,
    })
  },
  method: 'post',
  path: '/article-reactions',
}

export const newsletterSubscriptionEndpoint: Endpoint = {
  handler: async (req) => {
    const body = typeof req.json === 'function' ? ((await req.json()) as NewsletterSubscriptionBody) : {}
    const email = stringField(body.email).toLowerCase()

    if (!emailPattern.test(email)) {
      return Response.json({ error: 'Enter a valid email address.', ok: false }, { status: 400 })
    }

    const languageCode = normalizeArticleLanguageCode(body.languageCode)
    const sourceURL = stringField(body.sourceURL).slice(0, 500)
    const key = payloadKVKey(['frontend', 'newsletter', email])
    const data = {
      email,
      languageCode,
      lastSubmittedAt: new Date().toISOString(),
      sourceURL,
      status: 'active' as const,
    }

    await upsertKV({ data, key, req })

    return Response.json({ ok: true })
  },
  method: 'post',
  path: '/newsletter-subscriptions',
}
