import React from 'react'
import Link from 'next/link'
import './styles.css'

export const metadata = {
  description: "cms-demo · PayloadCMS",
  title: 'cms-demo (PayloadCMS)',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  return (
    <html lang="it">
      <body>
        <nav className="site-nav">
          <span className="brand">cms-demo</span>
          <Link href="/">Home</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/prenotazioni">Prenotazioni</Link>
          <a href="/admin" className="admin-link">Admin</a>
        </nav>
        <main className="site-main">{children}</main>
        <footer className="site-footer">powered by PayloadCMS</footer>
      </body>
    </html>
  )
}
