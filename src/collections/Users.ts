import type { CollectionConfig } from 'payload'

export const usersSlug = 'users'

export const Users: CollectionConfig = {
  slug: usersSlug,
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
