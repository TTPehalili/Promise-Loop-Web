// retrieveContext(): 'full' (whole knowledge pack, cached in the system prompt) or
// 'vector' (hybrid pgvector + full-text search over kb_chunks). Flip with ASSISTANT_RETRIEVAL.
import { createClient } from "@supabase/supabase-js";
import { assistantEnv } from "./env";
import { knowledgePack } from "./knowledge";

export type RetrievedContext = {
  mode: "full" | "vector";
  /** Goes into the static (cached) part of the prompt. Empty in vector mode. */
  staticKnowledge: string;
  /** Goes into the dynamic part (per turn). Empty in full mode. */
  dynamicKnowledge: string;
};

const EMBEDDINGS_URL = () => process.env.EMBEDDINGS_API_URL || "https://api.voyageai.com/v1/embeddings";
const EMBEDDINGS_MODEL = () => process.env.EMBEDDINGS_MODEL || "voyage-3.5";

/** Embeds texts with the embeddings provider (1024 dims). Shared contract with scripts/ingest-knowledge.ts. */
export async function embed(texts: string[], inputType: "query" | "document"): Promise<number[][]> {
  const key = process.env.EMBEDDINGS_API_KEY;
  if (!key) throw new Error("EMBEDDINGS_API_KEY not set");
  const res = await fetch(EMBEDDINGS_URL(), {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: texts, model: EMBEDDINGS_MODEL(), input_type: inputType, output_dimension: 1024 }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${await res.text().catch(() => "")}`);
  const json = (await res.json()) as { data: { embedding: number[]; index?: number }[] };
  return json.data.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((d) => d.embedding);
}

export async function retrieveContext(query: string): Promise<RetrievedContext> {
  const full: RetrievedContext = { mode: "full", staticKnowledge: knowledgePack(), dynamicKnowledge: "" };
  if (assistantEnv.retrieval() !== "vector") return full;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !process.env.EMBEDDINGS_API_KEY) {
    console.warn("[assistant] ASSISTANT_RETRIEVAL=vector but Supabase/embeddings env missing; using full pack");
    return full;
  }
  try {
    const [vec] = await embed([query.slice(0, 2000)], "query");
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.rpc("match_kb_chunks", {
      query_embedding: vec,
      query_text: query.slice(0, 500),
      k: 6,
    });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { doc_slug: string; title: string; content: string }[];
    if (rows.length === 0) return full;
    return {
      mode: "vector",
      staticKnowledge: "",
      dynamicKnowledge: rows.map((r) => `<doc slug="${r.doc_slug}" title="${r.title}">\n${r.content}\n</doc>`).join("\n\n"),
    };
  } catch (err) {
    console.error("[assistant] vector retrieval failed; using full pack", err);
    return full;
  }
}
