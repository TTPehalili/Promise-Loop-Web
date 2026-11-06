// Hear the calling team (brief §6.7, §7). Dark section, server component.
// Audio-first: each card is a two-voice dialogue player. Per call it checks whether
// public/audio/call-N.mp3 exists; until it does, the card shows a disabled "Audio coming soon"
// player (the card and its transcript stay). Duration and per-line speaker timings come from
// content/call-durations.json and content/call-timings.json, written by scripts/generate-calls.mjs.
import fs from "node:fs";
import path from "node:path";
import { callingTeam } from "@/content/site";
import durations from "@/content/call-durations.json";
import timingsFile from "@/content/call-timings.json";
import mockCalls from "@/content/mock-calls.json";
import { BanknotePattern } from "@/components/marketing/graphics/BanknotePattern";
import { CallCard, type CallTiming } from "@/components/marketing/CallCard";
import { Transcript } from "@/components/marketing/Transcript";

const durationMap = durations as Record<string, string | undefined>;
const timingMap = timingsFile as Record<string, CallTiming[] | undefined>;
const lineCounts = new Map((mockCalls as { id: number; lines: unknown[] }[]).map((c) => [c.id, c.lines.length]));

function audioExists(src: string) {
  return fs.existsSync(path.join(process.cwd(), "public", src.replace(/^\//, "")));
}

/** Timings only count if they match the current script, line for line. */
function timingsFor(id: number) {
  const t = timingMap[String(id)];
  return Array.isArray(t) && t.length === lineCounts.get(id) ? t : null;
}

export function CallingTeam() {
  const { anchor, eyebrow, h2, body, label, cards, player } = callingTeam;
  const headingId = `${anchor}-heading`;

  return (
    <section
      id={anchor}
      aria-labelledby={headingId}
      className="section relative overflow-hidden bg-brand text-paper"
    >
      <BanknotePattern />
      <div className="container-site relative">
        <div className="max-w-3xl">
          {/* Gold, not mint: mint on brand is about 4.1:1, under AA for 13px text. Gold is 5.0:1. */}
          <p className="eyebrow text-gold">{eyebrow}</p>
          <h2 id={headingId} className="h2 mt-3 text-paper">
            {h2}
          </h2>
          <p className="body mt-5 text-paper/80">{body}</p>
        </div>

        <p className="small mt-10 text-paper/70">{label}</p>

        <div className="mt-4 grid items-start gap-6 md:grid-cols-2">
          {cards.map((card) => {
            const hasAudio = audioExists(card.audioSrc);
            const fill = (tpl: string) => tpl.replace("{id}", String(card.id)).replace("{title}", card.title);
            return (
              <CallCard
                key={card.id}
                id={card.id}
                title={card.title}
                situation={card.situation}
                outcome={card.outcome}
                audioSrc={card.audioSrc}
                hasAudio={hasAudio}
                duration={hasAudio ? (durationMap[String(card.id)] ?? card.duration) : null}
                timings={hasAudio ? timingsFor(card.id) : null}
                rep={{ ...card.rep, role: player.repRole }}
                customer={{ ...card.customer, role: player.customerRole }}
                labels={{
                  play: fill(player.ariaPlayTemplate),
                  pause: fill(player.ariaPauseTemplate),
                  seek: fill(player.ariaSeekTemplate),
                  seekValueTemplate: player.seekValueTemplate,
                  comingSoon: player.comingSoon,
                  nowSpeaking: player.nowSpeaking,
                  participantsLabel: player.participantsLabel,
                  showTranscript: player.showTranscript,
                  hideTranscript: player.hideTranscript,
                  transcriptLabel: fill(player.transcriptLabelTemplate),
                }}
                transcript={
                  <Transcript
                    callId={card.id}
                    names={{ [card.rep.speaker]: card.rep.name, [card.customer.speaker]: card.customer.name }}
                  />
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
