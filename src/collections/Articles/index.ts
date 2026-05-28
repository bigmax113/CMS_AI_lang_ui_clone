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
import { authorsSlug } from '../Authors'
import { mediaSlug } from '../Media'
import {
  faqBlock,
  htmlEmbedBlock,
  imageRowBlock,
  productCardBlock,
  productCardCarouselBlock,
  videoBlock,
  videoFields,
} from '../contentBlocks'

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
    components: {
      beforeList: ['/admin/components/ArticleTranslationToolbar#ArticleTranslationToolbar'],
    },
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
  labels: {
    plural: 'Content / Articles',
    singular: 'Content item',
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
      name: 'contentType',
      type: 'select',
      admin: {
        description: 'Unified editorial type. Use one collection for articles, blog posts, guides, news, and knowledge base content.',
        position: 'sidebar',
      },
      defaultValue: 'article',
      label: 'Content type',
      options: [
        {
          label: 'Article',
          value: 'article',
        },
        {
          label: 'Blog post',
          value: 'blog-post',
        },
        {
          label: 'News',
          value: 'news',
        },
        {
          label: 'Guide',
          value: 'guide',
        },
        {
          label: 'Case study',
          value: 'case-study',
        },
        {
          label: 'Knowledge base',
          value: 'knowledge-base',
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
              name: 'authors',
              type: 'relationship',
              admin: {
                description: 'Choose one or more authors from the Authors module. They are shown at the top of the public material.',
              },
              hasMany: true,
              relationTo: authorsSlug,
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
                      htmlEmbedBlock,
                      imageRowBlock,
                      productCardBlock,
                      productCardCarouselBlock,
                      videoBlock,
                      faqBlock,
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
            {
              name: 'videos',
              type: 'array',
              admin: {
                description:
                  'Add article videos here when inserting video inside the rich-text editor is inconvenient. Supports YouTube/Vimeo/direct URLs and uploaded MP4/WebM/MOV files.',
              },
              fields: videoFields(),
              label: 'Article videos',
              labels: {
                plural: 'Article videos',
                singular: 'Article video',
              },
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
          name: 'aiAssist',
          fields: [
            {
              name: 'brief',
              type: 'textarea',
              admin: {
                description: 'Business brief for AI article generation.',
              },
            },
            {
              name: 'targetKeywords',
              type: 'array',
              fields: [
                {
                  name: 'keyword',
                  type: 'text',
                },
              ],
            },
            {
              name: 'questionsToAnswer',
              type: 'array',
              fields: [
                {
                  name: 'question',
                  type: 'text',
                },
              ],
            },
            {
              name: 'editorialNotes',
              type: 'textarea',
              admin: {
                description:
                  'Notes for tone, products, internal links, or sections that the AI draft must include.',
              },
            },
          ],
          label: 'AI Draft',
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
