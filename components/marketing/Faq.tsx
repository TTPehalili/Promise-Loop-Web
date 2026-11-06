"use client";

// 6.12 / §8 FAQ (#faq). Paper. Accordion under two group labels; one item open at a time
// across the whole FAQ. Native buttons, so Enter and Space work.
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqFinePrint, faqGroups } from "@/content/faq";
import { faqSection } from "@/content/site";
import { CtaLink } from "./CtaLink";

export function Faq() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const uid = useId();

  return (
    <section id={faqSection.anchor} aria-labelledby="faq-title" className="section bg-paper">
      <div className="container-site">
        <h2 id="faq-title" className="h2 max-w-3xl">
          {faqSection.h2}
        </h2>

        <div className="mt-12 max-w-3xl space-y-12">
          {faqGroups.map((group, g) => (
            <div key={group.label}>
              <h3 className="eyebrow">{group.label}</h3>
              <ul className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
                {group.items.map((item, i) => {
                  const key = `${g}-${i}`;
                  const open = openKey === key;
                  const buttonId = `${uid}-q-${key}`;
                  const panelId = `${uid}-a-${key}`;
                  return (
                    <li key={item.q} className={i > 0 ? "border-t border-line" : ""}>
                      <h4>
                        <button
                          type="button"
                          id={buttonId}
                          aria-expanded={open}
                          aria-controls={panelId}
                          onClick={() => setOpenKey(open ? null : key)}
                          className="flex min-h-[44px] w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-ink transition-colors duration-150 hover:bg-paper focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus md:px-6"
                        >
                          <span>{item.q}</span>
                          <ChevronDown
                            size={20}
                            strokeWidth={1.5}
                            aria-hidden="true"
                            className={`shrink-0 text-ink-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                          />
                        </button>
                      </h4>
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        hidden={!open}
                        className="px-5 pb-5 md:px-6"
                      >
                        <p className="max-w-prose text-ink-muted">
                          {item.a}
                          {item.link && (
                            <>
                              {" "}
                              <CtaLink
                                href={item.link.href}
                                className="text-mint-ink underline underline-offset-4 hover:no-underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                              >
                                {item.link.text}
                              </CtaLink>
                              .
                            </>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="small mt-10 max-w-3xl text-ink-muted">{faqFinePrint}</p>
      </div>
    </section>
  );
}
