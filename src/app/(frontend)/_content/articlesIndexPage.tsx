import {
  articleLanguageDisplayCodeByCode,
  articleLanguageLabelByCode,
  normalizeArticleLanguageCode,
} from '@/lib/articleTranslations'
import { loadFrontendUIDictionary } from '@/lib/frontendUITranslations'
import type { Article } from '@/payload-types'

import {
  type ArticleSortMode,
  LorgarArticlesIndexLayout,
  buildLorgarTagFilters,
  listPublishedArticles,
  listPublishedArticlesPage,
} from './contentHelpers'

export type ArticlesIndexSearchParams = Record<string, string | string[] | undefined>

export type ArticlesIndexRouteOptions = {
  routeLanguageCode?: null | string
  routeTagQuery?: null | string
  searchParams?: Promise<ArticlesIndexSearchParams>
}

const firstQueryValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)
const queryValues = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((item) => item.split(','))
    .map((item) => item.trim())
    .filter(Boolean)
const articlesPerPage = 18
const parseSortMode = (value: string | string[] | undefined): ArticleSortMode =>
  firstQueryValue(value) === 'views' ? 'views' : 'latest'

const parsePage = (value: string | string[] | undefined) => {
  const page = Number.parseInt(firstQueryValue(value) || '1', 10)

  return Number.isFinite(page) && page > 0 ? page : 1
}

const routeTagToQuery = (value?: null | string) => {
  if (!value) {
    return ''
  }

  try {
    return decodeURIComponent(value).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  } catch {
    return value.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

export async function renderArticlesIndexPage({
  routeLanguageCode,
  routeTagQuery,
  searchParams,
}: ArticlesIndexRouteOptions) {
  const query = await searchParams
  const searchQuery = firstQueryValue(query?.q)?.trim() || ''
  const routeTag = routeTagToQuery(routeTagQuery)
  const tagQueries = [...new Set([...queryValues(query?.tag), ...(routeTag ? [routeTag] : [])])]
  const requestedPage = parsePage(query?.page)
  const sortMode = parseSortMode(query?.sort)
  const languageCode = normalizeArticleLanguageCode(routeLanguageCode || firstQueryValue(query?.lang) || 'en')
  const shouldPreviewLocalization = firstQueryValue(query?.previewLocalization) === 'true'
  const uiStrings = await loadFrontendUIDictionary(languageCode, { preview: shouldPreviewLocalization })
  const shouldUseFilteredArchive = Boolean(searchQuery || tagQueries.length)
  const tagFilterArticles = await listPublishedArticles({
    languageCode,
    limit: 1000,
    sortMode: 'latest',
  })
  const tagFilters = buildLorgarTagFilters(tagFilterArticles)
  let articles: Article[] = []
  let totalItems = 0
  let totalPages = 1
  let currentPage = requestedPage

  if (shouldUseFilteredArchive) {
    const allArticles = await listPublishedArticles({
      languageCode,
      limit: 1000,
      searchQuery,
      sortMode,
      tagQueries,
    })

    totalItems = allArticles.length
    totalPages = Math.max(1, Math.ceil(totalItems / articlesPerPage))
    currentPage = Math.min(requestedPage, totalPages)
    articles = allArticles.slice((currentPage - 1) * articlesPerPage, currentPage * articlesPerPage)
  } else {
    let pageData = await listPublishedArticlesPage({
      languageCode,
      limit: articlesPerPage,
      page: requestedPage,
      sortMode,
    })

    if (!pageData.articles.length && requestedPage > 1 && pageData.totalPages > 0) {
      pageData = await listPublishedArticlesPage({
        languageCode,
        limit: articlesPerPage,
        page: pageData.totalPages,
        sortMode,
      })
    }

    articles = pageData.articles
    totalItems = pageData.totalItems
    totalPages = Math.max(1, pageData.totalPages)
    currentPage = Math.min(requestedPage, totalPages)
  }

  const languageLabel = articleLanguageLabelByCode[languageCode]
  const languageDisplayCode = articleLanguageDisplayCodeByCode[languageCode]
  const resultContext = [
    searchQuery ? `search "${searchQuery}"` : null,
    tagQueries.length ? `tags ${tagQueries.map((tag) => `"${tag}"`).join(', ')}` : null,
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
        totalItems,
        totalPages,
      }}
      resultLabel={resultLabel}
      searchQuery={searchQuery}
      sortMode={sortMode}
      tagFilters={tagFilters}
      tagQueries={tagQueries}
      uiStrings={uiStrings}
    />
  )
}
