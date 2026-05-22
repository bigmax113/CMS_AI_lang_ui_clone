import type { PayloadRequest } from 'payload'

type HeaderBag =
  | Headers
  | Record<string, string | string[] | undefined>
  | undefined

type HeaderGetter = {
  get: (name: string) => null | string
}

export type PublicSite = {
  defaultBlogPath?: null | string
  slug?: null | string
}

const readHeader = (headers: HeaderBag, name: string): null | string => {
  if (!headers) {
    return null
  }

  if ('get' in headers && typeof (headers as HeaderGetter).get === 'function') {
    return (headers as HeaderGetter).get(name)
  }

  const headerRecord = headers as Record<string, string | string[] | undefined>
  const value = headerRecord[name] || headerRecord[name.toLowerCase()]

  return Array.isArray(value) ? value[0] || null : value || null
}

export const normalizeBlogPath = (path?: null | string) => {
  const cleanedPath = (path || '/blog').trim() || '/blog'
  const withLeadingSlash = cleanedPath.startsWith('/') ? cleanedPath : `/${cleanedPath}`

  return withLeadingSlash.replace(/\/+$/u, '') || '/blog'
}

export const articlePublicPath = (slug?: null | string) => {
  if (!slug) {
    return null
  }

  return `/articles/${encodeURIComponent(slug)}`
}

export const blogPostPublicPath = ({
  site,
  slug,
}: {
  site?: null | PublicSite
  slug?: null | string
}) => {
  if (!slug) {
    return null
  }

  if (!site?.slug) {
    return `/blog/${encodeURIComponent(slug)}`
  }

  return `/sites/${encodeURIComponent(site.slug)}${normalizeBlogPath(site.defaultBlogPath)}/${encodeURIComponent(slug)}`
}

export const publicBaseURL = (req?: PayloadRequest) => {
  const configuredURL =
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    process.env.RENDER_EXTERNAL_URL

  if (configuredURL) {
    return configuredURL.replace(/\/+$/u, '')
  }

  const host = readHeader(req?.headers as HeaderBag, 'x-forwarded-host') || readHeader(req?.headers as HeaderBag, 'host')

  if (!host) {
    return ''
  }

  const protocol = readHeader(req?.headers as HeaderBag, 'x-forwarded-proto') || 'https'

  return `${protocol}://${host}`
}

export const absolutePublicURL = (path: null | string, req?: PayloadRequest) => {
  if (!path) {
    return null
  }

  return `${publicBaseURL(req)}${path}`
}
