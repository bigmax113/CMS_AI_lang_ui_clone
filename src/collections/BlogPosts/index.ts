import type { Block, CollectionConfig } from 'payload'

import {
  BlocksFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { articlesSlug } from '../Articles'
import { blogTemplatesSlug } from '../BlogTemplates'
import { mediaSlug } from '../Media'
import { sitesSlug } from '../Sites'

export const blogPostsSlug = 'blog-posts'

const crossSiteCtaBlock = {
  slug: 'crossSiteCta',
  labels: {
    plural: 'Cross-site CTAs',
    singular: 'Cross-site CTA',
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'url',
      type: 'text',
      required: true,
    },
    {
      name: 'targetSite',
      type: 'relationship',
      relationTo: sitesSlug,
    },
  ],
} satisfies Block

export const BlogPostsCollection: CollectionConfig = {
  slug: blogPostsSlug,
  admin: {
    defaultColumns: ['title', 'status', 'site', 'template', 'updatedAt'],
    group: 'CMS',
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
        description: 'Post URL segment under the selected site blog path.',
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
          label: 'Idea',
          value: 'idea',
        },
        {
          label: 'Draft',
          value: 'draft',
        },
        {
          label: 'In review',
          value: 'review',
        },
        {
          label: 'Scheduled',
          value: 'scheduled',
        },
        {
          label: 'Published',
          value: 'published',
        },
      ],
      required: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'site',
          type: 'relationship',
          relationTo: sitesSlug,
          required: true,
        },
        {
          name: 'template',
          type: 'relationship',
          relationTo: blogTemplatesSlug,
        },
      ],
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
                description: 'Short intro for cards, indexes, and AI source previews.',
              },
              maxLength: 360,
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
                  'Main blog body with inline tools and a reusable cross-site CTA block.',
              },
              editor: lexicalEditor({
                features: ({ defaultFeatures }) => [
                  ...defaultFeatures,
                  FixedToolbarFeature(),
                  InlineToolbarFeature(),
                  BlocksFeature({
                    blocks: [crossSiteCtaBlock],
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
                  label: 'Buying guide',
                  value: 'buying-guide',
                },
                {
                  label: 'Product education',
                  value: 'product-education',
                },
                {
                  label: 'News',
                  value: 'news',
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
            },
            {
              name: 'audience',
              type: 'select',
              defaultValue: 'customer',
              options: [
                {
                  label: 'Customer',
                  value: 'customer',
                },
                {
                  label: 'Partner',
                  value: 'partner',
                },
                {
                  label: 'Internal editor',
                  value: 'internal-editor',
                },
                {
                  label: 'Support',
                  value: 'support',
                },
              ],
            },
            {
              name: 'owner',
              type: 'text',
              admin: {
                description: 'Business owner or editor responsible for the post.',
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
          label: 'Settings',
        },
        {
          fields: [
            {
              name: 'canonicalURL',
              type: 'text',
              admin: {
                description: 'Optional canonical URL when the article is syndicated.',
              },
            },
            {
              name: 'relatedArticles',
              type: 'relationship',
              hasMany: true,
              relationTo: articlesSlug,
            },
            {
              name: 'relatedPosts',
              type: 'relationship',
              hasMany: true,
              relationTo: blogPostsSlug,
            },
            {
              name: 'linkPlan',
              type: 'relationship',
              admin: {
                description: 'Approved or proposed links this post should use.',
              },
              hasMany: true,
              relationTo: 'site-links',
            },
          ],
          label: 'Links',
        },
        {
          name: 'aiAssist',
          fields: [
            {
              name: 'brief',
              type: 'textarea',
              admin: {
                description: 'Business brief for AI-assisted drafting.',
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
              name: 'linkingNotes',
              type: 'textarea',
              admin: {
                description: 'AI or editor notes for where links should appear in the post.',
              },
            },
          ],
          label: 'AI Brief',
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
