import pg from 'pg'

import { articleLanguageDefinitions } from './articleTranslations'

const { Client } = pg

type FrontendUIPGClient = InstanceType<typeof Client>

type FrontendUILanguageRow = {
  display_code: string
  label: string
  language: string
  language_code: string
}

type FrontendUIDictionaryRow = {
  key: string
  translated_text: string
}

type FrontendUILocalizationRow = {
  default_text: string
  description?: string
  key: string
  namespace: string
  published_at?: Date
  status?: string
  translated_text?: string
  updated_at?: Date
}

export const frontendUIStringDefinitions = [
  {
    defaultText: 'Open LORGAR website',
    description: 'Accessible label for the LORGAR logo link.',
    key: 'nav.logoAria',
    namespace: 'nav',
  },
  {
    defaultText: 'Open LORGAR blog',
    description: 'Accessible label for the BLOG badge link.',
    key: 'nav.blogAria',
    namespace: 'nav',
  },
  {
    defaultText: 'Streaming Solution',
    description: 'Solutions dropdown item.',
    key: 'nav.solutions.streaming',
    namespace: 'nav',
  },
  {
    defaultText: 'PC Gaming Solution',
    description: 'Solutions dropdown item.',
    key: 'nav.solutions.pcGaming',
    namespace: 'nav',
  },
  {
    defaultText: 'Sim Racing Flex Solution',
    description: 'Solutions dropdown item.',
    key: 'nav.solutions.simRacingFlex',
    namespace: 'nav',
  },
  {
    defaultText: 'Sim Racing Pro Solution',
    description: 'Solutions dropdown item.',
    key: 'nav.solutions.simRacingPro',
    namespace: 'nav',
  },
  {
    defaultText: 'All Products',
    description: 'Products dropdown item.',
    key: 'nav.products.all',
    namespace: 'nav',
  },
  {
    defaultText: 'PC',
    description: 'Products dropdown item.',
    key: 'nav.products.pc',
    namespace: 'nav',
  },
  {
    defaultText: 'Monitors',
    description: 'Products dropdown item.',
    key: 'nav.products.monitors',
    namespace: 'nav',
  },
  {
    defaultText: 'Mice',
    description: 'Products dropdown item.',
    key: 'nav.products.mice',
    namespace: 'nav',
  },
  {
    defaultText: 'Keyboards',
    description: 'Products dropdown item.',
    key: 'nav.products.keyboards',
    namespace: 'nav',
  },
  {
    defaultText: 'Headsets',
    description: 'Products dropdown item.',
    key: 'nav.products.headsets',
    namespace: 'nav',
  },
  {
    defaultText: 'Controllers',
    description: 'Products dropdown item.',
    key: 'nav.products.controllers',
    namespace: 'nav',
  },
  {
    defaultText: 'Mousepads',
    description: 'Products dropdown item.',
    key: 'nav.products.mousepads',
    namespace: 'nav',
  },
  {
    defaultText: 'Chairs',
    description: 'Products dropdown item.',
    key: 'nav.products.chairs',
    namespace: 'nav',
  },
  {
    defaultText: 'Desks',
    description: 'Products dropdown item.',
    key: 'nav.products.desks',
    namespace: 'nav',
  },
  {
    defaultText: 'Webcams',
    description: 'Products dropdown item.',
    key: 'nav.products.webcams',
    namespace: 'nav',
  },
  {
    defaultText: 'Microphones',
    description: 'Products dropdown item.',
    key: 'nav.products.microphones',
    namespace: 'nav',
  },
  {
    defaultText: 'Racing cockpits',
    description: 'Products dropdown item.',
    key: 'nav.products.racingCockpits',
    namespace: 'nav',
  },
  {
    defaultText: 'Racing accessories',
    description: 'Products dropdown item.',
    key: 'nav.products.racingAccessories',
    namespace: 'nav',
  },
  {
    defaultText: 'Article sidebar',
    description: 'Accessible label for the article sidebar.',
    key: 'article.sidebarAria',
    namespace: 'article',
  },
  {
    defaultText: 'Contact LORGAR',
    description: 'Accessible label for the article CTA block.',
    key: 'cta.aria',
    namespace: 'cta',
  },
  {
    defaultText: 'Footer',
    description: 'Accessible label for footer navigation.',
    key: 'footer.aria',
    namespace: 'footer',
  },
  {
    defaultText: 'Solutions',
    description: 'Top navigation item that opens the solutions menu.',
    key: 'nav.solutions',
    namespace: 'nav',
  },
  {
    defaultText: 'Products',
    description: 'Top navigation item that opens the products menu.',
    key: 'nav.products',
    namespace: 'nav',
  },
  {
    defaultText: 'For Users',
    description: 'Top navigation link for user-focused pages.',
    key: 'nav.forUsers',
    namespace: 'nav',
  },
  {
    defaultText: 'LORGAR Platform',
    description: 'Top navigation link for platform page.',
    key: 'nav.platform',
    namespace: 'nav',
  },
  {
    defaultText: 'Where To Buy',
    description: 'Top navigation link for store locator page.',
    key: 'nav.whereToBuy',
    namespace: 'nav',
  },
  {
    defaultText: 'About LORGAR',
    description: 'Footer navigation link for about page.',
    key: 'nav.about',
    namespace: 'nav',
  },
  {
    defaultText: 'BLOG',
    description: 'Blog badge text in the header logo group.',
    key: 'nav.blog',
    namespace: 'nav',
  },
  {
    defaultText: 'Open article search',
    description: 'Accessible label for the search button.',
    key: 'nav.searchLabel',
    namespace: 'nav',
  },
  {
    defaultText: 'Search articles',
    description: 'Accessible label for article search form.',
    key: 'nav.searchInputLabel',
    namespace: 'nav',
  },
  {
    defaultText: 'Search',
    description: 'Placeholder text for article search input.',
    key: 'nav.searchPlaceholder',
    namespace: 'nav',
  },
  {
    defaultText: 'Search',
    description: 'Submit button text for article search form.',
    key: 'nav.searchSubmit',
    namespace: 'nav',
  },
  {
    defaultText: 'Open menu',
    description: 'Accessible label for the mobile menu button.',
    key: 'nav.openMenu',
    namespace: 'nav',
  },
  {
    defaultText: 'Primary',
    description: 'Accessible label for the primary navigation.',
    key: 'nav.primaryLabel',
    namespace: 'nav',
  },
  {
    defaultText: 'articles',
    description: 'Browser title suffix used for localized article list pages.',
    key: 'nav.languageTitleSuffix',
    namespace: 'nav',
  },
  {
    defaultText: 'LORGAR blog',
    description: 'Accessible label for the blog cover image.',
    key: 'blog.coverAria',
    namespace: 'blog',
  },
  {
    defaultText: 'Blog',
    description: 'Blog cover eyebrow text.',
    key: 'blog.coverEyebrow',
    namespace: 'blog',
  },
  {
    defaultText: 'BLOG',
    description: 'Main blog cover title.',
    key: 'blog.coverTitle',
    namespace: 'blog',
  },
  {
    defaultText: 'Topics',
    description: 'Article topic filter heading.',
    key: 'blog.topicsTitle',
    namespace: 'blog',
  },
  {
    defaultText: 'Clear all filters',
    description: 'Link that clears selected topic filters.',
    key: 'blog.clearFilters',
    namespace: 'blog',
  },
  {
    defaultText: 'Latest news',
    description: 'Heading for articles sorted by publication date.',
    key: 'blog.latestNews',
    namespace: 'blog',
  },
  {
    defaultText: 'Popular news',
    description: 'Heading for articles sorted by view count.',
    key: 'blog.popularNews',
    namespace: 'blog',
  },
  {
    defaultText: 'Read more',
    description: 'Article card link label.',
    key: 'blog.readMore',
    namespace: 'blog',
  },
  {
    defaultText: 'More articles',
    description: 'Pagination title for additional article pages.',
    key: 'blog.moreArticles',
    namespace: 'blog',
  },
  {
    defaultText: 'No published articles match this search and language filter.',
    description: 'Empty state shown when no articles match selected filters.',
    key: 'blog.noResults',
    namespace: 'blog',
  },
  {
    defaultText: 'views',
    description: 'Suffix after article view count.',
    key: 'blog.viewsSuffix',
    namespace: 'blog',
  },
  {
    defaultText: 'Articles',
    description: 'Accessible label for the article list.',
    key: 'blog.articlesAria',
    namespace: 'blog',
  },
  {
    defaultText: 'Article pages',
    description: 'Accessible label for article pagination.',
    key: 'blog.pagesAria',
    namespace: 'blog',
  },
  {
    defaultText: 'Previous page',
    description: 'Accessible label for previous page control.',
    key: 'blog.previousPage',
    namespace: 'blog',
  },
  {
    defaultText: 'Next page',
    description: 'Accessible label for next page control.',
    key: 'blog.nextPage',
    namespace: 'blog',
  },
  {
    defaultText: 'All',
    description: 'Topic chip label.',
    key: 'tag.all',
    namespace: 'tag',
  },
  {
    defaultText: 'Article',
    description: 'Topic chip label.',
    key: 'tag.article',
    namespace: 'tag',
  },
  {
    defaultText: 'Blog Post',
    description: 'Topic chip label.',
    key: 'tag.blogPost',
    namespace: 'tag',
  },
  {
    defaultText: 'Product Content',
    description: 'Topic chip label.',
    key: 'tag.productContent',
    namespace: 'tag',
  },
  {
    defaultText: 'Featured',
    description: 'Topic chip label.',
    key: 'tag.featured',
    namespace: 'tag',
  },
  {
    defaultText: 'News',
    description: 'Topic chip label.',
    key: 'tag.news',
    namespace: 'tag',
  },
  {
    defaultText: 'Release Note',
    description: 'Topic chip label.',
    key: 'tag.releaseNote',
    namespace: 'tag',
  },
  {
    defaultText: 'Esports',
    description: 'Topic chip label.',
    key: 'tag.esports',
    namespace: 'tag',
  },
  {
    defaultText: 'Events',
    description: 'Topic chip label.',
    key: 'tag.events',
    namespace: 'tag',
  },
  {
    defaultText: 'Products',
    description: 'Topic chip label.',
    key: 'tag.products',
    namespace: 'tag',
  },
  {
    defaultText: 'Rainbow Six Siege',
    description: 'Topic chip label.',
    key: 'tag.rainbowSixSiege',
    namespace: 'tag',
  },
  {
    defaultText: 'Rankings',
    description: 'Topic chip label.',
    key: 'tag.rankings',
    namespace: 'tag',
  },
  {
    defaultText: 'Passion',
    description: 'Topic chip label.',
    key: 'tag.passion',
    namespace: 'tag',
  },
  {
    defaultText: 'Stake Ranked',
    description: 'Topic chip label.',
    key: 'tag.stakeRanked',
    namespace: 'tag',
  },
  {
    defaultText: 'Platform',
    description: 'Topic chip label.',
    key: 'tag.platform',
    namespace: 'tag',
  },
  {
    defaultText: 'Performance Lab',
    description: 'Topic chip label.',
    key: 'tag.performanceLab',
    namespace: 'tag',
  },
  {
    defaultText: 'Partners',
    description: 'Topic chip label.',
    key: 'tag.partners',
    namespace: 'tag',
  },
  {
    defaultText: 'Partnerships',
    description: 'Topic chip label.',
    key: 'tag.partnerships',
    namespace: 'tag',
  },
  {
    defaultText: 'Innovation',
    description: 'Topic chip label.',
    key: 'tag.innovation',
    namespace: 'tag',
  },
  {
    defaultText: 'Corporate',
    description: 'Topic chip label.',
    key: 'tag.corporate',
    namespace: 'tag',
  },
  {
    defaultText: 'Ecosystem',
    description: 'Topic chip label.',
    key: 'tag.ecosystem',
    namespace: 'tag',
  },
  {
    defaultText: 'Cyprus',
    description: 'Topic chip label.',
    key: 'tag.cyprus',
    namespace: 'tag',
  },
  {
    defaultText: 'Gaming devices',
    description: 'Topic chip label.',
    key: 'tag.gamingDevices',
    namespace: 'tag',
  },
  {
    defaultText: 'Gaming tournament',
    description: 'Topic chip label.',
    key: 'tag.gamingTournament',
    namespace: 'tag',
  },
  {
    defaultText: 'Gaming Chairs',
    description: 'Topic chip label.',
    key: 'tag.gamingChairs',
    namespace: 'tag',
  },
  {
    defaultText: 'Chairs',
    description: 'Topic chip label.',
    key: 'tag.chairs',
    namespace: 'tag',
  },
  {
    defaultText: 'Astral Esports',
    description: 'Topic chip label.',
    key: 'tag.astralEsports',
    namespace: 'tag',
  },
  {
    defaultText: 'Tags:',
    description: 'Article tag list label.',
    key: 'article.tagsLabel',
    namespace: 'article',
  },
  {
    defaultText: 'Share:',
    description: 'Article sharing controls label.',
    key: 'article.shareLabel',
    namespace: 'article',
  },
  {
    defaultText: 'Share article',
    description: 'Accessible label for article sharing controls.',
    key: 'article.shareAriaLabel',
    namespace: 'article',
  },
  {
    defaultText: 'Reactions:',
    description: 'Article reaction controls label.',
    key: 'article.reactionsLabel',
    namespace: 'article',
  },
  {
    defaultText: 'Article reactions',
    description: 'Accessible label for article reactions area.',
    key: 'article.reactionsAriaLabel',
    namespace: 'article',
  },
  {
    defaultText: 'Like article',
    description: 'Accessible label for like reaction button.',
    key: 'article.likeAriaLabel',
    namespace: 'article',
  },
  {
    defaultText: 'Recent news',
    description: 'Article sidebar section with latest posts.',
    key: 'article.recentNews',
    namespace: 'article',
  },
  {
    defaultText: 'Popular news',
    description: 'Article sidebar section with most viewed posts.',
    key: 'article.popularNews',
    namespace: 'article',
  },
  {
    defaultText: 'Subscribe to blog',
    description: 'Accessible label for the blog subscription block.',
    key: 'subscribe.aria',
    namespace: 'subscribe',
  },
  {
    defaultText: 'Subscribe to our blog',
    description: 'Newsletter box title.',
    key: 'subscribe.title',
    namespace: 'subscribe',
  },
  {
    defaultText: 'Get the latest news and insights delivered straight to your inbox.',
    description: 'Newsletter box description.',
    key: 'subscribe.description',
    namespace: 'subscribe',
  },
  {
    defaultText: 'Enter your email',
    description: 'Newsletter email input placeholder.',
    key: 'subscribe.placeholder',
    namespace: 'subscribe',
  },
  {
    defaultText: 'Subscribe',
    description: 'Newsletter submit button.',
    key: 'subscribe.submit',
    namespace: 'subscribe',
  },
  {
    defaultText: 'Saving...',
    description: 'Newsletter submit pending state.',
    key: 'subscribe.saving',
    namespace: 'subscribe',
  },
  {
    defaultText: 'Email address',
    description: 'Accessible label for newsletter email input.',
    key: 'subscribe.emailAriaLabel',
    namespace: 'subscribe',
  },
  {
    defaultText: 'Interested in working with ASBIS?',
    description: 'Call-to-action strip title.',
    key: 'cta.title',
    namespace: 'cta',
  },
  {
    defaultText: 'BECOME PARTNER',
    description: 'Primary call-to-action button.',
    key: 'cta.becomePartner',
    namespace: 'cta',
  },
  {
    defaultText: 'CONTACT US',
    description: 'Secondary call-to-action button.',
    key: 'cta.contactUs',
    namespace: 'cta',
  },
  {
    defaultText: 'FOR USERS',
    description: 'Footer link label.',
    key: 'footer.forUsers',
    namespace: 'footer',
  },
  {
    defaultText: 'FOR PARTNERS',
    description: 'Footer link label.',
    key: 'footer.forPartners',
    namespace: 'footer',
  },
  {
    defaultText: 'LORGAR PLATFORM',
    description: 'Footer link label.',
    key: 'footer.platform',
    namespace: 'footer',
  },
  {
    defaultText: 'WHERE TO BUY',
    description: 'Footer link label.',
    key: 'footer.whereToBuy',
    namespace: 'footer',
  },
  {
    defaultText: 'ABOUT LORGAR',
    description: 'Footer link label.',
    key: 'footer.about',
    namespace: 'footer',
  },
  {
    defaultText: '© LORGAR 2026, ALL RIGHTS RESERVED',
    description: 'Footer copyright line.',
    key: 'footer.copyright',
    namespace: 'footer',
  },
  {
    defaultText: 'WARRANTY POLICY AND WARRANTY CARDS',
    description: 'Footer policy link.',
    key: 'footer.warranty',
    namespace: 'footer',
  },
  {
    defaultText: 'PRIVACY POLICY',
    description: 'Footer policy link.',
    key: 'footer.privacy',
    namespace: 'footer',
  },
  {
    defaultText: 'COOKIES POLICY',
    description: 'Footer policy link.',
    key: 'footer.cookies',
    namespace: 'footer',
  },
] as const

export type FrontendUIKey = (typeof frontendUIStringDefinitions)[number]['key']

export type FrontendUITranslationStatus = 'draft' | 'published' | 'review'

export type FrontendUIStrings = Record<FrontendUIKey, string>

export type FrontendUILocalizationItem = {
  defaultText: string
  description?: string
  isPublished: boolean
  key: FrontendUIKey
  namespace: string
  publishedText: string
  status: FrontendUITranslationStatus
  text: string
  translatedText: string
  updatedAt?: string
}

export type FrontendUILanguageOption = {
  displayCode: string
  label: string
  language: string
  value: string
}

export const frontendUITranslationLanguageOptions: FrontendUILanguageOption[] =
  articleLanguageDefinitions.map((language) => ({
    displayCode: language.displayCode,
    label: language.label,
    language: language.language,
    value: language.value,
  }))

export const normalizeFrontendUILanguageCode = (value?: null | string): string => {
  const normalized = String(value || 'en')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-')

  if (/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(normalized)) {
    return normalized
  }

  return 'en'
}

export const defaultFrontendUIStrings = Object.fromEntries(
  frontendUIStringDefinitions.map((definition) => [definition.key, definition.defaultText]),
) as FrontendUIStrings

export const frontendUILabel = (
  strings: FrontendUIStrings | null | undefined,
  key: FrontendUIKey,
): string => strings?.[key] || defaultFrontendUIStrings[key]

const stableFrontendUIFallbacks: Partial<Record<string, Partial<FrontendUIStrings>>> = {
  bg: {
    'nav.logoAria': '?????? ????? ?? LORGAR',
    'nav.blogAria': '?????? ????? ?? LORGAR',
    'nav.solutions': '???????',
    'nav.products': '????????',
    'nav.forUsers': '?? ???????????',
    'nav.platform': '????????? LORGAR',
    'nav.whereToBuy': '???? ?? ??????',
    'nav.about': '?? LORGAR',
    'nav.blog': '????',
    'nav.searchLabel': '???????',
    'nav.searchInputLabel': '??????? ?? ??????',
    'nav.searchPlaceholder': '???????',
    'nav.searchSubmit': '???????',
    'nav.openMenu': '?????? ??????',
    'nav.primaryLabel': '??????? ?????????',
    'nav.languageTitleSuffix': '??????',
    'nav.solutions.streaming': '??????? ?? ?????????',
    'nav.solutions.pcGaming': '??????? ?? PC ???????',
    'nav.solutions.simRacingFlex': 'Sim Racing Flex ???????',
    'nav.solutions.simRacingPro': 'Sim Racing Pro ???????',
    'nav.products.all': '?????? ????????',
    'nav.products.pc': 'PC',
    'nav.products.monitors': '????????',
    'nav.products.mice': '?????',
    'nav.products.keyboards': '??????????',
    'nav.products.headsets': '????????',
    'nav.products.controllers': '??????????',
    'nav.products.mousepads': '???????? ?? ?????',
    'nav.products.chairs': '???????',
    'nav.products.desks': '????',
    'nav.products.webcams': '??? ??????',
    'nav.products.microphones': '?????????',
    'nav.products.racingCockpits': '???????????? ???????',
    'nav.products.racingAccessories': '???????????? ?????????',
    'blog.coverAria': '???? ?? LORGAR',
    'blog.coverEyebrow': '????',
    'blog.coverTitle': '????',
    'blog.topicsTitle': '????',
    'blog.clearFilters': '??????? ?????? ??????',
    'blog.latestNews': '???????? ??????',
    'blog.popularNews': '????????? ??????',
    'blog.readMore': '??????? ???',
    'blog.moreArticles': '??? ??????',
    'blog.noResults': '???? ???????? ??????.',
    'blog.viewsSuffix': '????????????',
    'blog.articlesAria': '?????? ??? ??????',
    'blog.pagesAria': '???????? ??? ??????',
    'blog.previousPage': '???????? ????????',
    'blog.nextPage': '???????? ????????',
    'tag.all': '??????',
    'tag.article': '??????',
    'tag.blogPost': '???? ????',
    'tag.productContent': '?????????? ??????????',
    'tag.featured': '???????????',
    'tag.news': '??????',
    'tag.releaseNote': '??????? ??? ????????',
    'tag.esports': '??????',
    'tag.events': '???????',
    'tag.products': '????????',
    'tag.rainbowSixSiege': 'Rainbow Six Siege',
    'tag.rankings': '????????',
    'tag.passion': '??????',
    'tag.stakeRanked': 'Stake Ranked',
    'tag.platform': '?????????',
    'tag.performanceLab': 'Performance Lab',
    'tag.partners': '?????????',
    'tag.partnerships': '????????????',
    'tag.innovation': '????????',
    'tag.corporate': '????????????',
    'tag.ecosystem': '??????????',
    'tag.cyprus': '?????',
    'tag.gamingDevices': '??????? ??????????',
    'tag.gamingTournament': '??????? ??????',
    'tag.gamingChairs': '??????? ???????',
    'tag.chairs': '???????',
    'tag.astralEsports': 'Astral Esports',
    'article.tagsLabel': '??????:',
    'article.shareLabel': '???????:',
    'article.shareAriaLabel': '??????? ????????',
    'article.reactionsLabel': '???????:',
    'article.reactionsAriaLabel': '??????? ??? ????????',
    'article.likeAriaLabel': '??????? ????????',
    'article.recentNews': '???????? ??????',
    'article.popularNews': '????????? ??????',
    'subscribe.aria': '????????? ?? ?????',
    'subscribe.title': '?????????? ?? ?? ????? ????',
    'subscribe.description': '??????????? ???-?????? ?????? ? ????????? ???????? ??? ????????? ?? ????.',
    'subscribe.placeholder': '???????? ????? ?????',
    'subscribe.submit': '???????? ??',
    'subscribe.saving': '?????????...',
    'subscribe.emailAriaLabel': '????? ?????',
    'cta.title': '???????????? ?? ?? ?????? ? LORGAR?',
    'cta.becomePartner': '??????? ????????',
    'cta.contactUs': '???????? ?? ? ???',
    'footer.forUsers': '?? ???????????',
    'footer.forPartners': '?? ?????????',
    'footer.platform': '????????? LORGAR',
    'footer.whereToBuy': '???? ?? ??????',
    'footer.about': '?? LORGAR',
    'footer.copyright': '? LORGAR 2026. ?????? ????? ????????',
    'footer.warranty': '??????????? ???????? ? ??????????? ?????',
    'footer.privacy': '???????? ?? ?????????????',
    'footer.cookies': '???????? ?? ?????????',
  },
  cs: {
    'nav.logoAria': 'Otev??t web LORGAR',
    'nav.blogAria': 'Otev??t blog LORGAR',
    'nav.solutions': '?E?EN?',
    'nav.products': 'PRODUKTY',
    'nav.forUsers': 'PRO U?IVATELE',
    'nav.platform': 'PLATFORMA LORGAR',
    'nav.whereToBuy': 'KDE KOUPIT',
    'nav.about': 'O LORGAR',
    'nav.blog': 'BLOG',
    'nav.searchLabel': 'Vyhled?v?n?',
    'nav.searchInputLabel': 'Vyhledat ?l?nky',
    'nav.searchPlaceholder': 'Vyhled?v?n?',
    'nav.searchSubmit': 'Hledat',
    'nav.openMenu': 'Otev??t menu',
    'nav.primaryLabel': 'Hlavn? navigace',
    'nav.languageTitleSuffix': '?l?nky',
    'nav.solutions.streaming': 'Streamingov? ?e?en?',
    'nav.solutions.pcGaming': '?e?en? pro PC gaming',
    'nav.solutions.simRacingFlex': '?e?en? Sim Racing Flex',
    'nav.solutions.simRacingPro': '?e?en? Sim Racing Pro',
    'nav.products.all': 'V?echny produkty',
    'nav.products.pc': 'PC',
    'nav.products.monitors': 'Monitory',
    'nav.products.mice': 'My?i',
    'nav.products.keyboards': 'Kl?vesnice',
    'nav.products.headsets': 'Headsety',
    'nav.products.controllers': 'Ovlada?e',
    'nav.products.mousepads': 'Podlo?ky pod my?',
    'nav.products.chairs': '?idle',
    'nav.products.desks': 'Stoly',
    'nav.products.webcams': 'Webkamery',
    'nav.products.microphones': 'Mikrofony',
    'nav.products.racingCockpits': 'Z?vodn? kokpity',
    'nav.products.racingAccessories': 'Z?vodn? p??slu?enstv?',
    'blog.coverAria': 'Blog LORGAR',
    'blog.coverEyebrow': 'Blog',
    'blog.coverTitle': 'BLOG',
    'blog.topicsTitle': 'T?mata',
    'blog.clearFilters': 'Vymazat v?echny filtry',
    'blog.latestNews': 'Nejnov?j?? zpr?vy',
    'blog.popularNews': 'Obl?ben? zpr?vy',
    'blog.readMore': '??st d?l',
    'blog.moreArticles': 'Dal?? ?l?nky',
    'blog.noResults': 'Nebyly nalezeny ??dn? ?l?nky.',
    'blog.viewsSuffix': 'zobrazen?',
    'blog.articlesAria': 'Seznam ?l?nk?',
    'blog.pagesAria': 'Str?nky ?l?nk?',
    'blog.previousPage': 'P?edchoz? str?nka',
    'blog.nextPage': 'Dal?? str?nka',
    'tag.all': 'V?e',
    'tag.article': '?l?nek',
    'tag.blogPost': 'Blogov? p??sp?vek',
    'tag.productContent': 'Produktov? obsah',
    'tag.featured': 'Doporu?en?',
    'tag.news': 'Novinky',
    'tag.releaseNote': 'Pozn?mka k vyd?n?',
    'tag.esports': 'Esporty',
    'tag.events': 'Ud?losti',
    'tag.products': 'Produkty',
    'tag.rainbowSixSiege': 'Rainbow Six Siege',
    'tag.rankings': '?eb???ky',
    'tag.passion': 'V??e?',
    'tag.stakeRanked': 'Stake Ranked',
    'tag.platform': 'Platforma',
    'tag.performanceLab': 'Performance Lab',
    'tag.partners': 'Partne?i',
    'tag.partnerships': 'Partnerstv?',
    'tag.innovation': 'Inovace',
    'tag.corporate': 'Firemn?',
    'tag.ecosystem': 'Ekosyst?m',
    'tag.cyprus': 'Kypr',
    'tag.gamingDevices': 'Hern? za??zen?',
    'tag.gamingTournament': 'Hern? turnaj',
    'tag.gamingChairs': 'Hern? ?idle',
    'tag.chairs': '?idle',
    'tag.astralEsports': 'Astral Esports',
    'article.tagsLabel': 'Tagy:',
    'article.shareLabel': 'Sd?let:',
    'article.shareAriaLabel': 'Sd?let ?l?nek',
    'article.reactionsLabel': 'Reakce:',
    'article.reactionsAriaLabel': 'Reakce na ?l?nek',
    'article.likeAriaLabel': 'To se mi l?b?',
    'article.recentNews': 'Nejnov?j?? zpr?vy',
    'article.popularNews': 'Obl?ben? zpr?vy',
    'subscribe.aria': 'P?ihl??en? k blogu',
    'subscribe.title': 'P?ihlaste se k odb?ru blogu',
    'subscribe.description': 'Dost?vejte nejnov?j?? zpr?vy a post?ehy p??mo do sv? schr?nky.',
    'subscribe.placeholder': 'Zadejte e-mail',
    'subscribe.submit': 'P?IHL?SIT',
    'subscribe.saving': 'Ukl?d?n?...',
    'subscribe.emailAriaLabel': 'E-mailov? adresa',
    'cta.title': 'M?te z?jem spolupracovat s LORGAR?',
    'cta.becomePartner': 'STA?TE SE PARTNEREM',
    'cta.contactUs': 'KONTAKTUJTE N?S',
    'footer.forUsers': 'PRO U?IVATELE',
    'footer.forPartners': 'PRO PARTNERY',
    'footer.platform': 'PLATFORMA LORGAR',
    'footer.whereToBuy': 'KDE KOUPIT',
    'footer.about': 'O LORGAR',
    'footer.copyright': '? LORGAR 2026. V?ECHNA PR?VA VYHRAZENA',
    'footer.warranty': 'Z?RU?N? PODM?NKY A Z?RU?N? LISTY',
    'footer.privacy': 'Z?SADY OCHRANY OSOBN?CH ?DAJ?',
    'footer.cookies': 'Z?SADY COOKIES',
  },
  uk: {
    'nav.logoAria': '???????? ???? LORGAR',
    'nav.blogAria': '???????? ???? LORGAR',
    'nav.solutions': '???????',
    'nav.products': '????????',
    'nav.forUsers': '??? ????????????',
    'nav.platform': '????????? LORGAR',
    'nav.whereToBuy': '?? ??????',
    'nav.about': '??? LORGAR',
    'nav.blog': '????',
    'nav.searchLabel': '?????',
    'nav.searchInputLabel': '????? ??????',
    'nav.searchPlaceholder': '?????',
    'nav.searchSubmit': '?????',
    'nav.openMenu': '???????? ????',
    'nav.primaryLabel': '??????? ?????????',
    'nav.languageTitleSuffix': '??????',
    'nav.solutions.streaming': '??????? ??? ?????????',
    'nav.solutions.pcGaming': '??????? ??? PC-????????',
    'nav.solutions.simRacingFlex': '??????? Sim Racing Flex',
    'nav.solutions.simRacingPro': '??????? Sim Racing Pro',
    'nav.products.all': '??? ????????',
    'nav.products.pc': 'PC',
    'nav.products.monitors': '????????',
    'nav.products.mice': '????',
    'nav.products.keyboards': '??????????',
    'nav.products.headsets': '?????????',
    'nav.products.controllers': '??????????',
    'nav.products.mousepads': '??????? ??? ????',
    'nav.products.chairs': '??????',
    'nav.products.desks': '?????',
    'nav.products.webcams': '?????????',
    'nav.products.microphones': '?????????',
    'nav.products.racingCockpits': '??????? ???????',
    'nav.products.racingAccessories': '??????? ?????????',
    'blog.coverAria': '???? LORGAR',
    'blog.coverEyebrow': '????',
    'blog.coverTitle': '????',
    'blog.topicsTitle': '????',
    'blog.clearFilters': '???????? ??? ???????',
    'blog.latestNews': '??????? ??????',
    'blog.popularNews': '????????? ??????',
    'blog.readMore': '?????? ????',
    'blog.moreArticles': '?????? ??????',
    'blog.noResults': '?????? ?? ????????.',
    'blog.viewsSuffix': '??????????',
    'blog.articlesAria': '?????? ??????',
    'blog.pagesAria': '???????? ??????',
    'blog.previousPage': '????????? ????????',
    'blog.nextPage': '???????? ????????',
    'tag.all': '???',
    'tag.article': '??????',
    'tag.blogPost': '????-????',
    'tag.productContent': '??????????? ???????',
    'tag.featured': '?????????????',
    'tag.news': '??????',
    'tag.releaseNote': '??????? ?? ??????',
    'tag.esports': '??????????',
    'tag.events': '?????',
    'tag.products': '????????',
    'tag.rainbowSixSiege': 'Rainbow Six Siege',
    'tag.rankings': '????????',
    'tag.passion': '??????????',
    'tag.stakeRanked': 'Stake Ranked',
    'tag.platform': '?????????',
    'tag.performanceLab': 'Performance Lab',
    'tag.partners': '????????',
    'tag.partnerships': '???????????',
    'tag.innovation': '?????????',
    'tag.corporate': '????????????',
    'tag.ecosystem': '??????????',
    'tag.cyprus': '????',
    'tag.gamingDevices': '?????????? ????????',
    'tag.gamingTournament': '??????????? ??????',
    'tag.gamingChairs': '?????????? ??????',
    'tag.chairs': '??????',
    'tag.astralEsports': 'Astral Esports',
    'article.tagsLabel': '????:',
    'article.shareLabel': '??????????:',
    'article.shareAriaLabel': '?????????? ???????',
    'article.reactionsLabel': '???????:',
    'article.reactionsAriaLabel': '??????? ?? ??????',
    'article.likeAriaLabel': '????????? ??????',
    'article.recentNews': '??????? ??????',
    'article.popularNews': '????????? ??????',
    'subscribe.aria': '???????? ?? ????',
    'subscribe.title': '??????????? ?? ??? ????',
    'subscribe.description': '????????? ?????????? ?????? ?? ??????? ????? ?? ?????.',
    'subscribe.placeholder': '??????? ??? email',
    'subscribe.submit': '???????????',
    'subscribe.saving': '??????????...',
    'subscribe.emailAriaLabel': 'Email-??????',
    'cta.title': '??????????? ? ????????? ? LORGAR?',
    'cta.becomePartner': '????? ?????????',
    'cta.contactUs': '?????????? ? ????',
    'footer.forUsers': '??? ????????????',
    'footer.forPartners': '??? ?????????',
    'footer.platform': '????????? LORGAR',
    'footer.whereToBuy': '?? ??????',
    'footer.about': '??? LORGAR',
    'footer.copyright': '? LORGAR 2026. ??? ????? ????????',
    'footer.warranty': '?????????? ???????? ?? ?????????? ?????',
    'footer.privacy': '???????? ????????????????',
    'footer.cookies': '???????? COOKIES',
  },
}

const brokenFrontendUITranslationPattern = /(?:\?{2,}|undefined|null|\uFFFD|[\u00c2\u00c3\u00d0\u00d1\u00e2])/i

const isBrokenFrontendUITranslation = (value?: null | string): boolean => {
  const normalized = String(value || '').trim()
  return !normalized || brokenFrontendUITranslationPattern.test(normalized)
}

const buildFrontendUIBaseDictionary = (languageCode: null | string | undefined): FrontendUIStrings => {
  const dictionary: FrontendUIStrings = { ...defaultFrontendUIStrings }
  const fallbacks = stableFrontendUIFallbacks[normalizeFrontendUILanguageCode(languageCode)] || {}

  for (const [key, value] of Object.entries(fallbacks)) {
    const normalized = String(value || '').trim()

    if (isFrontendUIKey(key) && !isBrokenFrontendUITranslation(normalized)) {
      dictionary[key] = normalized
    }
  }

  return dictionary
}


export const ensureFrontendUITranslationsSchema = async (): Promise<void> => {
  await withFrontendUIClient(async (client, schema) => {
    await ensureArticleLanguageEnumValues(client, schema)

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schema}."frontend_ui_languages" (
        language_code text PRIMARY KEY,
        display_code text NOT NULL,
        label text NOT NULL,
        language text NOT NULL,
        status text DEFAULT 'active' NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schema}."frontend_ui_phrases" (
        key text PRIMARY KEY,
        namespace text NOT NULL,
        default_text text NOT NULL,
        description text,
        updated_at timestamptz DEFAULT now() NOT NULL
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schema}."frontend_ui_phrase_translations" (
        key text NOT NULL REFERENCES ${schema}."frontend_ui_phrases"(key) ON DELETE CASCADE,
        language_code text NOT NULL,
        translated_text text NOT NULL,
        status text DEFAULT 'draft' NOT NULL,
        generated_by text,
        updated_at timestamptz DEFAULT now() NOT NULL,
        published_at timestamptz,
        PRIMARY KEY (key, language_code)
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schema}."frontend_ui_translation_batches" (
        id bigserial PRIMARY KEY,
        language_code text NOT NULL,
        status text DEFAULT 'running' NOT NULL,
        model text,
        total_keys integer DEFAULT 0 NOT NULL,
        error text,
        created_at timestamptz DEFAULT now() NOT NULL,
        completed_at timestamptz
      );
    `)
  })
}

export const syncFrontendUILanguages = async (): Promise<void> => {
  await ensureFrontendUITranslationsSchema()

  await withFrontendUIClient(async (client, schema) => {
    for (const language of frontendUITranslationLanguageOptions) {
      await client.query(
        `
          INSERT INTO ${schema}."frontend_ui_languages"
            (language_code, display_code, label, language, status, updated_at)
          VALUES ($1, $2, $3, $4, 'active', now())
          ON CONFLICT (language_code) DO UPDATE SET
            display_code = COALESCE(NULLIF(${schema}."frontend_ui_languages".display_code, ''), EXCLUDED.display_code),
            label = COALESCE(NULLIF(${schema}."frontend_ui_languages".label, ''), EXCLUDED.label),
            language = COALESCE(NULLIF(${schema}."frontend_ui_languages".language, ''), EXCLUDED.language),
            updated_at = now();
        `,
        [language.value, language.displayCode, language.label, language.language],
      )
    }
  })
}

export const listFrontendUILanguageOptions = async (): Promise<FrontendUILanguageOption[]> => {
  await syncFrontendUILanguages()

  const rows = await withFrontendUIClient(async (client, schema) => {
    const result = await client.query<FrontendUILanguageRow>(
      `
        SELECT language_code, display_code, label, language
        FROM ${schema}."frontend_ui_languages"
        WHERE status = 'active'
        ORDER BY CASE WHEN language_code = 'en' THEN 0 ELSE 1 END, display_code, language;
      `,
    )

    return result.rows
  })

  if (!rows?.length) {
    return frontendUITranslationLanguageOptions
  }

  return rows.map((row) => ({
    displayCode: row.display_code,
    label: row.label,
    language: row.language,
    value: row.language_code,
  }))
}

export const upsertFrontendUILanguage = async (args: {
  displayCode?: null | string
  label?: null | string
  language?: null | string
  value?: null | string
}): Promise<FrontendUILanguageOption> => {
  const rawLanguageCode = String(args.value || '').trim().toLowerCase().replaceAll('_', '-')
  const languageCode = normalizeFrontendUILanguageCode(rawLanguageCode)

  if (!rawLanguageCode || rawLanguageCode !== languageCode) {
    throw new Error('Enter a valid language code, for example de or pt-br.')
  }

  const displayCode = (args.displayCode || languageCode).trim().toUpperCase()
  const language = (args.language || displayCode).trim()
  const label = (args.label || `${displayCode} ${language}`).trim()

  await ensureFrontendUITranslationsSchema()
  await withFrontendUIClient(async (client, schema) => {
    await client.query(
      `
        INSERT INTO ${schema}."frontend_ui_languages"
          (language_code, display_code, label, language, status, updated_at)
        VALUES ($1, $2, $3, $4, 'active', now())
        ON CONFLICT (language_code) DO UPDATE SET
          display_code = EXCLUDED.display_code,
          label = EXCLUDED.label,
          language = EXCLUDED.language,
          status = 'active',
          updated_at = now();
      `,
      [languageCode, displayCode, label, language],
    )
  })

  return { displayCode, label, language, value: languageCode }
}

export const syncFrontendUITranslationKeys = async (): Promise<void> => {
  await ensureFrontendUITranslationsSchema()
  await syncFrontendUILanguages()

  await withFrontendUIClient(async (client, schema) => {
    for (const definition of frontendUIStringDefinitions) {
      await client.query(
        `
          INSERT INTO ${schema}."frontend_ui_phrases"
            (key, namespace, default_text, description, updated_at)
          VALUES ($1, $2, $3, $4, now())
          ON CONFLICT (key) DO UPDATE SET
            namespace = EXCLUDED.namespace,
            default_text = EXCLUDED.default_text,
            description = EXCLUDED.description,
            updated_at = now();
        `,
        [definition.key, definition.namespace, definition.defaultText, definition.description],
      )
    }
  })
}

const loadFrontendUIDictionaryUncached = async (
  languageCode: null | string | undefined,
  options: { preview?: boolean } = {},
): Promise<FrontendUIStrings> => {
  const normalizedLanguageCode = normalizeFrontendUILanguageCode(languageCode)

  if (normalizedLanguageCode === 'en' && !options.preview) {
    return defaultFrontendUIStrings
  }

  await ensureFrontendUITranslationsSchema()

  const rows = await withFrontendUIClient(async (client, schema) => {
    const statusCondition = options.preview
      ? "status IN ('draft', 'review', 'published')"
      : "status = 'published'"

    const result = await client.query<FrontendUIDictionaryRow>(
      `
        SELECT key, translated_text
        FROM ${schema}."frontend_ui_phrase_translations"
        WHERE language_code = $1 AND ${statusCondition};
      `,
      [normalizedLanguageCode],
    )

    return result.rows
  })

  if (!rows?.length) {
    return buildFrontendUIBaseDictionary(normalizedLanguageCode)
  }

  const translated = buildFrontendUIBaseDictionary(normalizedLanguageCode)

  for (const row of rows) {
    if (isFrontendUIKey(row.key) && !isBrokenFrontendUITranslation(row.translated_text)) {
      translated[row.key] = row.translated_text.trim()
    }
  }

  return translated
}


type FrontendUIDictionaryCacheEntry = {
  expiresAt: number
  value: ReturnType<typeof loadFrontendUIDictionaryUncached>
}

const FRONTEND_UI_DICTIONARY_CACHE_TTL_MS = 10_000
const frontendUIDictionaryCache = new Map<string, FrontendUIDictionaryCacheEntry>()

export const loadFrontendUIDictionary = async (...args: Parameters<typeof loadFrontendUIDictionaryUncached>) => {
  const [languageCode, options] = args
  const normalizedLanguageCode = normalizeFrontendUILanguageCode(languageCode)
  const previewKey = options?.preview ? 'preview' : 'published'
  const cacheKey = `${normalizedLanguageCode}:${previewKey}`
  const now = Date.now()
  const existing = frontendUIDictionaryCache.get(cacheKey)

  if (existing && existing.expiresAt > now) {
    return existing.value
  }

  const value = loadFrontendUIDictionaryUncached(...args).catch((error) => {
    frontendUIDictionaryCache.delete(cacheKey)
    throw error
  })

  frontendUIDictionaryCache.set(cacheKey, {
    expiresAt: now + FRONTEND_UI_DICTIONARY_CACHE_TTL_MS,
    value,
  })

  return value
}

export const listFrontendUILocalization = async (args: {
  languageCode?: null | string
}): Promise<{
  items: FrontendUILocalizationItem[]
  languageCode: string
  languages: FrontendUILanguageOption[]
  previewURL: string
  publishedURL: string
}> => {
  const languageCode = normalizeFrontendUILanguageCode(args.languageCode)
  await syncFrontendUITranslationKeys()

  const rows = await withFrontendUIClient(async (client, schema) => {
    const result = await client.query<FrontendUILocalizationRow>(
      `
        SELECT
          phrases.key,
          phrases.namespace,
          phrases.default_text,
          phrases.description,
          translations.translated_text,
          translations.status,
          translations.updated_at,
          translations.published_at
        FROM ${schema}."frontend_ui_phrases" phrases
        LEFT JOIN ${schema}."frontend_ui_phrase_translations" translations
          ON translations.key = phrases.key AND translations.language_code = $1
        ORDER BY phrases.namespace, phrases.key;
      `,
      [languageCode],
    )

    return result.rows
  })

  const items = frontendUIStringDefinitions.map((definition) => {
    const row = rows?.find((candidate) => candidate.key === definition.key)
    const status = normalizeFrontendUITranslationStatus(row?.status)

    return {
      defaultText: row?.default_text || definition.defaultText,
      description: row?.description || definition.description,
      isPublished: status === 'published',
      key: definition.key,
      namespace: row?.namespace || definition.namespace,
      publishedText: status === 'published' ? row?.translated_text || '' : '',
      status,
      text: row?.translated_text || definition.defaultText,
      translatedText: row?.translated_text || '',
      updatedAt: row?.updated_at?.toISOString(),
    }
  })

  return {
    items,
    languageCode,
    languages: await listFrontendUILanguageOptions(),
    previewURL: `/articles?lang=${languageCode}&previewLocalization=true`,
    publishedURL: `/articles?lang=${languageCode}`,
  }
}

export const upsertFrontendUITranslations = async (args: {
  generatedBy?: string
  languageCode?: null | string
  status?: FrontendUITranslationStatus
  translations: Record<string, string>
}): Promise<void> => {
  const languageCode = normalizeFrontendUILanguageCode(args.languageCode)
  const status = normalizeFrontendUITranslationStatus(args.status)
  await syncFrontendUITranslationKeys()

  await withFrontendUIClient(async (client, schema) => {
    for (const [key, translatedText] of Object.entries(args.translations)) {
      if (!isFrontendUIKey(key) || !translatedText.trim()) {
        continue
      }

      await client.query(
        `
          INSERT INTO ${schema}."frontend_ui_phrase_translations"
            (key, language_code, translated_text, status, generated_by, updated_at, published_at)
          VALUES ($1, $2, $3, $4, $5, now(), CASE WHEN $4 = 'published' THEN now() ELSE NULL END)
          ON CONFLICT (key, language_code) DO UPDATE SET
            translated_text = EXCLUDED.translated_text,
            status = EXCLUDED.status,
            generated_by = EXCLUDED.generated_by,
            updated_at = now(),
            published_at = CASE
              WHEN EXCLUDED.status = 'published' THEN COALESCE(${schema}."frontend_ui_phrase_translations".published_at, now())
              ELSE ${schema}."frontend_ui_phrase_translations".published_at
            END;
        `,
        [key, languageCode, translatedText.trim(), status, args.generatedBy || null],
      )
    }
  })
}

export const updateFrontendUITranslation = async (args: {
  key?: string
  languageCode?: null | string
  status?: FrontendUITranslationStatus
  text?: string
}): Promise<void> => {
  if (!isFrontendUIKey(args.key)) {
    throw new Error('Unknown frontend UI phrase key.')
  }

  const languageCode = normalizeFrontendUILanguageCode(args.languageCode)
  const status = normalizeFrontendUITranslationStatus(args.status)

  await upsertFrontendUITranslations({
    generatedBy: 'editor',
    languageCode,
    status,
    translations: {
      [args.key]: args.text || '',
    },
  })
}

export const publishFrontendUITranslations = async (args: {
  languageCode?: null | string
}): Promise<void> => {
  const languageCode = normalizeFrontendUILanguageCode(args.languageCode)
  await syncFrontendUITranslationKeys()

  await withFrontendUIClient(async (client, schema) => {
    await client.query(
      `
        UPDATE ${schema}."frontend_ui_phrase_translations"
        SET status = 'published', published_at = now(), updated_at = now()
        WHERE language_code = $1 AND translated_text <> '';
      `,
      [languageCode],
    )
  })
}

export const createFrontendUITranslationBatch = async (args: {
  languageCode?: null | string
  totalKeys: number
}): Promise<number | null> => {
  const languageCode = normalizeFrontendUILanguageCode(args.languageCode)

  return (
    (await withFrontendUIClient(async (client, schema) => {
      const result = await client.query<{ id: string }>(
        `
          INSERT INTO ${schema}."frontend_ui_translation_batches"
            (language_code, status, total_keys, created_at)
          VALUES ($1, 'running', $2, now())
          RETURNING id;
        `,
        [languageCode, args.totalKeys],
      )

      return Number(result.rows[0]?.id || 0) || null
    })) || null
  )
}

export const finishFrontendUITranslationBatch = async (args: {
  batchID: null | number
  error?: string
  model?: string
  status: 'failed' | 'success'
}): Promise<void> => {
  if (!args.batchID) {
    return
  }

  await withFrontendUIClient(async (client, schema) => {
    await client.query(
      `
        UPDATE ${schema}."frontend_ui_translation_batches"
        SET status = $1, model = $2, error = $3, completed_at = now()
        WHERE id = $4;
      `,
      [args.status, args.model || null, args.error || null, args.batchID],
    )
  })
}

const isFrontendUIKey = (key: unknown): key is FrontendUIKey =>
  typeof key === 'string' &&
  frontendUIStringDefinitions.some((definition) => definition.key === key)

const normalizeFrontendUITranslationStatus = (
  status: null | string | undefined,
): FrontendUITranslationStatus => {
  if (status === 'draft' || status === 'review' || status === 'published') {
    return status
  }

  return 'review'
}

const articleLanguageEnumTypeNames = [
  'enum_articles_language_code',
  'enum__articles_v_version_language_code',
] as const

const ensureArticleLanguageEnumValues = async (
  client: FrontendUIPGClient,
  schema: string,
): Promise<void> => {
  const schemaName = unquoteDatabaseIdentifier(schema)

  for (const enumTypeName of articleLanguageEnumTypeNames) {
    const enumResult = await client.query<{ enumlabel: string }>(
      `
        SELECT enum_values.enumlabel
        FROM pg_enum enum_values
        JOIN pg_type enum_type ON enum_type.oid = enum_values.enumtypid
        JOIN pg_namespace enum_schema ON enum_schema.oid = enum_type.typnamespace
        WHERE enum_schema.nspname = $1 AND enum_type.typname = $2;
      `,
      [schemaName, enumTypeName],
    )

    if (!enumResult.rowCount) {
      continue
    }

    const existingValues = new Set(enumResult.rows.map((row) => row.enumlabel))

    for (const language of articleLanguageDefinitions) {
      const languageCode = language.value

      if (
        existingValues.has(languageCode) ||
        !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(languageCode)
      ) {
        continue
      }

      await client.query(
        `ALTER TYPE ${schema}."${enumTypeName}" ADD VALUE IF NOT EXISTS '${languageCode.replaceAll("'", "''")}';`,
      )
    }
  }
}

const withFrontendUIClient = async <T>(
  callback: (client: FrontendUIPGClient, schema: string) => Promise<T>,
): Promise<T | undefined> => {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (!connectionString) {
    return undefined
  }

  const schemaName = process.env.PAYLOAD_DB_SCHEMA || 'cms_ai'

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schemaName)) {
    throw new Error(`Unsafe PAYLOAD_DB_SCHEMA value: ${schemaName}`)
  }

  const schema = quoteDatabaseIdentifier(schemaName)
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 30_000,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    statement_timeout: 30_000,
  })

  await client.connect()

  try {
    return await callback(client, schema)
  } finally {
    await client.end()
  }
}

const quoteDatabaseIdentifier = (value: string): string => `"${value.replaceAll('"', '""')}"`

const unquoteDatabaseIdentifier = (value: string): string =>
  value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1).replaceAll('""', '"')
    : value
