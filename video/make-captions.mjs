/**
 * Builds public/promiseloop-demo.vtt (captions for public/promiseloop-demo.mp4).
 *
 * Sources, so the captions match what is actually heard:
 *   - Voiceover lines and start times: the CLIPS list in video/generate-audio.mjs
 *   - Voiceover clip lengths: video/audio/vo-*.mp3 (read with ffmpeg)
 *   - Call excerpts: content/mock-calls.json + content/call-timings.json (call 1),
 *     cut and placed exactly as in video/render-demo.mjs (CALL_CUTS below)
 *
 * Usage: node video/make-captions.mjs   (re-run after re-rendering the video)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public", "promiseloop-demo.vtt");

// Keep in step with the call atrim/adelay filters in render-demo.mjs.
const CALL_ID = "1";
const CALL_CUTS = [
  { srcStart: 44.96, srcEnd: 55.44, at: 28.6 },
  { srcStart: 120.04, srcEnd: 125.08, at: 40.5 },
];
const SPEAKER_LABEL = { ANA: "Ana", CARTER: "Customer" };
const MAX_CUE_CHARS = 84; // about two lines of 42

const stripTags = (s) => s.replace(/\[[^\]]*\]\s*/g, "").replace(/\s+/g, " ").trim();

function voClips() {
  const src = fs.readFileSync(path.join(__dirname, "generate-audio.mjs"), "utf8");
  const re = /file:\s*'([^']+)',\s*start:\s*([\d.]+),[\s\S]*?text:\s*"((?:[^"\\]|\\.)*)"/g;
  const clips = [];
  for (const m of src.matchAll(re)) clips.push({ file: m[1], start: Number(m[2]), text: stripTags(m[3]) });
  if (!clips.length) throw new Error("No voiceover clips found in generate-audio.mjs");
  return clips;
}

function mediaDuration(file) {
  const r = spawnSync(ffmpegPath, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr);
  if (!m) throw new Error(`Could not read duration of ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** Splits text into readable chunks (sentences, then clauses) and spreads the time by length. */
function splitCue(start, end, text, prefix = "") {
  const pieces = [];
  // Sentence ends only where the punctuation is followed by a space (keeps "promiseloop.com" whole).
  const sentences = text.split(/(?<=[.!?…])\s+/).filter(Boolean);
  const halve = (s) => {
    if (s.length <= MAX_CUE_CHARS) return [s];
    // Break near the middle, preferring a clause boundary (", " or "—") over a plain space.
    const mid = s.length / 2;
    const near = (re) => {
      let best = -1;
      for (const m of s.matchAll(re)) if (best < 0 || Math.abs(m.index - mid) < Math.abs(best - mid)) best = m.index;
      return best;
    };
    const clause = near(/, |—/g);
    const cut = clause > 0 && Math.abs(clause - mid) < s.length * 0.25 ? clause + 1 : near(/ /g);
    return [...halve(s.slice(0, cut).trim()), ...halve(s.slice(cut).trim())];
  };
  for (const sentence of sentences) pieces.push(...halve(sentence.trim()));
  // Merge short neighbours back together while they fit.
  const merged = [];
  for (const p of pieces) {
    const last = merged[merged.length - 1];
    if (last && last.length + 1 + p.length <= MAX_CUE_CHARS) merged[merged.length - 1] = `${last} ${p}`;
    else merged.push(p);
  }
  const total = merged.reduce((n, p) => n + p.length, 0);
  let t = start;
  return merged.map((p, i) => {
    const d = ((end - start) * p.length) / total;
    const cue = { start: t, end: i === merged.length - 1 ? end : t + d, text: (i === 0 ? prefix : "") + p };
    t += d;
    return cue;
  });
}

const stamp = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = ((ms % 60000) / 1000).toFixed(3).padStart(6, "0");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${sec}`;
};

const cues = [];
for (const clip of voClips()) {
  const end = clip.start + mediaDuration(path.join(__dirname, "audio", clip.file));
  cues.push(...splitCue(clip.start, end, clip.text));
}

const timings = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "call-timings.json"), "utf8"))[CALL_ID];
const call = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "mock-calls.json"), "utf8")).find((c) => String(c.id) === CALL_ID);
for (const cut of CALL_CUTS) {
  timings.forEach((t, i) => {
    if (t.end <= cut.srcStart || t.start >= cut.srcEnd) return;
    const s = cut.at + Math.max(t.start, cut.srcStart) - cut.srcStart;
    const e = cut.at + Math.min(t.end, cut.srcEnd) - cut.srcStart;
    const label = SPEAKER_LABEL[t.speaker] ?? t.speaker;
    cues.push(...splitCue(s, e, stripTags(call.lines[i].text).replace(/^\.\.\./, ""), `${label}: `));
  });
}

cues.sort((a, b) => a.start - b.start);
// Clip lengths include trailing silence: end each cue no later than the next one starts.
for (let i = 0; i < cues.length - 1; i++) cues[i].end = Math.min(cues[i].end, cues[i + 1].start);
const vtt = ["WEBVTT", "", ...cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`)].join("\n");
fs.writeFileSync(OUT, vtt);
console.log(`Wrote ${cues.length} cues to ${path.relative(ROOT, OUT)}`);
