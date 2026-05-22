import type { Block, CollectionConfig } from 'payload'

import {
  BlocksFeature,
  CodeBlock,
  EXPERIMENTAL_TableFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { absolutePublicURL, articlePublicPath } from '../../lib/publicURLs'
import { mediaSlug } from '../Media'

export const articlesSlug = 'articles'

const calloutBlock = {
  slug: 'callout',
  labels: {
    singular: 'Callout',
    plural: 'Callouts',
  },
  fields: [
    {
      name: 'tone',
      type: 'select',
      defaultValue: 'info',
      options: [
        {
          label: 'Info',
          value: 'info',
        },
        {
          label: 'Warning',
          value: 'warning',
        },
        {
          label: 'Success',
          value: 'success',
        },
      ],
    },
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'body',
      type: 'textarea',
    },
  ],
} satisfies Block

export const ArticlesCollection: CollectionConfig = {
  slug: articlesSlug,
  admin: {
    defaultColumns: ['title', 'status', 'category', 'updatedAt'],
    group: 'CMS',
    preview: (doc, { req }) => {
      if (doc.status !== 'published' || typeof doc.slug !== 'string') {
        return null
      }

      return absolutePublicURL(articlePublicPath(doc.slug), req)
    },
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        description: 'Human-readable URL segment, for example: product-visibility-guide.',
        position: 'sidebar',
      },
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'status',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      defaultValue: 'draft',
      options: [
        {
          label: 'Draft',
          value: 'draft',
        },
        {
          label: 'In review',
          value: 'review',
        },
        {
          label: 'Published',
          value: 'published',
        },
      ],
      required: true,
    },
    {
      name: 'publicUrl',
      type: 'text',
      admin: {
        description: 'Frontend link. It works after status is Published.',
        position: 'sidebar',
        readOnly: true,
      },
      hooks: {
        afterRead: [
          ({ data, req }) => {
            if (data?.status !== 'published' || typeof data.slug !== 'string') {
              return 'Set status to Published and save to get the public URL.'
            }

            return absolutePublicURL(articlePublicPath(data.slug), req)
          },
        ],
      },
      label: 'Public URL',
      virtual: true,
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'summary',
              type: 'textarea',
              admin: {
                description: 'Short intro shown in cards, search results, and previews.',
              },
              maxLength: 320,
            },
            {
              name: 'coverImage',
              type: 'upload',
              relationTo: mediaSlug,
            },
            {
              name: 'content',
              type: 'richText',
              admin: {
                description:
                  'Lexical editor: headings, lists, links, uploads, tables, inline toolbar, and structured blocks.',
              },
              editor: lexicalEditor({
                features: ({ defaultFeatures }) => [
                  ...defaultFeatures,
                  FixedToolbarFeature(),
                  InlineToolbarFeature(),
                  EXPERIMENTAL_TableFeature(),
                  BlocksFeature({
                    blocks: [
                      calloutBlock,
                      CodeBlock({
                        defaultLanguage: 'plaintext',
                        languages: {
                          json: 'JSON',
                          plaintext: 'Plain Text',
                          ts: 'TypeScript',
                        },
                      }),
                    ],
                  }),
                ],
              }),
              required: true,
            },
          ],
          label: 'Content',
        },
        {
          fields: [
            {
              name: 'category',
              type: 'select',
              options: [
                {
                  label: 'Product content',
                  value: 'product-content',
                },
                {
                  label: 'Internal guide',
                  value: 'internal-guide',
                },
                {
                  label: 'Release note',
                  value: 'release-note',
                },
                {
                  label: 'Knowledge base',
                  value: 'knowledge-base',
                },
              ],
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
              name: 'owner',
              type: 'text',
              admin: {
                description: 'Business owner or department responsible for this article.',
              },
            },
          ],
          label: 'Settings',
        },
        {
          name: 'seo',
          fields: [
            {
              name: 'title',
              type: 'text',
              maxLength: 70,
            },
            {
              name: 'description',
              type: 'textarea',
              maxLength: 160,
            },
            {
              name: 'image',
              type: 'upload',
              relationTo: mediaSlug,
            },
          ],
          label: 'SEO',
        },
      ],
    },
  ],
  versions: {
    drafts: {
      autosave: {
        interval: 1_500,
      },
    },
    maxPerDoc: 20,
  },
}
