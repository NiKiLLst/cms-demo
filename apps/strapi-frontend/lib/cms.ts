// Strapi REST adapter. Strapi auto-pluralizes content-type names in routes:
// api::blog-post.blog-post → /api/blog-posts. Public role must permit:
// find + findOne on blog-post + portfolio-item, create on booking.

import type { BlogPost, BookingInput, PortfolioItem } from "./types";

const BASE = process.env.CMS_URL ?? "http://strapi-admin.nerdass.org";

type StrapiMedia = {
  url: string;
} | null;

type StrapiItem<T> = T & {
  id: number;
  documentId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type StrapiList<T> = {
  data: StrapiItem<T>[];
  meta: unknown;
};

async function strapiGet<T>(path: string): Promise<StrapiList<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Strapi GET ${path} → ${res.status}`);
  return (await res.json()) as StrapiList<T>;
}

type RawBlogPost = {
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImage: StrapiMedia;
  author: string | null;
};

type RawPortfolioItem = {
  title: string;
  slug: string;
  description: string;
  images: { url: string }[] | null;
  externalUrl: string | null;
  tags: string[] | null;
};

function abs(url: string | undefined | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE}${url}`;
}

function mapBlog(raw: StrapiItem<RawBlogPost>): BlogPost {
  return {
    id: raw.documentId ?? String(raw.id),
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt ?? null,
    body: raw.body,
    coverImageUrl: abs(raw.coverImage?.url ?? null),
    publishedAt: raw.publishedAt,
    author: raw.author ?? null,
  };
}

function mapPortfolio(raw: StrapiItem<RawPortfolioItem>): PortfolioItem {
  return {
    id: raw.documentId ?? String(raw.id),
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    imageUrls: (raw.images ?? [])
      .map((m) => abs(m.url))
      .filter((v): v is string => v !== null),
    externalUrl: raw.externalUrl ?? null,
    tags: raw.tags ?? [],
  };
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  const json = await strapiGet<RawBlogPost>(
    "/api/blog-posts?populate=coverImage&sort=publishedAt:desc",
  );
  return json.data.map(mapBlog);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const json = await strapiGet<RawBlogPost>(
    `/api/blog-posts?populate=coverImage&filters[slug][$eq]=${encodeURIComponent(slug)}`,
  );
  return json.data[0] ? mapBlog(json.data[0]) : null;
}

export async function listPortfolioItems(): Promise<PortfolioItem[]> {
  const json = await strapiGet<RawPortfolioItem>(
    "/api/portfolio-items?populate=images&sort=createdAt:desc",
  );
  return json.data.map(mapPortfolio);
}

export async function getPortfolioItem(slug: string): Promise<PortfolioItem | null> {
  const json = await strapiGet<RawPortfolioItem>(
    `/api/portfolio-items?populate=images&filters[slug][$eq]=${encodeURIComponent(slug)}`,
  );
  return json.data[0] ? mapPortfolio(json.data[0]) : null;
}

export async function createBooking(input: BookingInput): Promise<void> {
  const res = await fetch(`${BASE}/api/bookings`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      data: {
        name: input.name,
        email: input.email,
        datetime: input.datetime,
        notes: input.notes,
        status: "new",
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strapi POST /api/bookings → ${res.status}: ${text}`);
  }
}

export const CMS_NAME = process.env.CMS_NAME ?? "Strapi";
