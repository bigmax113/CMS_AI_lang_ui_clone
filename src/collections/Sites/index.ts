import type { CollectionConfig } from 'payload'

export const sitesSlug = 'sites'

export const SitesCollection: CollectionConfig = {
  slug: sitesSlug,
  admin: {
    defaultColumns: ['name', 'status', 'primaryDomain', 'locale', 'updatedAt'],
    group: 'CMS',
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        description: 'Stable site key used by editors and link templates.',
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
      defaultValue: 'live',
      options: [
        {
          label: 'Draft',
          value: 'draft',
        },
        {
          label: 'Live',
          value: 'live',
        },
        {
          label: 'Paused',
          value: 'paused',
        },
        {
          label: 'Archived',
          value: 'archived',
        },
      ],
      required: true,
    },
    {
      name: 'primaryDomain',
      type: 'text',
      admin: {
        description: 'Canonical domain, for example example.com or blog.example.com.',
      },
      required: true,
    },
    {
      name: 'locale',
      type: 'select',
      defaultValue: 'en',
      options: [
        {
          label: 'English',
          value: 'en',
        },
        {
          label: 'Ukrainian',
          value: 'uk',
        },
        {
          label: 'Russian',
          value: 'ru',
        },
        {
          label: 'Romanian',
          value: 'ro',
        },
        {
          label: 'Polish',
          value: 'pl',
        },
        {
          label: 'Other',
          value: 'other',
        },
      ],
    },
    {
      name: 'siteRole',
      type: 'select',
      defaultValue: 'content-hub',
      options: [
        {
          label: 'Corporate',
          value: 'corporate',
        },
        {
          label: 'Content hub',
          value: 'content-hub',
        },
        {
          label: 'Store',
          value: 'store',
        },
        {
          label: 'Support',
          value: 'support',
        },
        {
          label: 'Regional',
          value: 'regional',
        },
      ],
    },
    {
      name: 'defaultBlogPath',
      type: 'text',
      admin: {
        description: 'Base path for generated blog URLs.',
      },
      defaultValue: '/blog',
    },
    {
      name: 'owner',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Editorial notes, launch dependencies, or routing constraints.',
      },
    },
  ],
}
