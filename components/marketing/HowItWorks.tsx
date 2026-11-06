// 6.5 How it works (#how). Paper. Three columns with large muted step numbers.
import { howItWorks } from "@/content/site";
import { Section, SectionHeader } from "./Section";

export function HowItWorks() {
  return (
    <Section id={howItWorks.anchor} bg="paper" labelledBy="how-title">
      <SectionHeader id="how-title" eyebrow={howItWorks.eyebrow} title={howItWorks.h2} />
      <ol className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        {howItWorks.steps.map((s) => (
          <li key={s.number} className="border-t border-line pt-6">
            <span aria-hidden="true" className="num block font-display text-5xl font-semibold leading-none text-ink-muted">
              {s.number}
            </span>
            <h3 className="h3 mt-6">{s.title}</h3>
            <p className="mt-3 text-ink-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
