"use client";

import { useState } from "react";
import { CalendarPlus, Check, RefreshCw } from "lucide-react";
import { MARK_CHECK_PATH, MARK_RING_PATH, MARK_VIEWBOX } from "@/components/marketing/graphics/LoopMark";
import type { BookDemoOutput } from "@/lib/assistant/types";
import { BookingLinkButton } from "./SlotChips";
import { isExternalHref, secondaryButton } from "./ui";

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={secondaryButton}
      {...(isExternalHref(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

/** The ring closes into a check once (600ms). Static check under reduced motion. */
function ClosingMark({ animate }: { animate: boolean }) {
  const [play, setPlay] = useState(animate);
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-tint">
      <svg
        width={28}
        height={28}
        viewBox={MARK_VIEWBOX}
        fill="none"
        aria-hidden
        className="motion-reduce:hidden"
        onAnimationEnd={(e) => {
          if ((e.target as Element).classList.contains("pl-assistant-check-draw")) setPlay(false);
        }}
      >
        <path
          d={MARK_RING_PATH}
          pathLength={1}
          strokeWidth={3.2}
          strokeLinecap="round"
          className={`stroke-mint ${play ? "pl-assistant-ring-draw" : ""}`}
        />
        <path
          d={MARK_CHECK_PATH}
          pathLength={1}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`stroke-brand ${play ? "pl-assistant-check-draw" : ""}`}
        />
      </svg>
      <Check size={20} strokeWidth={2} aria-hidden className="hidden text-brand motion-reduce:block" />
    </span>
  );
}

export function BookedCard({ output, animate }: { output: BookDemoOutput; animate: boolean }) {
  if (!output.ok) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <p className="text-[15px] leading-[1.5] text-brand">
          I couldn&apos;t book that time. {output.reason} You can pick a time on our booking page instead.
        </p>
        <BookingLinkButton href={output.bookingUrl} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-brand bg-surface p-4">
      <div className="flex items-start gap-3">
        <ClosingMark animate={animate} />
        <p className="text-[15px] leading-[1.5] text-brand tabular-nums">
          <strong className="font-semibold">Loop closed.</strong> Demo booked for{" "}
          <strong className="font-semibold">{output.label}</strong> with the PromiseLoop team. A calendar invite is on
          its way to <span className="break-all">{output.email}</span>.
        </p>
      </div>
      {(output.addToCalendarUrl || output.rescheduleUrl) && (
        <div className="flex flex-wrap gap-2">
          {output.addToCalendarUrl && (
            <ExtLink href={output.addToCalendarUrl}>
              <CalendarPlus size={18} strokeWidth={1.5} aria-hidden />
              Add to calendar
            </ExtLink>
          )}
          {output.rescheduleUrl && (
            <ExtLink href={output.rescheduleUrl}>
              <RefreshCw size={18} strokeWidth={1.5} aria-hidden />
              Reschedule
            </ExtLink>
          )}
        </div>
      )}
    </div>
  );
}
