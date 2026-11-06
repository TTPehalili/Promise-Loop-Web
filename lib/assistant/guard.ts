// Server-side guardrails (brief §4, §6.3): redaction, output filter, rate limits.
import type { TextStreamPart, ToolSet } from "ai";

/* ================================================================== */
/* Redaction before storing (§6.3)                                     */
/* ================================================================== */

export const REDACTED = "[redacted]";

export function luhnValid(digits: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

// 13–19 digits, optionally separated by single spaces or dashes.
const CARD_RE = /(?<![\d])(?:\d[ -]?){12,18}\d(?![\d])/g;
const SSN_RE = /\b(?!000|666|9\d\d)\d{3}[- ](?!00)\d{2}[- ](?!0000)\d{4}\b/g;
const SSN_KEYWORD_RE = /\b(ssn|social security(?: number| no\.?| #)?)(\s*(?:is|:|#)?\s*)(\d{9})\b/gi;
const BANK_RE =
  /\b(routing|aba|account|acct|iban|bank account)(\s*(?:number|no\.?|num|#)?\s*(?:is|:|#)?\s*)(\d[\d -]{4,22}\d)\b/gi;

/** Masks card numbers (Luhn-checked), SSNs, and routing/account numbers. */
export function redact(text: string): string {
  if (!text) return text;
  let out = text.replace(CARD_RE, (m) => {
    const digits = m.replace(/[ -]/g, "");
    return digits.length >= 13 && digits.length <= 19 && luhnValid(digits) ? REDACTED : m;
  });
  out = out.replace(SSN_RE, REDACTED);
  out = out.replace(SSN_KEYWORD_RE, (_m, k: string, sep: string) => `${k}${sep}${REDACTED}`);
  out = out.replace(BANK_RE, (_m, k: string, sep: string) => `${k}${sep}${REDACTED}`);
  return out;
}

export function containsSensitive(text: string): boolean {
  return redact(text) !== text;
}

/** Redacts every string inside a JSON-like value (for UI message parts). */
export function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redact(value) as T;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = redactDeep(v);
    return out as T;
  }
  return value;
}

/* ================================================================== */
/* Output filter (§4 server-side checks)                               */
/* ================================================================== */

export type ViolationKind =
  | "retainer_amount"
  | "guarantee"
  | "vendor_name"
  | "sensitive_number"
  | "results_claim"
  | "integration_claim"
  | "bracket_text";

export type Violation = { kind: ViolationKind; match: string };

/** Vendor / model / tech-stack names that must never appear in a reply. */
export const VENDOR_NAMES = [
  "Anthropic",
  "Claude",
  "Haiku",
  "Sonnet",
  "Opus",
  "OpenAI",
  "ChatGPT",
  "GPT",
  "Gemini",
  "Bard",
  "Llama",
  "Mistral",
  "Copilot",
  "Supabase",
  "Postgres",
  "PostgreSQL",
  "Vercel",
  "Railway",
  "Resend",
  "Next.js",
  "ElevenLabs",
  "Cal.com",
  "Calendly",
  "Twilio",
  "Stripe",
  "AWS",
  "Azure",
  "Google Cloud",
  "AI SDK",
  "Chat GPT",
];

const VENDOR_RE = new RegExp(
  `(?<![A-Za-z0-9])(?:${VENDOR_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?:[- ]?\\d[\\w.]*)?(?![A-Za-z0-9])`,
  // Case-sensitive on purpose: avoids false hits on ordinary words ("resend the invite").
  "",
);

const MONEY_RE = /\$\s?\d[\d,]*(?:\.\d+)?\s?(?:k|K|m|M)?\b|\b\d[\d,]*(?:\.\d+)?\s?(?:dollars|usd|bucks)\b|\b\d+(?:\.\d+)?\s?k\b(?=[^.]{0,30}(?:month|mo\b|retainer))/gi;
const RETAINER_RE = /retainer/gi;
const NEAR = 90;
const GUARANTEE_RE = /\bguarantee(?:d|s|ing)?\b|\b(?:fully|100%|completely|totally)\s+compliant\b/i;
const PERCENT_NEAR_RESULTS_RE = /\b(\d{1,3})\s?%[^.!?\n]{0,50}\b(?:recover|collect|success|get back|paid back)|\b(?:recover|collect|success rate|get back)[^.!?\n]{0,50}?\b(\d{1,3})\s?%/i;
const INTEGRATION_CLAIM_RE =
  /\b(?:we|promiseloop|it)\s+(?:already\s+|fully\s+|directly\s+)?(?:integrates?|connects?|syncs?|works?|plugs?\s+in)\s+(?:directly\s+|natively\s+)?(?:with|into|to)\s+(?:servicetitan|jobber|housecall\s*pro|quickbooks|fieldedge|workiz|service\s*fusion)\b/i;
const BRACKET_RE = /\[[^\]\n]{2,}\](?!\()/;

function positions(re: RegExp, text: string) {
  const out: { index: number; match: string }[] = [];
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = r.exec(text))) {
    out.push({ index: m.index, match: m[0] });
    if (m[0].length === 0) r.lastIndex++;
  }
  return out;
}

export function scanOutput(text: string): Violation[] {
  const v: Violation[] = [];
  if (!text) return v;

  const retainers = positions(RETAINER_RE, text);
  if (retainers.length) {
    for (const money of positions(MONEY_RE, text)) {
      if (retainers.some((r) => Math.abs(r.index - money.index) <= NEAR)) {
        v.push({ kind: "retainer_amount", match: money.match });
        break;
      }
    }
  }

  const g = GUARANTEE_RE.exec(text);
  if (g) v.push({ kind: "guarantee", match: g[0] });

  const vendor = VENDOR_RE.exec(text);
  if (vendor) v.push({ kind: "vendor_name", match: vendor[0] });

  if (containsSensitive(text)) v.push({ kind: "sensitive_number", match: "(number pattern)" });

  const pr = PERCENT_NEAR_RESULTS_RE.exec(text);
  if (pr) {
    const pct = pr[1] ?? pr[2];
    // "5% of the payments you confirm" is the pricing model, not a results claim.
    if (pct !== "5") v.push({ kind: "results_claim", match: pr[0] });
  }

  const ic = INTEGRATION_CLAIM_RE.exec(text);
  if (ic) v.push({ kind: "integration_claim", match: ic[0] });

  const br = BRACKET_RE.exec(text);
  if (br) v.push({ kind: "bracket_text", match: br[0] });

  return v;
}

export function describeViolations(v: Violation[]): string {
  const why: Record<ViolationKind, string> = {
    retainer_amount: "it stated or implied a dollar amount for the retainer (never give one)",
    guarantee: "it used the word 'guarantee' or claimed full compliance (never do either; don't use the word at all)",
    vendor_name: "it named a vendor, model or technology (never name any)",
    sensitive_number: "it contained a card, SSN or bank number (never repeat these)",
    results_claim: "it implied a recovery or collection rate (no results claims or statistics)",
    integration_claim: "it claimed an integration with a named product (only say we connect the visitor's dialer, texting, email and CRM, and offer to confirm on the demo)",
    bracket_text: "it contained placeholder text in square brackets",
  };
  return [...new Set(v.map((x) => why[x.kind]))].join("; ");
}

export function cannedReply(v: Violation[], ctx: { contactEmail: string }): string {
  const kinds = new Set(v.map((x) => x.kind));
  if (kinds.has("retainer_amount"))
    return "The retainer is quoted for the size of team you need, and the team covers it on the demo. On top of that, we earn 5% of the payments you confirm, with no setup fee. Want me to find a demo time?";
  if (kinds.has("vendor_name")) return "I'm PromiseLoop's AI assistant. What would you like to know about our calling team?";
  if (kinds.has("sensitive_number"))
    return "Please don't share card, bank or Social Security numbers here. I don't need them, and our team never handles payments. What else can I help with?";
  if (kinds.has("integration_claim"))
    return "We connect your dialer, texting, email and CRM to PromiseLoop, or you can upload a CSV or invoice PDFs. The team can confirm your exact setup on the demo. Want me to find a time?";
  return `I don't want to guess on that. I can have the team answer it by email, or we can cover it on the demo. You can also reach us at ${ctx.contactEmail}.`;
}

/**
 * Stream transform that holds each text block until it is complete, scans it,
 * and only then releases it (as one delta; a smoothStream transform placed after
 * this one re-chunks it word by word). Tool calls/results pass through untouched.
 *
 * On a violation: `rewrite` is called once (a non-streamed regeneration with the
 * violation explained); if the rewrite is clean it is emitted, otherwise the
 * canned safe reply is emitted. Nothing unscanned ever reaches the client.
 */
export function outputGuard<TOOLS extends ToolSet>(opts: {
  rewrite: (draft: string, violations: Violation[]) => Promise<string | null>;
  canned: (violations: Violation[]) => string;
  onViolation?: (info: { draft: string; violations: Violation[]; resolved: "rewrite" | "canned" }) => void;
}) {
  return (_options: { tools: TOOLS; stopStream: () => void }) => {
    type Buf = { start: TextStreamPart<TOOLS>; text: string };
    const open = new Map<string, Buf>();

    const settle = async (draft: string): Promise<string> => {
      const v = scanOutput(draft);
      if (v.length === 0) return draft;
      let rewritten: string | null = null;
      try {
        rewritten = await opts.rewrite(draft, v);
      } catch (err) {
        console.error("[assistant] rewrite failed", err);
      }
      if (rewritten && scanOutput(rewritten).length === 0) {
        opts.onViolation?.({ draft, violations: v, resolved: "rewrite" });
        return rewritten;
      }
      opts.onViolation?.({ draft, violations: v, resolved: "canned" });
      return opts.canned(v);
    };

    const release = async (id: string, controller: TransformStreamDefaultController<TextStreamPart<TOOLS>>) => {
      const buf = open.get(id);
      if (!buf) return;
      open.delete(id);
      const final = buf.text.trim() ? await settle(buf.text) : buf.text;
      controller.enqueue(buf.start);
      if (final) controller.enqueue({ type: "text-delta", id, text: final } as TextStreamPart<TOOLS>);
    };

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      async transform(chunk, controller) {
        switch (chunk.type) {
          case "text-start":
            open.set(chunk.id, { start: chunk, text: "" });
            return;
          case "text-delta": {
            const buf = open.get(chunk.id);
            if (buf) buf.text += chunk.text;
            else controller.enqueue(chunk);
            return;
          }
          case "text-end":
            await release(chunk.id, controller);
            controller.enqueue(chunk);
            return;
          case "finish-step":
          case "finish":
          case "error":
          case "abort":
            // Close any text block the provider never ended.
            for (const id of [...open.keys()]) {
              await release(id, controller);
              controller.enqueue({ type: "text-end", id } as TextStreamPart<TOOLS>);
            }
            controller.enqueue(chunk);
            return;
          case "custom":
            // Provider bookkeeping (e.g. message_start metadata): not for the visitor's UI or storage.
            return;
          default:
            controller.enqueue(chunk);
        }
      },
      async flush(controller) {
        for (const id of [...open.keys()]) {
          await release(id, controller);
          controller.enqueue({ type: "text-end", id } as TextStreamPart<TOOLS>);
        }
      },
    });
  };
}

/* ================================================================== */
/* Rate limits (in-memory, PER INSTANCE)                               */
/* ================================================================== */
// With several server instances each one keeps its own buckets, so the
// effective limit is N x the configured value. Move to a shared store
// (e.g. a database row or a KV) if the site scales out.

type Bucket = { tokens: number; updated: number };
function buckets(): Map<string, Bucket> {
  const g = globalThis as unknown as { __plAssistantBuckets?: Map<string, Bucket> };
  g.__plAssistantBuckets ??= new Map();
  return g.__plAssistantBuckets;
}

/** Token bucket: `capacity` requests, refilled continuously over `perMs`. */
export function takeToken(key: string, capacity: number, perMs: number): boolean {
  const map = buckets();
  const now = Date.now();
  const b = map.get(key) ?? { tokens: capacity, updated: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.updated) / perMs) * capacity);
  b.updated = now;
  if (b.tokens < 1) {
    map.set(key, b);
    return false;
  }
  b.tokens -= 1;
  map.set(key, b);
  if (map.size > 50_000) {
    // crude cleanup of full buckets
    for (const [k, v] of map) if (v.tokens >= capacity) map.delete(k);
  }
  return true;
}

/** Empties a bucket (abuse / spam: "one neutral line, then rate limit"). */
export function drainBucket(key: string) {
  buckets().set(key, { tokens: 0, updated: Date.now() });
}

export const LIMITS = {
  ipPerMinute: 20,
  messagesPerSession: 40,
  sessionsPerVisitorPerDay: 3,
};

export function ipLimit(ip: string) {
  return takeToken(`ip:${ip}`, LIMITS.ipPerMinute, 60_000);
}

export function clientIp(req: Request): string {
  // Last hop = the address the platform proxy saw (the first entry can be spoofed by the client).
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",").pop()!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Eval runs (scripts/eval-assistant.mjs) may skip the IP limit with a shared secret. Off when unset. */
export function isEvalRequest(req: Request): boolean {
  const token = process.env.ASSISTANT_EVAL_TOKEN;
  return Boolean(token && token.length >= 16 && req.headers.get("x-assistant-eval") === token);
}

export function ipAllowed(req: Request): boolean {
  return isEvalRequest(req) || ipLimit(clientIp(req));
}

/* ================================================================== */
/* Input heuristics                                                    */
/* ================================================================== */

const ABUSE_RE = /\b(fuck|shit|bitch|cunt|retard|kill yourself|kys)\b/i;
export function looksAbusive(text: string) {
  return ABUSE_RE.test(text) || /(.)\1{30,}/.test(text) || /(https?:\/\/\S+.*){4,}/i.test(text);
}

export const FORGET_RE = /\b(forget me|delete (all )?my (data|info|information|chat|conversation)|erase my data)\b/i;
