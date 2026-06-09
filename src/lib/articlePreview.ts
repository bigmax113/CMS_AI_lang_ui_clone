import { createHmac, timingSafeEqual } from 'node:crypto'

import { articlePublicPath } from './publicURLs'

const previewSecret = () =>
  process.env.ARTICLE_PREVIEW_SECRET ||
  process.env.PAYLOAD_SECRET ||
  'cms-ai-local-preview-secret'

const previewPayload = ({ id, slug }: { id: number | string; slug: string }) =>
  `${String(id)}:${slug}`

export const createArticlePreviewToken = ({ id, slug }: { id: number | string; slug: string }) =>
  createHmac('sha256', previewSecret()).update(previewPayload({ id, slug })).digest('hex')

export const isValidArticlePreviewToken = ({
  id,
  slug,
  token,
}: {
  id: number | string
  slug: string
  token?: null | string
}) => {
  if (!token) {
    return false
  }

  const expected = createArticlePreviewToken({ id, slug })
  const expectedBuffer = Buffer.from(expected)
  const tokenBuffer = Buffer.from(token)

  return expectedBuffer.length === tokenBuffer.length && timingSafeEqual(expectedBuffer, tokenBuffer)
}

export const articlePreviewPath = ({
  id,
  slug,
}: {
  id?: null | number | string
  slug?: null | string
}) => {
  if (!id || !slug) {
    return null
  }

  const publicPath = articlePublicPath(slug)

  if (!publicPath) {
    return null
  }

  const query = new URLSearchParams({
    id: String(id),
    preview: '1',
    token: createArticlePreviewToken({ id, slug }),
  })

  return `${publicPath}?${query.toString()}`
}
