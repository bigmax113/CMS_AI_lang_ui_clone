import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

describe('API', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })

  it('exposes blog and cross-site linking collections', () => {
    const collectionSlugs = payload.config.collections.map((collection) => collection.slug)

    expect(collectionSlugs).toContain('sites')
    expect(collectionSlugs).toContain('blog-templates')
    expect(collectionSlugs).toContain('blog-posts')
    expect(collectionSlugs).toContain('site-links')
  })

  it('uses the custom admin dashboard continuation', () => {
    expect(payload.config.admin.components.beforeDashboard).toContain(
      '/admin/components/AdminDashboard#AdminDashboard',
    )
  })
})
