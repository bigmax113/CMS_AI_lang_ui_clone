import type { CollectionConfig } from 'payload'

export const mediaSlug = 'media'

const uploadStaticDir = process.env.PAYLOAD_UPLOAD_DIR || 'media'
const maxEmbeddedMediaBytes = Number(process.env.MEDIA_DB_IMAGE_MAX_BYTES || 3_000_000)

type UploadFile = {
  buffer?: Buffer
  data?: Buffer
  mimeType?: string
  mimetype?: string
  size?: number
}

const getUploadBuffer = (file?: UploadFile) => file?.data || file?.buffer
const getUploadMimeType = (file?: UploadFile) => file?.mimeType || file?.mimetype
const canEmbedInDatabase = (mimeType: string) =>
  mimeType.startsWith('image/') || mimeType.startsWith('video/')
const getStoredImageSource = (doc: Record<string, unknown>) => {
  const embedded = typeof doc.embeddedImageDataURL === 'string' ? doc.embeddedImageDataURL : ''
  const external = typeof doc.externalImageURL === 'string' ? doc.externalImageURL : ''
  const mimeType = typeof doc.mimeType === 'string' ? doc.mimeType : ''
  const url = typeof doc.url === 'string' ? doc.url : ''

  if (embedded.startsWith('data:image/')) {
    return embedded
  }

  if (external) {
    return external
  }

  if (mimeType.startsWith('image/') && url) {
    return url
  }

  return null
}
const getAdminThumbnail = ({ doc }: { doc: Record<string, unknown> }) => {
  const id = typeof doc.id === 'number' || typeof doc.id === 'string' ? doc.id : ''
  const filename = typeof doc.filename === 'string' ? doc.filename : ''
  const mimeType = typeof doc.mimeType === 'string' ? doc.mimeType : ''
  const thumbnailKey = id || filename

  if (mimeType.startsWith('image/') && thumbnailKey) {
    return `/api/${mediaSlug}/thumbnail/${encodeURIComponent(String(thumbnailKey))}`
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
          embeddedImageDataURL: true,
          externalImageURL: true,
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

        const source = getStoredImageSource(media as Record<string, unknown>)

        if (!source) {
          return new Response('Thumbnail unavailable', { status: 404 })
        }

        if (source.startsWith('data:')) {
          return dataURLResponse(source) || new Response('Invalid thumbnail', { status: 422 })
        }

        return Response.redirect(source, 302)
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
            embeddedImageDataURL: true,
            externalImageURL: true,
            mimeType: true,
            url: true,
          },
          user: req.user,
        })

        if (!media) {
          return new Response('Media not found', { status: 404 })
        }

        const source = getStoredImageSource(media as Record<string, unknown>)

        if (!source) {
          return new Response('Thumbnail unavailable', { status: 404 })
        }

        if (source.startsWith('data:')) {
          return dataURLResponse(source) || new Response('Invalid thumbnail', { status: 422 })
        }

        return Response.redirect(source, 302)
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
          'Stable external image URL. Use this when Render free storage lost the uploaded local file.',
      },
      label: 'External image URL',
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
      ({ data, req }) => {
        const file = req.file as UploadFile | undefined
        const buffer = getUploadBuffer(file)
        const mimeType = getUploadMimeType(file) || data.mimeType

        if (!mimeType || !canEmbedInDatabase(String(mimeType))) {
          return {
            ...data,
            embeddedImageStatus: 'not-image',
          }
        }

        if (!buffer) {
          return {
            ...data,
            embeddedImageStatus: data.embeddedImageDataURL ? 'stored-in-db' : 'no-buffer',
          }
        }

        if (buffer.length > maxEmbeddedMediaBytes) {
          return {
            ...data,
            embeddedImageDataURL: undefined,
            embeddedImageStatus: 'too-large',
          }
        }

        return {
          ...data,
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
