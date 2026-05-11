import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="container">
      <h1>cms-demo · PayloadCMS</h1>
      <p className="muted">
        Demo comparativa di sette CMS. Questo è il frontend servito da PayloadCMS
        (admin e frontend nello stesso processo Next.js).
      </p>
      <h2>Sezioni</h2>
      <ul>
        <li><Link href="/blog">Blog</Link> — articoli pubblicati dall&apos;admin</li>
        <li><Link href="/portfolio">Portfolio</Link> — lavori e progetti</li>
        <li><Link href="/prenotazioni">Prenotazioni</Link> — form pubblico, le richieste atterrano nell&apos;admin</li>
      </ul>
      <h2>Admin</h2>
      <p><a href="/admin">→ Pannello admin di PayloadCMS</a></p>
    </div>
  )
}
