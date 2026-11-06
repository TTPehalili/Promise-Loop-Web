// 6.13 Final CTA. Dark (brand) with the banknote line pattern.
import { finalCta } from "@/content/site";
import { BanknotePattern } from "./graphics/BanknotePattern";
import { CtaLink } from "./CtaLink";

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="section relative overflow-hidden bg-brand text-paper">
      <BanknotePattern />
      <div className="container-site relative text-center">
        <h2 id="final-cta-title" className="h2 mx-auto max-w-3xl text-paper">
          {finalCta.h2}
        </h2>
        <p className="body mx-auto mt-5 text-paper/80">{finalCta.body}</p>
        <CtaLink href={finalCta.cta.href} className="btn-primary-dark mt-8">
          {finalCta.cta.label}
        </CtaLink>
      </div>
    </section>
  );
}
