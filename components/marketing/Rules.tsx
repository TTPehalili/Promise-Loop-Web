// 6.8 Calls by the rules (#rules). Paper. 3×2 hairline grid.
import { rules } from "@/content/site";
import { CtaLink, withArrow } from "./CtaLink";
import { IconCellGrid } from "./IconCellGrid";
import { Section, SectionHeader } from "./Section";

export function Rules() {
  return (
    <Section id={rules.anchor} bg="paper" labelledBy="rules-title">
      <SectionHeader id="rules-title" eyebrow={rules.eyebrow} title={rules.h2} body={rules.body} />
      <IconCellGrid cells={rules.cells} columns={3} className="mt-12" />
      <p className="mt-8">
        <CtaLink
          href={rules.link.href}
          className="link-arrow rounded-lg focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          {withArrow(rules.link.label)}
        </CtaLink>
      </p>
    </Section>
  );
}
