// Visitor memory: profile load/merge, returning-visitor greeting (§3.3), summary rewrite (§6.1).
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { assistantEnv } from "./env";
import { redact } from "./guard";
import { longLabel } from "./scheduling";
import type { AssistantStore, BookingRow, SessionRow, StoredMessage, VisitorRow } from "./store";
import {
  FIRST_CHIPS,
  FIRST_GREETING,
  RETURNING_CHIPS,
  type AssistantUIMessage,
  type GreetingVariant,
} from "./types";

export const MEMORY_WINDOW_DAYS = 90;
export const SUMMARY_MAX = 600;

export function anthropicModel(id: string) {
  const key = assistantEnv.anthropicKey();
  if (!key) return null;
  return createAnthropic({ apiKey: key })(id);
}

/* ------------------------------------------------------------------ */
/* Greeting                                                            */
/* ------------------------------------------------------------------ */

const TRADE_LABEL: Record<string, string> = {
  hvac: "HVAC",
  plumbing: "plumbing",
  electrical: "electrical",
  roofing: "roofing",
  landscaping: "landscaping",
  "pest control": "pest control",
  cleaning: "cleaning",
};

export function tradeLabel(trade: string | null | undefined) {
  if (!trade) return null;
  return TRADE_LABEL[trade.toLowerCase()] ?? trade.toLowerCase();
}

/** Picks ONE useful thing to reference. Never amounts tied to a customer, never phone numbers. */
function oneThing(v: VisitorRow): string | null {
  const trade = tradeLabel(v.trade);
  if (v.unpaidJobsEstimate && v.unpaidJobsEstimate > 0) {
    const n = v.unpaidJobsEstimate;
    const rounded = n >= 20 ? `${Math.floor(n / 10) * 10}-plus` : `${n}`;
    return `Last time we talked about your ${rounded} unpaid${trade ? ` ${trade}` : ""} invoices.`;
  }
  if (v.lastTopic) return `Last time you asked about ${v.lastTopic}.`;
  if (trade) return `Last time we talked about your ${trade} business.`;
  return null;
}

export type Greeting = { text: string; variant: GreetingVariant; chips: string[] };

export function firstGreeting(): Greeting {
  return { text: FIRST_GREETING, variant: "first", chips: [...FIRST_CHIPS] };
}

export function buildGreeting(input: {
  visitor: VisitorRow;
  hadRecentConversation: boolean;
  booking: BookingRow | null;
}): Greeting {
  const { visitor, booking } = input;
  const name = visitor.firstName ? `, ${visitor.firstName}` : "";
  if (booking) {
    const label = booking.label || longLabel(booking.startsAt, booking.visitorTz);
    return {
      text: `Welcome back${name}. Your demo is set for **${label}**. Anything you'd like to cover before then? If you need a different time, use the reschedule link in your invite.`,
      variant: "booked",
      chips: [...RETURNING_CHIPS],
    };
  }
  if (input.hadRecentConversation && visitor.consentMemory) {
    const thing = oneThing(visitor);
    const text = thing
      ? `Welcome back${name}. ${thing} Want to pick up there, or start something new?`
      : `Welcome back${name}. Want to pick up where we left off, or start something new?`;
    return { text, variant: "returning", chips: [...RETURNING_CHIPS] };
  }
  return firstGreeting();
}

/* ------------------------------------------------------------------ */
/* Stored <-> UI messages                                              */
/* ------------------------------------------------------------------ */

export function toUIMessages(rows: StoredMessage[]): AssistantUIMessage[] {
  return rows.map(
    (r) =>
      ({
        id: r.uiId,
        role: r.role,
        parts: r.parts as AssistantUIMessage["parts"],
        ...(r.metadata ? { metadata: r.metadata as AssistantUIMessage["metadata"] } : {}),
      }) as AssistantUIMessage,
  );
}

export function textOf(message: { parts: ReadonlyArray<{ type: string; text?: string }> }): string {
  return message.parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("\n")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Merge by email                                                      */
/* ------------------------------------------------------------------ */

/**
 * Visitor gave an email: if another visitor row already has it, merge that row
 * INTO the current (cookie) visitor so the cookie stays valid.
 */
export async function attachEmail(store: AssistantStore, visitorId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  const existing = await store.findVisitorByEmail(normalized);
  if (existing && existing.id !== visitorId) await store.mergeVisitors(visitorId, existing.id);
  await store.updateVisitor(visitorId, { email: normalized });
}

/* ------------------------------------------------------------------ */
/* Summary rewrite at session end                                      */
/* ------------------------------------------------------------------ */

function fallbackSummary(v: VisitorRow, session: SessionRow): string {
  const facts = [
    v.firstName && `First name: ${v.firstName}.`,
    v.company && `Company: ${v.company}.`,
    v.trade && `Trade: ${v.trade}.`,
    v.unpaidJobsEstimate && `About ${v.unpaidJobsEstimate} unpaid jobs.`,
    v.tools?.length && `Tools: ${v.tools.join(", ")}.`,
    v.lastTopic && `Last asked about ${v.lastTopic}.`,
    session.state.booked && `Demo booked.`,
    session.outcome === "handoff" && `Asked for a person; team to reply by email.`,
  ].filter(Boolean);
  return facts.join(" ").slice(0, SUMMARY_MAX);
}

export function clampSummary(text: string) {
  let t = redact(text.replace(/\s+/g, " ").trim());
  // Strip phone numbers and emails other than the visitor's own field (kept separately).
  t = t.replace(/\+?\d[\d\s().-]{7,}\d/g, "").replace(/\s{2,}/g, " ");
  return t.length > SUMMARY_MAX ? t.slice(0, SUMMARY_MAX - 1).trimEnd() + "…" : t;
}

/**
 * Rewrites visitor.memory_summary from the previous summary + this session's transcript.
 * "Facts the visitor stated + what's pending", <= 600 chars, no sensitive data.
 */
export async function rewriteMemorySummary(store: AssistantStore, sessionId: string) {
  const session = await store.getSession(sessionId);
  if (!session) return;
  const visitor = await store.getVisitor(session.visitorId);
  if (!visitor || !visitor.consentMemory) return;
  const messages = await store.listMessages(sessionId, 40);
  if (!messages.some((m) => m.role === "user")) return;

  let summary = fallbackSummary(visitor, session);
  const model = anthropicModel(assistantEnv.model());
  if (model) {
    const transcript = messages
      .map((m) => `${m.role === "user" ? "Visitor" : "Assistant"}: ${m.content}`)
      .join("\n")
      .slice(-8000);
    try {
      const res = await generateText({
        model,
        maxOutputTokens: 250,
        instructions:
          "You write a short memory note about a website visitor for a receptionist assistant. " +
          "Write only facts the VISITOR stated about themselves and their business (trade, rough number of unpaid jobs, current process, tools, first name, company) and what is pending (demo booked / considering a demo / waiting for a team reply / asked to be emailed). " +
          "Never include: card, bank or SSN numbers; phone numbers; names, amounts or details of the visitor's customers; anything the assistant said about pricing amounts. " +
          `Plain sentences, at most ${SUMMARY_MAX} characters. Output only the note.`,
        prompt: `Previous note: ${visitor.memorySummary ?? "(none)"}\n\nThis conversation:\n${transcript}`,
      });
      if (res.text.trim()) summary = res.text;
    } catch (err) {
      console.error("[assistant] summary rewrite failed", err);
    }
  }
  const clean = clampSummary(summary);
  await store.updateVisitor(visitor.id, { memorySummary: clean || null });
  await store.updateSession(sessionId, { summary: clean || null, endedAt: session.endedAt ?? new Date().toISOString() });
}

/** Short summary for alert emails (no model call). */
export async function sessionDigest(store: AssistantStore, sessionId: string): Promise<string> {
  const messages = await store.listMessages(sessionId, 20);
  return messages
    .map((m) => `${m.role === "user" ? "Visitor" : "Assistant"}: ${m.content}`)
    .join("\n")
    .slice(-3000);
}

export function withinMemoryWindow(iso: string) {
  return Date.now() - Date.parse(iso) <= MEMORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}
