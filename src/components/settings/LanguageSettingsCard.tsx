"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { LANGUAGES, type Language } from "@/lib/i18n";

export function LanguageSettingsCard() {
  const { language, setLanguage, t } = useLanguage();

  const options = (Object.entries(LANGUAGES) as [Language, string][]).map(
    ([code, label]) => ({ value: code, label }),
  );

  return (
    <div className="space-y-8">
      {/* Language Section */}
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
          {t("settings.language")}
        </p>

        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4">
            <div
              className="flex p-[3px] bg-black/[0.06] dark:bg-white/[0.1] rounded-xl"
              role="radiogroup"
              aria-label="Language selection"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={language === opt.value}
                  onClick={() => setLanguage(opt.value)}
                  className={`flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-medium transition-all duration-200 ${
                    language === opt.value
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

        <p className="text-[13px] text-slate-400 dark:text-white/30 mt-3 px-1">
          {t("settings.languageNote")}
        </p>
      </div>
    </div>
  );
}
