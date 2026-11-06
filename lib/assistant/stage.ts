// Stage machine (brief §3.1). The server owns the stage: a cheap heuristic on
// each visitor message (before the model runs) plus tool calls (during the run).
import type { AssistantStage } from "./types";
import type { SessionState, VisitorRow } from "./store";

const RE = {
  buying:
    /\b(price|pricing|cost|costs|how much|fee|fees|quote|retainer|sign ?up|get started|start(ing)?|set ?up|onboard|integrat\w*|connect\w*|crm|dialer|demo|trial)\b|\$\s?\d|\b\d{2,}\s*(unpaid|open|past[- ]due|overdue|outstanding)?\s*(invoices|jobs|accounts|bills)\b|\bowed\b|\bwrite[- ]?offs?\b/i,
  notNow: /\b(not now|not yet|no thanks|no thank you|maybe later|later|not ready|not interested|i'?ll think|just looking|just browsing)\b/i,
  wantsDemo: /\b(book|schedule|demo|find a time|set (up )?a (call|meeting)|yes,? (please|let'?s)|sure|sounds good|let'?s do it)\b/i,
  done: /^(no|nope|nah|that'?s (all|it)|thanks?( you)?|thank you|all good|bye|goodbye|we'?re good|i'?m good|no,? (that'?s|thats) (all|it)|no thanks?)[\s.!]*$/i,
  human: /\b(real person|human|talk to (someone|a person|a human|sales|your team)|speak (to|with) (someone|a person)|call me|someone call)\b/i,
  calledAboutBill:
    /\b(you|someone|promiseloop)\b[^.?!]{0,40}\b(called|calling|call(ed)? me|left (me )?a (voicemail|message)|texted)\b[^.?!]{0,60}\b(bill|debt|owe|invoice|account|payment)\b|\b(stop calling me|harass\w*|i don'?t owe)\b/i,
  jobSeeker: /\b(job|jobs|hiring|career|careers|resume|cv|apply|position|vacanc\w+)\b.*\b(you|promiseloop|your company)\b|\bare you hiring\b/i,
  vendor: /\b(partnership|partner with|press|journalist|reporter|we (sell|offer)|our (agency|software|platform) (can|could|helps))\b/i,
  question: /\?\s*$|^(how|what|why|when|where|who|which|can|do|does|is|are|will|would|could)\b/i,
};

export const TOPICS: [RegExp, string][] = [
  [/\b(price|pricing|cost|how much|retainer|fee)\b/i, "pricing"],
  [/\b(agency|fdcpa|regulation f|reg f|legal|law|complian\w*|state rules?|massachusetts|consent|record\w*)\b/i, "compliance"],
  [/\b(how (does|do) (it|this|you) work|process|the loop|pipeline)\b/i, "how it works"],
  [/\b(start|setup|set up|onboard\w*|72 hours|get going)\b/i, "getting started"],
  [/\b(dialer|crm|integrat\w*|software|csv|api|webhook)\b/i, "connecting your tools"],
  [/\b(payment|pay link|card|money)\b/i, "how payments work"],
  [/\b(rep|reps|team|manila|philippines|rude|accent)\b/i, "the calling team"],
  [/\b(demo|book)\b/i, "the demo"],
];

export function detectTopic(text: string): string | null {
  for (const [re, topic] of TOPICS) if (re.test(text)) return topic;
  return null;
}

export type Classification = "prospect" | "called_about_bill" | "job_seeker" | "vendor";

export function classify(text: string): Classification {
  if (RE.calledAboutBill.test(text)) return "called_about_bill";
  if (RE.jobSeeker.test(text)) return "job_seeker";
  if (RE.vendor.test(text)) return "vendor";
  return "prospect";
}

export function canOfferDemo(state: SessionState) {
  return state.notNowTurn === undefined || state.turn - state.notNowTurn > 3;
}

function knownFacts(v: VisitorRow | null) {
  if (!v) return 0;
  return [v.trade, v.unpaidJobsEstimate, v.currentProcess, v.tools?.length ? v.tools : null].filter(
    (x) => x !== null && x !== undefined,
  ).length;
}

/**
 * Runs before the model on each visitor message. Mutates `state` (turn counters)
 * and returns the new stage plus an optional note for the model.
 */
export function advanceOnUserMessage(input: {
  stage: AssistantStage;
  state: SessionState;
  text: string;
  visitor: VisitorRow | null;
  isBookAction: boolean;
}): { stage: AssistantStage; hint?: string; classification: Classification } {
  const { state, text } = input;
  state.turn += 1;
  let stage: AssistantStage = input.stage;
  const classification = classify(text);
  let hint: string | undefined;

  if (stage === "CLOSED") stage = "ANSWER";

  if (input.isBookAction) return { stage: "BOOK", classification };

  if (classification !== "prospect" && stage !== "BOOK" && !state.booked) {
    const which =
      classification === "called_about_bill"
        ? "This looks like someone contacted about a bill, not a prospect"
        : classification === "job_seeker"
          ? "This looks like a job seeker"
          : "This looks like a vendor, partner or press contact";
    return { stage: "NOT_A_PROSPECT", classification, hint: `${which}. Give the one-line redirect only, if that's right.` };
  }

  if (RE.human.test(text)) {
    hint = "The visitor wants a person: hand off (ask for their email if you don't have it, then request_human).";
    return { stage: "HANDOFF", classification, hint };
  }

  const isQuestion = RE.question.test(text.trim());
  if (isQuestion) state.questionsAnswered += 1;

  if (RE.done.test(text.trim()) && state.turn > 1) {
    return {
      stage: "WRAP_UP",
      classification,
      hint:
        input.stage === "WRAP_UP"
          ? "The visitor is done. Close with the tagline and call close_conversation."
          : "The visitor may be done: recap in one sentence, confirm the next step, ask \"Anything else before you go?\"",
    };
  }

  if (RE.notNow.test(text) && (stage === "PIVOT" || stage === "BOOK")) {
    state.notNowTurn = state.turn;
    return { stage: "ANSWER", classification, hint: 'They said not now. Say "No problem." and keep helping. Offer to email the details instead.' };
  }

  switch (stage) {
    case "GREET":
      stage = isQuestion ? "ANSWER" : "DISCOVER";
      break;
    case "DISCOVER":
      if (isQuestion || knownFacts(input.visitor) >= 2) stage = "ANSWER";
      break;
    case "PIVOT":
      if (RE.wantsDemo.test(text)) {
        stage = "BOOK";
        hint = "They said yes to the demo: call get_demo_slots now.";
      } else stage = "ANSWER";
      break;
    case "HANDOFF":
    case "NOT_A_PROSPECT":
    case "WRAP_UP":
      stage = "ANSWER";
      break;
  }

  if (stage !== "BOOK" && /\b(book|schedule)\b.*\b(demo|call|time)\b|\bbook a demo\b|\bfind a time\b/i.test(text) && !state.booked) {
    stage = "BOOK";
    hint = "The visitor asked to book: call get_demo_slots now.";
  } else if (
    (stage === "ANSWER" || stage === "DISCOVER") &&
    canOfferDemo(state) &&
    !state.booked &&
    (RE.buying.test(text) || state.questionsAnswered >= 4) &&
    (state.lastPivotTurn === undefined || state.turn - state.lastPivotTurn > 2)
  ) {
    stage = "PIVOT";
    state.lastPivotTurn = state.turn;
    hint = "Buying signal: answer, then pivot to the demo tied to what they said.";
  }

  return { stage, hint, classification };
}

/** Quick-reply chips for the assistant message (max 4). */
export function chipsFor(stage: AssistantStage, state: SessionState): string[] {
  switch (stage) {
    case "DISCOVER":
      return ["How does it work?", "What does it cost?", "Is this a collection agency?"];
    case "ANSWER":
      return state.booked
        ? ["What should I bring?", "Talk to a person"]
        : canOfferDemo(state)
          ? ["Book a demo", "What does it cost?", "Talk to a person"]
          : ["Email me the details", "Talk to a person"];
    case "PIVOT":
      return ["Find a time", "Not now", "Email me the details"];
    case "BOOK":
      return state.slotsOffered?.length ? ["See more times"] : [];
    case "WRAP_UP":
      return ["No, that's all", "One more question"];
    default:
      return [];
  }
}
