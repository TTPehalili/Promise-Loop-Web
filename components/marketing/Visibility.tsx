// 6.6 See every promise. Paper-deep. Three points beside a dashboard visual.
import { visibility } from "@/content/site";
import { Money, PIPELINE_STAGES, StatusPill } from "./graphics/PipelineGraphic";
import { Section, SectionHeader } from "./Section";

// TODO: replace with real app screenshot (Pipeline board + Dashboard hero tile with seed data).
// Until then this is a faithful HTML mock. It is exposed as a single image (role="img")
// so swapping in a screenshot later doesn't change what assistive tech hears.
function DashboardMock() {
  const m = visibility.mock;
  return (
    <div role="img" aria-label={visibility.imageAlt} className="overflow-hidden rounded-xl border border-line bg-paper">
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:px-5">
        <span className="text-sm font-semibold text-ink">{m.title}</span>
        <span className="text-xs text-ink-muted">{m.period}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1.4fr_1fr] md:p-5">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-ink-muted">{m.heroTile.label}</p>
          <p className="mt-2 text-[32px] leading-none">
            <Money value={m.heroTile.amount} />
          </p>
          <p className="num mt-3 text-xs text-ink-muted">{m.heroTile.meta}</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {m.tiles.map((t) => (
            <div key={t.label} className="rounded-lg border border-line bg-surface p-3">
              <p className="text-xs text-ink-muted">{t.label}</p>
              <p className="mt-1.5 text-lg leading-none">
                <Money value={t.amount} />
              </p>
              <p className="num mt-1.5 text-xs text-ink-muted">{t.meta}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line p-4 md:p-5">
        <p className="mb-3 text-sm font-medium text-ink">{m.boardLabel}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {PIPELINE_STAGES.map((stage, i) => {
            const a = m.board[i];
            return (
              <div key={stage.id} className="flex min-w-0 flex-col gap-2 rounded-lg bg-paper-deep p-2">
                <div className="min-w-0">
                  <StatusPill stage={stage.id} small />
                </div>
                {a && (
                  <div className="min-w-0 rounded-lg border border-line bg-surface p-2.5">
                    <p className="truncate text-sm font-medium leading-snug text-ink">{a.name}</p>
                    <p className="mt-1.5 text-sm leading-none">
                      <Money value={a.amount} />
                    </p>
                    <p className="mt-1.5 truncate text-xs leading-snug text-ink-muted">{a.meta}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Visibility() {
  return (
    <Section bg="paper-deep" labelledBy="visibility-title">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.6fr] lg:items-center lg:gap-16">
        <div>
          <SectionHeader id="visibility-title" eyebrow={visibility.eyebrow} title={visibility.h2} body={visibility.body} />
          <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-1">
            {visibility.points.map((p) => (
              <li key={p.title} className="border-t border-line pt-4">
                <h3 className="h3">{p.title}</h3>
                <p className="mt-1 text-ink-muted first-letter:uppercase">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <figure>
          <DashboardMock />
          <figcaption className="small mt-3 text-ink-muted">{visibility.caption}</figcaption>
        </figure>
      </div>
    </Section>
  );
}
