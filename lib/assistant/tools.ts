// Zod-typed tools (brief §7). Created per request so they close over the session.
import { tool } from "ai";
import { z } from "zod";
import {
  bookingAlertEmail,
  bookingConfirmationEmail,
  emailMeLeadAlert,
  handoffEmail,
  notifySlack,
  sendEmail,
} from "./email";
import { assistantEnv } from "./env";
import { redact } from "./guard";
import { attachEmail, sessionDigest } from "./memory";
import { bookSlot, decodeSlotId, getSlots, longLabel, MAX_SLOTS } from "./scheduling";
import type { AssistantStore, SessionOutcome, SessionRow, SessionState, VisitorRow } from "./store";
import type {
  AssistantStage,
  BookActionMetadata,
  BookDemoOutput,
  GetDemoSlotsOutput,
  OkOutput,
  RequestHumanOutput,
} from "./types";

export type ToolContext = {
  store: AssistantStore;
  session: SessionRow;
  /** Mutable copy of session state; persisted by the route at the end of the turn. */
  state: SessionState;
  visitorId: string;
  visitorTz: string;
  /** All visitor-typed text in this session (redacted), lowercased: used to check emails came from the visitor. */
  visitorText: string;
  bookAction: BookActionMetadata | null;
  setStage: (stage: AssistantStage) => void;
  setOutcome: (outcome: SessionOutcome) => void;
  onClose: (recap: string) => void;
};

const emailSchema = z.email().max(254);
const shortText = (max: number) => z.string().trim().min(1).max(max);

const clean = (s: string | undefined | null, max = 120) => (s ? redact(s).trim().slice(0, max) : undefined);

/** The email must be one the visitor actually typed (or entered in the booking form). */
function visitorSuppliedEmail(ctx: ToolContext, email: string) {
  const e = email.trim().toLowerCase();
  return ctx.visitorText.includes(e) || ctx.bookAction?.email.trim().toLowerCase() === e;
}

async function profileFor(ctx: ToolContext): Promise<VisitorRow | null> {
  return ctx.store.getVisitor(ctx.visitorId);
}

export function createTools(ctx: ToolContext) {
  const bookingUrl = assistantEnv.demoUrl;

  return {
    get_demo_slots: tool({
      description:
        "Get the next available 20-minute demo slots, labeled in the visitor's time zone. Call when the visitor wants to book. Returns at most 6; the UI shows them as buttons. If ok is false, booking in chat is unavailable and the UI shows the booking link.",
      inputSchema: z.object({
        days: z.number().int().min(1).max(14).optional().describe("How many days ahead to look (1-14). Default 7."),
      }),
      execute: async ({ days }): Promise<GetDemoSlotsOutput> => {
        const alreadyShown = new Set((ctx.state.slotsOffered ?? []).map((s) => s.id));
        // "See more times": look further ahead and skip slots already shown.
        const lookahead = alreadyShown.size ? 14 : (days ?? 7);
        const res = await getSlots({ days: lookahead, visitorTz: ctx.visitorTz });
        ctx.setStage("BOOK");
        if (!res.ok) return { ok: false, bookingUrl: res.bookingUrl };
        let slots = res.slots.filter((s) => !alreadyShown.has(s.id));
        if (slots.length === 0) slots = res.slots;
        slots = slots.slice(0, MAX_SLOTS);
        ctx.state.slotsOffered = [...(ctx.state.slotsOffered ?? []), ...slots].slice(-24);
        return { ok: true, slots };
      },
    }),

    book_demo: tool({
      description:
        "Book the demo. Only after the visitor picked a specific slot returned by get_demo_slots in this session AND gave first name, work email and company. Never call without an explicit yes to a specific slot.",
      inputSchema: z.object({
        slotId: shortText(200),
        firstName: shortText(60),
        email: emailSchema,
        company: shortText(120),
        phone: z.string().trim().max(40).optional(),
      }),
      execute: async (input): Promise<BookDemoOutput> => {
        // Gate 1: slot must come from get_demo_slots in this session.
        const slot = ctx.state.slotsOffered?.find((s) => s.id === input.slotId);
        if (!slot) return { ok: false, bookingUrl, reason: "Please pick one of the times shown first." };
        // Gate 2: explicit choice + visitor-supplied email.
        if (!visitorSuppliedEmail(ctx, input.email))
          return { ok: false, bookingUrl, reason: "Please type your work email so I can send the invite." };
        if (ctx.state.booked) return { ok: false, bookingUrl, reason: "You already have a demo booked in this chat." };

        const startsAt = decodeSlotId(slot.id) ?? slot.startsAt;
        const firstName = clean(input.firstName, 60)!;
        const company = clean(input.company, 120)!;
        const phone = clean(input.phone, 40);
        const res = await bookSlot({
          startsAt,
          name: firstName,
          email: input.email,
          company,
          phone,
          visitorTz: ctx.visitorTz,
        });
        if (!res.ok) {
          // Save the lead anyway so the team can follow up.
          await ctx.store
            .createLead({
              visitorId: ctx.visitorId,
              sessionId: ctx.session.id,
              type: "demo",
              firstName,
              email: input.email,
              company,
              phone,
              note: `Booking in chat failed (${res.reason}) for ${slot.label}`,
            })
            .catch((e) => console.error("[assistant] lead save failed", e));
          ctx.setOutcome("lead");
          return {
            ok: false,
            bookingUrl,
            reason: res.reason === "slot_taken" ? "That time was just taken. Please pick another." : "Booking isn't available right now.",
          };
        }

        const label = longLabel(res.startsAt, ctx.visitorTz);
        await attachEmail(ctx.store, ctx.visitorId, input.email);
        await ctx.store.updateVisitor(ctx.visitorId, { firstName, company });
        const leadId = await ctx.store.createLead({
          visitorId: ctx.visitorId,
          sessionId: ctx.session.id,
          type: "demo",
          firstName,
          email: input.email,
          company,
          phone,
        });
        await ctx.store.createBooking({
          leadId,
          visitorId: ctx.visitorId,
          providerBookingId: res.providerBookingId,
          startsAt: res.startsAt,
          visitorTz: ctx.visitorTz,
          label,
          rescheduleUrl: res.rescheduleUrl ?? null,
        });
        ctx.state.booked = true;
        ctx.setStage("WRAP_UP");
        ctx.setOutcome("booked");

        const profile = await profileFor(ctx);
        const digest = await sessionDigest(ctx.store, ctx.session.id);
        await Promise.all([
          sendEmail(
            bookingAlertEmail({
              label,
              startsAt: res.startsAt,
              email: input.email,
              phone,
              summary: digest,
              profile: profile ?? {},
            }),
          ),
          sendEmail(bookingConfirmationEmail({ to: input.email, firstName, label, rescheduleUrl: res.rescheduleUrl })),
          notifySlack(`New demo booked via website chat: ${company} · ${label}`),
        ]);

        return {
          ok: true,
          label,
          email: input.email,
          ...(res.addToCalendarUrl ? { addToCalendarUrl: res.addToCalendarUrl } : {}),
          ...(res.rescheduleUrl ? { rescheduleUrl: res.rescheduleUrl } : {}),
        };
      },
    }),

    save_lead: tool({
      description:
        'Save a lead. Only after the visitor agreed to be emailed (for example "Can I email you the details?" -> yes) and typed their email.',
      inputSchema: z.object({
        type: z.enum(["email_me", "demo", "handoff"]),
        firstName: z.string().trim().max(60).optional(),
        email: emailSchema,
        company: z.string().trim().max(120).optional(),
        note: z.string().trim().max(500).optional(),
      }),
      execute: async (input): Promise<OkOutput> => {
        if (!visitorSuppliedEmail(ctx, input.email)) return { ok: false };
        await attachEmail(ctx.store, ctx.visitorId, input.email);
        await ctx.store.createLead({
          visitorId: ctx.visitorId,
          sessionId: ctx.session.id,
          type: input.type,
          firstName: clean(input.firstName, 60),
          email: input.email,
          company: clean(input.company, 120),
          note: clean(input.note, 500),
        });
        if (input.firstName || input.company)
          await ctx.store.updateVisitor(ctx.visitorId, {
            ...(input.firstName ? { firstName: clean(input.firstName, 60) } : {}),
            ...(input.company ? { company: clean(input.company, 120) } : {}),
          });
        const profile = await profileFor(ctx);
        if (input.type === "email_me")
          await sendEmail(emailMeLeadAlert({ email: input.email, note: clean(input.note, 500), profile: profile ?? {} }));
        if (!ctx.state.booked) ctx.setOutcome("lead");
        return { ok: true };
      },
    }),

    request_human: tool({
      description:
        "Hand the conversation to the PromiseLoop team by email. Use when the visitor asks for a person, asks something the knowledge can't answer twice in a row, wants a custom quote, contract terms or a legal opinion, or is upset. Needs the visitor's email.",
      inputSchema: z.object({
        email: emailSchema,
        question: shortText(1000).describe("The visitor's question or request, in one or two sentences."),
      }),
      execute: async (input): Promise<RequestHumanOutput> => {
        const sla = assistantEnv.handoffSla();
        // Rare: the model guessed an email. Error back to the model so it asks the visitor (UI shows nothing for it).
        if (!visitorSuppliedEmail(ctx, input.email))
          throw new Error("The visitor has not typed this email. Ask them for their email first.");
        await attachEmail(ctx.store, ctx.visitorId, input.email);
        await ctx.store.createLead({
          visitorId: ctx.visitorId,
          sessionId: ctx.session.id,
          type: "handoff",
          email: input.email,
          note: clean(input.question, 1000),
        });
        const profile = await profileFor(ctx);
        await sendEmail(
          handoffEmail({
            visitorEmail: input.email,
            question: clean(input.question, 1000) ?? "",
            summary: await sessionDigest(ctx.store, ctx.session.id),
            profile: profile ?? {},
            sla,
          }),
        );
        ctx.setStage("HANDOFF");
        if (!ctx.state.booked) ctx.setOutcome("handoff");
        return { ok: true, sla };
      },
    }),

    update_profile: tool({
      description:
        "Record facts the visitor stated about their business. Only facts they said. Never their customers' details or any card/bank numbers.",
      inputSchema: z.object({
        trade: z.string().trim().max(40).optional().describe("e.g. hvac, plumbing, electrical, roofing, landscaping, pest control, cleaning"),
        unpaidJobsEstimate: z.number().int().min(0).max(1_000_000).optional(),
        tools: z.array(z.string().trim().max(40)).max(10).optional().describe("Dialer, CRM or other tools they mentioned"),
        firstName: z.string().trim().max(60).optional(),
        company: z.string().trim().max(120).optional(),
        currentProcess: z.string().trim().max(200).optional(),
      }),
      execute: async (input): Promise<OkOutput> => {
        await ctx.store.updateVisitor(ctx.visitorId, {
          ...(input.trade ? { trade: clean(input.trade, 40)!.toLowerCase() } : {}),
          ...(input.unpaidJobsEstimate !== undefined ? { unpaidJobsEstimate: input.unpaidJobsEstimate } : {}),
          ...(input.tools?.length ? { tools: input.tools.map((t) => clean(t, 40)!).filter(Boolean) } : {}),
          ...(input.firstName ? { firstName: clean(input.firstName, 60) } : {}),
          ...(input.company ? { company: clean(input.company, 120) } : {}),
          ...(input.currentProcess ? { currentProcess: clean(input.currentProcess, 200) } : {}),
        });
        return { ok: true };
      },
    }),

    close_conversation: tool({
      description: "Call once at the very end, after the visitor says they're done and you closed with the tagline.",
      inputSchema: z.object({ recap: shortText(400) }),
      execute: async ({ recap }): Promise<OkOutput> => {
        ctx.state.closed = true;
        ctx.setStage("CLOSED");
        ctx.onClose(clean(recap, 400) ?? "");
        return { ok: true };
      },
    }),
  };
}

export type AssistantToolSet = ReturnType<typeof createTools>;
