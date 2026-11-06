// scripts/generate-calls.mjs
//
// Generates the four dramatized mock calls (PROMISELOOP_WEBSITE_BUILD.md §7.4–§7.5, Appendix A)
// with the ElevenLabs text-to-dialogue API. LOCAL ONLY. Never import this file from the app,
// and never expose ELEVENLABS_API_KEY to the browser.
//
// Usage (from the repo root):
//   node --env-file=.env.local scripts/generate-calls.mjs          # all calls
//   node --env-file=.env.local scripts/generate-calls.mjs 3        # only call 3
//
// Requires: Node 20.6+ (for --env-file), ffmpeg and ffprobe on PATH,
// real voice IDs in content/voices.json.
//
// Writes:
//   public/audio/call-N.mp3          clean version
//   public/audio/call-N-phone.mp3    phone-band version (Zion chooses clean or phone)
//   content/call-durations.json      { "1": "2:41", ... } (merged, so single-call runs keep the rest)
//
// API reference checked 2026-11-07 at
// https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert :
//   POST https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128
//   header xi-api-key, JSON body:
//     inputs:   [{ text, voice_id }]  (required; at most 10 unique voice IDs)
//     model_id: default "eleven_v3"
//     seed:     integer 0..4294967295, best-effort determinism (not guaranteed)
//     settings, language_code, apply_text_normalization, audio_effects, previous/next_request_ids
//       are optional and not used here.
//   Keep combined text at or under 2,000 characters per request.
//   Response: the audio file bytes. 422 returns { detail: [...] }.
// The field names in the brief's reference implementation are unchanged.
//
// After generating: listen to every file. Check amounts, dates and ZIP codes are pronounced
// correctly; regenerate a call if not. Rotate the API key that was shared in chat.

import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CALLS_FILE = path.join(ROOT, "content", "mock-calls.json");
const VOICES_FILE = path.join(ROOT, "content", "voices.json");
const DURATIONS_FILE = path.join(ROOT, "content", "call-durations.json");
const OUT = path.join(ROOT, "public", "audio");
const TMP = path.join(ROOT, ".audio-tmp");

const API_URL = "https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128";
const MODEL_ID = "eleven_v3";
const DEFAULT_SEED = 4217;
const MAX_CHARS = 2000;
const PHONE_FILTER = "highpass=f=300,lowpass=f=3400,aresample=8000,aresample=44100,volume=1.1";

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

// 1. Tools ---------------------------------------------------------------

function requireBinary(name) {
  try {
    execFileSync(name, ["-version"], { stdio: "ignore" });
  } catch {
    fail(`${name} was not found on PATH. Install ffmpeg (it includes ffprobe) and try again.`);
  }
}
requireBinary("ffmpeg");
requireBinary("ffprobe");

// 2. Key -----------------------------------------------------------------

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  fail("ELEVENLABS_API_KEY is not set. Put it in .env.local and run with: node --env-file=.env.local scripts/generate-calls.mjs");
}

// 3. Data ----------------------------------------------------------------

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (err) {
    fail(`Could not read ${path.relative(ROOT, file)}: ${err.message}`);
  }
}

const allCalls = await readJson(CALLS_FILE);
const voices = await readJson(VOICES_FILE);

const arg = process.argv[2];
let calls = allCalls;
if (arg !== undefined) {
  const id = Number(arg);
  calls = allCalls.filter((c) => c.id === id);
  if (!Number.isInteger(id) || calls.length === 0) {
    fail(`Unknown call id "${arg}". Valid ids: ${allCalls.map((c) => c.id).join(", ")}`);
  }
}

// Every speaker in the selected calls needs a real voice ID.
const problems = [];
for (const call of calls) {
  for (const speaker of new Set(call.lines.map((l) => l.speaker))) {
    const id = voices[speaker];
    if (typeof id !== "string" || id.trim() === "") {
      problems.push(`call ${call.id}: no voice ID for speaker ${speaker}`);
    } else if (id.trim().startsWith("<")) {
      problems.push(`call ${call.id}: speaker ${speaker} still has the placeholder ${id}`);
    }
  }
  for (const [i, line] of call.lines.entries()) {
    if (line.text.length > MAX_CHARS) {
      problems.push(`call ${call.id} line ${i + 1}: ${line.text.length} characters, over the ${MAX_CHARS} limit for one request`);
    }
  }
}
if (problems.length) {
  fail(`Fix content/voices.json or content/mock-calls.json first:\n  - ${[...new Set(problems)].join("\n  - ")}`);
}

// 4. Helpers -------------------------------------------------------------

// Split at speaker turns so each request stays at or under MAX_CHARS of text.
function chunk(lines) {
  const parts = [];
  let cur = [];
  let len = 0;
  for (const l of lines) {
    if (len + l.text.length > MAX_CHARS && cur.length) {
      parts.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(l);
    len += l.text.length;
  }
  if (cur.length) parts.push(cur);
  return parts;
}

async function synthesize(call, part, partNo, total) {
  const body = {
    model_id: MODEL_ID,
    seed: call.seed ?? DEFAULT_SEED,
    inputs: part.map((l) => ({ text: l.text, voice_id: voices[l.speaker].trim() })),
  };
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    fail(`Call ${call.id} part ${partNo}/${total}: HTTP ${res.status} ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function durationOf(file) {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
    { encoding: "utf8" },
  );
  const seconds = Math.round(parseFloat(out.trim()));
  if (!Number.isFinite(seconds)) fail(`ffprobe could not read the duration of ${file}`);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// ffmpeg concat list: forward slashes, single quotes escaped.
const concatEntry = (file) => `file '${file.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`;

// 5. Generate ------------------------------------------------------------

await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(TMP, { recursive: true });

let durations = {};
try {
  durations = JSON.parse(await fs.readFile(DURATIONS_FILE, "utf8"));
} catch {
  durations = {};
}

for (const call of calls) {
  const parts = chunk(call.lines);
  const files = [];
  for (const [i, part] of parts.entries()) {
    const audio = await synthesize(call, part, i + 1, parts.length);
    const file = path.join(TMP, `call-${call.id}-${i + 1}.mp3`);
    await fs.writeFile(file, audio);
    files.push(file);
    console.log(`call ${call.id} part ${i + 1}/${parts.length} done`);
  }

  const list = path.join(TMP, `call-${call.id}.txt`);
  await fs.writeFile(list, files.map(concatEntry).join("\n") + "\n");

  const clean = path.join(OUT, `call-${call.id}.mp3`);
  const phone = path.join(OUT, `call-${call.id}-phone.mp3`);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", clean]);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", clean, "-af", PHONE_FILTER, "-b:a", "128k", phone]);
  // TODO: optional short ring at the start of the phone version (§7.4).

  durations[String(call.id)] = durationOf(clean);
  await fs.writeFile(DURATIONS_FILE, JSON.stringify(durations, null, 2) + "\n");

  const sizeMb = (await fs.stat(clean)).size / 1024 / 1024;
  console.log(`call ${call.id}: ${path.relative(ROOT, clean)} (${durations[call.id]}, ${sizeMb.toFixed(2)} MB)`);
  if (sizeMb > 3) console.warn(`  warning: call ${call.id} is over the 3 MB target`);
}

console.log("Done. Listen to every file before publishing.");
