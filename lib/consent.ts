// Client-side cookie consent store (cookie notice, privacy policy §13).
// Today the site sets only essential cookies, so `analytics` and `marketing` are unused
// and off by default. Future scripts must be gated: `if (hasConsent("analytics")) load()`
// and listen for the `consentchange` window event to react to changes.
//
// Stored in the first-party cookie `pl_consent` (JSON, 12 months, SameSite=Lax, Secure on
// https, path=/). Not httpOnly: the client has to read it. Bump CONSENT_VERSION when the
// cookie list in the privacy policy changes so the notice shows again.
// Global Privacy Control (navigator.globalPrivacyControl) forces analytics and marketing off.

export type ConsentCategory = "essential" | "analytics" | "marketing";
export type OptionalCategory = Exclude<ConsentCategory, "essential">;

export interface Consent {
  /** Policy version the choice was made under. */
  v: number;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  /** When the choice was saved (ms since epoch). */
  ts: number;
}

export const CONSENT_COOKIE = "pl_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_EVENT = "consentchange";
/** Fired by the footer "Cookie preferences" link to reopen the notice. */
export const CONSENT_OPEN_EVENT = "pl:consent-open";
const MAX_AGE = 365 * 24 * 60 * 60; // 12 months

const isBrowser = () => typeof document !== "undefined";

export function gpcEnabled(): boolean {
  return isBrowser() && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

/** The saved choice, or null if none, unreadable, or made under an older policy version. */
export function getConsent(): Consent | null {
  if (!isBrowser()) return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!raw) return null;
  try {
    const c = JSON.parse(decodeURIComponent(raw.slice(CONSENT_COOKIE.length + 1))) as Partial<Consent>;
    if (c.v !== CONSENT_VERSION) return null;
    const gpc = gpcEnabled();
    return {
      v: CONSENT_VERSION,
      essential: true,
      analytics: !gpc && c.analytics === true,
      marketing: !gpc && c.marketing === true,
      ts: Number(c.ts) || 0,
    };
  } catch {
    return null;
  }
}

/** Saves a choice. Essential is always on; GPC forces the optional categories off. */
export function setConsent(choice: Partial<Record<OptionalCategory, boolean>> = {}): Consent {
  const gpc = gpcEnabled();
  const consent: Consent = {
    v: CONSENT_VERSION,
    essential: true,
    analytics: !gpc && choice.analytics === true,
    marketing: !gpc && choice.marketing === true,
    ts: Date.now(),
  };
  if (isBrowser()) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
  }
  return consent;
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === "essential") return true;
  return getConsent()?.[category] === true;
}

/** Reopens the cookie notice in its preferences view. */
export function openConsentPreferences(): void {
  if (isBrowser()) window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
