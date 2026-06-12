import { notFound } from 'next/navigation'

import { articlePublicPath } from '@/lib/publicURLs'
import {
  ArticleMetaLine,
  ArticleLanguageSwitcher,
  Breadcrumbs,
  PublicChrome,
  RichText,
  StructuredData,
  createSEOPageMetadata,
  findPreviewArticleBySlug,
  findPublishedArticleBySlug,
  listPublishedArticleTranslations,
  publicArticleNavigationLabels,
  publicSummaryText,
} from '../../_content/contentHelpers'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{
    slug: string
  }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const firstQueryValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const findArticleForPage = async ({
  query,
  slug,
}: {
  query?: Record<string, string | string[] | undefined>
  slug: string
}) => {
  if (firstQueryValue(query?.preview) === '1') {
    const previewArticle = await findPreviewArticleBySlug({
      id: firstQueryValue(query?.id),
      slug,
      token: firstQueryValue(query?.token),
    })

    if (previewArticle) {
      return previewArticle
    }
  }

  return findPublishedArticleBySlug(slug)
}

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const { slug } = await params
  const query = await searchParams
  const article = await findArticleForPage({ query, slug })

  if (!article) {
    return {
      title: 'Article not found - CMS AI',
    }
  }

  const translations = article.status === 'published' ? await listPublishedArticleTranslations(article) : []
  const languageAlternates = Object.fromEntries(
    translations.map((translation) => [translation.hreflang, translation.href]),
  )
  const seo = article.seo as
    | {
        canonicalURL?: null | string
        ogDescription?: null | string
        ogTitle?: null | string
        twitterDescription?: null | string
        twitterTitle?: null | string
      }
    | undefined
  const summary = publicSummaryText({ content: article.content, summary: article.summary })

  return createSEOPageMetadata({
    canonicalURL: seo?.canonicalURL,
    description: article.seo?.description || summary,
    image: article.seo?.image || article.coverImage,
    languageAlternates,
    ogDescription: seo?.ogDescription,
    ogTitle: seo?.ogTitle,
    path: articlePublicPath(article.slug),
    title: article.seo?.title || article.title,
    twitterDescription: seo?.twitterDescription,
    twitterTitle: seo?.twitterTitle,
  })
}

export default async function ArticlePage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const query = await searchParams
  const article = await findArticleForPage({ query, slug })

  if (!article) {
    notFound()
  }

  const translations = article.status === 'published' ? await listPublishedArticleTranslations(article) : []
  const articlePath = articlePublicPath(article.slug) || '/articles'
  const navigationLabels = publicArticleNavigationLabels(article.languageCode)
  const summary = publicSummaryText({ content: article.content, summary: article.summary })
  const publishedDate = article.publishedAt || article.createdAt

  return (
    <PublicChrome
      backgroundImage={article.coverImage}
      kicker={article.contentType || article.category || 'Article'}
      meta={
        <ArticleMetaLine
          authors={article.authors}
          languageCode={article.languageCode}
          publishedAt={publishedDate}
        />
      }
      title={article.title}
    >
      <StructuredData
        authors={article.authors}
        content={article.content}
        contentType="Article"
        description={article.seo?.description || summary}
        image={article.seo?.image || article.coverImage}
        publishedAt={publishedDate}
        title={article.seo?.title || article.title}
        updatedAt={article.updatedAt}
        url={articlePublicPath(article.slug)}
      />
      <article className="public-content__article">
        <Breadcrumbs
          items={[
            { href: '/blog', label: navigationLabels.blog },
            { href: '/articles', label: navigationLabels.allArticles },
            { href: articlePath, label: article.title },
          ]}
        />
        <ArticleLanguageSwitcher alternates={translations} />
        <RichText content={article.content} />
      </article>
    </PublicChrome>
  )
}
