# PromiseLoop Marketing Website — Master Build Brief

> **For:** Claude running inside Google Antigravity IDE
> **Repo:** `apo-collections-mvp` (Next.js 14 App Router, TypeScript, Tailwind CSS, lucide-react)
> **Version:** 1.2 · November 7, 2026 (collections as a service from Manila, undisclosed retainer + 5%, client-dialer setup)
> **Owner:** Zion
> **What this file is:** the single source of truth for building the PromiseLoop marketing site. It defines the agent team, the order of work, the design system, the complete web copy, the interactive mock-call section, the FAQ, the footer and the legal pages. Do not invent content that contradicts this file.

---

## 0. Instructions to Claude (read first)

You are the **Orchestrator**. Your job is to deliver a production-ready marketing website by delegating to the specialist agents in §2 and integrating their work.

1. Read this whole file before writing any code.
2. Create a task list from §3 (phases and tasks). Keep it updated as tasks finish.
3. **Call the agents.** For every task, launch the agent named in the task as a subagent with a brief that contains: the goal, the exact section(s) of this file it must follow, the files it may touch, and its acceptance criteria. Run tasks that have no dependency on each other **in parallel** (each phase lists which ones can). If your environment cannot spawn subagents, run each agent's task yourself as a separate, focused pass and switch fully into that role's rules before you start it.
4. After each phase, run the phase gate (§3) before starting the next phase. A failed gate goes back to the agent that owns it.
5. Never change the copy in §6–§10 without flagging it. The Copywriter agent owns copy changes; the Compliance agent must approve any change to §8, §9 or §10.
6. Never ship text in `[BRACKETS]`. Bracketed items are placeholders the business fills in. Hide the element or leave a TODO comment instead.
7. Never put an API key in client code or commit it. Secrets live in `.env.local` (gitignored).
8. When everything passes §12, report back with: what was built, the routes, open placeholders, and anything you could not finish.

---

## 1. Product truth (every agent must know this)

- **PromiseLoop** is an outsourcing company based in **Manila, Philippines**, providing **collections as a service** for service-based companies in the USA (HVAC, plumbing, electrical, roofing, landscaping, pest control, cleaning and other service businesses). It works as the client's offshore collections team, not a traditional collection agency.
- **State rules:** each client is set up under its own state's collection rules (call limits, disclosures, licensing), plus the rules of the customer's state when it differs. Call hours always use the customer's local time.
- **Company identity on the site:** "PromiseLoop" and "Manila, Philippines" only. No legal-entity name, street address or phone placeholders.
- Field service companies **hire PromiseLoop's calling team** as their offshore billing team, working under the client's name, on the client's dialer and caller ID, to make collection calls on their behalf. Reps always also name PromiseLoop ("This is Ana, calling for Lone Star HVAC with PromiseLoop"). The reps work from **Manila, Philippines**, during US business hours.
- On consumer accounts PromiseLoop acts as a **third-party debt collector** under the FDCPA and CFPB Regulation F.
- Every account follows **the loop:** New → Contacting → Promised → Waiting for client → Confirmed paid.
- **PromiseLoop never takes payments.** Customers pay the client directly (the client's own payment link or office). The client confirms payments; only confirmed payments close an account and count toward fees.
- Pricing model: a monthly retainer that covers the dedicated calling team, plus 5% of payments the client confirms. **The retainer amount is never shown on the website**; it is quoted on a call based on team size. No setup fee.
- **Dialing:** reps call through the client's own dialer or phone system (access given during onboarding), set to manual dialing, with caller ID showing the client's business. Customers see the client's number and the calls stay in the client's phone records. Texts and emails also go out through the client's own SMS and email tools, connected to PromiseLoop by integration, and every message is logged in PromiseLoop.
- **Brand promise:** "Every promise, followed through."
- **Positioning:** turn unpaid jobs into a working pipeline — from write-off to paid — without burning the customer relationship.
- **Never name our tech stack on the website** (hosting, database, email, AI or telephony vendors, frameworks). Public pages, including the legal pages, describe providers by category only.
- **Do not claim:** Stripe or card payments, a payment portal, a billing chatbot, "guaranteed compliance", recovery rates or statistics we don't have, or integrations (ServiceTitan, Jobber, Housecall Pro) that aren't built. Say "CSV, API and webhooks" instead.
- The old docs `APO-Website-Spec-and-Copy.md` and `APO MVP Website Dev.md` are **superseded** by this file wherever they disagree (blue palette, Stripe, payment portal, "no motion" rule).

---

## 2. The agent team

| Agent | Owns | Inputs | Outputs |
|---|---|---|---|
| **Orchestrator** (you) | Plan, delegation, integration, phase gates, final report | This file | Task list, merged code, final report |
| **Brand & UI Designer** | Design tokens, layout, components, responsive rules, accessibility of visuals | §4, §5 | `tailwind.config.ts` tokens, `app/globals.css`, component specs, `DESIGN.md` |
| **Graphics & Motion Designer** | Logo SVG, loop mark, hero animation, pipeline illustration, banknote line pattern, favicon, OG image | §4.6, §4.7, §6.1 | `public/brand/*.svg`, `components/marketing/graphics/*`, `app/icon.svg`, `app/opengraph-image.tsx` |
| **SaaS Copywriter** | All web copy, microcopy, SEO metadata, alt text | §6–§9 | `content/site.ts` (all strings), metadata |
| **Front-end Developer** | Next.js pages, components, interactivity, performance | Everything above | `app/(marketing)/**`, `components/marketing/**` |
| **Audio Producer** | ElevenLabs mock-call generation script and MP3s | §7, Appendix A | `scripts/generate-calls.mjs`, `content/mock-calls.json`, `public/audio/*.mp3` |
| **Compliance Reviewer** | Checks every claim against US collection law and against what the product enforces | §8, §9, §10, §11 | Review report; blocks release on any false or risky claim |
| **QA & Accessibility** | Lighthouse, axe, keyboard, mobile, broken links, placeholders | §12 | QA report with pass/fail per item |

**Agent rules that apply to everyone**
- Plain words. Sentence case. No exclamation marks. No emoji anywhere.
- Say "customer", "account", "unpaid job", "promise to pay", "calling team", "confirmed paid".
- Never say "debtor", "deadbeat", "delinquent", "chase", "hunt", "pressure", "trash".
- "Loop" always means **closing** the loop. Never imply calling people over and over.
- Numbers over adjectives. Tabular numerals for all money, dates and counts.

---

## 3. Phases and tasks

### Phase 1 — Foundations (run 1A, 1B, 1C in parallel)

| ID | Agent | Task | Acceptance |
|---|---|---|---|
| 1A | Brand & UI Designer | Implement §4 tokens in `tailwind.config.ts` and `app/globals.css`. Load Manrope (600, 700) and Inter (400, 500, 600) with `next/font/google`. Write `DESIGN.md` summarizing tokens and components | Tokens used by name, no raw hex in components; contrast table in §4.2 passes |
| 1B | Graphics & Motion Designer | Build the logo and mark as SVG (§4.6), favicon, OG image, banknote line pattern | Mark readable at 16px; no gradients; files in `public/brand/` |
| 1C | SaaS Copywriter | Put every string from §6–§9 into `content/site.ts`, typed. Write metadata (§6.14) | No copy hard-coded in components later; no bracket text rendered |

**Gate 1:** Orchestrator checks tokens, logo, and `content/site.ts` compile; Compliance Reviewer reads `content/site.ts` against §1 and §11.

### Phase 2 — Build (run 2A, 2B, 2C, 2D in parallel)

| ID | Agent | Task | Acceptance |
|---|---|---|---|
| 2A | Front-end Developer | Marketing layout, nav, footer (§6.0, §9), homepage sections §6.1–§6.13 (including §6.6b) | Matches layout specs; server components by default |
| 2B | Graphics & Motion Designer | Hero loop animation and pipeline graphic (§6.1, §4.7) as React components (SVG + CSS), with reduced-motion fallback | Plays once, ≤ 3s, no layout shift; static frame when `prefers-reduced-motion` |
| 2C | Audio Producer | Generation script and mock-call JSON from Appendix A (§7) | Script runs locally with `.env.local`; never runs in the browser |
| 2D | Front-end Developer | Legal pages `/privacy` and `/terms` from §10 | Anchors work, including `/privacy#your-rights` |

**Gate 2:** pages render with no console errors; every section present in order.

### Phase 3 — Interactivity (2C must be done)

| ID | Agent | Task | Acceptance |
|---|---|---|---|
| 3A | Front-end Developer | Mock-call cards with one Listen button each and transcript toggle (§7) | One audio plays at a time; keyboard and screen-reader usable |
| 3B | Front-end Developer | "What's in your pile" calculator (§6.3) | Count-up respects reduced motion; no recovery promises |
| 3C | Front-end Developer | FAQ accordion (§8) | One open at a time; `aria-expanded`, Enter and Space work |

### Phase 4 — Review (run 4A and 4B in parallel)

| ID | Agent | Task |
|---|---|---|
| 4A | Compliance Reviewer | Full review against §11. Every FAQ claim must match a product rule that exists. List anything to remove or soften |
| 4B | QA & Accessibility | Run §12 in full and report |

### Phase 5 — Fix and ship

Orchestrator routes each finding to its owner, re-runs the failed checks, and writes the final report.

---

## 4. Design system

### 4.1 Direction

Calm, precise, quietly confident. The site should feel like a steady office manager who gets results, printed on banknote paper. Restraint carries trust: white space, hairline rules, one green that means "paid", real numbers set like a ledger.

**Signature idea:** the open ring from the logo. It appears as the hero animation (the loop closes into a check), as section markers, and as the "Loop closed" outcome on each mock call.

**Never:** gradients (including gradient text), glassmorphism (except the nav's backdrop blur), drop shadows on cards, stock photos, AI-generated people, 3D, device mockups, emoji, badges, seals, gavels, flags or anything that looks like legal or government authority, more than one primary button per section, ALL-CAPS body text.

### 4.2 Color tokens (Palette "Greenback")

| Token | Hex | Role |
|---|---|---|
| `paper` | `#F6F4EE` | Page background |
| `surface` | `#FFFFFF` | Cards, table cells, FAQ rows |
| `paper-deep` | `#EEEBE2` | Alternate sections |
| `line` | `#E2DED3` | 1px borders and dividers |
| `ink` | `#14161B` | Headlines, body text, numbers |
| `ink-muted` | `#555B66` | Secondary text, captions |
| `brand` | `#0B3D2E` | Greenback: primary buttons, dark sections, logo "Promise" |
| `brand-hover` | `#082E22` | Primary button hover |
| `mint` | `#1FAA70` | Logo symbol and "Loop", icons, chart fills, "paid" moments. Graphics and large text only |
| `mint-ink` | `#157A50` | Mint used as text and links |
| `mint-tint` | `#E6F4EC` | Paid highlight background |
| `gold` | `#C9A227` | Rare accent on dark backgrounds only (under 5% of the page) |
| `rose` | `#B4534B` | Disputed / missed status only |
| `focus` | `#1FAA70` | 2px focus ring with 2px offset |

**Ratio:** about 60% paper, 25% brand and ink, 10% mint, under 5% gold.

**Contrast (WCAG AA):** ink on paper 16.5:1 · brand on paper 11.1:1 · mint-ink on paper 4.9:1 · white on brand 12.6:1 · white on mint-ink 5.3:1 · gold on brand 5.0:1. Mint on paper is 2.7:1, so never use `mint` for body text. Gold is never text on paper.

### 4.3 Typography

| Role | Font | Weight | Size (mobile → desktop) | Notes |
|---|---|---|---|---|
| H1 | Manrope | 700 | 40 → 60px / 1.05 | `tracking-tight`, `text-balance` |
| H2 | Manrope | 600 | 30 → 40px / 1.15 | `text-balance` |
| H3 | Inter | 600 | 18 → 20px / 1.4 | |
| Body | Inter | 400 | 16 → 18px / 1.6 | `max-w-[65ch]` |
| Small | Inter | 400 | 14px / 1.5 | Tables, fine print, footer |
| Eyebrow | Inter | 500 | 13px | Sentence case, `mint-ink`, no letter-spacing tricks |
| Money and numbers | Inter | 600 | contextual | Always `tabular-nums` |

Max two weights per section. Never 800+.

### 4.4 Layout

- Container `max-w-6xl mx-auto px-6`; legal pages `max-w-3xl`.
- Section padding `py-20 md:py-28`. Sections alternate `paper` and `paper-deep`; two dark (`brand`) sections maximum: the mock-call section and the final CTA.
- Grid on a 4px scale: 8, 12, 16, 24, 32, 48, 64, 96.
- Radius: 8px buttons and inputs, 12px cards, full for pills and avatars.
- Depth: borders only. One shadow allowed, for the audio player popover: `0 8px 24px -8px rgb(20 22 27 / 0.12)`.
- Breakpoints: design at 375, 768, 1280. Every multi-column grid becomes one column under `md`.

### 4.5 Components

- **Button primary:** `bg-brand text-white rounded-lg px-5 py-3 font-medium hover:bg-brand-hover`. On dark sections: `bg-paper text-brand`.
- **Button secondary:** text link with arrow, `text-ink underline-offset-4 hover:underline` (arrow is a text character "→").
- **Card:** `bg-surface border border-line rounded-xl p-6`.
- **Status pill:** icon + word, never color alone. New (ink-muted), Contacting (ink), Promised (gold on brand, or brand on mint-tint), Waiting for client (dashed border), Confirmed paid (mint-ink on mint-tint), Disputed (rose).
- **Money:** `$` and cents in `ink-muted`, dollars in `ink`, `tabular-nums`.
- **Focus:** `focus-visible:ring-2 ring-focus ring-offset-2` on every interactive element.
- **Touch targets:** 44×44px minimum.
- Icons: lucide-react, `size={20} strokeWidth={1.5}`.

### 4.6 Logo and mark

- **Mark:** an open mint (`#1FAA70`) ring, about 300° of arc, with a Greenback (`#0B3D2E`) check sitting in the gap so the check "closes" the loop. Stroke-based, round caps, geometric.
- **Wordmark:** "Promise" in Greenback, "Loop" in mint, Manrope 700, tight tracking. Never retype it in a different font.
- **Lockups:** horizontal (nav, footer), stacked, symbol only (favicon, 16px minimum), one-color Greenback, reversed (paper on Greenback, used in the footer).
- **Clear space:** the height of the check on all sides.
- **Don't:** close the ring fully, add a dollar sign, coin or phone, rotate, stretch, add shadows or gradients, recolor "Loop".
- Deliver: `public/brand/logo-horizontal.svg`, `logo-stacked.svg`, `mark.svg`, `logo-reversed.svg`, `app/icon.svg`, `app/apple-icon.png` (180px).

### 4.7 Graphics and motion

- **Banknote line pattern:** a fine guilloche-style line pattern (thin concentric wave lines at 6–8% opacity of paper on brand) used only as the background texture of dark sections. SVG, under 4KB, `aria-hidden`.
- **Pipeline graphic:** five stage columns (New, Contacting, Promised, Waiting for client, Confirmed paid) with small account cards. Used in the hero and in "The loop" section.
- **Motion rules:** only motion that confirms something real. 150–200ms for hovers; the hero sequence ≤ 3s and plays once on load; calculator count-up 600ms. Everything instant under `prefers-reduced-motion`.
- **OG image:** 1200×630, paper background, the H1 in Manrope 700 Greenback, the mark at right, horizontal logo bottom-left.

---

## 5. Technical spec

- **Stack:** Next.js App Router, TypeScript, Tailwind, lucide-react. **Upgrade Next.js** to the latest patched 14.x (or 15.x if the app supports it) before launch; 14.2.24 has a security advisory.
- **Routes:**
  ```
  app/(marketing)/layout.tsx      Nav + Footer
  app/(marketing)/page.tsx        Home (sections §6.1–§6.13)
  app/(marketing)/privacy/page.tsx
  app/(marketing)/terms/page.tsx
  /login                          already exists; add the slim footer
  ```
- **Files:**
  ```
  content/site.ts                 all homepage copy, typed
  content/faq.ts                  FAQ items (§8)
  content/legal/privacy.md        §10.1
  content/legal/terms.md          §10.2
  content/mock-calls.json         Appendix A as data
  components/marketing/*          Nav, Footer, Hero, Pile, Loop, HowItWorks, Visibility, YourTools,
                                  CallingTeam (+ CallCard, Transcript), Rules, Compare,
                                  Industries, Pricing, Faq, FinalCta, Fineprint
  components/marketing/graphics/* LoopMark, HeroLoop, PipelineGraphic, BanknotePattern
  scripts/generate-calls.mjs      ElevenLabs generation (local only)
  public/audio/call-1..4.mp3
  ```
- **Client components only where needed:** mobile menu, hero animation trigger, calculator, call player, FAQ accordion. Everything else is a server component.
- **Performance:** Lighthouse 95+ on mobile for Performance, Accessibility, Best Practices, SEO. Audio uses `preload="none"`. Fonts via `next/font` only.
- **SEO:** `sitemap.ts` and `robots.ts` (index `/`, `/privacy`, `/terms`; disallow `/dashboard`, `/admin`, `/api`, `/login`). Canonical URLs on `https://promiseloop.com`.
- **Middleware:** marketing routes stay public. Do not change `/dashboard` protection.
- **Remove:** any Stripe, "Pay now", payment-portal or billing-assistant copy from marketing routes.

---

## 6. Homepage — section by section

Order and backgrounds:

| # | Section | Anchor | Background |
|---|---|---|---|
| 6.0 | Nav | — | paper, sticky |
| 6.1 | Hero | — | paper |
| 6.2 | The pile | — | paper-deep |
| 6.3 | Pile calculator | `#pile` | paper |
| 6.4 | The loop | `#loop` | paper-deep |
| 6.5 | How it works | `#how` | paper |
| 6.6 | See every promise | — | paper-deep |
| 6.6b | Works inside your tools | `#tools` | paper |
| 6.7 | Hear the calling team | `#calls` | **brand (dark)** |
| 6.8 | Calls by the rules | `#rules` | paper |
| 6.9 | Compare | `#compare` | paper-deep |
| 6.10 | Who it's for | — | paper |
| 6.11 | Pricing | `#pricing` | paper-deep |
| 6.12 | FAQ | `#faq` | paper |
| 6.13 | Final CTA | — | **brand (dark)** |
| — | Footer | — | brand, reversed logo |

Every section uses `scroll-mt-20` so the sticky nav doesn't cover headings.

### 6.0 Nav

```
[Logo]      How it works   Hear the calls   Pricing   FAQ        Log in   [Book a demo]
```
Sticky, `bg-paper/90 backdrop-blur border-b border-line`, 64px tall. Mobile: logo + menu button opening a full-screen paper sheet with the links stacked (text-2xl, py-3) and a full-width "Book a demo" at the bottom; closes on Escape and on link click; body scroll locked while open.

### 6.1 Hero

- **Eyebrow:** Collections as a service for US service businesses
- **H1:** Your unpaid jobs are a pipeline. We work it.
- **Subhead:** PromiseLoop is your outsourced collections team in Manila. Trained reps call your customers in your name, on your own dialer, and turn past-due invoices into promises to pay, and promises into confirmed cash. Without burning the customer.
- **Primary CTA:** Book a demo
- **Secondary:** Hear a real-style call →  (scrolls to `#calls`)
- **Trust line (small, muted):** No setup fee · Live in 72 hours · Calls placed by people, not robots

**Visual (right column on desktop, below text on mobile):** `HeroLoop`. A loose stack of 5 tilted invoice cards (customer name, amount, "94 days late") straightens into the five-stage pipeline; the last card slides into Confirmed paid; the open ring draws around it and closes with the check; the caption fades in: **"Loop closed. $1,284.50 confirmed paid."** Label the graphic "Example data". Reduced motion: show the final frame.

### 6.2 The pile

- **Eyebrow:** The problem
- **H2:** You did the work. The money's still in a folder.
- **Body:** Your techs finish the job and move on. The invoice goes out, then a reminder, then nothing. By 90 days it has quietly turned into a write-off, and nobody in the office has time to call.
- **Three short facts (row of three, ledger style):**
  - **Day 1** — Invoice sent. Everyone expects to get paid.
  - **Day 45** — Reminders ignored. Office is too busy to call.
  - **Day 90+** — Written off. The job was free.

### 6.3 Pile calculator

- **Eyebrow:** What's in your pile
- **H2:** How much are you owed right now?
- **Inputs:** "Unpaid jobs older than 30 days" (number, default 40) · "Average invoice" (dollars, default $650)
- **Output (large, tabular, count-up):** "$26,000 sitting in your pile"
- **Line under it:** "That's money for work you already did. Let your offshore team work it."
- **CTA:** Book a demo
- **Fine print:** "This shows what you're owed, not a promise of what will be collected."
- Do not show any recovery-rate estimate.

### 6.4 The loop

- **Eyebrow:** How PromiseLoop thinks
- **H2:** Every account runs the same loop.
- **Body:** We don't just make calls. We move each account forward until the loop is closed.
- **Five stages (drawn as the open ring with five points, or a horizontal track on mobile):**
  1. **New** — Your account lands in the pipeline.
  2. **Contacting** — A rep calls, by the rules, at a good time.
  3. **Promised** — The customer commits to an amount and a date.
  4. **Waiting for you** — The customer says they paid. You check.
  5. **Confirmed paid** — You confirm it. Loop closed.

### 6.5 How it works

- **Eyebrow:** How it works
- **H2:** Plug us in. We make the calls. You confirm the cash.
- Three columns with large muted step numbers (`aria-hidden`):
  - **01 — Plug us into your tools.** We connect your dialer, texting, email and CRM to PromiseLoop, or you upload a CSV or invoice PDFs. Your past-due accounts land in your pipeline as New.
  - **02 — Your offshore team calls.** Dedicated reps call, text and email your customers in your company's name, from your numbers, during legal hours, with scripts built around each job.
  - **03 — You confirm, we close the loop.** Customers pay you directly. You tap Confirmed paid, and our 5% applies only to what you confirm.

### 6.6 See every promise

- **Eyebrow:** Your dashboard
- **H2:** Watch every promise move.
- **Body:** See who was called, what they promised, and when it's due. Payments waiting for your confirmation are one tap away.
- **Visual:** a real screenshot of the app's Pipeline board and Dashboard hero tile with seed data, in a 1px `line` frame, 12px radius, no device chrome. Caption: "Example data."
- **Three points beside it:**
  - **Live pipeline** — every account, every stage, every dollar.
  - **Promises due** — what's coming in this week, day by day.
  - **Full activity log** — every call, result and note, timestamped.

### 6.6b Works inside your tools

- **Eyebrow:** How we plug in
- **H2:** Your team, your tools, your name.
- **Body:** We don't ask your customers to deal with a stranger. Your reps work inside your systems, so every touch looks and feels like your office.
- **Four cells (2×2 on desktop, one lucide icon each):**
  - `Phone` **Your dialer** — calls go out from your business number, set to manual dialing.
  - `MessageSquare` **Your texting** — texts only to customers who agreed, from your number.
  - `Mail` **Your email** — from your address, with an opt-out in every message.
  - `Database` **Your CRM** — accounts flow in and results flow back through our API, webhooks or CSV.
- **Line:** Every call, text and email is logged in PromiseLoop, so you see everything in one place.
- Don't name specific dialer, CRM or email brands until those integrations are built and approved.

### 6.7 Hear the calling team (dark section)

See §7 for the full spec.

### 6.8 Calls by the rules

- **Eyebrow:** Compliance
- **H2:** The rules are in the dialer, not a binder.
- **Body:** Collection calls are regulated, and your name is on every one. PromiseLoop enforces the rules before a rep can dial, even on your own phone system, so your name stays clean.
- **Six cells (3×2 hairline grid, one lucide icon each):**
  - `Clock` **Legal hours only** — 8 a.m. to 9 p.m. in the customer's time.
  - `Gauge` **Call limits built in** — 7 attempts in 7 days, stricter where states require.
  - `ShieldCheck` **Required disclosures** — every rep says who they are, who they call for, and the notice the law requires.
  - `PauseCircle` **Disputes pause collection** — until the customer gets verification.
  - `PhoneOff` **Opt-outs honored** — stop calls, no work calls, email only. Done on the spot.
  - `FileText` **Everything logged** — every attempt, result and note, timestamped.
- **Link:** "Read the compliance questions →" to `#faq`.

### 6.9 Compare

- **Eyebrow:** Why PromiseLoop
- **H2:** Better than an agency. Lighter than a hire.

| | Collection agency | In-house hire | **PromiseLoop** |
|---|---|---|---|
| Works in your name, on your phone numbers | No | Yes | **Yes** |
| Accounts stay in your hands | No | Yes | **Yes** |
| Starts before 90 days late | Usually not | Yes | **Yes** |
| Protects the customer relationship | Often aggressive | Yes | **Yes** |
| Calls placed by trained people | Yes | One person | **A dedicated offshore team** |
| Rules enforced by software | Varies | Manual | **Built in** |
| See every call in real time | Monthly report | Depends | **Live** |
| Cost | Large share of what's collected | Salary + benefits | **Monthly retainer + 5% of confirmed payments** |

Text cells use `ink`. PromiseLoop column header in `brand`. On mobile, horizontal scroll with the first column sticky.

### 6.10 Who it's for

- **H2:** Built for the trades.
- Pills: HVAC · Plumbing · Electrical · Roofing · Landscaping · Pest control · Cleaning
- **Line:** We know what a service call is, and how to explain the invoice behind it.

### 6.11 Pricing

- **Eyebrow:** Pricing
- **H2:** A dedicated team for a flat retainer. 5% when you get paid.
- One centered card (`max-w-md`):
  - **Plan label:** Your outsourced collections team
  - **Price line 1:** Monthly retainer — quoted for the size of team you need
  - **Price line 2:** + 5% of payments you confirm
  - Includes: dedicated reps working your US business hours, calls, texts and emails through your own tools, live pipeline and dashboard, compliance rules built in, call recordings and full activity log, CSV, API and webhook imports.
  - **CTA:** Book a demo
  - **Fine print:** No setup fee. Live within 72 hours. Cancel with 30 days' notice.
- Never show a retainer amount. The CTA under the card reads "Get your quote" and opens the demo booking.

### 6.12 FAQ

See §8.

### 6.13 Final CTA (dark section)

- **H2:** Bring us your 10 oldest invoices.
- **Body:** In a 20-minute demo, we'll show you how your offshore team would move them through the loop.
- **CTA:** Book a demo (paper button on brand)
- Background: banknote line pattern.

### 6.14 SEO metadata

```ts
export const metadata = {
  title: "PromiseLoop — Collections as a service for US service businesses",
  description:
    "An outsourced collections team in Manila that calls your customers in your name, on your own dialer, and turns past-due invoices into promises to pay and confirmed payments. Built for HVAC, plumbing, electrical and roofing companies.",
  openGraph: { title: "Your unpaid jobs are a pipeline. We work it.", type: "website", url: "https://promiseloop.com" },
};
// /privacy → "Privacy Policy — PromiseLoop"
// /terms   → "Terms of Service — PromiseLoop"
```

---

## 7. Hear the calling team (interactive mock calls)

### 7.1 Section copy

- **Eyebrow:** Hear the calling team
- **H2:** Hard calls. Calm reps. Real commitments.
- **Body:** Listen to how our reps handle the calls owners dread: the brush-off, the angry complaint, the hardship, the hothead.
- **Label (always visible, small, above the cards):** Dramatized calls using AI voices. Scripts follow our real call playbook. Customers and companies are fictional.

### 7.2 Cards (2×2 grid on desktop, stacked on mobile)

| # | Title | Situation line | Rep | Outcome line |
|---|---|---|---|---|
| 1 | The brush-off | HVAC · $1,284.50 · 94 days late · "Just email me" | Ana | Loop closed: $400 Friday, the rest on the 27th |
| 2 | "Your guy did a bad job" | Plumbing · $2,150 · 61 days late · Refuses to pay over a mess | Jun | Loop closed: paid in full on the 16th, complaint sent to the owner |
| 3 | "I can't afford it" | Electrical · $3,480 · 120 days late · Hardship | Ana | Loop closed: $580 a month for 6 months |
| 4 | The hothead | Roofing · $1,890 · 75 days late · "I'll report you" | Jun | Loop closed: paid in full on the 17th, calls only after 6 PM |

Each card: title (H3), situation line (small, paper at 70%), rep name, **one Listen button**, the outcome line with a small mint check, and a "Read transcript" toggle.

### 7.3 Player behavior

- Listen button: play icon + "Listen" + duration (e.g. "2:41"). While playing it becomes pause + a thin progress bar along the card's bottom edge in mint.
- Only one call plays at a time; starting another pauses the current one.
- `<audio preload="none">` with `src="/audio/call-N.mp3"`.
- Keyboard: Space/Enter toggles; button has `aria-label="Listen to call 1, The brush-off"` and `aria-pressed`.
- Transcript toggle opens the full script from `content/mock-calls.json` (speaker labels bold, audio tags removed). Required for accessibility.
- If the MP3 is missing, hide the Listen button and show the transcript toggle only.

### 7.4 Audio generation (Audio Producer)

- Script: `scripts/generate-calls.mjs`, run locally with `node scripts/generate-calls.mjs`. Never imported by the app.
- Secrets in `.env.local`: `ELEVENLABS_API_KEY=...` (gitignored). **The key previously shared in chat must be rotated after generation.**
- Voices in `content/voices.json`:
  ```json
  { "ANA": "<filipino-female-voice-id>", "JUN": "<filipino-male-voice-id>",
    "CARTER": "<us-male-voice-id-1>", "RACHEL": "<us-female-voice-id>",
    "MARCUS": "<us-male-voice-id-2>", "TONY": "<us-male-voice-id-3>" }
  ```
  Zion picks the voices by ear in the ElevenLabs Voice Library (Filipino-accented English for reps, conversational American for customers).
- API: `POST https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128`, header `xi-api-key`, body `{ "model_id": "eleven_v3", "inputs": [{ "text": "...", "voice_id": "..." }], "seed": 4217 }`. Check the current ElevenLabs API reference before running; adjust field names if they changed.
- Limit: keep each request at or under 2,000 characters of total text. Split each call at a speaker turn into parts, use the same seed, then join with ffmpeg's concat demuxer.
- Phone effect (optional second version): `ffmpeg -i call-1.mp3 -af "highpass=f=300,lowpass=f=3400,aresample=8000,aresample=44100,volume=1.1" call-1-phone.mp3`, plus a short ring at the start. Zion chooses clean or phone.
- Output `public/audio/call-1.mp3` … `call-4.mp3`. Target 128 kbps, each under 3 MB.
- Review every file: amounts, dates and ZIP codes pronounced correctly. Regenerate a part if not.

### 7.5 Generation script (reference implementation)

```js
// scripts/generate-calls.mjs — run locally: node scripts/generate-calls.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("Set ELEVENLABS_API_KEY in .env.local (and load it, e.g. node --env-file=.env.local)");

const calls = JSON.parse(await fs.readFile("content/mock-calls.json", "utf8"));
const voices = JSON.parse(await fs.readFile("content/voices.json", "utf8"));
const OUT = "public/audio";
const TMP = ".audio-tmp";
const MAX = 2000;
await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(TMP, { recursive: true });

function chunk(lines) {
  const parts = []; let cur = []; let len = 0;
  for (const l of lines) {
    if (len + l.text.length > MAX && cur.length) { parts.push(cur); cur = []; len = 0; }
    cur.push(l); len += l.text.length;
  }
  if (cur.length) parts.push(cur);
  return parts;
}

for (const call of calls) {
  const parts = chunk(call.lines);
  const files = [];
  for (const [i, part] of parts.entries()) {
    const body = {
      model_id: "eleven_v3",
      seed: call.seed ?? 4217,
      inputs: part.map((l) => ({ text: l.text, voice_id: voices[l.speaker] })),
    };
    const res = await fetch("https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128", {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Call ${call.id} part ${i + 1}: ${res.status} ${await res.text()}`);
    const file = path.join(TMP, `call-${call.id}-${i + 1}.mp3`);
    await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
    files.push(path.resolve(file));
    console.log(`call ${call.id} part ${i + 1}/${parts.length} done`);
  }
  const list = path.join(TMP, `call-${call.id}.txt`);
  await fs.writeFile(list, files.map((f) => `file '${f}'`).join("\n"));
  execFileSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", path.join(OUT, `call-${call.id}.mp3`)]);
  execFileSync("ffmpeg", ["-y", "-i", path.join(OUT, `call-${call.id}.mp3`), "-af",
    "highpass=f=300,lowpass=f=3400,aresample=8000,aresample=44100", path.join(OUT, `call-${call.id}-phone.mp3`)]);
}
console.log("Done. Listen to every file before publishing.");
```

`content/mock-calls.json` shape:
```json
[{ "id": 1, "title": "The brush-off", "seed": 4217,
   "lines": [{ "speaker": "CARTER", "text": "[distracted, background noise] Yeah, hello?" }, ...] }]
```
Build it from Appendix A: one entry per line, speaker = the bold label, text = the line including its `[audio tags]`. The transcript view strips the tags.

---

## 8. FAQ (homepage `#faq`)

Every answer speaks as the owner's outsourced accounts receivable team, working under their name with their tools. Accordion, one item open at a time, under two small group labels. Every answer must match what the product does on launch day (Compliance Reviewer checks this).

### Working with PromiseLoop

**What is PromiseLoop?**
PromiseLoop is an outsourcing company based in Manila, Philippines, providing collections as a service for service businesses in the USA. Our trained reps work as an extension of your office: under your company's name, on your dialer, texting and email. They follow up on your past-due accounts, get customers to commit to a payment date, and log every promise in a live pipeline. You confirm when the money arrives, and the loop is closed.

**Is PromiseLoop a collection agency?**
Not the way most owners mean it. We don't buy your accounts, take them over, sue anyone or report anyone to credit bureaus, and your customers stay your customers. We're your outsourced collections team, working your accounts with your tools and your rules. Because our reps call your customers on your behalf about money they owe, federal law treats those calls as third-party debt collection on consumer accounts, so we follow the FDCPA and the CFPB's Regulation F on every call. We set up each client under the rules of their state, and of any other state their customers live in.

**How is this different from sending accounts to an agency?**
An agency takes the account and often the relationship. We work inside your process instead: early, before accounts go stale, in your name, with every call visible to you. Accounts never leave your hands. You set the payment-plan limits, and you can pause or take back any account at any time.

**Do I need to change my software?**
No. We connect your dialer, texting, email and CRM to PromiseLoop, so we work in the tools you already use. You can also upload a CSV or invoice PDFs.

**Do you take payments from my customers?**
No. We never handle money or card numbers. Your reps send customers your own payment link, or tell them how to pay your office. Payments go straight to you.

**Who makes the calls, and where are they?**
Your dedicated reps on PromiseLoop's team in Manila, Philippines, working your US business hours. If a customer asks where we're calling from, we tell them the truth.

**Will you be rude to my customers?**
No. Your reps are firm and respectful, and they're trained to protect the relationship you've built. Hear four example calls above.

**What does it cost?**
Two parts. A monthly retainer, quoted for the size of team you need, covers your dedicated reps, their training and quality checks. On top of that, we earn 5% of the payments you confirm, so we only do well when you get paid. We call through your own dialer, so customers see your company's number and every call stays in your phone records. No setup fee.

**How fast can we start?**
Most clients have their first calls going out within 72 hours of signing, sending their first batch of accounts and giving us dialer access.

### Calling by the rules

**What do your reps say at the start of a call?**
They open as part of your team: "This is Ana, calling for Lone Star HVAC with PromiseLoop." They tell the customer the call is recorded and confirm they're speaking with the right person before mentioning any bill. On consumer accounts they give the required notice: "This is an attempt to collect a debt, and any information obtained will be used for that purpose." Then they explain what the bill is for and where your company is based.

**What hours do you call?**
Only between 8 a.m. and 9 p.m. in the customer's local time, and never at a time the customer says is inconvenient. PromiseLoop blocks calls outside those hours, even on your dialer.

**How often do you call?**
No more than 7 call attempts in 7 days per account, and no repeat call within 7 days after a conversation. Stricter state limits apply automatically, such as 2 calls in 7 days for Massachusetts customers.

**Which state's rules do you follow?**
Federal rules on every call, plus the collection rules of the state your business operates in. If a customer lives in a different state, we also follow that state's rules, because the law protects customers where they live. Most of your customers are in your service area, so in practice it's usually the same state.

**Do you use robocalls or autodialers?**
No. Your dialer is set to manual for our reps, and a person places every call. No prerecorded or artificial-voice messages on real customer calls.

**Do you call customers at work?**
Not if they ask us not to, or if we know their employer doesn't allow it. We note it on the account, and the system enforces it.

**What happens if a customer disputes the bill?**
We pause the account right away and send the dispute to you. You provide the supporting documents, the customer gets verification, and we resume only after it's resolved.

**What if a customer asks us to stop calling?**
We stop. Customers can also limit how we reach them, such as "evenings only" or "email only", and we follow it.

**Do you threaten lawsuits or credit reporting?**
Never. We don't sue, report to credit bureaus, or threaten either. We don't invent deadlines or add fees your agreement with the customer doesn't allow.

**Do you text or email my customers?**
Yes, through your own tools. We connect your dialer, texting and email to PromiseLoop, so every call, text and email goes out from your business numbers and addresses and is logged in one place. Every email includes an easy way to opt out. We text only customers who have agreed to receive texts, and replying STOP ends them right away.

**What do you say in voicemails?**
Only the rep's first name, a business name and a callback number. No details about any bill, in case someone else hears it.

**Do you record calls?**
Yes, for quality and accuracy, and every customer hears that at the start of the call. Some states require everyone on a call to agree to recording.

**What about my business customers?**
The same respect and the same hours. Some consumer-only rules, like the debt collection notice, don't apply to commercial accounts, but our standards don't change.

**What written notice do customers get?**
After the first conversation, customers receive a written notice with the amount owed, who it's owed to, and how to dispute it, as Regulation F requires.

**Is my data secure?**
Yes. Data is encrypted in transit and at rest, access is limited by role, and every call, text and note is logged. See our Privacy Policy (link to `/privacy`).

*Fine print under the FAQ (small, muted):* PromiseLoop provides outsourced accounts receivable calling services designed to support compliance with the FDCPA, Regulation F, the TCPA and applicable state laws. You remain responsible for the accuracy and validity of the accounts you send us. This is not legal advice.

---

## 9. Footer

Dark (`brand`) background with the reversed logo.

| Column | Content |
|---|---|
| PromiseLoop | Reversed logo · "Every promise, followed through." · "Collections as a service for US service businesses." |
| Product | How it works · Hear the calling team · Pricing · FAQ |
| Company | Contact (hello@promiseloop.com) · Log in |
| Legal | Privacy Policy (`/privacy`) · Terms of Service (`/terms`) · Consumer rights (`/privacy#your-rights`) |

**Legal line:** © {current year} PromiseLoop. All rights reserved. · Manila, Philippines

**Compliance lines (small, under the legal line):**
- PromiseLoop provides outsourced accounts receivable calling for its clients. When we contact consumers about a debt on a client's behalf, it is an attempt to collect a debt.
- We follow federal collection law and the state rules of each client and their customers. Licensing details available on request. (Add license numbers here if a state requires them on the website.)
- Received a call from us? Learn about your rights, or tell us how you'd like to be contacted: [consumer line / email].

Year renders with `new Date().getFullYear()`. Address and phone show only once real. `/login` gets a slim footer: the legal line plus Privacy and Terms links.

---

## 10. Legal pages

Both pages: `max-w-3xl`, H1, "Last updated" in small muted text, a short table of contents with anchor links, then prose (`text-ink leading-relaxed`, H2 at 22px with `mt-12`, lists with spacing). Hand-write prose styles; don't add `@tailwindcss/typography`. **Draft for counsel review. Not legal advice. Replace every [bracket].**

### 10.1 Privacy Policy — `/privacy`

*Last updated: [Month DD, 2026]*

PromiseLoop ("PromiseLoop," "we," "us"), based in Manila, Philippines, provides outsourced collections services to service businesses in the United States (our "clients"). This policy explains what personal information we collect, how we use and protect it, and the choices and rights you have.

#### 1. Who this policy covers
- **Clients:** businesses that hire us, and their staff who use our platform.
- **Consumers we contact:** people we call, email or text on behalf of a client about an unpaid bill. We act on the client's behalf and under its instructions.
- **Website visitors:** anyone who visits promiseloop.com.

#### 2. Information we collect
**From clients about their customers:** name, phone numbers, email, service address, account and invoice details (job description, dates, amounts owed, payments reported), and notes such as preferred contact times or a request not to be called at work.

**During our contact with consumers:** call recordings, call dates and times, the outcome of each call, payment promises, dispute details, contact preferences and opt-out requests, and messages you send us.

**From clients and their staff:** names, work email, role, company details and login information.

**From website visitors:** device and browser type, IP address, pages viewed and time of visit, and anything you submit through a contact or demo form.

**What we do not collect:** we do not take or store payment card numbers or bank account numbers. Payments are made directly to the client.

#### 3. How we use information
- To contact consumers on a client's behalf about an unpaid bill and record the result.
- To follow the law and the consumer's choices: call-time windows, call limits, opt-outs, disputes and contact restrictions.
- To send the consumer the client's payment link or payment instructions and the written notices the law requires.
- To keep accurate records for audits, complaints and legal obligations.
- To train and coach our calling team and check call quality.
- To secure our systems, prevent fraud and fix problems.
- To improve our services, using combined or de-identified data where possible.

**We do not sell personal information, and we do not share it for cross-context behavioral advertising.**

#### 4. Information we receive from clients (Gramm-Leach-Bliley Act)
Because we contact consumers about debts on our clients' behalf, we may be treated as a financial institution under the Gramm-Leach-Bliley Act (GLBA). We receive consumers' nonpublic personal information from our clients only to collect accounts on their behalf. We use and disclose it only to perform those services, or as the law otherwise permits or requires. We do not use it for our own marketing.

#### 5. Call recording
We record calls for quality, training and accuracy, and we tell you at the start of every call. If you prefer not to be recorded, tell the rep, and we will offer another way to discuss your account.

#### 6. Artificial intelligence
We use AI tools to read invoices clients upload, to help prepare call notes and scripts, and to summarize account activity. A person places every call, and a person reviews disputes and payment arrangements. Our AI providers are contractually prohibited from using this data to train their general models [confirm with provider terms]. The demo calls on our website are AI-voiced dramatizations and contain no real consumer data.

#### 7. How we share information
We share personal information only:
- **With the client** whose account it relates to.
- **With service providers** that help us run PromiseLoop, under contracts that require them to protect it and use it only for us:

| Type of provider | Purpose |
|---|---|
| Cloud hosting and database | Store and run our platform securely |
| Email delivery | Send emails and required notices |
| Telephony and messaging, including your own dialer and texting tools | Calls, call recordings and text messages |
| AI services | Document reading and call notes |
| Security and monitoring | Protect our systems and detect misuse |

Clients can request a current list of our service providers.

- **With our calling team**, including staff in the Philippines, who access data only as needed to do their work and are bound by confidentiality agreements.
- **When required by law**, such as a subpoena or a regulator's request, or to protect rights and safety.
- **In a business transfer**, such as a merger, under equal protections.

We do not tell anyone other than you, your spouse (where permitted), or your attorney that you owe a debt, except as the law allows.

#### 8. International processing
PromiseLoop operates from the Philippines. Information may be stored in the United States through secured cloud and accessed by our team in the Philippines. We apply the same safeguards in both places and comply with the Philippine Data Privacy Act of 2012 (Republic Act 10173).

#### 9. How long we keep information
We keep records of collection activity for at least three years after our last activity on an account, as Regulation F requires, and longer if a client agreement, law or open dispute requires it. Client account data is kept for the length of the client relationship plus [X] years. After that we delete or de-identify it.

#### 10. Security
We maintain a written information security program designed to meet the FTC Safeguards Rule. It includes encryption in transit and at rest, role-based access, multi-factor authentication for staff, activity logging, regular staff training, and vendor oversight. No system is perfectly secure. If a breach affects your information, we will notify you as the law requires.

#### 11. Your rights when we contact you about a debt (anchor `#your-rights`)
These rights come from the federal Fair Debt Collection Practices Act, the CFPB's Regulation F and state laws.
- **Dispute the debt:** tell us, preferably in writing within the period stated in your notice, that you dispute all or part of it. We will pause collection until we send you verification.
- **Ask who the original creditor is:** we will tell you.
- **Limit how and when we contact you:** tell us times, places or methods that don't work for you, such as "not at work" or "email only."
- **Stop contact:** tell us in writing to stop contacting you, and we will, except to confirm we're stopping or as the law allows.
- **Opt out of email or text:** use the unsubscribe link in any email or reply STOP to any text.
- **Use an attorney:** if you tell us you have a lawyer for this debt, we will contact your lawyer instead.
- **Complain:** contact us at [consumer email / phone], the Consumer Financial Protection Bureau at consumerfinance.gov/complaint, or your state attorney general.

We call only between 8 a.m. and 9 p.m. your local time, and we do not use autodialers or prerecorded messages for collection calls. We text only if you have agreed to receive texts.

#### 12. Your privacy rights under state law
Depending on your state (for example California, Colorado, Connecticut, Virginia and other states with consumer privacy laws), you may have the right to know what personal information we hold, to get a copy, to correct it, and to ask us to delete it. Some information collected for debt collection is covered by federal financial privacy law instead, and some must be kept by law even after a deletion request. Where we hold information for a client, we may refer your request to that client.

To make a request, email [privacy@promiseloop.com] or call [toll-free number]. We will verify your identity first. You may use an authorized agent. We will not treat you differently for exercising your rights. We honor Global Privacy Control browser signals on our website.

#### 13. Cookies
Our website uses essential cookies for security and login. [We use no advertising or tracking cookies. / List any analytics tool and how to opt out.]

#### 14. Children
Our services are not directed to children under 13, and we do not knowingly collect their information. If we learn that we have, we delete it.

#### 15. Changes
We will post any update here and change the "Last updated" date. If a change is significant, we will notify clients by email.

#### 16. Contact
PromiseLoop · Manila, Philippines · [privacy@promiseloop.com]
Data Protection Officer (Philippines): [Name, email]

### 10.2 Terms of Service — `/terms`

*Last updated: [Month DD, 2026]*

These Terms govern use of the PromiseLoop website, platform and outsourced accounts receivable calling services (the "Services") provided by PromiseLoop, based in Manila, Philippines. By signing an order form, creating an account or using the Services, you agree to these Terms. If you accept for a company, you confirm you can bind it. These Terms are for our business clients; they do not change any consumer's rights under law.

#### 1. The Services
PromiseLoop provides an outsourced accounts receivable team and software that contact your customers about past-due accounts on your behalf, in your name and through your own dialer, texting and email tools, record outcomes and payment promises, and report them to you. Scope, fees and service levels are set out in your order form ("Order"). If an Order conflicts with these Terms, the Order controls.

#### 2. We do not handle payments
PromiseLoop does not receive, hold or process your customers' money, and does not take card or bank details. Customers pay you directly through your payment link, office or other method you give us. You are responsible for your own payment processing.

#### 3. Your responsibilities
You represent and warrant that:
- Every account you place with us is valid, accurate and legally owed, you have the right to collect it, and the amount includes only charges your agreement with the customer allows.
- Contact information you give us was lawfully obtained, and you have any consents needed for us to contact your customers by the channels you choose, including texts.
- You will tell us promptly, and within [2] business days, about payments received, disputes, bankruptcies, deaths, attorney representation, cease-contact or contact-limit requests, and any reason an account should not be contacted.
- You will provide supporting documents when a customer disputes an account, and you will give our reps access to your dialer or phone system, configured for manual dialing, with caller ID that shows your business.
- You will confirm payments through the platform, API or CSV. Only payments you confirm close an account.

You remain the creditor. PromiseLoop acts as your service provider and agent for collection calls.

#### 4. How we collect
We will perform the Services in line with applicable law, including the Fair Debt Collection Practices Act, the CFPB's Regulation F, the Telephone Consumer Protection Act and state collection and licensing laws. That includes call-time limits, call-frequency limits, required disclosures, dispute handling, and honoring opt-outs and contact limits. Our reps introduce themselves as calling for your business, with PromiseLoop, on every call.

We may decline, pause or return any account if contacting it may be unlawful, unsafe or inconsistent with these Terms. We do not file lawsuits, report to credit bureaus, threaten legal action, or offer settlements or payment plans beyond the limits you approve in writing.

#### 5. Fees
- Fees are set in your Order: a monthly retainer, billed in advance, plus 5% of payments you confirm on accounts we worked.
- A payment counts toward our fee if it is received on an account during our engagement, or within [X] days after a promise to pay we obtained, including payments made directly to you.
- We invoice monthly from confirmed payments. Invoices are due within [15] days. Late amounts may accrue interest at [1.5]% per month or the highest lawful rate, whichever is lower.
- Fees exclude taxes, which you pay.

#### 6. Accounts and access
You are responsible for your users, their credentials and activity under your account. Tell us at [security@promiseloop.com] if you suspect unauthorized access.

#### 7. Acceptable use
You will not use the Services to collect amounts that are not owed, are in bankruptcy, or are past the statute of limitations without proper handling; to harass, threaten or deceive anyone; to upload unlawful content or data you have no right to share; or to reverse engineer, resell or overload the Services or access other clients' data.

#### 8. Data and privacy
You own your data. You license it to us only to provide and improve the Services, as described in our Privacy Policy. We act as your service provider, follow your lawful instructions, keep consumer information confidential, and protect it under a written security program. We may use de-identified, aggregated data to improve the Services. We keep records as the law requires, including at least three years after the last collection activity on an account.

#### 9. Call recordings and AI
We record calls and give the recording notice on every call. You may request recordings for accounts you placed. Some features use AI, which can be wrong; you are responsible for reviewing data extracted from documents you upload. Demo calls on our website are AI-voiced dramatizations and do not describe any real customer or guarantee results.

#### 10. Intellectual property
PromiseLoop owns the Services, software, scripts, training materials and improvements. You receive a limited right to use the Services during your subscription. We may use feedback you give us freely.

#### 11. Confidentiality
Each party will protect the other's non-public information with reasonable care and use it only for this relationship, except information that is public, already known, independently developed or required to be disclosed by law.

#### 12. No guarantee of results
We will use commercially reasonable efforts, but we do not guarantee that any amount will be promised or paid.

#### 13. Disclaimers
Except as stated in these Terms, the Services are provided "as is" and "as available," and we disclaim implied warranties, including merchantability, fitness for a particular purpose and non-infringement. Nothing on our website is legal advice.

#### 14. Limitation of liability
To the extent the law allows, neither party is liable for indirect, incidental, special, consequential or punitive damages, or lost profits. Each party's total liability is limited to the fees you paid us in the 12 months before the claim. These limits do not apply to your payment obligations, either party's indemnity obligations, or gross negligence or willful misconduct.

#### 15. Indemnification
You will defend and indemnify PromiseLoop against third-party claims arising from inaccurate or invalid account information, your instructions, your breach of these Terms or your violation of law. We will defend and indemnify you against third-party claims arising from our violation of collection law in performing the Services, except where caused by your information or instructions.

#### 16. Term and termination
Either party may end these Terms with [30] days' written notice, or immediately if the other party materially breaches and doesn't cure it within [10] days. On termination we stop contacting your customers, return or delete your data as you instruct (except records we must keep by law), and you pay fees owed through the end date, including fees on payments under Section 5.

#### 17. Governing law and disputes
These Terms are governed by the laws of the State of [State]. Disputes will be resolved in the state or federal courts of [County, State] [or: by binding arbitration under the AAA Commercial Arbitration Rules — counsel to choose].

#### 18. Changes
We may update these Terms and will notify clients by email at least [30] days before a material change takes effect. Continuing to use the Services after that means you accept the change.

#### 19. General
These Terms and any Order are the entire agreement. If any part is unenforceable, the rest stays in effect. Neither party may assign these Terms without consent, except in a merger or sale of substantially all assets. Neither party is liable for delays caused by events beyond its reasonable control.

#### 20. Contact
PromiseLoop · Manila, Philippines · [legal@promiseloop.com]

---

## 11. Compliance review checklist (Compliance Reviewer)

Block release if any item fails. General information, not legal advice; counsel signs off.

**Claims vs. product** — each must be enforced in the app before the matching FAQ answer ships:
- [ ] 8 a.m.–9 p.m. customer-local call window
- [ ] 7-in-7 attempt cap, 7-day wait after a conversation, Massachusetts 2-in-7
- [ ] Dispute pause; stop-contact and contact-limit flags (no work calls, preferred times)
- [ ] Email unsubscribe and text STOP handling; text only with consent
- [ ] Limited-content voicemail script (name, PromiseLoop, callback number only)
- [ ] Recording with a notice at call start
- [ ] Manual dialing only; no prerecorded or artificial voice on real calls. The client's dialer must be set to manual (click-to-dial with a person) for PromiseLoop reps, not predictive or auto-dial
- [ ] Caller ID shows the client's business number, and reps still name PromiseLoop on every call ("calling for [client] with PromiseLoop")
- [ ] Records kept at least 3 years after last activity
- [ ] Right-party check before the mini-Miranda; the Call Station script must not show the debt notice until "Right party confirmed" is checked

**Copy**
- [ ] No "guarantee", recovery rates, or results we can't prove
- [ ] No Stripe, payment portal, card processing or billing chatbot
- [ ] No integrations named that don't exist
- [ ] AI-voice label visible above the mock calls
- [ ] Manila location stated truthfully
- [ ] No legal-authority imagery (badges, seals, gavels, flags)
- [ ] "Debt" and "collection" don't appear in sender names or email subject lines to consumers

**Counsel must confirm before launch**
- [ ] Third-party collector status and the "calling for [client] with PromiseLoop" opening
- [ ] State rules per client: confirm licensing, bonding or registration in each client's state and in any state where their customers live, and whether any state requires license numbers on the website
- [ ] Validation notice process (Reg F §1006.34): who sends it, within 5 days of the first conversation
- [ ] Recording disclosure wording for all-party consent states
- [ ] GLBA treatment and the FTC Safeguards Rule program
- [ ] State privacy law obligations; Philippines Data Privacy Act registration and DPO
- [ ] Governing law, courts or arbitration, and fee-tail period (Terms §5, §16)

---

## 12. QA and launch checklist (QA & Accessibility)

- [ ] Lighthouse mobile ≥ 95 in all four categories on `/`, `/privacy`, `/terms`
- [ ] axe: zero serious or critical issues
- [ ] Full keyboard pass: nav, mobile menu, calculator, every Listen button, transcript toggles, FAQ
- [ ] Visible focus ring on every interactive element
- [ ] `prefers-reduced-motion`: hero shows the final frame; no count-up; no transitions
- [ ] 375, 768, 1280px layouts checked; comparison table scrolls on mobile with the first column sticky
- [ ] Only one audio plays at a time; missing MP3 hides Listen and keeps the transcript
- [ ] No retainer amount shown anywhere on the site
- [ ] No `[BRACKET]` text rendered anywhere (grep the built HTML for `[`)
- [ ] All anchors work, including `/privacy#your-rights`
- [ ] `sitemap.xml`, `robots.txt`, OG image and favicon present
- [ ] No vendor or tech-stack names in any public page (grep the build for Supabase, Vercel, Railway, Resend, Next.js, ElevenLabs, Gemini, Anthropic)
- [ ] No API keys in the client bundle (search the build output for `xi-api-key` and `sk_`)
- [ ] No console errors; no layout shift from fonts or the hero
- [ ] Next.js upgraded past the 14.2.24 advisory

---

## Appendix A — Mock call scripts

Voice each line as written, including the `[audio tags]`. Speaker labels map to `content/voices.json`. Every call follows the required opening: identity → recording notice → right-party check → mini-Miranda → who the rep represents, where the company is based, and why they're calling.

### Call 1: The brush-off

Lone Star HVAC (Austin, Texas) · Daniel Carter · AC replacement · $1,284.50 · 94 days late · Rep: Ana. Outcome: $400 on Friday the 13th, $884.50 on the 27th.

**CARTER:** [distracted, background noise] Yeah, hello?
**ANA:** [warm, clear] Hi, good afternoon. This is Ana, calling for Lone Star HVAC with PromiseLoop. May I speak with Daniel Carter, please?
**CARTER:** [impatient] This is Dan. What's this about?
**ANA:** Thanks, Dan. Just so you know, this call is recorded for quality. And for your privacy, can you confirm the ZIP code for your service address?
**CARTER:** [sighs] Seven-eight-seven-four-five. Look, I'm on a job site right now.
**ANA:** I'll keep it quick. This is an attempt to collect a debt, and any information obtained will be used for that purpose. I'm calling on behalf of Lone Star HVAC in Austin, Texas, about the AC replacement at your home in August. There's an open balance of twelve eighty-four fifty.
**CARTER:** [interrupting, annoyed] Yeah, yeah. Just email me the bill. I'll take care of it.
**ANA:** [calm] I can absolutely email it. Can I ask you one thing first, so I'm not just sending you another email you've already got?
**CARTER:** [short pause] ...Fine. What.
**ANA:** Lone Star has sent the invoice three times since August. So I don't think the email is the problem. What's actually holding it up?
**CARTER:** [defensive] Nothing's holding it up. I've just been slammed. I'm running my own crew, I've got trucks, I've got guys to pay...
**ANA:** [empathetic] That makes sense. You know what it's like when a customer sits on an invoice.
**CARTER:** [pause, then a dry laugh] ...Okay. Fair hit.
**ANA:** [lightly] Not a hit, just something we both understand. So let's make it easy. If you could pay the full amount this week, would you?
**CARTER:** [exhales] Not this week. My truck's transmission went out last month. That was four grand I didn't plan for.
**ANA:** Ouch. I'm sorry. Then let's not set you up to miss. What could you do by Friday, the 13th?
**CARTER:** [hesitant] I don't know... three hundred?
**ANA:** [steady] Let's be realistic together. If you could do four hundred Friday, the remaining eight eighty-four fifty would be due on the 27th, after your next round of jobs closes. Does that work, or does the 27th feel tight?
**CARTER:** [thinking] ...Four hundred Friday. Rest on the 27th. Yeah. I can do that.
**ANA:** Perfect. Let me read it back. Four hundred dollars on Friday, November 13th, and eight hundred eighty-four fifty on Friday, November 27th, for the AC replacement from Lone Star HVAC. Correct?
**CARTER:** Correct.
**ANA:** Great. I'll email Lone Star's secure payment link to the address they have on file, the one ending in carter-builds dot com. You'll also get a written notice with the balance and your rights, including how to dispute it if anything's ever wrong.
**CARTER:** [softer] Okay. Hey, sorry for being short with you. It's been a week.
**ANA:** [warmly] No apology needed, Dan. Thanks for working it out with me. Good luck on the job site.
**CARTER:** Thanks, Ana. Bye.

### Call 2: "Your guy did a bad job"

Peak Plumbing Co. (Denver, Colorado) · Rachel Morrison · Water heater install · $2,150.00 · 61 days late · Rep: Jun. Outcome: full payment Monday the 16th; cleanup complaint sent to the owner.

**RACHEL:** Hello?
**JUN:** [friendly, professional] Hi, good morning. This is Jun, calling for Peak Plumbing Company with PromiseLoop. May I speak with Rachel Morrison, please?
**RACHEL:** [wary] Speaking.
**JUN:** Thank you, Rachel. This call is recorded for quality. And for your privacy, could you confirm the ZIP code for your service address?
**RACHEL:** Eight-zero-two-two-zero.
**JUN:** Thank you. This is an attempt to collect a debt, and any information obtained will be used for that purpose. I'm calling on behalf of Peak Plumbing Company in Denver, Colorado, about the water heater installed at your home in September. The balance is two thousand one hundred fifty dollars.
**RACHEL:** [instantly heated] Oh, you have got to be kidding me. No. Absolutely not. I'm not paying a dime until somebody from Peak explains why their guy left my basement looking like a construction site.
**JUN:** [calm, slower] Okay. That sounds really frustrating. Tell me what happened.
**RACHEL:** [ranting] He hauls the old tank out, drags it across my carpet, there's water and black gunk all over the floor, and he leaves the old box and packaging right there by my washer. I had to clean it up myself. On a Saturday. With two kids.
**JUN:** [sincere] That's not okay, and I'm sorry you had to deal with that. I want to make sure the owner hears this, not just me. Can I ask you a direct question?
**RACHEL:** [sharp] Go ahead.
**JUN:** Is the water heater itself working? Any leaks, any issues with hot water?
**RACHEL:** [pause, grudging] ...No. It works fine. That's not the point.
**JUN:** I hear you, it's not the whole point. I'm asking because I need to record this correctly. Are you disputing the amount of the bill, or is your complaint about the cleanup and how the job was left?
**RACHEL:** [sighs] I'm not saying the price is wrong. I'm saying they should treat people's homes with some respect.
**JUN:** That's completely fair. So here's what I'll do. I'm logging your complaint word for word, the carpet, the mess, the packaging, and sending it to Peak's owner today, with a request that someone from Peak calls you about the carpet. That part doesn't depend on the bill.
**RACHEL:** [skeptical] And then what? You keep calling me?
**JUN:** [straightforward] Not if we settle it now. The heater's working, and the price isn't in question. If we set a date for the payment, you won't hear from me again about this. Separately, Peak hears about the cleanup.
**RACHEL:** [long pause] ...You're very calm for someone I just yelled at.
**JUN:** [light laugh] You weren't yelling at me. You were yelling at the gunk on your floor.
**RACHEL:** [laughs despite herself] Okay. Fine. I get paid on the 15th. I can pay it all on Monday, the 16th.
**JUN:** Thank you, Rachel. To confirm: two thousand one hundred fifty dollars, paid in full on Monday, November 16th, to Peak Plumbing Company. I'll email you Peak's secure payment link right after this call. And your cleanup complaint goes to the owner today, with your request for a call back about the carpet.
**RACHEL:** Good. And tell them about the box by the washer.
**JUN:** [smiling] The box by the washer is in the notes. You'll also get a written notice with the balance and your rights, including how to dispute anything if you ever need to. Anything else I can help with?
**RACHEL:** No. Thanks, Jun. Really.
**JUN:** You're welcome. Have a good rest of your day.

### Call 3: "I can't afford it"

Sunbelt Electric (Phoenix, Arizona) · Marcus Webb · Electrical panel upgrade · $3,480.00 · 120 days late · Rep: Ana. Outcome: $580 a month for 6 months, first payment Friday the 20th. Sunbelt has approved plans of up to 6 months for this account.

**MARCUS:** [tired] Hello.
**ANA:** Hi, good evening. This is Ana, calling for Sunbelt Electric with PromiseLoop. May I speak with Marcus Webb, please?
**MARCUS:** [guarded] Who's asking?
**ANA:** Ana, from Sunbelt Electric's billing team, with PromiseLoop. Is this Marcus?
**MARCUS:** [sighs] Yeah. It's Marcus.
**ANA:** Thank you. This call is recorded for quality. For your privacy, can you confirm the ZIP code for your service address?
**MARCUS:** Eight-five-oh-three-two.
**ANA:** Thank you, Marcus. This is an attempt to collect a debt, and any information obtained will be used for that purpose. I'm calling on behalf of Sunbelt Electric in Phoenix, Arizona, about the electrical panel upgrade at your home in July. The balance is three thousand four hundred eighty dollars.
**MARCUS:** [bitter laugh] Yeah. I know. I don't have it. I don't have three thousand dollars. I don't have three hundred.
**ANA:** [gentle, steady] Okay. Thank you for being straight with me. Can you tell me what's changed since July?
**MARCUS:** [frustrated] What's changed? They cut my hours at the warehouse in August. I've got two kids, I'm doing this on my own, and the panel wasn't a choice. The inspector said it was a fire hazard. So, what, I should've let my house burn down?
**ANA:** [sincere] No. You did the right thing for your kids. I mean that.
**MARCUS:** [angry] Then why am I getting calls like I'm some kind of deadbeat? You people don't care. You just want your money.
**ANA:** [calm, firm] I hear that, and I'm not calling because I think you're a deadbeat. I'm calling because you've got an open bill, and I'd rather help you build a plan you can actually keep than have this sit on you for another four months. Is that fair?
**MARCUS:** [pause] ...Yeah. Fine. But I'm telling you, I can't pay it all.
**ANA:** Then we won't try to do it all at once. Let me ask: with your hours now, what's a monthly amount you could commit to without missing rent or groceries?
**MARCUS:** [hesitant] I don't know. Two hundred?
**ANA:** I appreciate the honesty. Two hundred a month would take a year and a half, and Sunbelt can approve a plan of up to six months on this account. Over six months, that's five hundred eighty a month. Can I ask what your take-home looks like right now?
**MARCUS:** [exhales] About twenty-six hundred a month, after the cut. Rent's twelve hundred.
**ANA:** Okay. That's tight, I won't pretend it isn't. Is there a payday where five eighty would land best, right after you get paid?
**MARCUS:** [thinking] I get paid on the fifth and the twentieth. The twentieth is the bigger one... Can you knock anything off the total? Like, at all?
**ANA:** [honest] I'm not able to reduce the balance, and I don't want to promise you something I can't do. What I can do is spread it so no single month breaks you. Five eighty on the twentieth, six months. Can you commit to that?
**MARCUS:** [long pause] ...If I miss one, what happens?
**ANA:** You call before the date, and we talk. That's it. No surprises.
**MARCUS:** [quietly] Okay. Yeah. Let's do it.
**ANA:** Thank you, Marcus. Let me confirm: five hundred eighty dollars a month, on the twentieth, for six months, starting Friday, November 20th, for three thousand four hundred eighty dollars total, to Sunbelt Electric. I'll email Sunbelt's secure payment link to the address they have on file. You'll also get the plan in writing, plus a notice with the balance and your rights, including how to dispute it.
**MARCUS:** [softer] Alright. Thanks for not making me feel like garbage.
**ANA:** [warmly] You took care of your home and your kids. Now you're taking care of this. Have a good night, Marcus.

### Call 4: The hothead

Gulf Coast Roofing (Pensacola, Florida) · Tony Russo · Roof leak repair · $1,890.00 · 75 days late · Rep: Jun. Outcome: full payment Tuesday the 17th after an itemized invoice is sent; calls only after 6 PM, never at work.

**TONY:** [already irritated] Yeah?
**JUN:** Hi, good evening. This is Jun, calling for Gulf Coast Roofing with PromiseLoop. May I speak with Tony Russo, please?
**TONY:** [snaps] This is Tony. Are you the people who keep calling me? Because I swear—
**JUN:** [calm, even] I may be. Before anything else, this call is recorded for quality. And for your privacy, can you confirm the ZIP code for your service address?
**TONY:** [annoyed] Three-two-five-oh-three. Now what do you want?
**JUN:** Thank you, Tony. This is an attempt to collect a debt, and any information obtained will be used for that purpose. I'm calling on behalf of Gulf Coast Roofing in Pensacola, Florida, about the roof leak repair at your home in August. The balance is eighteen hundred ninety dollars.
**TONY:** [shouting] Unbelievable. You people call me at work, you call me at dinner, I've had it. I'm reporting you. I'm serious, I'll file a complaint.
**JUN:** [steady, not defensive] You have every right to do that, Tony, and I'll give you our complaint line if you want it. I also want to fix the part that's bothering you. Our notes show two calls this week. When's a time that actually works for you?
**TONY:** [still hot] How about never?
**JUN:** If you want us to stop calling, tell me, and I'll note it right now. I'm only asking because I'd like to settle this with you so you don't get any more calls at all.
**TONY:** [pause, grumbling] ...Don't call me at work. Ever. My boss heard the last one.
**JUN:** Done. I'm noting no calls to your workplace. Is after six in the evening better on this number?
**TONY:** [calmer] After six. Yeah. Where are you even calling from? You're not in Pensacola.
**JUN:** [honest, friendly] No, I'm not. I'm on Gulf Coast Roofing's billing team, working with PromiseLoop from Manila, in the Philippines. We're their offshore team for open invoices.
**TONY:** [scoffs] Great. They outsourced it.
**JUN:** [lightly] They did. And I'm the one who actually reads your notes. So tell me, what's kept this from getting paid since August?
**TONY:** [exhales, venting] Because I called Gulf Coast twice asking for an itemized invoice. Twice. All I got was a total. Eighteen ninety for a leak? I want to see what I'm paying for.
**JUN:** That's a reasonable ask. Are you disputing the amount, or do you just want to see the breakdown before you pay?
**TONY:** [pause] ...I just want to see it. The roof's fine. It hasn't leaked since.
**JUN:** Good, glad the repair held. Here's what I'll do. I'll request the itemized invoice from Gulf Coast tonight and email it to you, with their payment link. If the breakdown looks right, can we agree on a date to pay it in full?
**TONY:** [grudging] If it looks right... I get paid Monday. I'll pay it Tuesday.
**JUN:** Thank you. Let me confirm. Gulf Coast Roofing sends you an itemized invoice by email. Once you have it, you'll pay eighteen hundred ninety dollars in full on Tuesday, November 17th. No calls to your workplace, and calls to this number only after six PM. If anything on the invoice looks wrong, you tell me and we pause until it's sorted.
**TONY:** [quieter] ...Yeah. That's fair.
**JUN:** You'll also get a written notice with the balance and your rights, including how to dispute it. Anything else I can do for you tonight?
**TONY:** [pause] No. Look, man, sorry I yelled. It's not you.
**JUN:** [warmly] I appreciate that, Tony. Enjoy your dinner.

---

## Appendix B — Decisions made in this brief (Zion can change)

- **Positioning (v1.2):** PromiseLoop is an outsourcing company in Manila, Philippines, providing collections as a service to US service businesses: the client's offshore collections team, not a traditional collection agency. All copy speaks as "your team": your name, your dialer, your numbers, your rules.

- Reps open as the client's offshore billing team and still name PromiseLoop ("This is Ana, calling for Lone Star HVAC with PromiseLoop"), then give the mini-Miranda on consumer accounts. Dropping PromiseLoop's name entirely would risk the FDCPA's false-name rule; counsel must approve any change.
- The Manila location is stated honestly in the FAQ and when a customer asks.
- Motion allowed: one hero loop sequence, the calculator count-up, hovers. Everything respects reduced motion.
- Pricing: monthly retainer (amount never shown; quoted on a call) + 5% of confirmed payments; reps dial through the client's dialer; go-live within 72 hours.
- The FAQ says PromiseLoop is not a collection agency "the way most owners mean it" but still states it acts as a third-party debt collector on consumer accounts. Do not change this to a plain "No": that would contradict federal law and the footer disclosure.
- The AI-voice label stays above the mock calls (it was removed from the FAQ at Zion's request).
- Rep names Ana Cruz and Jun Dela Rosa come from the app's seed data.
