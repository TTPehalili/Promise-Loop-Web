import type { ReactNode } from "react";
import { nav } from "@/content/site";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { AssistantLauncher } from "@/components/assistant/AssistantLauncher";
import { CookieNotice } from "@/components/marketing/CookieNotice";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-lg bg-brand px-4 py-3 font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      >
        {nav.skipLink}
      </a>
      {/* Early in the DOM so keyboard and screen reader users reach it right after the skip link. */}
      <CookieNotice />
      <Nav />
      <main id="main" tabIndex={-1} className="focus:outline-none focus-visible:ring-0">
        {children}
      </main>
      <Footer />
      <AssistantLauncher />
    </>
  );
}
