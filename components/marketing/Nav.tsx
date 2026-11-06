// 6.0 Nav. Server component; the mobile sheet is the only client piece.
import NextLink from "next/link";
import { nav } from "@/content/site";
import { Logo } from "./graphics/Logo";
import { CtaLink, siteHref } from "./CtaLink";
import { MobileMenu } from "./MobileMenu";

const focus = "rounded-lg focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="container-site flex h-16 items-center justify-between gap-6">
        <NextLink href="/" aria-label={nav.logoLabel} className={`inline-flex min-h-[44px] items-center ${focus}`}>
          <Logo height={28} />
        </NextLink>

        <nav aria-label={nav.mainNavLabel} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {nav.links.map((l) => (
              <li key={l.href}>
                <CtaLink
                  href={siteHref(l.href)}
                  className={`inline-flex min-h-[44px] items-center px-3 text-[15px] text-ink transition-colors duration-150 hover:text-mint-ink ${focus}`}
                >
                  {l.label}
                </CtaLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <CtaLink
            href={nav.login.href}
            className={`inline-flex min-h-[44px] items-center px-3 text-[15px] text-ink transition-colors duration-150 hover:text-mint-ink ${focus}`}
          >
            {nav.login.label}
          </CtaLink>
          <CtaLink href={nav.cta.href} className="btn-primary text-[15px]">
            {nav.cta.label}
          </CtaLink>
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}
