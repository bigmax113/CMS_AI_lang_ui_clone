'use client'

import { useState } from 'react'

type LorgarArticleActionsProps = {
  articleSlug: string
  title: string
  url: string
  viewsLabel: string
}

const reactionLabels = {
  like: 'Like article',
} as const

const defaultReactionCount = 43

const ShareGlyphIcon = ({
  name,
}: {
  name: 'facebook' | 'linkedin' | 'telegram'
}) => {
  if (name === 'facebook') {
    return (
      <svg aria-hidden="true" className="lorgar-share__icon" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9.7 19.5h4.2v-7.2h2.4l.4-3.1h-2.8v-2c0-.9.2-1.5 1.5-1.5h1.4V3c-.7-.1-1.5-.2-2.4-.2-2.5 0-4.2 1.5-4.2 4.2v2.2H7.4v3.1h2.3v7.2Z" />
      </svg>
    )
  }

  if (name === 'linkedin') {
    return (
      <svg aria-hidden="true" className="lorgar-share__icon" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6.5 8.7H9v8.8H6.5V8.7Zm1.3-4.2c.9 0 1.5.6 1.5 1.4 0 .9-.6 1.5-1.5 1.5S6.3 6.8 6.3 5.9c0-.8.6-1.4 1.5-1.4Zm3.1 4.2h2.4v1.2c.5-.8 1.4-1.4 2.6-1.4 1.9 0 3.3 1.3 3.3 3.8v5.2h-2.6v-4.8c0-1.2-.5-2-1.6-2-.9 0-1.4.6-1.7 1.2-.1.2-.1.5-.1.7v4.9h-2.6V8.7h.3Z" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="lorgar-share__icon" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.9 4.3 3.6 11c-.9.4-.9 1.6.1 1.9l4.1 1.3 1.6 5.1c.3.9 1.4 1 1.9.3l2.4-3.5 4.4 3.2c.8.6 1.9.1 2-.9l2.3-12.6c.2-1-.7-1.8-1.5-1.5Zm-3 3.1-7.8 7.1-.3 2.7-1-3.4 9.1-6.4Z" />
    </svg>
  )
}

const LikeIcon = () => (
  <svg aria-hidden="true" className="lorgar-share__icon lorgar-share__icon--like" fill="none" viewBox="0 0 24 24">
    <path d="M7 21V10" />
    <path d="M7 10 11.7 3.2c.9.3 1.5 1.2 1.3 2.2L12.3 9H19a2 2 0 0 1 2 2.3l-1.1 6.5A3 3 0 0 1 17 20H7" />
    <path d="M3 11h4v9H3z" />
  </svg>
)

const EyeIcon = () => (
  <img
    alt=""
    aria-hidden="true"
    className="lorgar-share__icon lorgar-share__icon--eye"
    src="/lorgar-figma/eye.svg?v=20260630-fixes16-eye"
  />
)

export const LorgarArticleActions = ({ articleSlug, title, url, viewsLabel }: LorgarArticleActionsProps) => {
  const encodedTitle = encodeURIComponent(title)
  const encodedURL = encodeURIComponent(url)
  const [message, setMessage] = useState('')
  const [pendingReaction, setPendingReaction] = useState<null | keyof typeof reactionLabels>(null)
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({})
  const likeCount = reactionCounts.like || defaultReactionCount

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
        [reactionType]: Number(result.count || current[reactionType] || defaultReactionCount),
      }))
      setMessage('Reaction saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reaction was not saved.')
    } finally {
      setPendingReaction(null)
    }
  }

  return (
    <div className="lorgar-share">
      <div aria-label="Share article" className="lorgar-share__links">
        <span>Share:</span>
        <a
          aria-label="Share on Facebook"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedURL}`}
          rel="noreferrer"
          target="_blank"
        >
          <ShareGlyphIcon name="facebook" />
        </a>

        <a
          aria-label="Share on LinkedIn"
          href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedURL}&title=${encodedTitle}`}
          rel="noreferrer"
          target="_blank"
        >
          <ShareGlyphIcon name="linkedin" />
        </a>
        <a
          aria-label="Share on Telegram"
          href={`https://t.me/share/url?url=${encodedURL}&text=${encodedTitle}`}
          rel="noreferrer"
          target="_blank"
        >
          <ShareGlyphIcon name="telegram" />
        </a>
      </div>
      <div aria-label="Article reactions" className="lorgar-share__reactions">
        <span>Reactions:</span>
        <button
          aria-label={reactionLabels.like}
          disabled={pendingReaction === 'like'}
          onClick={() => void sendReaction('like')}
          type="button"
        >
          <LikeIcon />
        </button>
        <small aria-label={`${likeCount} like reactions`} className="lorgar-share__reaction-count">
          {likeCount}
        </small>
        <span className="lorgar-share__views">
          <strong>{viewsLabel}</strong>
          <EyeIcon />
        </span>
      </div>
      {message ? <p className="lorgar-share__message">{message}</p> : null}
    </div>
  )
}
