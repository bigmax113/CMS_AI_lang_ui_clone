import type { Block } from 'payload'

import { mediaSlug } from './Media'

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
    plural: 'Product cards',
    singular: 'Product card',
  },
  fields: [
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
  ],
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
