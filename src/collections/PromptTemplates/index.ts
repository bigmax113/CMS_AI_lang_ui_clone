import type { CollectionConfig } from 'payload'

export const promptTemplatesSlug = 'prompt-templates'

export const PromptTemplatesCollection: CollectionConfig = {
  slug: promptTemplatesSlug,
  admin: {
    defaultColumns: ['title', 'mode', 'isEnabled', 'updatedAt'],
    group: 'AI Workbench',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'isEnabled',
      type: 'checkbox',
      admin: {
        position: 'sidebar',
      },
      defaultValue: true,
    },
    {
      name: 'mode',
      type: 'select',
      defaultValue: 'qa',
      options: [
        {
          label: 'Question answering',
          value: 'qa',
        },
        {
          label: 'Summary',
          value: 'summary',
        },
        {
          label: 'Audit',
          value: 'audit',
        },
        {
          label: 'Content draft',
          value: 'draft',
        },
      ],
      required: true,
    },
    {
      name: 'systemPrompt',
      type: 'textarea',
      admin: {
        description:
          'Stable model behavior: role, language policy, source policy, and safety rules.',
      },
      required: true,
    },
    {
      name: 'userPrompt',
      type: 'textarea',
      admin: {
        description:
          'Reusable prompt text. Testers can copy it into the Workbench question editor.',
      },
      required: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'maxChunks',
          type: 'number',
          defaultValue: 8,
          max: 20,
          min: 1,
        },
        {
          name: 'temperature',
          type: 'number',
          defaultValue: 0.2,
          max: 1,
          min: 0,
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
  ],
}
