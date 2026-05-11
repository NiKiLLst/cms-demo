import Link from "next/link";
import { listPortfolioItems } from "../../lib/content";

export default async function PortfolioIndex() {
  const items = await listPortfolioItems();
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
        <h1 className="text-3xl font-semibold mb-6">Portfolio</h1>
        {items.length === 0 && <p className="text-zinc-500">Nessun elemento di portfolio.</p>}
        {items.map((item) => (
          <article key={item.slug} className="border border-zinc-200 dark:border-zinc-800 rounded-md p-4 mb-4 bg-white dark:bg-zinc-900">
            <h2 className="text-xl"><Link href={`/portfolio/${item.slug}`} className="underline">{item.title}</Link></h2>
            {item.tags.length > 0 && (
              <p className="mt-1">
                {item.tags.map((t) => (
                  <span key={t} className="inline-block bg-zinc-200 dark:bg-zinc-800 text-xs px-2 py-0.5 rounded mr-1">{t}</span>
                ))}
              </p>
            )}
            {item.description && <p className="mt-2 text-zinc-700 dark:text-zinc-300">{item.description}</p>}
          </article>
        ))}
      </main>
    </div>
  );
}
