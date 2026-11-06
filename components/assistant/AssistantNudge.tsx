"use client";

// Proactive nudge (brief §8.1). One per visitor per 7 days (localStorage), only
// after #pricing has been in view for 20s, or on desktop exit intent.
// Dismiss = gone for the session. No sound. Never opens the panel by itself.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { focusRing } from "./ui";

const SHOWN_KEY = "pl_assistant_nudge_at";
const DISMISSED_KEY = "pl_assistant_nudge_dismissed";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PRICING_DWELL_MS = 20_000;

function canShow(): boolean {
  try {
    if (sessionStorage.getItem(DISMISSED_KEY)) return false;
    const last = Number(localStorage.getItem(SHOWN_KEY) || 0);
    return !last || Date.now() - last > WEEK_MS;
  } catch {
    return false; // storage blocked: stay quiet rather than nag every page
  }
}

function markShown() {
  try {
    localStorage.setItem(SHOWN_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export default function AssistantNudge({ onOpen }: { onOpen: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canShow()) return;
    let done = false;
    const cleanups: Array<() => void> = [];
    const show = () => {
      if (done || !canShow()) return;
      done = true;
      markShown();
      setVisible(true);
      cleanups.forEach((c) => c());
    };

    // 1) #pricing in view for 20s (cumulative).
    const pricing = document.getElementById("pricing");
    if (pricing && "IntersectionObserver" in window) {
      let visibleMs = 0;
      let since: number | null = null;
      let timer: number | undefined;
      const arm = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(show, Math.max(0, PRICING_DWELL_MS - visibleMs));
      };
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && document.visibilityState === "visible") {
            since = performance.now();
            arm();
          } else if (since !== null) {
            visibleMs += performance.now() - since;
            since = null;
            window.clearTimeout(timer);
          }
        },
        { threshold: 0.25 },
      );
      io.observe(pricing);
      cleanups.push(() => {
        io.disconnect();
        window.clearTimeout(timer);
      });
    }

    // 2) Exit intent, desktop only (fine pointer, wide viewport): pointer leaves through the top.
    if (window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches) {
      const start = performance.now();
      const onOut = (e: MouseEvent) => {
        if (e.relatedTarget === null && e.clientY <= 0 && performance.now() - start > 4000) show();
      };
      document.addEventListener("mouseout", onOut);
      cleanups.push(() => document.removeEventListener("mouseout", onOut));
    }

    return () => {
      done = true;
      cleanups.forEach((c) => c());
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div aria-live="polite" className="absolute bottom-full right-0 mb-3">
      {visible && (
        <div className="flex w-max max-w-[calc(100vw-40px)] items-center gap-1 rounded-xl border border-brand bg-surface py-1 pl-1 pr-1">
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              onOpen();
            }}
            className={`min-h-[44px] rounded-lg px-3 text-left text-[15px] font-medium text-brand hover:bg-paper-deep ${focusRing}`}
          >
            Questions about pricing? Ask me.
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-paper-deep hover:text-ink ${focusRing}`}
          >
            <X size={18} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
