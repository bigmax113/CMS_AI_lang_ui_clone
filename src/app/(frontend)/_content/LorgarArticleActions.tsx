'use client'

import { useState } from 'react'

type LorgarArticleActionsProps = {
  articleSlug: string
  title: string
  url: string
}

const reactionLabels = {
  discuss: 'Discuss article',
  like: 'Like article',
} as const

export const LorgarArticleActions = ({ articleSlug, title, url }: LorgarArticleActionsProps) => {
  const encodedTitle = encodeURIComponent(title)
  const encodedURL = encodeURIComponent(url)
  const [message, setMessage] = useState('')
  const [pendingReaction, setPendingReaction] = useState<null | keyof typeof reactionLabels>(null)
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({})

  const sendReaction = async (reactionType: keyof typeof reactionLabels) => {
    setPendingReaction(reactionType)
    setMessage('')

    try {
      const response = await fetch('/api/article-reactions', {
        body: JSON.stringify({ articleSlug, reactionType }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const result = (await response.json()) as { count?: number; error?: string; ok?: boolean }

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Reaction was not saved.')
      }

      setReactionCounts((current) => ({
        ...current,
        [reactionType]: Number(result.count || current[reactionType] || 0),
      }))
      setMessage('Reaction saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reaction was not saved.')
    } finally {
      setPendingReaction(null)
    }
  }

  const copyLink = async () => {
    setMessage('')

    try {
      await navigator.clipboard.writeText(url)
      setMessage('Link copied.')
    } catch {
      setMessage('Copy is unavailable in this browser. Use the opened article URL.')
    }
  }

  return (
    <div className="lorgar-share">
      <div aria-label="Article reactions" className="lorgar-share__reactions">
        <span>Reactions:</span>
        {(['like', 'discuss'] as const).map((reactionType) => (
          <button
            aria-label={reactionLabels[reactionType]}
            disabled={pendingReaction === reactionType}
            key={reactionType}
            onClick={() => void sendReaction(reactionType)}
            type="button"
          >
            <span aria-hidden="true" className={`lorgar-share__${reactionType}`} />
            {reactionCounts[reactionType] ? (
              <small aria-label={`${reactionCounts[reactionType]} ${reactionType} reactions`}>
                {reactionCounts[reactionType]}
              </small>
            ) : null}
          </button>
        ))}
      </div>
      <div aria-label="Share article" className="lorgar-share__links">
        <span>Share:</span>
        <button aria-label="Copy article link" onClick={() => void copyLink()} type="button">
          <span aria-hidden="true" className="lorgar-share__link" />
        </button>
        <a
          aria-label="Share on Facebook"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedURL}`}
          rel="noreferrer"
          target="_blank"
        >
          f
        </a>
        <a
          aria-label="Share on X"
          href={`https://twitter.com/intent/tweet?url=${encodedURL}&text=${encodedTitle}`}
          rel="noreferrer"
          target="_blank"
        >
          x
        </a>
        <a
          aria-label="Share on LinkedIn"
          href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedURL}&title=${encodedTitle}`}
          rel="noreferrer"
          target="_blank"
        >
          in
        </a>
      </div>
      {message ? <p className="lorgar-share__message">{message}</p> : null}
    </div>
  )
}
