import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { RichText } from '../../_lib/lexical'

export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({
    collection: 'blog-posts',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const post = docs[0]
  if (!post) notFound()

  const cover = typeof post.coverImage === 'object' && post.coverImage ? post.coverImage : null
  const coverUrl = cover && 'url' in cover ? (cover as { url: string }).url : null

  return (
    <div className="container">
      <p><a href="/blog">← Blog</a></p>
      <h1>{post.title}</h1>
      {post.publishedAt && (
        <p className="muted">
          {new Date(post.publishedAt).toLocaleDateString('it-IT')} · {post.author ?? 'anonimo'}
        </p>
      )}
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" style={{ maxWidth: '100%', borderRadius: 6 }} />
      )}
      <RichText data={post.body as { root?: { children?: never[] } }} />
    </div>
  )
}
