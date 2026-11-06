"use client";

// Mobile nav sheet (brief §6.0): full-screen paper sheet, links stacked, full-width
// "Book a demo" at the bottom. Closes on Escape and link click, locks body scroll,
// traps focus inside while open and returns focus to the menu button on close.
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { nav } from "@/content/site";
import { Logo } from "./graphics/Logo";
import { CtaLink, siteHref } from "./CtaLink";

const SHEET_ID = "mobile-menu";
const focus = "rounded-lg focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const items = sheetRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    // Close if the viewport grows past md while open.
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => mq.matches && setOpen(false);

    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open, close]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={SHEET_ID}
        aria-label={nav.menuOpenLabel}
        onClick={() => setOpen(true)}
        className={`-mr-2 inline-flex h-11 w-11 items-center justify-center text-ink ${focus}`}
      >
        <Menu size={24} strokeWidth={1.5} aria-hidden="true" />
      </button>

      <div
        ref={sheetRef}
        id={SHEET_ID}
        role="dialog"
        aria-modal="true"
        aria-label={nav.mobileMenuLabel}
        className={`fixed inset-0 z-50 flex-col bg-paper ${open ? "flex" : "hidden"}`}
      >
        <div className="container-site flex h-16 shrink-0 items-center justify-between border-b border-line">
          <CtaLink
            href="/"
            ariaLabel={nav.logoLabel}
            onClick={() => close(false)}
            className={`inline-flex min-h-[44px] items-center ${focus}`}
          >
            <Logo height={28} />
          </CtaLink>
          <button
            ref={closeRef}
            type="button"
            aria-label={nav.menuCloseLabel}
            onClick={() => close(true)}
            className={`-mr-2 inline-flex h-11 w-11 items-center justify-center text-ink ${focus}`}
          >
            <X size={24} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label={nav.mainNavLabel} className="container-site flex-1 overflow-y-auto py-6">
          <ul className="divide-y divide-line">
            {nav.links.map((l) => (
              <li key={l.href}>
                <CtaLink
                  href={siteHref(l.href)}
                  onClick={() => close(false)}
                  className={`block py-3 font-display text-2xl font-semibold text-ink ${focus}`}
                >
                  {l.label}
                </CtaLink>
              </li>
            ))}
            <li>
              <CtaLink
                href={nav.login.href}
                onClick={() => close(false)}
                className={`block py-3 font-display text-2xl font-semibold text-ink ${focus}`}
              >
                {nav.login.label}
              </CtaLink>
            </li>
          </ul>
        </nav>

        <div className="container-site shrink-0 border-t border-line py-6">
          <CtaLink href={nav.cta.href} onClick={() => close(false)} className="btn-primary w-full">
            {nav.cta.label}
          </CtaLink>
        </div>
      </div>
    </div>
  );
}
