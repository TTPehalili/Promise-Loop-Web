// Section shell: background per brief §6 order table, .section padding (includes scroll-mt-20)
// and the site container.
import type { ReactNode } from "react";

const BG = {
  paper: "bg-paper text-ink",
  "paper-deep": "bg-paper-deep text-ink",
  brand: "bg-brand text-paper",
} as const;

export type SectionBg = keyof typeof BG;

export function Section({
  id,
  bg,
  labelledBy,
  className = "",
  containerClassName = "",
  children,
}: {
  id?: string;
  bg: SectionBg;
  labelledBy?: string;
  className?: string;
  containerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`section ${BG[bg]} ${className}`}>
      <div className={`container-site ${containerClassName}`}>{children}</div>
    </section>
  );
}

/** Eyebrow + H2 (+ optional body) block used at the top of most sections. */
export function SectionHeader({
  id,
  eyebrow,
  title,
  body,
  dark = false,
  center = false,
  className = "",
}: {
  id: string;
  eyebrow?: string;
  title: string;
  body?: string;
  dark?: boolean;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-3xl ${className}`}>
      {eyebrow && <p className={`eyebrow ${dark ? "text-paper/80" : ""}`}>{eyebrow}</p>}
      <h2 id={id} className={`h2 mt-3 ${dark ? "text-paper" : ""}`}>
        {title}
      </h2>
      {body && (
        <p className={`body mt-5 ${center ? "mx-auto" : ""} ${dark ? "text-paper/80" : "text-ink-muted"}`}>{body}</p>
      )}
    </div>
  );
}
