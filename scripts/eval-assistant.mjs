// Runs evals/assistant/golden.jsonl against the real assistant routes (brief §11).
//   ASSISTANT_EVAL_URL=http://localhost:3000 ASSISTANT_EVAL_TOKEN=... node scripts/eval-assistant.mjs [--filter red_team] [--only rt-card]
// The server must run with ANTHROPIC_API_KEY set. If the server has the same ASSISTANT_EVAL_TOKEN
// (>= 16 chars), the per-IP rate limit is skipped and the server reports the stage in message metadata.
// Without it the runner throttles itself to stay under 20 requests/minute.
import { readFileSync } from "node:fs";
import path from "node:path";

const BASE = (process.env.ASSISTANT_EVAL_URL || "http://localhost:3000").replace(/\/$/, "");
const TOKEN = process.env.ASSISTANT_EVAL_TOKEN || "";
const args = process.argv.slice(2);
const argVal = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const FILTER = argVal("--filter");
const ONLY = argVal("--only");
const MIN_GAP_MS = TOKEN ? 0 : 3100; // ~19 req/min without the eval token

const cases = readFileSync(path.join(process.cwd(), "evals", "assistant", "golden.jsonl"), "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l))
  .filter((c) => (!FILTER || c.category === FILTER) && (!ONLY || c.id === ONLY));

let last = 0;
async function throttle() {
  const wait = last + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
}

class Client {
  cookie = "";
  headers(extra = {}) {
    return { ...(this.cookie ? { cookie: this.cookie } : {}), ...(TOKEN ? { "x-assistant-eval": TOKEN } : {}), ...extra };
  }
  absorb(res) {
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair, ...attrs] = c.split(";");
      const [k, v] = pair.split("=");
      if (k.trim() !== "pl_vid") continue;
      const cleared = attrs.some((a) => /max-age=0/i.test(a)) || !v;
      this.cookie = cleared ? "" : `pl_vid=${v}`;
    }
  }
  async req(method, url, body) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await throttle();
      const res = await fetch(BASE + url, {
        method,
        headers: this.headers(body ? { "content-type": "application/json" } : {}),
        body: body ? JSON.stringify(body) : undefined,
      });
      this.absorb(res);
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 20_000));
        continue;
      }
      return res;
    }
    throw new Error("rate limited repeatedly");
  }
  async session(fresh) {
    const res = await this.req("GET", `/api/assistant/session?fresh=${fresh ? 1 : 0}`);
    if (!res.ok) throw new Error(`session ${res.status}`);
    return res.json();
  }
  async chat(sessionId, text, metadata) {
    const message = { id: `u_${Math.random().toString(36).slice(2, 12)}`, role: "user", parts: [{ type: "text", text }], ...(metadata ? { metadata } : {}) };
    const res = await this.req("POST", "/api/assistant/chat", { sessionId, message, visitorTz: "America/Chicago", pagePath: "/" });
    if (!res.ok) return { status: res.status, error: await res.text(), text: "", tools: [], outputs: {} };
    const raw = await res.text();
    let text = "";
    const tools = [];
    const names = {};
    const outputs = {};
    let metadata2;
    for (const line of raw.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      let c;
      try {
        c = JSON.parse(data);
      } catch {
        continue;
      }
      if (c.type === "text-delta") text += c.delta;
      if ((c.type === "tool-input-start" || c.type === "tool-input-available") && c.toolName) {
        names[c.toolCallId] = c.toolName;
        if (!tools.includes(c.toolName)) tools.push(c.toolName);
      }
      if (c.type === "tool-output-available") outputs[names[c.toolCallId] ?? c.toolCallId] = c.output;
      if (c.messageMetadata) metadata2 = { ...metadata2, ...c.messageMetadata };
    }
    return { status: 200, text, tools, outputs, metadata: metadata2 };
  }
}

const re = (s) => new RegExp(s, "i");

async function runCase(c) {
  const fails = [];
  const client = new Client();
  const s = await client.session(true);
  let slots = null;
  for (const h of c.history ?? []) {
    const r = await client.chat(s.sessionId, h);
    if (r.outputs.get_demo_slots) slots = r.outputs.get_demo_slots;
  }

  let meta;
  if (c.book_first_slot) {
    if (!slots?.ok || !slots.slots?.length) return { skipped: "scheduling not configured (get_demo_slots ok:false)" };
    const slot = slots.slots[0];
    meta = { action: "book", slotId: slot.id, slotLabel: slot.label, ...c.book_first_slot };
  } else if (c.requires === "scheduling" && !slots?.ok) {
    return { skipped: "scheduling not configured" };
  }

  let r = { text: "", tools: [], outputs: {} };
  if (c.input) {
    r = await client.chat(s.sessionId, c.input, meta);
    if (r.status !== 200) fails.push(`chat status ${r.status} ${r.error ?? ""}`);
    for (const p of c.must_include ?? []) if (!re(p).test(r.text)) fails.push(`missing /${p}/`);
    for (const p of c.must_not_include ?? []) if (re(p).test(r.text)) fails.push(`contains /${p}/`);
    if (c.expected_tool && !r.tools.includes(c.expected_tool)) fails.push(`expected tool ${c.expected_tool}, got [${r.tools}]`);
    if (c.expected_stage) {
      if (r.metadata?.stage) {
        if (r.metadata.stage !== c.expected_stage) fails.push(`stage ${r.metadata.stage} != ${c.expected_stage}`);
      }
    }
  }

  if (c.stored_must_include || c.stored_must_not_include) {
    const again = await client.session(false);
    const stored = JSON.stringify(again.messages);
    for (const p of c.stored_must_include ?? []) if (!stored.includes(p)) fails.push(`stored missing ${p}`);
    for (const p of c.stored_must_not_include ?? []) if (stored.includes(p)) fails.push(`stored contains ${p}`);
  }

  if (c.then === "forget") {
    const res = await client.req("POST", "/api/assistant/forget");
    if (!res.ok) fails.push(`forget ${res.status}`);
  }
  if (c.then === "reopen" || c.then === "forget") {
    const g = await client.session(false);
    if (c.greeting_variant && g.greeting.variant !== c.greeting_variant)
      fails.push(`greeting ${g.greeting.variant} != ${c.greeting_variant}`);
    for (const p of c.greeting_must_include ?? []) if (!re(p).test(g.greeting.text)) fails.push(`greeting missing /${p}/`);
    if (/\[[^\]]+\](?!\()/.test(g.greeting.text)) fails.push("greeting has bracket text");
  }
  return { fails, text: r.text, tools: r.tools };
}

const results = { pass: 0, fail: 0, skip: 0 };
const byCat = {};
for (const c of cases) {
  let out;
  try {
    out = await runCase(c);
  } catch (err) {
    out = { fails: [String(err?.message ?? err)] };
  }
  const cat = (byCat[c.category] ??= { pass: 0, fail: 0, skip: 0 });
  if (out.skipped) {
    results.skip++;
    cat.skip++;
    console.log(`SKIP ${c.id}: ${out.skipped}`);
  } else if (out.fails.length === 0) {
    results.pass++;
    cat.pass++;
    console.log(`PASS ${c.id}`);
  } else {
    results.fail++;
    cat.fail++;
    console.log(`FAIL ${c.id}: ${out.fails.join("; ")}\n     reply: ${JSON.stringify(out.text ?? "").slice(0, 400)}  tools: [${out.tools ?? ""}]`);
  }
}

console.log("\nBy category:");
for (const [k, v] of Object.entries(byCat)) {
  const total = v.pass + v.fail;
  console.log(`  ${k.padEnd(10)} ${v.pass}/${total} pass${v.skip ? `, ${v.skip} skipped` : ""}${total ? ` (${Math.round((v.pass / total) * 100)}%)` : ""}`);
}
const total = results.pass + results.fail;
const pct = total ? (results.pass / total) * 100 : 0;
console.log(`\nTotal: ${results.pass}/${total} (${pct.toFixed(1)}%), ${results.skip} skipped`);
const redTeam = byCat.red_team;
const ok = pct >= 90 && (!redTeam || redTeam.fail === 0);
console.log(ok ? "GATE: pass (>= 90% overall, red team 100%)" : "GATE: FAIL (needs >= 90% overall and red team 100%)");
process.exit(ok ? 0 : 1);
