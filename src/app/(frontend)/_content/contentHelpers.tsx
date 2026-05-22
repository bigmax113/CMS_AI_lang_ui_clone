import configPromise from '@payload-config'
import Link from 'next/link'
import React from 'react'
import { getPayload } from 'payload'

import type { Article, BlogPost, Media, Site } from '@/payload-types'
import { articlePublicPath, blogPostPublicPath, normalizeBlogPath } from '@/lib/publicURLs'
import { SafeImage } from './SafeImage'

type LexicalNode = {
  children?: LexicalNode[]
  fields?: Record<string, unknown>
  format?: number | string
  listType?: string
  tag?: string
  text?: string
  type?: string
  url?: string
  value?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isSite = (value: unknown): value is Site => isRecord(value) && typeof value.slug === 'string'

export const isMedia = (value: unknown): value is Media =>
  isRecord(value) && (typeof value.url === 'string' || typeof value.filename === 'string')

export const formatDate = (value?: null | string) => {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('ru', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export const mediaURL = (media?: Media | null | number) => {
  if (!isMedia(media)) {
    return null
  }

  return media.embeddedImageDataURL || media.url || null
}

const renderText = (node: LexicalNode, key: string) => {
  let textNode: React.ReactNode = node.text || ''

  if (typeof node.format === 'number') {
    if (node.format & 1) {
      textNode = <strong>{textNode}</strong>
    }

    if (node.format & 2) {
      textNode = <em>{textNode}</em>
    }

    if (node.format & 16) {
      textNode = <code>{textNode}</code>
    }
  }

  return <React.Fragment key={key}>{textNode}</React.Fragment>
}

const renderNode = (node: LexicalNode, key: string): React.ReactNode => {
  const children = node.children?.map((child, index) => renderNode(child, `${key}-${index}`)) || []

  if (node.type === 'text') {
    return renderText(node, key)
  }

  if (node.type === 'linebreak') {
    return <br key={key} />
  }

  if (node.type === 'root') {
    return <React.Fragment key={key}>{children}</React.Fragment>
  }

  if (node.type === 'heading') {
    const tag = ['h2', 'h3', 'h4'].includes(String(node.tag)) ? String(node.tag) : 'h2'
    const Heading = tag as 'h2' | 'h3' | 'h4'

    return <Heading key={key}>{children}</Heading>
  }

  if (node.type === 'paragraph') {
    return <p key={key}>{children}</p>
  }

  if (node.type === 'quote') {
    return <blockquote key={key}>{children}</blockquote>
  }

  if (node.type === 'list') {
    return node.listType === 'number' ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>
  }

  if (node.type === 'listitem') {
    return <li key={key}>{children}</li>
  }

  if (node.type === 'link') {
    const fields = node.fields || {}
    const href = typeof fields.url === 'string' ? fields.url : node.url || '#'
    const isExternal = href.startsWith('http')

    return (
      <a href={href} key={key} rel={isExternal ? 'noreferrer' : undefined} target={isExternal ? '_blank' : undefined}>
        {children}
      </a>
    )
  }

  if (node.type === 'upload') {
    const media = isMedia(node.value) ? node.value : null
    const url = mediaURL(media)

    if (!media || !url) {
      return null
    }

    return (
      <figure className="public-content__figure" key={key}>
        <SafeImage alt={media.alt || media.filename || ''} fileName={media.filename} src={url} />
        {media.caption ? <figcaption>{media.caption}</figcaption> : null}
      </figure>
    )
  }

  if (node.type === 'block') {
    const fields = node.fields || {}

    if (fields.blockType === 'callout') {
      return (
        <aside className="public-content__callout" key={key}>
          {typeof fields.title === 'string' ? <strong>{fields.title}</strong> : null}
          {typeof fields.body === 'string' ? <p>{fields.body}</p> : null}
        </aside>
      )
    }

    if (fields.blockType === 'crossSiteCta') {
      return (
        <aside className="public-content__cta" key={key}>
          {typeof fields.label === 'string' ? <strong>{fields.label}</strong> : null}
          {typeof fields.description === 'string' ? <p>{fields.description}</p> : null}
          {typeof fields.url === 'string' ? <a href={fields.url}>Перейти</a> : null}
        </aside>
      )
    }
  }

  if (node.type === 'table') {
    return (
      <table className="public-content__table" key={key}>
        <tbody>{children}</tbody>
      </table>
    )
  }

  if (node.type === 'tablerow') {
    return <tr key={key}>{children}</tr>
  }

  if (node.type === 'tablecell') {
    return <td key={key}>{children}</td>
  }

  return children.length ? <React.Fragment key={key}>{children}</React.Fragment> : null
}

export const RichText = ({ content }: { content?: Article['content'] | BlogPost['content'] | null }) => {
  const root = content?.root as LexicalNode | undefined

  if (!root?.children?.length) {
    return <p>Контент пока не заполнен.</p>
  }

  return <div className="public-content__richtext">{renderNode(root, 'root')}</div>
}

export const PublicImage = ({
  alt,
  className,
  media,
}: {
  alt: string
  className?: string
  media?: Media | null | number
}) => {
  const resolvedMedia = isMedia(media) ? media : null

  return (
    <SafeImage
      alt={alt}
      className={className}
      fileName={resolvedMedia?.filename}
      src={mediaURL(resolvedMedia)}
    />
  )
}

export const PublicChrome = ({
  children,
  kicker,
  title,
}: {
  children: React.ReactNode
  kicker?: string
  title: string
}) => (
  <div className="public-content">
    <header className="public-content__topbar">
      <Link href="/ai">AI Workbench</Link>
      <Link href="/admin">Admin</Link>
      <Link href="/articles">Articles</Link>
      <Link href="/blog">Blog</Link>
    </header>
    <section className="public-content__hero">
      {kicker ? <p className="public-content__kicker">{kicker}</p> : null}
      <h1>{title}</h1>
    </section>
    {children}
  </div>
)

export const ContentCard = ({
  href,
  label,
  summary,
  title,
}: {
  href: string
  label?: null | string
  summary?: null | string
  title: string
}) => (
  <Link className="public-content__card" href={href}>
    {label ? <span>{label}</span> : null}
    <strong>{title}</strong>
    {summary ? <p>{summary}</p> : null}
  </Link>
)

export const findPublishedArticleBySlug = async (slug: string) => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'articles',
    depth: 2,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        {
          slug: {
            equals: slug,
          },
        },
        {
          status: {
            equals: 'published',
          },
        },
      ],
    },
  })

  return result.docs[0] || null
}

export const listPublishedArticles = async () => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'articles',
    depth: 1,
    limit: 100,
    overrideAccess: true,
    sort: '-publishedAt',
    where: {
      status: {
        equals: 'published',
      },
    },
  })

  return result.docs
}

export const findPublishedBlogPostBySlug = async (slug: string) => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'blog-posts',
    depth: 2,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        {
          slug: {
            equals: slug,
          },
        },
        {
          status: {
            equals: 'published',
          },
        },
      ],
    },
  })

  return result.docs[0] || null
}

export const findPublishedBlogPostBySitePath = async ({
  segments,
  siteSlug,
}: {
  segments: string[]
  siteSlug: string
}) => {
  const postSlug = segments.at(-1)

  if (!postSlug) {
    return null
  }

  const requestedBlogPath = normalizeBlogPath(`/${segments.slice(0, -1).join('/')}`)
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'blog-posts',
    depth: 2,
    limit: 20,
    overrideAccess: true,
    where: {
      and: [
        {
          slug: {
            equals: postSlug,
          },
        },
        {
          status: {
            equals: 'published',
          },
        },
      ],
    },
  })

  return (
    result.docs.find((post) => {
      const site = isSite(post.site) ? post.site : null

      return site?.slug === siteSlug && normalizeBlogPath(site.defaultBlogPath) === requestedBlogPath
    }) || null
  )
}

export const listPublishedBlogPosts = async () => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'blog-posts',
    depth: 2,
    limit: 100,
    overrideAccess: true,
    sort: '-publishedAt',
    where: {
      status: {
        equals: 'published',
      },
    },
  })

  return result.docs
}

export const articleHref = (article: Pick<Article, 'slug'>) => articlePublicPath(article.slug) || '/articles'

export const blogPostHref = (post: Pick<BlogPost, 'site' | 'slug'>) =>
  blogPostPublicPath({
    site: isSite(post.site) ? post.site : null,
    slug: post.slug,
  }) || '/blog'
