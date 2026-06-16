import {
  articleLanguageDisplayCodeByCode,
  articleLanguageLabelByCode,
  normalizeArticleLanguageCode,
} from '@/lib/articleTranslations'

import {
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

export default async function ArticlesIndexPage({ searchParams }: PageProps) {
  const query = await searchParams
  const searchQuery = firstQueryValue(query?.q)?.trim() || ''
  const tagQuery = firstQueryValue(query?.tag)?.trim() || ''
  const languageCode = normalizeArticleLanguageCode(firstQueryValue(query?.lang) || 'en')
  const articles = (await listPublishedArticles({
    languageCode,
    limit: searchQuery || tagQuery ? 500 : 12,
    searchQuery,
    tagQuery,
  })).slice(0, 12)
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
    <LorgarArticlesIndexLayout
      articles={articles}
      languageCode={languageCode}
      resultLabel={resultLabel}
      searchQuery={searchQuery}
      tagQuery={tagQuery}
    />
  )
}
