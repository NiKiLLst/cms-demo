// Appwrite REST adapter. We hit /v1/databases/{db}/collections/{col}/documents
// with just the X-Appwrite-Project header — that's enough when the collection's
// document-level permissions allow read("any") (blog/portfolio) or create("any")
// (booking).

import type { BlogPost, BookingInput, PortfolioItem } from "./types";

const BASE = process.env.CMS_URL ?? "http://appwrite.nerdass.org/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? "6a01cf6200397c24c6ab";
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

// Appwrite v1.5 expects each query to be a JSON-encoded object with method+
// attribute+values, NOT the old function-string DSL. Helper serialises each
// query and appends to the queries[] querystring.
type AwQuery = { method: string; attribute?: string; values?: unknown[] };

function qs(queries: AwQuery[]): string {
  const params = new URLSearchParams();
  for (const q of queries) params.append("queries[]", JSON.stringify(q));
  return params.toString();
}

const Q = {
  isNotNull: (attr: string): AwQuery => ({ method: "isNotNull", attribute: attr, values: [] }),
  orderDesc: (attr: string): AwQuery => ({ method: "orderDesc", attribute: attr }),
  orderAsc:  (attr: string): AwQuery => ({ method: "orderAsc",  attribute: attr }),
  limit:     (n: number):    AwQuery => ({ method: "limit", values: [n] }),
  equal:     (attr: string, val: string | number): AwQuery => ({ method: "equal", attribute: attr, values: [val] }),
};

export async function listBlogPosts(): Promise<BlogPost[]> {
  const queries = qs([Q.isNotNull("published_at"), Q.orderDesc("published_at"), Q.limit(200)]);
  const data = await awGet<AppwriteList<RawBlogPost>>(
    `/databases/${DATABASE_ID}/collections/blog_post/documents?${queries}`,
  );
  return data.documents.map(mapBlog);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const queries = qs([Q.equal("slug", slug), Q.limit(1)]);
  const data = await awGet<AppwriteList<RawBlogPost>>(
    `/databases/${DATABASE_ID}/collections/blog_post/documents?${queries}`,
  );
  return data.documents[0] ? mapBlog(data.documents[0]) : null;
}

export async function listPortfolioItems(): Promise<PortfolioItem[]> {
  const queries = qs([Q.orderDesc("$createdAt"), Q.limit(200)]);
  const data = await awGet<AppwriteList<RawPortfolioItem>>(
    `/databases/${DATABASE_ID}/collections/portfolio_item/documents?${queries}`,
  );
  return data.documents.map(mapPortfolio);
}

export async function getPortfolioItem(slug: string): Promise<PortfolioItem | null> {
  const queries = qs([Q.equal("slug", slug), Q.limit(1)]);
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
