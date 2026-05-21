import type { CollectionConfig } from 'payload'

export const mediaSlug = 'media'

export const Media: CollectionConfig = {
  slug: mediaSlug,
  access: {
    read: () => true,
  },
  admin: {
    defaultColumns: ['filename', 'alt', 'updatedAt'],
    group: 'Library',
    useAsTitle: 'filename',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      admin: {
        description: 'Short accessible description for images and uploaded documents.',
      },
    },
    {
      name: 'caption',
      type: 'textarea',
      admin: {
        description: 'Optional note shown to content editors.',
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
    mimeTypes: ['image/*', 'application/pdf', 'text/plain'],
    staticDir: 'media',
  },
}
