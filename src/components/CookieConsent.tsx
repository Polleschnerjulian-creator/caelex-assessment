"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";

const CONSENT_KEY = "caelex-cookie-consent";
const SESSION_KEY = "caelex-cookie-consent-session";

/* Compliance-Audit 2026-05 — DSGVO Art. 7 Abs. 1 Nachweispflicht.
   Bump CONSENT_VERSION whenever the banner copy changes materially
   (e.g. a new sub-processor lands in /legal/sub-processors). Each
   bump invalidates the localStorage record and re-prompts the user;
   the prior decision stays in ConsentRecord rows for audit.

   Wave 9 (2026-05-19) — bumped to 2026-05-19 weil: (a) banner ist
   jetzt i18n (DE default + EN auto-detect), (b) visual button-parität
   (Audit H-1, OLG Köln 6 U 187/21), (c) 12-monats-expiry (Audit H-5,
   DSK-empfehlung). Bestehende einwilligungen werden re-prompted weil
   der neue text ein opt-in-relevantes update darstellt.

   Wave 10 (2026-06-08) — bumped to 2026-06-08 weil die Analyse-
   Beschreibung KORRIGIERT wurde: die bisherige Aussage „anonyme,
   cookielose Nutzungsstatistik" war SACHLICH FALSCH für die real
   eingesetzte erstanbieter-, selbst-gehostete Produkt-Telemetrie
   (/api/analytics/track → AnalyticsEvent), die eine Sitzungs-/Geräte-ID
   im Browser setzt (§ 25 Abs. 1 TTDSG) und bei eingeloggten Nutzern
   die User-ID verknüpft. Die neue Beschreibung ist einwilligungs-
   relevant → alle Nutzer werden erneut abgefragt (Art. 7 Abs. 1,
   Art. 12 DSGVO). */
export const CONSENT_VERSION = "2026-06-08";

/* Wave 9 (Audit H-5) — DSK + LfDI Baden-Württemberg empfehlen max.
   12-monats-gültigkeit für cookie-consent. Nach ablauf wird der
   banner re-prompted. 366 statt 365 als puffer für schaltjahre +
   timezone-edge-cases am genau-1-jahr-grenztag. */
const CONSENT_TTL_DAYS = 366;

export interface CookiePreferences {
  necessary: true; // always on
  analytics: boolean;
  performance: boolean;
  errorTracking: boolean;
}

/* Versioned + timestamped record persisted to localStorage. The
   simple boolean shape from getPreferences() is derived from this. */
interface ConsentRecord {
  version: string;
  decision: "accept_all" | "decline" | "customize";
  preferences: CookiePreferences;
  /** ISO timestamp of the decision. */
  decidedAt: string;
  /** Per-purpose timestamps so we can show the user when each purpose
   *  was opted-in (e.g. settings page audit-trail). */
  perPurposeAt: {
    analytics?: string;
    performance?: string;
    errorTracking?: string;
  };
}

const DEFAULT_PREFS: CookiePreferences = {
  necessary: true,
  analytics: false,
  performance: false,
  errorTracking: false,
};

const ALL_PREFS: CookiePreferences = {
  necessary: true,
  analytics: true,
  performance: true,
  errorTracking: true,
};

/* Stable per-browser session key. Used to hash server-side as the
   anonymous correlation id for ConsentRecord rows. */
function getOrCreateSessionKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    /* crypto.randomUUID is available in all modern browsers. */
    const fresh =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    window.localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return "";
  }
}

/** Read current preferences from localStorage (safe for SSR) */
export function getPreferences(): CookiePreferences | null {
  const record = getConsentRecord();
  if (record) return record.preferences;
  /* Backwards compat: legacy values "all" / "necessary" / raw prefs. */
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    if (raw === "all") return ALL_PREFS;
    if (raw === "necessary") return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    /* If parsed is a versioned record, getConsentRecord would have
       handled it — only reaches here for old plain-prefs shape. */
    return { ...DEFAULT_PREFS, ...parsed, necessary: true };
  } catch {
    return null;
  }
}

/** Read the full versioned consent record (preferences + timestamps). */
export function getConsentRecord(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.version === "string" &&
      typeof parsed.decision === "string" &&
      parsed.preferences &&
      typeof parsed.decidedAt === "string"
    ) {
      const record = parsed as ConsentRecord;
      /* Out-of-date version → treat as missing so the banner re-prompts. */
      if (record.version !== CONSENT_VERSION) return null;
      /* Wave 9 (H-5) — TTL-check: einwilligungen älter als 12 monate
         werden invalidiert, banner re-prompted. DSK-empfehlung. */
      const decidedAt = new Date(record.decidedAt).getTime();
      const ageMs = Date.now() - decidedAt;
      const maxAgeMs = CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000;
      if (Number.isFinite(decidedAt) && ageMs > maxAgeMs) return null;
      return record;
    }
    return null;
  } catch {
    return null;
  }
}

/** Build a fresh ConsentRecord, preserving per-purpose timestamps
 *  from the prior record where the boolean stayed true. */
function buildRecord(
  decision: ConsentRecord["decision"],
  prefs: CookiePreferences,
): ConsentRecord {
  const now = new Date().toISOString();
  const prior = getConsentRecord();
  const perPurposeAt: ConsentRecord["perPurposeAt"] = {
    ...prior?.perPurposeAt,
  };
  for (const key of ["analytics", "performance", "errorTracking"] as const) {
    if (prefs[key]) {
      /* If newly turned on, stamp now; if already on, keep prior stamp. */
      if (!prior?.preferences[key] || !perPurposeAt[key]) {
        perPurposeAt[key] = now;
      }
    } else {
      delete perPurposeAt[key];
    }
  }
  return {
    version: CONSENT_VERSION,
    decision,
    preferences: prefs,
    decidedAt: now,
    perPurposeAt,
  };
}

/* Fire-and-forget POST to the consent log. Failures are intentionally
   swallowed — the localStorage record is the user-side proof, the DB
   row is the operator-side proof; if the fetch fails we still want
   the UX to proceed. */
function postConsentLog(record: ConsentRecord, surface: string): void {
  if (typeof window === "undefined") return;
  const sessionKey = getOrCreateSessionKey();
  if (!sessionKey) return;
  try {
    void fetch("/api/consent/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        consentVersion: record.version,
        sessionKey,
        decision: record.decision,
        preferences: record.preferences,
        surface,
        path: window.location.pathname,
      }),
    }).catch(() => {
      /* swallow */
    });
  } catch {
    /* swallow */
  }
}

/** Check if a specific category is allowed */
export function isAllowed(category: keyof CookiePreferences): boolean {
  const prefs = getPreferences();
  if (!prefs) return false;
  return prefs[category];
}

/** Check if analytics are allowed (backwards compat) */
export function isAnalyticsAllowed(): boolean {
  return isAllowed("analytics");
}

/* Wave 9 (Audit H-2) — Cookie-Banner i18n.
   DSGVO Art. 12 fordert dass informationen in einer sprache
   bereitgestellt werden die die betroffene person verstehen kann.
   Bei deutscher domain (.eu) mit deutschsprachigem hauptmarkt ist
   DE pflicht; EN ist convenience für nicht-deutschsprachige.
   Detection: navigator.language. Fallback: DE (markt-default). */
type BannerLocale = "de" | "en";
const STRINGS = {
  de: {
    dialogLabel: "Datenschutz-Einstellungen",
    title: "Datenschutz-Einstellungen",
    description:
      "Wir verwenden notwendige Cookies für Sicherheit und Authentifizierung. Optionale Cookies helfen uns, Ihr Erlebnis zu verbessern.",
    cookiePolicy: "Cookie-Richtlinie",
    customize: "Anpassen",
    decline: "Ablehnen",
    acceptAll: "Alle akzeptieren",
    necessary: "Notwendig",
    necessaryDesc: "Authentifizierung, CSRF-Schutz, Session-Management.",
    analytics: "Analyse",
    analyticsDesc:
      "Erstanbieter-Produktanalyse auf unserer eigenen EU-Infrastruktur. Setzt eine Sitzungs-/Geräte-ID und verknüpft bei Anmeldung Ihre Nutzung. Details: Cookie-Richtlinie.",
    performance: "Performance",
    performanceDesc: "Ladezeit- und Performance-Monitoring.",
    errorTracking: "Fehler-Tracking",
    errorTrackingDesc: "Fehlerberichte, damit wir Bugs beheben können.",
    savePrefs: "Einstellungen speichern",
  },
  en: {
    dialogLabel: "Privacy settings",
    title: "Privacy Settings",
    description:
      "We use essential cookies for security and authentication. Optional cookies help us improve your experience.",
    cookiePolicy: "Cookie Policy",
    customize: "Customize",
    decline: "Decline",
    acceptAll: "Accept All",
    necessary: "Necessary",
    necessaryDesc: "Authentication, CSRF protection, session management.",
    analytics: "Analytics",
    analyticsDesc:
      "First-party product analytics on our own EU infrastructure. Sets a session/device ID and links your usage once signed in. See the Cookie Policy.",
    performance: "Performance",
    performanceDesc: "Page load and performance monitoring.",
    errorTracking: "Error Tracking",
    errorTrackingDesc: "Error reporting to help us fix bugs.",
    savePrefs: "Save Preferences",
  },
} as const;

function detectLocale(): BannerLocale {
  if (typeof navigator === "undefined") return "de";
  const lang = (navigator.language || "de").toLowerCase();
  /* DE als markt-default. Nur explizit nicht-deutschsprachige
     browser bekommen EN — das ist konservativ (DE-fallback bei
     unklarheit erfüllt Art. 12 für den hauptmarkt). */
  if (lang.startsWith("de")) return "de";
  return "en";
}

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-[#1d1d1f]">
            {label}
          </span>
          {disabled && (
            <Lock size={12} className="text-[#86868b]" aria-hidden="true" />
          )}
        </div>
        <p className="text-[13px] text-[#86868b] mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative flex-shrink-0 w-[51px] h-[31px] rounded-full transition-all duration-300 ${
          checked ? "bg-[#1d1d1f]" : "bg-[#e5e5ea]"
        } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white transition-all duration-300 shadow-sm ${
            checked ? "left-[22px]" : "left-[2px]"
          }`}
        />
      </button>
    </div>
  );
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFS);
  const [isAnimating, setIsAnimating] = useState(false);
  const [locale, setLocale] = useState<BannerLocale>("de");

  useEffect(() => {
    setMounted(true);
    setLocale(detectLocale());
    const stored = getPreferences();
    if (!stored) {
      setIsAnimating(true);
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    const handleShowCookieConsent = () => {
      setIsAnimating(true);
      setVisible(true);
    };
    window.addEventListener("show-cookie-consent", handleShowCookieConsent);
    return () =>
      window.removeEventListener(
        "show-cookie-consent",
        handleShowCookieConsent,
      );
  }, []);

  const saveAndClose = useCallback(
    (
      preferences: CookiePreferences,
      decision: ConsentRecord["decision"],
      surface: string,
    ) => {
      const record = buildRecord(decision, preferences);
      try {
        localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
      } catch {
        // localStorage might be blocked
      }
      /* Server-side audit log (DSGVO Art. 7 Abs. 1 Nachweispflicht). */
      postConsentLog(record, surface);
      setIsAnimating(false);
      setTimeout(() => setVisible(false), 300);
      if (
        preferences.analytics ||
        preferences.performance ||
        preferences.errorTracking
      ) {
        setTimeout(() => window.location.reload(), 350);
      }
    },
    [],
  );

  const handleAcceptAll = useCallback(() => {
    saveAndClose(ALL_PREFS, "accept_all", "first_visit");
  }, [saveAndClose]);

  const handleNecessaryOnly = useCallback(() => {
    saveAndClose(DEFAULT_PREFS, "decline", "first_visit");
  }, [saveAndClose]);

  const handleSavePreferences = useCallback(() => {
    saveAndClose(prefs, "customize", "first_visit");
  }, [prefs, saveAndClose]);

  if (!mounted || !visible) return null;
  const t = STRINGS[locale];

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Banner */}
      <div
        role="dialog"
        aria-label={t.dialogLabel}
        aria-modal="true"
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-32px)] max-w-[680px] transition-all duration-500 ease-out ${
          isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08),0_12px_48px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="px-7 py-6">
            {/* Header + description */}
            <div className="flex flex-col md:flex-row md:items-start gap-5">
              <div className="flex-1 min-w-0">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] tracking-[-0.01em]">
                  {t.title}
                </h3>
                <p className="text-[14px] text-[#86868b] leading-[1.5] mt-1.5">
                  {t.description}{" "}
                  <Link
                    href="/legal/cookies"
                    className="text-[#1d1d1f] underline decoration-[#1d1d1f]/20 underline-offset-2 hover:decoration-[#1d1d1f]/50 transition-colors"
                  >
                    {t.cookiePolicy}
                  </Link>
                </p>
              </div>

              {/* Actions — Wave 9 (H-1) — visual button parity.
                  Vorher: Decline grau (#f5f5f7), Accept All schwarz
                  (#1d1d1f) → klares hierarchie-gefälle, OLG Köln
                  6 U 187/21 (10.06.2022) sieht das als verstoß gegen
                  die "gleich-prominent"-pflicht. Jetzt: beide buttons
                  IDENTISCH gestyled (light gray bg, dark text). User
                  kann nur über das label unterscheiden — und genau das
                  ist die DSGVO-vorgabe. Customize bleibt subtiler
                  (text-only) weil es eine sekundäre option ist. */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  aria-expanded={showDetails}
                  aria-controls="cookie-details"
                  className="flex items-center gap-1 py-2.5 px-4 text-[14px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors rounded-full hover:bg-[#f5f5f7]"
                >
                  {t.customize}
                  {showDetails ? (
                    <ChevronUp size={14} aria-hidden="true" />
                  ) : (
                    <ChevronDown size={14} aria-hidden="true" />
                  )}
                </button>
                <button
                  onClick={handleNecessaryOnly}
                  className="py-2.5 px-5 text-[14px] font-medium text-[#1d1d1f] rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors"
                >
                  {t.decline}
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="py-2.5 px-5 text-[14px] font-medium text-[#1d1d1f] rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors"
                >
                  {t.acceptAll}
                </button>
              </div>
            </div>

            {/* Expandable details */}
            <div
              id="cookie-details"
              className={`overflow-hidden transition-all duration-300 ease-out ${
                showDetails ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="mt-5 pt-5 border-t border-[#e5e5ea]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-0">
                  <Toggle
                    label={t.necessary}
                    description={t.necessaryDesc}
                    checked={true}
                    onChange={() => {}}
                    disabled
                  />
                  <Toggle
                    label={t.analytics}
                    description={t.analyticsDesc}
                    checked={prefs.analytics}
                    onChange={(v) => setPrefs({ ...prefs, analytics: v })}
                  />
                  <Toggle
                    label={t.performance}
                    description={t.performanceDesc}
                    checked={prefs.performance}
                    onChange={(v) => setPrefs({ ...prefs, performance: v })}
                  />
                  <Toggle
                    label={t.errorTracking}
                    description={t.errorTrackingDesc}
                    checked={prefs.errorTracking}
                    onChange={(v) => setPrefs({ ...prefs, errorTracking: v })}
                  />
                </div>

                <div className="flex justify-end mt-5">
                  <button
                    onClick={handleSavePreferences}
                    className="py-2.5 px-6 text-[14px] font-medium text-[#1d1d1f] rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors"
                  >
                    {t.savePrefs}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
