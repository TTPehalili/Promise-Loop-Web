// Shared class strings for the assistant widget. Token names only.

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

/** Outline chip: quick replies and slots. Mint Ink text, never Mint. */
export const chipClass = `inline-flex min-h-[44px] items-center rounded-full border border-mint-ink/60 bg-surface px-4 py-2 text-left text-[14px] font-medium leading-snug text-mint-ink transition-colors duration-150 hover:border-mint-ink hover:bg-mint-tint disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-paper ${focusRing}`;

/** Primary action inside the panel. */
export const primaryButton = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-[15px] font-medium text-paper transition-colors duration-150 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

/** Secondary action inside the panel. */
export const secondaryButton = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-brand bg-surface px-4 py-2 text-[15px] font-medium text-brand transition-colors duration-150 hover:bg-paper-deep ${focusRing}`;

export const inputClass = `block h-11 w-full rounded-lg border border-ink-muted/70 bg-surface px-3 text-[15px] text-ink placeholder:text-ink-muted ${focusRing}`;

export const assistantBubble =
  "rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3 text-[15px] leading-[1.5] text-brand tabular-nums";

export const visitorBubble =
  "rounded-2xl rounded-br-md bg-brand px-4 py-3 text-[15px] leading-[1.5] text-paper tabular-nums whitespace-pre-wrap break-words";

export const isExternalHref = (href: string) => /^https?:\/\//i.test(href);
