export const articleLanguageOptions = [
  { label: 'EN English', value: 'en' },
  { label: 'RU Russian', value: 'ru' },
  { label: 'UK Ukrainian', value: 'uk' },
  { label: 'RO Romanian', value: 'ro' },
  { label: 'PL Polish', value: 'pl' },
] as const

export type ArticleLanguageCode = (typeof articleLanguageOptions)[number]['value']

const articleLanguageCodes = articleLanguageOptions.map((language) => language.value)
const languagePrefixPattern =
  /^\s*(?:\[(en|pl|ro|ru|uk)\]|\((en|pl|ro|ru|uk)\)|(?:en|pl|ro|ru|uk)[:_-])\s*/iu
const slugLanguagePrefixPattern = /^(en|pl|ro|ru|uk)-/iu

export const articleLanguageLabelByCode = Object.fromEntries(
  articleLanguageOptions.map((language) => [
    language.value,
    language.label.replace(/^[A-Z]{2}\s/u, ''),
  ]),
) as Record<ArticleLanguageCode, string>

export const normalizeArticleLanguageCode = (value: unknown): ArticleLanguageCode => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''

  return articleLanguageCodes.includes(normalized as ArticleLanguageCode)
    ? (normalized as ArticleLanguageCode)
    : 'en'
}

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
