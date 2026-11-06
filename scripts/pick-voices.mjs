// scripts/pick-voices.mjs
//
// Finds candidate voices in the ElevenLabs Voice Library for the mock calls and writes them to
// content/voice-candidates.json. Then, after you listen, `--apply` writes the chosen voices into
// content/voices.json (adding each library voice to your ElevenLabs account, which the API needs
// before a shared voice can be used). LOCAL ONLY; never imported by the app.
//
// Roles (PROMISELOOP_WEBSITE_BUILD.md §7.4):
//   ANA, JUN                        reps: Filipino-accented English, female and male
//   CARTER, MARCUS, TONY / RACHEL   customers: conversational American, 3 male / 1 female
//
// Usage (from the repo root; the npm script loads .env.local):
//   npm run voices:pick                        # search, print 3 candidates per role, write candidates file
//   npm run voices:pick -- --download          # also save each preview MP3 to .audio-tmp/voice-previews/
//   npm run voices:pick -- --apply             # use candidate 1 for every role
//   npm run voices:pick -- --apply ANA=2 TONY=3          # pick other candidates by number
//   npm run voices:pick -- --apply CARTER=<voice_id>     # or set a voice ID you found yourself
//
// API (checked 2026-11-07, elevenlabs.io/docs/api-reference/voices/voice-library):
//   GET  /v1/shared-voices?gender=&age=&accent=&language=&search=&use_cases=&page_size=&sort=
//        -> { voices: [{ public_owner_id, voice_id, name, accent, gender, age, descriptive,
//             use_case, category, preview_url, language, locale, cloned_by_count, is_added_by_user, ... }],
//             has_more, total_count }
//   POST /v1/voices/add/{public_user_id}/{voice_id}  body { new_name }  -> { voice_id }
//        public_user_id is the listing's public_owner_id.
// The library's accent/age values are free-form tags, so each role tries a few queries (exact
// accent filter first, then a text search) and keeps the most used voices. Always choose by ear.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANDIDATES_FILE = path.join(ROOT, "content", "voice-candidates.json");
const VOICES_FILE = path.join(ROOT, "content", "voices.json");
const PREVIEW_DIR = path.join(ROOT, ".audio-tmp", "voice-previews");
const API = "https://api.elevenlabs.io";
const PER_ROLE = 3;

// Order matters: earlier roles pick first, and a voice is never offered to two roles.
const ROLES = [
  {
    role: "ANA",
    brief: "Rep. Filipino-accented English, female, warm and clear, 20s to 30s.",
    queries: [
      { accent: "filipino", gender: "female", language: "en" },
      { search: "filipino", gender: "female" },
      { search: "philippines", gender: "female" },
    ],
  },
  {
    role: "JUN",
    brief: "Rep. Filipino-accented English, male, friendly and professional, 20s to 30s.",
    queries: [
      { accent: "filipino", gender: "male", language: "en" },
      { search: "filipino", gender: "male" },
      { search: "philippines", gender: "male" },
    ],
  },
  {
    role: "RACHEL",
    brief: "Customer. American, female, conversational, 30s to 40s, can sound heated then laugh.",
    queries: [
      { accent: "american", gender: "female", age: "middle_aged", use_cases: "conversational" },
      { accent: "american", gender: "female", use_cases: "conversational" },
      { accent: "american", gender: "female" },
    ],
  },
  {
    role: "CARTER",
    brief: "Customer. American, male, contractor on a job site, impatient then friendly, 30s to 40s.",
    queries: [
      { accent: "american", gender: "male", age: "middle_aged", use_cases: "conversational", search: "casual" },
      { accent: "american", gender: "male", age: "middle_aged", use_cases: "conversational" },
      { accent: "american", gender: "male", use_cases: "conversational" },
    ],
  },
  {
    role: "MARCUS",
    brief: "Customer. American, male, tired single dad, guarded and bitter then quiet, 30s.",
    queries: [
      { accent: "american", gender: "male", age: "young", use_cases: "conversational" },
      { accent: "american", gender: "male", use_cases: "conversational", search: "deep" },
      { accent: "american", gender: "male" },
    ],
  },
  {
    role: "TONY",
    brief: "Customer. American, male, hothead who shouts then calms down, 40s to 50s.",
    queries: [
      { accent: "american", gender: "male", age: "middle_aged", use_cases: "conversational", search: "gruff" },
      { accent: "american", gender: "male", age: "old", use_cases: "conversational" },
      { accent: "american", gender: "male", age: "middle_aged" },
    ],
  },
];

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) fail("ELEVENLABS_API_KEY is not set. Add it to .env.local and run: npm run voices:pick");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const DOWNLOAD = args.includes("--download");

async function api(method, pathAndQuery, body) {
  const res = await fetch(API + pathAndQuery, {
    method,
    headers: { "xi-api-key": KEY, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

// ---------------------------------------------------------------------------
// --apply

if (APPLY) {
  let file;
  try {
    file = JSON.parse(await fs.readFile(CANDIDATES_FILE, "utf8"));
  } catch {
    fail("content/voice-candidates.json not found. Run `npm run voices:pick` first.");
  }
  const picks = Object.fromEntries(
    args.filter((a) => /^[A-Z]+=.+$/.test(a)).map((a) => a.split("=")),
  );
  const voices = JSON.parse(await fs.readFile(VOICES_FILE, "utf8"));

  for (const { role } of ROLES) {
    const choice = picks[role] ?? "1";
    if (!/^\d+$/.test(choice)) {
      voices[role] = choice; // a voice ID supplied by hand, assumed to be in the account already
      console.log(`${role}: ${choice} (set by hand)`);
      continue;
    }
    const cand = file.roles?.[role]?.candidates?.[Number(choice) - 1];
    if (!cand) fail(`${role}: there is no candidate ${choice}. See content/voice-candidates.json.`);

    let voiceId = cand.voice_id;
    if (!cand.is_added_by_user) {
      const added = await api("POST", `/v1/voices/add/${cand.public_owner_id}/${cand.voice_id}`, {
        new_name: `PromiseLoop ${role} - ${cand.name}`.slice(0, 100),
      });
      if (added.ok && added.json.voice_id) {
        voiceId = added.json.voice_id;
      } else if (!/already/i.test(JSON.stringify(added.json))) {
        fail(`${role}: could not add "${cand.name}" to your account (HTTP ${added.status}): ${JSON.stringify(added.json)}`);
      }
    }
    voices[role] = voiceId;
    console.log(`${role}: ${cand.name} -> ${voiceId}`);
  }

  await fs.writeFile(VOICES_FILE, JSON.stringify(voices, null, 2) + "\n");
  console.log("\nWrote content/voices.json. Next: npm run generate:calls");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Search

async function search(query) {
  const params = new URLSearchParams({ page_size: "30", sort: "usage_character_count_1y" });
  for (const [k, v] of Object.entries(query)) params.set(k, v);
  const res = await api("GET", `/v1/shared-voices?${params}`);
  if (res.status === 401 || res.status === 403) {
    fail(`The API key was refused (HTTP ${res.status}). It needs Voice Library read access.`);
  }
  if (!res.ok) {
    console.warn(`  query ${params} failed: HTTP ${res.status}`);
    return [];
  }
  return res.json.voices ?? [];
}

const taken = new Set();
const out = { generatedAt: new Date().toISOString(), roles: {} };

for (const r of ROLES) {
  const found = [];
  for (const q of r.queries) {
    if (found.length >= PER_ROLE) break;
    for (const v of await search(q)) {
      if (found.length >= PER_ROLE) break;
      if (taken.has(v.voice_id) || found.some((f) => f.voice_id === v.voice_id)) continue;
      if (v.category === "famous" || !v.preview_url) continue;
      if (r.queries[0].gender && v.gender && v.gender !== r.queries[0].gender) continue;
      found.push(v);
    }
  }
  found.forEach((v) => taken.add(v.voice_id));

  out.roles[r.role] = {
    brief: r.brief,
    candidates: found.map((v) => ({
      voice_id: v.voice_id,
      public_owner_id: v.public_owner_id,
      name: v.name,
      accent: v.accent,
      gender: v.gender,
      age: v.age,
      descriptive: v.descriptive,
      use_case: v.use_case,
      category: v.category,
      language: v.language ?? null,
      cloned_by_count: v.cloned_by_count,
      is_added_by_user: Boolean(v.is_added_by_user),
      preview_url: v.preview_url,
      description: v.description ?? null,
    })),
  };

  console.log(`\n${r.role}  ${r.brief}`);
  if (!found.length) console.log("  no candidates found; pick one in the Voice Library and use --apply ROLE=<voice_id>");
  found.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.name}  (${[v.accent, v.gender, v.age, v.descriptive].filter(Boolean).join(", ")})`);
    console.log(`     ${v.preview_url}`);
  });
}

await fs.writeFile(CANDIDATES_FILE, JSON.stringify(out, null, 2) + "\n");
console.log("\nWrote content/voice-candidates.json.");

if (DOWNLOAD) {
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  for (const [role, { candidates }] of Object.entries(out.roles)) {
    for (const [i, c] of candidates.entries()) {
      const res = await fetch(c.preview_url);
      if (!res.ok) continue;
      const name = `${role}-${i + 1}-${c.name.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.mp3`;
      await fs.writeFile(path.join(PREVIEW_DIR, name), Buffer.from(await res.arrayBuffer()));
    }
  }
  console.log(`Saved previews to ${path.relative(ROOT, PREVIEW_DIR)}/`);
}

console.log("Listen, then run: npm run voices:pick -- --apply   (or --apply ANA=2 TONY=3 ...)");
