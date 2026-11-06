// Small HTTP helpers shared by the assistant routes.
import type { NextResponse } from "next/server";
import type { AssistantErrorBody, AssistantErrorCode } from "./types";

export const VISITOR_COOKIE = "pl_vid";
const MAX_AGE = 180 * 24 * 60 * 60; // 180 days

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID_RE.test(s);

const STATUS: Record<AssistantErrorCode, number> = {
  bad_request: 400,
  session_cap: 403,
  rate_limited: 429,
  unavailable: 503,
};

export function errorResponse(code: AssistantErrorCode, headers?: HeadersInit) {
  const body: AssistantErrorBody = { error: code };
  return Response.json(body, { status: STATUS[code], headers: { "Cache-Control": "no-store", ...headers } });
}

export function readVisitorId(req: Request): string | null {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === VISITOR_COOKIE) {
      const val = decodeURIComponent(v.join("="));
      return isUuid(val) ? val : null;
    }
  }
  return null;
}

export function setVisitorCookie(res: NextResponse, visitorId: string) {
  res.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearVisitorCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${VISITOR_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}
