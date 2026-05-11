import type { CollectionConfig } from 'payload'

export const PortfolioItems: CollectionConfig = {
  slug: 'portfolio-items',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'externalUrl'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'title',       type: 'text',     required: true },
    { name: 'slug',        type: 'text',     required: true, unique: true, index: true },
    { name: 'description', type: 'richText', required: true },
    {
      name: 'images',
      type: 'array',
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
    },
    { name: 'externalUrl', type: 'text' },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'value', type: 'text', required: true }],
    },
  ],
}
