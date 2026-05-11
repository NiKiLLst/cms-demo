import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortfolioItem } from "../../../lib/content";

export default async function PortfolioDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPortfolioItem(slug);
  if (!item) notFound();
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
        <p className="mb-4"><Link href="/portfolio" className="underline">← Portfolio</Link></p>
        <h1 className="text-3xl font-semibold mb-2">{item.title}</h1>
        {item.tags.length > 0 && (
          <p className="mb-2">
            {item.tags.map((t) => (
              <span key={t} className="inline-block bg-zinc-200 dark:bg-zinc-800 text-xs px-2 py-0.5 rounded mr-1">{t}</span>
            ))}
          </p>
        )}
        {item.externalUrl && (
          <p className="mb-2">
            <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="underline">{item.externalUrl}</a>
          </p>
        )}
        <article className="prose prose-zinc dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: item.bodyHtml }} />
      </main>
    </div>
  );
}
