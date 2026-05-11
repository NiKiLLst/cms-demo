// File-based content reader. Replaces a CMS for the nextjs-demo 7th variant.

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string | null;
  author: string | null;
  publishedAt: string | null;
  bodyHtml: string;
};

export type PortfolioItem = {
  slug: string;
  title: string;
  description: string;
  bodyHtml: string;
  externalUrl: string | null;
  tags: string[];
};

async function readDir(subdir: string): Promise<{ slug: string; raw: string }[]> {
  const dir = path.join(CONTENT_DIR, subdir);
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const files = await Promise.all(
    names
      .filter((n) => n.endsWith(".md") || n.endsWith(".mdx"))
      .map(async (n) => ({
        slug: n.replace(/\.(md|mdx)$/, ""),
        raw: await fs.readFile(path.join(dir, n), "utf8"),
      })),
  );
  return files;
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  const files = await readDir("blog");
  const posts = await Promise.all(
    files.map(async ({ slug, raw }) => {
      const { data, content } = matter(raw);
      return {
        slug,
        title: String(data.title ?? slug),
        excerpt: data.excerpt ? String(data.excerpt) : null,
        author: data.author ? String(data.author) : null,
        publishedAt: data.publishedAt ? String(data.publishedAt) : null,
        bodyHtml: await marked.parse(content),
      } as BlogPost;
    }),
  );
  return posts
    .filter((p) => p.publishedAt) // hide drafts (no publishedAt)
    .sort((a, b) => (b.publishedAt! > a.publishedAt! ? 1 : -1));
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const all = await listBlogPosts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function listPortfolioItems(): Promise<PortfolioItem[]> {
  const files = await readDir("portfolio");
  return Promise.all(
    files.map(async ({ slug, raw }) => {
      const { data, content } = matter(raw);
      return {
        slug,
        title: String(data.title ?? slug),
        description: String(data.description ?? ""),
        bodyHtml: await marked.parse(content),
        externalUrl: data.externalUrl ? String(data.externalUrl) : null,
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      } as PortfolioItem;
    }),
  );
}

export async function getPortfolioItem(slug: string): Promise<PortfolioItem | null> {
  const all = await listPortfolioItems();
  return all.find((p) => p.slug === slug) ?? null;
}
