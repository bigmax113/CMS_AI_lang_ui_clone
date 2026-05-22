import type { CollectionConfig } from 'payload'

export const mediaSlug = 'media'

const uploadStaticDir = process.env.PAYLOAD_UPLOAD_DIR || 'media'
const maxEmbeddedImageBytes = Number(process.env.MEDIA_DB_IMAGE_MAX_BYTES || 3_000_000)

type UploadFile = {
  buffer?: Buffer
  data?: Buffer
  mimeType?: string
  mimetype?: string
  size?: number
}

const getUploadBuffer = (file?: UploadFile) => file?.data || file?.buffer
const getUploadMimeType = (file?: UploadFile) => file?.mimeType || file?.mimetype

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
          'Prototype fallback for small images on Render free. Use object storage for production.',
        readOnly: true,
      },
      label: 'Embedded image fallback',
    },
    {
      name: 'embeddedImageStatus',
      type: 'select',
      admin: {
        description: 'Shows whether an image copy was stored in Postgres for free-plan persistence.',
        readOnly: true,
      },
      options: [
        {
          label: 'Stored in database',
          value: 'stored-in-db',
        },
        {
          label: 'Not an image',
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

        if (!mimeType || !String(mimeType).startsWith('image/')) {
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

        if (buffer.length > maxEmbeddedImageBytes) {
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
    ],
    staticDir: uploadStaticDir,
  },
}
