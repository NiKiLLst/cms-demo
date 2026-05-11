import Link from "next/link";
import { listPortfolioItems } from "../../lib/cms";

export default async function PortfolioIndex() {
  const items = await listPortfolioItems();
  return (
    <div className="container">
      <h1>Portfolio</h1>
      {items.length === 0 && <p className="muted">Nessun elemento di portfolio.</p>}
      {items.map((item) => (
        <article className="card" key={item.id}>
          <h2><Link href={`/portfolio/${item.slug}`}>{item.title}</Link></h2>
          {item.tags.length > 0 && (
            <p>{item.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</p>
          )}
          {item.imageUrls[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrls[0]} alt="" style={{ maxWidth: "100%", borderRadius: 6 }} />
          )}
        </article>
      ))}
    </div>
  );
}
