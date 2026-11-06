// Phase 2 (brief §1, §6): chunk content/assistant/knowledge/*.md, embed, upsert into kb_chunks.
// Not imported by the app. Run locally:
//   node --env-file=.env.local scripts/ingest-knowledge.ts            (Node 22.18+ / 24 strips TS types)
//   node --env-file=.env.local scripts/ingest-knowledge.ts --dry-run  (print chunks, no API calls)
// Needs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EMBEDDINGS_API_KEY
// Optional: EMBEDDINGS_API_URL (default Voyage-compatible /v1/embeddings), EMBEDDINGS_MODEL (default voyage-3.5).
// Embedding size must match kb_chunks.embedding (1024).
// Self-contained on purpose (no "@/..." imports) so it runs without a bundler.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DIR = path.join(process.cwd(), "content", "assistant", "knowledge");
const DIMS = 1024;
const MAX_CHARS = 1200;
const DRY = process.argv.includes("--dry-run");

type Chunk = { doc_slug: string; chunk_index: number; title: string; topic: string; content: string; tokens: number };

function parse(raw: string) {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  const meta: Record<string, string> = {};
  if (!m) return { meta, body: text.trim() };
  for (const line of m[1]!.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2]!.trim() };
}

function chunkDoc(slug: string, title: string, topic: string, body: string): Chunk[] {
  const redirect = process.env.REDIRECT_CONTACT || "hello@promiseloop.com";
  const text = body.replace(/\{\{REDIRECT_CONTACT\}\}/g, redirect).replace(/^# .*\n+/, "");
  // Split on H2 sections; keep the do_not_say list attached to every chunk of the doc.
  const sections = text.split(/\n(?=## )/);
  const dnsIndex = sections.findIndex((s) => /^## do_not_say/i.test(s));
  const doNotSay = dnsIndex >= 0 ? sections.splice(dnsIndex, 1)[0]! : "";
  const pieces: string[] = [];
  for (const s of sections) {
    if (s.length <= MAX_CHARS) {
      pieces.push(s.trim());
      continue;
    }
    let buf = "";
    for (const para of s.split(/\n\n+/)) {
      if ((buf + "\n\n" + para).length > MAX_CHARS && buf) {
        pieces.push(buf.trim());
        buf = "";
      }
      buf += (buf ? "\n\n" : "") + para;
    }
    if (buf.trim()) pieces.push(buf.trim());
  }
  return pieces.map((p, i) => {
    const content = `# ${title}\n\n${p}${doNotSay ? `\n\n${doNotSay.trim()}` : ""}`;
    return { doc_slug: slug, chunk_index: i, title, topic, content, tokens: Math.ceil(content.length / 4) };
  });
}

async function embed(texts: string[]): Promise<number[][]> {
  const key = process.env.EMBEDDINGS_API_KEY;
  if (!key) throw new Error("EMBEDDINGS_API_KEY not set");
  const res = await fetch(process.env.EMBEDDINGS_API_URL || "https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: texts,
      model: process.env.EMBEDDINGS_MODEL || "voyage-3.5",
      input_type: "document",
      output_dimension: DIMS,
    }),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: { embedding: number[]; index?: number }[] };
  const out = json.data.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((d) => d.embedding);
  for (const e of out) if (e.length !== DIMS) throw new Error(`embedding has ${e.length} dims, expected ${DIMS}`);
  return out;
}

async function main() {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".md")).sort();
  const chunks: Chunk[] = [];
  for (const f of files) {
    const { meta, body } = parse(readFileSync(path.join(DIR, f), "utf8"));
    chunks.push(...chunkDoc(f.replace(/\.md$/, ""), meta.title ?? f, meta.topic ?? "", body));
  }
  console.log(`${files.length} docs -> ${chunks.length} chunks`);
  if (DRY) {
    for (const c of chunks) console.log(`\n--- ${c.doc_slug}#${c.chunk_index} (${c.tokens} tok)\n${c.content.slice(0, 300)}…`);
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const BATCH = 32;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const vectors = await embed(batch.map((c) => c.content));
    const rows = batch.map((c, j) => ({ ...c, embedding: vectors[j], updated_at: new Date().toISOString() }));
    const { error } = await db.from("kb_chunks").upsert(rows, { onConflict: "doc_slug,chunk_index" });
    if (error) throw new Error(`upsert: ${error.message}`);
    console.log(`upserted ${i + batch.length}/${chunks.length}`);
  }

  // Remove stale chunks (docs that shrank or were deleted).
  const bySlug = new Map<string, number>();
  for (const c of chunks) bySlug.set(c.doc_slug, Math.max(bySlug.get(c.doc_slug) ?? -1, c.chunk_index));
  for (const [slug, maxIndex] of bySlug) {
    const { error } = await db.from("kb_chunks").delete().eq("doc_slug", slug).gt("chunk_index", maxIndex);
    if (error) throw new Error(`cleanup ${slug}: ${error.message}`);
  }
  const { error } = await db.from("kb_chunks").delete().not("doc_slug", "in", `(${[...bySlug.keys()].join(",")})`);
  if (error) throw new Error(`cleanup removed docs: ${error.message}`);
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
