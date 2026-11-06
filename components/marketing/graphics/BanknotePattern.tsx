import { useId } from "react";

// Banknote line pattern (brief §4.7): fine guilloche-style concentric wave lines,
// paper at ~7% opacity, background texture for the dark brand sections only.
// One wavy ring is defined once and reused at growing scales and alternating
// rotations so the lines cross like an engraved rosette. Rendered markup is ~3.9KB.

const WAVES = 10; // waves per ring
const STEPS = 60; // samples per ring (6 per wave)

// Closed wavy circle r = 100 + 5·sin(10θ), smoothed with Catmull-Rom → cubic Béziers.
const RING_PATH = (() => {
  const pts: [number, number][] = [];
  for (let i = 0; i < STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2;
    const r = 100 + 5 * Math.sin(WAVES * t);
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < STEPS; i++) {
    const p0 = pts[(i - 1 + STEPS) % STEPS];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % STEPS];
    const p3 = pts[(i + 2) % STEPS];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(
      p2[1] - (p3[1] - p1[1]) / 6,
    )} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
})();

const RINGS = Array.from({ length: 28 }, (_, i) => ({
  s: (1 + i * 0.25).toFixed(2),
  r: i % 2 === 0 ? i * 3 : -i * 3 - 9,
}));

export function BanknotePattern({ className = "" }: { className?: string }) {
  const id = `bn${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none absolute inset-0 h-full w-full text-paper opacity-[0.07] ${className}`}
      viewBox="0 0 1200 640"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <path id={id} d={RING_PATH} vectorEffect="non-scaling-stroke" />
      </defs>
      <g transform="translate(940 320)" stroke="currentColor" strokeWidth="1">
        {RINGS.map((x, i) => (
          <use key={i} href={`#${id}`} transform={`rotate(${x.r}) scale(${x.s})`} />
        ))}
      </g>
    </svg>
  );
}
