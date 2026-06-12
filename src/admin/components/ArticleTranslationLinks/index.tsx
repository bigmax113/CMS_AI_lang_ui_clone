'use client'

import React, { useEffect, useMemo, useState } from 'react'

import {
  articleLanguageLabelByCode,
  inferArticleLanguageCode,
} from '@/lib/articleTranslations'

const articleIDPattern = /\/admin\/collections\/articles\/([^/?#]+)/u

type ArticleRecord = {
  id: number | string
  languageCode?: null | string
  slug?: null | string
  status?: null | string
  title?: null | string
  translationGroup?: null | string
}

type APIListResponse = {
  docs?: ArticleRecord[]
}

type APIRecordResponse = ArticleRecord

const currentArticleIDFromLocation = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const id = window.location.pathname.match(articleIDPattern)?.[1]

  return id && id !== 'create' ? decodeURIComponent(id) : null
}

export const ArticleTranslationLinks: React.FC = () => {
  const currentID = useMemo(() => currentArticleIDFromLocation(), [])
  const [links, setLinks] = useState<ArticleRecord[]>([])
  const [message, setMessage] = useState(
    currentID ? 'Loading translations...' : 'Save this article first to link translations.',
  )

  useEffect(() => {
    if (!currentID) {
      return
    }

    let isMounted = true

    const loadLinks = async () => {
      try {
        const currentResponse = await fetch(`/api/articles/${currentID}?depth=0`)

        if (!currentResponse.ok) {
          throw new Error(`Cannot load current article: HTTP ${currentResponse.status}`)
        }

        const current = (await currentResponse.json()) as APIRecordResponse
        const group = current.translationGroup?.trim()

        if (!group) {
          if (isMounted) {
            setLinks([current])
            setMessage('Save once to generate a translation group.')
          }
          return
        }

        const query = new URLSearchParams({
          depth: '0',
          limit: '50',
          'where[translationGroup][equals]': group,
        })
        const response = await fetch(`/api/articles?${query.toString()}`)

        if (!response.ok) {
          throw new Error(`Cannot load translations: HTTP ${response.status}`)
        }

        const payload = (await response.json()) as APIListResponse
        const docs = payload.docs || []

        if (isMounted) {
          setLinks(docs)
          setMessage(docs.length > 1 ? '' : 'No linked translations yet.')
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : String(error))
        }
      }
    }

    void loadLinks()

    return () => {
      isMounted = false
    }
  }, [currentID])

  const sortedLinks = useMemo(
    () =>
      [...links].sort((left, right) =>
        inferArticleLanguageCode(left).localeCompare(inferArticleLanguageCode(right)),
      ),
    [links],
  )

  return (
    <div className="article-translation-links">
      <strong>Translations</strong>
      {message ? <p>{message}</p> : null}
      {sortedLinks.length ? (
        <div>
          {sortedLinks.map((article) => {
            const code = inferArticleLanguageCode(article)
            const isCurrent = String(article.id) === currentID

            return (
              <a
                aria-current={isCurrent ? 'page' : undefined}
                href={`/admin/collections/articles/${article.id}`}
                key={article.id}
                title={article.title || article.slug || `Article ${article.id}`}
              >
                <span>{code.toUpperCase()}</span>
                <small>{articleLanguageLabelByCode[code] || code.toUpperCase()}</small>
                {article.status ? <em>{article.status}</em> : null}
              </a>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default ArticleTranslationLinks
