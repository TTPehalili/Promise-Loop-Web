// Transcript of a mock call: the text alternative for the prerecorded audio (WCAG 1.2.1).
// Server component. Speaker labels bold (display names from the card), [audio tags] stripped.
// Opened from the small "Transcript" link on each CallCard.
import mockCalls from "@/content/mock-calls.json";

interface CallLine {
  speaker: string;
  text: string;
}

const titleCase = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
const stripTags = (text: string) => text.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();

export function Transcript({ callId, names = {} }: { callId: number; names?: Record<string, string> }) {
  const call = (mockCalls as { id: number; lines: CallLine[] }[]).find((c) => c.id === callId);
  if (!call) return null;
  const lines = call.lines
    .map((l) => ({ speaker: names[l.speaker] ?? titleCase(l.speaker), text: stripTags(l.text) }))
    .filter((l) => l.text.length > 0);

  return (
    <dl className="small space-y-3 text-paper">
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[6.5rem_1fr] gap-3">
          <dt className="font-semibold">{l.speaker}</dt>
          <dd className="text-paper/90">{l.text}</dd>
        </div>
      ))}
    </dl>
  );
}
