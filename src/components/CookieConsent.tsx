"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Cookie, ChevronDown, ChevronUp, Lock } from "lucide-react";

const CONSENT_KEY = "caelex-cookie-consent";

export interface CookiePreferences {
  necessary: true; // always on
  analytics: boolean;
  performance: boolean;
  errorTracking: boolean;
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

/** Read current preferences from localStorage (safe for SSR) */
export function getPreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    // Support legacy "all" / "necessary" values
    if (raw === "all") return ALL_PREFS;
    if (raw === "necessary") return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed, necessary: true };
  } catch {
    return null;
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
          <span className="text-[13px] font-medium text-slate-800 dark:text-white/80">
            {label}
          </span>
          {disabled && (
            <Lock size={12} className="text-slate-400 dark:text-white/30" />
          )}
        </div>
        <p className="text-[12px] text-slate-500 dark:text-white/40 mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative flex-shrink-0 w-10 h-[22px] rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-slate-200 dark:bg-white/[0.1]"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "left-[22px]" : "left-[3px]"
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

  useEffect(() => {
    setMounted(true);
    const stored = getPreferences();
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleShowCookieConsent = () => setVisible(true);
    window.addEventListener("show-cookie-consent", handleShowCookieConsent);
    return () =>
      window.removeEventListener(
        "show-cookie-consent",
        handleShowCookieConsent,
      );
  }, []);

  const saveAndClose = useCallback((preferences: CookiePreferences) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(preferences));
    } catch {
      // localStorage might be blocked
    }
    setVisible(false);
    // Reload to activate/deactivate services
    if (
      preferences.analytics ||
      preferences.performance ||
      preferences.errorTracking
    ) {
      window.location.reload();
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    saveAndClose(ALL_PREFS);
  }, [saveAndClose]);

  const handleNecessaryOnly = useCallback(() => {
    saveAndClose(DEFAULT_PREFS);
  }, [saveAndClose]);

  const handleSavePreferences = useCallback(() => {
    saveAndClose(prefs);
  }, [prefs, saveAndClose]);

  if (!mounted || !visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999]">
      {/* Full-width banner */}
      <div className="bg-white dark:bg-[#111113] border-t border-slate-200 dark:border-white/10 shadow-[0_-4px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_30px_rgba(0,0,0,0.4)]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-5">
          {/* Main row */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            {/* Icon + Text */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Cookie
                  size={18}
                  className="text-slate-500 dark:text-white/50"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-medium text-slate-900 dark:text-white mb-1">
                  Cookie Settings
                </h3>
                <p className="text-[13px] text-slate-500 dark:text-white/50 leading-relaxed">
                  We use essential cookies for authentication. With your
                  consent, we also use analytics and error tracking to improve
                  our service.{" "}
                  <Link
                    href="/legal/cookies"
                    className="text-slate-700 dark:text-white/70 underline decoration-slate-300 dark:decoration-white/20 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 flex-shrink-0 ml-12 md:ml-0">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1.5 py-2.5 px-4 text-slate-600 dark:text-white/50 text-[13px] font-medium hover:text-slate-800 dark:hover:text-white/70 transition-colors"
              >
                Customize
                {showDetails ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
              <button
                onClick={handleNecessaryOnly}
                className="py-2.5 px-5 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white/60 rounded-lg text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
              >
                Necessary Only
              </button>
              <button
                onClick={handleAcceptAll}
                className="py-2.5 px-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-[13px] font-medium hover:bg-slate-800 dark:hover:bg-white/90 transition-all"
              >
                Accept All
              </button>
            </div>
          </div>

          {/* Expandable details */}
          {showDetails && (
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-white/[0.06]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 max-w-[900px]">
                <Toggle
                  label="Necessary"
                  description="Authentication, CSRF protection, session management. Always active."
                  checked={true}
                  onChange={() => {}}
                  disabled
                />
                <Toggle
                  label="Analytics"
                  description="Vercel Analytics — anonymous, cookieless usage statistics."
                  checked={prefs.analytics}
                  onChange={(v) => setPrefs({ ...prefs, analytics: v })}
                />
                <Toggle
                  label="Performance"
                  description="Vercel Speed Insights — page load and performance monitoring."
                  checked={prefs.performance}
                  onChange={(v) => setPrefs({ ...prefs, performance: v })}
                />
                <Toggle
                  label="Error Tracking"
                  description="Sentry — error reporting and session replay to fix bugs."
                  checked={prefs.errorTracking}
                  onChange={(v) => setPrefs({ ...prefs, errorTracking: v })}
                />
              </div>

              <div className="flex justify-end mt-5">
                <button
                  onClick={handleSavePreferences}
                  className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[13px] font-medium transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
