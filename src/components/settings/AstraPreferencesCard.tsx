"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface AstraPrefs {
  verbosity: "brief" | "balanced" | "detailed";
  responseLanguage: "system" | "en" | "de";
  defaultMode: "auto" | "general" | "assessment" | "document" | "analysis";
  showSources: boolean;
  showActions: boolean;
  proactiveHints: boolean;
}

const DEFAULT_PREFS: AstraPrefs = {
  verbosity: "balanced",
  responseLanguage: "system",
  defaultMode: "auto",
  showSources: true,
  showActions: true,
  proactiveHints: true,
};

const STORAGE_KEY = "caelex-astra-preferences";

function loadPrefs(): AstraPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function AstraPreferencesCard() {
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState<AstraPrefs>(DEFAULT_PREFS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setMounted(true);
  }, []);

  const update = (patch: Partial<AstraPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      {/* Response Detail */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          Response Detail
        </p>

        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4">
            <p className="text-[13px] text-slate-500 dark:text-white/40 mb-3">
              How detailed should Astra&apos;s answers be?
            </p>
            <div
              className="flex p-[3px] bg-black/[0.06] dark:bg-white/[0.1] rounded-xl"
              role="radiogroup"
              aria-label="Response detail level"
            >
              {(
                [
                  { value: "brief", label: "Brief" },
                  { value: "balanced", label: "Balanced" },
                  { value: "detailed", label: "Detailed" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={prefs.verbosity === opt.value}
                  onClick={() => update({ verbosity: opt.value })}
                  className={`flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-medium transition-all duration-200 ${
                    prefs.verbosity === opt.value
                      ? "bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Response Language */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          Response Language
        </p>

        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4">
            <p className="text-[13px] text-slate-500 dark:text-white/40 mb-3">
              Which language should Astra respond in?
            </p>
            <div
              className="flex p-[3px] bg-black/[0.06] dark:bg-white/[0.1] rounded-xl"
              role="radiogroup"
              aria-label="Response language"
            >
              {(
                [
                  { value: "system", label: "Follow System" },
                  { value: "en", label: "English" },
                  { value: "de", label: "Deutsch" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={prefs.responseLanguage === opt.value}
                  onClick={() => update({ responseLanguage: opt.value })}
                  className={`flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-medium transition-all duration-200 ${
                    prefs.responseLanguage === opt.value
                      ? "bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Default Mode */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          Default Mode
        </p>

        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4">
            <p className="text-[13px] text-slate-500 dark:text-white/40 mb-3">
              How Astra should approach your questions by default
            </p>
            <div
              className="flex p-[3px] bg-black/[0.06] dark:bg-white/[0.1] rounded-xl"
              role="radiogroup"
              aria-label="Default mode"
            >
              {(
                [
                  { value: "auto", label: "Auto" },
                  { value: "general", label: "General" },
                  { value: "assessment", label: "Assessment" },
                  { value: "document", label: "Document" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={prefs.defaultMode === opt.value}
                  onClick={() => update({ defaultMode: opt.value })}
                  className={`flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-medium transition-all duration-200 ${
                    prefs.defaultMode === opt.value
                      ? "bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Behavior Toggles */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          Behavior
        </p>

        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
          {[
            {
              key: "showSources" as const,
              label: "Show Sources & Citations",
              desc: "Include regulatory references in responses",
            },
            {
              key: "showActions" as const,
              label: "Suggest Next Actions",
              desc: "Recommend follow-up steps after answers",
            },
            {
              key: "proactiveHints" as const,
              label: "Proactive Hints",
              desc: "Surface compliance tips based on your activity",
            },
          ].map((toggle) => (
            <div
              key={toggle.key}
              className="flex items-center justify-between px-5 py-3.5"
            >
              <div className="mr-4">
                <p className="text-[15px] font-medium text-slate-800 dark:text-white">
                  {toggle.label}
                </p>
                <p className="text-[13px] text-slate-400 dark:text-white/40 mt-0.5">
                  {toggle.desc}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={prefs[toggle.key]}
                onClick={() => update({ [toggle.key]: !prefs[toggle.key] })}
                className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-300 flex-shrink-0 ${
                  prefs[toggle.key]
                    ? "bg-slate-500 dark:bg-slate-400"
                    : "bg-black/[0.09] dark:bg-white/[0.16]"
                }`}
              >
                <span
                  className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    prefs[toggle.key] ? "left-[22px]" : "left-[2px]"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
