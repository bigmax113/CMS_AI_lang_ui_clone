import type { CollectionConfig } from 'payload'

import { articleLanguageOptions } from '@/lib/articleTranslations'

export const newsletterSubscriptionsSlug = 'newsletter-subscriptions'

export const NewsletterSubscriptionsCollection: CollectionConfig = {
  slug: newsletterSubscriptionsSlug,
  access: {
    create: () => true,
    read: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ['email', 'languageCode', 'status', 'updatedAt'],
    group: 'CMS',
    useAsTitle: 'email',
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      index: true,
      required: true,
    },
    {
      name: 'languageCode',
      type: 'select',
      defaultValue: 'en',
      options: [...articleLanguageOptions],
      required: true,
    },
    {
      name: 'sourceURL',
      type: 'text',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        {
          label: 'Active',
          value: 'active',
        },
        {
          label: 'Unsubscribed',
          value: 'unsubscribed',
        },
      ],
      required: true,
    },
    {
      name: 'lastSubmittedAt',
      type: 'date',
    },
  ],
}
