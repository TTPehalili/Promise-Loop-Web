// Server-only configuration for the assistant. Every value has a safe default
// so the site builds and runs with zero env vars.
import { contactEmail, demoUrl } from "@/lib/links";

const str = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

export const assistantEnv = {
  anthropicKey: () => str(process.env.ANTHROPIC_API_KEY),
  model: () => str(process.env.ASSISTANT_MODEL) ?? "claude-haiku-5-5",
  modelHard: () => str(process.env.ASSISTANT_MODEL_HARD),
  /** Turns after which ASSISTANT_MODEL_HARD is used (if set). */
  hardAfterTurns: 12,
  retrieval: (): "full" | "vector" => (process.env.ASSISTANT_RETRIEVAL === "vector" ? "vector" : "full"),

  handoffSla: () => str(process.env.ASSISTANT_HANDOFF_SLA) ?? "one US business day",
  alertEmail: () => str(process.env.ASSISTANT_ALERT_EMAIL) ?? contactEmail,
  fromEmail: () => str(process.env.ASSISTANT_FROM_EMAIL) ?? `PromiseLoop <${contactEmail}>`,
  resendKey: () => str(process.env.RESEND_API_KEY),
  slackWebhook: () => str(process.env.ASSISTANT_SLACK_WEBHOOK_URL),

  /** §3.9 consumer redirect contact. Falls back to the general inbox; never bracket text. */
  redirectContact: () => str(process.env.REDIRECT_CONTACT) ?? contactEmail,
  contactEmail,
  demoUrl,

  schedulingKey: () => str(process.env.SCHEDULING_API_KEY),
  schedulingEventId: () => str(process.env.SCHEDULING_EVENT_ID),
  schedulingBaseUrl: () => str(process.env.SCHEDULING_API_BASE) ?? "https://api.cal.com/v2",
  schedulingRescheduleBase: () => str(process.env.SCHEDULING_RESCHEDULE_BASE) ?? "https://app.cal.com/reschedule",
  /** Cal.com API v2 versions (header `cal-api-version`). */
  schedulingSlotsVersion: () => str(process.env.SCHEDULING_SLOTS_API_VERSION) ?? "2024-09-04",
  schedulingBookingsVersion: () => str(process.env.SCHEDULING_BOOKINGS_API_VERSION) ?? "2026-02-25",
};
