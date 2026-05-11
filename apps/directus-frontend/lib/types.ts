// Shared content model — identical across all CMS frontends so pages stay portable.
// Only lib/cms.ts changes between CMSs.

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  publishedAt: string | null;
  author: string | null;
};

export type PortfolioItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageUrls: string[];
  externalUrl: string | null;
  tags: string[];
};

export type BookingInput = {
  name: string;
  email: string;
  datetime: string;
  notes: string | null;
};
