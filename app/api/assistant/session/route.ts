import { after, NextResponse } from "next/server";
import { ipAllowed, LIMITS } from "@/lib/assistant/guard";
import { errorResponse, readVisitorId, setVisitorCookie } from "@/lib/assistant/http";
import { buildGreeting, firstGreeting, rewriteMemorySummary, toUIMessages, withinMemoryWindow } from "@/lib/assistant/memory";
import { getStore, type SessionRow } from "@/lib/assistant/store";
import type { SessionResponse } from "@/lib/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resume the latest session if it is this recent and under the message cap. */
const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000;
const RESUME_MESSAGES = 20;

export async function GET(req: Request) {
  if (!ipAllowed(req)) return errorResponse("rate_limited");
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  const store = getStore();

  // Visitor (cookie set here, on first open only).
  let visitorId = readVisitorId(req);
  let visitor = visitorId ? await store.getVisitor(visitorId) : null;
  let setCookie = false;
  if (!visitor) {
    visitor = await store.createVisitor();
    visitorId = visitor.id;
    setCookie = true;
  } else {
    await store.updateVisitor(visitor.id, { lastSeenAt: new Date().toISOString() });
  }

  const recent = await store.listSessions(visitor.id, 5);
  const latest: SessionRow | undefined = recent[0];
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sessionsToday = recent.filter((s) => s.startedAt >= dayAgo).length;
  const capped = sessionsToday >= LIMITS.sessionsPerVisitorPerDay;

  let session: SessionRow;
  let resumed = false;

  if (fresh) {
    // Start fresh: new session, same visitor, greeting without memory.
    if (capped && latest) {
      // Over the daily session cap: reuse the latest session, but without memory.
      session = latest;
      await store.updateSession(session.id, { useMemory: false });
      session = { ...session, useMemory: false };
    } else {
      session = await store.createSession({ visitorId: visitor.id, pagePath: null, useMemory: false });
    }
    if (latest && latest.id !== session.id) after(() => summarizeIfNeeded(latest));
    const g = firstGreeting();
    return respond({ sessionId: session.id, greeting: { text: g.text, variant: g.variant }, chips: g.chips, messages: [] }, visitor.id, setCookie);
  }

  if (latest) {
    const userCount = await store.countUserMessages(latest.id);
    const lastActive = Date.parse(latest.startedAt);
    const resumable =
      userCount === 0 ||
      (Date.now() - lastActive < RESUME_WINDOW_MS && userCount < LIMITS.messagesPerSession) ||
      capped;
    if (resumable) {
      session = latest;
      resumed = userCount > 0;
    } else {
      session = await store.createSession({ visitorId: visitor.id, pagePath: null, useMemory: true });
      after(() => summarizeIfNeeded(latest));
    }
  } else {
    session = await store.createSession({ visitorId: visitor.id, pagePath: null, useMemory: true });
  }

  const messages = resumed ? toUIMessages(await store.listMessages(session.id, RESUME_MESSAGES)) : [];
  const booking = await store.upcomingBooking(visitor.id);
  const hadRecentConversation = await hasRecentConversation(recent, session.id, resumed);
  const g =
    session.useMemory || booking
      ? buildGreeting({ visitor: (await store.getVisitor(visitor.id)) ?? visitor, hadRecentConversation, booking })
      : firstGreeting();

  const body: SessionResponse = {
    sessionId: session.id,
    greeting: { text: g.text, variant: g.variant },
    chips: g.chips,
    messages,
    ...(booking ? { booking: { label: booking.label, startsAt: booking.startsAt } } : {}),
  };
  return respond(body, visitor.id, setCookie);

  async function hasRecentConversation(sessions: SessionRow[], currentId: string, isResumed: boolean) {
    for (const s of sessions) {
      if (!withinMemoryWindow(s.startedAt)) continue;
      if (s.id === currentId && !isResumed) continue;
      if ((await store.countUserMessages(s.id)) > 0) return true;
    }
    return false;
  }

  async function summarizeIfNeeded(s: SessionRow) {
    if (s.summary) return;
    try {
      await rewriteMemorySummary(store, s.id);
    } catch (err) {
      console.error("[assistant] lazy summary failed", err);
    }
  }
}

function respond(body: SessionResponse, visitorId: string, setCookie: boolean) {
  const res = NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  if (setCookie) setVisitorCookie(res, visitorId);
  return res;
}
