// Shared types for the PromiseLoop Assistant (server + UI).
// Safe to import from client components: types and plain constants only, no secrets.
import type { UIMessage } from "ai";

/* ------------------------------------------------------------------ */
/* Conversation stage (brief §3.1)                                     */
/* ------------------------------------------------------------------ */

export type AssistantStage =
  | "GREET"
  | "DISCOVER"
  | "ANSWER"
  | "PIVOT"
  | "BOOK"
  | "WRAP_UP"
  | "CLOSED"
  | "HANDOFF"
  | "NOT_A_PROSPECT";

/* ------------------------------------------------------------------ */
/* Message metadata                                                    */
/* ------------------------------------------------------------------ */

/** Sent by the UI on the visitor's message after the inline mini-form "Book it". */
export type BookActionMetadata = {
  action: "book";
  slotId: string;
  slotLabel: string;
  firstName: string;
  email: string;
  company: string;
  phone?: string;
};

/** Sent by the UI when the visitor tapped a quick-reply chip. */
export type ChipActionMetadata = { action: "chip" };

/** Attached by the server to assistant messages. */
export type AssistantReplyMetadata = {
  action?: undefined;
  /** Optional quick-reply chips (max 4). The UI shows them under the latest assistant message. */
  chips?: string[];
  /** Eval runs only (x-assistant-eval header); the UI ignores it. */
  stage?: AssistantStage;
};

export type AssistantMetadata = BookActionMetadata | ChipActionMetadata | AssistantReplyMetadata;

/* ------------------------------------------------------------------ */
/* Tools (rendered by the UI as typed parts `tool-<name>`)             */
/* ------------------------------------------------------------------ */

export type DemoSlot = {
  /** Opaque id; pass back unchanged in BookActionMetadata.slotId. */
  id: string;
  /** ISO 8601 UTC. */
  startsAt: string;
  /** e.g. "Thu 13 · 10:00 AM CT", in the visitor's time zone. */
  label: string;
};

export type GetDemoSlotsInput = { days?: number };
export type GetDemoSlotsOutput =
  | { ok: true; slots: DemoSlot[] /* max 6 */ }
  | { ok: false; bookingUrl: string };

export type BookDemoInput = {
  slotId: string;
  firstName: string;
  email: string;
  company: string;
  phone?: string;
};
export type BookDemoOutput =
  | { ok: true; label: string; email: string; addToCalendarUrl?: string; rescheduleUrl?: string }
  | { ok: false; bookingUrl: string; reason: string };

export type SaveLeadInput = {
  type: "email_me" | "demo" | "handoff";
  firstName?: string;
  email: string;
  company?: string;
  note?: string;
};
export type RequestHumanInput = { email: string; question: string };
export type RequestHumanOutput = { ok: true; sla: string };
export type UpdateProfileInput = {
  trade?: string;
  unpaidJobsEstimate?: number;
  tools?: string[];
  firstName?: string;
  company?: string;
  currentProcess?: string;
};
export type CloseConversationInput = { recap: string };
export type OkOutput = { ok: boolean };

export type AssistantTools = {
  get_demo_slots: { input: GetDemoSlotsInput; output: GetDemoSlotsOutput };
  book_demo: { input: BookDemoInput; output: BookDemoOutput };
  save_lead: { input: SaveLeadInput; output: OkOutput };
  request_human: { input: RequestHumanInput; output: RequestHumanOutput };
  update_profile: { input: UpdateProfileInput; output: OkOutput };
  close_conversation: { input: CloseConversationInput; output: OkOutput };
};

export type AssistantToolName = keyof AssistantTools;

/** Tools the UI should not render. */
export const HIDDEN_TOOLS: readonly AssistantToolName[] = [
  "save_lead",
  "update_profile",
  "close_conversation",
];

/** ai v7: UIMessage<METADATA, DATA_PARTS, TOOLS>. No custom data parts. */
export type AssistantUIMessage = UIMessage<AssistantMetadata, never, AssistantTools>;

/* ------------------------------------------------------------------ */
/* HTTP contract                                                       */
/* ------------------------------------------------------------------ */

export type GreetingVariant = "first" | "returning" | "booked";

/** GET /api/assistant/session?fresh=0|1 */
export type SessionResponse = {
  sessionId: string;
  greeting: { text: string; variant: GreetingVariant };
  chips: string[];
  messages: AssistantUIMessage[];
  booking?: { label: string; startsAt: string };
};

/** POST /api/assistant/chat (body built by the UI's custom transport; last message only). */
export type ChatRequestBody = {
  sessionId: string;
  message: AssistantUIMessage;
  visitorTz: string;
  pagePath: string;
};

/** POST /api/assistant/forget */
export type ForgetResponse = { ok: true; hadBooking: boolean };

/** POST /api/assistant/feedback */
export type FeedbackRequestBody = { messageId: string; value: 1 | -1 };
export type FeedbackResponse = { ok: true };

/** Error bodies (status in comment). */
export type AssistantErrorCode =
  | "rate_limited" // 429
  | "session_cap" // 403
  | "unavailable" // 503
  | "bad_request"; // 400
export type AssistantErrorBody = { error: AssistantErrorCode };

/* ------------------------------------------------------------------ */
/* Fixed copy shared by server + UI                                    */
/* ------------------------------------------------------------------ */

export const FIRST_GREETING =
  "Hi, I'm the PromiseLoop Assistant (an AI). I can answer questions about how our calling team works, pricing, compliance, or getting started.\nWhat kind of service business do you run?";

export const FIRST_CHIPS = [
  "How does it work?",
  "What does it cost?",
  "Is this a collection agency?",
  "Book a demo",
] as const;

export const RETURNING_CHIPS = ["Pick up where we left off", "Start fresh"] as const;
