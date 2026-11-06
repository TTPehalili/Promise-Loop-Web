# PromiseLoop web — design system

Source of truth: `PROMISELOOP_WEBSITE_BUILD.md` §4. This file summarizes what is implemented in `tailwind.config.ts` and `app/globals.css`.

## Direction

Calm, precise, quietly confident. Banknote paper, hairline rules, one green that means "paid", numbers set like a ledger. The signature is the open ring from the logo: it closes into a check only when something is confirmed paid.

Never: gradients, glassmorphism (except the nav blur), shadows on cards, stock photos, AI people, 3D, device mockups, emoji, badges, seals, gavels, flags, more than one primary button per section, all-caps body text.

## Color tokens (Palette "Greenback")

| Token | Hex | Use |
|---|---|---|
| `paper` | #F6F4EE | Page background |
| `paper-deep` | #EEEBE2 | Alternate sections |
| `surface` | #FFFFFF | Cards, table cells, FAQ rows |
| `line` | #E2DED3 | 1px borders |
| `ink` | #14161B | Text and numbers |
| `ink-muted` | #555B66 | Secondary text, cents, `$` |
| `brand` | #0B3D2E | Primary buttons, dark sections |
| `brand-hover` | #082E22 | Primary hover |
| `mint` | #1FAA70 | Graphics and large text only (2.7:1 on paper) |
| `mint-ink` | #157A50 | Mint as text and links, eyebrows |
| `mint-tint` | #E6F4EC | Paid highlight |
| `gold` | #C9A227 | Rare accent on brand only, never text on paper |
| `rose` | #B4534B | Disputed / missed only |
| `focus` | #1FAA70 | 2px ring, 2px offset |

Ratio: ~60% paper, 25% brand + ink, 10% mint, <5% gold. Components use token names only, never raw hex.

## Type

| Role | Class | Spec |
|---|---|---|
| H1 | `.h1` | Manrope 700, 40→60px / 1.05, tight, balanced |
| H2 | `.h2` | Manrope 600, 30→40px / 1.15, balanced |
| H3 | `.h3` | Inter 600, 18→20px / 1.4 |
| Body | `.body` | Inter 400, 16→18px / 1.6, max 65ch |
| Small | `.small` | Inter 400, 14px / 1.5 |
| Eyebrow | `.eyebrow` | Inter 500, 13px, sentence case, mint-ink |
| Numbers | `.num` | Inter 600, `tabular-nums` |

Fonts load through `next/font/google` in `app/layout.tsx` (`--font-manrope`, `--font-inter`). Max two weights per section; never 800+.

## Layout

- `.container-site` = `max-w-6xl mx-auto px-6`; legal pages `max-w-3xl`.
- `.section` = `py-20 md:py-28 scroll-mt-20`. Sections alternate paper / paper-deep. Only two dark (brand) sections: mock calls and final CTA (plus footer).
- 4px grid: 8, 12, 16, 24, 32, 48, 64, 96.
- Radius: 8px buttons/inputs (`rounded-lg`), 12px cards (`rounded-xl`), full for pills.
- Depth: borders only. One shadow, `shadow-popover`, for the audio player.
- Every multi-column grid is one column under `md`. Design at 375, 768, 1280.

## Components

- `.btn-primary`: brand bg, white text. On dark: `.btn-primary-dark` (paper bg, brand text). 44px min height.
- `.link-arrow`: secondary action, text + "→".
- `.card`: surface, 1px line, 12px radius, p-6.
- Status pill: icon + word, never color alone. New (ink-muted), Contacting (ink), Promised (brand on mint-tint), Waiting for client (dashed border), Confirmed paid (mint-ink on mint-tint), Disputed (rose).
- Money: `$` and cents in ink-muted, dollars in ink, tabular.
- Focus: `focus-visible:ring-2 ring-focus ring-offset-2` everywhere.
- Icons: lucide-react, `size={20} strokeWidth={1.5}`.

## Logo

`components/marketing/graphics/LoopMark.tsx` holds the canonical mark geometry (traced from the approved artwork). Ring mint, check Greenback; reversed check is paper. Wordmark: "Promise" Greenback + "Loop" mint, Manrope 700. Never close the ring, recolor "Loop", rotate, stretch, or add effects.

## Motion

Only motion that confirms something real. Hovers 150–200ms. Hero sequence ≤ 3s, once. Calculator count-up 600ms. Everything is instant under `prefers-reduced-motion` (global rule in `globals.css` plus JS checks).
