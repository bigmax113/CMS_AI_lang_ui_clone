'use client'

import { useEffect, useState } from 'react'

type LorgarArticleActionsProps = {
  articleSlug: string
  likeAriaLabel?: string
  reactionsAriaLabel?: string
  reactionsLabel?: string
  shareAriaLabel?: string
  shareLabel?: string
  title: string
  url: string
  viewsLabel: string
}

const reactionLabels = {
  like: 'Like article',
} as const

const defaultReactionCount = 43
const figmaArticleIconVersion = '20260702-share-fb-left'

const FigmaShareIcon = ({
  name,
}: {
  name: 'facebook' | 'linkedin' | 'telegram'
}) => (
  <img
    alt=""
    aria-hidden="true"
    className="lorgar-share__icon lorgar-share__icon--social"
    src={`/lorgar-figma/share-${name}.svg?v=${figmaArticleIconVersion}`}
  />
)

const LikeIcon = () => (
  <img
    alt=""
    aria-hidden="true"
    className="lorgar-share__icon lorgar-share__icon--like"
    src={`/lorgar-figma/reaction-like.svg?v=${figmaArticleIconVersion}`}
  />
)

const EyeIcon = () => (
  <img
    alt=""
    aria-hidden="true"
    className="lorgar-share__icon lorgar-share__icon--eye"
    src={`/lorgar-figma/eye.svg?v=${figmaArticleIconVersion}`}
  />
)

export const LorgarArticleActions = ({
  articleSlug,
  likeAriaLabel = reactionLabels.like,
  reactionsAriaLabel = 'Article reactions',
  reactionsLabel = 'Reactions:',
  shareAriaLabel = 'Share article',
  shareLabel = 'Share:',
  title,
  url,
  viewsLabel,
}: LorgarArticleActionsProps) => {
  const encodedTitle = encodeURIComponent(title)
  const encodedURL = encodeURIComponent(url)
  const [message, setMessage] = useState('')
  const [pendingReaction, setPendingReaction] = useState<null | keyof typeof reactionLabels>(null)
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({})
  const [reactedReactions, setReactedReactions] = useState<Record<string, boolean>>({})
  const likeCount = reactionCounts.like || defaultReactionCount
  const hasReactedLike = Boolean(reactedReactions.like)

  useEffect(() => {
    try {
      setReactedReactions(window.localStorage.getItem(`lorgar-reaction:${articleSlug}:like`) ? { like: true } : {})
    } catch {
      setReactedReactions({})
    }
  }, [articleSlug])

  const sendReaction = async (reactionType: keyof typeof reactionLabels) => {
    if (pendingReaction === reactionType || reactedReactions[reactionType]) {
      return
    }

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
      setReactedReactions((current) => ({
        ...current,
        [reactionType]: true,
      }))
      try {
        window.localStorage.setItem(`lorgar-reaction:${articleSlug}:${reactionType}`, '1')
      } catch {
        // Storage can be blocked in private contexts; the current page state still locks the reaction.
      }
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reaction was not saved.')
    } finally {
      setPendingReaction(null)
    }
  }

  return (
    <div className="lorgar-share">
      <div aria-label={shareAriaLabel} className="lorgar-share__links">
        <span>{shareLabel}</span>
        <a
          aria-label="Share on Facebook"
          className="lorgar-share__social"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedURL}`}
          rel="noreferrer"
          target="_blank"
        >
          <FigmaShareIcon name="facebook" />
        </a>

        <a
          aria-label="Share on LinkedIn"
          className="lorgar-share__social"
          href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedURL}&title=${encodedTitle}`}
          rel="noreferrer"
          target="_blank"
        >
          <FigmaShareIcon name="linkedin" />
        </a>
        <a
          aria-label="Share on Telegram"
          className="lorgar-share__social"
          href={`https://t.me/share/url?url=${encodedURL}&text=${encodedTitle}`}
          rel="noreferrer"
          target="_blank"
        >
          <FigmaShareIcon name="telegram" />
        </a>
      </div>
      <div aria-label={reactionsAriaLabel} className="lorgar-share__reactions">
        <span>{reactionsLabel}</span>
        <button
          aria-label={likeAriaLabel}
          className="lorgar-share__reaction-button"
          aria-pressed={hasReactedLike}
          disabled={pendingReaction === 'like' || hasReactedLike}
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