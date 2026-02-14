"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Cookie, ChevronDown, ChevronUp, Lock, Shield } from "lucide-react";

const CONSENT_KEY = "caelex-cookie-consent";

// Aston Martin Vantage Racing Green
const VANTAGE_GREEN = {
  primary: "#00665E", // Main accent
  hover: "#005850", // Darker for hover
  light: "#00796B", // Lighter variant
  glow: "rgba(0, 102, 94, 0.4)", // For shadows/glow
};

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
          <span className="text-[13px] font-medium text-white/90">{label}</span>
          {disabled && <Lock size={12} className="text-white/30" />}
        </div>
        <p className="text-[12px] text-white/50 mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-[26px] rounded-full transition-all duration-300 ${
          checked
            ? "bg-gradient-to-r from-[#00665E] to-[#00796B] shadow-[0_0_12px_rgba(0,102,94,0.4)]"
            : "bg-white/[0.08] border border-white/[0.06]"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]"}`}
      >
        <span
          className={`absolute top-[3px] w-5 h-5 rounded-full transition-all duration-300 ${
            checked
              ? "left-[23px] bg-white shadow-lg"
              : "left-[3px] bg-white/60"
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
      const timer = setTimeout(() => {
        setIsAnimating(true);
        setVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
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
    // Reload to activate/deactivate services
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
      {/* Full-screen backdrop - blocks interaction */}
      <div
        className={`fixed inset-0 z-[9998] transition-opacity duration-500 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Cookie Banner */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-32px)] max-w-[720px] transition-all duration-500 ease-out ${
          isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Liquid Glass Container */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            boxShadow: `
            0 0 0 1px rgba(255,255,255,0.06),
            0 8px 40px rgba(0,0,0,0.4),
            0 0 80px rgba(0,102,94,0.08),
            inset 0 1px 0 rgba(255,255,255,0.05)
          `,
          }}
        >
          {/* Glass Backdrop */}
          <div
            className="absolute inset-0 backdrop-blur-2xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(20,20,22,0.85) 0%, rgba(15,15,17,0.92) 100%)",
            }}
          />

          {/* Subtle gradient overlay */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse at 30% 0%, rgba(0,102,94,0.15) 0%, transparent 50%)",
            }}
          />

          {/* Content */}
          <div className="relative px-6 py-5">
            {/* Main row */}
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              {/* Icon + Text */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Glass Icon Container */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(0,102,94,0.2) 0%, rgba(0,102,94,0.1) 100%)",
                    boxShadow:
                      "0 0 0 1px rgba(0,102,94,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <Shield
                    size={20}
                    className="text-[#00796B]"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-medium text-white tracking-[-0.01em] mb-1">
                    Privacy Settings
                  </h3>
                  <p className="text-[13px] text-white/50 leading-[1.6]">
                    We use essential cookies for security. Optional analytics
                    help us improve.{" "}
                    <Link
                      href="/legal/cookies"
                      className="text-[#00796B] hover:text-[#00897B] transition-colors underline decoration-[#00796B]/30 underline-offset-2"
                    >
                      Learn more
                    </Link>
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2.5 flex-shrink-0 ml-0 md:ml-0">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1.5 py-2.5 px-4 text-white/50 text-[13px] font-medium hover:text-white/70 transition-all rounded-lg hover:bg-white/[0.04]"
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
                  className="py-2.5 px-5 text-white/70 rounded-xl text-[13px] font-medium transition-all hover:bg-white/[0.06]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.02)",
                  }}
                >
                  Decline
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="py-2.5 px-5 text-white rounded-xl text-[13px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${VANTAGE_GREEN.primary} 0%, ${VANTAGE_GREEN.light} 100%)`,
                    boxShadow: `0 0 0 1px rgba(0,102,94,0.5), 0 4px 16px ${VANTAGE_GREEN.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                  }}
                >
                  Accept All
                </button>
              </div>
            </div>

            {/* Expandable details */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                showDetails ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div
                className="mt-5 pt-5"
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
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
                    className="py-2.5 px-6 text-white rounded-xl text-[13px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: `linear-gradient(135deg, ${VANTAGE_GREEN.primary} 0%, ${VANTAGE_GREEN.light} 100%)`,
                      boxShadow: `0 0 0 1px rgba(0,102,94,0.5), 0 4px 16px ${VANTAGE_GREEN.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                    }}
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
