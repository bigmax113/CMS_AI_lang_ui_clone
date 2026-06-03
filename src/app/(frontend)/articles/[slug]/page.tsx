import { notFound } from 'next/navigation'

import { articlePublicPath } from '@/lib/publicURLs'
import {
  AuthorByline,
  ArticleLanguageSwitcher,
  PublicChrome,
  PublicImage,
  RichText,
  StructuredData,
  createSEOPageMetadata,
  findPublishedArticleBySlug,
  formatDate,
  listPublishedArticleTranslations,
} from '../../_content/contentHelpers'

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

  const translations = await listPublishedArticleTranslations(article)
  const languageAlternates = Object.fromEntries(
    translations.map((translation) => [translation.hreflang, translation.href]),
  )

  return createSEOPageMetadata({
    description: article.seo?.description || article.summary,
    image: article.seo?.image || article.coverImage,
    languageAlternates,
    path: articlePublicPath(article.slug),
    title: `${article.seo?.title || article.title} - CMS AI`,
  })
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const article = await findPublishedArticleBySlug(slug)

  if (!article) {
    notFound()
  }

  const translations = await listPublishedArticleTranslations(article)

  return (
    <PublicChrome
      kicker={formatDate(article.publishedAt) || article.contentType || article.category || 'Article'}
      title={article.title}
    >
      <StructuredData
        authors={article.authors}
        content={article.content}
        contentType="Article"
        description={article.seo?.description || article.summary}
        image={article.seo?.image || article.coverImage}
        publishedAt={article.publishedAt}
        title={article.seo?.title || article.title}
        updatedAt={article.updatedAt}
        url={articlePublicPath(article.slug)}
      />
      <article className="public-content__article">
        <AuthorByline authors={article.authors} />
        <ArticleLanguageSwitcher alternates={translations} />
        {article.summary ? <p className="public-content__summary">{article.summary}</p> : null}
        {article.coverImage ? (
          <PublicImage alt={article.title} className="public-content__cover" media={article.coverImage} />
        ) : null}
        <RichText content={article.content} />
      </article>
    </PublicChrome>
  )
}
