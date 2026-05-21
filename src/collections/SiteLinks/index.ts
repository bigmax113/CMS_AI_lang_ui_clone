import type { CollectionConfig } from 'payload'

import { articlesSlug } from '../Articles'
import { blogPostsSlug } from '../BlogPosts'
import { sitesSlug } from '../Sites'

export const siteLinksSlug = 'site-links'

export const SiteLinksCollection: CollectionConfig = {
  slug: siteLinksSlug,
  admin: {
    defaultColumns: ['title', 'status', 'linkType', 'anchorText', 'updatedAt'],
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
      name: 'status',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      defaultValue: 'proposed',
      options: [
        {
          label: 'Proposed',
          value: 'proposed',
        },
        {
          label: 'Approved',
          value: 'approved',
        },
        {
          label: 'Live',
          value: 'live',
        },
        {
          label: 'Needs review',
          value: 'needs-review',
        },
        {
          label: 'Archived',
          value: 'archived',
        },
      ],
      required: true,
    },
    {
      name: 'linkType',
      type: 'select',
      defaultValue: 'contextual',
      options: [
        {
          label: 'Contextual content link',
          value: 'contextual',
        },
        {
          label: 'Navigation',
          value: 'navigation',
        },
        {
          label: 'CTA',
          value: 'cta',
        },
        {
          label: 'Redirect',
          value: 'redirect',
        },
        {
          label: 'Language switch',
          value: 'language-switch',
        },
        {
          label: 'Campaign transition',
          value: 'campaign-transition',
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
              type: 'row',
              fields: [
                {
                  name: 'sourceSite',
                  type: 'relationship',
                  relationTo: sitesSlug,
                  required: true,
                },
                {
                  name: 'targetSite',
                  type: 'relationship',
                  relationTo: sitesSlug,
                  required: true,
                },
              ],
            },
            {
              name: 'sourcePath',
              type: 'text',
              admin: {
                description: 'Source URL path if the link is not tied to a CMS document.',
              },
            },
            {
              name: 'sourceContent',
              type: 'relationship',
              admin: {
                description: 'Optional CMS document where the link should appear.',
              },
              relationTo: [articlesSlug, blogPostsSlug],
            },
            {
              name: 'targetURL',
              type: 'text',
              admin: {
                description: 'Final destination URL. Use a full URL for external sites.',
              },
            },
            {
              name: 'targetContent',
              type: 'relationship',
              admin: {
                description: 'Optional CMS document that the link should resolve to.',
              },
              relationTo: [articlesSlug, blogPostsSlug],
            },
          ],
          label: 'Route',
        },
        {
          fields: [
            {
              name: 'anchorText',
              type: 'text',
              admin: {
                description: 'Visible link text or CTA label.',
              },
              required: true,
            },
            {
              name: 'placement',
              type: 'select',
              defaultValue: 'body',
              options: [
                {
                  label: 'Body copy',
                  value: 'body',
                },
                {
                  label: 'Header navigation',
                  value: 'header',
                },
                {
                  label: 'Footer navigation',
                  value: 'footer',
                },
                {
                  label: 'Related content',
                  value: 'related',
                },
                {
                  label: 'Blog card',
                  value: 'blog-card',
                },
                {
                  label: 'Transition page',
                  value: 'transition-page',
                },
              ],
            },
            {
              name: 'priority',
              type: 'number',
              admin: {
                description: 'Lower numbers should be shown first in generated menus.',
              },
              defaultValue: 50,
              min: 0,
            },
            {
              name: 'editorNotes',
              type: 'textarea',
            },
          ],
          label: 'Editorial',
        },
        {
          name: 'transitionTemplate',
          fields: [
            {
              name: 'mode',
              type: 'select',
              defaultValue: 'direct',
              options: [
                {
                  label: 'Direct link',
                  value: 'direct',
                },
                {
                  label: 'Soft handoff',
                  value: 'soft-handoff',
                },
                {
                  label: 'Campaign bridge',
                  value: 'campaign-bridge',
                },
                {
                  label: 'Language selector',
                  value: 'language-selector',
                },
                {
                  label: 'Product bridge',
                  value: 'product-bridge',
                },
              ],
            },
            {
              name: 'headline',
              type: 'text',
            },
            {
              name: 'description',
              type: 'textarea',
            },
            {
              name: 'ctaLabel',
              type: 'text',
              defaultValue: 'Continue',
            },
            {
              name: 'preserveQueryParams',
              type: 'checkbox',
              admin: {
                description: 'Keep campaign and tracking parameters during transition.',
              },
              defaultValue: true,
            },
          ],
          label: 'Transition',
        },
        {
          name: 'aiReview',
          fields: [
            {
              name: 'rationale',
              type: 'textarea',
              admin: {
                description: 'AI/editor reason this link is useful.',
              },
            },
            {
              name: 'risk',
              type: 'select',
              defaultValue: 'low',
              options: [
                {
                  label: 'Low',
                  value: 'low',
                },
                {
                  label: 'Medium',
                  value: 'medium',
                },
                {
                  label: 'High',
                  value: 'high',
                },
              ],
            },
            {
              name: 'suggestedBy',
              type: 'text',
              defaultValue: 'editor',
            },
          ],
          label: 'AI Review',
        },
      ],
    },
  ],
}
