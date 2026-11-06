// scripts/generate-calls.mjs
//
// Generates the four dramatized mock calls (PROMISELOOP_WEBSITE_BUILD.md §7.4–§7.5, Appendix A)
// as real two-voice dialogues with the ElevenLabs text-to-dialogue API. LOCAL ONLY: never import
// this file from the app, and never expose ELEVENLABS_API_KEY to the browser.
//
// Usage (from the repo root):
//   npm run generate:calls                 # all four calls
//   npm run generate:calls -- 3            # only call 3
//   npm run generate:calls -- --phone      # also write call-N-phone.mp3 (phone-band filter)
//   npm run generate:calls -- --dry-run    # no API calls: show request parts and character usage
//
//   (npm run generate:calls = node --env-file=.env.local scripts/generate-calls.mjs)
//
// Requires: Node 20.6+, `npm install` (ffmpeg comes from the ffmpeg-static devDependency, so no
// system ffmpeg is needed), and real voice IDs in content/voices.json (npm run voices:pick).
//
// Writes:
//   public/audio/call-N.mp3          clean dialogue, used by the site
//   public/audio/call-N-phone.mp3    only with --phone
//   content/call-durations.json      { "1": "2:41", ... }
//   content/call-timings.json        { "1": [{ "speaker": "CARTER", "start": 0, "end": 1.62 }, ...] }
//                                    one entry per line of content/mock-calls.json, in seconds
//   (both JSON files are merged, so a single-call run keeps the other calls)
//
// How timings work:
//   Each request goes to POST /v1/text-to-dialogue/with-timestamps, which returns the audio as
//   base64 plus `voice_segments`: [{ voice_id, start_time_seconds, end_time_seconds,
//   character_start_index, character_end_index, dialogue_input_index }]. dialogue_input_index
//   points at the `inputs` entry, i.e. our script line, so each line's start/end is the min/max
//   of its segments. A call longer than 2,000 characters is split at a speaker turn into parts;
//   each later part is offset by the exact duration of the parts before it (counted from the MP3
//   frames, see mp3Duration), then the parts are joined losslessly with ffmpeg's concat demuxer.
//
// API reference checked 2026-11-07 (elevenlabs.io/docs/api-reference/text-to-dialogue/convert and
// /convert-with-timestamps):
//   POST https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128
//   header xi-api-key; body { inputs: [{ text, voice_id }] (max 10 unique voices), model_id
//   (default "eleven_v3"), seed (0..4294967295, best effort), ...optional fields not used here }.
//   Keep total text per request at or under 2,000 characters. Response 200:
//   { audio_base64, voice_segments, alignment, normalized_alignment }. 422: { detail: [...] }.
//   Audio tags such as [sighs] are part of `text` and count toward the character limit.
//
// After generating: listen to every file. Check amounts, dates and ZIP codes are pronounced
// correctly; regenerate a call (npm run generate:calls -- N) if not. Rotate the API key that was
// shared in chat once generation is done.

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CALLS_FILE = path.join(ROOT, "content", "mock-calls.json");
const VOICES_FILE = path.join(ROOT, "content", "voices.json");
const DURATIONS_FILE = path.join(ROOT, "content", "call-durations.json");
const TIMINGS_FILE = path.join(ROOT, "content", "call-timings.json");
const OUT = path.join(ROOT, "public", "audio");
const TMP = path.join(ROOT, ".audio-tmp");

const API_URL = "https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128";
const MODEL_ID = "eleven_v3";
const DEFAULT_SEED = 4217;
const MAX_CHARS = 2000;
const PHONE_FILTER = "highpass=f=300,lowpass=f=3400,aresample=8000,aresample=44100,volume=1.1";

const args = process.argv.slice(2);
const FLAG_PHONE = args.includes("--phone");
const FLAG_DRY = args.includes("--dry-run");
const callArg = args.find((a) => !a.startsWith("--"));

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// ffmpeg: the ffmpeg-static devDependency, falling back to a system ffmpeg.

function resolveFfmpeg() {
  try {
    const p = createRequire(import.meta.url)("ffmpeg-static");
    if (p && existsSync(p)) return p;
  } catch {
    /* not installed */
  }
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return "ffmpeg";
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// MP3 duration from the frame headers (no ffprobe needed). Exact for CBR and VBR.

const BITRATES = {
  // [versionBits === 3 (MPEG1)] Layer III, else MPEG2/2.5 Layer III, kbps by index
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};
const SAMPLE_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

function mp3Duration(buf) {
  let i = 0;
  if (buf.length > 10 && buf.toString("latin1", 0, 3) === "ID3") {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    i = 10 + size + (buf[5] & 0x10 ? 10 : 0);
  }
  let seconds = 0;
  let first = true;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const version = (buf[i + 1] >> 3) & 0x03; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (buf[i + 1] >> 1) & 0x03; // 1 = Layer III
    const brIdx = (buf[i + 2] >> 4) & 0x0f;
    const srIdx = (buf[i + 2] >> 2) & 0x03;
    const pad = (buf[i + 2] >> 1) & 0x01;
    if (version === 1 || layer !== 1 || brIdx === 0 || brIdx === 15 || srIdx === 3) {
      i++;
      continue;
    }
    const sr = SAMPLE_RATES[version][srIdx];
    const kbps = BITRATES[version === 3 ? 1 : 2][brIdx];
    const samples = version === 3 ? 1152 : 576;
    const len = Math.floor(((samples / 8) * kbps * 1000) / sr) + pad;
    if (len < 4) {
      i++;
      continue;
    }
    // Skip a Xing/Info/VBRI header frame: it carries no audio.
    const isInfo =
      first && /Xing|Info|VBRI/.test(buf.toString("latin1", i + 4, Math.min(i + 4 + 40, buf.length)));
    if (!isInfo) seconds += samples / sr;
    first = false;
    i += len;
  }
  return seconds;
}

const fmt = (s) => {
  const r = Math.floor(s); // floor, to match the player's clock
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
};
const round2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Data

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (err) {
    if (fallback !== undefined) return fallback;
    fail(`Could not read ${path.relative(ROOT, file)}: ${err.message}`);
  }
}

const allCalls = await readJson(CALLS_FILE);
let calls = allCalls;
if (callArg !== undefined) {
  const id = Number(callArg);
  calls = allCalls.filter((c) => c.id === id);
  if (!Number.isInteger(id) || calls.length === 0) {
    fail(`Unknown call id "${callArg}". Valid ids: ${allCalls.map((c) => c.id).join(", ")}`);
  }
}

// Split at speaker turns so each request stays at or under MAX_CHARS of text. Parts are balanced
// (e.g. 1,311 + 1,311 rather than 1,998 + 624) so both halves carry enough context for the voices.
function greedy(lines, limit) {
  const parts = [];
  let cur = [];
  let len = 0;
  lines.forEach((l, index) => {
    if (len + l.text.length > limit && cur.length) {
      parts.push(cur);
      cur = [];
      len = 0;
    }
    cur.push({ ...l, index });
    len += l.text.length;
  });
  if (cur.length) parts.push(cur);
  return parts;
}

function chunk(lines) {
  const total = lines.reduce((n, l) => n + l.text.length, 0);
  const n = Math.ceil(total / MAX_CHARS);
  if (n <= 1) return greedy(lines, MAX_CHARS);
  const balanced = greedy(lines, Math.min(MAX_CHARS, Math.ceil(total / n) + 150));
  const fits = balanced.every((p) => p.reduce((s, l) => s + l.text.length, 0) <= MAX_CHARS);
  return balanced.length === n && fits ? balanced : greedy(lines, MAX_CHARS);
}

// ---------------------------------------------------------------------------
// Dry run: usage estimate, no key needed.

if (FLAG_DRY) {
  let total = 0;
  for (const call of calls) {
    const parts = chunk(call.lines);
    const chars = call.lines.reduce((n, l) => n + l.text.length, 0);
    total += chars;
    console.log(
      `call ${call.id} "${call.title}": ${call.lines.length} lines, ${chars} characters, ${parts.length} request(s) ` +
        `[${parts.map((p) => p.reduce((n, l) => n + l.text.length, 0)).join(" + ")}]`,
    );
  }
  console.log(`total: ${total} characters per full generation (audio tags included)`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Checks before spending any characters

const FFMPEG = resolveFfmpeg();
const needsFfmpeg = FLAG_PHONE || calls.some((c) => chunk(c.lines).length > 1);
if (needsFfmpeg && !FFMPEG) {
  fail("ffmpeg not found. Run `npm install` (it installs ffmpeg-static), or install ffmpeg on PATH.");
}

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  fail("ELEVENLABS_API_KEY is not set. Add it to .env.local and run: npm run generate:calls");
}

const voices = await readJson(VOICES_FILE);
const problems = [];
for (const call of calls) {
  const speakers = new Set(call.lines.map((l) => l.speaker));
  if (speakers.size > 10) problems.push(`call ${call.id}: more than 10 voices in one request`);
  for (const speaker of speakers) {
    const id = voices[speaker];
    if (typeof id !== "string" || id.trim() === "") {
      problems.push(`no voice ID for speaker ${speaker} (call ${call.id})`);
    } else if (id.trim().startsWith("<")) {
      problems.push(`speaker ${speaker} still has the placeholder ${id} (run npm run voices:pick)`);
    }
  }
  for (const [i, line] of call.lines.entries()) {
    if (line.text.length > MAX_CHARS) {
      problems.push(`call ${call.id} line ${i + 1}: ${line.text.length} characters, over ${MAX_CHARS}`);
    }
  }
}
if (problems.length) {
  fail(`Fix content/voices.json or content/mock-calls.json first:\n  - ${[...new Set(problems)].join("\n  - ")}`);
}

// ---------------------------------------------------------------------------
// Generation

async function synthesize(call, part, partNo, total) {
  const body = {
    model_id: MODEL_ID,
    seed: call.seed ?? DEFAULT_SEED,
    inputs: part.map((l) => ({ text: l.text, voice_id: voices[l.speaker].trim() })),
  };
  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    // Retry rate limits and server errors; anything else is a real problem.
    if (res.ok || (res.status !== 429 && res.status < 500)) break;
    console.warn(`  call ${call.id} part ${partNo}: HTTP ${res.status}, retrying (${attempt}/3)`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
  if (!res.ok) fail(`Call ${call.id} part ${partNo}/${total}: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (!json.audio_base64) fail(`Call ${call.id} part ${partNo}: response has no audio_base64`);
  return { audio: Buffer.from(json.audio_base64, "base64"), segments: json.voice_segments ?? [] };
}

// Per-line { start, end } for one part, from voice_segments (dialogue_input_index = line in part).
function lineTimes(part, segments, offset) {
  const times = part.map(() => ({ start: Infinity, end: -Infinity }));
  for (const s of segments) {
    const t = times[s.dialogue_input_index];
    if (!t) continue;
    t.start = Math.min(t.start, s.start_time_seconds);
    t.end = Math.max(t.end, s.end_time_seconds);
  }
  // A line with no segment (should not happen) takes the gap between its neighbours.
  times.forEach((t, i) => {
    if (Number.isFinite(t.start)) return;
    const prevEnd = i > 0 && Number.isFinite(times[i - 1].end) ? times[i - 1].end : 0;
    const next = times.slice(i + 1).find((n) => Number.isFinite(n.start));
    t.start = prevEnd;
    t.end = next ? next.start : prevEnd;
  });
  return part.map((l, i) => ({
    speaker: l.speaker,
    start: round2(times[i].start + offset),
    end: round2(times[i].end + offset),
  }));
}

const concatEntry = (file) => `file '${file.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`;

await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(TMP, { recursive: true });
const durations = await readJson(DURATIONS_FILE, {});
const timings = await readJson(TIMINGS_FILE, {});

for (const call of calls) {
  const parts = chunk(call.lines);
  const files = [];
  const callTimings = [];
  let offset = 0;

  for (const [i, part] of parts.entries()) {
    const { audio, segments } = await synthesize(call, part, i + 1, parts.length);
    const file = path.join(TMP, `call-${call.id}-${i + 1}.mp3`);
    await fs.writeFile(file, audio);
    files.push(file);
    callTimings.push(...lineTimes(part, segments, offset));
    offset += mp3Duration(audio);
    console.log(`call ${call.id} part ${i + 1}/${parts.length} done (${fmt(offset)} so far)`);
  }

  const clean = path.join(OUT, `call-${call.id}.mp3`);
  if (files.length === 1) {
    await fs.copyFile(files[0], clean);
  } else {
    const list = path.join(TMP, `call-${call.id}.txt`);
    await fs.writeFile(list, files.map(concatEntry).join("\n") + "\n");
    execFileSync(FFMPEG, ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", clean]);
  }

  if (FLAG_PHONE) {
    const phone = path.join(OUT, `call-${call.id}-phone.mp3`);
    execFileSync(FFMPEG, ["-y", "-v", "error", "-i", clean, "-af", PHONE_FILTER, "-b:a", "128k", phone]);
    // TODO: optional short ring at the start of the phone version (§7.4).
    console.log(`call ${call.id}: ${path.relative(ROOT, phone)}`);
  }

  const buf = await fs.readFile(clean);
  const seconds = mp3Duration(buf);
  durations[String(call.id)] = fmt(seconds);
  timings[String(call.id)] = callTimings;
  await fs.writeFile(DURATIONS_FILE, JSON.stringify(durations, null, 2) + "\n");
  await fs.writeFile(TIMINGS_FILE, JSON.stringify(timings, null, 2) + "\n");

  const mb = buf.length / 1024 / 1024;
  console.log(`call ${call.id}: ${path.relative(ROOT, clean)} (${fmt(seconds)}, ${mb.toFixed(2)} MB, ${callTimings.length} timed lines)`);
  if (mb > 3) console.warn(`  warning: call ${call.id} is over the 3 MB target`);
}

console.log("Done. Listen to every file before publishing.");
