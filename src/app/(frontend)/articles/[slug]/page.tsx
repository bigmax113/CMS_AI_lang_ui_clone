import { notFound } from 'next/navigation'

import { PublicChrome, PublicImage, RichText, findPublishedArticleBySlug, formatDate } from '../../_content/contentHelpers'

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

  return (
    <PublicChrome kicker={formatDate(article.publishedAt) || article.category || 'Article'} title={article.title}>
      <article className="public-content__article">
        {article.summary ? <p className="public-content__summary">{article.summary}</p> : null}
        {article.coverImage ? (
          <PublicImage alt={article.title} className="public-content__cover" media={article.coverImage} />
        ) : null}
        <RichText content={article.content} />
      </article>
    </PublicChrome>
  )
}
