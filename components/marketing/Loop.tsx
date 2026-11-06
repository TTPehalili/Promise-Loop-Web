// 6.4 The loop (#loop). Paper-deep. Desktop: the open ring with five points, the check
// sitting in the gap after Confirmed paid. Mobile: a horizontal track. The ordered list
// carries the content; both drawings are decorative (aria-hidden).
import { loop } from "@/content/site";
import { MARK_CHECK_PATH } from "./graphics/LoopMark";
import { Section, SectionHeader } from "./Section";

// Ring geometry. Angles are clockwise from 12 o'clock. The 60° gap sits at lower right,
// like the mark; stage 1 starts after the gap and stage 5 ends just before it.
const C = 170;
const R = 130;
const GAP_START = 105; // arc ends here (stage 5)
const GAP_END = 165; // arc starts here (stage 1)
const SPAN = 360 - (GAP_END - GAP_START);

const pt = (deg: number, r = R) => {
  const a = (deg * Math.PI) / 180;
  return { x: +(C + r * Math.sin(a)).toFixed(2), y: +(C - r * Math.cos(a)).toFixed(2) };
};
const start = pt(GAP_END);
const end = pt(GAP_START + 360);
const RING_D = `M${start.x} ${start.y} A${R} ${R} 0 1 1 ${end.x} ${end.y}`;
const POINTS = loop.stages.map((_, i) => pt(GAP_END + (SPAN * i) / (loop.stages.length - 1)));
// The mark's check, scaled and moved into the ring's gap.
const gap = pt((GAP_START + GAP_END) / 2);
const CHECK_SCALE = 4.2;
const CHECK_TRANSFORM = `translate(${(gap.x - 29.85 * CHECK_SCALE).toFixed(2)} ${(gap.y - 27.7 * CHECK_SCALE).toFixed(2)}) scale(${CHECK_SCALE})`;

function Ring() {
  return (
    <svg viewBox="0 0 340 340" className="h-auto w-full max-w-[380px]" fill="none" aria-hidden="true" focusable="false">
      <path d={RING_D} className="stroke-mint" strokeWidth="6" strokeLinecap="round" />
      <path
        d={MARK_CHECK_PATH}
        transform={CHECK_TRANSFORM}
        className="stroke-brand"
        strokeWidth={6 / CHECK_SCALE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {POINTS.map((p, i) => {
        const last = i === POINTS.length - 1;
        return (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="19"
              className={last ? "fill-mint-tint stroke-mint-ink" : "fill-surface stroke-line"}
              strokeWidth="1.5"
            />
            <text
              x={p.x}
              y={p.y}
              dy="0.35em"
              textAnchor="middle"
              className={`num font-sans text-[15px] font-semibold ${last ? "fill-mint-ink" : "fill-ink"}`}
            >
              {loop.stages[i].step}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Track() {
  const n = loop.stages.length;
  return (
    <div className="relative" aria-hidden="true">
      <div className="absolute left-[10%] right-[10%] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-mint" />
      <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {loop.stages.map((s, i) => {
          const last = i === n - 1;
          return (
            <li key={s.step} className="flex justify-center">
              <span
                className={`num flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
                  last ? "border-mint-ink bg-mint-tint text-mint-ink" : "border-line bg-surface text-ink"
                }`}
              >
                {s.step}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Loop() {
  return (
    <Section id={loop.anchor} bg="paper-deep" labelledBy="loop-title">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[1fr_1.1fr] md:items-center lg:gap-20">
        <div>
          <SectionHeader id="loop-title" eyebrow={loop.eyebrow} title={loop.h2} body={loop.body} />
          <div className="mt-10 hidden justify-center md:flex">
            <Ring />
          </div>
          <div className="mt-10 md:hidden">
            <Track />
          </div>
        </div>
        <ol className="divide-y divide-line border-y border-line">
          {loop.stages.map((s, i) => {
            const last = i === loop.stages.length - 1;
            return (
              <li key={s.step} className="flex gap-5 py-5">
                <span
                  aria-hidden="true"
                  className={`num mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                    last ? "border-mint-ink bg-mint-tint text-mint-ink" : "border-line bg-surface text-ink"
                  }`}
                >
                  {s.step}
                </span>
                <div>
                  <h3 className="h3">{s.name}</h3>
                  <p className="mt-1 text-ink-muted">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}
