"use client";

// 6.5 How it works: the demo video and its three chapters (steps 01–03).
// lg+: chapters left (5fr), video right (7fr). md: video full width, chapters in three
// columns underneath. Mobile: video, then the chapters stacked.
// Click-to-play (the video has narration, so it never autoplays); preload="none" keeps the
// 5 MB file off the page until someone asks for it. A chapter seeks the video and plays;
// while the video plays, the current chapter's top rule fills with mint as its progress bar.
import { useCallback, useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import type { HowStep } from "@/content/site";
import { howItWorks } from "@/content/site";

const { video: copy } = howItWorks;

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function HowItWorksDemo({ steps }: { steps: readonly HowStep[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setTime(v.currentTime);
    const onEnded = () => setTime(null);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeked", onTime);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeked", onTime);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

  const play = useCallback((from?: number) => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    if (from !== undefined) {
      // With preload="none" the position can only be set once metadata has loaded.
      const seek = () => {
        v.currentTime = from;
        setTime(from);
      };
      if (v.readyState >= 1) seek();
      else v.addEventListener("loadedmetadata", seek, { once: true });
      // On small screens the video sits above the chapters: bring it into view.
      const r = v.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        v.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      }
    }
    v.play().catch(() => {
      /* blocked or interrupted: the native controls are showing now */
    });
  }, []);

  const activeIndex = time === null ? -1 : steps.findIndex((s) => time >= s.chapter.start && time < s.chapter.end);

  return (
    <div className="mt-12 grid grid-cols-1 gap-10 md:mt-14 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-center lg:gap-14">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-brand">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full"
          src={copy.src}
          poster={copy.poster}
          preload="none"
          playsInline
          controls={started}
          aria-label={copy.label}
        >
          <track kind="captions" src={copy.captions} srcLang="en" label="English" />
        </video>
        {!started && (
          <button
            type="button"
            onClick={() => play()}
            className={`group absolute inset-0 flex items-end justify-center rounded-xl pb-[5%] sm:pb-[15%] ${focusRing} focus-visible:ring-inset focus-visible:ring-offset-0`}
          >
            {/* The whole video is the tap target; the pill is the visible cue. It sits under the
                poster's headline (on phones, near the bottom, smaller, so it clears the headline). */}
            <span className="inline-flex items-center gap-2 rounded-full bg-paper py-1 pl-1 pr-4 text-brand transition-colors duration-150 group-hover:bg-white sm:min-h-[44px] sm:gap-3 sm:py-1.5 sm:pl-1.5 sm:pr-5">
              <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-paper sm:h-9 sm:w-9">
                <Play size={14} strokeWidth={1.5} className="translate-x-px fill-current" />
              </span>
              <span className="text-sm font-medium sm:text-[15px]">{copy.playLabel}</span>
              <span className="num text-sm text-ink-muted sm:text-[15px]">{copy.duration}</span>
            </span>
          </button>
        )}
      </div>

      <ol className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8 lg:order-first lg:grid-cols-1 lg:gap-0">
        {steps.map((s, i) => {
          const active = i === activeIndex;
          const progress = active && time !== null ? (time - s.chapter.start) / (s.chapter.end - s.chapter.start) : 0;
          return (
            <li key={s.number} className="group relative pt-5 lg:py-5">
              {/* Top rule doubles as this chapter's progress bar. */}
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-line">
                <span
                  className="absolute -top-px left-0 h-[3px] rounded-full bg-mint transition-[width] duration-300 ease-linear"
                  style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                />
              </span>
              {/* One row (number, title, time) on phones and desktop; on tablet's narrow
                  three-column row the title drops below the number and time. */}
              {/* Number and time take the title's line height (h3: 18px/1.4, 20px/1.4 from md)
                  so they line up with its first line when the title wraps. */}
              <div className="flex items-start gap-x-3 md:flex-wrap md:gap-y-3 lg:flex-nowrap">
                <span
                  aria-hidden="true"
                  className={`num w-6 shrink-0 text-sm font-semibold leading-[25px] md:leading-[28px] transition-colors duration-150 ${active ? "text-mint-ink" : "text-ink-muted"}`}
                >
                  {s.number}
                </span>
                <h3 className="h3 min-w-0 flex-1 md:order-last md:basis-full lg:order-none lg:basis-auto">
                  <button
                    type="button"
                    onClick={() => play(s.chapter.start)}
                    aria-current={active ? "step" : undefined}
                    className={`rounded text-left underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline ${focusRing}`}
                  >
                    {s.title}
                    <span className="sr-only">
                      {" "}
                      Play this part of the demo, from {clock(s.chapter.start)}.
                    </span>
                  </button>
                </h3>
                <span
                  aria-hidden="true"
                  className={`small ml-auto inline-flex h-[25px] shrink-0 items-center gap-1.5 md:h-[28px] transition-colors duration-150 ${
                    active ? "font-medium text-mint-ink" : "text-ink-muted group-hover:text-ink"
                  }`}
                >
                  {active ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                      {copy.playingLabel}
                    </>
                  ) : (
                    <>
                      <Play size={12} strokeWidth={1.5} className="fill-current" />
                      <span className="num">{clock(s.chapter.start)}</span>
                    </>
                  )}
                </span>
              </div>
              <p className="mt-2 text-base leading-relaxed text-ink-muted">{s.body}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
