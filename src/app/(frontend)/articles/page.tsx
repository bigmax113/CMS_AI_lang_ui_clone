import {
  articleLanguageDisplayCodeByCode,
  articleLanguageLabelByCode,
  normalizeArticleLanguageCode,
} from '@/lib/articleTranslations'

import {
  ContentCard,
  PublicChrome,
  articleHref,
  createSEOPageMetadata,
  formatDate,
  listPublishedArticles,
  publicSummaryText,
} from '../_content/contentHelpers'

export const dynamic = 'force-dynamic'

export const metadata = createSEOPageMetadata({
  description: 'Published articles, guides, news, and product content.',
  path: '/articles',
  title: 'All Articles',
  type: 'website',
})

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const firstQueryValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function ArticlesIndexPage({ searchParams }: PageProps) {
  const query = await searchParams
  const searchQuery = firstQueryValue(query?.q)?.trim() || ''
  const tagQuery = firstQueryValue(query?.tag)?.trim() || ''
  const languageCode = normalizeArticleLanguageCode(firstQueryValue(query?.lang) || 'en')
  const articles = await listPublishedArticles({ languageCode, searchQuery, tagQuery })
  const languageLabel = articleLanguageLabelByCode[languageCode]
  const languageDisplayCode = articleLanguageDisplayCodeByCode[languageCode]
  const resultContext = [
    searchQuery ? `search "${searchQuery}"` : null,
    tagQuery ? `topic "${tagQuery}"` : null,
  ].filter(Boolean).join(' and ')
  const resultLabel = resultContext
    ? `Results for ${resultContext} in ${languageLabel}`
    : `${languageDisplayCode} ${languageLabel} articles`

  return (
    <PublicChrome
      kicker="Published content"
      languageCode={languageCode}
      searchQuery={searchQuery}
      title="All Articles"
    >
      <section className="public-content__section">
        <p className="public-content__results-note">{resultLabel}</p>
        {articles.length ? (
          <div className="public-content__grid">
            {articles.map((article) => (
              <ContentCard
                href={articleHref(article)}
                image={article.coverImage}
                key={article.id}
                label={
                  formatDate(article.publishedAt, article.languageCode) ||
                  article.contentType ||
                  article.category ||
                  'Article'
                }
                summary={publicSummaryText({ content: article.content, summary: article.summary })}
                title={article.title}
              />
            ))}
          </div>
        ) : (
          <p className="public-content__empty">
            No published articles match this search and language filter.
          </p>
        )}
      </section>
    </PublicChrome>
  )
}
