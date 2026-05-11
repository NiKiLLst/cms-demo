import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { CMS_NAME, ADMIN_URL } from "../lib/cms";

export const metadata: Metadata = {
  title: `cms-demo (${process.env.CMS_NAME ?? "Directus"})`,
  description: "Demo CMS comparativa — blog, portfolio, prenotazioni",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <nav>
          <span className="brand">cms-demo</span>
          <Link href="/">Home</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/prenotazioni">Prenotazioni</Link>
          <a href={ADMIN_URL} className="admin-link" target="_blank" rel="noopener noreferrer">Admin →</a>
        </nav>
        <main style={{ flex: 1 }}>{children}</main>
        <footer>powered by {CMS_NAME}</footer>
      </body>
    </html>
  );
}
