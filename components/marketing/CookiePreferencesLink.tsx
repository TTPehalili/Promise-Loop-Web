"use client";

// Footer "Cookie preferences": reopens the cookie notice. A real link to /privacy#cookies
// so it still goes somewhere useful before hydration or without JavaScript.
import type { ReactNode } from "react";
import { openConsentPreferences } from "@/lib/consent";

export function CookiePreferencesLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        openConsentPreferences();
      }}
    >
      {children}
    </a>
  );
}
