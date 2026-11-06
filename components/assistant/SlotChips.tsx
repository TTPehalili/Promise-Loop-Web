"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { demoUrl } from "@/lib/links";
import type { DemoSlot, GetDemoSlotsOutput } from "@/lib/assistant/types";
import { chipClass, isExternalHref, primaryButton } from "./ui";

/** Booking page fallback (tool down or no slots). */
export function BookingLinkButton({ href, label = "Open the booking page" }: { href?: string; label?: string }) {
  const url = href || demoUrl;
  return (
    <a
      href={url}
      className={`${primaryButton} self-start`}
      {...(isExternalHref(url) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <CalendarDays size={18} strokeWidth={1.5} aria-hidden />
      {label}
    </a>
  );
}

export function SlotChips({
  output,
  interactive,
  selectedId,
  onPick,
}: {
  output: GetDemoSlotsOutput;
  /** Only the latest slot list can be picked from. */
  interactive: boolean;
  selectedId?: string;
  onPick: (slot: DemoSlot) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fourthRef = useRef<HTMLButtonElement>(null);

  // Keep keyboard focus in place when "See more times" disappears.
  useEffect(() => {
    if (expanded) fourthRef.current?.focus();
  }, [expanded]);

  if (!output.ok || output.slots.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px] leading-[1.5] text-brand">
          I can&apos;t load times right now. You can pick one on our booking page.
        </p>
        <BookingLinkButton href={output.ok ? undefined : output.bookingUrl} />
      </div>
    );
  }

  const all = output.slots.slice(0, 6);
  const shown = expanded ? all : all.slice(0, 3);

  return (
    <div role="group" aria-label="Available demo times, shown in your time zone" className="flex flex-wrap gap-2">
      {shown.map((slot, i) => (
        <button
          key={slot.id}
          ref={i === 3 ? fourthRef : undefined}
          type="button"
          className={`${chipClass} tabular-nums`}
          aria-pressed={selectedId === slot.id}
          disabled={!interactive}
          onClick={() => onPick(slot)}
        >
          {slot.label}
        </button>
      ))}
      {!expanded && all.length > 3 && interactive && (
        <button type="button" className={chipClass} onClick={() => setExpanded(true)}>
          See more times
        </button>
      )}
    </div>
  );
}
