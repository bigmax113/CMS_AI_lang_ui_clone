import type { CollectionConfig } from 'payload'

export const aiProjectsSlug = 'ai-projects'

export const AIProjectsCollection: CollectionConfig = {
  slug: aiProjectsSlug,
  admin: {
    defaultColumns: ['name', 'status', 'owner', 'updatedAt'],
    group: 'AI Workbench',
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      defaultValue: 'testing',
      options: [
        {
          label: 'Planning',
          value: 'planning',
        },
        {
          label: 'Testing',
          value: 'testing',
        },
        {
          label: 'Ready',
          value: 'ready',
        },
        {
          label: 'Paused',
          value: 'paused',
        },
      ],
      required: true,
    },
    {
      name: 'owner',
      type: 'text',
      admin: {
        description: 'Person or team responsible for validating this workspace.',
      },
    },
    {
      name: 'goal',
      type: 'textarea',
      admin: {
        description: 'What the tester should be able to prove with this AI workspace.',
      },
      required: true,
    },
    {
      name: 'docsFolder',
      type: 'text',
      admin: {
        description: 'Suggested folder under AI_DOCS_DIR, for example Manuals/B2B.',
      },
    },
    {
      name: 'defaultModel',
      type: 'select',
      defaultValue: 'grok-4.3',
      options: [
        {
          label: 'Grok 4.3',
          value: 'grok-4.3',
        },
        {
          label: 'Grok 4',
          value: 'grok-4',
        },
        {
          label: 'Grok 3',
          value: 'grok-3',
        },
      ],
    },
    {
      name: 'successCriteria',
      type: 'array',
      fields: [
        {
          name: 'criterion',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'notes',
      type: 'richText',
      admin: {
        description: 'Internal notes for the tester or editor.',
      },
    },
  ],
}
