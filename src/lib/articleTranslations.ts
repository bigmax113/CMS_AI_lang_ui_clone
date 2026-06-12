export const articleLanguageDefinitions = [
  {
    displayCode: 'EN',
    hreflang: 'en',
    label: 'EN English',
    language: 'English',
    value: 'en',
    wpBlogURL: 'https://lorgar.com/blog',
  },
  {
    displayCode: 'BG',
    hreflang: 'bg',
    label: 'BG Bulgarian',
    language: 'Bulgarian',
    value: 'bg',
    wpBlogURL: 'https://lorgar.bg/blog',
  },
  {
    displayCode: 'CS',
    hreflang: 'cs',
    label: 'CS Czech',
    language: 'Czech',
    value: 'cs',
    wpBlogURL: 'https://lorgar.cz/blog',
  },
  {
    displayCode: 'DE',
    hreflang: 'de',
    label: 'DE German',
    language: 'German',
    value: 'de',
  },
  {
    displayCode: 'EL',
    hreflang: 'el',
    label: 'EL Greek',
    language: 'Greek',
    value: 'el',
  },
  {
    displayCode: 'ES',
    hreflang: 'es',
    label: 'ES Spanish',
    language: 'Spanish',
    value: 'es',
  },
  {
    displayCode: 'UA',
    hreflang: 'uk',
    label: 'UA Ukrainian',
    language: 'Ukrainian',
    value: 'uk',
    wpBlogURL: 'https://lorgar.ua/blog',
  },
  {
    displayCode: 'RO',
    hreflang: 'ro',
    label: 'RO Romanian',
    language: 'Romanian',
    value: 'ro',
  },
  {
    displayCode: 'SK',
    hreflang: 'sk',
    label: 'SK Slovak',
    language: 'Slovak',
    value: 'sk',
  },
  {
    displayCode: 'HU',
    hreflang: 'hu',
    label: 'HU Hungarian',
    language: 'Hungarian',
    value: 'hu',
  },
  {
    displayCode: 'KZ',
    hreflang: 'kz',
    label: 'KZ Kazakh',
    language: 'Kazakh',
    value: 'kz',
  },
  {
    displayCode: 'PL',
    hreflang: 'pl',
    label: 'PL Polish',
    language: 'Polish',
    value: 'pl',
  },
  {
    displayCode: 'RS',
    hreflang: 'sr-Latn',
    label: 'RS Serbian Latin',
    language: 'Serbian Latin',
    value: 'rs',
  },
  {
    displayCode: 'LV',
    hreflang: 'lv',
    label: 'LV Latvian',
    language: 'Latvian',
    value: 'lv',
  },
  {
    displayCode: 'EE',
    hreflang: 'et',
    label: 'EE Estonian',
    language: 'Estonian',
    value: 'ee',
  },
  {
    displayCode: 'LT',
    hreflang: 'lt',
    label: 'LT Lithuanian',
    language: 'Lithuanian',
    value: 'lt',
  },
  {
    displayCode: 'RU',
    hreflang: 'ru',
    label: 'RU Russian',
    language: 'Russian',
    value: 'ru',
  },
] as const

export const articleLanguageOptions = articleLanguageDefinitions.map(({ label, value }) => ({
  label,
  value,
}))

const articleTranslationTargetCodes = [
  'en',
  'de',
  'el',
  'ru',
  'es',
  'cs',
  'uk',
  'ro',
  'bg',
  'sk',
  'hu',
  'kz',
  'pl',
  'rs',
  'lv',
  'ee',
  'lt',
] as const

export const articleTranslationTargetDefinitions = articleTranslationTargetCodes.map((code) => {
  const language = articleLanguageDefinitions.find((definition) => definition.value === code)

  if (!language) {
    throw new Error(`Missing article language definition for ${code}`)
  }

  return language
})

export type ArticleLanguageCode = (typeof articleLanguageDefinitions)[number]['value']

const articleLanguageCodes = articleLanguageDefinitions.map((language) => language.value)
const articleLanguageAliases: Record<string, ArticleLanguageCode> = {
  cz: 'cs',
  et: 'ee',
  kk: 'kz',
  sr: 'rs',
  'sr-latn': 'rs',
  ua: 'uk',
}
const languagePrefixCodes = [
  ...new Set([
    ...articleLanguageDefinitions.flatMap((language) => [
      language.displayCode.toLowerCase(),
      language.value,
      language.hreflang.toLowerCase(),
    ]),
    ...Object.keys(articleLanguageAliases),
  ]),
]
const languagePrefixAlternates = languagePrefixCodes
  .sort((left, right) => right.length - left.length)
  .map((code) => code.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
  .join('|')
const languagePrefixPattern = new RegExp(
  String.raw`^\s*(?:\[(${languagePrefixAlternates})\]|\((${languagePrefixAlternates})\)|(${languagePrefixAlternates})[:_-])\s*`,
  'iu',
)
const slugLanguagePrefixPattern = new RegExp(
  String.raw`^(${languagePrefixAlternates})-`,
  'iu',
)

export const articleLanguageLabelByCode = Object.fromEntries(
  articleLanguageDefinitions.map((language) => [
    language.value,
    language.label.replace(/^[A-Z]{2}\s/u, ''),
  ]),
) as Record<ArticleLanguageCode, string>

export const articleLanguageDisplayCodeByCode = Object.fromEntries(
  articleLanguageDefinitions.map((language) => [language.value, language.displayCode]),
) as Record<ArticleLanguageCode, string>

export const articleLanguageHreflangByCode = Object.fromEntries(
  articleLanguageDefinitions.map((language) => [language.value, language.hreflang]),
) as Record<ArticleLanguageCode, string>

export const articleLanguageNameByCode = Object.fromEntries(
  articleLanguageDefinitions.map((language) => [language.value, language.language]),
) as Record<ArticleLanguageCode, string>

export const articleLanguageWPBlogURLByCode = Object.fromEntries(
  articleLanguageDefinitions.flatMap((language) =>
    'wpBlogURL' in language && language.wpBlogURL ? [[language.value, language.wpBlogURL]] : [],
  ),
) as Partial<Record<ArticleLanguageCode, string>>

export const normalizeArticleLanguageCode = (value: unknown): ArticleLanguageCode => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  const withoutWrapper = normalized.replace(/^[\[(]?|[\])]$/gu, '')
  const aliased = articleLanguageAliases[withoutWrapper] || withoutWrapper

  return articleLanguageCodes.includes(aliased as ArticleLanguageCode)
    ? (aliased as ArticleLanguageCode)
    : 'en'
}

export const articleLanguageDisplayCode = (value: unknown): string =>
  articleLanguageDisplayCodeByCode[normalizeArticleLanguageCode(value)]

export const articleLanguageHreflang = (value: unknown): string =>
  articleLanguageHreflangByCode[normalizeArticleLanguageCode(value)]

export const articleLanguageName = (value: unknown): string =>
  articleLanguageNameByCode[normalizeArticleLanguageCode(value)]

export const inferArticleLanguageCode = (article: {
  languageCode?: null | string
  slug?: null | string
  title?: null | string
}): ArticleLanguageCode => {
  const source = `${article.title || ''} ${article.slug || ''}`
  const match = source.match(languagePrefixPattern) || article.slug?.match(slugLanguagePrefixPattern)
  const matchedCode = match?.slice(1).find(Boolean)

  if (matchedCode) {
    return normalizeArticleLanguageCode(matchedCode)
  }

  return normalizeArticleLanguageCode(article.languageCode)
}

export const stripArticleLanguagePrefix = (value: unknown): string =>
  String(value || '')
    .replace(languagePrefixPattern, '')
    .replace(slugLanguagePrefixPattern, '')
    .trim()

export const normalizeArticleTranslationGroup = (value: unknown): string =>
  stripArticleLanguagePrefix(value)
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase()
    .slice(0, 120)

export const articleTranslationGroupFromArticle = (article: {
  id?: number | string
  slug?: null | string
  title?: null | string
  translationGroup?: null | string
}): string => {
  const explicit = normalizeArticleTranslationGroup(article.translationGroup)

  if (explicit) {
    return explicit
  }

  return (
    normalizeArticleTranslationGroup(article.slug) ||
    normalizeArticleTranslationGroup(article.title) ||
    `article-${article.id || 'draft'}`
  )
}
