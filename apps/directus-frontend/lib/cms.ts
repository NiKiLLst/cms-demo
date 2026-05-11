// Directus REST adapter. The only file that knows we're talking to Directus.
// Public role must permit: read on blog_post + portfolio_item, create on booking.

import type { BlogPost, BookingInput, PortfolioItem } from "./types";

const BASE = process.env.CMS_URL ?? "http://directus-admin.nerdass.org";

type DirectusResponse<T> = { data: T };

async function directusGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Directus GET ${path} → ${res.status}`);
  const json = (await res.json()) as DirectusResponse<T>;
  return json.data;
}

type RawBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  cover_image: string | null;
  published_at: string | null;
  author: string | null;
};

type RawPortfolioItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  images: string[] | null;
  external_url: string | null;
  tags: string[] | null;
};

function fileUrl(fileId: string | null): string | null {
  if (!fileId) return null;
  return `${BASE}/assets/${fileId}`;
}

function mapBlog(raw: RawBlogPost): BlogPost {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt,
    body: raw.body,
    coverImageUrl: fileUrl(raw.cover_image),
    publishedAt: raw.published_at,
    author: raw.author,
  };
}

function mapPortfolio(raw: RawPortfolioItem): PortfolioItem {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    imageUrls: (raw.images ?? []).map((id) => fileUrl(id)).filter((v): v is string => v !== null),
    externalUrl: raw.external_url,
    tags: raw.tags ?? [],
  };
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  const data = await directusGet<RawBlogPost[]>(
    "/items/blog_post?filter[published_at][_nnull]=true&sort=-published_at&fields=*"
  );
  return data.map(mapBlog);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const data = await directusGet<RawBlogPost[]>(
    `/items/blog_post?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1&fields=*`
  );
  return data[0] ? mapBlog(data[0]) : null;
}

export async function listPortfolioItems(): Promise<PortfolioItem[]> {
  const data = await directusGet<RawPortfolioItem[]>(
    "/items/portfolio_item?sort=-id&fields=*"
  );
  return data.map(mapPortfolio);
}

export async function getPortfolioItem(slug: string): Promise<PortfolioItem | null> {
  const data = await directusGet<RawPortfolioItem[]>(
    `/items/portfolio_item?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1&fields=*`
  );
  return data[0] ? mapPortfolio(data[0]) : null;
}

export async function createBooking(input: BookingInput): Promise<void> {
  const res = await fetch(`${BASE}/items/booking`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      datetime: input.datetime,
      notes: input.notes,
      status: "new",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Directus POST /items/booking → ${res.status}: ${text}`);
  }
}

export const CMS_NAME = process.env.CMS_NAME ?? "Directus";
