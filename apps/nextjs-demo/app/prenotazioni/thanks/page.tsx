import Link from "next/link";

export default function PrenotazioniThanks() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-4">Grazie!</h1>
        <p>La tua richiesta è stata registrata.</p>
        <p className="text-xs text-zinc-500 mt-2">
          Senza un CMS, la richiesta è solo una riga in un file JSON: nessuna UI per vederla,
          nessun workflow di follow-up, nessuna notifica. È il trade-off del CMS-less.
        </p>
        <p className="mt-4"><Link href="/" className="underline">← Home</Link></p>
      </main>
    </div>
  );
}
