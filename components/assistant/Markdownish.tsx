import { Fragment, type ReactNode } from "react";

// Minimal, safe formatting for assistant text: paragraphs, line breaks,
// "- " bullet lines, **bold**, [label](url) and bare URLs.
// Everything is rendered as React text nodes; model output never reaches innerHTML.

const INLINE = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:[^\s]+$/i.test(href)) return href;
  if (/^\/(?!\/)/.test(href) || href.startsWith("#")) return href;
  return null;
}

function Anchor({ href, children }: { href: string; children: ReactNode }) {
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      className="rounded-sm font-medium text-mint-ink underline underline-offset-2 hover:text-brand"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

function renderInline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const k = `${key}-${i++}`;
    if (m[1] !== undefined) {
      out.push(
        <strong key={k} className="font-semibold">
          {m[1]}
        </strong>,
      );
    } else if (m[2] !== undefined && m[3] !== undefined) {
      const href = safeHref(m[3]);
      out.push(href ? <Anchor key={k} href={href}>{m[2]}</Anchor> : m[2]);
    } else if (m[4] !== undefined) {
      out.push(
        <Anchor key={k} href={m[4]}>
          {m[4]}
        </Anchor>,
      );
    }
    last = start + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderLines(lines: string[], key: string): ReactNode[] {
  return lines.map((line, idx) => (
    <Fragment key={`${key}-l${idx}`}>
      {idx > 0 && <br />}
      {renderInline(line, `${key}-l${idx}`)}
    </Fragment>
  ));
}

export function Markdownish({ text }: { text: string }) {
  const blocks = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <>
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        if (isList) {
          return (
            <ul key={b} className="list-disc space-y-1 pl-5 [&:not(:first-child)]:mt-2">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\s*[-*•]\s+/, ""), `${b}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={b} className="[&:not(:first-child)]:mt-2">
            {renderLines(lines, String(b))}
          </p>
        );
      })}
    </>
  );
}
