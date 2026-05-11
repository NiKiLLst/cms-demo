import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { RichText } from '../../_lib/lexical'

export default async function PortfolioDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({
    collection: 'portfolio-items',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })
  const item = docs[0]
  if (!item) notFound()

  const images: string[] = (item.images ?? [])
    .map((row) => {
      const img = row.image
      return img && typeof img === 'object' && 'url' in img
        ? (img as { url: string }).url
        : null
    })
    .filter((v): v is string => v !== null)

  return (
    <div className="container">
      <p><a href="/portfolio">← Portfolio</a></p>
      <h1>{item.title}</h1>
      {item.tags && item.tags.length > 0 && (
        <p>{item.tags.map((t, i) => <span className="tag" key={i}>{t.value}</span>)}</p>
      )}
      {item.externalUrl && (
        <p><a href={item.externalUrl} target="_blank" rel="noopener noreferrer">{item.externalUrl}</a></p>
      )}
      <RichText data={item.description as { root?: { children?: never[] } }} />
      {images.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" style={{ maxWidth: '100%', borderRadius: 6, marginTop: '1rem' }} />
      ))}
    </div>
  )
}
