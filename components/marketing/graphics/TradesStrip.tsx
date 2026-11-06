// Thin "built for the trades" strip directly under the nav. Server component, CSS only.
// The trade icons roll in along a road line once (under 1s) and then stay still, so
// there is nothing moving for more than 5 seconds (WCAG 2.2.2) and no pause control is needed.
// Under prefers-reduced-motion the animation is not applied at all (see globals.css block).
// On narrow screens the row scrolls horizontally; it is keyboard focusable for that reason.
import { industries } from "@/content/site";
import { tradeIcon } from "./trades";

export function TradesStrip({ className = "" }: { className?: string }) {
  const lead = industries.h2.replace(/\.$/, "");
  return (
    <div className={`border-b border-line bg-paper ${className}`}>
      <div
        className="container-site overflow-x-auto [scrollbar-width:none] focus-visible:ring-inset"
        tabIndex={0}
        role="region"
        aria-label={lead}
      >
        <div className="pl-trades relative flex h-12 min-w-max items-center gap-6 md:justify-between md:gap-4">
          <span className="text-sm font-medium text-ink">{lead}</span>
          <ul className="flex items-center gap-6 md:gap-8">
            {industries.pills.map((label, i) => {
              const Icon = tradeIcon(label);
              return (
                <li
                  key={label}
                  className="pl-trade flex items-center gap-2 whitespace-nowrap text-sm text-ink-muted"
                  style={{ animationDelay: `${60 + i * 70}ms` }}
                >
                  <Icon size={20} strokeWidth={1.5} aria-hidden="true" className="text-mint-ink" />
                  {label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
