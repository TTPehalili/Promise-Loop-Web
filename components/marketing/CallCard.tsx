"use client";

// Mock-call card with one Listen button and a transcript toggle (brief §7.2–§7.3).
// Only one call plays at a time: a module-level reference to the playing <audio>
// is shared by every card, and starting one pauses the other.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Pause, Play } from "lucide-react";

let currentAudio: HTMLAudioElement | null = null;

export interface CallCardProps {
  id: number;
  title: string;
  situation: string;
  rep: string;
  outcome: string;
  audioSrc: string;
  hasAudio: boolean;
  duration: string | null;
  labels: {
    listen: string;
    ariaListen: string;
    repPrefix: string;
    showTranscript: string;
    hideTranscript: string;
  };
  /** Server-rendered transcript, hidden until the toggle opens it. */
  transcript: ReactNode;
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function CallCard({
  id,
  title,
  situation,
  rep,
  outcome,
  audioSrc,
  hasAudio,
  duration,
  labels,
  transcript,
}: CallCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [shownDuration, setShownDuration] = useState(duration);

  const transcriptId = `call-${id}-transcript`;
  const titleId = `call-${id}-title`;
  const showListen = hasAudio && !failed;

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
      setProgress(0);
      audio.currentTime = 0;
    };
    const onTime = () => {
      if (audio.duration > 0) setProgress(audio.currentTime / audio.duration);
    };
    const onMeta = () => {
      if (!duration && Number.isFinite(audio.duration)) setShownDuration(formatTime(audio.duration));
    };
    const onError = () => {
      setFailed(true);
      setPlaying(false);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("error", onError);
      if (currentAudio === audio) {
        audio.pause();
        currentAudio = null;
      }
    };
  }, [duration]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch((err: unknown) => {
        // A blocked autoplay is not a broken file; anything else hides the button.
        if (!(err instanceof DOMException && err.name === "NotAllowedError")) setFailed(true);
      });
    } else {
      audio.pause();
    }
  };

  return (
    <article
      aria-labelledby={titleId}
      className="relative overflow-hidden rounded-xl border border-paper/15 bg-brand p-6"
    >
      <h3 id={titleId} className="h3 text-paper">
        {title}
      </h3>
      <p className="small num mt-2 text-paper/70">{situation}</p>
      <p className="small mt-4 text-paper">
        <span className="text-paper/70">{labels.repPrefix}</span> {rep}
      </p>

      {showListen && (
        <>
          <button
            type="button"
            onClick={toggle}
            aria-label={labels.ariaListen}
            aria-pressed={playing}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-paper px-4 py-2 font-medium text-brand transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
          >
            {playing ? (
              <Pause size={20} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Play size={20} strokeWidth={1.5} aria-hidden="true" />
            )}
            {/* Text stays "Listen" so the visible label matches the accessible name; aria-pressed carries the state. */}
            <span>{labels.listen}</span>
            {shownDuration && <span className="num text-sm text-brand/70">{shownDuration}</span>}
          </button>
          <audio ref={audioRef} preload="none" src={audioSrc} />
        </>
      )}

      <p className="small mt-5 flex items-start gap-2 text-paper">
        <Check size={20} strokeWidth={1.5} aria-hidden="true" className="mt-px shrink-0 text-mint" />
        <span className="num">{outcome}</span>
      </p>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={transcriptId}
        className="small mt-4 inline-flex min-h-[44px] items-center rounded-sm text-paper underline underline-offset-4 hover:text-white focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
      >
        {open ? labels.hideTranscript : labels.showTranscript}
      </button>

      <div
        id={transcriptId}
        role="region"
        aria-label={`${title} transcript`}
        tabIndex={open ? 0 : -1}
        hidden={!open}
        className="mt-4 max-h-96 overflow-y-auto border-t border-paper/15 pt-4 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
      >
        {transcript}
      </div>

      {showListen && (
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5">
          <div
            className="h-full origin-left bg-mint transition-transform duration-200 ease-linear motion-reduce:transition-none"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      )}
    </article>
  );
}
