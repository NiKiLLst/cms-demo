import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'

export default async function BlogIndex() {
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({
    collection: 'blog-posts',
    where: { publishedAt: { exists: true } },
    sort: '-publishedAt',
    limit: 200,
  })

  return (
    <div className="container">
      <h1>Blog</h1>
      {docs.length === 0 && <p className="muted">Nessun articolo pubblicato.</p>}
      {docs.map((p) => (
        <article className="card" key={p.id}>
          <h2><Link href={`/blog/${p.slug}`}>{p.title}</Link></h2>
          {p.publishedAt && (
            <p className="muted">
              {new Date(p.publishedAt).toLocaleDateString('it-IT')} · {p.author ?? 'anonimo'}
            </p>
          )}
          {p.excerpt && <p>{p.excerpt}</p>}
        </article>
      ))}
    </div>
  )
}
