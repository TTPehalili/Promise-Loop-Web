// Scheduling provider adapter (slots, book, reschedule link).
// Cal.com API v2 when SCHEDULING_API_KEY + SCHEDULING_EVENT_ID are set.
// Otherwise every call reports "not available" and the UI shows the booking link.
// Never invents availability.
import { assistantEnv } from "./env";
import type { DemoSlot } from "./types";

export const MAX_SLOTS = 6;
/** Don't offer slots that start sooner than this. */
const MIN_LEAD_MS = 2 * 60 * 60 * 1000;

export function schedulingConfigured() {
  return Boolean(assistantEnv.schedulingKey() && assistantEnv.schedulingEventId());
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export function safeTimeZone(tz: string | undefined | null): string {
  if (!tz) return "America/Chicago";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "America/Chicago";
  }
}

/** "CST"/"CDT" → "CT", "PST" → "PT", "AKDT" → "AKT"; other zones keep their short name. */
function zoneAbbrev(date: Date, tz: string) {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  const m = /^([A-Z]{1,3})[SD]T$/.exec(name);
  return m ? `${m[1]}T` : name;
}

/** "Thu 13 · 10:00 AM CT" */
export function slotLabel(iso: string, tz: string): string {
  const d = new Date(iso);
  const zone = safeTimeZone(tz);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(d);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: zone, day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(d);
  return `${weekday} ${day} · ${time} ${zoneAbbrev(d, zone)}`;
}

/** "Thu, Nov 13 · 10:00 AM CT" (greeting / confirmation) */
export function longLabel(iso: string, tz: string): string {
  const d = new Date(iso);
  const zone = safeTimeZone(tz);
  const date = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(d);
  return `${date} · ${time} ${zoneAbbrev(d, zone)}`;
}

const encodeSlotId = (iso: string) => Buffer.from(iso, "utf8").toString("base64url");
export const decodeSlotId = (id: string) => {
  try {
    const iso = Buffer.from(id, "base64url").toString("utf8");
    return Number.isFinite(Date.parse(iso)) ? iso : null;
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/* Provider calls                                                      */
/* ------------------------------------------------------------------ */

function headers(version: string) {
  return {
    Authorization: `Bearer ${assistantEnv.schedulingKey()}`,
    "cal-api-version": version,
    "Content-Type": "application/json",
  };
}

export type SlotsResult = { ok: true; slots: DemoSlot[] } | { ok: false; bookingUrl: string };

export async function getSlots(input: { days?: number; visitorTz: string }): Promise<SlotsResult> {
  const fallback: SlotsResult = { ok: false, bookingUrl: assistantEnv.demoUrl };
  if (!schedulingConfigured()) return fallback;

  const days = Math.min(Math.max(Math.round(input.days ?? 7), 1), 14);
  const tz = safeTimeZone(input.visitorTz);
  const start = new Date(Date.now() + MIN_LEAD_MS);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  const qs = new URLSearchParams({
    eventTypeId: String(assistantEnv.schedulingEventId()),
    start: start.toISOString(),
    end: end.toISOString(),
    timeZone: "UTC",
  });

  try {
    const res = await fetch(`${assistantEnv.schedulingBaseUrl()}/slots?${qs}`, {
      headers: headers(assistantEnv.schedulingSlotsVersion()),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[assistant] slots failed: ${res.status} ${await res.text().catch(() => "")}`);
      return fallback;
    }
    const json = (await res.json()) as { status?: string; data?: Record<string, Array<string | { start: string }>> };
    if (json.status !== "success" || !json.data) return fallback;

    const starts = Object.values(json.data)
      .flat()
      .map((s) => (typeof s === "string" ? s : s?.start))
      .filter((s): s is string => typeof s === "string" && Number.isFinite(Date.parse(s)))
      .map((s) => new Date(s).toISOString())
      .filter((s) => Date.parse(s) >= start.getTime())
      .sort();

    const unique = [...new Set(starts)].slice(0, MAX_SLOTS);
    if (unique.length === 0) return fallback;
    return {
      ok: true,
      slots: unique.map((iso) => ({ id: encodeSlotId(iso), startsAt: iso, label: slotLabel(iso, tz) })),
    };
  } catch (err) {
    console.error("[assistant] slots error", err);
    return fallback;
  }
}

export type BookResult =
  | { ok: true; providerBookingId: string; startsAt: string; rescheduleUrl?: string; addToCalendarUrl?: string }
  | { ok: false; reason: "unavailable" | "slot_taken" | "error" };

export async function bookSlot(input: {
  startsAt: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  visitorTz: string;
}): Promise<BookResult> {
  if (!schedulingConfigured()) return { ok: false, reason: "unavailable" };
  const tz = safeTimeZone(input.visitorTz);
  const phone = input.phone && /^\+[1-9]\d{6,14}$/.test(input.phone.replace(/[\s().-]/g, ""))
    ? input.phone.replace(/[\s().-]/g, "")
    : undefined;

  try {
    const res = await fetch(`${assistantEnv.schedulingBaseUrl()}/bookings`, {
      method: "POST",
      headers: headers(assistantEnv.schedulingBookingsVersion()),
      body: JSON.stringify({
        start: input.startsAt,
        eventTypeId: Number(assistantEnv.schedulingEventId()),
        attendee: {
          name: input.name,
          email: input.email,
          timeZone: tz,
          language: "en",
          ...(phone ? { phoneNumber: phone } : {}),
        },
        metadata: { company: input.company.slice(0, 400), source: "website-assistant" },
      }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as
      | { status?: string; data?: { uid?: string; start?: string } | Array<{ uid?: string; start?: string }>; error?: unknown }
      | null;
    if (!res.ok || json?.status !== "success" || !json.data) {
      console.error(`[assistant] booking failed: ${res.status} ${JSON.stringify(json?.error ?? json)}`);
      return { ok: false, reason: res.status === 400 || res.status === 409 ? "slot_taken" : "error" };
    }
    const data = Array.isArray(json.data) ? json.data[0] : json.data;
    const uid = data?.uid ?? "";
    const startsAt = data?.start ? new Date(data.start).toISOString() : input.startsAt;
    return {
      ok: true,
      providerBookingId: uid,
      startsAt,
      rescheduleUrl: uid ? `${assistantEnv.schedulingRescheduleBase()}/${encodeURIComponent(uid)}` : undefined,
      addToCalendarUrl: addToCalendarUrl(startsAt),
    };
  } catch (err) {
    console.error("[assistant] booking error", err);
    return { ok: false, reason: "error" };
  }
}

/** Generic calendar template link (20 min). */
export function addToCalendarUrl(startsAt: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const s = new Date(startsAt);
  const e = new Date(s.getTime() + 20 * 60 * 1000);
  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: "PromiseLoop demo · 20 min",
    dates: `${fmt(s)}/${fmt(e)}`,
    details: "Bring your 10 oldest invoices. The meeting link is in your calendar invite.",
  });
  return `https://calendar.google.com/calendar/render?${qs}`;
}
