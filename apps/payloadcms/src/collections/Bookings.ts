import type { CollectionConfig } from 'payload'

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'datetime', 'status'],
  },
  access: {
    // Public form submits these — anyone can create.
    create: () => true,
    // Only authenticated users (admins) read/update/delete the inbox.
    read:   ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    { name: 'name',     type: 'text',     required: true },
    { name: 'email',    type: 'email',    required: true },
    { name: 'datetime', type: 'date',     required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'notes',    type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      required: true,
      options: [
        { label: 'New',       value: 'new' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
  ],
}
