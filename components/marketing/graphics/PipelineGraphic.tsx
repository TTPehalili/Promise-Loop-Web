// Pipeline illustration (brief §4.7, §4.5). Server component; also exports the shared
// stage definitions, StatusPill and Money pieces used by HeroLoop.
import { CircleCheck, Handshake, Hourglass, Inbox, PhoneCall, type LucideIcon } from "lucide-react";

export type StageId = "new" | "contacting" | "promised" | "waiting" | "paid";

export const PIPELINE_STAGES: { id: StageId; label: string; icon: LucideIcon; pill: string }[] = [
  { id: "new", label: "New", icon: Inbox, pill: "border border-line bg-surface text-ink-muted" },
  { id: "contacting", label: "Contacting", icon: PhoneCall, pill: "border border-line bg-surface text-ink" },
  { id: "promised", label: "Promised", icon: Handshake, pill: "border border-mint-tint bg-mint-tint text-brand" },
  { id: "waiting", label: "Waiting for client", icon: Hourglass, pill: "border border-dashed border-ink-muted bg-surface text-ink" },
  { id: "paid", label: "Confirmed paid", icon: CircleCheck, pill: "border border-mint-tint bg-mint-tint text-mint-ink" },
];

/** Status pill: icon + word, never colour alone. */
export function StatusPill({ stage, small = false }: { stage: StageId; small?: boolean }) {
  const s = PIPELINE_STAGES.find((x) => x.id === stage)!;
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full font-medium ${s.pill} ${
        small ? "px-2 py-1 text-xs leading-tight" : "whitespace-nowrap px-2.5 py-1 text-sm leading-none"
      }`}
    >
      <Icon size={small ? 14 : 20} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
      {s.label}
    </span>
  );
}

/** Money per §4.5: `$` and cents in ink-muted, dollars in ink, tabular numerals. */
export function Money({ value, className = "" }: { value: number; className?: string }) {
  const [dollars, cents] = value.toFixed(2).split(".");
  return (
    <span className={`num font-semibold ${className}`}>
      <span className="text-ink-muted">$</span>
      <span className="text-ink">{Number(dollars).toLocaleString("en-US")}</span>
      <span className="text-ink-muted">.{cents}</span>
    </span>
  );
}

type Account = { name: string; job: string; amount: number; meta: string };

// Fictional customers of a fictional trades business. Example data only.
const ACCOUNTS: Record<StageId, Account[]> = {
  new: [
    { name: "M. Okafor", job: "Water heater install", amount: 2310, meta: "94 days late" },
    { name: "Sunrise Dental", job: "Rooftop unit service", amount: 1145.75, meta: "61 days late" },
  ],
  contacting: [
    { name: "J. Whitfield", job: "Panel upgrade", amount: 3480, meta: "Calling today" },
    { name: "T. Nguyen", job: "Drain clearing", amount: 389.5, meta: "Left message" },
  ],
  promised: [{ name: "R. Castillo", job: "AC repair", amount: 1720, meta: "Promised for Nov 14" }],
  waiting: [{ name: "L. Brennan", job: "Roof leak repair", amount: 965.25, meta: "Says paid Nov 5" }],
  paid: [{ name: "K. Patel", job: "Furnace repair", amount: 1284.5, meta: "Confirmed Nov 6" }],
};

export function PipelineGraphic({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <figure className={`rounded-xl border border-line bg-surface p-4 md:p-5 ${className}`}>
      <figcaption className="mb-4 flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-ink">Pipeline</span>
        <span className="text-xs text-ink-muted">Example data</span>
      </figcaption>
      <ol className={`grid grid-cols-1 gap-3 ${compact ? "sm:grid-cols-5 sm:gap-2" : "md:grid-cols-5"}`}>
        {PIPELINE_STAGES.map((stage) => {
          const accounts = compact ? ACCOUNTS[stage.id].slice(0, 1) : ACCOUNTS[stage.id];
          return (
            <li
              key={stage.id}
              className={`min-w-0 gap-2 rounded-lg bg-paper p-2 ${
                compact ? "grid grid-cols-[136px_minmax(0,1fr)] items-center sm:flex sm:flex-col sm:items-stretch" : "flex flex-col sm:p-3"
              }`}
            >
              <div className="min-w-0">
                <StatusPill stage={stage.id} small={compact} />
              </div>
              <ul
                className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-2 md:grid-cols-1"}`}
                aria-label={`${stage.label} accounts`}
              >
                {accounts.map((a) => (
                  <li key={a.name} className="min-w-0 rounded-lg border border-line bg-surface p-2.5">
                    <p className="truncate text-sm font-medium leading-snug text-ink">{a.name}</p>
                    {!compact && <p className="truncate text-xs leading-snug text-ink-muted">{a.job}</p>}
                    <p className="mt-1.5 text-sm leading-none">
                      <Money value={a.amount} />
                    </p>
                    <p className="mt-1.5 truncate text-xs leading-snug text-ink-muted">{a.meta}</p>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
