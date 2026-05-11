import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <nav className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex gap-6 items-center text-sm">
        <span className="font-semibold mr-auto">cms-demo</span>
        <Link href="/">Home</Link>
        <Link href="/blog">Blog</Link>
        <Link href="/portfolio">Portfolio</Link>
        <Link href="/prenotazioni">Prenotazioni</Link>
        <a
          href="https://github.com/NiKiLLst/cms-demo/tree/main/apps/nextjs-demo/content"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-2 py-1 rounded text-xs"
        >
          Admin (git) →
        </a>
      </nav>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-4">cms-demo · Next.js (CMS-less)</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          Settima demo del confronto: <strong>nessun CMS</strong>. I contenuti vivono
          come file MDX nel repo (<code>content/blog/</code>, <code>content/portfolio/</code>);
          le prenotazioni vengono scritte su un file JSON sul container.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-2">Sezioni</h2>
        <ul className="space-y-1 list-disc list-inside">
          <li><Link href="/blog" className="underline">Blog</Link> — articoli letti da <code>content/blog/*.md</code></li>
          <li><Link href="/portfolio" className="underline">Portfolio</Link> — elementi letti da <code>content/portfolio/*.md</code></li>
          <li><Link href="/prenotazioni" className="underline">Prenotazioni</Link> — form pubblico, scrive su <code>/app/data/bookings.json</code></li>
        </ul>
        <h2 className="text-xl font-semibold mt-8 mb-2">Admin</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Niente UI admin. &quot;Caricare un articolo&quot; ={" "}
          <a
            href="https://github.com/NiKiLLst/cms-demo/tree/main/apps/nextjs-demo/content"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            editare i file in <code>content/</code> e fare git push
          </a>
          .
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-2">Risultato di validazione</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Senza un CMS, &quot;caricare in autonomia un articolo&quot; significa editare un
          file e fare git push. Vedere le prenotazioni significa ssh + cat. È il
          confronto onesto con gli altri 6: serve a quantificare quanto valore aggiunge
          un vero backend con admin UI.
        </p>
      </main>
    </div>
  );
}
