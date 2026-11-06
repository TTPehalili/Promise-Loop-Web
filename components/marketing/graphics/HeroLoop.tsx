"use client";

// Hero animation (brief §6.1, §4.7). A loose stack of five overdue invoices straightens
// into the five-stage pipeline, the last card slides into Confirmed paid, the open ring
// draws and closes with the check, then the caption fades in. About 2.7s, plays once.
//
// The final frame is the default styling. Earlier phases are applied only inside
// `@media (prefers-reduced-motion: no-preference) and (scripting: enabled)`, so reduced
// motion, no-JS and older browsers all get the static final frame. Fixed height: no layout shift.

import { useEffect, useState, type CSSProperties } from "react";
import { MARK_CHECK_PATH, MARK_RING_PATH, MARK_VIEWBOX } from "./LoopMark";
import { Money, PIPELINE_STAGES, StatusPill } from "./PipelineGraphic";

type Phase = 0 | 1 | 2 | 3; // 0 stack · 1 pipeline · 2 slide to paid · 3 loop closed

const ROW_TOP = 44; // first row top (px)
const ROW_STEP = 64; // row height 56 + gap 8
const CARD_LEFT = 152; // width of the stage-pill column
const STACK_TOP = 172; // where the loose stack sits

// Fictional example customers. The last card is the one that gets confirmed paid.
const CARDS = [
  { name: "M. Okafor", amount: 2310, days: 94, dx: -14, dy: -34, r: -8 },
  { name: "J. Whitfield", amount: 3480, days: 118, dx: 12, dy: -18, r: 6 },
  { name: "R. Castillo", amount: 1720, days: 67, dx: -10, dy: 28, r: -5 },
  { name: "L. Brennan", amount: 965.25, days: 52, dx: 8, dy: 14, r: 4 },
  { name: "K. Patel", amount: 1284.5, days: 94, dx: 0, dy: 0, r: -2 },
];

const CSS = `
.hl-days{opacity:0}
@media (prefers-reduced-motion:no-preference) and (scripting:enabled){
.hl-card{transition:transform 700ms cubic-bezier(.2,.7,.2,1) var(--hl-d)}
.hl[data-phase="0"] .hl-card{transform:translate(var(--sx),var(--sy)) rotate(var(--r))}
.hl[data-phase="1"] .hl-c5{transform:translate(10px,-58px)}
.hl[data-phase="2"] .hl-c5,.hl[data-phase="3"] .hl-c5{transition-duration:450ms;transition-delay:0ms}
.hl-fade{transition:opacity 400ms ease 300ms}
.hl[data-phase="0"] .hl-fade{opacity:0}
.hl-tint{transition:opacity 300ms ease}
.hl-days{transition:opacity 200ms ease}
.hl-ring{transition:stroke-dashoffset 550ms cubic-bezier(.4,0,.2,1) 150ms,opacity 0ms linear 150ms}
.hl-check{transition:stroke-dashoffset 250ms ease-out 650ms,opacity 0ms linear 650ms}
.hl-caption{transition:opacity 300ms ease 700ms}
.hl:not([data-phase="3"]) .hl-tint,.hl:not([data-phase="3"]) .hl-caption{opacity:0}
.hl:not([data-phase="3"]) .hl-days{opacity:1}
.hl:not([data-phase="3"]) .hl-ring,.hl:not([data-phase="3"]) .hl-check{stroke-dashoffset:1;opacity:0}
}`;

const LABEL =
  "Example data. Five overdue invoices move into the pipeline: New, Contacting, Promised, Waiting for client and Confirmed paid. Loop closed. $1,284.50 confirmed paid.";

export function HeroLoop() {
  const [phase, setPhase] = useState<Phase>(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(3);
      return;
    }
    const timers = [
      window.setTimeout(() => setPhase(1), 250),
      window.setTimeout(() => setPhase(2), 1250),
      window.setTimeout(() => setPhase(3), 1700),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <div className="hl relative h-[400px] w-full max-w-[560px] select-none" data-phase={phase} role="img" aria-label={LABEL}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="flex h-6 items-baseline justify-between" aria-hidden="true">
        <span className="text-sm font-medium text-ink">Pipeline</span>
        <span className="text-xs text-ink-muted">Example data</span>
      </div>

      {/* Stage rows: pill + empty slot */}
      {PIPELINE_STAGES.map((stage, i) => (
        <div key={stage.id} aria-hidden="true">
          <div className="hl-fade absolute left-0 flex h-14 items-center" style={{ top: ROW_TOP + i * ROW_STEP }}>
            <StatusPill stage={stage.id} small />
          </div>
          <div
            className="hl-fade absolute right-0 h-14 rounded-lg border border-dashed border-line"
            style={{ top: ROW_TOP + i * ROW_STEP, left: CARD_LEFT }}
          />
        </div>
      ))}

      {/* Invoice cards. Final position = their row; earlier phases are transforms only. */}
      {CARDS.map((c, i) => {
        const last = i === CARDS.length - 1;
        const vars = {
          top: ROW_TOP + i * ROW_STEP,
          left: CARD_LEFT,
          zIndex: i + 1,
          "--sx": `${-CARD_LEFT / 2 + c.dx}px`,
          "--sy": `${STACK_TOP + c.dy - (ROW_TOP + i * ROW_STEP)}px`,
          "--r": `${c.r}deg`,
          "--hl-d": `${(CARDS.length - 1 - i) * 60}ms`,
        } as CSSProperties;
        return (
          <div
            key={c.name}
            aria-hidden="true"
            className={`hl-card ${last ? "hl-c5" : ""} absolute right-0 h-14 rounded-lg border border-line bg-surface`}
            style={vars}
          >
            {last && <div className="hl-tint absolute inset-0 rounded-lg bg-mint-tint" />}
            <div className="relative flex h-full flex-col justify-center px-3">
              <p className="truncate text-sm font-medium leading-tight text-ink">{c.name}</p>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <Money value={c.amount} className="text-sm leading-none" />
                <span className={`num whitespace-nowrap text-xs leading-none text-ink-muted ${last ? "hl-days" : ""}`}>
                  {c.days} days late
                </span>
              </div>
            </div>
            {last && (
              <svg
                viewBox={MARK_VIEWBOX}
                fill="none"
                className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2"
                aria-hidden="true"
              >
                <path
                  d={MARK_RING_PATH}
                  pathLength={1}
                  strokeDasharray="1 1"
                  className="hl-ring stroke-mint"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d={MARK_CHECK_PATH}
                  pathLength={1}
                  strokeDasharray="1 1"
                  className="hl-check stroke-brand"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        );
      })}

      <p className="hl-caption absolute inset-x-0 text-sm text-ink" style={{ top: 372 }} aria-hidden="true">
        Loop closed. <Money value={1284.5} /> confirmed paid.
      </p>
    </div>
  );
}
