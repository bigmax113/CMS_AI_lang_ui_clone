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
import {
  articleLanguageOptions,
  articleTranslationGroupFromArticle,
  inferArticleLanguageCode,
} from '../../lib/articleTranslations'
import { authorsSlug } from '../Authors'
import { mediaSlug } from '../Media'
import {
  faqBlock,
  htmlEmbedBlock,
  imageBlock,
  imageRowBlock,
  productCardBlock,
  productCardCarouselBlock,
  videoBlock,
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
    defaultColumns: ['title', 'languageCode', 'status', 'category', 'updatedAt'],
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
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) {
          return data
        }

        const currentArticle = {
          ...originalDoc,
          ...data,
        }

        return {
          ...data,
          languageCode: inferArticleLanguageCode(currentArticle),
          translationGroup: articleTranslationGroupFromArticle(currentArticle),
        }
      },
    ],
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
      name: 'languageCode',
      type: 'select',
      admin: {
        description: 'Language of this article. Used by public language switching and AI translation grouping.',
        position: 'sidebar',
      },
      defaultValue: 'en',
      index: true,
      label: 'Language',
      options: [...articleLanguageOptions],
      required: true,
    },
    {
      name: 'translationGroup',
      type: 'text',
      admin: {
        description:
          'Same value links all language versions of one article. AI translations inherit it automatically.',
        position: 'sidebar',
      },
      index: true,
      label: 'Translation group',
    },
    {
      name: 'translationLinks',
      type: 'ui',
      admin: {
        components: {
          Field: '/admin/components/ArticleTranslationLinks#ArticleTranslationLinks',
        },
        position: 'sidebar',
      },
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
              displayPreview: true,
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
                      imageBlock,
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
            {
              name: 'legacySource',
              type: 'group',
              admin: {
                description: 'Read-only migration metadata from the source publishing system.',
              },
              fields: [
                {
                  name: 'platform',
                  type: 'text',
                  admin: {
                    readOnly: true,
                  },
                  label: 'Source platform',
                },
                {
                  name: 'site',
                  type: 'text',
                  admin: {
                    readOnly: true,
                  },
                  label: 'Source site',
                },
                {
                  name: 'wpPostID',
                  type: 'number',
                  admin: {
                    readOnly: true,
                  },
                  label: 'WP post ID',
                },
                {
                  name: 'wpURL',
                  type: 'text',
                  admin: {
                    readOnly: true,
                  },
                  index: true,
                  label: 'WP URL',
                },
                {
                  name: 'importedAt',
                  type: 'date',
                  admin: {
                    readOnly: true,
                  },
                  label: 'Imported at',
                },
              ],
              label: 'Legacy source',
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
              displayPreview: true,
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
