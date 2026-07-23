import { generateArticlesIndexMetadata, renderArticlesIndexPage } from '../../_content/articlesIndexPage'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata = ({ searchParams }: PageProps) =>
  generateArticlesIndexMetadata({ routeLanguageCode: 'kz', searchParams })

export default async function LocalizedArticlesIndexPage({ searchParams }: PageProps) {
  return renderArticlesIndexPage({ routeLanguageCode: 'kz', searchParams })
}
