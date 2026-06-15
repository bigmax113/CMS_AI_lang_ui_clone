import configPromise from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'
import { getPayload, type Where } from 'payload'

import type { Article, Author, BlogPost, Media, Site } from '@/payload-types'
import { excerptArticleText, isLikelyTruncatedArticleText } from '@/lib/articleFields'
import {
  articleLanguageDefinitions,
  articleLanguageDisplayCodeByCode,
  articleLanguageHreflangByCode,
  articleLanguageLabelByCode,
  articleTranslationGroupFromArticle,
  inferArticleLanguageCode,
  normalizeArticleLanguageCode,
  type ArticleLanguageCode,
} from '@/lib/articleTranslations'
import { isValidArticlePreviewToken } from '@/lib/articlePreview'
import { articlePublicPath, blogPostPublicPath, normalizeBlogPath, publicBaseURL } from '@/lib/publicURLs'
import { LorgarArticleActions } from './LorgarArticleActions'
import { LorgarSubscribeForm } from './LorgarSubscribeForm'
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
const defaultPublicAuthorName = process.env.DEFAULT_ARTICLE_AUTHOR_NAME || 'Matthew King'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isSite = (value: unknown): value is Site => isRecord(value) && typeof value.slug === 'string'

export const isMedia = (value: unknown): value is Media =>
  isRecord(value) && (typeof value.url === 'string' || typeof value.filename === 'string')

type PersistedMedia = Media & {
  driveFileID?: null | string
  externalFileURL?: null | string
}

export const isAuthor = (value: unknown): value is Author =>
  isRecord(value) && typeof value.name === 'string'

const isLocalPayloadMediaURL = (value?: null | string) =>
  Boolean(value?.startsWith('/api/media/file/') || value?.includes('/api/media/file/'))

const articleDateLocaleByCode: Record<ArticleLanguageCode, string> = {
  bg: 'bg-BG',
  cs: 'cs-CZ',
  de: 'de-DE',
  ee: 'et-EE',
  el: 'el-GR',
  en: 'en-US',
  es: 'es-ES',
  hu: 'hu-HU',
  kz: 'kk-KZ',
  lt: 'lt-LT',
  lv: 'lv-LV',
  pl: 'pl-PL',
  ro: 'ro-RO',
  rs: 'sr-Latn-RS',
  ru: 'ru-RU',
  sk: 'sk-SK',
  uk: 'uk-UA',
}

export const formatDate = (value?: null | string, languageCode?: null | string) => {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat(articleDateLocaleByCode[normalizeArticleLanguageCode(languageCode)], {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

const publicArticleNavigationLabelsByCode: Record<
  ArticleLanguageCode,
  {
    allArticles: string
    blog: string
  }
> = {
  bg: { allArticles: 'Всички статии', blog: 'Блог' },
  cs: { allArticles: 'Všechny články', blog: 'Blog' },
  ee: { allArticles: 'Kõik artiklid', blog: 'Blogi' },
  de: { allArticles: 'Alle Artikel', blog: 'Blog' },
  el: { allArticles: 'Όλα τα άρθρα', blog: 'Blog' },
  en: { allArticles: 'All Articles', blog: 'Blog' },
  es: { allArticles: 'Todos los artículos', blog: 'Blog' },
  hu: { allArticles: 'Összes cikk', blog: 'Blog' },
  kz: { allArticles: 'Барлық мақалалар', blog: 'Блог' },
  lt: { allArticles: 'Visi straipsniai', blog: 'Tinklaraštis' },
  lv: { allArticles: 'Visi raksti', blog: 'Blogs' },
  pl: { allArticles: 'Wszystkie artykuły', blog: 'Blog' },
  ro: { allArticles: 'Toate articolele', blog: 'Blog' },
  rs: { allArticles: 'Svi članci', blog: 'Blog' },
  ru: { allArticles: 'Все статьи', blog: 'Блог' },
  sk: { allArticles: 'Všetky články', blog: 'Blog' },
  uk: { allArticles: 'Усі статті', blog: 'Блог' },
}

export const publicArticleNavigationLabels = (languageCode?: null | string) =>
  publicArticleNavigationLabelsByCode[normalizeArticleLanguageCode(languageCode)]

export const formatArticleMetaDate = (value?: null | string, languageCode?: null | string) => {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(articleDateLocaleByCode[normalizeArticleLanguageCode(languageCode)], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export const mediaURL = (media?: Media | null | number) => {
  if (!isMedia(media)) {
    return null
  }

  const persistedMedia = media as PersistedMedia

  if (persistedMedia.driveFileID && typeof persistedMedia.id !== 'undefined') {
    return `/api/media/${encodeURIComponent(String(persistedMedia.id))}/asset`
  }

  if (persistedMedia.externalFileURL) {
    return persistedMedia.externalFileURL
  }

  if (media.externalImageURL) {
    return media.externalImageURL
  }

  if (media.embeddedImageDataURL) {
    return media.embeddedImageDataURL
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
  languageAlternates,
  ogDescription,
  ogTitle,
  path,
  title,
  twitterDescription,
  twitterTitle,
  type = 'article',
}: {
  canonicalURL?: null | string
  description?: null | string
  image?: Media | null | number
  languageAlternates?: Record<string, string>
  ogDescription?: null | string
  ogTitle?: null | string
  path?: null | string
  title: string
  twitterDescription?: null | string
  twitterTitle?: null | string
  type?: 'article' | 'website'
}): Metadata => {
  const canonical = canonicalURL || absoluteURL(path) || publicBaseURL()
  const imageURL = seoImageURL(image)
  const openGraphTitle = ogTitle || title
  const openGraphDescription = ogDescription || description || undefined
  const cardTitle = twitterTitle || openGraphTitle
  const cardDescription = twitterDescription || openGraphDescription
  const alternateLanguages = languageAlternates
    ? Object.fromEntries(
        Object.entries(languageAlternates).map(([language, url]) => [
          language,
          absoluteURL(url) || url,
        ]),
      )
    : undefined
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
      languages: alternateLanguages,
    },
    description: description || undefined,
    openGraph: {
      description: openGraphDescription,
      images,
      title: openGraphTitle,
      type,
      url: canonical,
    },
    title,
    twitter: {
      card: 'summary_large_image',
      description: cardDescription,
      images: imageURL ? [imageURL] : undefined,
      title: cardTitle,
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

const nodeText = (node?: LexicalNode): string => {
  if (!node) {
    return ''
  }

  const ownText = textField(node.text)
  const childText = node.children?.map(nodeText).filter(Boolean).join(' ') || ''

  return [ownText, childText].filter(Boolean).join(' ').replace(/\s+/gu, ' ').trim()
}

const faqItemsFromRichText = (content: Article['content'] | BlogPost['content'] | null | undefined) => {
  const children = ((content?.root as LexicalNode | undefined)?.children || []).filter(Boolean)
  const items: Array<{ answer: string; question: string }> = []
  let isInFAQSection = false
  let currentQuestion = ''
  let answerParts: string[] = []
  const flush = () => {
    const answer = answerParts.join(' ').replace(/\s+/gu, ' ').trim()

    if (currentQuestion && answer) {
      items.push({
        answer,
        question: currentQuestion,
      })
    }

    currentQuestion = ''
    answerParts = []
  }

  for (const child of children) {
    const text = nodeText(child)

    if (!text) {
      continue
    }

    if (child.type === 'heading' && /\bfaq\b|frequently asked|questions|часто|вопрос/iu.test(text)) {
      flush()
      isInFAQSection = true
      continue
    }

    if (!isInFAQSection) {
      continue
    }

    if (child.type === 'heading') {
      flush()
      currentQuestion = text
      continue
    }

    if (currentQuestion && (child.type === 'paragraph' || child.type === 'listitem')) {
      answerParts.push(text)
    }
  }

  flush()

  return items
}

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

const numberField = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

const imageBlockFromFields = (fields: Record<string, unknown>) => {
  const width = textField(fields.width) || 'medium'
  const align = textField(fields.align) || 'center'
  const aspectRatio = textField(fields.aspectRatio) || 'natural'
  const customWidth = numberField(fields.customWidth)

  return {
    align: ['left', 'center', 'right'].includes(align) ? align : 'center',
    aspectRatio: ['natural', '16-9', '4-3', '1-1'].includes(aspectRatio) ? aspectRatio : 'natural',
    caption: textField(fields.caption),
    customWidth,
    image: isMedia(fields.image) ? fields.image : null,
    width: ['full', 'large', 'medium', 'small', 'custom'].includes(width) ? width : 'medium',
  }
}

const imageRowFromFields = (fields: Record<string, unknown>) =>
  (Array.isArray(fields.images) ? fields.images : [])
    .filter(isRecord)
    .map((item) => ({
      caption: textField(item.caption),
      image: isMedia(item.image) ? item.image : null,
    }))
    .filter((item) => item.image)
    .slice(0, 4)

const authorListFromValue = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .map((item) => (isRecord(item) && 'value' in item ? item.value : item))
    .filter(isAuthor)
    .filter((author) => author.status !== 'hidden')

export const publicSummaryText = ({
  content,
  summary,
}: {
  content?: Article['content'] | BlogPost['content'] | null
  summary?: null | string
}) => {
  if (summary && !isLikelyTruncatedArticleText(summary)) {
    return summary
  }

  return excerptArticleText(content, 520) || summary || null
}

const publicArticleTags = (article: Pick<Article, 'category' | 'contentType' | 'tags'>) => {
  const values = [
    article.contentType,
    article.category,
    ...(article.tags || []).map((item) => item.tag),
  ]
    .map((value) => textField(value))
    .filter(Boolean)
    .map((value) =>
      value
        .split('-')
        .filter(Boolean)
        .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
        .join(' '),
    )

  return [...new Set(values)].slice(0, 8)
}

const publicArticleAuthors = (authors?: Article['authors'] | BlogPost['authors'] | null) =>
  authorListFromValue(authors)

const publicArticleAuthorNames = (authors?: Article['authors'] | BlogPost['authors'] | null) =>
  publicArticleAuthors(authors)
    .map((author) => author.name)
    .filter(Boolean)
    .join(', ') || defaultPublicAuthorName

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
const optionField = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => {
  const text = textField(value) as T

  return allowed.includes(text) ? text : fallback
}

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
    (youtubeID ? `https://www.youtube-nocookie.com/embed/${youtubeID}` : '') ||
    (vimeoID ? `https://player.vimeo.com/video/${vimeoID}` : '')
  const contentURL = textField(fields.contentURL) || uploadedURL || (isDirectVideoURL(url) ? url : '')

  return {
    align: optionField(fields.align, ['left', 'center', 'right'] as const, 'center'),
    caption: textField(fields.caption),
    contentURL,
    description: textField(fields.description),
    duration: textField(fields.duration),
    embedURL,
    maxWidth: optionField(fields.maxWidth, ['article', '360', '480', '720'] as const, 'article'),
    orientation: optionField(fields.orientation, ['horizontal', 'vertical', 'square'] as const, 'horizontal'),
    size: optionField(fields.size, ['small', 'medium', 'full'] as const, 'full'),
    sourceType: optionField(fields.sourceType, ['youtube', 'externalMP4', 'upload', 'url'] as const, 'url'),
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

const renderVideoFigure = (video: ReturnType<typeof videoFromFields>, key: string) => {
  if (!video.sourceURL && !video.embedURL) {
    return null
  }

  const accessibleTitle = video.title || video.caption || 'Embedded video'
  const maxWidth = video.maxWidth === 'article' ? '100%' : `${video.maxWidth}px`

  return (
    <figure
      className={[
        'public-content__video',
        `public-content__video--${video.orientation}`,
        `public-content__video--${video.size}`,
        `public-content__video--${video.align}`,
      ].join(' ')}
      key={key}
      style={{ '--video-user-max-width': maxWidth } as React.CSSProperties}
    >
      {video.embedURL ? (
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="public-content__video-frame"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={video.embedURL}
          title={accessibleTitle}
        />
      ) : isPlayableVideoURL(video.sourceURL) ? (
        <video className="public-content__video-frame" controls playsInline poster={video.thumbnailURL || undefined}>
          <source src={video.sourceURL} />
        </video>
      ) : (
        <a className="public-content__video-link" href={video.sourceURL} rel="noreferrer" target="_blank">
          {video.thumbnailURL ? <SafeImage alt={accessibleTitle} src={video.thumbnailURL} /> : null}
          <span>{accessibleTitle}</span>
        </a>
      )}
      {video.caption ? (
        <figcaption>
          <span>{video.caption}</span>
        </figcaption>
      ) : null}
    </figure>
  )
}

const renderImageBlock = (imageBlock: ReturnType<typeof imageBlockFromFields>, key: string) => {
  if (!imageBlock.image) {
    return null
  }

  const safeCustomWidth =
    imageBlock.width === 'custom' && imageBlock.customWidth
      ? `${Math.min(Math.max(imageBlock.customWidth, 160), 1200)}px`
      : undefined

  return (
    <figure
      className={[
        'public-content__image-block',
        `public-content__image-block--${imageBlock.width}`,
        `public-content__image-block--${imageBlock.align}`,
        `public-content__image-block--${imageBlock.aspectRatio}`,
      ].join(' ')}
      key={key}
      style={safeCustomWidth ? ({ '--image-max-width': safeCustomWidth } as React.CSSProperties) : undefined}
    >
      <SafeImage
        alt={imageBlock.image.alt || imageBlock.caption || 'Article image'}
        fileName={imageBlock.image.filename}
        src={mediaURL(imageBlock.image)}
      />
      {imageBlock.caption ? <figcaption>{imageBlock.caption}</figcaption> : null}
    </figure>
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
    const tag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(String(node.tag)) ? String(node.tag) : 'h2'
    const Heading = tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

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

    if (fields.blockType === 'imageBlock') {
      return renderImageBlock(imageBlockFromFields(fields), key)
    }

    if (fields.blockType === 'imageRow') {
      const images = imageRowFromFields(fields)

      if (!images.length) {
        return null
      }

      return (
        <div className="public-content__image-row" key={key}>
          {images.map((item, index) => (
            <figure key={`${key}-${index}`}>
              {item.image ? (
                <SafeImage
                  alt={item.image.alt || item.caption || 'Article image'}
                  fileName={item.image.filename}
                  src={mediaURL(item.image)}
                />
              ) : null}
              {item.caption ? <figcaption>{item.caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      )
    }

    if (fields.blockType === 'video') {
      const video = videoFromFields(fields)

      return renderVideoFigure(video, key)
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

export const ArticleMetaLine = ({
  authors,
  languageCode,
  publishedAt,
}: {
  authors?: Article['authors'] | BlogPost['authors'] | null
  languageCode?: null | string
  publishedAt?: null | string
}) => {
  const names = authorListFromValue(authors)
    .map((author) => author.name)
    .filter(Boolean)
    .join(', ') || defaultPublicAuthorName
  const date = formatArticleMetaDate(publishedAt, languageCode)

  if (!names && !date) {
    return null
  }

  return (
    <p className="public-content__meta">
      {names ? <span>{names}</span> : null}
      {names && date ? <span aria-hidden="true">·</span> : null}
      {date ? <time dateTime={publishedAt || undefined}>{date}</time> : null}
    </p>
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
  const blockFAQItems = collectBlockFields(content, 'faq').flatMap(faqItemsFromFields)
  const faqItems = blockFAQItems.length ? blockFAQItems : faqItemsFromRichText(content)
  const videos = collectBlockFields(content, 'video')
    .map(videoFromFields)
    .filter((video) => video.embedURL || video.contentURL || video.sourceURL)
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
      caption: video.caption || undefined,
      contentUrl: video.contentURL ? absoluteURL(video.contentURL) : undefined,
      description: video.schemaDescription || video.description || video.caption || undefined,
      duration: video.duration || undefined,
      embedUrl: absoluteURL(video.embedURL),
      name: video.schemaName || video.title || video.caption || title,
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

export type BreadcrumbItem = {
  href: string
  label: string
}

export const Breadcrumbs = ({ items }: { items: BreadcrumbItem[] }) => {
  const visibleItems = items.filter((item) => item.href && item.label)

  if (visibleItems.length < 2) {
    return null
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: visibleItems.map((item, index) => ({
      '@type': 'ListItem',
      item: absoluteURL(item.href),
      name: item.label,
      position: index + 1,
    })),
  }

  return (
    <>
      <nav aria-label="Breadcrumbs" className="public-content__breadcrumbs">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1

          return (
            <React.Fragment key={`${item.href}-${index}`}>
              {isLast ? <span aria-current="page">{item.label}</span> : <Link href={item.href}>{item.label}</Link>}
              {!isLast ? <span aria-hidden="true">/</span> : null}
            </React.Fragment>
          )
        })}
      </nav>
      <script
        dangerouslySetInnerHTML={{ __html: safeJSON(schema) }}
        type="application/ld+json"
      />
    </>
  )
}

export const PublicChrome = ({
  backgroundImage,
  children,
  kicker,
  languageCode,
  meta,
  searchQuery,
  title,
}: {
  backgroundImage?: Media | null | number
  children: React.ReactNode
  kicker?: string
  languageCode?: null | string
  meta?: React.ReactNode
  searchQuery?: null | string
  title: string
}) => {
  const heroImageURL = mediaURL(isMedia(backgroundImage) ? backgroundImage : null)
  const heroStyle = heroImageURL
    ? ({ '--public-hero-image': `url("${heroImageURL.replace(/"/gu, '\\"')}")` } as React.CSSProperties)
    : undefined

  return (
    <div className="public-content public-content--lorgar public-content--index">
      <LorgarHeader languageCode={languageCode} searchQuery={searchQuery} />
      <section
        className={['public-content__hero', heroImageURL ? 'public-content__hero--image' : ''].filter(Boolean).join(' ')}
        style={heroStyle}
      >
        {kicker ? <p className="public-content__kicker">{kicker}</p> : null}
        <h1>{title}</h1>
        {meta ? <div className="public-content__meta-wrap">{meta}</div> : null}
      </section>
      {children}
      <LorgarFooter />
    </div>
  )
}

export const ContentCard = ({
  href,
  image,
  label,
  summary,
  title,
}: {
  href: string
  image?: Media | null | number
  label?: null | string
  summary?: null | string
  title: string
}) => {
  const resolvedImage = isMedia(image) ? image : null

  return (
    <Link className="public-content__card" href={href}>
      {resolvedImage ? (
        <SafeImage
          alt={resolvedImage.alt || title}
          className="public-content__card-image"
          fileName={resolvedImage.filename}
          src={mediaURL(resolvedImage)}
        />
      ) : null}
      {label ? <span>{label}</span> : null}
      <strong>{title}</strong>
      {summary ? <p>{summary}</p> : null}
    </Link>
  )
}

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

export const findPreviewArticleBySlug = async ({
  id,
  slug,
  token,
}: {
  id?: null | string
  slug: string
  token?: null | string
}) => {
  if (!id || !token) {
    return null
  }

  const payload = await getPayload({ config: configPromise })
  const article = await payload.findByID({
    collection: 'articles',
    depth: 2,
    disableErrors: true,
    id,
    overrideAccess: true,
  })

  if (!article || article.slug !== slug) {
    return null
  }

  return isValidArticlePreviewToken({ id: article.id, slug, token }) ? article : null
}

const normalizedFilterText = (value?: null | string) => value?.trim().toLowerCase()

const articleMatchesSearchQuery = (article: Article, searchQuery?: null | string) => {
  const query = normalizedFilterText(searchQuery)

  if (!query) {
    return true
  }

  const tagText = article.tags?.map((tag) => tag.tag).filter(Boolean).join(' ') || ''
  const haystack = [
    article.title,
    article.summary,
    article.category,
    article.contentType,
    tagText,
    excerptArticleText(article.content, 4000),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

const articleMatchesTagQuery = (article: Article, tagQuery?: null | string) => {
  const query = normalizedFilterText(tagQuery)

  if (!query) {
    return true
  }

  return publicArticleTags(article).some((tag) => tag.toLowerCase() === query)
}

export const listPublishedArticles = async ({
  languageCode,
  limit = 500,
  searchQuery,
  tagQuery,
}: {
  languageCode?: ArticleLanguageCode | null
  limit?: number
  searchQuery?: null | string
  tagQuery?: null | string
} = {}) => {
  const payload = await getPayload({ config: configPromise })
  const whereClauses: Where[] = [
    {
      status: {
        equals: 'published',
      },
    },
  ]

  if (languageCode) {
    whereClauses.push({
      languageCode: {
        equals: languageCode,
      },
    })
  }

  const where: Where = {
    and: whereClauses,
  }
  const result = await payload.find({
    collection: 'articles',
    depth: 1,
    limit,
    overrideAccess: true,
    sort: '-publishedAt',
    where,
  })

  return result.docs.filter(
    (article) => articleMatchesSearchQuery(article, searchQuery) && articleMatchesTagQuery(article, tagQuery),
  )
}

export type ArticleLanguageAlternate = {
  code: string
  displayCode: string
  href: string
  hreflang: string
  isCurrent: boolean
  label: string
  title: string
}

export const listPublishedArticleTranslations = async (
  article: Article,
): Promise<ArticleLanguageAlternate[]> => {
  const group = articleTranslationGroupFromArticle(article)
  const currentID = String(article.id)
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'articles',
    depth: 0,
    limit: 200,
    overrideAccess: true,
    sort: 'languageCode',
    where: {
      status: {
        equals: 'published',
      },
    },
  })

  const alternatesByCode = new Map<string, ArticleLanguageAlternate>()

  for (const candidate of result.docs) {
    if (articleTranslationGroupFromArticle(candidate) !== group && String(candidate.id) !== currentID) {
      continue
    }

    const code = inferArticleLanguageCode(candidate)
    const href = articlePublicPath(candidate.slug)

    if (!href || alternatesByCode.has(code)) {
      continue
    }

    alternatesByCode.set(code, {
      code,
      displayCode: articleLanguageDisplayCodeByCode[code] || code.toUpperCase(),
      href,
      hreflang: articleLanguageHreflangByCode[code] || code,
      isCurrent: String(candidate.id) === currentID,
      label: articleLanguageLabelByCode[code] || code.toUpperCase(),
      title: candidate.title,
    })
  }

  return [...alternatesByCode.values()].sort((left, right) =>
    left.code.localeCompare(right.code),
  )
}

export const ArticleLanguageSwitcher = ({
  alternates,
}: {
  alternates: ArticleLanguageAlternate[]
}) => {
  if (alternates.length <= 1) {
    return null
  }

  return (
    <nav aria-label="Article language versions" className="public-content__language-switcher">
      <span>Language</span>
      <div>
        {alternates.map((alternate) =>
          alternate.isCurrent ? (
            <strong aria-current="page" key={alternate.code}>
              {alternate.displayCode}
            </strong>
          ) : (
            <Link href={alternate.href} key={alternate.code} title={alternate.title}>
              {alternate.displayCode}
            </Link>
          ),
        )}
      </div>
    </nav>
  )
}

const lorgarSolutions = [
  { href: 'https://lorgar.com/streaming', label: 'Streaming Solution' },
  { href: 'https://lorgar.com/pc-gaming', label: 'PC Gaming Solution' },
  { href: 'https://lorgar.com/sim-racing-flex', label: 'Sim Racing Flex Solution' },
  { href: 'https://lorgar.com/sim-racing-pro', label: 'Sim Racing Pro Solution' },
]

const lorgarProducts = [
  { href: 'https://lorgar.com/category/pc', label: 'PC' },
  { href: 'https://lorgar.com/category/monitors', label: 'Monitors' },
  { href: 'https://lorgar.com/category/gaming-mice', label: 'Mice' },
  { href: 'https://lorgar.com/category/gaming-keyboards', label: 'Keyboards' },
  { href: 'https://lorgar.com/category/gaming-headsets', label: 'Headsets' },
  { href: 'https://lorgar.com/category/gaming-controllers', label: 'Controllers' },
  { href: 'https://lorgar.com/category/gaming-mousepads', label: 'Mouse pads' },
  { href: 'https://lorgar.com/category/gaming-chairs', label: 'Chairs' },
  { href: 'https://lorgar.com/category/gaming-desks', label: 'Desks' },
  { href: 'https://lorgar.com/category/web-cameras', label: 'Webcams' },
  { href: 'https://lorgar.com/category/gaming-microphones', label: 'Microphones' },
  { href: 'https://lorgar.com/category/gaming-racing-cockpits', label: 'Racing Cockpits' },
  { href: 'https://lorgar.com/category/gaming-accessories', label: 'Racing Accessories' },
]

const lorgarMainLinks = [
  { href: 'https://lorgar.com/for-users', label: 'For Users' },
  { href: 'https://lorgar.com/platform', label: 'LORGAR Platform' },
  { href: 'https://lorgar.com/where-to-buy', label: 'Where To Buy' },
]

const lorgarFooterLinks = [
  { href: 'https://lorgar.com/for-users', label: 'For Users' },
  { href: 'https://lorgar.com/for-partners', label: 'For Partners' },
  { href: 'https://lorgar.com/platform', label: 'LORGAR Platform' },
  { href: 'https://lorgar.com/where-to-buy', label: 'Where To Buy' },
  { href: 'https://lorgar.com/about', label: 'About LORGAR' },
]

const lorgarPolicyLinks = [
  { href: 'https://lorgar.com/warranty-terms', label: 'Warranty Policy and Warranty Cards' },
  { href: 'https://lorgar.com/privacy-policy', label: 'Privacy Policy' },
  { href: 'https://lorgar.com/cookies-policy', label: 'Cookies policy' },
]

type LorgarIconName =
  | 'discuss'
  | 'facebook'
  | 'instagram'
  | 'like'
  | 'link'
  | 'linkedin'
  | 'mail'
  | 'telegram'
  | 'tiktok'
  | 'whatsapp'
  | 'x'
  | 'youtube'

const lorgarSocialLinks: Array<{
  href: string
  icon: LorgarIconName
  label: string
}> = [
  { href: 'https://www.youtube.com/channel/UCf3wrq74zLwlDI6AciwK0JA', icon: 'youtube', label: 'YouTube' },
  { href: 'https://www.facebook.com/lorgargaming', icon: 'facebook', label: 'Facebook' },
  { href: 'https://www.instagram.com/lorgar.global/', icon: 'instagram', label: 'Instagram' },
  { href: 'https://www.tiktok.com/@lorgar.global', icon: 'tiktok', label: 'TikTok' },
  { href: 'https://wa.me/48732080677', icon: 'whatsapp', label: 'WhatsApp' },
  { href: 'https://t.me/Lorgar_support_bot', icon: 'telegram', label: 'Telegram' },
  { href: 'https://www.linkedin.com/company/lorgar/', icon: 'linkedin', label: 'LinkedIn' },
]

const ExternalLink = ({
  children,
  className,
  href,
  newTab = false,
}: {
  children: React.ReactNode
  className?: string
  href: string
  newTab?: boolean
}) => (
  <a className={className} href={href} rel={newTab ? 'noreferrer' : undefined} target={newTab ? '_blank' : undefined}>
    {children}
  </a>
)

const LorgarLogo = ({ className }: { className?: string }) => (
  <img alt="LORGAR Ready To Play" className={className} height={72} src="/lorgar-logo.svg" width={260} />
)

const LorgarIcon = ({ name }: { name: LorgarIconName }) => {
  const letterIcon: Partial<Record<LorgarIconName, string>> = {
    facebook: 'f',
    linkedin: 'in',
    tiktok: 'tt',
    whatsapp: 'wa',
    x: 'x',
    youtube: 'yt',
  }

  if (letterIcon[name]) {
    return (
      <svg aria-hidden="true" className="lorgar-ui-icon" viewBox="0 0 24 24">
        <text dominantBaseline="central" textAnchor="middle" x="12" y="12">
          {letterIcon[name]}
        </text>
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="lorgar-ui-icon" fill="none" viewBox="0 0 24 24">
      {name === 'like' ? (
        <>
          <path d="M8 21H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3v11Z" />
          <path d="M8 10l4-7 1.5.8c.9.5 1.3 1.5 1 2.5L14 9h5a2 2 0 0 1 2 2.3l-1.1 7A3 3 0 0 1 17 21H8V10Z" />
        </>
      ) : null}
      {name === 'discuss' ? (
        <>
          <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v4a3.5 3.5 0 0 1-3.5 3.5H11l-5 4v-4A3.5 3.5 0 0 1 2.5 10.5v-4Z" />
          <path d="M8 8h8M8 11h5" />
        </>
      ) : null}
      {name === 'link' ? (
        <>
          <path d="M9.5 14.5 14.5 9.5" />
          <path d="M10.5 6.5 12 5a4 4 0 0 1 5.7 5.7l-1.6 1.6" />
          <path d="M13.5 17.5 12 19a4 4 0 0 1-5.7-5.7l1.6-1.6" />
        </>
      ) : null}
      {name === 'instagram' ? (
        <>
          <rect height="15" rx="4" width="15" x="4.5" y="4.5" />
          <circle cx="12" cy="12" r="3.3" />
          <path d="M16.7 7.4h.1" />
        </>
      ) : null}
      {name === 'telegram' ? <path d="M21 4 3.5 11.3l6.8 2.4L13 20l3.1-14.2-6.4 7.9" /> : null}
      {name === 'mail' ? (
        <>
          <rect height="14" rx="3" width="18" x="3" y="5" />
          <path d="m4.5 7 7.5 6 7.5-6" />
        </>
      ) : null}
    </svg>
  )
}

const LorgarNavDropdown = ({
  items,
  label,
}: {
  items: Array<{ href: string; label: string }>
  label: string
}) => (
  <details className="lorgar-nav-dropdown">
    <summary>{label}</summary>
    <div>
      {items.map((item) => (
        <ExternalLink href={item.href} key={item.href}>
          {item.label}
        </ExternalLink>
      ))}
    </div>
  </details>
)

const LorgarPrimaryNav = ({ className }: { className?: string }) => (
  <nav aria-label="Primary" className={className}>
    <LorgarNavDropdown items={lorgarSolutions} label="Solutions" />
    <LorgarNavDropdown items={lorgarProducts} label="Products" />
    {lorgarMainLinks.map((item) => (
      <ExternalLink href={item.href} key={item.href}>
        {item.label}
      </ExternalLink>
    ))}
  </nav>
)

const lorgarArticlesPath = ({
  languageCode,
  searchQuery,
  tagQuery,
}: {
  languageCode?: null | string
  searchQuery?: null | string
  tagQuery?: null | string
}) => {
  const params = new URLSearchParams()
  const normalizedLanguageCode = normalizeArticleLanguageCode(languageCode)
  const query = searchQuery?.trim()
  const tag = tagQuery?.trim()

  if (normalizedLanguageCode) {
    params.set('lang', normalizedLanguageCode)
  }

  if (query) {
    params.set('q', query)
  }

  if (tag) {
    params.set('tag', tag)
  }

  const queryString = params.toString()

  return `/articles${queryString ? `?${queryString}` : ''}`
}

const lorgarLanguageLinks = ({
  alternates,
  currentCode,
  searchQuery,
}: {
  alternates?: ArticleLanguageAlternate[]
  currentCode: ArticleLanguageCode
  searchQuery?: null | string
}) => {
  const alternatesByCode = new Map(alternates?.map((alternate) => [alternate.code, alternate]) || [])

  return articleLanguageDefinitions.map((language) => {
    const alternate = alternatesByCode.get(language.value)

    return {
      code: language.value,
      displayCode: language.displayCode,
      href: alternate?.href || lorgarArticlesPath({ languageCode: language.value, searchQuery }),
      isCurrent: alternate?.isCurrent || (!alternates?.length && language.value === currentCode),
      label: language.label,
      title: alternate?.title || `${language.language} articles`,
    }
  })
}

const LorgarHeader = ({
  alternates,
  languageCode,
  searchQuery,
}: {
  alternates?: ArticleLanguageAlternate[]
  languageCode?: null | string
  searchQuery?: null | string
}) => {
  const currentCode = normalizeArticleLanguageCode(languageCode)
  const currentDisplayCode = articleLanguageDisplayCodeByCode[currentCode] || currentCode.toUpperCase()
  const languageLinks = lorgarLanguageLinks({ alternates, currentCode, searchQuery })

  return (
    <header className="lorgar-header">
      <Link className="lorgar-header__brand" href="/articles">
        <LorgarLogo className="lorgar-header__logo" />
      </Link>
      <LorgarPrimaryNav className="lorgar-header__nav" />
      <div className="lorgar-header__tools">
        <form action="/articles" className="lorgar-header__search" role="search">
          <input aria-label="Search articles" defaultValue={searchQuery || ''} name="q" placeholder="Search" type="search" />
          <input name="lang" type="hidden" value={currentCode} />
          <button aria-label="Search articles" type="submit">
            <span aria-hidden="true" />
          </button>
        </form>
        <details className="lorgar-header__language">
          <summary>{currentDisplayCode}</summary>
          <div>
            {languageLinks.map((alternate) =>
              alternate.isCurrent ? (
                <strong aria-current="page" key={alternate.code}>{alternate.displayCode}</strong>
              ) : (
                <Link href={alternate.href} key={alternate.code} title={alternate.title}>{alternate.displayCode}</Link>
              ),
            )}
          </div>
        </details>
        <details className="lorgar-header__mobile-menu">
          <summary aria-label="Open menu"><span aria-hidden="true" /></summary>
          <LorgarPrimaryNav className="lorgar-header__mobile-nav" />
        </details>
      </div>
    </header>
  )
}

const LorgarMetaIcon = ({ type }: { type: 'author' | 'date' }) => (
  <svg aria-hidden="true" className="lorgar-meta__icon" fill="none" viewBox="0 0 24 24">
    {type === 'date' ? (
      <>
        <path d="M7 3v4M17 3v4M4.5 9h15" />
        <path d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z" />
      </>
    ) : (
      <>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    )}
  </svg>
)

const LorgarMeta = ({
  article,
  publishedAt,
}: {
  article: Article
  publishedAt?: null | string
}) => {
  const date = formatArticleMetaDate(publishedAt, article.languageCode)
  const authorNames = publicArticleAuthorNames(article.authors)

  return (
    <div className="lorgar-meta">
      {date ? (
        <span>
          <LorgarMetaIcon type="date" />
          <time dateTime={publishedAt || undefined}>{date}</time>
        </span>
      ) : null}
      <span>
        <LorgarMetaIcon type="author" />
        {authorNames}
      </span>
    </div>
  )
}

const LorgarArticleShare = ({
  articleSlug,
  path,
  title,
}: {
  articleSlug: string
  path?: null | string
  title: string
}) => {
  const url = absoluteURL(path) || publicBaseURL()

  return <LorgarArticleActions articleSlug={articleSlug} title={title} url={url} />
}

const LorgarRelatedArticleCard = ({ article }: { article: Article }) => {
  const href = articlePublicPath(article.slug) || '/articles'
  const summary = article.summary || excerptArticleText(article.content, 180)

  return (
    <Link className="lorgar-related-card" href={href}>
      {isMedia(article.coverImage) ? (
        <SafeImage
          alt={article.coverImage.alt || article.title}
          fileName={article.coverImage.filename}
          src={mediaURL(article.coverImage)}
        />
      ) : null}
      <span>
        <strong>{article.title}</strong>
        {summary ? <p>{summary}</p> : null}
      </span>
    </Link>
  )
}

const LorgarRelatedPosts = ({
  currentArticle,
  recentArticles,
}: {
  currentArticle: Article
  recentArticles: Article[]
}) => {
  const relatedArticles = recentArticles
    .filter((article) => String(article.id) !== String(currentArticle.id))
    .slice(0, 3)

  if (!relatedArticles.length) {
    return null
  }

  return (
    <section className="lorgar-related" aria-label="Related posts">
      <h2>Related posts</h2>
      <div>
        {relatedArticles.map((article) => (
          <LorgarRelatedArticleCard article={article} key={article.id} />
        ))}
      </div>
    </section>
  )
}

const LorgarCTA = () => (
  <section className="lorgar-cta-strip" aria-label="Contact LORGAR">
    <strong>Interested in working with LORGAR?</strong>
    <div>
      <ExternalLink href="https://lorgar.com/for-partners">For partners</ExternalLink>
      <ExternalLink href="https://lorgar.com/for-users">Contact us</ExternalLink>
    </div>
  </section>
)

const LorgarSubscribe = ({ languageCode }: { languageCode?: null | string }) => (
  <section className="lorgar-subscribe" aria-label="Subscribe to LORGAR blog">
    <div className="lorgar-subscribe__icon">
      <LorgarIcon name="mail" />
    </div>
    <div>
      <h2>Subscribe to our blog</h2>
      <p>Get the latest news and insights delivered straight to your inbox.</p>
    </div>
    <LorgarSubscribeForm languageCode={normalizeArticleLanguageCode(languageCode)} />
  </section>
)

const LorgarFooter = () => (
  <footer className="lorgar-footer">
    <ExternalLink className="lorgar-footer__logo" href="https://lorgar.com">
      <LorgarLogo />
    </ExternalLink>
    <nav aria-label="Footer" className="lorgar-footer__nav">
      {lorgarFooterLinks.map((item) => (
        <ExternalLink href={item.href} key={item.href}>
          {item.label}
        </ExternalLink>
      ))}
    </nav>
    <div className="lorgar-footer__social" aria-label="Social links">
      {lorgarSocialLinks.map((item) => (
        <ExternalLink href={item.href} key={item.href} newTab>
          <LorgarIcon name={item.icon} />
          <span className="sr-only">{item.label}</span>
        </ExternalLink>
      ))}
    </div>
    <div className="lorgar-footer__legal">
      <span>&copy; LORGAR 2026, All rights reserved</span>
      {lorgarPolicyLinks.map((item) => (
        <ExternalLink href={item.href} key={item.href}>
          {item.label}
        </ExternalLink>
      ))}
    </div>
  </footer>
)

export const LorgarArticleLayout = ({
  article,
  children,
  recentArticles,
  summary,
  translations,
}: {
  article: Article
  children: React.ReactNode
  recentArticles: Article[]
  summary?: null | string
  translations: ArticleLanguageAlternate[]
}) => {
  const articlePath = articlePublicPath(article.slug) || '/articles'
  const navigationLabels = publicArticleNavigationLabels(article.languageCode)
  const publishedDate = article.publishedAt || article.createdAt
  const tags = publicArticleTags(article)

  return (
    <div className="public-content public-content--lorgar">
      <LorgarHeader alternates={translations} languageCode={article.languageCode} />
      <main className="lorgar-article-shell">
        <article className="lorgar-article-main">
          <Breadcrumbs
            items={[
              { href: '/blog', label: navigationLabels.blog },
              { href: '/articles', label: navigationLabels.allArticles },
              { href: articlePath, label: article.title },
            ]}
          />
          {tags.length ? (
            <div className="lorgar-article-tags">
              <span>TAGS</span>
              {tags.slice(0, 5).map((tag) => (
                <Link
                  href={lorgarArticlesPath({ languageCode: article.languageCode, tagQuery: tag })}
                  key={tag}
                >
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}
          <h1>{article.title}</h1>
          {summary ? <p className="lorgar-article-summary">{summary}</p> : null}
          <LorgarMeta article={article} publishedAt={publishedDate} />
          <ArticleLanguageSwitcher alternates={translations} />
          {isMedia(article.coverImage) ? (
            <PublicImage alt={article.coverImage.alt || article.title} className="lorgar-article-cover" media={article.coverImage} />
          ) : null}
          <LorgarArticleShare articleSlug={article.slug} path={articlePath} title={article.title} />
          <div className="lorgar-article-body">{children}</div>
          <LorgarCTA />
          <LorgarSubscribe languageCode={article.languageCode} />
          <LorgarRelatedPosts currentArticle={article} recentArticles={recentArticles} />
        </article>
      </main>
      <LorgarFooter />
    </div>
  )
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
