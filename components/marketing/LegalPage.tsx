// Shared legal page (brief §10). Server component: reads the markdown at build time,
// resolves placeholders (throws on any leftover bracket), renders with `marked`,
// and gives every `##` heading an id. `<!-- id: some-id -->` on the line before a
// heading overrides the generated id (privacy §11 → #your-rights).
import fs from "node:fs";
import path from "node:path";
import { marked, type Token, type Tokens } from "marked";
import { LAST_UPDATED, resolvePlaceholders, type LegalDoc } from "@/content/legal/placeholders";

// TODO move to content/site.ts
const LEGAL_STRINGS = {
  lastUpdated: "Last updated:",
  tocLabel: "On this page",
};

interface TocItem {
  id: string;
  label: string;
}

const ID_MARKER = /^<!--\s*id:\s*([a-z0-9-]+)\s*-->\s*$/;

export function slugify(text: string): string {
  return text
    .replace(/^\s*\d+\.\s*/, "")
    .toLowerCase()
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderLegal(doc: LegalDoc) {
  const raw = fs.readFileSync(path.join(process.cwd(), "content/legal", `${doc}.md`), "utf8");
  let md = resolvePlaceholders(raw, doc);

  // The "Last updated" line is rendered in the page header, not in the prose.
  let lastUpdated = LAST_UPDATED;
  md = md.replace(/^\s*\*Last updated:\s*([^*\n]+)\*\s*\n/, (_, date: string) => {
    lastUpdated = date.trim();
    return "";
  });

  const tokens = marked.lexer(md);
  const toc: TocItem[] = [];
  const used = new Set<string>();
  let pendingId: string | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const t: Token = tokens[i];
    if (t.type === "html") {
      const m = (t as Tokens.HTML).text.trim().match(ID_MARKER);
      if (m) {
        pendingId = m[1];
        tokens.splice(i, 1);
        i--;
      }
      continue;
    }
    if (t.type === "heading" && (t as Tokens.Heading).depth === 2) {
      const h = t as Tokens.Heading;
      let id = pendingId ?? slugify(h.text);
      pendingId = null;
      for (let n = 2; used.has(id); n++) id = `${id}-${n}`;
      used.add(id);
      toc.push({ id, label: h.text });
      const inner = marked.parseInline(h.text, { async: false }) as string;
      const html: Tokens.HTML = {
        type: "html",
        raw: h.raw,
        text: `<h2 id="${escapeHtml(id)}">${inner}</h2>\n`,
        block: true,
        pre: false,
      };
      tokens[i] = html;
    } else if (t.type !== "space") {
      pendingId = null;
    }
  }

  const html = marked.parser(tokens, { gfm: true, async: false }) as string;
  return { html, toc, lastUpdated };
}

export function LegalPage({ doc, title }: { doc: LegalDoc; title: string }) {
  const { html, toc, lastUpdated } = renderLegal(doc);
  const tocId = `${doc}-toc`;
  return (
    <article className="section bg-paper text-ink">
      <div className="mx-auto max-w-3xl px-6">
        <header>
          <h1 className="h1">{title}</h1>
          <p className="small mt-4 text-ink-muted">
            {LEGAL_STRINGS.lastUpdated} <span className="num">{lastUpdated}</span>
          </p>
        </header>

        {toc.length > 0 && (
          <nav aria-labelledby={tocId} className="mt-10 border-y border-line py-6">
            <h2 id={tocId} className="small font-semibold text-ink">
              {LEGAL_STRINGS.tocLabel}
            </h2>
            <ul className="small mt-2 grid gap-x-8 sm:grid-cols-2">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="num inline-flex min-h-[44px] items-center rounded-sm text-mint-ink underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="legal-prose mt-10" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </article>
  );
}
