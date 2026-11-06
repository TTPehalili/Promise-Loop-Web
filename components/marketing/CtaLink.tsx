// Resolves content link tokens ("demo", "login") to real URLs and renders the right element.
// Internal paths use next/link; anchors, mailto and http links use <a>. Only http(s) links
// open in a new tab.
import NextLink from "next/link";
import type { ReactNode } from "react";
import type { Href, RichText } from "@/content/site";
import { demoUrl, loginUrl } from "@/lib/links";

export function resolveHref(href: Href | string): string {
  if (href === "demo") return demoUrl;
  if (href === "login") return loginUrl;
  return href;
}

export function CtaLink({
  href,
  className,
  children,
  onClick,
  ariaLabel,
}: {
  href: Href | string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const url = resolveHref(href);
  const http = /^https?:/.test(url);
  if (url.startsWith("/") && !url.startsWith("//")) {
    return (
      <NextLink href={url} className={className} onClick={onClick} aria-label={ariaLabel}>
        {children}
      </NextLink>
    );
  }
  return (
    <a
      href={url}
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      {...(http ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

/** Renders RichText: plain strings plus inline links. */
export function Rich({ text, linkClassName }: { text: RichText; linkClassName?: string }) {
  return (
    <>
      {text.map((seg, i) =>
        typeof seg === "string" ? (
          <span key={i}>{seg}</span>
        ) : (
          <CtaLink
            key={i}
            href={seg.href}
            className={
              linkClassName ??
              "underline underline-offset-4 hover:no-underline focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            }
          >
            {seg.text}
          </CtaLink>
        ),
      )}
    </>
  );
}

/** Page anchors ("#how") become "/#how" so nav and footer work from /privacy and /terms too. */
export function siteHref(href: Href | string): string {
  return href.startsWith("#") ? `/${href}` : href;
}

/** Appends the secondary-action arrow unless the label already carries one. */
export function withArrow(label: string): string {
  return label.trim().endsWith("→") ? label : `${label} →`;
}
