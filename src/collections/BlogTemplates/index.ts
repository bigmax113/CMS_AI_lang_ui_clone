import type { CollectionConfig } from 'payload'

export const blogTemplatesSlug = 'blog-templates'

export const BlogTemplatesCollection: CollectionConfig = {
  slug: blogTemplatesSlug,
  admin: {
    defaultColumns: ['title', 'templateType', 'status', 'updatedAt'],
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
      name: 'key',
      type: 'text',
      admin: {
        description: 'Reusable template key, for example buyer-guide or release-note.',
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
      defaultValue: 'active',
      options: [
        {
          label: 'Draft',
          value: 'draft',
        },
        {
          label: 'Active',
          value: 'active',
        },
        {
          label: 'Archived',
          value: 'archived',
        },
      ],
      required: true,
    },
    {
      name: 'templateType',
      type: 'select',
      defaultValue: 'guide',
      options: [
        {
          label: 'Guide',
          value: 'guide',
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
          label: 'Comparison',
          value: 'comparison',
        },
        {
          label: 'Release note',
          value: 'release-note',
        },
        {
          label: 'SEO cluster',
          value: 'seo-cluster',
        },
      ],
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'editorialGoal',
              type: 'textarea',
              admin: {
                description: 'What this template helps the editor produce.',
              },
              required: true,
            },
            {
              name: 'titlePattern',
              type: 'text',
              admin: {
                description: 'Suggested title formula, for example "How to choose {product}".',
              },
            },
            {
              name: 'summaryPattern',
              type: 'textarea',
              admin: {
                description: 'Reusable summary guidance for cards and search previews.',
              },
            },
            {
              name: 'structure',
              type: 'array',
              fields: [
                {
                  name: 'sectionTitle',
                  type: 'text',
                  required: true,
                },
                {
                  name: 'sectionRole',
                  type: 'select',
                  defaultValue: 'body',
                  options: [
                    {
                      label: 'Intro',
                      value: 'intro',
                    },
                    {
                      label: 'Body',
                      value: 'body',
                    },
                    {
                      label: 'Proof',
                      value: 'proof',
                    },
                    {
                      label: 'CTA',
                      value: 'cta',
                    },
                    {
                      label: 'FAQ',
                      value: 'faq',
                    },
                    {
                      label: 'Related links',
                      value: 'related-links',
                    },
                  ],
                },
                {
                  name: 'instructions',
                  type: 'textarea',
                },
                {
                  name: 'isRequired',
                  type: 'checkbox',
                  defaultValue: true,
                },
              ],
              labels: {
                plural: 'Sections',
                singular: 'Section',
              },
            },
          ],
          label: 'Template',
        },
        {
          fields: [
            {
              name: 'requiredInternalLinks',
              type: 'number',
              admin: {
                description: 'Minimum number of same-site links expected in the post.',
              },
              defaultValue: 2,
              min: 0,
            },
            {
              name: 'requiredCrossSiteLinks',
              type: 'number',
              admin: {
                description: 'Minimum number of approved links to other managed sites.',
              },
              defaultValue: 1,
              min: 0,
            },
            {
              name: 'anchorTextGuidance',
              type: 'textarea',
              admin: {
                description: 'Rules for natural anchors, product names, and avoided phrasing.',
              },
            },
            {
              name: 'relatedContentStrategy',
              type: 'textarea',
              admin: {
                description: 'How this template should connect posts, articles, and site hubs.',
              },
            },
          ],
          label: 'Linking',
        },
        {
          name: 'aiPrompts',
          fields: [
            {
              name: 'briefPrompt',
              type: 'textarea',
              admin: {
                description: 'Prompt used to turn business requirements into a blog brief.',
              },
            },
            {
              name: 'outlinePrompt',
              type: 'textarea',
              admin: {
                description: 'Prompt used to draft the article outline.',
              },
            },
            {
              name: 'linkingPrompt',
              type: 'textarea',
              admin: {
                description: 'Prompt used to suggest internal and cross-site links.',
              },
            },
          ],
          label: 'AI Prompts',
        },
        {
          name: 'seo',
          fields: [
            {
              name: 'metaTitlePattern',
              type: 'text',
              maxLength: 70,
            },
            {
              name: 'metaDescriptionPattern',
              type: 'textarea',
              maxLength: 160,
            },
            {
              name: 'keywordGuidance',
              type: 'textarea',
            },
          ],
          label: 'SEO',
        },
      ],
    },
  ],
}
