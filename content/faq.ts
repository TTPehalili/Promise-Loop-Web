// FAQ copy for the homepage #faq section.
// Source of truth: PROMISELOOP_WEBSITE_BUILD.md §8. Compliance must approve any change.

export interface FaqLink {
  text: string;
  href: string;
}

export interface FaqItem {
  q: string;
  a: string;
  /** Rendered after the answer text, followed by a period. */
  link?: FaqLink;
}

export interface FaqGroup {
  label: string;
  items: FaqItem[];
}

export const faqGroups: FaqGroup[] = [
  {
    label: "Working with PromiseLoop",
    items: [
      {
        q: "What is PromiseLoop?",
        a: "PromiseLoop is an outsourcing company based in Manila, Philippines, providing collections as a service for service businesses in the USA. Our trained reps work as an extension of your office: under your company's name, on your dialer, texting and email. They follow up on your past-due accounts, get customers to commit to a payment date, and log every promise in a live pipeline. You confirm when the money arrives, and the loop is closed.",
      },
      {
        q: "Is PromiseLoop a collection agency?",
        a: "Not the way most owners mean it. We don't buy your accounts, take them over, sue anyone or report anyone to credit bureaus, and your customers stay your customers. We're your outsourced collections team, working your accounts with your tools and your rules. Because our reps call your customers on your behalf about money they owe, federal law treats those calls as third-party debt collection on consumer accounts, so we follow the FDCPA and the CFPB's Regulation F on every call. We set up each client under the rules of their state, and of any other state their customers live in.",
      },
      {
        q: "How is this different from sending accounts to an agency?",
        a: "An agency takes the account and often the relationship. We work inside your process instead: early, before accounts go stale, in your name, with every call visible to you. Accounts never leave your hands. You set the payment-plan limits, and you can pause or take back any account at any time.",
      },
      {
        q: "Do I need to change my software?",
        a: "No. We connect your dialer, texting, email and CRM to PromiseLoop, so we work in the tools you already use. You can also upload a CSV or invoice PDFs.",
      },
      {
        q: "Do you take payments from my customers?",
        a: "No. We never handle money or card numbers. Your reps send customers your own payment link, or tell them how to pay your office. Payments go straight to you.",
      },
      {
        q: "Who makes the calls, and where are they?",
        a: "Your dedicated reps on PromiseLoop's team in Manila, Philippines, working your US business hours. If a customer asks where we're calling from, we tell them the truth.",
      },
      {
        q: "Will you be rude to my customers?",
        a: "No. Your reps are firm and respectful, and they're trained to protect the relationship you've built. Hear four example calls above.",
      },
      {
        q: "What does it cost?",
        a: "Two parts. A monthly retainer, quoted for the size of team you need, covers your dedicated reps, their training and quality checks. On top of that, we earn 5% of the payments you confirm, so we only do well when you get paid. We call through your own dialer, so customers see your company's number and every call stays in your phone records. No setup fee.",
      },
      {
        q: "How fast can we start?",
        a: "Most clients have their first calls going out within 72 hours of signing, sending their first batch of accounts and giving us dialer access.",
      },
    ],
  },
  {
    label: "Calling by the rules",
    items: [
      {
        q: "What do your reps say at the start of a call?",
        a: "They open as part of your team: \"This is Ana, calling for Lone Star HVAC with PromiseLoop.\" They tell the customer the call is recorded and confirm they're speaking with the right person before mentioning any bill. On consumer accounts they give the required notice: \"This is an attempt to collect a debt, and any information obtained will be used for that purpose.\" Then they explain what the bill is for and where your company is based.",
      },
      {
        q: "What hours do you call?",
        a: "Only between 8 a.m. and 9 p.m. in the customer's local time, and never at a time the customer says is inconvenient. PromiseLoop blocks calls outside those hours, even on your dialer.",
      },
      {
        q: "How often do you call?",
        a: "No more than 7 call attempts in 7 days per account, and no repeat call within 7 days after a conversation. Stricter state limits apply automatically, such as 2 calls in 7 days for Massachusetts customers.",
      },
      {
        q: "Which state's rules do you follow?",
        a: "Federal rules on every call, plus the collection rules of the state your business operates in. If a customer lives in a different state, we also follow that state's rules, because the law protects customers where they live. Most of your customers are in your service area, so in practice it's usually the same state.",
      },
      {
        q: "Do you use robocalls or autodialers?",
        a: "No. Your dialer is set to manual for our reps, and a person places every call. No prerecorded or artificial-voice messages on real customer calls.",
      },
      {
        q: "Do you call customers at work?",
        a: "Not if they ask us not to, or if we know their employer doesn't allow it. We note it on the account, and the system enforces it.",
      },
      {
        q: "What happens if a customer disputes the bill?",
        a: "We pause the account right away and send the dispute to you. You provide the supporting documents, the customer gets verification, and we resume only after it's resolved.",
      },
      {
        q: "What if a customer asks us to stop calling?",
        a: "We stop. Customers can also limit how we reach them, such as \"evenings only\" or \"email only\", and we follow it.",
      },
      {
        q: "Do you threaten lawsuits or credit reporting?",
        a: "Never. We don't sue, report to credit bureaus, or threaten either. We don't invent deadlines or add fees your agreement with the customer doesn't allow.",
      },
      {
        q: "Do you text or email my customers?",
        a: "Yes, through your own tools. We connect your dialer, texting and email to PromiseLoop, so every call, text and email goes out from your business numbers and addresses and is logged in one place. Every email includes an easy way to opt out. We text only customers who have agreed to receive texts, and replying STOP ends them right away.",
      },
      {
        q: "What do you say in voicemails?",
        a: "Only the rep's first name, a business name and a callback number. No details about any bill, in case someone else hears it.",
      },
      {
        q: "Do you record calls?",
        a: "Yes, for quality and accuracy, and every customer hears that at the start of the call. Some states require everyone on a call to agree to recording.",
      },
      {
        q: "What about my business customers?",
        a: "The same respect and the same hours. Some consumer-only rules, like the debt collection notice, don't apply to commercial accounts, but our standards don't change.",
      },
      {
        q: "What written notice do customers get?",
        a: "After the first conversation, customers receive a written notice with the amount owed, who it's owed to, and how to dispute it, as Regulation F requires.",
      },
      {
        q: "Is my data secure?",
        a: "Yes. Data is encrypted in transit and at rest, access is limited by role, and every call, text and note is logged.",
        link: { text: "See our Privacy Policy", href: "/privacy" },
      },
    ],
  },
];

/** Small, muted, under the FAQ. */
export const faqFinePrint =
  "PromiseLoop provides outsourced accounts receivable calling services designed to support compliance with the FDCPA, Regulation F, the TCPA and applicable state laws. You remain responsible for the accuracy and validity of the accounts you send us. This is not legal advice.";
