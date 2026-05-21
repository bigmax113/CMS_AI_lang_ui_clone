import type { CollectionConfig } from 'payload'

export const mediaSlug = 'media'

const uploadStaticDir = process.env.PAYLOAD_UPLOAD_DIR || 'media'

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
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
    },
  ],
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
