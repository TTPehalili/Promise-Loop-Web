// §9 Footer. Dark brand background, reversed logo, four columns, legal and compliance lines.
// SlimFooter: legal line plus Privacy and Terms, for /login.
import NextLink from "next/link";
import { footer } from "@/content/site";
import { Logo } from "./graphics/Logo";
import { CtaLink, Rich, siteHref } from "./CtaLink";

const focusDark =
  "rounded focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-brand";

function legalLine() {
  return footer.legalLineTemplate.replace("{year}", String(new Date().getFullYear()));
}

export function Footer() {
  return (
    <footer className="bg-brand text-paper">
      <div className="container-site py-16 md:py-20">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-8">
          <div>
            <NextLink href="/" aria-label={footer.brand.logoLabel} className={`inline-flex min-h-[44px] items-center ${focusDark}`}>
              <Logo variant="reversed" height={28} />
            </NextLink>
            <p className="mt-4 font-display text-lg font-semibold text-paper">{footer.brand.tagline}</p>
            <p className="small mt-2 text-paper/80">{footer.brand.description}</p>
          </div>

          <nav aria-label={footer.navLabel} className="grid grid-cols-1 gap-10 md:col-span-3 md:grid-cols-3 md:gap-8">
            {footer.columns.map((col) => (
              <div key={col.heading}>
                <h2 className="small font-semibold text-paper">{col.heading}</h2>
                <ul className="mt-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <CtaLink
                        href={siteHref(l.href)}
                        className={`inline-flex min-h-[44px] items-center text-sm text-paper/80 transition-colors duration-150 hover:text-paper hover:underline hover:underline-offset-4 ${focusDark}`}
                      >
                        {l.label}
                      </CtaLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 border-t border-paper/15 pt-8">
          <p className="small text-paper">{legalLine()}</p>
          <div className="mt-4 space-y-2">
            {footer.complianceLines.map((line, i) => (
              <p key={i} className="small max-w-4xl text-paper/70">
                <Rich
                  text={line}
                  linkClassName={`text-paper underline underline-offset-4 hover:no-underline ${focusDark}`}
                />
              </p>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Slim footer for /login (§9): legal line plus Privacy and Terms links. */
export function SlimFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="container-site flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="small text-ink-muted">{legalLine()}</p>
        <ul className="flex gap-6">
          {footer.slimLinks.map((l) => (
            <li key={l.label}>
              <CtaLink
                href={l.href}
                className="small inline-flex min-h-[44px] items-center rounded text-ink underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                {l.label}
              </CtaLink>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
