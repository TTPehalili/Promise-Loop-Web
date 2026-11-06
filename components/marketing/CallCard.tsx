"use client";

// Mock-call dialogue player (brief §7, audio-first). One card per call:
// play/pause, the two people on the call with a live "now speaking" highlight driven by
// content/call-timings.json, a keyboard-operable scrub bar, elapsed/total time, the outcome,
// and a small "Transcript" link as the text alternative for the audio (WCAG 1.2.1).
//
// Only one call plays at a time: a module-level reference to the playing <audio> is shared by
// every card, and starting one pauses the other.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Check, Pause, Play } from "lucide-react";
import styles from "./CallCard.module.css";

let currentAudio: HTMLAudioElement | null = null;

const SEEK_STEP = 5;
const SPEAKER_HOLD = 0.6; // keep a speaker highlighted through short pauses between lines

export interface CallTiming {
  speaker: string;
  start: number;
  end: number;
}

export interface Participant {
  speaker: string;
  name: string;
  initials: string;
  role: string;
}

export interface CallCardProps {
  id: number;
  title: string;
  situation: string;
  outcome: string;
  audioSrc: string;
  hasAudio: boolean;
  /** "2:41" from content/call-durations.json, used until the audio's metadata loads. */
  duration: string | null;
  timings: CallTiming[] | null;
  rep: Participant;
  customer: Participant;
  labels: {
    play: string;
    pause: string;
    seek: string;
    /** Contains {elapsed} and {total}. */
    seekValueTemplate: string;
    comingSoon: string;
    nowSpeaking: string;
    participantsLabel: string;
    showTranscript: string;
    hideTranscript: string;
    transcriptLabel: string;
  };
  /** Server-rendered transcript, hidden until the link opens it. */
  transcript: ReactNode;
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function parseTime(value: string | null) {
  const m = value?.match(/^(\d+):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

function speakerAt(timings: CallTiming[] | null, t: number): string | null {
  if (!timings?.length) return null;
  let last: CallTiming | null = null;
  for (const line of timings) {
    if (line.start > t) break;
    last = line;
  }
  if (!last) return null;
  return t <= last.end + SPEAKER_HOLD ? last.speaker : null;
}

function Levels() {
  return (
    <span aria-hidden="true" className={`${styles.levels} text-mint`}>
      <span className={styles.bar} />
      <span className={styles.bar} />
      <span className={styles.bar} />
    </span>
  );
}

function ParticipantChip({
  person,
  active,
  disabled,
  nowSpeaking,
}: {
  person: Participant;
  active: boolean;
  disabled: boolean;
  nowSpeaking: string;
}) {
  return (
    <li className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-[box-shadow,border-color] duration-200 motion-reduce:transition-none ${
          active
            ? "border-transparent text-paper ring-2 ring-mint ring-offset-2 ring-offset-brand"
            : "border-paper/30 text-paper/90"
        } ${disabled ? "opacity-70" : ""}`}
      >
        {person.initials}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-medium leading-snug text-paper">{person.name}</span>
          {active && <Levels />}
          {active && <span className="sr-only">{nowSpeaking}</span>}
        </span>
        <span className="block text-sm text-paper/70">{person.role}</span>
      </span>
    </li>
  );
}

export function CallCard({
  id,
  title,
  situation,
  outcome,
  audioSrc,
  hasAudio,
  duration,
  timings,
  rep,
  customer,
  labels,
  transcript,
}: CallCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const dragging = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(() => parseTime(duration));
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  const available = hasAudio && !failed;
  const titleId = `call-${id}-title`;
  const transcriptId = `call-${id}-transcript`;

  // Audio events.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => {
      if (currentAudio && currentAudio !== audio) currentAudio.pause();
      currentAudio = audio;
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      audio.currentTime = 0;
      setTime(0);
    };
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setTotal(audio.duration);
      if (pendingSeek.current !== null) {
        audio.currentTime = pendingSeek.current;
        pendingSeek.current = null;
      }
    };
    const onTime = () => {
      if (!dragging.current) setTime(audio.currentTime);
    };
    const onError = () => {
      setFailed(true);
      setPlaying(false);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("error", onError);
      if (currentAudio === audio) {
        audio.pause();
        currentAudio = null;
      }
    };
  }, []);

  // Smooth progress and speaker changes while playing (timeupdate only fires about 4 times a second).
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !dragging.current) setTime(audio.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch((err: unknown) => {
        // A blocked play() is not a broken file; anything else switches to the unavailable state.
        if (!(err instanceof DOMException && err.name === "NotAllowedError")) setFailed(true);
      });
    } else {
      audio.pause();
    }
  };

  const seekTo = useCallback(
    (t: number) => {
      const audio = audioRef.current;
      const max = total || audio?.duration || 0;
      const next = Math.min(Math.max(0, t), max || 0);
      setTime(next);
      if (!audio) return;
      // preload="none": before anything loads, currentTime only sets the start position in some
      // browsers, so also re-apply it once metadata arrives.
      if (audio.readyState === 0) pendingSeek.current = next;
      audio.currentTime = next;
    },
    [total],
  );

  const onSliderKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: time + SEEK_STEP,
      ArrowUp: time + SEEK_STEP,
      ArrowLeft: time - SEEK_STEP,
      ArrowDown: time - SEEK_STEP,
      PageUp: time + 30,
      PageDown: time - 30,
      Home: 0,
      End: total,
    };
    if (e.key in moves) {
      e.preventDefault();
      seekTo(moves[e.key]);
    }
  };

  const timeFromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return time;
    return ((clientX - rect.left) / rect.width) * total;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!total) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setTime(timeFromPointer(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setTime(timeFromPointer(e.clientX));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    seekTo(timeFromPointer(e.clientX));
  };

  const progress = total > 0 ? Math.min(1, time / total) : 0;
  const active = available && (playing || time > 0) ? speakerAt(timings, time) : null;
  const elapsedText = formatTime(time);
  const totalText = total > 0 ? formatTime(total) : "--:--";

  return (
    <article aria-labelledby={titleId} className="rounded-xl border border-paper/15 bg-brand p-6">
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={toggle}
          disabled={!available}
          aria-label={available ? (playing ? labels.pause : labels.play) : `${labels.comingSoon}: ${title}`}
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-brand motion-reduce:transition-none ${
            available
              ? "bg-paper text-brand hover:bg-white"
              : "cursor-not-allowed border border-paper/25 text-paper/50"
          }`}
        >
          {playing ? (
            <Pause size={24} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Play size={24} strokeWidth={1.5} aria-hidden="true" className="translate-x-px" />
          )}
        </button>
        <div className="min-w-0">
          <h3 id={titleId} className="h3 text-paper">
            {title}
          </h3>
          <p className="small num mt-1 text-paper/70">{situation}</p>
        </div>
      </div>

      <ul aria-label={labels.participantsLabel} className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-4">
        <ParticipantChip
          person={rep}
          active={active === rep.speaker}
          disabled={!available}
          nowSpeaking={labels.nowSpeaking}
        />
        <ParticipantChip
          person={customer}
          active={active === customer.speaker}
          disabled={!available}
          nowSpeaking={labels.nowSpeaking}
        />
      </ul>

      <div className="mt-5">
        {available ? (
          <>
            <div
              role="slider"
              tabIndex={0}
              aria-label={labels.seek}
              aria-valuemin={0}
              aria-valuemax={Math.floor(total)}
              aria-valuenow={Math.floor(time)}
              aria-valuetext={labels.seekValueTemplate
                .replace("{elapsed}", elapsedText)
                .replace("{total}", totalText)}
              onKeyDown={onSliderKey}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => (dragging.current = false)}
              className="group relative flex h-11 cursor-pointer touch-none items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
            >
              <div ref={trackRef} className="relative h-1 w-full rounded-full bg-paper/20">
                <div className="absolute inset-y-0 left-0 rounded-full bg-mint" style={{ width: `${progress * 100}%` }} />
                <div
                  aria-hidden="true"
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper"
                  style={{ left: `${progress * 100}%` }}
                />
              </div>
            </div>
            <p aria-hidden="true" className="num -mt-1 flex justify-between text-sm text-paper/70">
              <span>{elapsedText}</span>
              <span>{totalText}</span>
            </p>
            <audio ref={audioRef} preload="none" src={audioSrc} />
          </>
        ) : (
          <div>
            <div aria-hidden="true" className="flex h-11 items-center">
              <div className="h-1 w-full rounded-full bg-paper/15" />
            </div>
            <p className="-mt-1 text-sm text-paper/70">{labels.comingSoon}</p>
          </div>
        )}
      </div>

      <p className="small mt-5 flex items-start gap-2 text-paper">
        <Check size={20} strokeWidth={1.5} aria-hidden="true" className="mt-px shrink-0 text-mint" />
        <span className="num">{outcome}</span>
      </p>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={transcriptId}
        className="mt-2 inline-flex min-h-[44px] items-center rounded-sm text-sm text-paper/70 underline decoration-paper/40 underline-offset-4 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
      >
        {open ? labels.hideTranscript : labels.showTranscript}
      </button>

      <div
        id={transcriptId}
        role="region"
        aria-label={labels.transcriptLabel}
        tabIndex={open ? 0 : -1}
        hidden={!open}
        className="mt-3 max-h-80 overflow-y-auto border-t border-paper/15 pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
      >
        {transcript}
      </div>
    </article>
  );
}
