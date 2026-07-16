import {
  normalizeArticleLanguageCode,
  type ArticleLanguageCode,
} from '@/lib/articleTranslations'

export type LorgarSocialIconName =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'telegram'
  | 'tiktok'
  | 'whatsapp'
  | 'youtube'

export type LorgarSocialLink = {
  href: string
  icon: LorgarSocialIconName
  label: string
}

export const defaultLorgarSocialLinks: ReadonlyArray<LorgarSocialLink> = [
  { href: 'https://www.instagram.com/lorgar.global/', icon: 'instagram', label: 'Instagram' },
  { href: 'https://www.linkedin.com/company/lorgar/', icon: 'linkedin', label: 'LinkedIn' },
  { href: 'https://www.facebook.com/lorgargaming', icon: 'facebook', label: 'Facebook' },
  { href: 'https://t.me/Lorgar_support_bot', icon: 'telegram', label: 'Telegram' },
  { href: 'https://wa.me/48732080677', icon: 'whatsapp', label: 'WhatsApp' },
  {
    href: 'https://www.youtube.com/channel/UCf3wrq74zLwlDI6AciwK0JA',
    icon: 'youtube',
    label: 'YouTube',
  },
  { href: 'https://www.tiktok.com/@lorgar.global', icon: 'tiktok', label: 'TikTok' },
]

const localizedSocialHrefOverrides: Partial<
  Record<ArticleLanguageCode, Partial<Record<LorgarSocialIconName, string>>>
> = {
  bg: {
    facebook: 'https://www.facebook.com/lorgar.bg/',
    instagram: 'https://www.instagram.com/lorgar.bg',
    youtube: 'https://www.youtube.com/@lorgarbulgaria',
  },
  cs: {
    facebook: 'https://www.facebook.com/lorgar.cz',
    instagram: 'https://www.instagram.com/lorgar.cz',
    youtube: 'https://www.youtube.com/channel/UC4XbYp0ZR2EhXQbH3CaVjqA',
  },
  pl: {
    youtube: 'https://www.youtube.com/@lorgarpoland',
  },
  ro: {
    youtube: 'https://www.youtube.com/@LorgarRomania',
  },
  sk: {
    youtube: 'https://www.youtube.com/@lorgarslovakia',
  },
  uk: {
    youtube: 'https://www.youtube.com/channel/UC_6zCEbiQ3zxAW2nzbLtEAQ',
  },
}

export const lorgarSocialLinksForLanguage = (languageCode?: null | string): LorgarSocialLink[] => {
  const overrides = localizedSocialHrefOverrides[normalizeArticleLanguageCode(languageCode)]

  return defaultLorgarSocialLinks.map((item) => ({
    ...item,
    href: overrides?.[item.icon] || item.href,
  }))
}
