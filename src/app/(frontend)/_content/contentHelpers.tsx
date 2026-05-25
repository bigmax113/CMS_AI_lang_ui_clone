import configPromise from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'
import { getPayload } from 'payload'

import type { Article, Author, BlogPost, Media, Site } from '@/payload-types'
import { articlePublicPath, blogPostPublicPath, normalizeBlogPath, publicBaseURL } from '@/lib/publicURLs'
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

const defaultSEOImagePath = '/seo/default-og.png'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isSite = (value: unknown): value is Site => isRecord(value) && typeof value.slug === 'string'

export const isMedia = (value: unknown): value is Media =>
  isRecord(value) && (typeof value.url === 'string' || typeof value.filename === 'string')

export const isAuthor = (value: unknown): value is Author =>
  isRecord(value) && typeof value.name === 'string'

const isLocalPayloadMediaURL = (value?: null | string) =>
  Boolean(value?.startsWith('/api/media/file/') || value?.includes('/api/media/file/'))

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

  if (media.embeddedImageDataURL) {
    return media.embeddedImageDataURL
  }

  if (media.externalImageURL) {
    return media.externalImageURL
  }

  if (media.url && !isLocalPayloadMediaURL(media.url)) {
    return media.url
  }

  return null
}

const mediaFileURL = (media?: Media | null | number) => {
  if (!isMedia(media)) {
    return null
  }

  return mediaURL(media) || media.url || null
}

const textField = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const absoluteURL = (value?: null | string) => {
  if (!value) {
    return undefined
  }

  if (value.startsWith('http') || value.startsWith('data:')) {
    return value
  }

  return `${publicBaseURL()}${value.startsWith('/') ? value : `/${value}`}`
}

const schemaImageURL = (media?: Media | null | number) => {
  const url = mediaURL(media)

  if (!url || url.startsWith('data:')) {
    return undefined
  }

  return absoluteURL(url)
}

const seoImageURL = (media?: Media | null | number) => schemaImageURL(media) || absoluteURL(defaultSEOImagePath)

export const createSEOPageMetadata = ({
  canonicalURL,
  description,
  image,
  path,
  title,
  type = 'article',
}: {
  canonicalURL?: null | string
  description?: null | string
  image?: Media | null | number
  path?: null | string
  title: string
  type?: 'article' | 'website'
}): Metadata => {
  const canonical = canonicalURL || absoluteURL(path) || publicBaseURL()
  const imageURL = seoImageURL(image)
  const images = imageURL
    ? [
        {
          alt: title,
          height: 630,
          url: imageURL,
          width: 1200,
        },
      ]
    : undefined

  return {
    alternates: {
      canonical,
    },
    description: description || undefined,
    openGraph: {
      description: description || undefined,
      images,
      title,
      type,
      url: canonical,
    },
    title,
    twitter: {
      card: 'summary_large_image',
      description: description || undefined,
      images: imageURL ? [imageURL] : undefined,
      title,
    },
  }
}

const collectBlockFields = (
  content: Article['content'] | BlogPost['content'] | null | undefined,
  blockType: string,
) => {
  const root = content?.root as LexicalNode | undefined
  const matches: Record<string, unknown>[] = []
  const visit = (node?: LexicalNode) => {
    if (!node) {
      return
    }

    if (node.type === 'block' && node.fields?.blockType === blockType) {
      matches.push(node.fields)
    }

    node.children?.forEach(visit)
  }

  visit(root)

  return matches
}

const faqItemsFromFields = (fields: Record<string, unknown>) =>
  (Array.isArray(fields.items) ? fields.items : [])
    .filter(isRecord)
    .map((item) => ({
      answer: textField(item.answer),
      question: textField(item.question),
    }))
    .filter((item) => item.question && item.answer)

const productCardFromFields = (fields: Record<string, unknown>) => ({
  brand: textField(fields.brand),
  ctaLabel: textField(fields.ctaLabel) || 'View product',
  description: textField(fields.description),
  image: isMedia(fields.image) ? fields.image : null,
  name: textField(fields.name),
  priceLabel: textField(fields.priceLabel),
  sku: textField(fields.sku),
  url: textField(fields.url),
})

const productCardsFromCarouselFields = (fields: Record<string, unknown>) =>
  (Array.isArray(fields.products) ? fields.products : [])
    .filter(isRecord)
    .map(productCardFromFields)
    .filter((product) => product.name)
    .slice(0, 5)

const authorListFromValue = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .map((item) => (isRecord(item) && 'value' in item ? item.value : item))
    .filter(isAuthor)
    .filter((author) => author.status !== 'hidden')

const parseURL = (value: string) => {
  try {
    return new URL(value)
  } catch (_error) {
    return null
  }
}

const getYouTubeID = (value: string) => {
  const url = parseURL(value)

  if (!url) {
    return null
  }

  if (url.hostname.includes('youtu.be')) {
    return url.pathname.replace(/^\/+/u, '').split('/')[0] || null
  }

  if (url.hostname.includes('youtube.com')) {
    return url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/u)?.[1] || null
  }

  return null
}

const getVimeoID = (value: string) => {
  const url = parseURL(value)

  if (!url || !url.hostname.includes('vimeo.com')) {
    return null
  }

  return url.pathname.match(/\/(\d+)/u)?.[1] || null
}

const isDirectVideoURL = (value: string) => /\.(mp4|mov|webm)(?:[?#].*)?$/iu.test(value)
const isPlayableVideoURL = (value: string) => value.startsWith('data:video/') || isDirectVideoURL(value)

const videoFromFields = (fields: Record<string, unknown>) => {
  const upload = isMedia(fields.upload) ? fields.upload : null
  const thumbnail = isMedia(fields.thumbnail) ? fields.thumbnail : null
  const url = textField(fields.url)
  const youtubeID = getYouTubeID(url)
  const vimeoID = getVimeoID(url)
  const schema = isRecord(fields.schema) ? fields.schema : {}
  const uploadedURL = mediaFileURL(upload)
  const thumbnailURL =
    mediaURL(thumbnail) ||
    textField(fields.thumbnailURL) ||
    (youtubeID ? `https://i.ytimg.com/vi/${youtubeID}/hqdefault.jpg` : '') ||
    (vimeoID ? `https://vumbnail.com/${vimeoID}.jpg` : '')
  const embedURL =
    textField(fields.embedURL) ||
    (youtubeID ? `https://www.youtube.com/embed/${youtubeID}` : '') ||
    (vimeoID ? `https://player.vimeo.com/video/${vimeoID}` : '')
  const contentURL = textField(fields.contentURL) || uploadedURL || (isDirectVideoURL(url) ? url : '')

  return {
    contentURL,
    description: textField(fields.description),
    duration: textField(fields.duration),
    embedURL,
    sourceURL: uploadedURL || url,
    thumbnailURL,
    title: textField(fields.title),
    uploadDate: textField(fields.uploadDate),
    schemaDescription: textField(schema.description),
    schemaName: textField(schema.name),
  }
}

const safeJSON = (value: unknown) => JSON.stringify(value).replace(/</gu, '\\u003c')

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

const renderProductCard = (
  product: ReturnType<typeof productCardFromFields>,
  key: string,
  className = 'public-content__product-card',
) => {
  const isExternal = product.url.startsWith('http')

  if (!product.name) {
    return null
  }

  return (
    <aside className={className} key={key}>
      {product.image ? (
        <SafeImage
          alt={product.image.alt || product.name}
          className="public-content__product-image"
          fileName={product.image.filename}
          src={mediaURL(product.image)}
        />
      ) : null}
      <div className="public-content__product-copy">
        {product.brand ? <span>{product.brand}</span> : null}
        <strong>{product.name}</strong>
        {product.sku ? <small>SKU: {product.sku}</small> : null}
        {product.description ? <p>{product.description}</p> : null}
        {product.priceLabel ? <em>{product.priceLabel}</em> : null}
        {product.url ? (
          <a href={product.url} rel={isExternal ? 'noreferrer' : undefined} target={isExternal ? '_blank' : undefined}>
            {product.ctaLabel}
          </a>
        ) : null}
      </div>
    </aside>
  )
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

    if (!media) {
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

    if (fields.blockType === 'htmlEmbed') {
      const html = textField(fields.html)

      return html ? (
        <div className="public-content__html-embed" dangerouslySetInnerHTML={{ __html: html }} key={key} />
      ) : null
    }

    if (fields.blockType === 'productCard') {
      const product = productCardFromFields(fields)

      return renderProductCard(product, key)
    }

    if (fields.blockType === 'productCardCarousel') {
      const products = productCardsFromCarouselFields(fields)
      const heading = textField(fields.heading)

      if (!products.length) {
        return null
      }

      return (
        <section className="public-content__product-carousel" key={key}>
          {heading ? <h2>{heading}</h2> : null}
          <div className="public-content__product-carousel-track">
            {products.map((product, index) =>
              renderProductCard(product, `${key}-product-${index}`, 'public-content__product-card public-content__product-card--carousel'),
            )}
          </div>
        </section>
      )
    }

    if (fields.blockType === 'video') {
      const video = videoFromFields(fields)

      if (!video.title || (!video.sourceURL && !video.embedURL)) {
        return null
      }

      return (
        <figure className="public-content__video" key={key}>
          {video.embedURL ? (
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="public-content__video-frame"
              src={video.embedURL}
              title={video.title}
            />
          ) : isPlayableVideoURL(video.sourceURL) ? (
            <video className="public-content__video-frame" controls poster={video.thumbnailURL || undefined}>
              <source src={video.sourceURL} />
            </video>
          ) : (
            <a className="public-content__video-link" href={video.sourceURL} rel="noreferrer" target="_blank">
              {video.thumbnailURL ? <SafeImage alt={video.title} src={video.thumbnailURL} /> : null}
              <span>{video.title}</span>
            </a>
          )}
          <figcaption>
            <strong>{video.title}</strong>
            {video.description ? <span>{video.description}</span> : null}
          </figcaption>
        </figure>
      )
    }

    if (fields.blockType === 'faq') {
      const items = faqItemsFromFields(fields)
      const heading = textField(fields.heading) || 'FAQ'

      if (!items.length) {
        return null
      }

      return (
        <section className="public-content__faq" key={key}>
          <h2>{heading}</h2>
          {items.map((item, index) => (
            <details key={`${key}-${index}`}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
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

export const AuthorByline = ({
  authors,
}: {
  authors?: Article['authors'] | BlogPost['authors'] | null
}) => {
  const visibleAuthors = authorListFromValue(authors)

  if (!visibleAuthors.length) {
    return null
  }

  return (
    <section className="public-content__authors" aria-label="Authors">
      {visibleAuthors.map((author) => (
        <div className="public-content__author" key={author.id}>
          {author.photo ? (
            <SafeImage
              alt={author.name}
              className="public-content__author-photo"
              fileName={isMedia(author.photo) ? author.photo.filename : undefined}
              src={mediaURL(isMedia(author.photo) ? author.photo : null)}
            />
          ) : null}
          <div>
            <strong>{author.name}</strong>
            {author.role ? <span>{author.role}</span> : null}
            {author.shortDescription ? <p>{author.shortDescription}</p> : null}
          </div>
        </div>
      ))}
    </section>
  )
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

export const StructuredData = ({
  authors,
  content,
  contentType,
  description,
  image,
  publishedAt,
  title,
  updatedAt,
  url,
}: {
  authors?: Article['authors'] | BlogPost['authors'] | null
  content?: Article['content'] | BlogPost['content'] | null
  contentType: 'Article' | 'BlogPosting'
  description?: null | string
  image?: Media | null | number
  publishedAt?: null | string
  title: string
  updatedAt?: null | string
  url?: null | string
}) => {
  const pageURL = absoluteURL(url)
  const authorsList = authorListFromValue(authors)
  const productCards = [
    ...collectBlockFields(content, 'productCard')
      .map(productCardFromFields)
      .filter((product) => product.name),
    ...collectBlockFields(content, 'productCardCarousel').flatMap(productCardsFromCarouselFields),
  ]
  const faqItems = collectBlockFields(content, 'faq').flatMap(faqItemsFromFields)
  const videos = collectBlockFields(content, 'video')
    .map(videoFromFields)
    .filter((video) => video.title && (video.embedURL || video.contentURL || video.sourceURL))
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': contentType,
      author: authorsList.length
        ? authorsList.map((author) => ({
            '@type': 'Person',
            description: author.shortDescription || undefined,
            image: schemaImageURL(isMedia(author.photo) ? author.photo : null),
            name: author.name,
          }))
        : undefined,
      dateModified: updatedAt || undefined,
      datePublished: publishedAt || undefined,
      description: description || undefined,
      headline: title,
      image: seoImageURL(image),
      mainEntityOfPage: pageURL,
    },
    faqItems.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
            name: item.question,
          })),
        }
      : null,
    ...productCards.map((product) => ({
      '@context': 'https://schema.org',
      '@type': 'Product',
      brand: product.brand || undefined,
      description: product.description || undefined,
      image: schemaImageURL(product.image),
      name: product.name,
      offers: product.url
        ? {
            '@type': 'Offer',
            availability: product.priceLabel || undefined,
            url: absoluteURL(product.url),
          }
        : undefined,
      sku: product.sku || undefined,
      url: absoluteURL(product.url),
    })),
    ...videos.map((video) => ({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      contentUrl: absoluteURL(video.contentURL || video.sourceURL),
      description: video.schemaDescription || video.description || undefined,
      duration: video.duration || undefined,
      embedUrl: absoluteURL(video.embedURL),
      name: video.schemaName || video.title,
      thumbnailUrl: video.thumbnailURL ? [absoluteURL(video.thumbnailURL)] : undefined,
      uploadDate: video.uploadDate || publishedAt || undefined,
    })),
  ].filter(Boolean)

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          dangerouslySetInnerHTML={{ __html: safeJSON(schema) }}
          key={index}
          type="application/ld+json"
        />
      ))}
    </>
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
      <Link href="/articles">Content</Link>
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
