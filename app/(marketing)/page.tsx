// Homepage. Section order and backgrounds follow brief §6.
import { homeMetadata } from "@/content/site";
import { Hero } from "@/components/marketing/Hero";
import { Pile } from "@/components/marketing/Pile";
import { PileCalculator } from "@/components/marketing/PileCalculator";
import { Loop } from "@/components/marketing/Loop";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Visibility } from "@/components/marketing/Visibility";
import { YourTools } from "@/components/marketing/YourTools";
import { CallingTeam } from "@/components/marketing/CallingTeam";
import { Rules } from "@/components/marketing/Rules";
import { Compare } from "@/components/marketing/Compare";
import { Industries } from "@/components/marketing/Industries";
import { Pricing } from "@/components/marketing/Pricing";
import { Faq } from "@/components/marketing/Faq";
import { FinalCta } from "@/components/marketing/FinalCta";

export const metadata = homeMetadata;

export default function HomePage() {
  return (
    <>
      {/* 6.1  paper */}
      <Hero />
      {/* 6.2  paper-deep */}
      <Pile />
      {/* 6.3  #pile paper */}
      <PileCalculator />
      {/* 6.4  #loop paper-deep */}
      <Loop />
      {/* 6.5  #how paper */}
      <HowItWorks />
      {/* 6.6  paper-deep */}
      <Visibility />
      {/* 6.6b #tools paper */}
      <YourTools />
      {/* 6.7  #calls brand (dark) — built separately */}
      <CallingTeam />
      {/* 6.8  #rules paper */}
      <Rules />
      {/* 6.9  #compare paper-deep */}
      <Compare />
      {/* 6.10 paper */}
      <Industries />
      {/* 6.11 #pricing paper-deep */}
      <Pricing />
      {/* 6.12 #faq paper */}
      <Faq />
      {/* 6.13 brand (dark) */}
      <FinalCta />
    </>
  );
}
