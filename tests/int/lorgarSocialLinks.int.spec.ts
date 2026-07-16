import { describe, expect, it } from 'vitest'

import {
  defaultLorgarSocialLinks,
  lorgarSocialLinksForLanguage,
} from '@/lib/lorgarSocialLinks'

const withOverrides = (overrides: Partial<Record<string, string>>) =>
  defaultLorgarSocialLinks.map((item) => ({
    ...item,
    href: overrides[item.icon] || item.href,
  }))

describe('localized LORGAR social links', () => {
  it('keeps every default link for languages without overrides', () => {
    expect(lorgarSocialLinksForLanguage('en')).toEqual(defaultLorgarSocialLinks)
    expect(lorgarSocialLinksForLanguage('de')).toEqual(defaultLorgarSocialLinks)
  })

  it('replaces only YouTube for Ukrainian, Romanian, Polish, and Slovak', () => {
    expect(lorgarSocialLinksForLanguage('ua')).toEqual(
      withOverrides({
        youtube: 'https://www.youtube.com/channel/UC_6zCEbiQ3zxAW2nzbLtEAQ',
      }),
    )
    expect(lorgarSocialLinksForLanguage('ro')).toEqual(
      withOverrides({ youtube: 'https://www.youtube.com/@LorgarRomania' }),
    )
    expect(lorgarSocialLinksForLanguage('pl')).toEqual(
      withOverrides({ youtube: 'https://www.youtube.com/@lorgarpoland' }),
    )
    expect(lorgarSocialLinksForLanguage('sk')).toEqual(
      withOverrides({ youtube: 'https://www.youtube.com/@lorgarslovakia' }),
    )
  })

  it('replaces only the listed Czech and Bulgarian networks', () => {
    expect(lorgarSocialLinksForLanguage('cz')).toEqual(
      withOverrides({
        facebook: 'https://www.facebook.com/lorgar.cz',
        instagram: 'https://www.instagram.com/lorgar.cz',
        youtube: 'https://www.youtube.com/channel/UC4XbYp0ZR2EhXQbH3CaVjqA',
      }),
    )
    expect(lorgarSocialLinksForLanguage('bg')).toEqual(
      withOverrides({
        facebook: 'https://www.facebook.com/lorgar.bg/',
        instagram: 'https://www.instagram.com/lorgar.bg',
        youtube: 'https://www.youtube.com/@lorgarbulgaria',
      }),
    )
  })
})
