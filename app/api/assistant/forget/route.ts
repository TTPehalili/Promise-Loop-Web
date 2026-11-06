import { ipAllowed } from "@/lib/assistant/guard";
import { clearVisitorCookieHeader, errorResponse, readVisitorId } from "@/lib/assistant/http";
import { getStore } from "@/lib/assistant/store";
import type { ForgetResponse } from "@/lib/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Forget me (§6.1): deletes visitor, sessions, messages and leads; keeps a booking (detached); clears the cookie. */
export async function POST(req: Request) {
  if (!ipAllowed(req)) return errorResponse("rate_limited");
  const visitorId = readVisitorId(req);
  let hadBooking = false;
  if (visitorId) {
    try {
      ({ hadBooking } = await getStore().forgetVisitor(visitorId));
    } catch (err) {
      console.error("[assistant] forget failed", err);
      return errorResponse("unavailable");
    }
  }
  const body: ForgetResponse = { ok: true, hadBooking };
  return Response.json(body, {
    headers: { "Cache-Control": "no-store", "Set-Cookie": clearVisitorCookieHeader() },
  });
}
