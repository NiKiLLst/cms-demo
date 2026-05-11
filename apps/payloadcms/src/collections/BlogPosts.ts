import type { CollectionConfig } from 'payload'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'publishedAt', 'author'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'title',       type: 'text',     required: true },
    { name: 'slug',        type: 'text',     required: true, unique: true, index: true },
    { name: 'excerpt',     type: 'textarea' },
    { name: 'body',        type: 'richText', required: true },
    { name: 'coverImage',  type: 'upload',   relationTo: 'media' },
    { name: 'publishedAt', type: 'date' },
    { name: 'author',      type: 'text' },
  ],
}
