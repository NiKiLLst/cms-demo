import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost } from "../../../lib/content";

export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <nav className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex gap-6 items-center text-sm">
        <Link href="/" className="font-semibold mr-auto">cms-demo</Link>
        <Link href="/">Home</Link>
        <Link href="/blog">Blog</Link>
        <Link href="/portfolio">Portfolio</Link>
        <Link href="/prenotazioni">Prenotazioni</Link>
      </nav>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <p className="mb-4"><Link href="/blog" className="underline">← Blog</Link></p>
        <h1 className="text-3xl font-semibold mb-2">{post.title}</h1>
        <p className="text-xs text-zinc-500 mb-6">
          {post.publishedAt && new Date(post.publishedAt).toLocaleDateString("it-IT")}
          {post.author && ` · ${post.author}`}
        </p>
        <article className="prose prose-zinc dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
      </main>
    </div>
  );
}
