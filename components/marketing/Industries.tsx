// 6.10 Who it's for. Paper. Trade pills.
import { industries } from "@/content/site";
import { Section } from "./Section";
import { tradeIcon } from "./graphics/trades";

export function Industries() {
  return (
    <Section bg="paper" labelledBy="industries-title" className="text-center">
      <h2 id="industries-title" className="h2">
        {industries.h2}
      </h2>
      <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-3">
        {industries.pills.map((p) => {
          const Icon = tradeIcon(p);
          return (
            <li
              key={p}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 font-medium text-ink"
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" className="text-mint-ink" />
              {p}
            </li>
          );
        })}
      </ul>
      <p className="body mx-auto mt-10 text-ink-muted">{industries.line}</p>
    </Section>
  );
}
