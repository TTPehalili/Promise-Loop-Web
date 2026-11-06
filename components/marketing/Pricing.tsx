// 6.11 Pricing (#pricing). Paper-deep. One centered card. The card CTA is the section's
// only primary button; "Get your quote" is a secondary arrow link under the card.
// Never show a retainer amount.
import { Check } from "lucide-react";
import { pricing } from "@/content/site";
import { CtaLink, withArrow } from "./CtaLink";
import { Section, SectionHeader } from "./Section";

export function Pricing() {
  const { card } = pricing;
  const [retainer, share] = card.priceLines;
  return (
    <Section id={pricing.anchor} bg="paper-deep" labelledBy="pricing-title">
      <SectionHeader id="pricing-title" eyebrow={pricing.eyebrow} title={pricing.h2} center />
      <div className="card mx-auto mt-12 max-w-md md:p-8">
        <h3 className="h3">{card.planLabel}</h3>
        <div className="mt-6 border-y border-line py-5">
          <p className="font-display text-2xl font-semibold text-ink">{retainer.label}</p>
          {retainer.detail && <p className="mt-1 text-ink-muted">{retainer.detail}</p>}
          <p className="num mt-4 font-display text-2xl font-semibold text-ink">{share.label}</p>
          {share.detail && <p className="mt-1 text-ink-muted">{share.detail}</p>}
        </div>
        <p className="small mt-6 font-medium text-ink">{card.includesLabel}</p>
        <ul className="mt-3 space-y-3">
          {card.includes.map((item) => (
            <li key={item} className="flex gap-3 text-ink">
              <Check size={20} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0 text-mint-ink" />
              <span className="first-letter:uppercase">{item}</span>
            </li>
          ))}
        </ul>
        <CtaLink href={card.cta.href} className="btn-primary mt-8 w-full">
          {card.cta.label}
        </CtaLink>
        <p className="small mt-4 text-center text-ink-muted">{card.finePrint}</p>
      </div>
      <p className="mt-6 text-center">
        <CtaLink
          href={pricing.quoteCta.href}
          className="link-arrow rounded-lg focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          {withArrow(pricing.quoteCta.label)}
        </CtaLink>
      </p>
    </Section>
  );
}
