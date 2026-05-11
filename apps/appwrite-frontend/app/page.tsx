import Link from "next/link";
import { CMS_NAME, ADMIN_URL } from "../lib/cms";

export default function Home() {
  return (
    <div className="container">
      <h1>cms-demo · {CMS_NAME}</h1>
      <p className="muted">
        Demo comparativa di sette CMS. Questo è il frontend servito da {CMS_NAME}.
      </p>
      <h2>Sezioni</h2>
      <ul>
        <li><Link href="/blog">Blog</Link> — articoli pubblicati dall&apos;admin</li>
        <li><Link href="/portfolio">Portfolio</Link> — lavori e progetti</li>
        <li><Link href="/prenotazioni">Prenotazioni</Link> — form pubblico, le richieste atterrano nell&apos;admin</li>
      </ul>
      <h2>Admin</h2>
      <p>
        <a href={ADMIN_URL} target="_blank" rel="noopener noreferrer">→ Console Appwrite di {CMS_NAME}</a>
      </p>
    </div>
  );
}
