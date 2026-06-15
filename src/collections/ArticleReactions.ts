import type { CollectionConfig } from 'payload'

export const articleReactionsSlug = 'article-reactions'

export const ArticleReactionsCollection: CollectionConfig = {
  slug: articleReactionsSlug,
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ['articleSlug', 'reactionType', 'count', 'updatedAt'],
    group: 'CMS',
    useAsTitle: 'articleSlug',
  },
  fields: [
    {
      name: 'articleSlug',
      type: 'text',
      index: true,
      required: true,
    },
    {
      name: 'reactionType',
      type: 'select',
      index: true,
      options: [
        {
          label: 'Like',
          value: 'like',
        },
        {
          label: 'Discuss',
          value: 'discuss',
        },
      ],
      required: true,
    },
    {
      name: 'count',
      type: 'number',
      defaultValue: 0,
      min: 0,
      required: true,
    },
    {
      name: 'lastReactedAt',
      type: 'date',
    },
  ],
}
