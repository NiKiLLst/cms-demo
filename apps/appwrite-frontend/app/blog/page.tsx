import Link from "next/link";
import { listBlogPosts } from "../../lib/cms";

export default async function BlogIndex() {
  const posts = await listBlogPosts();
  return (
    <div className="container">
      <h1>Blog</h1>
      {posts.length === 0 && <p className="muted">Nessun articolo pubblicato.</p>}
      {posts.map((p) => (
        <article className="card" key={p.id}>
          <h2><Link href={`/blog/${p.slug}`}>{p.title}</Link></h2>
          {p.publishedAt && (
            <p className="muted">
              {new Date(p.publishedAt).toLocaleDateString("it-IT")} · {p.author ?? "anonimo"}
            </p>
          )}
          {p.excerpt && <p>{p.excerpt}</p>}
        </article>
      ))}
    </div>
  );
}
