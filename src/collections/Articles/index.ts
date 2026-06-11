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
import { articlePreviewPath } from '../../lib/articlePreview'
import { cleanArticleText, excerptArticleText, slugifyArticleTitle } from '../../lib/articleFields'

export const articlesSlug = 'articles'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const fallbackSummaryFromContent = (content: unknown, title?: string) => {
  const summary = excerptArticleText(content, 520)

  if (summary && summary !== title) {
    return summary
  }

  return undefined
}

const fallbackSEODescription = ({
  content,
  summary,
  title,
}: {
  content: unknown
  summary?: string
  title?: string
}) => {
  const candidate = summary || fallbackSummaryFromContent(content, title)

  if (candidate && candidate !== title) {
    return candidate
  }

  return title ? `Read the full article: ${title}.` : undefined
}

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
  access: {
    read: ({ req }) => {
      if (req.user) {
        return true
      }

      return {
        status: {
          equals: 'published',
        },
      }
    },
  },
  defaultSort: '-createdAt',
  admin: {
    components: {
      beforeList: ['/admin/components/ArticleTranslationToolbar#ArticleTranslationToolbar'],
    },
    defaultColumns: ['title', 'languageCode', 'status', 'createdAt', 'updatedAt'],
    group: 'CMS',
    preview: (doc, { req }) => {
      if (typeof doc.slug !== 'string') {
        return null
      }

      if (doc.status === 'published') {
        return absolutePublicURL(articlePublicPath(doc.slug), req)
      }

      const id = typeof doc.id === 'number' || typeof doc.id === 'string' ? doc.id : null

      return absolutePublicURL(articlePreviewPath({ id, slug: doc.slug }), req)
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

        const nextData = { ...data }
        const originalSEO = isRecord(originalDoc?.seo) ? originalDoc.seo : {}
        const inputSEO = isRecord(nextData.seo) ? { ...nextData.seo } : undefined
        const title = cleanArticleText(nextData.title) || cleanArticleText(originalDoc?.title)
        const summary =
          cleanArticleText(nextData.summary) ||
          cleanArticleText(originalDoc?.summary) ||
          fallbackSummaryFromContent(nextData.content || originalDoc?.content, title)

        if (!cleanArticleText(nextData.slug) && !cleanArticleText(originalDoc?.slug) && title) {
          nextData.slug = slugifyArticleTitle(title)
        }

        if (!cleanArticleText(nextData.summary) && summary) {
          nextData.summary = summary
        }

        if (nextData.status === 'published' && !nextData.publishedAt && !originalDoc?.publishedAt) {
          nextData.publishedAt = new Date().toISOString()
        }

        const seoTitle = cleanArticleText(inputSEO?.title) || cleanArticleText(originalSEO.title)
        const seoDescription =
          cleanArticleText(inputSEO?.description) || cleanArticleText(originalSEO.description)
        let nextSEO = inputSEO

        if (!seoTitle && title) {
          nextSEO ||= {}
          nextSEO.title = title
        }

        if (!seoDescription) {
          const description = fallbackSEODescription({
            content: nextData.content || originalDoc?.content,
            summary,
            title,
          })

          if (description) {
            nextSEO ||= {}
            nextSEO.description = description
          }
        } else if (seoDescription === seoTitle || seoDescription === title) {
          const description = fallbackSEODescription({
            content: nextData.content || originalDoc?.content,
            summary,
            title,
          })

          if (description && description !== seoDescription) {
            nextSEO ||= {}
            nextSEO.description = description
          }
        }

        if (nextSEO) {
          nextData.seo = nextSEO
        }

        const currentArticle = {
          ...originalDoc,
          ...nextData,
        }

        return {
          ...nextData,
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
      name: 'previewUrl',
      type: 'text',
      admin: {
        description: 'Fast preview link for drafts and review items. The Payload Preview button opens the same URL.',
        position: 'sidebar',
        readOnly: true,
      },
      hooks: {
        afterRead: [
          ({ data, req }) => {
            if (!data?.id || typeof data.slug !== 'string') {
              return 'Save this article once to get a preview URL.'
            }

            return absolutePublicURL(articlePreviewPath({ id: data.id, slug: data.slug }), req)
          },
        ],
      },
      label: 'Preview URL',
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
                description: 'Short intro shown in cards, search results, and previews. Imported summaries are kept in full.',
              },
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
              access: {
                read: ({ req }) => Boolean(req.user),
              },
              admin: {
                description: 'Business owner or department responsible for this article.',
              },
            },
            {
              name: 'legacySource',
              type: 'group',
              access: {
                read: ({ req }) => Boolean(req.user),
              },
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
          access: {
            read: ({ req }) => Boolean(req.user),
          },
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
              name: 'canonicalURL',
              type: 'text',
              admin: {
                description:
                  'Optional canonical URL override. Leave empty to use the generated public article URL.',
              },
              label: 'Canonical URL',
            },
            {
              name: 'title',
              type: 'text',
              admin: {
                description: 'SEO title. No hard character limit: keep it as long as the source or SEO team requires.',
              },
            },
            {
              name: 'description',
              type: 'textarea',
              admin: {
                description: 'SEO description. No hard character limit: existing WP text is preserved in full.',
              },
            },
            {
              name: 'image',
              type: 'upload',
              displayPreview: true,
              relationTo: mediaSlug,
            },
            {
              type: 'collapsible',
              fields: [
                {
                  name: 'ogTitle',
                  type: 'text',
                  admin: {
                    description: 'Optional Open Graph title. Leave empty to use SEO title.',
                  },
                  label: 'OG title',
                },
                {
                  name: 'ogDescription',
                  type: 'textarea',
                  admin: {
                    description: 'Optional Open Graph description. Leave empty to use SEO description.',
                  },
                  label: 'OG description',
                },
                {
                  name: 'twitterTitle',
                  type: 'text',
                  admin: {
                    description: 'Optional Twitter/X Card title. Leave empty to use OG or SEO title.',
                  },
                  label: 'Twitter title',
                },
                {
                  name: 'twitterDescription',
                  type: 'textarea',
                  admin: {
                    description: 'Optional Twitter/X Card description. Leave empty to use OG or SEO description.',
                  },
                  label: 'Twitter description',
                },
              ],
              label: 'Social metadata overrides',
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
