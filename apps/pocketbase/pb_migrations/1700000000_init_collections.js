/// <reference path="../pb_data/types.d.ts" />

// Idempotent: PocketBase tracks executed migrations by filename in _migrations.
// Re-running deploy won't double-create. Down rolls back the three collections.

migrate(
  (app) => {
    // ---- blog_post --------------------------------------------------------
    const blogPost = new Collection({
      name: "blog_post",
      type: "base",
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "title",        type: "text",   required: true },
        { name: "slug",         type: "text",   required: true, unique: true },
        { name: "excerpt",      type: "text" },
        { name: "body",         type: "editor", required: true },
        { name: "cover_image",  type: "file",   maxSelect: 1, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
        { name: "published_at", type: "date" },
        { name: "author",       type: "text" },
      ],
    });
    app.save(blogPost);

    // ---- portfolio_item ---------------------------------------------------
    const portfolio = new Collection({
      name: "portfolio_item",
      type: "base",
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "title",        type: "text",   required: true },
        { name: "slug",         type: "text",   required: true, unique: true },
        { name: "description",  type: "editor", required: true },
        { name: "images",       type: "file",   maxSelect: 10, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
        { name: "external_url", type: "url" },
        { name: "tags",         type: "json" },
      ],
    });
    app.save(portfolio);

    // ---- booking ----------------------------------------------------------
    const booking = new Collection({
      name: "booking",
      type: "base",
      listRule: null,
      viewRule: null,
      createRule: "",
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "name",     type: "text", required: true },
        { name: "email",    type: "email", required: true },
        { name: "datetime", type: "date", required: true },
        { name: "notes",    type: "text" },
        { name: "status",   type: "select", values: ["new", "confirmed", "cancelled"] },
      ],
    });
    app.save(booking);
  },
  (app) => {
    for (const name of ["blog_post", "portfolio_item", "booking"]) {
      try {
        const c = app.findCollectionByNameOrId(name);
        app.delete(c);
      } catch (_) {
        // collection doesn't exist — nothing to roll back
      }
    }
  },
);
