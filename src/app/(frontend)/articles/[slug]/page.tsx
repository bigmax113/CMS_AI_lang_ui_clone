import { notFound } from 'next/navigation'

import { PublicChrome, RichText, findPublishedArticleBySlug, formatDate, mediaURL } from '../../_content/contentHelpers'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export const generateMetadata = async ({ params }: PageProps) => {
  const { slug } = await params
  const article = await findPublishedArticleBySlug(slug)

  if (!article) {
    return {
      title: 'Article not found - CMS AI',
    }
  }

  return {
    description: article.seo?.description || article.summary || undefined,
    title: `${article.seo?.title || article.title} - CMS AI`,
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const article = await findPublishedArticleBySlug(slug)

  if (!article) {
    notFound()
  }

  const coverURL = mediaURL(article.coverImage)

  return (
    <PublicChrome kicker={formatDate(article.publishedAt) || article.category || 'Article'} title={article.title}>
      <article className="public-content__article">
        {article.summary ? <p className="public-content__summary">{article.summary}</p> : null}
        {coverURL ? (
          // eslint-disable-next-line @next/next/no-img-element -- Payload media URLs are dynamic in this prototype.
          <img alt={article.title} className="public-content__cover" src={coverURL} />
        ) : null}
        <RichText content={article.content} />
      </article>
    </PublicChrome>
  )
}
