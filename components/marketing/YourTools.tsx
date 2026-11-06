// 6.6b Works inside your tools (#tools). Paper. 2×2 hairline grid, one lucide icon per cell.
import { tools } from "@/content/site";
import { IconCellGrid } from "./IconCellGrid";
import { Section, SectionHeader } from "./Section";

export function YourTools() {
  return (
    <Section id={tools.anchor} bg="paper" labelledBy="tools-title">
      <SectionHeader id="tools-title" eyebrow={tools.eyebrow} title={tools.h2} body={tools.body} />
      <IconCellGrid cells={tools.cells} columns={2} className="mt-12" />
      <p className="body mt-8 text-ink">{tools.line}</p>
    </Section>
  );
}
