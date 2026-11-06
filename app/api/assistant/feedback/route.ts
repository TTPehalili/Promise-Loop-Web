import { z } from "zod";
import { clientIp, takeToken } from "@/lib/assistant/guard";
import { errorResponse, readVisitorId } from "@/lib/assistant/http";
import { getStore } from "@/lib/assistant/store";
import type { FeedbackResponse } from "@/lib/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  messageId: z.string().min(1).max(100),
  value: z.union([z.literal(1), z.literal(-1)]),
});

/** Thumbs up/down on an assistant message. Only the visitor's own messages can be rated. */
export async function POST(req: Request) {
  // Separate bucket so rating messages never eats into the chat limit.
  if (!takeToken(`fb:${clientIp(req)}`, 30, 60_000)) return errorResponse("rate_limited");
  let body: z.infer<typeof schema>;
  try {
    const r = schema.safeParse(await req.json());
    if (!r.success) return errorResponse("bad_request");
    body = r.data;
  } catch {
    return errorResponse("bad_request");
  }
  const visitorId = readVisitorId(req);
  if (!visitorId) return errorResponse("bad_request");
  try {
    await getStore().setFeedback(visitorId, body.messageId, body.value);
  } catch (err) {
    console.error("[assistant] feedback failed", err);
  }
  const res: FeedbackResponse = { ok: true };
  return Response.json(res, { headers: { "Cache-Control": "no-store" } });
}
