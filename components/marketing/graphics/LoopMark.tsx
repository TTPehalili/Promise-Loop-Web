// PromiseLoop mark (brief §4.6): open mint ring with a Greenback check in the gap.
// Geometry traced from the approved logo artwork. Never close the ring.
type Variant = "color" | "mono" | "reversed";

const COLORS: Record<Variant, { ring: string; check: string }> = {
  color: { ring: "#1FAA70", check: "#0B3D2E" },
  mono: { ring: "#0B3D2E", check: "#0B3D2E" },
  reversed: { ring: "#1FAA70", check: "#F6F4EE" },
};

export const MARK_RING_PATH = "M22.67 33.74 A14 14 0 1 1 33.95 18.78";
export const MARK_CHECK_PATH = "M23.7 27 L28 31.3 L36 24.1";
export const MARK_VIEWBOX = "3 3 36 36";

export function LoopMark({
  size = 32,
  variant = "color",
  className,
  title,
}: {
  size?: number;
  variant?: Variant;
  className?: string;
  title?: string;
}) {
  const c = COLORS[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d={MARK_RING_PATH} stroke={c.ring} strokeWidth="3.2" strokeLinecap="round" />
      <path d={MARK_CHECK_PATH} stroke={c.check} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
