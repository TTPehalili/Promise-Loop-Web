import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  isStepCount,
  smoothStream,
  streamText,
  toUIMessageStream,
  type ModelMessage,
} from "ai";
import { after } from "next/server";
import { z } from "zod";
import { assistantEnv } from "@/lib/assistant/env";
import {
  cannedReply,
  clientIp,
  describeViolations,
  drainBucket,
  FORGET_RE,
  ipLimit,
  isEvalRequest,
  LIMITS,
  looksAbusive,
  outputGuard,
  redact,
  redactDeep,
  type Violation,
} from "@/lib/assistant/guard";
import { clearVisitorCookieHeader, errorResponse, isUuid, readVisitorId } from "@/lib/assistant/http";
import { anthropicModel, rewriteMemorySummary, textOf, toUIMessages } from "@/lib/assistant/memory";
import { retrieveContext } from "@/lib/assistant/retrieve";
import { safeTimeZone } from "@/lib/assistant/scheduling";
import { advanceOnUserMessage, canOfferDemo, chipsFor, detectTopic } from "@/lib/assistant/stage";
import { getStore, type SessionOutcome } from "@/lib/assistant/store";
import { buildInstructions, dynamicContext } from "@/lib/assistant/system-prompt";
import { createTools } from "@/lib/assistant/tools";
import type { AssistantStage, AssistantUIMessage, BookActionMetadata } from "@/lib/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HISTORY_LIMIT = 20;
const MAX_INPUT_CHARS = 2000;

const bookMetaSchema = z.object({
  action: z.literal("book"),
  slotId: z.string().min(1).max(200),
  slotLabel: z.string().min(1).max(120),
  firstName: z.string().trim().min(1).max(60),
  email: z.email().max(254),
  company: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
});

const bodySchema = z.object({
  sessionId: z.string(),
  message: z.object({
    id: z.string().min(1).max(100),
    role: z.literal("user"),
    parts: z.array(z.object({ type: z.string() }).passthrough()).max(20),
    metadata: z.unknown().optional(),
  }),
  visitorTz: z.string().max(64).optional().default("America/Chicago"),
  pagePath: z.string().max(300).optional().default("/"),
});

const messageId = createIdGenerator({ prefix: "msg", size: 16 });

export async function POST(req: Request) {
  // 1. Parse + validate
  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    const r = bodySchema.safeParse(json);
    if (!r.success || !isUuid(r.data.sessionId)) return errorResponse("bad_request");
    parsed = r.data;
  } catch {
    return errorResponse("bad_request");
  }

  // 2. Model available?
  if (!assistantEnv.anthropicKey()) return errorResponse("unavailable");

  // 3. Rate limit (per IP; in-memory, per instance)
  const ip = clientIp(req);
  const isEval = isEvalRequest(req);
  if (!isEval && !ipLimit(ip)) return errorResponse("rate_limited");

  // 4. Visitor + session
  const visitorId = readVisitorId(req);
  if (!visitorId) return errorResponse("bad_request");
  const store = getStore();
  const session = await store.getSession(parsed.sessionId);
  if (!session || session.visitorId !== visitorId) return errorResponse("bad_request");

  // 5. Session cap (40 visitor messages)
  if ((await store.countUserMessages(session.id)) >= LIMITS.messagesPerSession) return errorResponse("session_cap");

  const meta = parsed.message.metadata as { action?: string } | undefined;
  const bookParse = meta?.action === "book" ? bookMetaSchema.safeParse(meta) : null;
  if (bookParse && !bookParse.success) return errorResponse("bad_request");
  const bookAction: BookActionMetadata | null = bookParse?.success ? bookParse.data : null;

  // 6. Visitor text (redacted before storage AND before the model sees it, §6.3)
  const userMessage = redactDeep({
    id: parsed.message.id,
    role: "user" as const,
    parts: parsed.message.parts
      .filter((p) => p.type === "text" && typeof (p as { text?: unknown }).text === "string")
      .map((p) => ({ type: "text" as const, text: String((p as { text?: unknown }).text).slice(0, MAX_INPUT_CHARS) })),
    ...(parsed.message.metadata ? { metadata: parsed.message.metadata as AssistantUIMessage["metadata"] } : {}),
  }) as AssistantUIMessage;
  // Never store or echo form PII in metadata beyond what the visitor typed: keep it, it's their own contact info.
  const userText = textOf(userMessage);
  if (!userText && !bookAction) return errorResponse("bad_request");

  await store.saveMessages(session.id, [
    { uiId: userMessage.id, role: "user", content: userText, parts: userMessage.parts, metadata: userMessage.metadata },
  ]);

  // 7. Abuse: one neutral line, then rate limit
  const state = { ...session.state };
  if (looksAbusive(userText)) {
    const strikes = ((state as { abuse?: number }).abuse ?? 0) + 1;
    (state as { abuse?: number }).abuse = strikes;
    if (strikes >= 2) drainBucket(`ip:${ip}`);
  }
  const abuseHint = looksAbusive(userText) ? "Abuse or spam: reply with one neutral line only." : undefined;

  // 8. "Forget me" typed in chat
  if (FORGET_RE.test(userText)) return forgetInChat(visitorId, userMessage);

  // 9. Stage heuristic (before the model)
  const visitor = await store.getVisitor(visitorId);
  const pre = advanceOnUserMessage({ stage: session.stage, state, text: userText, visitor, isBookAction: Boolean(bookAction) });
  let stage: AssistantStage = pre.stage;
  let outcome: SessionOutcome | null = session.outcome;
  let closeRecap: string | null = null;
  if (pre.classification !== "prospect" && stage === "NOT_A_PROSPECT") {
    outcome = outcome ?? "redirected";
    if (visitor && visitor.visitorType !== "not_prospect" && !visitor.email)
      await store.updateVisitor(visitorId, { visitorType: "not_prospect" });
  }
  const topic = detectTopic(userText);
  if (topic) await store.updateVisitor(visitorId, { lastTopic: topic, lastSeenAt: new Date().toISOString() });

  // 10. History (server holds it) + memory
  const stored = await store.listMessages(session.id, 80);
  const history = toUIMessages(stored.slice(-HISTORY_LIMIT));
  const visitorText = stored
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n")
    .toLowerCase();
  const booking = await store.upcomingBooking(visitorId);
  const memorySummary = session.useMemory && visitor?.consentMemory ? visitor.memorySummary : null;

  const retrieved = await retrieveContext(userText || "book a demo");
  const tz = safeTimeZone(parsed.visitorTz);
  const dynamicText = dynamicContext({
    stage,
    visitorTz: tz,
    pagePath: parsed.pagePath,
    visitor: session.useMemory ? visitor : visitor && { ...visitor, memorySummary: null },
    memorySummary,
    canOfferDemo: canOfferDemo(state),
    turn: state.turn,
    slotsOffered: state.slotsOffered,
    booked: booking ? { label: booking.label } : null,
    bookAction,
    stageHint: abuseHint ?? pre.hint,
    retrievedKnowledge: retrieved.dynamicKnowledge,
  });
  const instructions = buildInstructions(retrieved.staticKnowledge, dynamicText);

  const modelId =
    state.turn > assistantEnv.hardAfterTurns && assistantEnv.modelHard() ? assistantEnv.modelHard()! : assistantEnv.model();
  const model = anthropicModel(modelId)!;

  const tools = createTools({
    store,
    session,
    state,
    visitorId,
    visitorTz: tz,
    visitorText,
    bookAction,
    setStage: (s) => {
      stage = s;
    },
    setOutcome: (o) => {
      outcome = o;
    },
    onClose: (recap) => {
      closeRecap = recap;
      outcome = outcome ?? "closed";
    },
  });

  let modelMessages: ModelMessage[];
  try {
    modelMessages = await convertToModelMessages(history, { tools, ignoreIncompleteToolCalls: true });
  } catch (err) {
    console.error("[assistant] history conversion failed; using text only", err);
    modelMessages = await convertToModelMessages(
      history.map((m) => ({ ...m, parts: m.parts.filter((p) => p.type === "text") })),
    );
  }

  const bookingSlotValid = Boolean(bookAction && state.slotsOffered?.some((s) => s.id === bookAction.slotId));

  // Regeneration used by the output filter (one non-streamed retry, no tools).
  const rewrite = async (draft: string, violations: Violation[]) => {
    const res = await generateText({
      model,
      maxOutputTokens: 400,
      instructions: buildInstructions(
        retrieved.staticKnowledge,
        dynamicText,
        `CORRECTION: your draft reply below broke a rule because ${describeViolations(violations)}. ` +
          `Write a corrected reply to the visitor's last message that follows every rule. Keep what was right. ` +
          `Do not mention the correction. Output only the reply text.\nDRAFT:\n${draft}`,
      ),
      messages: modelMessages,
    });
    return res.text.trim();
  };

  const result = streamText({
    model,
    instructions,
    messages: modelMessages,
    tools,
    stopWhen: isStepCount(5),
    maxOutputTokens: 700,
    temperature: 0.3,
    prepareStep: ({ stepNumber }) =>
      stepNumber === 0 && bookingSlotValid
        ? { toolChoice: { type: "tool", toolName: "book_demo" } }
        : undefined,
    experimental_transform: [
      outputGuard({
        rewrite,
        canned: (v) => cannedReply(v, { contactEmail: assistantEnv.contactEmail }),
        onViolation: ({ violations, resolved }) =>
          console.warn(`[assistant] output filter: ${violations.map((v) => v.kind).join(",")} -> ${resolved}`),
      }),
      smoothStream({ delayInMs: 12, chunking: "word" }),
    ],
    onError: ({ error }) => console.error("[assistant] stream error", error),
  });

  // Keep generating (and persisting) even if the visitor closes the tab.
  result.consumeStream();

  const persist = async (responseMessage: AssistantUIMessage) => {
    try {
      const text = textOf(responseMessage);
      const parts = redactDeep(responseMessage.parts);
      await store.saveMessages(session.id, [
        { uiId: responseMessage.id, role: "assistant", content: redact(text), parts, metadata: responseMessage.metadata },
      ]);
      if (/i don'?t want to guess/i.test(text)) state.unknownStreak += 1;
      else state.unknownStreak = 0;
      await store.updateSession(session.id, {
        stage,
        state,
        outcome,
        pagePath: parsed.pagePath,
        ...(closeRecap ? { summary: closeRecap, endedAt: new Date().toISOString() } : {}),
      });
      if (closeRecap || stage === "CLOSED") after(() => rewriteMemorySummary(store, session.id));
    } catch (err) {
      console.error("[assistant] persist failed", err);
    }
  };

  return createUIMessageStreamResponse({
    headers: { "Cache-Control": "no-store" },
    stream: toUIMessageStream<typeof tools, AssistantUIMessage>({
      stream: result.stream,
      tools,
      originalMessages: history,
      generateMessageId: messageId,
      sendReasoning: false,
      messageMetadata: ({ part }) => {
        if (part.type !== "finish") return undefined;
        const chips = chipsFor(stage, state).slice(0, 4);
        return { ...(chips.length ? { chips } : {}), ...(isEval ? { stage } : {}) };
      },
      onError: (error) => {
        console.error("[assistant] ui stream error", error);
        return "Something went wrong on my side.";
      },
      onEnd: async ({ responseMessage }) => {
        await persist(responseMessage);
      },
    }),
  });
}

/** "forget me / delete my data" typed in the chat: delete now, reply, clear the cookie. */
async function forgetInChat(visitorId: string, userMessage: AssistantUIMessage) {
  const store = getStore();
  const { hadBooking } = await store.forgetVisitor(visitorId);
  const text = hadBooking
    ? "Done. I've deleted your chat history and profile. Your demo booking stays on the calendar; to cancel it, use the link in your invite."
    : "Done. I've deleted your chat history and profile. You can start a new chat any time.";
  const stream = createUIMessageStream<AssistantUIMessage>({
    originalMessages: [userMessage],
    generateId: messageId,
    execute: ({ writer }) => {
      const id = "t0";
      writer.write({ type: "start", messageId: messageId() });
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
      writer.write({ type: "finish", messageMetadata: {} });
    },
  });
  return createUIMessageStreamResponse({
    stream,
    headers: { "Cache-Control": "no-store", "Set-Cookie": clearVisitorCookieHeader() },
  });
}
