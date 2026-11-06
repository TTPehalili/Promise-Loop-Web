"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ForgetResponse, SessionResponse } from "@/lib/assistant/types";

export type SessionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; session: SessionResponse; epoch: number }
  | { status: "unavailable" }
  | { status: "error" };

/**
 * Loads `GET /api/assistant/session`. Called on first panel open only, which is
 * when the server sets the `pl_vid` cookie (never on page load).
 */
export function useAssistantSession() {
  const [state, setState] = useState<SessionState>({ status: "idle" });
  const epochRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const load = useCallback(async (fresh: boolean) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/assistant/session?fresh=${fresh ? 1 : 0}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });
      if (res.status === 503) return setState({ status: "unavailable" });
      if (!res.ok) return setState({ status: "error" });
      const session = (await res.json()) as SessionResponse;
      if (!session || typeof session.sessionId !== "string") return setState({ status: "error" });
      epochRef.current += 1;
      setState({
        status: "ready",
        session: {
          ...session,
          chips: Array.isArray(session.chips) ? session.chips : [],
          messages: Array.isArray(session.messages) ? session.messages : [],
        },
        epoch: epochRef.current,
      });
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      setState({ status: "error" });
    }
  }, []);

  const forget = useCallback(async (): Promise<ForgetResponse | null> => {
    try {
      const res = await fetch("/api/assistant/forget", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) return null;
      return (await res.json()) as ForgetResponse;
    } catch {
      return null;
    }
  }, []);

  return { state, load, forget };
}

export function sendFeedback(messageId: string, value: 1 | -1) {
  void fetch("/api/assistant/feedback", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId, value }),
    keepalive: true,
  }).catch(() => undefined);
}
