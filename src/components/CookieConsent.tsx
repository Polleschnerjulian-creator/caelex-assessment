"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";

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

  useEffect(() => {
    setMounted(true);
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

  const saveAndClose = useCallback((preferences: CookiePreferences) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(preferences));
    } catch {
      // localStorage might be blocked
    }
    setIsAnimating(false);
    setTimeout(() => setVisible(false), 300);
    if (
      preferences.analytics ||
      preferences.performance ||
      preferences.errorTracking
    ) {
      setTimeout(() => window.location.reload(), 350);
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
        aria-label="Privacy settings"
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
                  Privacy Settings
                </h3>
                <p className="text-[14px] text-[#86868b] leading-[1.5] mt-1.5">
                  We use essential cookies for security and authentication.
                  Optional cookies help us improve your experience.{" "}
                  <Link
                    href="/legal/cookies"
                    className="text-[#1d1d1f] underline decoration-[#1d1d1f]/20 underline-offset-2 hover:decoration-[#1d1d1f]/50 transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  aria-expanded={showDetails}
                  aria-controls="cookie-details"
                  className="flex items-center gap-1 py-2.5 px-4 text-[14px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors rounded-full hover:bg-[#f5f5f7]"
                >
                  Customize
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
                  Decline
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="py-2.5 px-5 text-[14px] font-medium text-white rounded-full bg-[#1d1d1f] hover:bg-[#000000] transition-colors"
                >
                  Accept All
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
                    label="Necessary"
                    description="Authentication, CSRF protection, session management."
                    checked={true}
                    onChange={() => {}}
                    disabled
                  />
                  <Toggle
                    label="Analytics"
                    description="Anonymous, cookieless usage statistics."
                    checked={prefs.analytics}
                    onChange={(v) => setPrefs({ ...prefs, analytics: v })}
                  />
                  <Toggle
                    label="Performance"
                    description="Page load and performance monitoring."
                    checked={prefs.performance}
                    onChange={(v) => setPrefs({ ...prefs, performance: v })}
                  />
                  <Toggle
                    label="Error Tracking"
                    description="Error reporting to help us fix bugs."
                    checked={prefs.errorTracking}
                    onChange={(v) => setPrefs({ ...prefs, errorTracking: v })}
                  />
                </div>

                <div className="flex justify-end mt-5">
                  <button
                    onClick={handleSavePreferences}
                    className="py-2.5 px-6 text-[14px] font-medium text-white rounded-full bg-[#1d1d1f] hover:bg-[#000000] transition-colors"
                  >
                    Save Preferences
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
