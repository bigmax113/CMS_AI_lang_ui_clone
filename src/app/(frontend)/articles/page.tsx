import {
  articleLanguageDisplayCodeByCode,
  articleLanguageLabelByCode,
  normalizeArticleLanguageCode,
} from '@/lib/articleTranslations'

import {
  type ArticleSortMode,
  LorgarArticlesIndexLayout,
  createSEOPageMetadata,
  listPublishedArticles,
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
const queryValues = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((item) => item.split(','))
    .map((item) => item.trim())
    .filter(Boolean)
const articlesPerPage = 6
const parseSortMode = (value: string | string[] | undefined): ArticleSortMode =>
  firstQueryValue(value) === 'views' ? 'views' : 'latest'

const parsePage = (value: string | string[] | undefined) => {
  const page = Number.parseInt(firstQueryValue(value) || '1', 10)

  return Number.isFinite(page) && page > 0 ? page : 1
}

export default async function ArticlesIndexPage({ searchParams }: PageProps) {
  const query = await searchParams
  const searchQuery = firstQueryValue(query?.q)?.trim() || ''
  const tagQueries = [...new Set(queryValues(query?.tag))]
  const requestedPage = parsePage(query?.page)
  const sortMode = parseSortMode(query?.sort)
  const languageCode = normalizeArticleLanguageCode(firstQueryValue(query?.lang) || 'en')
  const allArticles = await listPublishedArticles({
    languageCode,
    limit: 1000,
    searchQuery,
    sortMode,
    tagQueries,
  })
  const totalPages = Math.max(1, Math.ceil(allArticles.length / articlesPerPage))
  const currentPage = Math.min(requestedPage, totalPages)
  const articles = allArticles.slice((currentPage - 1) * articlesPerPage, currentPage * articlesPerPage)
  const languageLabel = articleLanguageLabelByCode[languageCode]
  const languageDisplayCode = articleLanguageDisplayCodeByCode[languageCode]
  const resultContext = [
    searchQuery ? `search "${searchQuery}"` : null,
    tagQueries.length ? `topics ${tagQueries.map((tag) => `"${tag}"`).join(', ')}` : null,
    sortMode === 'views' ? 'sorted by views' : null,
  ].filter(Boolean).join(' and ')
  const resultLabel = resultContext
    ? `Results for ${resultContext} in ${languageLabel}`
    : `${languageDisplayCode} ${languageLabel} articles`

  return (
    <LorgarArticlesIndexLayout
      articles={articles}
      languageCode={languageCode}
      pagination={{
        currentPage,
        pageSize: articlesPerPage,
        totalItems: allArticles.length,
        totalPages,
      }}
      resultLabel={resultLabel}
      searchQuery={searchQuery}
      sortMode={sortMode}
      tagQueries={tagQueries}
    />
  )
}
