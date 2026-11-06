// Loads the knowledge pack (content/assistant/knowledge/*.md). Business owns these files.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { assistantEnv } from "./env";

export type KnowledgeDoc = {
  slug: string;
  title: string;
  topic: string;
  updated: string;
  source: string;
  status: string;
  body: string;
};

export const KNOWLEDGE_DIR = path.join(process.cwd(), "content", "assistant", "knowledge");

export function parseFrontMatter(raw: string): { meta: Record<string, string>; body: string } {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) return { meta: {}, body: text.trim() };
  const meta: Record<string, string> = {};
  for (const line of m[1]!.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2]!.trim() };
}

let cache: KnowledgeDoc[] | null = null;

export function loadKnowledge(): KnowledgeDoc[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  let files: string[] = [];
  try {
    files = readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".md")).sort();
  } catch (err) {
    console.error(`[assistant] knowledge folder not readable: ${KNOWLEDGE_DIR}`, err);
  }
  const redirect = assistantEnv.redirectContact();
  cache = files.map((file) => {
    const { meta, body } = parseFrontMatter(readFileSync(path.join(KNOWLEDGE_DIR, file), "utf8"));
    return {
      slug: file.replace(/\.md$/, ""),
      title: meta.title ?? file,
      topic: meta.topic ?? "",
      updated: meta.updated ?? "",
      source: meta.source ?? "",
      status: meta.status ?? "",
      body: body.replace(/\{\{REDIRECT_CONTACT\}\}/g, redirect),
    };
  });
  return cache;
}

/** Whole pack as one prompt block (Phase 1). Stable text, so it caches. */
export function knowledgePack(): string {
  return loadKnowledge()
    .map((d) => `<doc slug="${d.slug}" topic="${d.topic}">\n${d.body}\n</doc>`)
    .join("\n\n");
}
