import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AssistantStage, DemoSlot } from "./types";

/* ------------------------------------------------------------------ */
/* Row types                                                           */
/* ------------------------------------------------------------------ */

export type VisitorRow = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  firstName: string | null;
  email: string | null;
  company: string | null;
  trade: string | null;
  unpaidJobsEstimate: number | null;
  currentProcess: string | null;
  tools: string[] | null;
  visitorType: "prospect" | "not_prospect";
  memorySummary: string | null;
  lastTopic: string | null;
  consentMemory: boolean;
};

export type VisitorPatch = Partial<Omit<VisitorRow, "id" | "createdAt">>;

/** Server-side state for the stage machine and tool gates. */
export type SessionState = {
  /** Visitor turns so far in this session. */
  turn: number;
  /** Slots returned by get_demo_slots in this session (book_demo gate). */
  slotsOffered?: DemoSlot[];
  /** Turn number of the last "not now" to a demo offer. */
  notNowTurn?: number;
  /** Turn number of the last demo offer. */
  lastPivotTurn?: number;
  /** Questions answered (heuristic). */
  questionsAnswered: number;
  /** Consecutive "I don't want to guess" replies. */
  unknownStreak: number;
  booked?: boolean;
  closed?: boolean;
};

export type SessionOutcome = "booked" | "lead" | "handoff" | "redirected" | "abandoned" | "closed";

export type SessionRow = {
  id: string;
  visitorId: string;
  startedAt: string;
  endedAt: string | null;
  stage: AssistantStage;
  pagePath: string | null;
  summary: string | null;
  outcome: SessionOutcome | null;
  state: SessionState;
  useMemory: boolean;
};

export type SessionPatch = Partial<Omit<SessionRow, "id" | "visitorId" | "startedAt">>;

export type StoredMessage = {
  uiId: string;
  role: "user" | "assistant";
  /** Redacted plain text. */
  content: string;
  /** Redacted UI message parts (JSON) and metadata, for resume. */
  parts: unknown[];
  metadata?: unknown;
  createdAt: string;
  feedback: 1 | -1 | null;
};

export type LeadInput = {
  visitorId: string | null;
  sessionId: string | null;
  type: "demo" | "email_me" | "handoff";
  firstName?: string | null;
  email: string;
  company?: string | null;
  phone?: string | null;
  note?: string | null;
};

export type BookingRow = {
  id: string;
  leadId: string;
  visitorId: string | null;
  providerBookingId: string | null;
  startsAt: string;
  visitorTz: string;
  label: string;
  rescheduleUrl: string | null;
  status: "booked" | "rescheduled" | "cancelled" | "no_show" | "held";
};

export interface AssistantStore {
  readonly kind: "supabase" | "memory";

  getVisitor(id: string): Promise<VisitorRow | null>;
  createVisitor(): Promise<VisitorRow>;
  updateVisitor(id: string, patch: VisitorPatch): Promise<void>;
  findVisitorByEmail(email: string): Promise<VisitorRow | null>;
  /** Moves everything from `fromId` into `intoId`, fills empty fields on `intoId`, deletes `fromId`. */
  mergeVisitors(intoId: string, fromId: string): Promise<void>;

  createSession(input: { visitorId: string; pagePath: string | null; useMemory: boolean }): Promise<SessionRow>;
  getSession(id: string): Promise<SessionRow | null>;
  updateSession(id: string, patch: SessionPatch): Promise<void>;
  /** Most recent sessions first. */
  listSessions(visitorId: string, limit: number): Promise<SessionRow[]>;
  countSessionsSince(visitorId: string, sinceIso: string): Promise<number>;

  listMessages(sessionId: string, limit: number): Promise<StoredMessage[]>;
  /** Upsert by uiId within the session. */
  saveMessages(sessionId: string, messages: Omit<StoredMessage, "createdAt" | "feedback">[]): Promise<void>;
  countUserMessages(sessionId: string): Promise<number>;
  /** Only succeeds if the message belongs to one of the visitor's sessions. */
  setFeedback(visitorId: string, uiId: string, value: 1 | -1): Promise<boolean>;

  createLead(input: LeadInput): Promise<string>;
  createBooking(input: Omit<BookingRow, "id" | "status">): Promise<string>;
  /** Latest booking that hasn't started yet (or started < 1 h ago). */
  upcomingBooking(visitorId: string): Promise<BookingRow | null>;

  /** Forget me (§6.1). Keeps bookings (detached) so the team calendar stays consistent. */
  forgetVisitor(visitorId: string): Promise<{ hadBooking: boolean }>;
}

const nowIso = () => new Date().toISOString();
const emptyState = (): SessionState => ({ turn: 0, questionsAnswered: 0, unknownStreak: 0 });

/* ------------------------------------------------------------------ */
/* In-memory implementation (local dev; per-process, lost on restart)  */
/* ------------------------------------------------------------------ */

type Mem = {
  visitors: Map<string, VisitorRow>;
  sessions: Map<string, SessionRow>;
  messages: Map<string, StoredMessage[]>; // by session
  leads: Map<string, LeadInput & { id: string; createdAt: string }>;
  bookings: Map<string, BookingRow>;
};

function memState(): Mem {
  const g = globalThis as unknown as { __plAssistantMem?: Mem };
  g.__plAssistantMem ??= {
    visitors: new Map(),
    sessions: new Map(),
    messages: new Map(),
    leads: new Map(),
    bookings: new Map(),
  };
  return g.__plAssistantMem;
}

class MemoryStore implements AssistantStore {
  readonly kind = "memory" as const;
  private m = memState();

  async getVisitor(id: string) {
    return this.m.visitors.get(id) ?? null;
  }
  async createVisitor() {
    const v: VisitorRow = {
      id: randomUUID(),
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
      firstName: null,
      email: null,
      company: null,
      trade: null,
      unpaidJobsEstimate: null,
      currentProcess: null,
      tools: null,
      visitorType: "prospect",
      memorySummary: null,
      lastTopic: null,
      consentMemory: true,
    };
    this.m.visitors.set(v.id, v);
    return v;
  }
  async updateVisitor(id: string, patch: VisitorPatch) {
    const v = this.m.visitors.get(id);
    if (v) this.m.visitors.set(id, { ...v, ...patch });
  }
  async findVisitorByEmail(email: string) {
    const e = email.toLowerCase();
    for (const v of this.m.visitors.values()) if (v.email?.toLowerCase() === e) return v;
    return null;
  }
  async mergeVisitors(intoId: string, fromId: string) {
    if (intoId === fromId) return;
    const into = this.m.visitors.get(intoId);
    const from = this.m.visitors.get(fromId);
    if (!into || !from) return;
    for (const s of this.m.sessions.values()) if (s.visitorId === fromId) s.visitorId = intoId;
    for (const l of this.m.leads.values()) if (l.visitorId === fromId) l.visitorId = intoId;
    for (const b of this.m.bookings.values()) if (b.visitorId === fromId) b.visitorId = intoId;
    this.m.visitors.set(intoId, fillEmpty(into, from));
    this.m.visitors.delete(fromId);
  }

  async createSession(input: { visitorId: string; pagePath: string | null; useMemory: boolean }) {
    const s: SessionRow = {
      id: randomUUID(),
      visitorId: input.visitorId,
      startedAt: nowIso(),
      endedAt: null,
      stage: "GREET",
      pagePath: input.pagePath,
      summary: null,
      outcome: null,
      state: emptyState(),
      useMemory: input.useMemory,
    };
    this.m.sessions.set(s.id, s);
    return s;
  }
  async getSession(id: string) {
    return this.m.sessions.get(id) ?? null;
  }
  async updateSession(id: string, patch: SessionPatch) {
    const s = this.m.sessions.get(id);
    if (s) this.m.sessions.set(id, { ...s, ...patch });
  }
  async listSessions(visitorId: string, limit: number) {
    return [...this.m.sessions.values()]
      .filter((s) => s.visitorId === visitorId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }
  async countSessionsSince(visitorId: string, sinceIso: string) {
    return [...this.m.sessions.values()].filter((s) => s.visitorId === visitorId && s.startedAt >= sinceIso).length;
  }

  async listMessages(sessionId: string, limit: number) {
    const list = this.m.messages.get(sessionId) ?? [];
    return list.slice(-limit);
  }
  async saveMessages(sessionId: string, messages: Omit<StoredMessage, "createdAt" | "feedback">[]) {
    const list = this.m.messages.get(sessionId) ?? [];
    for (const msg of messages) {
      const i = list.findIndex((x) => x.uiId === msg.uiId);
      if (i >= 0) list[i] = { ...list[i], ...msg };
      else list.push({ ...msg, createdAt: nowIso(), feedback: null });
    }
    this.m.messages.set(sessionId, list);
  }
  async countUserMessages(sessionId: string) {
    return (this.m.messages.get(sessionId) ?? []).filter((m) => m.role === "user").length;
  }
  async setFeedback(visitorId: string, uiId: string, value: 1 | -1) {
    for (const s of this.m.sessions.values()) {
      if (s.visitorId !== visitorId) continue;
      const msg = (this.m.messages.get(s.id) ?? []).find((m) => m.uiId === uiId && m.role === "assistant");
      if (msg) {
        msg.feedback = value;
        return true;
      }
    }
    return false;
  }

  async createLead(input: LeadInput) {
    const id = randomUUID();
    this.m.leads.set(id, { ...input, id, createdAt: nowIso() });
    return id;
  }
  async createBooking(input: Omit<BookingRow, "id" | "status">) {
    const id = randomUUID();
    this.m.bookings.set(id, { ...input, id, status: "booked" });
    return id;
  }
  async upcomingBooking(visitorId: string) {
    const cutoff = Date.now() - 60 * 60 * 1000;
    return (
      [...this.m.bookings.values()]
        .filter((b) => b.visitorId === visitorId && b.status === "booked" && Date.parse(b.startsAt) > cutoff)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null
    );
  }

  async forgetVisitor(visitorId: string) {
    const hadBooking = [...this.m.bookings.values()].some((b) => b.visitorId === visitorId && b.status === "booked");
    const bookedLeadIds = new Set([...this.m.bookings.values()].map((b) => b.leadId));
    for (const b of this.m.bookings.values()) if (b.visitorId === visitorId) b.visitorId = null;
    for (const [id, l] of this.m.leads) {
      if (l.visitorId !== visitorId) continue;
      if (bookedLeadIds.has(id)) {
        l.visitorId = null;
        l.sessionId = null;
      } else this.m.leads.delete(id);
    }
    for (const [id, s] of this.m.sessions) {
      if (s.visitorId === visitorId) {
        this.m.messages.delete(id);
        this.m.sessions.delete(id);
      }
    }
    this.m.visitors.delete(visitorId);
    return { hadBooking };
  }
}

function fillEmpty(into: VisitorRow, from: VisitorRow): VisitorRow {
  const out = { ...into };
  (Object.keys(from) as (keyof VisitorRow)[]).forEach((k) => {
    if (k === "id" || k === "createdAt") return;
    if (out[k] === null || out[k] === undefined) (out as Record<string, unknown>)[k] = from[k];
  });
  out.createdAt = into.createdAt < from.createdAt ? into.createdAt : from.createdAt;
  out.lastSeenAt = nowIso();
  return out;
}

/* ------------------------------------------------------------------ */
/* Supabase implementation (service role; RLS on, no policies)         */
/* ------------------------------------------------------------------ */

type Db = Record<string, unknown>;

const visitorFromDb = (r: Db): VisitorRow => ({
  id: r.id as string,
  createdAt: r.created_at as string,
  lastSeenAt: r.last_seen_at as string,
  firstName: (r.first_name as string) ?? null,
  email: (r.email as string) ?? null,
  company: (r.company as string) ?? null,
  trade: (r.trade as string) ?? null,
  unpaidJobsEstimate: (r.unpaid_jobs_estimate as number) ?? null,
  currentProcess: (r.current_process as string) ?? null,
  tools: (r.tools as string[]) ?? null,
  visitorType: ((r.visitor_type as string) ?? "prospect") as VisitorRow["visitorType"],
  memorySummary: (r.memory_summary as string) ?? null,
  lastTopic: (r.last_topic as string) ?? null,
  consentMemory: (r.consent_memory as boolean) ?? true,
});

const visitorToDb = (p: VisitorPatch): Db => {
  const map: Record<string, string> = {
    lastSeenAt: "last_seen_at",
    firstName: "first_name",
    email: "email",
    company: "company",
    trade: "trade",
    unpaidJobsEstimate: "unpaid_jobs_estimate",
    currentProcess: "current_process",
    tools: "tools",
    visitorType: "visitor_type",
    memorySummary: "memory_summary",
    lastTopic: "last_topic",
    consentMemory: "consent_memory",
  };
  const out: Db = {};
  for (const [k, v] of Object.entries(p)) if (map[k] && v !== undefined) out[map[k]] = v;
  return out;
};

const sessionFromDb = (r: Db): SessionRow => ({
  id: r.id as string,
  visitorId: r.visitor_id as string,
  startedAt: r.started_at as string,
  endedAt: (r.ended_at as string) ?? null,
  stage: ((r.stage as string) ?? "GREET") as AssistantStage,
  pagePath: (r.page_path as string) ?? null,
  summary: (r.summary as string) ?? null,
  outcome: (r.outcome as SessionOutcome) ?? null,
  state: { ...emptyState(), ...((r.state as SessionState) ?? {}) },
  useMemory: (r.use_memory as boolean) ?? true,
});

const sessionToDb = (p: SessionPatch): Db => {
  const map: Record<string, string> = {
    endedAt: "ended_at",
    stage: "stage",
    pagePath: "page_path",
    summary: "summary",
    outcome: "outcome",
    state: "state",
    useMemory: "use_memory",
  };
  const out: Db = {};
  for (const [k, v] of Object.entries(p)) if (map[k] && v !== undefined) out[map[k]] = v;
  return out;
};

const bookingFromDb = (r: Db): BookingRow => ({
  id: r.id as string,
  leadId: r.lead_id as string,
  visitorId: (r.visitor_id as string) ?? null,
  providerBookingId: (r.provider_booking_id as string) ?? null,
  startsAt: r.starts_at as string,
  visitorTz: (r.visitor_tz as string) ?? "UTC",
  label: (r.label as string) ?? "",
  rescheduleUrl: (r.reschedule_url as string) ?? null,
  status: ((r.status as string) ?? "booked") as BookingRow["status"],
});

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`assistant store: ${what}: ${res.error.message}`);
  return res.data;
}

class SupabaseStore implements AssistantStore {
  readonly kind = "supabase" as const;
  constructor(private db: SupabaseClient) {}

  async getVisitor(id: string) {
    const r = check(await this.db.from("assistant_visitors").select("*").eq("id", id).maybeSingle(), "getVisitor");
    return r ? visitorFromDb(r as Db) : null;
  }
  async createVisitor() {
    const r = check(await this.db.from("assistant_visitors").insert({}).select("*").single(), "createVisitor");
    return visitorFromDb(r as Db);
  }
  async updateVisitor(id: string, patch: VisitorPatch) {
    const row = visitorToDb(patch);
    if (Object.keys(row).length === 0) return;
    check(await this.db.from("assistant_visitors").update(row).eq("id", id), "updateVisitor");
  }
  async findVisitorByEmail(email: string) {
    const r = check(
      await this.db
        .from("assistant_visitors")
        .select("*")
        .eq("email", email)
        .is("forgotten_at", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      "findVisitorByEmail",
    );
    return r ? visitorFromDb(r as Db) : null;
  }
  async mergeVisitors(intoId: string, fromId: string) {
    if (intoId === fromId) return;
    const [into, from] = await Promise.all([this.getVisitor(intoId), this.getVisitor(fromId)]);
    if (!into || !from) return;
    check(await this.db.from("assistant_sessions").update({ visitor_id: intoId }).eq("visitor_id", fromId), "merge sessions");
    check(await this.db.from("assistant_leads").update({ visitor_id: intoId }).eq("visitor_id", fromId), "merge leads");
    check(await this.db.from("assistant_bookings").update({ visitor_id: intoId }).eq("visitor_id", fromId), "merge bookings");
    const merged = fillEmpty(into, from);
    // Clear the email on the old row first (no unique constraint, but keeps lookups unambiguous).
    check(await this.db.from("assistant_visitors").delete().eq("id", fromId), "merge delete");
    const { id: _id, createdAt: _c, ...patch } = merged;
    await this.updateVisitor(intoId, patch);
  }

  async createSession(input: { visitorId: string; pagePath: string | null; useMemory: boolean }) {
    const r = check(
      await this.db
        .from("assistant_sessions")
        .insert({ visitor_id: input.visitorId, page_path: input.pagePath, use_memory: input.useMemory, state: emptyState() })
        .select("*")
        .single(),
      "createSession",
    );
    return sessionFromDb(r as Db);
  }
  async getSession(id: string) {
    const r = check(await this.db.from("assistant_sessions").select("*").eq("id", id).maybeSingle(), "getSession");
    return r ? sessionFromDb(r as Db) : null;
  }
  async updateSession(id: string, patch: SessionPatch) {
    const row = sessionToDb(patch);
    if (Object.keys(row).length === 0) return;
    check(await this.db.from("assistant_sessions").update(row).eq("id", id), "updateSession");
  }
  async listSessions(visitorId: string, limit: number) {
    const r = check(
      await this.db
        .from("assistant_sessions")
        .select("*")
        .eq("visitor_id", visitorId)
        .order("started_at", { ascending: false })
        .limit(limit),
      "listSessions",
    );
    return ((r ?? []) as Db[]).map(sessionFromDb);
  }
  async countSessionsSince(visitorId: string, sinceIso: string) {
    const res = await this.db
      .from("assistant_sessions")
      .select("id", { count: "exact", head: true })
      .eq("visitor_id", visitorId)
      .gte("started_at", sinceIso);
    if (res.error) throw new Error(`assistant store: countSessionsSince: ${res.error.message}`);
    return res.count ?? 0;
  }

  async listMessages(sessionId: string, limit: number) {
    const r = check(
      await this.db
        .from("assistant_messages")
        .select("ui_id, role, content, parts, created_at, feedback")
        .eq("session_id", sessionId)
        .order("id", { ascending: false })
        .limit(limit),
      "listMessages",
    );
    return ((r ?? []) as Db[])
      .reverse()
      .map((x) => {
        const stored = (x.parts as { parts?: unknown[]; metadata?: unknown } | unknown[] | null) ?? [];
        const parts = Array.isArray(stored) ? stored : (stored.parts ?? []);
        const metadata = Array.isArray(stored) ? undefined : stored.metadata;
        return {
          uiId: x.ui_id as string,
          role: x.role as "user" | "assistant",
          content: (x.content as string) ?? "",
          parts,
          metadata,
          createdAt: x.created_at as string,
          feedback: (x.feedback as 1 | -1 | null) ?? null,
        };
      });
  }
  async saveMessages(sessionId: string, messages: Omit<StoredMessage, "createdAt" | "feedback">[]) {
    if (messages.length === 0) return;
    const rows = messages.map((m) => ({
      session_id: sessionId,
      ui_id: m.uiId,
      role: m.role,
      content: m.content,
      parts: { parts: m.parts, metadata: m.metadata ?? null },
    }));
    check(
      await this.db.from("assistant_messages").upsert(rows, { onConflict: "session_id,ui_id" }),
      "saveMessages",
    );
  }
  async countUserMessages(sessionId: string) {
    const res = await this.db
      .from("assistant_messages")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("role", "user");
    if (res.error) throw new Error(`assistant store: countUserMessages: ${res.error.message}`);
    return res.count ?? 0;
  }
  async setFeedback(visitorId: string, uiId: string, value: 1 | -1) {
    const rows = check(
      await this.db
        .from("assistant_messages")
        .select("id, session_id, assistant_sessions!inner(visitor_id)")
        .eq("ui_id", uiId)
        .eq("role", "assistant")
        .eq("assistant_sessions.visitor_id", visitorId)
        .limit(1),
      "setFeedback lookup",
    ) as Db[] | null;
    const row = rows?.[0];
    if (!row) return false;
    check(await this.db.from("assistant_messages").update({ feedback: value }).eq("id", row.id), "setFeedback");
    return true;
  }

  async createLead(input: LeadInput) {
    const r = check(
      await this.db
        .from("assistant_leads")
        .insert({
          visitor_id: input.visitorId,
          session_id: input.sessionId,
          type: input.type,
          first_name: input.firstName ?? null,
          email: input.email,
          company: input.company ?? null,
          phone: input.phone ?? null,
          note: input.note ?? null,
        })
        .select("id")
        .single(),
      "createLead",
    );
    return (r as Db).id as string;
  }
  async createBooking(input: Omit<BookingRow, "id" | "status">) {
    const r = check(
      await this.db
        .from("assistant_bookings")
        .insert({
          lead_id: input.leadId,
          visitor_id: input.visitorId,
          provider_booking_id: input.providerBookingId,
          starts_at: input.startsAt,
          visitor_tz: input.visitorTz,
          label: input.label,
          reschedule_url: input.rescheduleUrl,
        })
        .select("id")
        .single(),
      "createBooking",
    );
    return (r as Db).id as string;
  }
  async upcomingBooking(visitorId: string) {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const r = check(
      await this.db
        .from("assistant_bookings")
        .select("*")
        .eq("visitor_id", visitorId)
        .eq("status", "booked")
        .gte("starts_at", cutoff)
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      "upcomingBooking",
    );
    return r ? bookingFromDb(r as Db) : null;
  }

  async forgetVisitor(visitorId: string) {
    const bookings = (check(
      await this.db.from("assistant_bookings").select("id, lead_id, status").eq("visitor_id", visitorId),
      "forget bookings",
    ) ?? []) as Db[];
    const hadBooking = bookings.some((b) => b.status === "booked");
    const keepLeadIds = bookings.map((b) => b.lead_id as string).filter(Boolean);
    // Detach bookings (kept so the invite / team calendar stays consistent).
    check(await this.db.from("assistant_bookings").update({ visitor_id: null }).eq("visitor_id", visitorId), "forget detach");
    if (keepLeadIds.length) {
      check(
        await this.db.from("assistant_leads").update({ visitor_id: null, session_id: null }).in("id", keepLeadIds),
        "forget keep leads",
      );
    }
    check(await this.db.from("assistant_leads").delete().eq("visitor_id", visitorId), "forget leads");
    // Sessions + messages cascade from the visitor row.
    check(await this.db.from("assistant_visitors").delete().eq("id", visitorId), "forget visitor");
    return { hadBooking };
  }
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

let cached: AssistantStore | null = null;

export function getStore(): AssistantStore {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    cached = new SupabaseStore(
      createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
    );
  } else {
    console.warn(
      "[assistant] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set: using the in-memory store. " +
        "Chats, leads and bookings are lost on restart and not shared between instances.",
    );
    cached = new MemoryStore();
  }
  return cached;
}
