import type { CollectionConfig } from 'payload'

import fs from 'node:fs/promises'
import path from 'node:path'

export const mediaSlug = 'media'

const uploadStaticDir = process.env.PAYLOAD_UPLOAD_DIR || 'media'
const maxEmbeddedMediaBytes = Number(process.env.MEDIA_DB_IMAGE_MAX_BYTES || 3_000_000)
const hasEnvValue = (keys: string[]) => keys.some((key) => Boolean(process.env[key]?.trim()))
const hasDriveOAuthEnv =
  hasEnvValue(['GOOGLE_DRIVE_OAUTH_TOKEN_JSON', 'GOOGLE_DRIVE_OAUTH_TOKEN_JSON_B64']) &&
  (hasEnvValue(['GOOGLE_DRIVE_OAUTH_CLIENT_JSON', 'GOOGLE_DRIVE_OAUTH_CLIENT_JSON_B64']) ||
    hasEnvValue(['GOOGLE_DRIVE_OAUTH_TOKEN_JSON', 'GOOGLE_DRIVE_OAUTH_TOKEN_JSON_B64']))
const driveStorageEnabled = process.env.GOOGLE_DRIVE_STORAGE_ENABLED
  ? process.env.GOOGLE_DRIVE_STORAGE_ENABLED === 'true'
  : hasDriveOAuthEnv
const drivePublicReadEnabled = process.env.GOOGLE_DRIVE_PUBLIC_READ === 'true'
const driveStorageRequired = process.env.MEDIA_EXTERNAL_STORAGE_REQUIRED === 'true'

type GoogleOAuthClientConfig = {
  installed?: {
    client_id?: string
    client_secret?: string
  }
  web?: {
    client_id?: string
    client_secret?: string
  }
}

type GoogleOAuthToken = {
  access_token?: string
  client_id?: string
  client_secret?: string
  expiry_date?: number
  expires_in?: number
  refresh_token?: string
  token_type?: string
}

type UploadFile = {
  buffer?: Buffer
  data?: Buffer
  filename?: string
  mimeType?: string
  mimetype?: string
  name?: string
  originalname?: string
  size?: number
}

const getUploadBuffer = (file?: UploadFile) => file?.data || file?.buffer
const getUploadMimeType = (file?: UploadFile) => file?.mimeType || file?.mimetype
const getUploadFilename = (file: UploadFile | undefined, fallback: unknown) =>
  file?.filename || file?.originalname || file?.name || (typeof fallback === 'string' ? fallback : 'upload.bin')
const canEmbedInDatabase = (mimeType: string) =>
  mimeType.startsWith('image/') || mimeType.startsWith('video/')
const getStoredMediaSource = (doc: Record<string, unknown>) => {
  const embedded = typeof doc.embeddedImageDataURL === 'string' ? doc.embeddedImageDataURL : ''
  const externalFile = typeof doc.externalFileURL === 'string' ? doc.externalFileURL : ''
  const external = typeof doc.externalImageURL === 'string' ? doc.externalImageURL : ''
  const url = typeof doc.url === 'string' ? doc.url : ''

  if (externalFile) {
    return externalFile
  }

  if (embedded.startsWith('data:')) {
    return embedded
  }

  if (external) {
    return external
  }

  if (url) {
    return url
  }

  return null
}
const getStoredImageSource = (doc: Record<string, unknown>) => {
  const mimeType = typeof doc.mimeType === 'string' ? doc.mimeType : ''

  return mimeType.startsWith('image/') ? getStoredMediaSource(doc) : null
}
const getAdminThumbnail = ({ doc }: { doc: Record<string, unknown> }) => {
  const id = typeof doc.id === 'number' || typeof doc.id === 'string' ? doc.id : ''
  const filename = typeof doc.filename === 'string' ? doc.filename : ''
  const mimeType = typeof doc.mimeType === 'string' ? doc.mimeType : ''
  const thumbnailKey = id || filename

  if (mimeType.startsWith('image/') && thumbnailKey) {
    return `/api/${mediaSlug}/${encodeURIComponent(String(thumbnailKey))}/thumbnail`
  }

  return getStoredImageSource(doc)
}
const dataURLResponse = (source: string) => {
  const match = /^data:([^;,]+);base64,(.+)$/u.exec(source)

  if (!match) {
    return null
  }

  return new Response(Buffer.from(match[2], 'base64'), {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Content-Type': match[1],
    },
  })
}

let cachedOAuthToken: GoogleOAuthToken | null = null

const googleDriveFileURL = (fileID: string) =>
  `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileID)}`

const readJSONFromEnv = <T,>(plainKey: string, base64Key: string): T | null => {
  const plain = process.env[plainKey]
  const base64 = process.env[base64Key]
  const raw = plain || (base64 ? Buffer.from(base64, 'base64').toString('utf8') : '')

  if (!raw.trim()) {
    return null
  }

  return JSON.parse(raw) as T
}

const getGoogleOAuthClient = () => {
  const config = readJSONFromEnv<GoogleOAuthClientConfig>(
    'GOOGLE_DRIVE_OAUTH_CLIENT_JSON',
    'GOOGLE_DRIVE_OAUTH_CLIENT_JSON_B64',
  )
  const client = config?.installed || config?.web

  if (client?.client_id && client.client_secret) {
    return {
      clientID: client.client_id,
      clientSecret: client.client_secret,
    }
  }

  const token = getInitialGoogleOAuthToken()

  if (!token.client_id || !token.client_secret) {
    throw new Error('Google Drive OAuth client is not configured.')
  }

  return {
    clientID: token.client_id,
    clientSecret: token.client_secret,
  }
}

const getInitialGoogleOAuthToken = () => {
  cachedOAuthToken ||= readJSONFromEnv<GoogleOAuthToken>(
    'GOOGLE_DRIVE_OAUTH_TOKEN_JSON',
    'GOOGLE_DRIVE_OAUTH_TOKEN_JSON_B64',
  )

  if (!cachedOAuthToken?.refresh_token && !cachedOAuthToken?.access_token) {
    throw new Error('Google Drive OAuth token is not configured.')
  }

  return cachedOAuthToken
}

const getGoogleAccessToken = async () => {
  const token = getInitialGoogleOAuthToken()
  const now = Date.now()

  if (token.access_token && (!token.expiry_date || token.expiry_date - now > 60_000)) {
    return token.access_token
  }

  if (!token.refresh_token) {
    throw new Error('Google Drive OAuth refresh token is missing.')
  }

  const client = getGoogleOAuthClient()
  const response = await fetch('https://oauth2.googleapis.com/token', {
    body: new URLSearchParams({
      client_id: client.clientID,
      client_secret: client.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })
  const payload = (await response.json().catch(async () => ({ error: await response.text() }))) as GoogleOAuthToken & {
    error?: unknown
  }

  if (!response.ok || !payload.access_token) {
    throw new Error(`Google Drive token refresh failed: ${JSON.stringify(payload.error || payload)}`)
  }

  cachedOAuthToken = {
    ...token,
    ...payload,
    expiry_date: Date.now() + Number(payload.expires_in || 3600) * 1000,
  }

  return cachedOAuthToken.access_token
}

const safeDriveFileName = (filename: string) =>
  filename
    .replace(/[<>:"/\\|?*\u0000-\u001F]/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 180) || 'upload.bin'

const uploadBufferToGoogleDrive = async ({
  buffer,
  filename,
  mimeType,
}: {
  buffer: Buffer
  filename: string
  mimeType: string
}) => {
  const accessToken = await getGoogleAccessToken()
  const folderID = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim()
  const metadata = {
    mimeType,
    name: safeDriveFileName(filename),
    ...(folderID ? { parents: [folderID] } : {}),
  }
  const form = new FormData()

  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', new Blob([buffer], { type: mimeType }), metadata.name)

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink',
    {
      body: form,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'POST',
    },
  )
  const payload = (await response.json().catch(async () => ({ error: await response.text() }))) as {
    error?: unknown
    id?: string
    webContentLink?: string
    webViewLink?: string
  }

  if (!response.ok || !payload.id) {
    throw new Error(`Google Drive upload failed: ${JSON.stringify(payload.error || payload)}`)
  }

  if (drivePublicReadEnabled) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(payload.id)}/permissions`, {
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  }

  return {
    externalFileURL: googleDriveFileURL(payload.id),
    fileID: payload.id,
    webViewURL: payload.webViewLink,
  }
}

const streamGoogleDriveFile = async ({
  fileID,
  filename,
  mimeType,
  range,
}: {
  fileID: string
  filename?: string
  mimeType: string
  range?: null | string
}) => {
  const accessToken = await getGoogleAccessToken()
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileID)}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(range ? { Range: range } : {}),
    },
  })

  if (!response.ok || !response.body) {
    return new Response('Google Drive media unavailable', { status: response.status || 502 })
  }

  const headers = new Headers({
    'Cache-Control': 'public, max-age=300',
    'Content-Disposition': `inline${filename ? `; filename="${safeDriveFileName(filename)}"` : ''}`,
    'Content-Type': response.headers.get('Content-Type') || mimeType,
  })

  for (const header of ['Accept-Ranges', 'Content-Length', 'Content-Range', 'ETag', 'Last-Modified']) {
    const value = response.headers.get(header)

    if (value) {
      headers.set(header, value)
    }
  }

  return new Response(response.body, {
    headers,
    status: response.status,
  })
}

const responseFromStoredMedia = async (
  doc: Record<string, unknown>,
  options?: { imageOnly?: boolean; range?: null | string },
) => {
  const mimeType = typeof doc.mimeType === 'string' ? doc.mimeType : 'application/octet-stream'

  if (options?.imageOnly && !mimeType.startsWith('image/')) {
    return new Response('Thumbnail unavailable', { status: 404 })
  }

  const driveFileID = typeof doc.driveFileID === 'string' ? doc.driveFileID : ''

  if (driveFileID) {
    return streamGoogleDriveFile({
      fileID: driveFileID,
      filename: typeof doc.filename === 'string' ? doc.filename : undefined,
      mimeType,
      range: options?.range,
    })
  }

  const source = getStoredMediaSource(doc)

  if (!source) {
    return new Response('Media unavailable', { status: 404 })
  }

  if (source.startsWith('data:')) {
    return dataURLResponse(source) || new Response('Invalid media', { status: 422 })
  }

  return Response.redirect(source, 302)
}

const bufferFromDataURL = (source: string) => {
  const match = /^data:([^;,]+);base64,(.+)$/u.exec(source)

  return match ? Buffer.from(match[2], 'base64') : null
}

const getLocalUploadPath = (filename?: null | string) => {
  if (!filename) {
    return null
  }

  const root = path.isAbsolute(uploadStaticDir) ? uploadStaticDir : path.resolve(process.cwd(), uploadStaticDir)

  return path.join(root, filename)
}

const loadMediaBufferForMigration = async (doc: Record<string, unknown>) => {
  const embedded = typeof doc.embeddedImageDataURL === 'string' ? doc.embeddedImageDataURL : ''
  const fromEmbedded = embedded ? bufferFromDataURL(embedded) : null

  if (fromEmbedded) {
    return fromEmbedded
  }

  const localPath = getLocalUploadPath(typeof doc.filename === 'string' ? doc.filename : null)

  if (localPath) {
    try {
      return await fs.readFile(localPath)
    } catch (_error) {
      // Existing Render files may already be gone; try external URLs below.
    }
  }

  const source = getStoredMediaSource(doc)

  if (!source || source.startsWith('/')) {
    return null
  }

  const response = await fetch(source)

  return response.ok ? Buffer.from(await response.arrayBuffer()) : null
}

export const Media: CollectionConfig = {
  slug: mediaSlug,
  access: {
    read: () => true,
  },
  admin: {
    defaultColumns: ['filename', 'mimeType', 'updatedAt'],
    group: 'Library',
    useAsTitle: 'filename',
  },
  endpoints: [
    {
      path: '/thumbnail/:key',
      method: 'get',
      handler: async (req) => {
        const routeKey = req.routeParams?.key
        const key =
          typeof routeKey === 'number' || typeof routeKey === 'string'
            ? String(routeKey)
            : Array.isArray(routeKey)
              ? routeKey[0]
              : undefined

        if (!key) {
          return new Response('Missing media key', { status: 400 })
        }

        const select = {
          driveFileID: true,
          embeddedImageDataURL: true,
          externalFileURL: true,
          externalImageURL: true,
          filename: true,
          mimeType: true,
          url: true,
        } as const
        const mediaByID = await req.payload.findByID({
          collection: mediaSlug,
          depth: 0,
          disableErrors: true,
          id: key,
          overrideAccess: false,
          req,
          select,
          user: req.user,
        })
        const media =
          mediaByID ||
          (
            await req.payload.find({
              collection: mediaSlug,
              depth: 0,
              limit: 1,
              overrideAccess: false,
              req,
              select,
              user: req.user,
              where: {
                filename: {
                  equals: key,
                },
              },
            })
          ).docs[0]

        if (!media) {
          return new Response('Media not found', { status: 404 })
        }

        return responseFromStoredMedia(media as unknown as Record<string, unknown>, { imageOnly: true })
      },
    },
    {
      path: '/:id/asset',
      method: 'get',
      handler: async (req) => {
        const routeID = req.routeParams?.id
        const id =
          typeof routeID === 'number' || typeof routeID === 'string'
            ? routeID
            : Array.isArray(routeID)
              ? routeID[0]
              : undefined

        if (!id) {
          return new Response('Missing media ID', { status: 400 })
        }

        const media = await req.payload.findByID({
          collection: mediaSlug,
          depth: 0,
          disableErrors: true,
          id,
          overrideAccess: false,
          req,
          select: {
            driveFileID: true,
            embeddedImageDataURL: true,
            externalFileURL: true,
            externalImageURL: true,
            filename: true,
            mimeType: true,
            url: true,
          },
          user: req.user,
        })

        if (!media) {
          return new Response('Media not found', { status: 404 })
        }

        return responseFromStoredMedia(media as unknown as Record<string, unknown>, {
          range: req.headers.get('range'),
        })
      },
    },
    {
      path: '/:id/thumbnail',
      method: 'get',
      handler: async (req) => {
        const routeID = req.routeParams?.id
        const id =
          typeof routeID === 'number' || typeof routeID === 'string'
            ? routeID
            : Array.isArray(routeID)
              ? routeID[0]
              : undefined

        if (!id) {
          return new Response('Missing media ID', { status: 400 })
        }

        const media = await req.payload.findByID({
          collection: mediaSlug,
          depth: 0,
          disableErrors: true,
          id,
          overrideAccess: false,
          req,
          select: {
            driveFileID: true,
            embeddedImageDataURL: true,
            externalFileURL: true,
            externalImageURL: true,
            filename: true,
            mimeType: true,
            url: true,
          },
          user: req.user,
        })

        if (!media) {
          return new Response('Media not found', { status: 404 })
        }

        return responseFromStoredMedia(media as unknown as Record<string, unknown>, { imageOnly: true })
      },
    },
    {
      path: '/migrate-drive',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return new Response('Unauthorized', { status: 401 })
        }

        if (!driveStorageEnabled) {
          return Response.json({ error: 'Google Drive storage is not enabled.', ok: false }, { status: 400 })
        }

        const url = new URL(req.url || 'http://payload.local/api/media/migrate-drive')
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500)
        const page = Math.max(Number(url.searchParams.get('page') || 1), 1)
        const result = {
          failed: [] as Array<{ error: string; id: string | number }>,
          migrated: [] as Array<{ id: string | number }>,
          page,
          skipped: [] as Array<{ id: string | number; reason: string }>,
        }
        const mediaPage = await req.payload.find({
          collection: mediaSlug,
          depth: 0,
          limit,
          page,
          overrideAccess: false,
          req,
          user: req.user,
        })

        for (const doc of mediaPage.docs) {
          const record = doc as unknown as Record<string, unknown>
          const id = typeof record.id === 'number' || typeof record.id === 'string' ? record.id : ''

          if (!id) {
            continue
          }

          if (record.driveFileID) {
            result.skipped.push({ id, reason: 'already-in-drive' })
            continue
          }

          const mimeType = typeof record.mimeType === 'string' ? record.mimeType : 'application/octet-stream'
          const filename = typeof record.filename === 'string' ? record.filename : `media-${id}`
          const buffer = await loadMediaBufferForMigration(record)

          if (!buffer) {
            result.failed.push({ error: 'No recoverable file source found.', id })
            continue
          }

          try {
            const uploaded = await uploadBufferToGoogleDrive({ buffer, filename, mimeType })

            await req.payload.update({
              collection: mediaSlug,
              data: {
                driveFileID: uploaded.fileID,
                driveStorageStatus: 'stored-in-drive',
                driveWebViewURL: uploaded.webViewURL,
                externalFileURL: uploaded.externalFileURL,
              },
              id,
              overrideAccess: false,
              req,
              user: req.user,
            })
            result.migrated.push({ id })
          } catch (error) {
            result.failed.push({
              error: error instanceof Error ? error.message : String(error),
              id,
            })
          }
        }

        return Response.json({
          ...result,
          hasNextPage: mediaPage.hasNextPage,
          ok: result.failed.length === 0,
          totalDocs: mediaPage.totalDocs,
        })
      },
    },
  ],
  fields: [
    {
      name: 'alt',
      type: 'text',
      admin: {
        description: 'Short accessible description for images or RAG documents.',
      },
    },
    {
      name: 'caption',
      type: 'textarea',
      admin: {
        description: 'Optional editor note. For RAG uploads, describe the document purpose.',
      },
    },
    {
      name: 'externalImageURL',
      type: 'text',
      admin: {
        description:
          'Legacy stable external image URL. Existing articles can keep using this fallback.',
      },
      label: 'External image URL',
    },
    {
      name: 'externalFileURL',
      type: 'text',
      admin: {
        description: 'Generated direct file URL from persistent storage. Kept for compatibility and recovery.',
        readOnly: true,
      },
      label: 'External file URL',
    },
    {
      name: 'driveFileID',
      type: 'text',
      admin: {
        description: 'Google Drive file ID used by the public media proxy.',
        readOnly: true,
      },
      label: 'Google Drive file ID',
    },
    {
      name: 'driveWebViewURL',
      type: 'text',
      admin: {
        description: 'Google Drive web preview URL for editors and recovery.',
        readOnly: true,
      },
      label: 'Google Drive preview URL',
    },
    {
      name: 'driveStorageStatus',
      type: 'select',
      admin: {
        description: 'Shows whether this upload has been copied to persistent Google Drive storage.',
        readOnly: true,
      },
      label: 'Google Drive storage status',
      options: [
        {
          label: 'Stored in Google Drive',
          value: 'stored-in-drive',
        },
        {
          label: 'Drive disabled',
          value: 'drive-disabled',
        },
        {
          label: 'Drive upload failed',
          value: 'drive-failed',
        },
      ],
    },
    {
      name: 'driveStorageError',
      type: 'textarea',
      admin: {
        description: 'Last Google Drive storage error. Empty means the latest storage attempt succeeded.',
        readOnly: true,
      },
      label: 'Google Drive storage error',
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
    },
    {
      name: 'embeddedImageDataURL',
      type: 'textarea',
      admin: {
        description:
          'Prototype fallback for small images/videos on Render free. Use object storage for production.',
        readOnly: true,
      },
      label: 'Embedded media fallback',
      maxLength: 8_000_000,
    },
    {
      name: 'embeddedImageStatus',
      type: 'select',
      admin: {
        description: 'Shows whether a small image/video copy was stored in Postgres for free-plan persistence.',
        readOnly: true,
      },
      options: [
        {
          label: 'Stored in database',
          value: 'stored-in-db',
        },
        {
          label: 'Not embeddable media',
          value: 'not-image',
        },
        {
          label: 'Image too large',
          value: 'too-large',
        },
        {
          label: 'No upload buffer',
          value: 'no-buffer',
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        const file = req.file as UploadFile | undefined
        const buffer = getUploadBuffer(file)
        const mimeType = getUploadMimeType(file) || data.mimeType
        const nextData = { ...data }

        if (!buffer) {
          return nextData
        }

        if (driveStorageEnabled && mimeType) {
          try {
            const uploaded = await uploadBufferToGoogleDrive({
              buffer,
              filename: getUploadFilename(file, data.filename),
              mimeType: String(mimeType),
            })

            nextData.driveFileID = uploaded.fileID
            nextData.driveStorageError = undefined
            nextData.driveStorageStatus = 'stored-in-drive'
            nextData.driveWebViewURL = uploaded.webViewURL
            nextData.externalFileURL = uploaded.externalFileURL
          } catch (error) {
            nextData.driveStorageError = error instanceof Error ? error.message : String(error)
            nextData.driveStorageStatus = 'drive-failed'

            if (driveStorageRequired) {
              throw error
            }
          }
        } else if (!driveStorageEnabled) {
          nextData.driveStorageStatus = 'drive-disabled'
        }

        if (!mimeType || !canEmbedInDatabase(String(mimeType))) {
          return {
            ...nextData,
            embeddedImageDataURL: undefined,
            embeddedImageStatus: 'not-image',
          }
        }

        if (buffer.length > maxEmbeddedMediaBytes) {
          return {
            ...nextData,
            embeddedImageDataURL: undefined,
            embeddedImageStatus: 'too-large',
          }
        }

        return {
          ...nextData,
          embeddedImageDataURL: `data:${mimeType};base64,${buffer.toString('base64')}`,
          embeddedImageStatus: 'stored-in-db',
        }
      },
    ],
  },
  upload: {
    adminThumbnail: getAdminThumbnail,
    cacheTags: false,
    displayPreview: true,
    mimeTypes: [
      'image/*',
      'application/pdf',
      'application/msword',
      'application/octet-stream',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/x-xliff+xml',
      'application/xliff+xml',
      'application/xml',
      'text/markdown',
      'text/plain',
      'text/xml',
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ],
    staticDir: uploadStaticDir,
  },
}
