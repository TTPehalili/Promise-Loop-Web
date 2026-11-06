"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type Ref,
} from "react";
import { ArrowUp, Mail, ThumbsDown, ThumbsUp } from "lucide-react";
import { contactEmail, demoUrl } from "@/lib/links";
import { BookedCard } from "./BookedCard";
import type {
  AssistantErrorCode,
  AssistantMetadata,
  AssistantUIMessage,
  ChatRequestBody,
  DemoSlot,
  SessionResponse,
} from "@/lib/assistant/types";
import { RETURNING_CHIPS } from "@/lib/assistant/types";
import { LeadMiniForm, type LeadDetails } from "./LeadMiniForm";
import { Markdownish } from "./Markdownish";
import { BookingLinkButton, SlotChips } from "./SlotChips";
import { SkeletonBubble, TypingDots } from "./TypingDots";
import {
  assistantBubble,
  chipClass,
  focusRing,
  isExternalHref,
  primaryButton,
  secondaryButton,
  visitorBubble,
} from "./ui";
import { sendFeedback } from "./useAssistantSession";

export type ConversationHandle = {
  focusInput: () => void;
  /** Sends (or queues) a visitor message. */
  send: (text: string, metadata?: AssistantMetadata) => void;
};

type Queued = { text: string; metadata?: AssistantMetadata };
type ErrorKind = AssistantErrorCode | "network" | "other";

function classifyError(err: Error | undefined): ErrorKind | null {
  if (!err) return null;
  const e = err as Error & { statusCode?: number; responseBody?: string };
  let code: string | undefined;
  try {
    code = (JSON.parse(e.responseBody ?? e.message) as { error?: string })?.error;
  } catch {
    /* not JSON */
  }
  if (e.statusCode === 429 || code === "rate_limited") return "rate_limited";
  if (e.statusCode === 403 || code === "session_cap") return "session_cap";
  if (e.statusCode === 503 || code === "unavailable") return "unavailable";
  if (e.statusCode === 400) return "bad_request";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "network";
  if (err instanceof TypeError) return "network";
  return "other";
}

function textOf(m: AssistantUIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

function chipsOf(m: AssistantUIMessage): string[] {
  const meta = m.metadata;
  return meta && !meta.action && Array.isArray(meta.chips) ? meta.chips : [];
}

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function ExternalAwareLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return (
    <a href={href} className={className} {...(isExternalHref(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

const inlineLink = "rounded-sm font-medium text-mint-ink underline underline-offset-2 hover:text-brand";
const mailto = `mailto:${contactEmail}`;

/* ------------------------------------------------------------------ */

function Feedback({ messageId }: { messageId: string }) {
  const [value, setValue] = useState<1 | -1 | null>(null);
  const vote = (v: 1 | -1) => {
    if (value === v) return;
    setValue(v);
    sendFeedback(messageId, v);
  };
  const btn = `inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-paper-deep hover:text-brand aria-pressed:text-brand ${focusRing}`;
  return (
    <div
      className={`-ml-2 flex items-center transition-opacity duration-150 ${
        value === null
          ? "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
          : "opacity-100"
      }`}
    >
      <button type="button" className={btn} aria-label="Helpful" aria-pressed={value === 1} onClick={() => vote(1)}>
        <ThumbsUp size={16} strokeWidth={1.5} aria-hidden fill={value === 1 ? "currentColor" : "none"} />
      </button>
      <button type="button" className={btn} aria-label="Not helpful" aria-pressed={value === -1} onClick={() => vote(-1)}>
        <ThumbsDown size={16} strokeWidth={1.5} aria-hidden fill={value === -1 ? "currentColor" : "none"} />
      </button>
      {value !== null && <span className="text-[13px] text-ink-muted">Thanks for the feedback.</span>}
    </div>
  );
}

function ToolNote({ children }: { children: React.ReactNode }) {
  return <p className="px-1 text-[13px] italic leading-snug text-ink-muted">{children}</p>;
}

type MessageViewProps = {
  message: AssistantUIMessage;
  isLatestAssistant: boolean;
  isStreaming: boolean;
  busy: boolean;
  animate: boolean;
  picked: { toolCallId: string; slot: DemoSlot } | null;
  onPick: (toolCallId: string, slot: DemoSlot) => void;
  onBook: (slot: DemoSlot, details: LeadDetails) => void;
};

function MessageView({ message, isLatestAssistant, isStreaming, busy, animate, picked, onPick, onBook }: MessageViewProps) {
  if (message.role === "user") {
    const text = textOf(message);
    if (!text) return null;
    return (
      <div className="flex justify-end">
        <div className={`max-w-[85%] ${visitorBubble}`}>
          <span className="sr-only">You said: </span>
          {text}
        </div>
      </div>
    );
  }
  if (message.role !== "assistant") return null;

  const bookedHere = message.parts.some(
    (p) => p.type === "tool-book_demo" && p.state === "output-available" && p.output.ok,
  );
  const blocks = message.parts.map((part, i) => {
    const key = `${message.id}-${i}`;
    switch (part.type) {
      case "text":
        if (!part.text.trim()) return null;
        return (
          <div key={key} className={`max-w-[92%] ${assistantBubble}`}>
            <Markdownish text={part.text} />
          </div>
        );
      case "tool-get_demo_slots": {
        if (part.state === "input-streaming" || part.state === "input-available")
          return <ToolNote key={key}>Checking times…</ToolNote>;
        if (part.state === "output-error")
          return <SlotChips key={key} output={{ ok: false, bookingUrl: demoUrl }} interactive={false} onPick={() => {}} />;
        if (part.state !== "output-available") return null;
        const interactive = isLatestAssistant && !busy && !bookedHere;
        const mine = picked?.toolCallId === part.toolCallId ? picked : null;
        return (
          <div key={key} className="flex w-full flex-col gap-3">
            <SlotChips
              output={part.output}
              interactive={interactive}
              selectedId={mine?.slot.id}
              onPick={(slot) => onPick(part.toolCallId, slot)}
            />
            {mine && interactive && (
              <LeadMiniForm key={mine.slot.id} slot={mine.slot} onSubmit={(d) => onBook(mine.slot, d)} />
            )}
          </div>
        );
      }
      case "tool-book_demo":
        if (part.state === "input-streaming" || part.state === "input-available")
          return <ToolNote key={key}>Booking your demo…</ToolNote>;
        if (part.state === "output-error")
          return (
            <BookedCard
              key={key}
              animate={false}
              output={{ ok: false, bookingUrl: demoUrl, reason: "The booking system didn't respond." }}
            />
          );
        if (part.state !== "output-available") return null;
        return <BookedCard key={key} output={part.output} animate={animate} />;
      case "tool-request_human":
        if (part.state === "input-streaming" || part.state === "input-available")
          return <ToolNote key={key}>Sending to the team…</ToolNote>;
        if (part.state === "output-error")
          return (
            <ToolNote key={key}>
              I couldn&apos;t reach the team from here. Email{" "}
              <a href={mailto} className={inlineLink}>
                {contactEmail}
              </a>
              .
            </ToolNote>
          );
        if (part.state !== "output-available" || !part.output?.ok) return null;
        return (
          <p key={key} className="flex items-center gap-2 px-1 text-[13px] leading-snug text-ink-muted">
            <Mail size={16} strokeWidth={1.5} aria-hidden className="shrink-0 text-mint-ink" />
            Sent to the team. Expect a reply within {part.output.sla}.
          </p>
        );
      // save_lead, update_profile, close_conversation, step-start, reasoning, etc. stay hidden.
      default:
        return null;
    }
  });

  if (blocks.every((b) => b === null)) return null;
  const hasText = message.parts.some((p) => p.type === "text" && p.text.trim());

  return (
    <div className="group flex flex-col items-start gap-2">
      <span className="sr-only">PromiseLoop Assistant said:</span>
      {blocks}
      {hasText && !isStreaming && <Feedback messageId={message.id} />}
    </div>
  );
}

function StateBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-4 text-[15px] leading-[1.5] text-brand">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Conversation({
  session,
  handleRef,
  onStartFresh,
}: {
  session: SessionResponse;
  handleRef: Ref<ConversationHandle>;
  onStartFresh: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const online = useOnline();

  const { sessionId } = session;
  const initialCount = session.messages.length;
  const isReturning = session.greeting.variant !== "first";

  const transport = useMemo(
    () =>
      new DefaultChatTransport<AssistantUIMessage>({
        api: "/api/assistant/chat",
        credentials: "same-origin",
        // The server holds the history: send only the newest message.
        prepareSendMessagesRequest: ({ messages }) => {
          const body: ChatRequestBody = {
            sessionId,
            message: messages[messages.length - 1],
            visitorTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            pagePath: window.location.pathname,
          };
          return { body };
        },
      }),
    [sessionId],
  );

  const { messages, sendMessage, setMessages, status, error, clearError } = useChat<AssistantUIMessage>({
    id: sessionId,
    messages: session.messages,
    transport,
  });

  const [input, setInput] = useState("");
  const [queue, setQueue] = useState<Queued[]>([]);
  const [blocked, setBlocked] = useState<"session_cap" | "unavailable" | null>(null);
  const [historyVisible, setHistoryVisible] = useState(!isReturning);
  const [resumeChoice, setResumeChoice] = useState<"pending" | "done">(isReturning ? "pending" : "done");
  const [picked, setPicked] = useState<{ toolCallId: string; slot: DemoSlot } | null>(null);
  const [flushTick, setFlushTick] = useState(0);
  const flushing = useRef(false);

  const busy = status === "submitted" || status === "streaming";
  const errorKind = status === "error" ? classifyError(error) : null;

  const send = useCallback((text: string, metadata?: AssistantMetadata) => {
    const t = text.trim();
    if (!t) return;
    setPicked(null);
    setResumeChoice("done");
    setHistoryVisible(true); // sending a message picks up where they left off
    stickToBottom.current = true;
    setQueue((q) => [...q, metadata ? { text: t, metadata } : { text: t }]);
  }, []);

  useImperativeHandle(handleRef, () => ({ focusInput: () => inputRef.current?.focus(), send }), [send]);

  // Single send path: everything goes through the queue, flushed one at a time
  // when online, idle and not blocked (brief §8.4 offline: "I'll send this when you're back").
  useEffect(() => {
    if (flushing.current || !online || busy || blocked || queue.length === 0) return;
    if (status === "error") clearError();
    flushing.current = true;
    const [next, ...rest] = queue;
    setQueue(rest);
    sendMessage(next.metadata ? { text: next.text, metadata: next.metadata } : { text: next.text }).finally(() => {
      flushing.current = false;
      setFlushTick((n) => n + 1);
    });
  }, [online, busy, blocked, queue, status, sendMessage, clearError, flushTick]);

  // Map request errors to sticky states, and re-queue messages that failed because the network dropped.
  useEffect(() => {
    if (errorKind === "session_cap" || errorKind === "unavailable") setBlocked(errorKind);
    if (errorKind === "network") {
      const idx = messages.findLastIndex((m) => m.role === "user");
      if (idx < 0) return;
      const m = messages[idx];
      setMessages(messages.slice(0, idx));
      setQueue((q) => [{ text: textOf(m), metadata: m.metadata }, ...q]);
      clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorKind]);

  const retry = useCallback(() => {
    const idx = messages.findLastIndex((m) => m.role === "user");
    if (idx < 0) return clearError();
    const m = messages[idx];
    setMessages(messages.slice(0, idx));
    clearError();
    setQueue((q) => [{ text: textOf(m), metadata: m.metadata }, ...q]);
  }, [messages, setMessages, clearError]);

  // Keep the newest message in view unless the visitor scrolled up to read.
  useEffect(() => {
    const el = logRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, status, queue.length, picked, historyVisible, blocked]);

  /* ---------- derived view ---------- */
  const history = messages.slice(0, initialCount);
  const fresh = messages.slice(initialCount);
  const last = messages[messages.length - 1];
  const lastAssistantId = last?.role === "assistant" ? last.id : null;

  let chips: string[] = [];
  if (!busy && !blocked && status !== "error" && queue.length === 0) {
    if (fresh.length === 0) chips = session.chips;
    else if (last?.role === "assistant") chips = chipsOf(last);
  }
  // The resume choice renders as its own buttons (brief §3.3), so drop those labels from the chip row.
  const resumePending = isReturning && resumeChoice === "pending" && fresh.length === 0;
  chips = chips.filter((c) => c && !(resumePending && (RETURNING_CHIPS as readonly string[]).includes(c))).slice(0, 4);

  const pickUp = () => {
    setHistoryVisible(true);
    setResumeChoice("done");
    inputRef.current?.focus();
  };
  const onChip = (chip: string) => {
    if (chip === "Start fresh") return onStartFresh();
    if (chip === "Pick up where we left off") return pickUp();
    send(chip, { action: "chip" });
  };

  const onBook = (slot: DemoSlot, d: LeadDetails) =>
    send(`Book ${slot.label}`, { action: "book", slotId: slot.id, slotLabel: slot.label, ...d });

  const renderMessage = (m: AssistantUIMessage, idx: number) => (
    <MessageView
      key={m.id}
      message={m}
      isLatestAssistant={m.id === lastAssistantId}
      isStreaming={status === "streaming" && m.id === last?.id}
      busy={busy}
      animate={idx >= initialCount}
      picked={picked}
      onPick={(toolCallId, slot) => setPicked({ toolCallId, slot })}
      onBook={onBook}
    />
  );

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!input.trim() || blocked || busy) return;
    send(input);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "";
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  // Typing dots only until the stream starts (brief §8.2).
  const showTyping = status === "submitted";

  return (
    <>
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={status === "streaming"}
        aria-label="Conversation"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {historyVisible && history.map(renderMessage)}

        {/* Greeting: from the session response, not generated (brief §3.2/§3.3). */}
        <div className="flex flex-col items-start gap-2">
          <span className="sr-only">PromiseLoop Assistant said:</span>
          <div className={`max-w-[92%] ${assistantBubble}`}>
            <Markdownish text={session.greeting.text} />
          </div>
        </div>

        {resumePending && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButton} onClick={pickUp}>
              Pick up where we left off
            </button>
            <button type="button" className={secondaryButton} onClick={onStartFresh}>
              Start fresh
            </button>
          </div>
        )}

        {fresh.map((m, i) => renderMessage(m, initialCount + i))}

        {queue.map((q, i) => (
          <div key={`q-${i}`} className="flex justify-end">
            <div className={`max-w-[85%] opacity-70 ${visitorBubble}`}>{q.text}</div>
          </div>
        ))}

        {!online && queue.length > 0 && (
          <p className="self-end text-[13px] text-ink-muted">You&apos;re offline. I&apos;ll send this when you&apos;re back.</p>
        )}

        {showTyping && <TypingDots />}

        {chips.length > 0 && (
          <div role="group" aria-label="Suggested replies" className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button key={chip} type="button" className={chipClass} onClick={() => onChip(chip)}>
                {chip}
              </button>
            ))}
          </div>
        )}

        {blocked === "unavailable" && (
          <StateBlock>
            <p>
              The assistant is offline right now. Email{" "}
              <a href={mailto} className={inlineLink}>
                {contactEmail}
              </a>{" "}
              or book a demo.
            </p>
            <BookingLinkButton label="Book a demo" />
          </StateBlock>
        )}

        {blocked === "session_cap" && (
          <StateBlock>
            <p>We&apos;ve covered a lot in this chat. The team can take it from here, or we can go through it on a demo.</p>
            <div className="flex flex-wrap gap-2">
              <ExternalAwareLink href={mailto} className={secondaryButton}>
                <Mail size={18} strokeWidth={1.5} aria-hidden />
                Email the team
              </ExternalAwareLink>
              <ExternalAwareLink href={demoUrl} className={primaryButton}>
                Book a demo
              </ExternalAwareLink>
            </div>
          </StateBlock>
        )}

        {(errorKind === "rate_limited" || errorKind === "other" || errorKind === "bad_request") && (
          <StateBlock>
            {errorKind === "rate_limited" ? (
              <p>Let&apos;s pause for a minute. Then try again.</p>
            ) : (
              <p>
                Something went wrong on my side. Try again, or email{" "}
                <a href={mailto} className={inlineLink}>
                  {contactEmail}
                </a>
                .
              </p>
            )}
            <button type="button" className={secondaryButton} onClick={retry}>
              Try again
            </button>
          </StateBlock>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-paper px-4 pb-3 pt-3">
        <form onSubmit={submit} className="flex items-end gap-2">
          <label htmlFor={inputId} className="sr-only">
            Message the PromiseLoop Assistant
          </label>
          <textarea
            ref={inputRef}
            id={inputId}
            rows={1}
            value={input}
            maxLength={2000}
            disabled={!!blocked}
            placeholder={blocked ? "Chat paused" : "Ask about pricing, compliance, getting started…"}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = "";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={onKeyDown}
            className={`block min-h-[44px] w-full flex-1 resize-none rounded-lg border border-ink-muted/70 bg-surface px-3 py-[10px] text-[15px] leading-[1.5] text-ink placeholder:text-ink-muted disabled:cursor-not-allowed disabled:bg-paper-deep ${focusRing}`}
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!input.trim() || !!blocked || busy}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand text-paper transition-colors duration-150 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
          >
            <ArrowUp size={20} strokeWidth={1.75} aria-hidden />
          </button>
        </form>
        <p className="mt-2 text-[12px] leading-[1.45] text-ink-muted">
          AI assistant. This chat is saved so we can pick up where you left off.{" "}
          <a href="/privacy#your-rights" className={inlineLink}>
            Privacy
          </a>
          <span aria-hidden> · </span>
          <button type="button" onClick={onStartFresh} className={inlineLink}>
            Start fresh
          </button>
        </p>
      </div>
    </>
  );
}

/** Loading body: skeleton bubble + inert composer (brief §8.4). */
export function ConversationSkeleton() {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4" aria-busy="true" aria-label="Loading the conversation">
        <SkeletonBubble />
      </div>
      <div className="shrink-0 border-t border-line px-4 pb-3 pt-3">
        <div aria-hidden className="h-11 rounded-lg border border-line bg-surface" />
        <p className="mt-2 text-[12px] leading-[1.45] text-ink-muted">
          AI assistant. This chat is saved so we can pick up where you left off.
        </p>
      </div>
    </>
  );
}
