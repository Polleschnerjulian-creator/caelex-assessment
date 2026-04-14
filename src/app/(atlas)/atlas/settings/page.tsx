"use client";

import { Globe, Check, Info } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { Language } from "@/lib/i18n";

const LANGUAGE_OPTIONS: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "de", label: "German", native: "Deutsch" },
];

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16 py-12">
      {/* ─── Header ─── */}
      <h1 className="text-[24px] font-semibold tracking-tight text-gray-900 mb-1">
        {t("atlas.settings")}
      </h1>
      <p className="text-[13px] text-gray-400 mb-10">
        {t("atlas.settings_language_desc")}
      </p>

      <div className="max-w-xl space-y-8">
        {/* ─── Language ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[12px] font-semibold text-gray-500 tracking-[0.1em] uppercase">
              {t("atlas.settings_language")}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {LANGUAGE_OPTIONS.map((opt) => {
              const isActive = language === opt.code;
              return (
                <button
                  key={opt.code}
                  onClick={() => setLanguage(opt.code)}
                  className={`
                    relative flex items-center justify-between
                    px-5 py-4 rounded-xl border-2 transition-all duration-200
                    ${
                      isActive
                        ? "border-gray-900 bg-white shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }
                  `}
                >
                  <div className="flex flex-col items-start">
                    <span
                      className={`text-[15px] font-medium ${isActive ? "text-gray-900" : "text-gray-600"}`}
                    >
                      {opt.native}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-0.5">
                      {opt.label}
                    </span>
                  </div>
                  {isActive && (
                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-gray-900">
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── About ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[12px] font-semibold text-gray-500 tracking-[0.1em] uppercase">
              ATLAS
            </h2>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {[
              { label: "Version", value: "1.0" },
              { label: "Jurisdictions", value: "10" },
              { label: "Legal Sources", value: "244" },
              { label: "Authorities", value: "132" },
              { label: "Theme", value: "Light" },
              { label: "Data", value: "April 2026" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-5 py-3"
              >
                <span className="text-[13px] text-gray-600">{row.label}</span>
                <span className="text-[13px] text-gray-400 font-mono">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
