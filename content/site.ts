// All homepage copy for the PromiseLoop marketing site.
// Source of truth: PROMISELOOP_WEBSITE_BUILD.md §6.0–§6.14, §7.1–§7.2 and §9.
// Copy is transcribed from the brief. Do not edit it here without going through the
// Copywriter (and Compliance for footer text).
//
// Link tokens: `href: "demo"` and `href: "login"` are not URLs. Map them with
// `demoUrl` / `loginUrl` from `lib/links.ts` in the component that renders the link.

import type { Metadata } from "next";

/* ------------------------------------------------------------------ */
/* Shared types                                                        */
/* ------------------------------------------------------------------ */

/** Anchor, internal path, mailto, or a token resolved via lib/links.ts. */
export type Href = `#${string}` | `/${string}` | `mailto:${string}` | "demo" | "login";

export interface Link {
  label: string;
  href: Href;
}

/** lucide-react v1.x export names used on the site (verified against lucide-react 1.70.0). */
export type IconName =
  | "Phone"
  | "MessageSquare"
  | "Mail"
  | "Database"
  | "Clock"
  | "Gauge"
  | "ShieldCheck"
  | "CirclePause"
  | "PhoneOff"
  | "FileText";

/** A line of text with optional inline links. Strings are plain text. */
export type RichSegment = string | { text: string; href: Href };
export type RichText = readonly RichSegment[];

export interface IconCell {
  icon: IconName;
  title: string;
  body: string;
}

/* ------------------------------------------------------------------ */
/* 6.0 Nav                                                             */
/* ------------------------------------------------------------------ */

export interface Nav {
  logoLabel: string;
  links: readonly Link[];
  login: Link;
  cta: Link;
  menuOpenLabel: string;
  menuCloseLabel: string;
  /** Added by Front-end (a11y microcopy, not in the brief). */
  skipLink: string;
  /** Added by Front-end: accessible names for the nav landmarks and mobile sheet. */
  mainNavLabel: string;
  mobileMenuLabel: string;
}

export const nav: Nav = {
  logoLabel: "PromiseLoop home",
  links: [
    { label: "How it works", href: "#how" },
    { label: "Hear the calls", href: "#calls" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ],
  login: { label: "Log in", href: "login" },
  cta: { label: "Book a demo", href: "demo" },
  menuOpenLabel: "Open menu",
  menuCloseLabel: "Close menu",
  // Added by Front-end: a11y microcopy (not in the brief).
  skipLink: "Skip to content",
  mainNavLabel: "Main",
  mobileMenuLabel: "Menu",
};

/* ------------------------------------------------------------------ */
/* 6.1 Hero                                                            */
/* ------------------------------------------------------------------ */

export interface Hero {
  eyebrow: string;
  h1: string;
  subhead: string;
  primaryCta: Link;
  secondaryCta: Link;
  /** Render joined with " · " (small, muted). */
  trustItems: readonly string[];
  visual: {
    /** Caption that fades in once the loop closes. */
    caption: string;
    /** Label on the graphic. */
    dataLabel: string;
    /** Text shown on the tilted invoice cards. */
    invoiceLateLabel: string;
    ariaLabel: string;
  };
}

export const hero: Hero = {
  eyebrow: "Collections as a service for US field service companies",
  h1: "Your unpaid jobs are a pipeline. We work it.",
  subhead:
    "PromiseLoop is your outsourced collections team in Manila. Trained reps call your customers in your name, on your own dialer, and turn past-due invoices into promises to pay, and promises into confirmed cash. Without burning the customer.",
  primaryCta: { label: "Book a demo", href: "demo" },
  secondaryCta: { label: "Hear a real-style call →", href: "#calls" },
  trustItems: ["No setup fee", "Live in 72 hours", "Calls placed by people, not robots"],
  visual: {
    caption: "Loop closed. $1,284.50 confirmed paid.",
    dataLabel: "Example data",
    invoiceLateLabel: "94 days late",
    ariaLabel:
      "Example data: five unpaid invoices move through the pipeline until one is confirmed paid. Loop closed. $1,284.50 confirmed paid.",
  },
};

/* ------------------------------------------------------------------ */
/* 6.2 The pile                                                        */
/* ------------------------------------------------------------------ */

export interface PileFact {
  day: string;
  text: string;
}

export interface Pile {
  eyebrow: string;
  h2: string;
  body: string;
  facts: readonly PileFact[];
}

export const pile: Pile = {
  eyebrow: "The problem",
  h2: "You did the work. The money's still in a folder.",
  body:
    "Your techs finish the job and move on. The invoice goes out, then a reminder, then nothing. By 90 days it has quietly turned into a write-off, and nobody in the office has time to call.",
  facts: [
    { day: "Day 1", text: "Invoice sent. Everyone expects to get paid." },
    { day: "Day 45", text: "Reminders ignored. Office is too busy to call." },
    { day: "Day 90+", text: "Written off. The job was free." },
  ],
};

/* ------------------------------------------------------------------ */
/* 6.3 Pile calculator (#pile)                                         */
/* ------------------------------------------------------------------ */

export interface CalculatorInput {
  id: "jobs" | "average";
  label: string;
  kind: "count" | "dollars";
  defaultValue: number;
  min: number;
}

export interface Calculator {
  anchor: "pile";
  eyebrow: string;
  h2: string;
  inputs: readonly [CalculatorInput, CalculatorInput];
  /** Replace {amount} with the formatted total, e.g. "$26,000". Default result: $26,000. */
  outputTemplate: string;
  line: string;
  cta: Link;
  finePrint: string;
}

export const calculator: Calculator = {
  anchor: "pile",
  eyebrow: "What's in your pile",
  h2: "How much are you owed right now?",
  inputs: [
    { id: "jobs", label: "Unpaid jobs older than 30 days", kind: "count", defaultValue: 40, min: 0 },
    { id: "average", label: "Average invoice", kind: "dollars", defaultValue: 650, min: 0 },
  ],
  outputTemplate: "{amount} sitting in your pile",
  line: "That's money for work you already did. Let your offshore team work it.",
  cta: { label: "Book a demo", href: "demo" },
  finePrint: "This shows what you're owed, not a promise of what will be collected.",
};

/* ------------------------------------------------------------------ */
/* 6.4 The loop (#loop)                                                */
/* ------------------------------------------------------------------ */

export interface LoopStage {
  step: number;
  name: string;
  body: string;
}

export interface Loop {
  anchor: "loop";
  eyebrow: string;
  h2: string;
  body: string;
  stages: readonly LoopStage[];
  /** Column labels for the pipeline graphic (§4.7). Stage 4 is "Waiting for client" in the app. */
  pipelineColumns: readonly string[];
}

export const loop: Loop = {
  anchor: "loop",
  eyebrow: "How PromiseLoop thinks",
  h2: "Every account runs the same loop.",
  body: "We don't just make calls. We move each account forward until the loop is closed.",
  stages: [
    { step: 1, name: "New", body: "Your account lands in the pipeline." },
    { step: 2, name: "Contacting", body: "A rep calls, by the rules, at a good time." },
    { step: 3, name: "Promised", body: "The customer commits to an amount and a date." },
    { step: 4, name: "Waiting for you", body: "The customer says they paid. You check." },
    { step: 5, name: "Confirmed paid", body: "You confirm it. Loop closed." },
  ],
  pipelineColumns: ["New", "Contacting", "Promised", "Waiting for client", "Confirmed paid"],
};

/* ------------------------------------------------------------------ */
/* 6.5 How it works (#how)                                             */
/* ------------------------------------------------------------------ */

export interface HowStep {
  /** Large muted number, render aria-hidden. */
  number: string;
  title: string;
  body: string;
}

export interface HowItWorks {
  anchor: "how";
  eyebrow: string;
  h2: string;
  steps: readonly HowStep[];
}

export const howItWorks: HowItWorks = {
  anchor: "how",
  eyebrow: "How it works",
  h2: "Plug us in. We make the calls. You confirm the cash.",
  steps: [
    {
      number: "01",
      title: "Plug us into your tools.",
      body:
        "We connect your dialer, texting, email and CRM to PromiseLoop, or you upload a CSV or invoice PDFs. Your past-due accounts land in your pipeline as New.",
    },
    {
      number: "02",
      title: "Your offshore team calls.",
      body:
        "Dedicated reps call, text and email your customers in your company's name, from your numbers, during legal hours, with scripts built around each job.",
    },
    {
      number: "03",
      title: "You confirm, we close the loop.",
      body:
        "Customers pay you directly. You tap Confirmed paid, and our 5% applies only to what you confirm.",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 6.6 See every promise                                               */
/* ------------------------------------------------------------------ */

export interface VisibilityPoint {
  title: string;
  body: string;
}

export interface Visibility {
  eyebrow: string;
  h2: string;
  body: string;
  imageAlt: string;
  caption: string;
  points: readonly VisibilityPoint[];
  /**
   * Added by Front-end: labels and seed data for the HTML dashboard mock that stands in
   * for the app screenshot until one exists. Example data only.
   */
  mock: {
    title: string;
    period: string;
    heroTile: { label: string; amount: number; meta: string };
    tiles: readonly { label: string; amount: number; meta: string }[];
    boardLabel: string;
    /** One example account per pipeline stage, in stage order (New → Confirmed paid). */
    board: readonly { name: string; amount: number; meta: string }[];
  };
}

export const visibility: Visibility = {
  eyebrow: "Your dashboard",
  h2: "Watch every promise move.",
  body:
    "See who was called, what they promised, and when it's due. Payments waiting for your confirmation are one tap away.",
  imageAlt:
    "The PromiseLoop pipeline board and dashboard with example accounts in each stage, from New to Confirmed paid.",
  caption: "Example data.",
  points: [
    { title: "Live pipeline", body: "every account, every stage, every dollar." },
    { title: "Promises due", body: "what's coming in this week, day by day." },
    { title: "Full activity log", body: "every call, result and note, timestamped." },
  ],
  // Added by Front-end: dashboard mock labels + fictional seed data (Example data).
  mock: {
    title: "Dashboard",
    period: "This week",
    heroTile: { label: "Promised this week", amount: 8640.75, meta: "11 promises · 3 due today" },
    tiles: [
      { label: "Waiting for your confirmation", amount: 965.25, meta: "1 payment" },
      { label: "Confirmed paid this month", amount: 14212.5, meta: "19 accounts closed" },
    ],
    boardLabel: "Pipeline",
    board: [
      { name: "M. Okafor", amount: 2310, meta: "94 days late" },
      { name: "J. Whitfield", amount: 3480, meta: "Call booked 10:30 am" },
      { name: "R. Castillo", amount: 1720, meta: "Due Nov 14" },
      { name: "L. Brennan", amount: 965.25, meta: "Says paid Nov 5" },
      { name: "K. Patel", amount: 1284.5, meta: "Confirmed Nov 6" },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* 6.6b Works inside your tools (#tools)                               */
/* ------------------------------------------------------------------ */

export interface Tools {
  anchor: "tools";
  eyebrow: string;
  h2: string;
  body: string;
  cells: readonly IconCell[];
  line: string;
}

export const tools: Tools = {
  anchor: "tools",
  eyebrow: "How we plug in",
  h2: "Your team, your tools, your name.",
  body:
    "We don't ask your customers to deal with a stranger. Your reps work inside your systems, so every touch looks and feels like your office.",
  cells: [
    { icon: "Phone", title: "Your dialer", body: "calls go out from your business number, set to manual dialing." },
    { icon: "MessageSquare", title: "Your texting", body: "texts only to customers who agreed, from your number." },
    { icon: "Mail", title: "Your email", body: "from your address, with an opt-out in every message." },
    {
      icon: "Database",
      title: "Your CRM",
      body: "accounts flow in and results flow back through our API, webhooks or CSV.",
    },
  ],
  line: "Every call, text and email is logged in PromiseLoop, so you see everything in one place.",
};

/* ------------------------------------------------------------------ */
/* 6.7 / 7.1–7.2 Hear the calling team (#calls, dark)                  */
/* ------------------------------------------------------------------ */

/** Speaker keys used in content/mock-calls.json, content/voices.json and content/call-timings.json. */
export type CallSpeaker = "ANA" | "JUN" | "CARTER" | "RACHEL" | "MARCUS" | "TONY";

export interface CallParticipant {
  speaker: CallSpeaker;
  /** Display name on the card. */
  name: string;
  /** Monogram in the small circle (no photos or faces). */
  initials: string;
}

export interface CallCard {
  /** Matches `id` in content/mock-calls.json and the key in content/call-durations.json / call-timings.json. */
  id: 1 | 2 | 3 | 4;
  title: string;
  /** Small line, paper at 70%. */
  situation: string;
  rep: CallParticipant;
  customer: CallParticipant;
  /** Shown with a small mint check. */
  outcome: string;
  audioSrc: `/audio/call-${number}.mp3`;
  /**
   * Placeholder. Real values ("2:41") come from content/call-durations.json,
   * written by scripts/generate-calls.mjs. Null until the MP3 exists.
   */
  duration: string | null;
}

export interface CallingTeam {
  anchor: "calls";
  eyebrow: string;
  h2: string;
  body: string;
  /** Always visible, small, above the cards. */
  label: string;
  cards: readonly CallCard[];
  // Player microcopy. Added for the audio-first dialogue player (not in the brief's §7 copy);
  // plain words, sentence case. Copywriter to review.
  player: {
    /** Accessible names for the play button. Replace {id} and {title}. */
    ariaPlayTemplate: string;
    ariaPauseTemplate: string;
    /** Accessible name for the scrub bar. Replace {title}. */
    ariaSeekTemplate: string;
    /** aria-valuetext for the scrub bar. Replace {elapsed} and {total}. */
    seekValueTemplate: string;
    /** Shown instead of the player while public/audio/call-N.mp3 does not exist. */
    comingSoon: string;
    repRole: string;
    customerRole: string;
    /** Screen-reader text on the participant who is talking. */
    nowSpeaking: string;
    /** Accessible name for the participant pair. */
    participantsLabel: string;
    /** Small, low-emphasis text alternative link (WCAG 1.2.1). */
    showTranscript: string;
    hideTranscript: string;
    /** Region label. Replace {title}. */
    transcriptLabelTemplate: string;
  };
}

export const callingTeam: CallingTeam = {
  anchor: "calls",
  eyebrow: "Hear the calling team",
  h2: "Hard calls. Calm reps. Real commitments.",
  body:
    "Listen to how our reps handle the calls owners dread: the brush-off, the angry complaint, the hardship, the hothead.",
  label:
    "Dramatized calls using AI voices. Scripts follow our real call playbook. Customers and companies are fictional.",
  cards: [
    {
      id: 1,
      title: "The brush-off",
      situation: 'HVAC · $1,284.50 · 94 days late · "Just email me"',
      rep: { speaker: "ANA", name: "Ana", initials: "A" },
      customer: { speaker: "CARTER", name: "Dan Carter", initials: "DC" },
      outcome: "Loop closed: $400 Friday, the rest on the 27th",
      audioSrc: "/audio/call-1.mp3",
      duration: null,
    },
    {
      id: 2,
      title: '"Your guy did a bad job"',
      situation: "Plumbing · $2,150 · 61 days late · Refuses to pay over a mess",
      rep: { speaker: "JUN", name: "Jun", initials: "J" },
      customer: { speaker: "RACHEL", name: "Rachel Morrison", initials: "RM" },
      outcome: "Loop closed: paid in full on the 16th, complaint sent to the owner",
      audioSrc: "/audio/call-2.mp3",
      duration: null,
    },
    {
      id: 3,
      title: '"I can\'t afford it"',
      situation: "Electrical · $3,480 · 120 days late · Hardship",
      rep: { speaker: "ANA", name: "Ana", initials: "A" },
      customer: { speaker: "MARCUS", name: "Marcus Webb", initials: "MW" },
      outcome: "Loop closed: $580 a month for 6 months",
      audioSrc: "/audio/call-3.mp3",
      duration: null,
    },
    {
      id: 4,
      title: "The hothead",
      situation: 'Roofing · $1,890 · 75 days late · "I\'ll report you"',
      rep: { speaker: "JUN", name: "Jun", initials: "J" },
      customer: { speaker: "TONY", name: "Tony Russo", initials: "TR" },
      outcome: "Loop closed: paid in full on the 17th, calls only after 6 PM",
      audioSrc: "/audio/call-4.mp3",
      duration: null,
    },
  ],
  player: {
    ariaPlayTemplate: "Play call {id}, {title}",
    ariaPauseTemplate: "Pause call {id}, {title}",
    ariaSeekTemplate: "Position in {title}",
    seekValueTemplate: "{elapsed} of {total}",
    comingSoon: "Audio coming soon",
    repRole: "PromiseLoop rep",
    customerRole: "Customer",
    nowSpeaking: "Now speaking",
    participantsLabel: "On this call",
    showTranscript: "Transcript",
    hideTranscript: "Hide transcript",
    transcriptLabelTemplate: "{title} transcript",
  },
};

/* ------------------------------------------------------------------ */
/* 6.8 Calls by the rules (#rules)                                     */
/* ------------------------------------------------------------------ */

export interface Rules {
  anchor: "rules";
  eyebrow: string;
  h2: string;
  body: string;
  cells: readonly IconCell[];
  link: Link;
}

export const rules: Rules = {
  anchor: "rules",
  eyebrow: "Compliance",
  h2: "The rules are in the dialer, not a binder.",
  body:
    "Collection calls are regulated, and your name is on every one. PromiseLoop enforces the rules before a rep can dial, even on your own phone system, so your name stays clean.",
  cells: [
    { icon: "Clock", title: "Legal hours only", body: "8 a.m. to 9 p.m. in the customer's time." },
    { icon: "Gauge", title: "Call limits built in", body: "7 attempts in 7 days, stricter where states require." },
    {
      icon: "ShieldCheck",
      title: "Required disclosures",
      body: "every rep says who they are, who they call for, and the notice the law requires.",
    },
    // Brief names `PauseCircle`; in lucide-react 1.x that is a deprecated alias of `CirclePause`.
    { icon: "CirclePause", title: "Disputes pause collection", body: "until the customer gets verification." },
    {
      icon: "PhoneOff",
      title: "Opt-outs honored",
      body: "stop calls, no work calls, email only. Done on the spot.",
    },
    { icon: "FileText", title: "Everything logged", body: "every attempt, result and note, timestamped." },
  ],
  link: { label: "Read the compliance questions →", href: "#faq" },
};

/* ------------------------------------------------------------------ */
/* 6.9 Compare (#compare)                                              */
/* ------------------------------------------------------------------ */

export interface CompareRow {
  label: string;
  agency: string;
  inHouse: string;
  /** Render bold. */
  promiseLoop: string;
}

export interface Compare {
  anchor: "compare";
  eyebrow: string;
  h2: string;
  /** First header cell is empty. The PromiseLoop header renders in `brand`. */
  columns: readonly [string, string, string, string];
  rows: readonly CompareRow[];
  /** Added by Front-end: screen-reader label for the empty first header cell and table caption. */
  firstColumnLabel: string;
  caption: string;
}

export const compare: Compare = {
  anchor: "compare",
  eyebrow: "Why PromiseLoop",
  h2: "Better than an agency. Lighter than a hire.",
  columns: ["", "Collection agency", "In-house hire", "PromiseLoop"],
  // Added by Front-end: a11y labels (rendered sr-only).
  firstColumnLabel: "What you get",
  caption: "PromiseLoop compared with a collection agency and an in-house hire",
  rows: [
    { label: "Works in your name, on your phone numbers", agency: "No", inHouse: "Yes", promiseLoop: "Yes" },
    { label: "Accounts stay in your hands", agency: "No", inHouse: "Yes", promiseLoop: "Yes" },
    { label: "Starts before 90 days late", agency: "Usually not", inHouse: "Yes", promiseLoop: "Yes" },
    { label: "Protects the customer relationship", agency: "Often aggressive", inHouse: "Yes", promiseLoop: "Yes" },
    {
      label: "Calls placed by trained people",
      agency: "Yes",
      inHouse: "One person",
      promiseLoop: "A dedicated offshore team",
    },
    { label: "Rules enforced by software", agency: "Varies", inHouse: "Manual", promiseLoop: "Built in" },
    { label: "See every call in real time", agency: "Monthly report", inHouse: "Depends", promiseLoop: "Live" },
    {
      label: "Cost",
      agency: "Large share of what's collected",
      inHouse: "Salary + benefits",
      promiseLoop: "Monthly retainer + 5% of confirmed payments",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 6.10 Who it's for                                                   */
/* ------------------------------------------------------------------ */

export interface Industries {
  h2: string;
  pills: readonly string[];
  line: string;
}

export const industries: Industries = {
  h2: "Built for the trades.",
  pills: ["HVAC", "Plumbing", "Electrical", "Roofing", "Landscaping", "Pest control", "Cleaning"],
  line: "We know what a service call is, and how to explain the invoice behind it.",
};

/* ------------------------------------------------------------------ */
/* 6.11 Pricing (#pricing)                                             */
/* ------------------------------------------------------------------ */

export interface PriceLine {
  label: string;
  detail?: string;
}

export interface Pricing {
  anchor: "pricing";
  eyebrow: string;
  h2: string;
  card: {
    planLabel: string;
    /** Never show a retainer amount. */
    priceLines: readonly [PriceLine, PriceLine];
    includesLabel: string;
    includes: readonly string[];
    cta: Link;
    finePrint: string;
  };
  /** Under the card; opens the demo booking. */
  quoteCta: Link;
}

export const pricing: Pricing = {
  anchor: "pricing",
  eyebrow: "Pricing",
  h2: "A dedicated team for a flat retainer. 5% when you get paid.",
  card: {
    planLabel: "Your outsourced collections team",
    priceLines: [
      { label: "Monthly retainer", detail: "quoted for the size of team you need" },
      { label: "+ 5% of payments you confirm" },
    ],
    includesLabel: "Includes",
    includes: [
      "dedicated reps working your US business hours",
      "calls, texts and emails through your own tools",
      "live pipeline and dashboard",
      "compliance rules built in",
      "call recordings and full activity log",
      "CSV, API and webhook imports",
    ],
    cta: { label: "Book a demo", href: "demo" },
    finePrint: "No setup fee. Live within 72 hours. Cancel with 30 days' notice.",
  },
  quoteCta: { label: "Get your quote", href: "demo" },
};

/* ------------------------------------------------------------------ */
/* 6.12 FAQ (#faq) — items live in content/faq.ts                      */
/* ------------------------------------------------------------------ */

export interface FaqSection {
  anchor: "faq";
  h2: string;
}

// Added by Front-end: the brief gives no FAQ heading. Copywriter to confirm.
export const faqSection: FaqSection = {
  anchor: "faq",
  h2: "Frequently asked questions",
};

/* ------------------------------------------------------------------ */
/* 6.13 Final CTA (dark)                                               */
/* ------------------------------------------------------------------ */

export interface FinalCta {
  h2: string;
  body: string;
  cta: Link;
}

export const finalCta: FinalCta = {
  h2: "Bring us your 10 oldest invoices.",
  body: "In a 20-minute demo, we'll show you how your offshore team would move them through the loop.",
  cta: { label: "Book a demo", href: "demo" },
};

/* ------------------------------------------------------------------ */
/* 9 Footer                                                            */
/* ------------------------------------------------------------------ */

export interface FooterColumn {
  heading: string;
  links: readonly Link[];
}

export interface Footer {
  brand: {
    logoLabel: string;
    tagline: string;
    description: string;
  };
  columns: readonly FooterColumn[];
  /** Full legal line. Replace {year} with new Date().getFullYear(). */
  legalLineTemplate: string;
  /** Location alone, if the layout splits it from the copyright. */
  location: string;
  /** Small lines under the legal line. */
  complianceLines: readonly RichText[];
  /** Slim footer for /login: legal line plus these links. */
  slimLinks: readonly Link[];
  /** Added by Front-end: accessible name for the footer link columns nav. */
  navLabel: string;
}

export const footer: Footer = {
  brand: {
    logoLabel: "PromiseLoop",
    tagline: "Every promise, followed through.",
    description: "Collections as a service for US service businesses.",
  },
  columns: [
    {
      heading: "Product",
      links: [
        { label: "How it works", href: "#how" },
        { label: "Hear the calling team", href: "#calls" },
        { label: "Pricing", href: "#pricing" },
        { label: "FAQ", href: "#faq" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "Contact", href: "mailto:hello@promiseloop.com" },
        { label: "Log in", href: "login" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Consumer rights", href: "/privacy#your-rights" },
      ],
    },
  ],
  legalLineTemplate: "© {year} PromiseLoop. All rights reserved. · Manila, Philippines",
  location: "Manila, Philippines",
  complianceLines: [
    [
      "PromiseLoop provides outsourced accounts receivable calling for its clients. When we contact consumers about a debt on a client's behalf, it is an attempt to collect a debt.",
    ],
    [
      // TODO(compliance): the brief's "(Add license numbers here if a state requires them on the
      // website.)" is an instruction, not copy. Add license numbers here once counsel confirms
      // which states require them.
      "We follow federal collection law and the state rules of each client and their customers. Licensing details available on request.",
    ],
    [
      "Received a call from us? ",
      { text: "Learn about your rights", href: "/privacy#your-rights" },
      ", or tell us how you'd like to be contacted: ",
      // TODO: a dedicated consumer line / email is pending. hello@promiseloop.com is the only
      // real contact address for now. Replace when the consumer line exists.
      { text: "hello@promiseloop.com", href: "mailto:hello@promiseloop.com" },
      ".",
    ],
  ],
  slimLinks: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
  // Added by Front-end: a11y label.
  navLabel: "Footer",
};

/* ------------------------------------------------------------------ */
/* 6.14 SEO metadata                                                   */
/* ------------------------------------------------------------------ */

export const homeMetadata: Metadata = {
  title: "PromiseLoop — Collections as a service for US service businesses",
  description:
    "An outsourced collections team in Manila that calls your customers in your name, on your own dialer, and turns past-due invoices into promises to pay and confirmed payments. Built for HVAC, plumbing, electrical and roofing companies.",
  alternates: { canonical: "https://promiseloop.com" },
  openGraph: {
    title: "Your unpaid jobs are a pipeline. We work it.",
    type: "website",
    url: "https://promiseloop.com",
  },
};

export const privacyMetadata: Metadata = {
  title: "Privacy Policy — PromiseLoop",
  description:
    "What personal information PromiseLoop collects, how we use and protect it, and the rights you have when we contact you about a bill.",
  alternates: { canonical: "https://promiseloop.com/privacy" },
};

export const termsMetadata: Metadata = {
  title: "Terms of Service — PromiseLoop",
  description: "The terms for business clients using PromiseLoop's website, platform and outsourced calling services.",
  alternates: { canonical: "https://promiseloop.com/terms" },
};
