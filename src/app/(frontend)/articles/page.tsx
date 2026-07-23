import { generateArticlesIndexMetadata, renderArticlesIndexPage } from '../_content/articlesIndexPage'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata = ({ searchParams }: PageProps) =>
  generateArticlesIndexMetadata({ searchParams })
export default async function ArticlesIndexPage({ searchParams }: PageProps) {
  return renderArticlesIndexPage({ searchParams })
}
