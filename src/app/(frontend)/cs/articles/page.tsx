import { createSEOPageMetadata } from '../../_content/contentHelpers'
import { renderArticlesIndexPage } from '../../_content/articlesIndexPage'

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

export default async function LocalizedArticlesIndexPage({ searchParams }: PageProps) {
  return renderArticlesIndexPage({ routeLanguageCode: 'cs', searchParams })
}