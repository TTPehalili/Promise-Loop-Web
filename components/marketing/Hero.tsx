// 6.1 Hero. Paper background. HeroLoop is the only client piece.
import { hero } from "@/content/site";
import { HeroLoop } from "./graphics/HeroLoop";
import { CtaLink } from "./CtaLink";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="bg-paper pb-20 pt-14 md:pb-28 md:pt-20">
      <div className="container-site grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <p className="eyebrow">{hero.eyebrow}</p>
          <h1 id="hero-title" className="h1 mt-4 text-balance">
            {hero.h1}
          </h1>
          <p className="body mt-6 text-ink-muted">{hero.subhead}</p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
            <CtaLink href={hero.primaryCta.href} className="btn-primary">
              {hero.primaryCta.label}
            </CtaLink>
            <CtaLink
              href={hero.secondaryCta.href}
              className="link-arrow rounded-lg focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            >
              {hero.secondaryCta.label}
            </CtaLink>
          </div>
          <p className="small mt-8 text-ink-muted">{hero.trustItems.join(" · ")}</p>
        </div>
        <div className="flex min-w-0 justify-center lg:justify-end">
          <HeroLoop />
        </div>
      </div>
    </section>
  );
}
