'use client'

import { useState } from 'react'

type LorgarArticleActionsProps = {
  articleSlug: string
  title: string
  url: string
}

const reactionLabels = {
  like: 'Like article',
} as const

const figmaSocialIconVersion = '20260619-social-icons-v2'

const FigmaIcon = ({
  name,
}: {
  name: 'facebook' | 'linkedin'
}) => (
  <img
    alt=""
    aria-hidden="true"
    className="lorgar-share__icon"
    src={`/lorgar-figma/social-${name}.svg?v=${figmaSocialIconVersion}`}
  />
)

const ActionIcon = ({ name }: { name: 'like' | 'link' | 'x' }) => (
  <svg aria-hidden="true" className="lorgar-share__icon" fill="none" viewBox="0 0 24 24">
    {name === 'link' ? (
      <>
        <path d="M9.5 14.5 14.5 9.5" />
        <path d="M10.5 6.5 12 5a4 4 0 0 1 5.7 5.7l-1.6 1.6" />
        <path d="M13.5 17.5 12 19a4 4 0 0 1-5.7-5.7l1.6-1.6" />
      </>
    ) : null}
    {name === 'x' ? <path d="m5 5 14 14M19 5 5 19" /> : null}
    {name === 'like' ? (
      <>
        <path d="M8 21H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3v11Z" />
        <path d="M8 10l4-7 1.5.8c.9.5 1.3 1.5 1 2.5L14 9h5a2 2 0 0 1 2 2.3l-1.1 7A3 3 0 0 1 17 21H8V10Z" />
      </>
    ) : null}
  </svg>
)

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
      <div aria-label="Share article" className="lorgar-share__links">
        <span>Share:</span>
        <button aria-label="Copy article link" onClick={() => void copyLink()} type="button">
          <ActionIcon name="link" />
        </button>
        <a
          aria-label="Share on Facebook"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedURL}`}
          rel="noreferrer"
          target="_blank"
        >
          <FigmaIcon name="facebook" />
        </a>
        <a
          aria-label="Share on X"
          href={`https://twitter.com/intent/tweet?url=${encodedURL}&text=${encodedTitle}`}
          rel="noreferrer"
          target="_blank"
        >
          <ActionIcon name="x" />
        </a>
        <a
          aria-label="Share on LinkedIn"
          href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedURL}&title=${encodedTitle}`}
          rel="noreferrer"
          target="_blank"
        >
          <FigmaIcon name="linkedin" />
        </a>
      </div>
      <div aria-label="Article reactions" className="lorgar-share__reactions">
        <span>Reactions:</span>
        {(['like'] as const).map((reactionType) => (
          <button
            aria-label={reactionLabels[reactionType]}
            disabled={pendingReaction === reactionType}
            key={reactionType}
            onClick={() => void sendReaction(reactionType)}
            type="button"
          >
            <ActionIcon name="like" />
            {reactionCounts[reactionType] ? (
              <small aria-label={`${reactionCounts[reactionType]} ${reactionType} reactions`}>
                {reactionCounts[reactionType]}
              </small>
            ) : null}
          </button>
        ))}
      </div>
      {message ? <p className="lorgar-share__message">{message}</p> : null}
    </div>
  )
}
