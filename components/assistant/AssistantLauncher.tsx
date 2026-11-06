// Server component (brief §8.1). Renders the pill as static HTML; the only
// client code on first load is the tiny <AssistantLoader> island, which
// lazy-loads the panel on click (or prefetches it when the browser is idle).
import { MARK_RING_PATH, MARK_VIEWBOX } from "@/components/marketing/graphics/LoopMark";
import AssistantLoader from "./AssistantLoader";

export const ASSISTANT_PANEL_ID = "pl-assistant-panel";

export function AssistantLauncher() {
  return (
    <AssistantLoader panelId={ASSISTANT_PANEL_ID}>
      <button
        type="button"
        data-assistant-launcher=""
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls={ASSISTANT_PANEL_ID}
        aria-label="Ask PromiseLoop"
        className="inline-flex h-12 min-w-[48px] items-center justify-center gap-2 rounded-full bg-brand px-3 text-[15px] font-medium text-paper transition-colors duration-150 hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:pl-4 sm:pr-5"
      >
        <svg width={24} height={24} viewBox={MARK_VIEWBOX} fill="none" aria-hidden className="shrink-0">
          <path d={MARK_RING_PATH} strokeWidth={3.2} strokeLinecap="round" className="stroke-mint" />
        </svg>
        <span className="hidden sm:inline">Ask PromiseLoop</span>
      </button>
    </AssistantLoader>
  );
}

export default AssistantLauncher;
