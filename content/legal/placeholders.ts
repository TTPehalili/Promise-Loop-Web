// Resolves the [bracket] placeholders in content/legal/*.md before they render.
// Brief §0.6 and §12: bracket text must never ship. The markdown files stay as the
// counsel draft; this file decides what the public page says in the meantime.
//
// Every substitution below is a stand-in until counsel signs off. See `unresolvedForCounsel`.

export type LegalDoc = "privacy" | "terms";

// TODO: switch each address to its dedicated inbox (privacy@, security@, legal@, consumer line)
// once those inboxes exist. hello@promiseloop.com is the only live address today.
const HELLO = "[hello@promiseloop.com](mailto:hello@promiseloop.com)";

export const LAST_UPDATED = "November 7, 2026";

interface Substitution {
  find: string | RegExp;
  replace: string;
}

const shared: Substitution[] = [{ find: "[Month DD, 2026]", replace: LAST_UPDATED }];

const byDoc: Record<LegalDoc, Substitution[]> = {
  privacy: [
    // §6
    { find: " [confirm with provider terms]", replace: "" },
    // §9
    {
      find: " Client account data is kept for the length of the client relationship plus [X] years.",
      replace: "",
    },
    // §11 — TODO: dedicated consumer email / phone line
    { find: "[consumer email / phone]", replace: HELLO },
    // §12 — TODO: privacy@ inbox and a toll-free number
    { find: "email [privacy@promiseloop.com] or call [toll-free number].", replace: `email ${HELLO}.` },
    // §13 — the site runs no analytics
    {
      find: "[We use no advertising or tracking cookies. / List any analytics tool and how to opt out.]",
      replace: "We use no advertising or tracking cookies.",
    },
    // §16 — TODO: privacy@ inbox; DPO line removed until a DPO is named
    { find: /\n?Data Protection Officer \(Philippines\): \[Name, email\][^\n]*/, replace: "" },
    { find: "[privacy@promiseloop.com]", replace: HELLO },
  ],
  terms: [
    // §3
    { find: "[2] business days", replace: "2 business days" },
    // §5
    {
      find: "or within [X] days after a promise to pay we obtained",
      replace: "or within the period set in your Order after a promise to pay we obtained",
    },
    { find: "[15] days", replace: "15 days" },
    { find: "[1.5]%", replace: "1.5%" },
    // §6 — TODO: security@ inbox
    { find: "[security@promiseloop.com]", replace: HELLO },
    // §16 and §18
    { find: /\[30\] days/g, replace: "30 days" },
    { find: "[10] days", replace: "10 days" },
    // §17
    {
      find: /(## 17\. Governing law and disputes\n)[^\n]*(\n|$)/,
      replace:
        "$1These Terms are governed by the laws set out in your Order, and disputes will be resolved in the forum it names.$2",
    },
    // §20 — TODO: legal@ inbox
    { find: "[legal@promiseloop.com]", replace: HELLO },
  ],
};

/** What the public pages say in place of each counsel placeholder. Not rendered. */
export const unresolvedForCounsel: string[] = [
  "Both pages: [Month DD, 2026] set to November 7, 2026. Update on each published revision.",
  "Privacy §6: '[confirm with provider terms]' removed. Confirm every AI provider contract bars training on client data.",
  "Privacy §9: sentence 'Client account data is kept for the length of the client relationship plus [X] years.' removed. Counsel to set the retention period.",
  "Privacy §11: '[consumer email / phone]' set to hello@promiseloop.com. Replace with the consumer line when it exists.",
  "Privacy §12: '[privacy@promiseloop.com] or call [toll-free number]' set to hello@promiseloop.com; phone option dropped.",
  "Privacy §13: cookie bracket set to 'We use no advertising or tracking cookies.' Revisit if analytics is ever added.",
  "Privacy §16: '[privacy@promiseloop.com]' set to hello@promiseloop.com; 'Data Protection Officer (Philippines): [Name, email]' line removed until a DPO is registered.",
  "Terms §3: notice window [2] business days set to 2.",
  "Terms §5: fee tail '[X] days after a promise to pay' rewritten to 'the period set in your Order'. Counsel to set the period.",
  "Terms §5: payment terms [15] days and interest [1.5]% per month unbracketed.",
  "Terms §6: '[security@promiseloop.com]' set to hello@promiseloop.com.",
  "Terms §16: notice [30] days and cure [10] days unbracketed. Terms §18: change notice [30] days unbracketed.",
  "Terms §17: governing law, venue and arbitration replaced with 'governed by the laws set out in your Order ... the forum it names'. Counsel to choose state, courts or arbitration.",
  "Terms §20: '[legal@promiseloop.com]' set to hello@promiseloop.com.",
];

// `[` + letter/digit ... `]` not followed by `(` (markdown link text is allowed).
const LEFTOVER = /\[[A-Za-z0-9][^\]\n]*\](?!\()/;

/** Applies the substitutions and throws if any bracket placeholder is left. */
export function resolvePlaceholders(markdown: string, doc: LegalDoc): string {
  let out = markdown.replace(/\r\n/g, "\n");
  for (const { find, replace } of [...shared, ...byDoc[doc]]) {
    out = typeof find === "string" ? out.split(find).join(replace) : out.replace(find, replace);
  }
  const left = out.match(LEFTOVER);
  if (left) {
    const line = out.split("\n").find((l) => LEFTOVER.test(l)) ?? left[0];
    throw new Error(
      `content/legal/${doc}.md: unresolved placeholder ${left[0]} in: "${line.trim()}". ` +
        "Add a substitution in content/legal/placeholders.ts. Bracket text must never ship.",
    );
  }
  return out;
}
