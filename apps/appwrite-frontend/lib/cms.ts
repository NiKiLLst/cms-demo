// Appwrite REST adapter. We hit /v1/databases/{db}/collections/{col}/documents
// with just the X-Appwrite-Project header — that's enough when the collection's
// document-level permissions allow read("any") (blog/portfolio) or create("any")
// (booking).

import type { BlogPost, BookingInput, PortfolioItem } from "./types";

const BASE = process.env.CMS_URL ?? "http://appwrite.nerdass.org/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? "cms-demo";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "main";

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    accept: "application/json",
    "X-Appwrite-Project": PROJECT_ID,
    ...extra,
  };
}

type AppwriteDoc = {
  $id: string;
  $createdAt: string;
};

type AppwriteList<T> = { total: number; documents: T[] };

async function awGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Appwrite GET ${path} → ${res.status}`);
  return (await res.json()) as T;
}

type RawBlogPost = AppwriteDoc & {
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  cover_image: string | null; // file ID inside Appwrite Storage
  published_at: string | null;
  author: string | null;
};

type RawPortfolioItem = AppwriteDoc & {
  title: string;
  slug: string;
  description: string;
  images: string[] | null;
  external_url: string | null;
  tags: string[] | null;
};

function fileUrl(bucketId: string, fileId: string | null): string | null {
  if (!fileId) return null;
  return `${BASE}/storage/buckets/${bucketId}/files/${fileId}/view?project=${PROJECT_ID}`;
}

function mapBlog(raw: RawBlogPost): BlogPost {
  return {
    id: raw.$id,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt,
    body: raw.body,
    coverImageUrl: fileUrl("media", raw.cover_image),
    publishedAt: raw.published_at,
    author: raw.author,
  };
}

function mapPortfolio(raw: RawPortfolioItem): PortfolioItem {
  return {
    id: raw.$id,
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    imageUrls: (raw.images ?? [])
      .map((id) => fileUrl("media", id))
      .filter((v): v is string => v !== null),
    externalUrl: raw.external_url,
    tags: raw.tags ?? [],
  };
}

// Appwrite query helper: builds the queries[] querystring entries.
function qs(queries: string[]): string {
  const params = new URLSearchParams();
  for (const q of queries) params.append("queries[]", q);
  return params.toString();
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  const queries = qs([
    'isNotNull("published_at")',
    'orderDesc("published_at")',
    'limit(200)',
  ]);
  const data = await awGet<AppwriteList<RawBlogPost>>(
    `/databases/${DATABASE_ID}/collections/blog_post/documents?${queries}`,
  );
  return data.documents.map(mapBlog);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const queries = qs([`equal("slug",["${slug.replace(/"/g, '\\"')}"])`, "limit(1)"]);
  const data = await awGet<AppwriteList<RawBlogPost>>(
    `/databases/${DATABASE_ID}/collections/blog_post/documents?${queries}`,
  );
  return data.documents[0] ? mapBlog(data.documents[0]) : null;
}

export async function listPortfolioItems(): Promise<PortfolioItem[]> {
  const queries = qs(['orderDesc("$createdAt")', "limit(200)"]);
  const data = await awGet<AppwriteList<RawPortfolioItem>>(
    `/databases/${DATABASE_ID}/collections/portfolio_item/documents?${queries}`,
  );
  return data.documents.map(mapPortfolio);
}

export async function getPortfolioItem(slug: string): Promise<PortfolioItem | null> {
  const queries = qs([`equal("slug",["${slug.replace(/"/g, '\\"')}"])`, "limit(1)"]);
  const data = await awGet<AppwriteList<RawPortfolioItem>>(
    `/databases/${DATABASE_ID}/collections/portfolio_item/documents?${queries}`,
  );
  return data.documents[0] ? mapPortfolio(data.documents[0]) : null;
}

export async function createBooking(input: BookingInput): Promise<void> {
  const res = await fetch(
    `${BASE}/databases/${DATABASE_ID}/collections/booking/documents`,
    {
      method: "POST",
      headers: headers({ "content-type": "application/json" }),
      body: JSON.stringify({
        documentId: "unique()",
        data: {
          name: input.name,
          email: input.email,
          datetime: input.datetime,
          notes: input.notes,
          status: "new",
        },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Appwrite POST /booking → ${res.status}: ${text}`);
  }
}

export const CMS_NAME = process.env.CMS_NAME ?? "Appwrite";
export const ADMIN_URL = process.env.ADMIN_URL ?? "http://appwrite.nerdass.org/console";
