import Link from "next/link";

export default function PrenotazioniForm() {
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
        <h1 className="text-3xl font-semibold mb-2">Prenotazioni</h1>
        <p className="text-xs text-zinc-500 mb-4">
          Senza CMS, le prenotazioni atterrano in <code>/app/data/bookings.json</code> sul container.
          Per vederle: ssh sul server e <code>cat</code> il file.
        </p>
        <form action="/api/bookings" method="POST" className="flex flex-col gap-3 max-w-md">
          <label className="flex flex-col gap-1 text-sm">
            Nome e cognome
            <input name="name" required autoComplete="name"
              className="border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 bg-white dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input name="email" type="email" required autoComplete="email"
              className="border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 bg-white dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Data e ora
            <input name="datetime" type="datetime-local" required
              className="border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 bg-white dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Note (opzionale)
            <textarea name="notes" className="border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 bg-white dark:bg-zinc-900 min-h-20" />
          </label>
          <button type="submit" className="bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-4 py-2 rounded self-start">
            Invia richiesta
          </button>
        </form>
      </main>
    </div>
  );
}
