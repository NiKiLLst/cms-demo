import { notFound } from "next/navigation";
import { getBlogPost } from "../../../lib/cms";

export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  return (
    <div className="container">
      <p><a href="/blog">← Blog</a></p>
      <h1>{post.title}</h1>
      {post.publishedAt && (
        <p className="muted">
          {new Date(post.publishedAt).toLocaleDateString("it-IT")} · {post.author ?? "anonimo"}
        </p>
      )}
      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImageUrl} alt="" style={{ maxWidth: "100%", borderRadius: 6 }} />
      )}
      <div dangerouslySetInnerHTML={{ __html: post.body }} />
    </div>
  );
}
