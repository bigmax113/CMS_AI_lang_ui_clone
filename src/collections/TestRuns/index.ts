import type { CollectionConfig } from 'payload'

import { aiProjectsSlug } from '../AIProjects'
import { promptTemplatesSlug } from '../PromptTemplates'

export const testRunsSlug = 'test-runs'

export const TestRunsCollection: CollectionConfig = {
  slug: testRunsSlug,
  admin: {
    defaultColumns: ['title', 'status', 'rating', 'ranAt'],
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
      type: 'row',
      fields: [
        {
          name: 'project',
          type: 'relationship',
          relationTo: aiProjectsSlug,
        },
        {
          name: 'promptTemplate',
          type: 'relationship',
          relationTo: promptTemplatesSlug,
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      defaultValue: 'new',
      options: [
        {
          label: 'New',
          value: 'new',
        },
        {
          label: 'Passed',
          value: 'passed',
        },
        {
          label: 'Needs review',
          value: 'needs-review',
        },
        {
          label: 'Failed',
          value: 'failed',
        },
      ],
      required: true,
    },
    {
      name: 'rating',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      options: [
        {
          label: 'Good',
          value: 'good',
        },
        {
          label: 'Okay',
          value: 'okay',
        },
        {
          label: 'Bad',
          value: 'bad',
        },
      ],
    },
    {
      name: 'ranAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
      defaultValue: () => new Date().toISOString(),
    },
    {
      name: 'question',
      type: 'textarea',
      required: true,
    },
    {
      name: 'answer',
      type: 'textarea',
      admin: {
        description: 'Paste the model answer here when saving a manual validation run.',
      },
    },
    {
      name: 'sources',
      type: 'array',
      fields: [
        {
          name: 'fileName',
          type: 'text',
          required: true,
        },
        {
          name: 'path',
          type: 'text',
        },
        {
          name: 'score',
          type: 'number',
        },
      ],
    },
    {
      name: 'reviewNotes',
      type: 'richText',
    },
  ],
}
