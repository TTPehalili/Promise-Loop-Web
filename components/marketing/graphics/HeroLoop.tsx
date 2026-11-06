"use client";

// Hero story (brief §6.1, §4.7, plus the field-service opening asked for by the owner):
//   1. A line-art service van drives along the road and parks at a customer's house.
//   2. "Job done" pops above the house.
//   3. The invoice for that job drops out of the house onto the pile of unpaid invoices.
//   4. The pile straightens into the five-stage pipeline.
//   5. That invoice slides into Confirmed paid, the open ring draws and closes with the check,
//      and the caption fades in. About 4.9s in total, plays once.
//
// The final frame is the default styling. Earlier phases only apply inside
// `@media (prefers-reduced-motion: no-preference) and (scripting: enabled)`, so reduced motion,
// no-JS and older browsers all get the static final frame (van parked, job done, loop closed).
// Every element is absolutely positioned inside a fixed-height box: no layout shift.

import { useEffect, useState, type CSSProperties } from "react";
import { CircleCheck } from "lucide-react";
import { MARK_CHECK_PATH, MARK_RING_PATH, MARK_VIEWBOX } from "./LoopMark";
import { Money, PIPELINE_STAGES, StatusPill } from "./PipelineGraphic";

// 0 van waiting · 1 driving · 2 job done · 3 invoice drops on pile · 4 pipeline · 5 slide to paid · 6 loop closed
type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const SCHEDULE: [Phase, number][] = [
  [1, 150],
  [2, 1350],
  [3, 1700],
  [4, 2550],
  [5, 3500],
  [6, 3950],
];

const SCENE_H = 152; // job scene above the pipeline
const ROAD_Y = 140; // road line, from the top of the scene
const K = 1.25; // drawing scale for the van and house
const ROW_TOP = 44; // first pipeline row, from the top of the pipeline block
const ROW_STEP = 64; // row height 56 + gap 8
const CARD_LEFT = 152; // width of the stage-pill column
const STACK_TOP = 172; // where the loose pile sits, from the top of the pipeline block
const HOUSE_W = 112 * K;
const VAN_W = 104 * K;
const VAN_PARK_RIGHT = HOUSE_W + 6; // van parks just left of the house

// Fictional example customers and jobs. The last card is the job we just watched finish.
const CARDS = [
  { name: "M. Okafor", job: "Water heater install", amount: 2310, days: 94, dx: -14, dy: -34, r: -8 },
  { name: "J. Whitfield", job: "Panel upgrade", amount: 3480, days: 118, dx: 12, dy: -18, r: 6 },
  { name: "R. Castillo", job: "AC repair", amount: 1720, days: 67, dx: -10, dy: 28, r: -5 },
  { name: "L. Brennan", job: "Roof leak repair", amount: 965.25, days: 52, dx: 8, dy: 14, r: 4 },
  { name: "K. Patel", job: "Furnace repair", amount: 1284.5, days: 94, dx: 0, dy: 0, r: -2 },
];

// Selector helper: same rule for several phases.
const at = (phases: Phase[], sel: string) => phases.map((p) => `.hl[data-phase="${p}"] ${sel}`).join(",");
const BEFORE = (p: Phase) => ([0, 1, 2, 3, 4, 5, 6] as Phase[]).filter((x) => x < p);

// Card 5's centre over the house door: x relative to its own width, y in px.
const LAST_ROW_TOP = SCENE_H + ROW_TOP + 4 * ROW_STEP;
const DOOR_DY = Math.round(ROAD_Y - 13 * K - (LAST_ROW_TOP + 28));

const CSS = `
.hl-days{opacity:0}
.hl-wheel{transform-box:fill-box;transform-origin:center}
@keyframes hl-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:no-preference) and (scripting:enabled){
.hl-van{transition:transform 1150ms cubic-bezier(.33,.6,.25,1)}
.hl[data-phase="0"] .hl-van{transform:translateX(calc(-100% + ${VAN_W + VAN_PARK_RIGHT}px))}
.hl[data-phase="1"] .hl-wheel{animation:hl-spin .5s linear infinite}
.hl-done{transition:opacity 220ms ease,transform 260ms cubic-bezier(.3,1.5,.5,1)}
${at(BEFORE(2), ".hl-done")}{opacity:0;transform:translateY(6px) scale(.9)}
.hl-card{transition:transform 700ms cubic-bezier(.2,.7,.2,1) var(--hl-d),opacity 150ms linear}
${at(BEFORE(4), ".hl-card")}{transform:translate(var(--sx),var(--sy)) rotate(var(--r))}
${at(BEFORE(3), ".hl-c5")}{transform:translate(calc(50% - ${HOUSE_W - 40 * K}px),${DOOR_DY}px) scale(.25);opacity:0}
.hl[data-phase="3"] .hl-c5{transition-duration:650ms,120ms;transition-delay:0ms}
.hl[data-phase="4"] .hl-c5{transform:translate(10px,-58px)}
${at([5, 6], ".hl-c5")}{transition-duration:450ms;transition-delay:0ms}
.hl-fade{transition:opacity 400ms ease 300ms}
${at(BEFORE(4), ".hl-fade")}{opacity:0}
.hl-tint{transition:opacity 300ms ease}
.hl-days{transition:opacity 200ms ease}
.hl-ring{transition:stroke-dashoffset 550ms cubic-bezier(.4,0,.2,1) 150ms,opacity 0ms linear 150ms}
.hl-check{transition:stroke-dashoffset 250ms ease-out 650ms,opacity 0ms linear 650ms}
.hl-caption{transition:opacity 300ms ease 700ms}
.hl:not([data-phase="6"]) .hl-tint,.hl:not([data-phase="6"]) .hl-caption{opacity:0}
.hl:not([data-phase="6"]) .hl-days{opacity:1}
.hl:not([data-phase="6"]) .hl-ring,.hl:not([data-phase="6"]) .hl-check{stroke-dashoffset:1;opacity:0}
}`;

const LABEL =
  "Example data. A service van parks at a customer's house and the furnace repair is done. The invoice joins a pile of unpaid invoices, which move into the pipeline: New, Contacting, Promised, Waiting for client and Confirmed paid. Loop closed. $1,284.50 confirmed paid.";

function Van() {
  // Line-art service van with a roof ladder. 104 × 56, wheels sit on the road.
  return (
    <svg width={VAN_W} height={56 * K} viewBox="0 0 104 56" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g className="stroke-brand" strokeWidth="1.75">
        <path d="M16 4h56M16 9h56M24 4v5M36 4v5M48 4v5M60 4v5M20 9v4M68 9v4" />
        <path d="M10 13h60l13 14h11a4 4 0 0 1 4 4v11a2 2 0 0 1-2 2H6V17a4 4 0 0 1 4-4Z" className="fill-surface" />
        <path d="M70 17v10h9.5L72 17Z" />
        <path d="M44 17v27" />
        <path d="M95 34h3" />
      </g>
      <path d="M12 31h26" className="stroke-mint" strokeWidth="1.75" />
      {[24, 80].map((cx) => (
        <g key={cx} className="hl-wheel">
          <circle cx={cx} cy="46" r="7" className="fill-paper stroke-brand" strokeWidth="1.75" />
          <path d={`M${cx - 3.5} 46h7M${cx} 42.5v7`} className="stroke-brand" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

function House() {
  // Customer's house with an outdoor HVAC unit. 112 × 88, base on the road.
  return (
    <svg width={HOUSE_W} height={88 * K} viewBox="0 0 112 88" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g className="stroke-ink" strokeWidth="1.75">
        <path d="M4 42 40 12l36 30" />
        <path d="M12 36v50h56V36" />
        <path d="M33 86V64h14v22" />
        <path d="M19 48h10v9H19zM51 48h10v9H51z" />
        <path d="M58 25V16h7v15" />
      </g>
      <g className="stroke-ink-muted" strokeWidth="1.5">
        <rect x="82" y="64" width="24" height="22" rx="2" />
        <path d="M87 70h14M87 75h14M87 80h14" />
      </g>
    </svg>
  );
}

export function HeroLoop() {
  const [phase, setPhase] = useState<Phase>(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(6);
      return;
    }
    const timers = SCHEDULE.map(([p, ms]) => window.setTimeout(() => setPhase(p), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <div
      className="hl relative w-full max-w-[560px] select-none"
      style={{ height: SCENE_H + 400 }}
      data-phase={phase}
      role="img"
      aria-label={LABEL}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Job scene */}
      <div className="absolute inset-x-0 top-0" style={{ height: SCENE_H }} aria-hidden="true">
        <p className="text-xs leading-snug text-ink-muted">
          <span className="font-medium text-ink">Furnace repair</span> · K. Patel
        </p>
        <div className="absolute inset-x-0 h-0.5 rounded-full bg-line" style={{ top: ROAD_Y }} />
        <div className="absolute right-0" style={{ top: ROAD_Y - 88 * K + 1 }}>
          <House />
        </div>
        <div
          className="hl-done absolute flex items-center gap-1 rounded-full border border-mint-tint bg-mint-tint px-2 py-1 text-xs font-medium leading-none text-mint-ink"
          style={{ top: 8, right: 8 }}
        >
          <CircleCheck size={14} strokeWidth={1.5} aria-hidden="true" />
          Job done
        </div>
        <div className="hl-van absolute inset-x-0" style={{ top: ROAD_Y - 56 * K + 3 }}>
          <div className="absolute" style={{ right: VAN_PARK_RIGHT }}>
            <Van />
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="absolute inset-x-0" style={{ top: SCENE_H, height: 400 }} aria-hidden="true">
        <div className="flex h-6 items-baseline justify-between">
          <span className="text-sm font-medium text-ink">Pipeline</span>
          <span className="text-xs text-ink-muted">Example data</span>
        </div>

        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage.id}>
            <div className="hl-fade absolute left-0 flex h-14 items-center" style={{ top: ROW_TOP + i * ROW_STEP }}>
              <StatusPill stage={stage.id} small />
            </div>
            <div
              className="hl-fade absolute right-0 h-14 rounded-lg border border-dashed border-line"
              style={{ top: ROW_TOP + i * ROW_STEP, left: CARD_LEFT }}
            />
          </div>
        ))}

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
              className={`hl-card ${last ? "hl-c5" : ""} absolute right-0 h-14 rounded-lg border border-line bg-surface`}
              style={vars}
            >
              {last && <div className="hl-tint absolute inset-0 rounded-lg bg-mint-tint" />}
              <div className={`relative flex h-full flex-col justify-center px-3 ${last ? "pr-12" : ""}`}>
                <p className="truncate text-sm leading-tight">
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className="text-xs text-ink-muted"> · {c.job}</span>
                </p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <Money value={c.amount} className="text-sm leading-none" />
                  <span className={`num whitespace-nowrap text-xs leading-none text-ink-muted ${last ? "hl-days" : ""}`}>
                    {c.days} days late
                  </span>
                </div>
              </div>
              {last && (
                <svg viewBox={MARK_VIEWBOX} fill="none" className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2">
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

        <p className="hl-caption absolute inset-x-0 text-sm text-ink" style={{ top: 372 }}>
          Loop closed. <Money value={1284.5} /> confirmed paid.
        </p>
      </div>
    </div>
  );
}
