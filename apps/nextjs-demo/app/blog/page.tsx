import Link from "next/link";
import { listBlogPosts } from "../../lib/content";

export default async function BlogIndex() {
  const posts = await listBlogPosts();
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
        <h1 className="text-3xl font-semibold mb-6">Blog</h1>
        {posts.length === 0 && <p className="text-zinc-500">Nessun articolo pubblicato.</p>}
        {posts.map((p) => (
          <article key={p.slug} className="border border-zinc-200 dark:border-zinc-800 rounded-md p-4 mb-4 bg-white dark:bg-zinc-900">
            <h2 className="text-xl"><Link href={`/blog/${p.slug}`} className="underline">{p.title}</Link></h2>
            <p className="text-xs text-zinc-500">
              {p.publishedAt && new Date(p.publishedAt).toLocaleDateString("it-IT")}
              {p.author && ` · ${p.author}`}
            </p>
            {p.excerpt && <p className="mt-2 text-zinc-700 dark:text-zinc-300">{p.excerpt}</p>}
          </article>
        ))}
      </main>
    </div>
  );
}
