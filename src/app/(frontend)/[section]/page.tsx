import { notFound } from 'next/navigation'

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

type PageProps = {
  params: Promise<{
    section: string
  }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const firstQueryValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const sectionConfig = {
  about: {
    defaultTag: 'about',
    description: 'Brand, company, and ecosystem updates from LORGAR.',
    intro: 'Company stories, announcements, and brand updates collected in one place.',
    title: 'About',
  },
  esports: {
    defaultTag: 'esports',
    description: 'Esports stories, tournament coverage, rankings, and performance lab updates.',
    intro: 'Competition, rankings, events, and performance stories from the LORGAR ecosystem.',
    title: 'Esports',
  },
  'for-users': {
    defaultTag: 'for-users',
    description: 'Guides, explainers, and user-focused LORGAR content.',
    intro: 'How-to content, buying guidance, and everyday use cases for the LORGAR audience.',
    title: 'For Users',
  },
  platform: {
    defaultTag: 'platform',
    description: 'Platform stories, ecosystem updates, and product workflow content.',
    intro: 'Platform-focused stories, integrations, and ecosystem updates.',
    title: 'LORGAR Platform',
  },
  products: {
    defaultTag: 'products',
    description: 'Product news, launches, reviews, and buying guides.',
    intro: 'Products, launches, and hands-on content gathered into a single storefront-style feed.',
    title: 'Products',
  },
  solutions: {
    defaultTag: 'solutions',
    description: 'Solution pages and practical setups for gaming and creator workflows.',
    intro: 'Ready-made solutions, setups, and use-case driven collections.',
    title: 'Solutions',
  },
  'where-to-buy': {
    defaultTag: 'where-to-buy',
    description: 'Partner, retail, and buying information connected to the LORGAR content hub.',
    intro: 'Retail, partner, and availability-oriented content in a single feed.',
    title: 'Where To Buy',
  },
} as const

type SectionKey = keyof typeof sectionConfig

const isSectionKey = (value: string): value is SectionKey => value in sectionConfig

export const generateMetadata = async ({ params }: PageProps) => {
  const { section } = await params

  if (!isSectionKey(section)) {
    return {}
  }

  const config = sectionConfig[section]

  return createSEOPageMetadata({
    description: config.description,
    path: `/${section}`,
    title: config.title,
    type: 'website',
  })
}

export default async function LorgarSectionPage({ params, searchParams }: PageProps) {
  const { section } = await params

  if (!isSectionKey(section)) {
    notFound()
  }

  const config = sectionConfig[section]
  const query = await searchParams
  const searchQuery = firstQueryValue(query?.q)?.trim() || ''
  const tagQuery = firstQueryValue(query?.tag)?.trim() || config.defaultTag
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
  ]
    .filter(Boolean)
    .join(' and ')
  const resultLabel = resultContext
    ? `Results for ${resultContext} in ${languageLabel}`
    : `${languageDisplayCode} ${languageLabel} articles`

  return (
    <LorgarArticlesIndexLayout
      articles={articles}
      languageCode={languageCode}
      pageIntro={config.intro}
      pageTitle={config.title}
      resultLabel={resultLabel}
      searchQuery={searchQuery}
      tagQuery={tagQuery}
    />
  )
}
