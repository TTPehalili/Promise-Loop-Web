"use client";

// Tiny client island around the server-rendered launcher (brief §8.1).
// - Click on the launcher → load + open the panel (next/dynamic, no SSR).
// - 5s after load, on requestIdleCallback → prefetch the panel chunk only (never opens it).
// - On idle → load the proactive nudge (a separate small chunk).
// Nothing here calls the API: the session cookie is set on first open, by the panel.
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

const loadPanel = () => import("./AssistantPanel");

function PanelLoading() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[60] flex flex-col gap-3 bg-paper p-6 sm:inset-auto sm:bottom-[88px] sm:right-5 sm:h-[min(600px,calc(100dvh-108px))] sm:w-[380px] sm:rounded-2xl sm:border sm:border-brand sm:shadow-popover"
    >
      <div className="h-4 w-1/2 animate-pulse rounded bg-paper-deep" />
      <div className="mt-6 h-20 w-4/5 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}

// Inline import() so the Next compiler can trace the chunk; loadPanel() above warms the same chunk.
const AssistantPanel = dynamic(() => import("./AssistantPanel"), { ssr: false, loading: PanelLoading });
const AssistantNudge = dynamic(() => import("./AssistantNudge"), { ssr: false });

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

function onIdle(cb: () => void): () => void {
  const w = window as IdleWindow;
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(cb, { timeout: 4000 });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(cb, 1);
  return () => window.clearTimeout(t);
}

export default function AssistantLoader({ panelId, children }: { panelId: string; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [requested, setRequested] = useState(false);
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [nudgeOn, setNudgeOn] = useState(false);

  const launcher = useCallback(
    () => rootRef.current?.querySelector<HTMLButtonElement>("[data-assistant-launcher]") ?? null,
    [],
  );

  const openPanel = useCallback(() => {
    setRequested(true);
    setEverOpened(true);
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    // Focus returns to the launcher (brief §8.3).
    requestAnimationFrame(() => launcher()?.focus());
  }, [launcher]);

  // Prefetch the panel chunk 5s after load, when idle. Load the nudge when idle.
  useEffect(() => {
    let cancelIdle: (() => void) | undefined;
    const t = window.setTimeout(() => {
      cancelIdle = onIdle(() => void loadPanel().catch(() => undefined));
    }, 5000);
    const cancelNudge = onIdle(() => setNudgeOn(true));
    return () => {
      window.clearTimeout(t);
      cancelIdle?.();
      cancelNudge();
    };
  }, []);

  useEffect(() => {
    launcher()?.setAttribute("aria-expanded", open ? "true" : "false");
  }, [open, launcher]);

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as Element;
    if (!target.closest("[data-assistant-launcher]")) return;
    if (open) closePanel();
    else openPanel();
  }

  return (
    // Click delegation for the server-rendered launcher button inside.
    <div ref={rootRef} onClick={handleClick} className="fixed bottom-5 right-5 z-[45] print:hidden">
      {nudgeOn && !open && !everOpened && <AssistantNudge onOpen={openPanel} />}
      {children}
      {requested && <AssistantPanel id={panelId} open={open} onClose={closePanel} />}
    </div>
  );
}
