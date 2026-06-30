import { createSEOPageMetadata } from '../../../_content/contentHelpers'
import { renderArticlesIndexPage } from '../../../_content/articlesIndexPage'

export const dynamic = 'force-dynamic'

export const metadata = createSEOPageMetadata({
  description: 'Published articles filtered by tag.',
  path: '/articles',
  title: 'Tagged Articles',
  type: 'website',
})

type PageProps = {
  params: Promise<{ tag: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function LocalizedTaggedArticlesIndexPage({ params, searchParams }: PageProps) {
  const { tag } = await params

  return renderArticlesIndexPage({ routeLanguageCode: 'es', routeTagQuery: tag, searchParams })
}