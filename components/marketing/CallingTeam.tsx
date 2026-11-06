// Hear the calling team (brief §6.7, §7). Dark section, server component.
// Checks per call whether public/audio/call-N.mp3 exists; a missing file means
// no Listen button, transcript only (§7.3).
import fs from "node:fs";
import path from "node:path";
import { callingTeam } from "@/content/site";
import durations from "@/content/call-durations.json";
import { BanknotePattern } from "@/components/marketing/graphics/BanknotePattern";
import { CallCard } from "@/components/marketing/CallCard";
import { Transcript } from "@/components/marketing/Transcript";

const durationMap = durations as Record<string, string | undefined>;

function audioExists(src: string) {
  return fs.existsSync(path.join(process.cwd(), "public", src.replace(/^\//, "")));
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
            return (
              <CallCard
                key={card.id}
                id={card.id}
                title={card.title}
                situation={card.situation}
                rep={card.rep}
                outcome={card.outcome}
                audioSrc={card.audioSrc}
                hasAudio={hasAudio}
                duration={hasAudio ? (durationMap[String(card.id)] ?? card.duration) : null}
                labels={{
                  listen: player.listen,
                  ariaListen: player.ariaListenTemplate
                    .replace("{id}", String(card.id))
                    .replace("{title}", card.title),
                  repPrefix: player.repPrefix,
                  showTranscript: player.showTranscript,
                  hideTranscript: player.hideTranscript,
                }}
                transcript={<Transcript callId={card.id} />}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
