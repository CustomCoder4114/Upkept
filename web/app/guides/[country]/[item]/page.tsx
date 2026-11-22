/** "Renew a Kenyan passport": one public page per item per country. The main growth engine. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { COUNTRY_NAMES, allGuides, findGuide, guideSlug, longDate } from "../../../../lib/guides";

type Params = { country: string; item: string };

export function generateStaticParams(): Params[] {
  return allGuides().map(guideSlug);
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { country, item } = await params;
  const g = findGuide(country, item);
  if (!g) return {};
  return {
    title: `${g.title}: steps, documents, cost (${new Date(g.last_checked).getFullYear()})`,
    description: g.summary,
    alternates: { canonical: `/guides/${country}/${item}` },
  };
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const { country, item } = await params;
  const g = findGuide(country, item);
  if (!g) notFound();

  // Structured data so search engines can show the steps directly.
  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: g.title,
    description: g.summary,
    step: g.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.detail })),
    supply: g.documents_needed.map((d) => ({ "@type": "HowToSupply", name: d })),
  };

  return (
    <main className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }} />
      <p className="crumb"><a href="/guides">Guides</a> · {COUNTRY_NAMES[country] ?? country.toUpperCase()}</p>
      <h1>{g.title}</h1>
      <p className="lead">{g.summary}</p>

      <section className="facts">
        <div>
          <span className="label">Cost</span>
          <strong>{g.cost.amount != null ? `${g.cost.currency} ${g.cost.amount.toLocaleString()}` : "Shown on your official invoice"}</strong>
          <p>{g.cost.note}</p>
        </div>
        <div>
          <span className="label">How long it takes</span>
          <strong>{g.processing_time}</strong>
        </div>
      </section>

      <h2>Steps</h2>
      <ol className="steps">
        {g.steps.map((s) => (
          <li key={s.id}><strong>{s.title}</strong><p>{s.detail}</p></li>
        ))}
      </ol>

      <h2>What to bring</h2>
      <ul>{g.documents_needed.map((d) => <li key={d}>{d}</li>)}</ul>

      {g.tips.length ? (
        <>
          <h2>Good to know</h2>
          <ul>{g.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </>
      ) : null}

      <p><a className="button secondary" href={g.official_url} rel="noopener">Open the official site</a></p>

      <aside className="cta">
        <h2>Get reminded next time</h2>
        <p>Snap your document once. Upkept warns you months ahead and shows you these steps when it's time.</p>
        <a className="button" href="/#get-the-app">Track it in Upkept, free</a>
      </aside>

      <footer className="sources">
        <p>Last checked {longDate(g.last_checked)}. Rules and fees change; the official site is always right.</p>
        <p>Sources: {g.sources.map((s, i) => (
          <span key={s.url}>{i ? ", " : ""}<a href={s.url} rel="noopener nofollow">{s.title}</a></span>
        ))}</p>
      </footer>
    </main>
  );
}
