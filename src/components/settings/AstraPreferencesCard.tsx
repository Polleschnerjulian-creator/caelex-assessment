"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Sparkles, MessageSquare, Zap, BookOpen } from "lucide-react";

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
    <div className="space-y-6">
      {/* Verbosity */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          Response Detail
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          How detailed should Astra&apos;s answers be?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              {
                value: "brief",
                label: "Brief",
                desc: "Short, to the point",
              },
              {
                value: "balanced",
                label: "Balanced",
                desc: "Clear with context",
              },
              {
                value: "detailed",
                label: "Detailed",
                desc: "Comprehensive answers",
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ verbosity: opt.value })}
              className={`p-3 rounded-xl text-left transition-all duration-150 border ${
                prefs.verbosity === opt.value
                  ? "bg-white/70 dark:bg-white/[0.06] border-violet-400/40 dark:border-violet-500/30 shadow-sm"
                  : "bg-white/30 dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04] hover:bg-white/50 dark:hover:bg-white/[0.04]"
              }`}
            >
              <p className="text-[13px] font-medium text-slate-800 dark:text-white">
                {opt.label}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {opt.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Response Language */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-400" />
          Response Language
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          Which language should Astra respond in?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              {
                value: "system",
                label: "Follow System",
                desc: "Uses your app language",
              },
              {
                value: "en",
                label: "English",
                desc: "Always respond in English",
              },
              {
                value: "de",
                label: "Deutsch",
                desc: "Immer auf Deutsch antworten",
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ responseLanguage: opt.value })}
              className={`p-3 rounded-xl text-left transition-all duration-150 border ${
                prefs.responseLanguage === opt.value
                  ? "bg-white/70 dark:bg-white/[0.06] border-violet-400/40 dark:border-violet-500/30 shadow-sm"
                  : "bg-white/30 dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04] hover:bg-white/50 dark:hover:bg-white/[0.04]"
              }`}
            >
              <p className="text-[13px] font-medium text-slate-800 dark:text-white">
                {opt.label}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {opt.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Default Mode */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slate-400" />
          Default Mode
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          How Astra should approach your questions by default
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              {
                value: "auto",
                label: "Auto-Detect",
                desc: "Astra picks the best mode",
              },
              {
                value: "general",
                label: "General",
                desc: "Open Q&A about compliance",
              },
              {
                value: "assessment",
                label: "Assessment",
                desc: "Guide through assessments",
              },
              {
                value: "document",
                label: "Document",
                desc: "Help draft documents",
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ defaultMode: opt.value })}
              className={`p-3 rounded-xl text-left transition-all duration-150 border ${
                prefs.defaultMode === opt.value
                  ? "bg-white/70 dark:bg-white/[0.06] border-violet-400/40 dark:border-violet-500/30 shadow-sm"
                  : "bg-white/30 dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04] hover:bg-white/50 dark:hover:bg-white/[0.04]"
              }`}
            >
              <p className="text-[13px] font-medium text-slate-800 dark:text-white">
                {opt.label}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {opt.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-slate-400" />
          Behavior
        </h3>
        <div className="space-y-2">
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
              className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]"
            >
              <div>
                <p className="text-[13px] font-medium text-slate-800 dark:text-white">
                  {toggle.label}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {toggle.desc}
                </p>
              </div>
              <button
                onClick={() => update({ [toggle.key]: !prefs[toggle.key] })}
                className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
                  prefs[toggle.key]
                    ? "bg-violet-500"
                    : "bg-slate-300 dark:bg-white/[0.1]"
                }`}
              >
                <span
                  className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    prefs[toggle.key] ? "left-[22px]" : "left-[3px]"
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
