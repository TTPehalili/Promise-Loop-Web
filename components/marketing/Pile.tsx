// 6.2 The pile. Paper-deep. Three facts set like ledger rows.
import { pile } from "@/content/site";
import { Section, SectionHeader } from "./Section";

export function Pile() {
  return (
    <Section bg="paper-deep" labelledBy="pile-problem-title">
      <SectionHeader id="pile-problem-title" eyebrow={pile.eyebrow} title={pile.h2} body={pile.body} />
      <ol className="mt-12 grid grid-cols-1 border-y border-line md:grid-cols-3 md:divide-x md:divide-line">
        {pile.facts.map((f, i) => (
          <li
            key={f.day}
            className={`py-6 md:px-6 md:py-8 md:first:pl-0 ${i > 0 ? "border-t border-line md:border-t-0" : ""}`}
          >
            <p className="num font-display text-2xl font-semibold text-ink md:text-3xl">{f.day}</p>
            <p className="mt-2 text-ink-muted">{f.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
