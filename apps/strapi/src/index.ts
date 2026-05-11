import type { Core } from '@strapi/strapi';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  // Grant the public role read access to blog-post + portfolio-item and create
  // access to booking. Idempotent — only inserts permissions that don't already
  // exist, so editing them later from the admin UI sticks.
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const publicRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });
    if (!publicRole) {
      strapi.log.warn('[bootstrap] Public role not found — skipping permission seed.');
      return;
    }

    const desired: string[] = [
      'api::blog-post.blog-post.find',
      'api::blog-post.blog-post.findOne',
      'api::portfolio-item.portfolio-item.find',
      'api::portfolio-item.portfolio-item.findOne',
      'api::booking.booking.create',
    ];

    for (const action of desired) {
      const existing = await strapi
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action, role: publicRole.id } });
      if (existing) continue;
      await strapi
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: publicRole.id } });
      strapi.log.info(`[bootstrap] granted public ${action}`);
    }
  },
};
