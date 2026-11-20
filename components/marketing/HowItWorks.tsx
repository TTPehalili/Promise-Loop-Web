// 6.5 How it works (#how). Paper. Heading on top; below it the demo video with steps 01–03
// as its chapters (HowItWorksDemo is the only client piece).
import { howItWorks } from "@/content/site";
import { HowItWorksDemo } from "./HowItWorksDemo";
import { Section, SectionHeader } from "./Section";

export function HowItWorks() {
  return (
    <Section id={howItWorks.anchor} bg="paper" labelledBy="how-title">
      <SectionHeader id="how-title" eyebrow={howItWorks.eyebrow} title={howItWorks.h2} />
      <HowItWorksDemo steps={howItWorks.steps} />
    </Section>
  );
}
