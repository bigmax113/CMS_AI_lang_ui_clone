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

const figmaSocialIconVersion = '20260630-fixes16-social-icons'
const defaultReactionCount = 43

const FigmaIcon = ({
  name,
}: {
  name: 'facebook' | 'instagram' | 'linkedin' | 'telegram'
}) => (
  <img
    alt=""
    aria-hidden="true"
    className="lorgar-share__icon"
    src={`/lorgar-figma/social-${name}.svg?v=${figmaSocialIconVersion}`}
  />
)

const LikeIcon = () => (
  <svg aria-hidden="true" className="lorgar-share__icon" fill="none" viewBox="0 0 24 24">
    <path d="M8 21H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3v11Z" />
    <path d="M8 10l4-7 1.5.8c.9.5 1.3 1.5 1 2.5L14 9h5a2 2 0 0 1 2 2.3l-1.1 7A3 3 0 0 1 17 21H8V10Z" />
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
          <FigmaIcon name="facebook" />
        </a>
        <a
          aria-label="Open LORGAR on Instagram"
          href="https://www.instagram.com/lorgar.global/"
          rel="noreferrer"
          target="_blank"
        >
          <FigmaIcon name="instagram" />
        </a>
        <a
          aria-label="Share on LinkedIn"
          href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedURL}&title=${encodedTitle}`}
          rel="noreferrer"
          target="_blank"
        >
          <FigmaIcon name="linkedin" />
        </a>
        <a
          aria-label="Share on Telegram"
          href={`https://t.me/share/url?url=${encodedURL}&text=${encodedTitle}`}
          rel="noreferrer"
          target="_blank"
        >
          <FigmaIcon name="telegram" />
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
