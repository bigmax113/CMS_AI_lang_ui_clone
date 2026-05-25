import type { CollectionConfig } from 'payload'

import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { mediaSlug } from '../Media'

export const authorsSlug = 'authors'

export const AuthorsCollection: CollectionConfig = {
  slug: authorsSlug,
  access: {
    read: () => true,
  },
  admin: {
    defaultColumns: ['name', 'role', 'status', 'updatedAt'],
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
        description: 'Stable author URL/key for integrations. Optional for the prototype.',
        position: 'sidebar',
      },
      index: true,
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
          label: 'Active',
          value: 'active',
        },
        {
          label: 'Hidden',
          value: 'hidden',
        },
      ],
      required: true,
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: mediaSlug,
    },
    {
      name: 'role',
      type: 'text',
      admin: {
        description: 'Job title, department, or editorial role.',
      },
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      admin: {
        description: 'Shown in the author block at the top of an article.',
      },
      label: 'Short description',
      maxLength: 360,
    },
    {
      name: 'bio',
      type: 'richText',
      admin: {
        description: 'Longer internal or public author biography.',
      },
      editor: lexicalEditor(),
    },
    {
      name: 'links',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
        },
        {
          name: 'url',
          type: 'text',
        },
      ],
      labels: {
        plural: 'Links',
        singular: 'Link',
      },
    },
  ],
}
