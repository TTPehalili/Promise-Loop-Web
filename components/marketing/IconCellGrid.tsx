// Hairline grid of icon cells (used by YourTools 2×2 and Rules 3×2). One column under md.
import type { IconCell } from "@/content/site";
import { Icon } from "./icons";

export function IconCellGrid({
  cells,
  columns,
  className = "",
}: {
  cells: readonly IconCell[];
  columns: 2 | 3;
  className?: string;
}) {
  return (
    <ul
      className={`grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line ${
        columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
      } ${className}`}
    >
      {cells.map((c) => (
        <li key={c.title} className="bg-surface p-6 md:p-8">
          <Icon name={c.icon} className="text-mint-ink" />
          <h3 className="h3 mt-4">{c.title}</h3>
          {/* Content bodies start lowercase (brief "Title — body" form); capitalize for display. */}
          <p className="mt-1 text-ink-muted first-letter:uppercase">{c.body}</p>
        </li>
      ))}
    </ul>
  );
}
