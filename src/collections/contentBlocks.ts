import type { Block, Field } from 'payload'

import { mediaSlug } from './Media'

const productCardFields = (): Field[] => [
  {
    name: 'name',
    type: 'text',
    required: true,
  },
  {
    name: 'brand',
    type: 'text',
  },
  {
    name: 'sku',
    type: 'text',
    label: 'SKU',
  },
  {
    name: 'description',
    type: 'textarea',
  },
  {
    name: 'image',
    type: 'upload',
    displayPreview: true,
    relationTo: mediaSlug,
  },
  {
    name: 'url',
    type: 'text',
    admin: {
      description: 'Internal or external product URL.',
    },
  },
  {
    name: 'ctaLabel',
    type: 'text',
    defaultValue: 'View product',
    label: 'CTA label',
  },
  {
    name: 'priceLabel',
    type: 'text',
    admin: {
      description: 'Display-only price or availability text.',
    },
  },
]

export const htmlEmbedBlock = {
  slug: 'htmlEmbed',
  labels: {
    plural: 'HTML embeds',
    singular: 'HTML embed',
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      admin: {
        description: 'Internal label for editors. It is not shown on the public page.',
      },
    },
    {
      name: 'html',
      type: 'textarea',
      admin: {
        description: 'Trusted raw HTML for SEO snippets, tables, widgets, or legacy content.',
      },
      required: true,
    },
  ],
} satisfies Block

export const productCardBlock = {
  slug: 'productCard',
  labels: {
    plural: 'Single Product Cards',
    singular: 'Single Product Card',
  },
  fields: productCardFields(),
} satisfies Block

export const productCardCarouselBlock = {
  slug: 'productCardCarousel',
  labels: {
    plural: 'Product Card Carousels',
    singular: 'Product Card Carousel',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      admin: {
        description: 'Optional heading shown above the carousel.',
      },
    },
    {
      name: 'products',
      type: 'array',
      admin: {
        description: 'Add up to 5 products. Each item uses the same fields as Single Product Card.',
      },
      fields: productCardFields(),
      labels: {
        plural: 'Products',
        singular: 'Product',
      },
      maxRows: 5,
      minRows: 1,
      required: true,
    },
  ],
} satisfies Block

export const imageBlock = {
  slug: 'imageBlock',
  labels: {
    plural: 'Images',
    singular: 'Image',
  },
  fields: [
    {
      name: 'image',
      type: 'upload',
      displayPreview: true,
      relationTo: mediaSlug,
      required: true,
    },
    {
      name: 'caption',
      type: 'text',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'width',
          type: 'select',
          admin: {
            description: 'Controls how wide the image is on the public article page.',
          },
          defaultValue: 'medium',
          options: [
            {
              label: 'Full width',
              value: 'full',
            },
            {
              label: 'Large',
              value: 'large',
            },
            {
              label: 'Medium',
              value: 'medium',
            },
            {
              label: 'Small',
              value: 'small',
            },
            {
              label: 'Custom px',
              value: 'custom',
            },
          ],
        },
        {
          name: 'customWidth',
          type: 'number',
          admin: {
            description: 'Used when Width is Custom px. Allowed range: 160-1200.',
          },
          label: 'Custom width',
          max: 1200,
          min: 160,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'align',
          type: 'select',
          defaultValue: 'center',
          options: [
            {
              label: 'Left',
              value: 'left',
            },
            {
              label: 'Center',
              value: 'center',
            },
            {
              label: 'Right',
              value: 'right',
            },
          ],
        },
        {
          name: 'aspectRatio',
          type: 'select',
          admin: {
            description: 'Optional crop ratio. Natural keeps the original image proportions.',
          },
          defaultValue: 'natural',
          options: [
            {
              label: 'Natural',
              value: 'natural',
            },
            {
              label: '16:9',
              value: '16-9',
            },
            {
              label: '4:3',
              value: '4-3',
            },
            {
              label: '1:1',
              value: '1-1',
            },
          ],
        },
      ],
    },
  ],
} satisfies Block

export const imageRowBlock = {
  slug: 'imageRow',
  labels: {
    plural: 'Image rows',
    singular: 'Image row',
  },
  fields: [
    {
      name: 'images',
      type: 'array',
      admin: {
        description: 'Place 2-4 images in one responsive row on the public article page.',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          displayPreview: true,
          relationTo: mediaSlug,
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
        },
      ],
      maxRows: 4,
      minRows: 2,
      required: true,
    },
  ],
} satisfies Block

export const videoFields = (): Field[] => [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Shown under the player and used as VideoObject description.',
      },
    },
    {
      name: 'sourceType',
      type: 'select',
      defaultValue: 'url',
      options: [
        {
          label: 'External URL',
          value: 'url',
        },
        {
          label: 'Uploaded file',
          value: 'upload',
        },
      ],
      required: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'url',
          type: 'text',
          admin: {
            description: 'YouTube, Vimeo, direct MP4/WebM, or external landing URL.',
          },
          label: 'Video URL',
        },
        {
          name: 'upload',
          type: 'upload',
          admin: {
            description: 'Upload MP4/WebM/MOV in Media and use it as the video file.',
          },
          displayPreview: true,
          relationTo: mediaSlug,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'thumbnail',
          type: 'upload',
          displayPreview: true,
          relationTo: mediaSlug,
        },
        {
          name: 'thumbnailURL',
          type: 'text',
          admin: {
            description:
              'Optional external thumbnail. YouTube previews are detected automatically from the Video URL.',
          },
          label: 'Thumbnail URL',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'embedURL',
          type: 'text',
          admin: {
            description: 'Optional override for iframe embeds.',
          },
          label: 'Embed URL',
        },
        {
          name: 'contentURL',
          type: 'text',
          admin: {
            description: 'Optional direct file URL for VideoObject microdata.',
          },
          label: 'Content URL',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'duration',
          type: 'text',
          admin: {
            description: 'ISO 8601 duration for schema.org, for example PT15S.',
          },
          label: 'Duration',
        },
        {
          name: 'uploadDate',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayOnly',
            },
          },
          label: 'Upload date',
        },
      ],
    },
    {
      name: 'schema',
      type: 'group',
      admin: {
        description: 'Optional VideoObject overrides. Leave empty to use the visible fields above.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Schema name',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Schema description',
        },
      ],
      label: 'Video microdata',
    },
]

export const videoBlock = {
  slug: 'video',
  labels: {
    plural: 'Videos',
    singular: 'Video',
  },
  fields: videoFields(),
} satisfies Block

export const faqBlock = {
  slug: 'faq',
  labels: {
    plural: 'FAQ blocks',
    singular: 'FAQ block',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'FAQ',
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
        },
        {
          name: 'answer',
          type: 'textarea',
          required: true,
        },
      ],
      minRows: 1,
    },
  ],
} satisfies Block
