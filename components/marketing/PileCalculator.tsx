"use client";

// 6.3 Pile calculator (#pile). Shows what the visitor is owed, never a recovery estimate.
// Count-up runs 600ms with requestAnimationFrame and is skipped under reduced motion.
import { useEffect, useId, useRef, useState } from "react";
import { calculator } from "@/content/site";
import { CtaLink } from "./CtaLink";

const DURATION = 600;

/** Negative, empty or non-numeric input counts as 0. */
function toNumber(raw: string, integer: boolean): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return integer ? Math.floor(n) : n;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function PileCalculator() {
  const [jobsInput, averageInput] = calculator.inputs;
  const [jobs, setJobs] = useState(String(jobsInput.defaultValue));
  const [average, setAverage] = useState(String(averageInput.defaultValue));

  const total = toNumber(jobs, true) * toNumber(average, false);
  const [shown, setShown] = useState(total);
  const shownRef = useRef(total);
  const uid = useId();

  useEffect(() => {
    const from = shownRef.current;
    if (from === total) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownRef.current = total;
      setShown(total);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = t === 1 ? total : from + (total - from) * eased;
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  const after = calculator.outputTemplate.replace("{amount}", "").trim();
  const announce = calculator.outputTemplate.replace("{amount}", `$${fmt(total)}`);

  const inputClass =
    "num h-12 w-full rounded-lg border border-line bg-surface px-4 text-lg font-semibold text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";

  return (
    <section id={calculator.anchor} aria-labelledby="pile-title" className="section bg-paper">
      <div className="container-site grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
        <div>
          <p className="eyebrow">{calculator.eyebrow}</p>
          <h2 id="pile-title" className="h2 mt-3">
            {calculator.h2}
          </h2>
          <form className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col">
              <label htmlFor={`${uid}-jobs`} className="small block flex-1 font-medium text-ink">
                {jobsInput.label}
              </label>
              <input
                id={`${uid}-jobs`}
                type="number"
                inputMode="numeric"
                min={jobsInput.min}
                step={1}
                value={jobs}
                onChange={(e) => setJobs(e.target.value)}
                className={`mt-2 ${inputClass}`}
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor={`${uid}-average`} className="small block flex-1 font-medium text-ink">
                {averageInput.label}
              </label>
              <div className="relative mt-2">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg font-semibold text-ink-muted"
                >
                  $
                </span>
                <input
                  id={`${uid}-average`}
                  type="number"
                  inputMode="decimal"
                  min={averageInput.min}
                  step="any"
                  value={average}
                  onChange={(e) => setAverage(e.target.value)}
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="card md:p-8">
          {/* Visual count-up is hidden from screen readers; the live region announces the final value. */}
          <div aria-hidden="true">
            <p className="num font-display text-[40px] font-bold leading-tight tracking-tight md:text-[52px]">
              <span className="text-ink-muted">$</span>
              <span className="text-ink">{fmt(shown)}</span>
            </p>
            <p className="mt-1 text-lg text-ink">{after}</p>
          </div>
          <p className="sr-only" aria-live="polite">
            {announce}
          </p>
          <p className="body mt-5 text-ink-muted">{calculator.line}</p>
          <CtaLink href={calculator.cta.href} className="btn-primary mt-6">
            {calculator.cta.label}
          </CtaLink>
          <p className="small mt-5 text-ink-muted">{calculator.finePrint}</p>
        </div>
      </div>
    </section>
  );
}
