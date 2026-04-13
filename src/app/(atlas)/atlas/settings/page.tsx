"use client";

import { Settings, Globe, Bell, Palette, Check } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { Language } from "@/lib/i18n";

const LANGUAGE_OPTIONS: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "EN" },
  { code: "de", label: "Deutsch", flag: "DE" },
];

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#F7F8FA] p-4 gap-3">
      <header className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
        <h1 className="text-[18px] font-semibold tracking-tight text-gray-900">
          {t("atlas.settings")}
        </h1>
      </header>

      <div className="max-w-2xl space-y-3">
        {/* ─── Language ─── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
            <Globe className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />
            <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
              {t("atlas.settings_language")}
            </span>
          </div>
          <div className="px-4 py-4">
            <p className="text-[12px] text-gray-400 mb-4">
              {t("atlas.settings_language_desc")}
            </p>
            <div className="flex gap-2">
              {LANGUAGE_OPTIONS.map((opt) => {
                const isActive = language === opt.code;
                return (
                  <button
                    key={opt.code}
                    onClick={() => setLanguage(opt.code)}
                    className={`
                      relative flex items-center gap-2.5 px-4 py-2.5 rounded-lg border transition-all duration-150
                      ${
                        isActive
                          ? "border-emerald-300 bg-emerald-50 text-gray-900"
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }
                    `}
                  >
                    <span className="text-[11px] font-mono font-semibold tracking-wider">
                      {opt.flag}
                    </span>
                    <span className="text-[12px] font-medium">{opt.label}</span>
                    {isActive && (
                      <Check
                        className="h-3.5 w-3.5 text-emerald-600 ml-1"
                        strokeWidth={2}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Appearance ─── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
            <Palette
              className="h-3.5 w-3.5 text-emerald-600"
              strokeWidth={1.5}
            />
            <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
              {t("atlas.settings_appearance")}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[12px] text-gray-700">Theme</span>
              <span className="text-[12px] text-gray-400 font-mono">Light</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[12px] text-gray-700">Density</span>
              <span className="text-[12px] text-gray-400 font-mono">
                Compact
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[12px] text-gray-700">Sidebar</span>
              <span className="text-[12px] text-gray-400 font-mono">
                Collapsed by default
              </span>
            </div>
          </div>
        </div>

        {/* ─── Notifications ─── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
            <Bell className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />
            <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
              {t("atlas.settings_notifications")}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { label: "Regulatory Alerts", enabled: true },
              { label: "Compliance Deadlines", enabled: true },
              { label: "API Usage Alerts", enabled: false },
              { label: "Weekly Digest", enabled: true },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span className="text-[12px] text-gray-700">{item.label}</span>
                <div
                  className={`h-5 w-9 rounded-full border transition-colors cursor-pointer ${
                    item.enabled
                      ? "bg-emerald-100 border-emerald-300"
                      : "bg-gray-100 border-gray-200"
                  }`}
                >
                  <div
                    className={`h-3.5 w-3.5 rounded-full mt-[2.5px] transition-transform ${
                      item.enabled
                        ? "bg-emerald-500 translate-x-[17px]"
                        : "bg-gray-400 translate-x-[3px]"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
