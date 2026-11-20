"use client";

// Cookie notice (privacy policy §13). Small, non-blocking card: no overlay, no focus trap,
// never steals focus on first show, and Escape does nothing (closing needs a button, so
// there is no implied consent). Renders nothing on the server; mounts after hydration.
//
// Placement: bottom-left from `sm` up (the assistant launcher is bottom-right at 20px).
// Under `sm` it spans the width minus 16px margins and sits 80px up, just above the
// 48px launcher (20px + 48px + 12px gap), so the launcher stays visible and tappable.
// z-[44]: above page content and the sticky nav (z-40), below the assistant launcher
// (z-[45]), the mobile menu (z-50) and the assistant panel (z-[60]).
import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { cookieNotice as copy } from "@/content/site";
import {
  CONSENT_OPEN_EVENT,
  getConsent,
  gpcEnabled,
  setConsent,
  type OptionalCategory,
} from "@/lib/consent";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";

type Choice = Record<OptionalCategory, boolean>;

export function CookieNotice() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false); // drives the enter transition
  const [prefs, setPrefs] = useState(false);
  const [choice, setChoice] = useState<Choice>({ analytics: false, marketing: false });
  const [gpc, setGpc] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setGpc(gpcEnabled());
    if (!getConsent()) setOpen(true);
    const reopen = () => {
      const c = getConsent();
      setChoice({ analytics: !!c?.analytics, marketing: !!c?.marketing });
      setGpc(gpcEnabled());
      opener.current = document.activeElement as HTMLElement | null;
      setPrefs(true);
      setOpen(true);
      // Reopened on request from the footer: move focus to the notice (the user asked for it).
      requestAnimationFrame(() => requestAnimationFrame(() => heading.current?.focus()));
    };
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (!open) return setShown(false);
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open) return null;

  function save(c: Choice) {
    setConsent(c);
    setOpen(false);
    setPrefs(false);
    opener.current?.focus();
    opener.current = null;
  }

  const policyLink = (
    <NextLink
      href={copy.policyLink.href}
      className={`small ml-auto inline-flex min-h-[44px] items-center rounded text-ink underline underline-offset-4 hover:no-underline ${focusRing}`}
    >
      {copy.policyLink.label}
    </NextLink>
  );

  return (
    <div
      role="region"
      aria-label={copy.regionLabel}
      className={`fixed inset-x-4 bottom-20 z-[44] max-h-[calc(100dvh-96px)] overflow-y-auto rounded-xl border border-line bg-surface p-5 text-ink shadow-popover transition duration-200 ease-out motion-reduce:transition-none sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[380px] print:hidden ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <h2 ref={heading} tabIndex={-1} className="text-base font-semibold focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
        {copy.heading}
      </h2>
      <p className="small mt-1 text-ink-muted">{copy.body}</p>

      {prefs ? (
        <>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {copy.categories.map((cat) => {
              const essential = cat.id === "essential";
              const locked = essential || gpc;
              const on = essential || (!gpc && choice[cat.id as OptionalCategory]);
              const labelId = `cookie-cat-${cat.id}`;
              return (
                <li key={cat.id} className="flex items-start gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p id={labelId} className="small font-medium text-ink">
                      {cat.label}
                    </p>
                    <p id={`${labelId}-desc`} className="small text-ink-muted">
                      {cat.status}. {cat.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-disabled={locked || undefined}
                    aria-labelledby={labelId}
                    aria-describedby={`${labelId}-desc`}
                    onClick={() => {
                      if (!locked) setChoice((c) => ({ ...c, [cat.id]: !c[cat.id as OptionalCategory] }));
                    }}
                    className={`-my-1 inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-lg ${
                      locked ? "cursor-not-allowed" : ""
                    } ${focusRing}`}
                  >
                    <span
                      aria-hidden
                      className={`relative inline-block h-6 w-10 rounded-full border transition-colors duration-150 ${
                        on ? "border-brand bg-brand" : "border-ink-muted bg-paper-deep"
                      } ${locked ? "opacity-60" : ""}`}
                    >
                      <span
                        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-[left] duration-150 ${
                          on ? "left-[19px] bg-surface" : "left-[3px] bg-ink-muted"
                        }`}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {gpc && <p className="small mt-3 text-ink">{copy.gpcDetected}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button type="button" onClick={() => save(choice)} className="btn-primary">
              {copy.save}
            </button>
            {policyLink}
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => save({ analytics: false, marketing: false })}
            className="btn-primary min-w-[72px]"
          >
            {copy.accept}
          </button>
          <button
            type="button"
            onClick={() => {
              setPrefs(true);
              // The button is replaced by the preferences view: keep focus inside the notice.
              requestAnimationFrame(() => heading.current?.focus());
            }}
            className={`small inline-flex min-h-[44px] items-center rounded px-1 font-medium text-ink underline-offset-4 hover:underline ${focusRing}`}
          >
            {copy.preferences}
          </button>
          {policyLink}
        </div>
      )}
    </div>
  );
}

export default CookieNotice;
