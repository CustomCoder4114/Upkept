import type { Metadata } from "next";

import { COUNTRY_NAMES, allGuides, guideSlug } from "../../lib/guides";

export const metadata: Metadata = {
  title: "Renewal guides by country",
  description: "How to renew passports, driving licences and more: steps, documents, cost and official links.",
};

export default function GuidesIndex() {
  const byCountry = new Map<string, ReturnType<typeof allGuides>>();
  for (const g of allGuides()) {
    const c = g.country.toLowerCase();
    byCountry.set(c, [...(byCountry.get(c) ?? []), g]);
  }
  return (
    <main className="page">
      <h1>Renewal guides</h1>
      <p className="lead">Step-by-step, with the official link and the date we last checked it.</p>
      {[...byCountry.entries()].map(([country, guides]) => (
        <section key={country}>
          <h2>{COUNTRY_NAMES[country] ?? country.toUpperCase()}</h2>
          <ul>
            {guides.map((g) => {
              const s = guideSlug(g);
              return <li key={s.item}><a href={`/guides/${s.country}/${s.item}`}>{g.title}</a></li>;
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
