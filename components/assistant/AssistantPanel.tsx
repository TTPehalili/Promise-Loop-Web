"use client";

// PromiseLoop Assistant panel (brief §8.2–§8.4). Loaded with next/dynamic by
// AssistantLoader on first click (or prefetched on idle). Stays mounted after
// close so the conversation survives reopening.
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { contactEmail, demoUrl } from "@/lib/links";
import { Conversation, ConversationSkeleton, type ConversationHandle } from "./Conversation";
import { PanelHeader, type DragHandlers } from "./PanelHeader";
import { BookingLinkButton } from "./SlotChips";
import { focusRing, primaryButton, secondaryButton } from "./ui";
import { useAssistantSession } from "./useAssistantSession";

const MOBILE_QUERY = "(max-width: 639px)";
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

const inlineLink = "rounded-sm font-medium text-mint-ink underline underline-offset-2 hover:text-brand";

export default function AssistantPanel({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const convoRef = useRef<ConversationHandle>(null);
  const isMobile = useIsMobile();
  const { state, load, forget } = useAssistantSession();

  const [confirmForget, setConfirmForget] = useState(false);
  const [forgetting, setForgetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Move focus to the confirm button when "Forget me" asks for confirmation.
  useEffect(() => {
    if (confirmForget) confirmRef.current?.focus();
  }, [confirmForget]);

  // First open → load the session (this is when the cookie gets set).
  useEffect(() => {
    if (open && state.status === "idle") void load(false);
  }, [open, state.status, load]);

  // Focus into the input on open, and again whenever a new conversation is ready.
  const readyKey = state.status === "ready" ? state.epoch : state.status;
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      if (convoRef.current) convoRef.current.focusInput();
      else dialogRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open, readyKey]);

  // Mobile sheet is modal: lock page scroll behind it.
  useEffect(() => {
    if (!open || !isMobile) return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [open, isMobile]);

  const startFresh = useCallback(() => {
    setConfirmForget(false);
    setNotice(null);
    void load(true);
  }, [load]);

  const talkToPerson = useCallback(() => {
    convoRef.current?.send("I'd like to talk to a person.");
  }, []);

  async function doForget() {
    setForgetting(true);
    const res = await forget();
    setForgetting(false);
    setConfirmForget(false);
    if (!res) {
      setNotice(`I couldn't do that just now. Try again, or email ${contactEmail} and the team will delete it.`);
      return;
    }
    setNotice(
      res.hadBooking
        ? "Done. I've deleted this chat and what I remembered about you. Your demo is still on the calendar; to cancel it, use the link in your calendar invite."
        : "Done. I've deleted this chat and what I remembered about you.",
    );
    void load(true);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    // Mobile sheet is aria-modal: keep Tab inside it.
    if (e.key === "Tab" && isMobile && dialogRef.current) {
      const els = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (els.length === 0) return;
      const first = els[0];
      const lastEl = els[els.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  const drag: DragHandlers = {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      dragStart.current = e.clientY;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      if (dragStart.current === null) return;
      setDragY(Math.max(0, e.clientY - dragStart.current));
    },
    onPointerUp: () => {
      const dy = dragY;
      dragStart.current = null;
      setDragY(0);
      if (dy > 120) onClose();
    },
    onPointerCancel: () => {
      dragStart.current = null;
      setDragY(0);
    },
  };

  const ready = state.status === "ready";

  return (
    <div
      ref={dialogRef}
      id={id}
      role="dialog"
      aria-modal={isMobile ? "true" : "false"}
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
      className={`${open ? "flex" : "hidden"} fixed inset-0 z-[60] flex-col overflow-hidden bg-paper pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] font-sans text-ink outline-none sm:inset-auto sm:bottom-[88px] sm:right-5 sm:h-[min(600px,calc(100dvh-108px))] sm:w-[380px] sm:rounded-2xl sm:border sm:border-brand sm:p-0 sm:shadow-popover`}
    >
      <PanelHeader
        titleId={titleId}
        onClose={onClose}
        onStartFresh={startFresh}
        onForget={() => {
          setNotice(null);
          setConfirmForget(true);
        }}
        onTalk={talkToPerson}
        disabled={!ready}
        drag={drag}
      />

      {confirmForget && (
        <div className="shrink-0 border-b border-line bg-surface px-4 py-3" role="group" aria-label="Confirm forget me">
          <p className="text-[14px] leading-[1.5] text-ink">
            Forget me deletes this chat and everything I remember about you. This can&apos;t be undone.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButton}
              onClick={() => void doForget()}
              disabled={forgetting}
              ref={confirmRef}
            >
              {forgetting ? "Deleting…" : "Delete my data"}
            </button>
            <button type="button" className={secondaryButton} onClick={() => setConfirmForget(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="flex shrink-0 items-start gap-3 border-b border-line bg-mint-tint px-4 py-3" role="status">
          <p className="flex-1 text-[14px] leading-[1.5] text-brand">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className={`-my-2 -mr-2 inline-flex min-h-[44px] items-center rounded-lg px-2 text-[13px] font-medium text-brand underline underline-offset-2 ${focusRing}`}
          >
            OK
          </button>
        </div>
      )}

      {(state.status === "idle" || state.status === "loading") && <ConversationSkeleton />}

      {state.status === "unavailable" && (
        <div className="flex flex-1 flex-col gap-4 px-4 py-6">
          <p className="text-[15px] leading-[1.5] text-brand">
            The assistant is offline right now. Email{" "}
            <a href={`mailto:${contactEmail}`} className={inlineLink}>
              {contactEmail}
            </a>{" "}
            or book a demo.
          </p>
          <BookingLinkButton href={demoUrl} label="Book a demo" />
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-1 flex-col items-start gap-4 px-4 py-6">
          <p className="text-[15px] leading-[1.5] text-brand">
            Something went wrong on my side. Try again, or email{" "}
            <a href={`mailto:${contactEmail}`} className={inlineLink}>
              {contactEmail}
            </a>
            .
          </p>
          <button type="button" className={secondaryButton} onClick={() => void load(false)}>
            Try again
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <Conversation
          key={`${state.session.sessionId}-${state.epoch}`}
          session={state.session}
          handleRef={convoRef}
          onStartFresh={startFresh}
        />
      )}
    </div>
  );
}
