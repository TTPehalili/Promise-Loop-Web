"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import type { DemoSlot } from "@/lib/assistant/types";
import { inputClass, primaryButton } from "./ui";

export type LeadDetails = { firstName: string; email: string; company: string; phone?: string };

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Brief §3.6 step 2: one inline form, not three questions.
export function LeadMiniForm({
  slot,
  disabled,
  onSubmit,
}: {
  slot: DemoSlot;
  disabled?: boolean;
  onSubmit: (details: LeadDetails) => void;
}) {
  const uid = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const emailInput = emailRef.current;
    if (emailInput && !EMAIL_OK.test(email)) {
      emailInput.setCustomValidity("Enter a work email, like name@company.com.");
      emailInput.reportValidity();
      return;
    }
    if (!form.reportValidity()) return;
    const phone = String(data.get("phone") || "").trim();
    setSent(true);
    onSubmit({
      firstName: String(data.get("firstName") || "").trim(),
      email,
      company: String(data.get("company") || "").trim(),
      ...(phone ? { phone } : {}),
    });
  }

  const label = "block text-[13px] font-medium leading-snug text-ink";
  const locked = disabled || sent;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={`Book the demo for ${slot.label}`}
      className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <p className="text-[15px] leading-[1.5] text-brand">
        <span className="font-semibold tabular-nums">{slot.label}</span>. Where should we send the invite?
      </p>
      <div>
        <label htmlFor={`${uid}-first`} className={label}>
          First name
        </label>
        <input
          id={`${uid}-first`}
          name="firstName"
          required
          maxLength={80}
          autoComplete="given-name"
          className={`mt-1 ${inputClass}`}
          disabled={locked}
        />
      </div>
      <div>
        <label htmlFor={`${uid}-email`} className={label}>
          Work email
        </label>
        <input
          ref={emailRef}
          id={`${uid}-email`}
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          inputMode="email"
          className={`mt-1 ${inputClass}`}
          disabled={locked}
          onInput={(e) => e.currentTarget.setCustomValidity("")}
        />
      </div>
      <div>
        <label htmlFor={`${uid}-company`} className={label}>
          Company
        </label>
        <input
          id={`${uid}-company`}
          name="company"
          required
          maxLength={120}
          autoComplete="organization"
          className={`mt-1 ${inputClass}`}
          disabled={locked}
        />
      </div>
      <div>
        <label htmlFor={`${uid}-phone`} className={label}>
          Phone <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id={`${uid}-phone`}
          name="phone"
          type="tel"
          maxLength={40}
          autoComplete="tel"
          className={`mt-1 ${inputClass} tabular-nums`}
          disabled={locked}
        />
      </div>
      <button type="submit" className={`${primaryButton} w-full`} disabled={locked}>
        {sent ? "Booking…" : "Book it"}
      </button>
    </form>
  );
}
