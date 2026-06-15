import type { Endpoint } from 'payload'

import { normalizeArticleLanguageCode } from '@/lib/articleTranslations'
import { articleReactionsSlug } from '@/collections/ArticleReactions'
import { newsletterSubscriptionsSlug } from '@/collections/NewsletterSubscriptions'

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

const stringField = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

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
    const existing = await req.payload.find({
      collection: articleReactionsSlug,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        and: [
          {
            articleSlug: {
              equals: articleSlug,
            },
          },
          {
            reactionType: {
              equals: validatedReactionType,
            },
          },
        ],
      },
    })
    const current = existing.docs[0] as { count?: number; id?: number | string } | undefined
    const count = Math.max(Number(current?.count || 0), 0) + 1
    const data = {
      articleSlug,
      count,
      lastReactedAt: new Date().toISOString(),
      reactionType: validatedReactionType,
    }
    const reaction = current?.id
      ? await req.payload.update({
          collection: articleReactionsSlug,
          data,
          id: current.id,
          overrideAccess: true,
        })
      : await req.payload.create({
          collection: articleReactionsSlug,
          data,
          overrideAccess: true,
        })

    return Response.json({
      count: Number((reaction as { count?: number }).count || count),
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
    const existing = await req.payload.find({
      collection: newsletterSubscriptionsSlug,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        email: {
          equals: email,
        },
      },
    })
    const current = existing.docs[0] as { id?: number | string } | undefined
    const data = {
      email,
      languageCode,
      lastSubmittedAt: new Date().toISOString(),
      sourceURL,
      status: 'active' as const,
    }

    if (current?.id) {
      await req.payload.update({
        collection: newsletterSubscriptionsSlug,
        data,
        id: current.id,
        overrideAccess: true,
      })
    } else {
      await req.payload.create({
        collection: newsletterSubscriptionsSlug,
        data,
        overrideAccess: true,
      })
    }

    return Response.json({ ok: true })
  },
  method: 'post',
  path: '/newsletter-subscriptions',
}
