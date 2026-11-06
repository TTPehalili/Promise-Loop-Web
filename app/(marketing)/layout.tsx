import type { ReactNode } from "react";
import { nav } from "@/content/site";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-lg bg-brand px-4 py-3 font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      >
        {nav.skipLink}
      </a>
      <Nav />
      <main id="main" tabIndex={-1} className="focus:outline-none focus-visible:ring-0">
        {children}
      </main>
      <Footer />
    </>
  );
}
