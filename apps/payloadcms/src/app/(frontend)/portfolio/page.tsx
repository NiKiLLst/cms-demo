import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

export default async function PortfolioIndex() {
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({
    collection: 'portfolio-items',
    sort: '-createdAt',
    limit: 200,
    depth: 2,
  })

  return (
    <div className="container">
      <h1>Portfolio</h1>
      {docs.length === 0 && <p className="muted">Nessun elemento di portfolio.</p>}
      {docs.map((item) => {
        const firstImage = item.images?.[0]?.image
        const firstImageUrl =
          firstImage && typeof firstImage === 'object' && 'url' in firstImage
            ? (firstImage as { url: string }).url
            : null
        return (
          <article className="card" key={item.id}>
            <h2><Link href={`/portfolio/${item.slug}`}>{item.title}</Link></h2>
            {item.tags && item.tags.length > 0 && (
              <p>{item.tags.map((t, i) => <span className="tag" key={i}>{t.value}</span>)}</p>
            )}
            {firstImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={firstImageUrl} alt="" style={{ maxWidth: '100%', borderRadius: 6 }} />
            )}
          </article>
        )
      })}
    </div>
  )
}
