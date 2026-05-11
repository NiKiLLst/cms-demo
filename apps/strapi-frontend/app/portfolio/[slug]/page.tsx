import { notFound } from "next/navigation";
import { getPortfolioItem } from "../../../lib/cms";

export default async function PortfolioDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPortfolioItem(slug);
  if (!item) notFound();
  return (
    <div className="container">
      <p><a href="/portfolio">← Portfolio</a></p>
      <h1>{item.title}</h1>
      {item.tags.length > 0 && (
        <p>{item.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</p>
      )}
      {item.externalUrl && (
        <p><a href={item.externalUrl} target="_blank" rel="noopener noreferrer">{item.externalUrl}</a></p>
      )}
      <div dangerouslySetInnerHTML={{ __html: item.description }} />
      {item.imageUrls.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" style={{ maxWidth: "100%", borderRadius: 6, marginTop: "1rem" }} />
      ))}
    </div>
  );
}
