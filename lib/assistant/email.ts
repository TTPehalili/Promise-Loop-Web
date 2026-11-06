// Transactional email for the assistant (hand-off, booking alert, confirmation).
// Uses the email provider's REST API when RESEND_API_KEY is set; otherwise logs to the server console.
import { assistantEnv } from "./env";

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function toHtml(text: string) {
  return `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.5;color:#0B3D2E">${esc(text)
    .split("\n")
    .join("<br>")}</div>`;
}

export async function sendEmail(email: OutboundEmail): Promise<{ ok: boolean }> {
  const key = assistantEnv.resendKey();
  if (!key) {
    console.info(
      `[assistant] email (not sent: RESEND_API_KEY unset)\n  to: ${email.to}\n  subject: ${email.subject}\n${email.text
        .split("\n")
        .map((l) => "  | " + l)
        .join("\n")}`,
    );
    return { ok: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: assistantEnv.fromEmail(),
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: toHtml(email.text),
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[assistant] email send failed: ${res.status} ${await res.text().catch(() => "")}`);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[assistant] email send error", err);
    return { ok: false };
  }
}

export async function notifySlack(text: string) {
  const url = assistantEnv.slackWebhook();
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (err) {
    console.error("[assistant] slack notify error", err);
  }
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

type ProfileLines = {
  firstName?: string | null;
  company?: string | null;
  trade?: string | null;
  unpaidJobsEstimate?: number | null;
  tools?: string[] | null;
};

const profileBlock = (p: ProfileLines) =>
  [
    `Name: ${p.firstName ?? "(not given)"}`,
    `Company: ${p.company ?? "(not given)"}`,
    `Trade: ${p.trade ?? "(not given)"}`,
    `Unpaid jobs (visitor estimate): ${p.unpaidJobsEstimate ?? "(not given)"}`,
    `Tools mentioned: ${p.tools?.length ? p.tools.join(", ") : "(none)"}`,
  ].join("\n");

export function handoffEmail(input: {
  visitorEmail: string;
  question: string;
  summary: string;
  profile: ProfileLines;
  sla: string;
}): OutboundEmail {
  return {
    to: assistantEnv.alertEmail(),
    replyTo: input.visitorEmail,
    subject: `Website chat: a visitor asked for a person`,
    text: [
      `A visitor asked the website assistant to hand off to the team.`,
      `Reply to: ${input.visitorEmail} (they were told to expect a reply within ${input.sla}).`,
      ``,
      `Question: ${input.question}`,
      ``,
      profileBlock(input.profile),
      ``,
      `Conversation summary:`,
      input.summary || "(none)",
    ].join("\n"),
  };
}

export function bookingAlertEmail(input: {
  label: string;
  startsAt: string;
  email: string;
  phone?: string | null;
  summary: string;
  profile: ProfileLines;
}): OutboundEmail {
  return {
    to: assistantEnv.alertEmail(),
    replyTo: input.email,
    subject: `New demo booked: ${input.profile.company ?? input.email} · ${input.label}`,
    text: [
      `A demo was booked through the website assistant.`,
      `When: ${input.label} (${input.startsAt} UTC)`,
      `Email: ${input.email}`,
      `Phone: ${input.phone ?? "(not given)"}`,
      ``,
      profileBlock(input.profile),
      ``,
      `Conversation summary:`,
      input.summary || "(none)",
    ].join("\n"),
  };
}

export function bookingConfirmationEmail(input: {
  to: string;
  firstName: string;
  label: string;
  rescheduleUrl?: string;
}): OutboundEmail {
  return {
    to: input.to,
    replyTo: assistantEnv.contactEmail,
    subject: `Your PromiseLoop demo: ${input.label}`,
    text: [
      `Hi ${input.firstName},`,
      ``,
      `Your 20-minute PromiseLoop demo is booked for ${input.label}. A calendar invite is on its way to this address.`,
      ``,
      `Bring your 10 oldest invoices and we'll show you how they'd move through the loop.`,
      input.rescheduleUrl ? `\nNeed a different time? ${input.rescheduleUrl}` : ``,
      ``,
      `Every promise, followed through.`,
      `PromiseLoop`,
    ].join("\n"),
  };
}

export function emailMeLeadAlert(input: { email: string; note?: string | null; profile: ProfileLines }): OutboundEmail {
  return {
    to: assistantEnv.alertEmail(),
    replyTo: input.email,
    subject: `Website chat: visitor asked for details by email`,
    text: [
      `A visitor asked to be emailed the details (consent given in chat).`,
      `Email: ${input.email}`,
      `Note: ${input.note ?? "(none)"}`,
      ``,
      profileBlock(input.profile),
    ].join("\n"),
  };
}
