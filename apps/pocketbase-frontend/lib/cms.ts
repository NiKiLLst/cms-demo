// PocketBase REST adapter. The only file that knows we're talking to PocketBase.
// Collection rules must permit: listRule="" + viewRule="" on blog_post + portfolio_item,
// createRule="" on booking.

import type { BlogPost, BookingInput, PortfolioItem } from "./types";

const BASE = process.env.CMS_URL ?? "http://pocketbase-admin.nerdass.org";

type PBListResponse<T> = { items: T[]; totalItems: number };

async function pbGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PocketBase GET ${path} → ${res.status}`);
  return (await res.json()) as T;
}

type RawBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_image: string;
  published_at: string;
  author: string;
  collectionId: string;
};

type RawPortfolioItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  images: string[];
  external_url: string;
  tags: string[];
  collectionId: string;
};

function fileUrl(
  record: { id: string; collectionId: string },
  filename: string | null,
): string | null {
  if (!filename) return null;
  return `${BASE}/api/files/${record.collectionId}/${record.id}/${filename}`;
}

function mapBlog(raw: RawBlogPost): BlogPost {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt || null,
    body: raw.body,
    coverImageUrl: fileUrl(raw, raw.cover_image || null),
    publishedAt: raw.published_at || null,
    author: raw.author || null,
  };
}

function mapPortfolio(raw: RawPortfolioItem): PortfolioItem {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    imageUrls: (raw.images ?? [])
      .map((name) => fileUrl(raw, name))
      .filter((v): v is string => v !== null),
    externalUrl: raw.external_url || null,
    tags: raw.tags ?? [],
  };
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  const filter = encodeURIComponent("published_at != ''");
  const data = await pbGet<PBListResponse<RawBlogPost>>(
    `/api/collections/blog_post/records?filter=${filter}&sort=-published_at&perPage=200`,
  );
  return data.items.map(mapBlog);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const filter = encodeURIComponent(`slug = "${slug.replace(/"/g, '\\"')}"`);
  const data = await pbGet<PBListResponse<RawBlogPost>>(
    `/api/collections/blog_post/records?filter=${filter}&perPage=1`,
  );
  return data.items[0] ? mapBlog(data.items[0]) : null;
}

export async function listPortfolioItems(): Promise<PortfolioItem[]> {
  const data = await pbGet<PBListResponse<RawPortfolioItem>>(
    `/api/collections/portfolio_item/records?sort=-created&perPage=200`,
  );
  return data.items.map(mapPortfolio);
}

export async function getPortfolioItem(slug: string): Promise<PortfolioItem | null> {
  const filter = encodeURIComponent(`slug = "${slug.replace(/"/g, '\\"')}"`);
  const data = await pbGet<PBListResponse<RawPortfolioItem>>(
    `/api/collections/portfolio_item/records?filter=${filter}&perPage=1`,
  );
  return data.items[0] ? mapPortfolio(data.items[0]) : null;
}

export async function createBooking(input: BookingInput): Promise<void> {
  const res = await fetch(`${BASE}/api/collections/booking/records`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      datetime: input.datetime,
      notes: input.notes ?? "",
      status: "new",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PocketBase POST /booking → ${res.status}: ${text}`);
  }
}

export const CMS_NAME = process.env.CMS_NAME ?? "PocketBase";
export const ADMIN_URL = process.env.ADMIN_URL ?? "http://pocketbase-admin.nerdass.org/_/";
