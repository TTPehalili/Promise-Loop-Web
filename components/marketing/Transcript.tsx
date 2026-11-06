// Transcript of a mock call (brief §7.3). Server component: speaker labels bold,
// [audio tags] stripped. Rendered into each CallCard and shown by its toggle.
import mockCalls from "@/content/mock-calls.json";

interface CallLine {
  speaker: string;
  text: string;
}

const titleCase = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
const stripTags = (text: string) => text.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();

export function Transcript({ callId }: { callId: number }) {
  const call = (mockCalls as { id: number; lines: CallLine[] }[]).find((c) => c.id === callId);
  if (!call) return null;
  const lines = call.lines
    .map((l) => ({ speaker: titleCase(l.speaker), text: stripTags(l.text) }))
    .filter((l) => l.text.length > 0);

  return (
    <dl className="small space-y-3 text-paper">
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[4.5rem_1fr] gap-3">
          <dt className="font-semibold">{l.speaker}</dt>
          <dd className="text-paper/90">{l.text}</dd>
        </div>
      ))}
    </dl>
  );
}
