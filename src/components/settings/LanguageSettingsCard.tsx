"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { LANGUAGES, type Language } from "@/lib/i18n";

export function LanguageSettingsCard() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center">
          <Globe
            className="w-5 h-5 text-slate-600 dark:text-white/70"
            aria-hidden="true"
          />
        </div>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/70">
            {t("settings.language")}
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-white/50 mt-0.5">
            {t("settings.languageDescription")}
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        role="radiogroup"
        aria-label="Language selection"
      >
        {(Object.entries(LANGUAGES) as [Language, string][]).map(
          ([code, label]) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              role="radio"
              aria-checked={language === code}
              className={`
                px-4 py-3 rounded-lg border text-[13px] font-medium transition-all text-center
                ${
                  language === code
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                }
              `}
            >
              {label}
            </button>
          ),
        )}
      </div>

      <p className="text-[11px] text-slate-400 dark:text-white/30 mt-3">
        {t("settings.languageNote")}
      </p>
    </div>
  );
}
