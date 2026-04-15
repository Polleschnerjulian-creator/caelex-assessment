"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Globe, Check, Info, Building2, Upload, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { Language } from "@/lib/i18n";

const LANGUAGE_OPTIONS: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "de", label: "German", native: "Deutsch" },
];

const LS_KEY_LOGO = "atlas-firm-logo";
const LS_KEY_NAME = "atlas-firm-name";
const LS_KEY_USER = "atlas-user-name";
const MAX_LOGO_SIZE = 512 * 1024; // 512 KB

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firmName, setFirmName] = useState("");
  const [userName, setUserName] = useState("");
  const [firmLogo, setFirmLogo] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage
  useEffect(() => {
    setFirmName(localStorage.getItem(LS_KEY_NAME) ?? "");
    setUserName(localStorage.getItem(LS_KEY_USER) ?? "");
    setFirmLogo(localStorage.getItem(LS_KEY_LOGO));
    setMounted(true);
  }, []);

  // Save firm name (debounced)
  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => {
      if (firmName.trim()) {
        localStorage.setItem(LS_KEY_NAME, firmName.trim());
      } else {
        localStorage.removeItem(LS_KEY_NAME);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [firmName, mounted]);

  // Save user name (debounced)
  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => {
      if (userName.trim()) {
        localStorage.setItem(LS_KEY_USER, userName.trim());
      } else {
        localStorage.removeItem(LS_KEY_USER);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [userName, mounted]);

  const handleLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_LOGO_SIZE) {
        alert(
          language === "de"
            ? "Logo darf maximal 512 KB groß sein."
            : "Logo must be 512 KB or smaller.",
        );
        return;
      }

      if (!file.type.startsWith("image/")) {
        alert(
          language === "de"
            ? "Bitte eine Bilddatei wählen."
            : "Please select an image file.",
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        localStorage.setItem(LS_KEY_LOGO, dataUrl);
        setFirmLogo(dataUrl);
      };
      reader.readAsDataURL(file);

      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [language],
  );

  const handleRemoveLogo = useCallback(() => {
    localStorage.removeItem(LS_KEY_LOGO);
    setFirmLogo(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16 py-12">
      {/* ─── Header ─── */}
      <h1 className="text-[24px] font-semibold tracking-tight text-gray-900 mb-1">
        {t("atlas.settings")}
      </h1>
      <p className="text-[13px] text-gray-500 mb-10">
        {language === "de"
          ? "Sprache, Kanzleiprofil und Exporteinstellungen konfigurieren."
          : "Configure language, firm profile, and export settings."}
      </p>

      <div className="max-w-xl space-y-10">
        {/* ─── Firm Branding ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Building2
              className="h-4 w-4 text-gray-400"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h2 className="text-[12px] font-semibold text-gray-500 tracking-[0.1em] uppercase">
              {language === "de" ? "Kanzleiprofil" : "Firm Profile"}
            </h2>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
            {/* User name */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                {language === "de" ? "Ihr Name" : "Your Name"}
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={language === "de" ? "z.B. Julian" : "e.g. Julian"}
                aria-describedby="user-name-hint"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[14px] text-gray-900 placeholder:text-gray-300 focus:border-gray-400 focus:outline-none transition-colors"
              />
              <p
                id="user-name-hint"
                className="text-[11px] text-gray-400 mt-1.5"
              >
                {language === "de"
                  ? "Wird in der Begrüßung auf der Startseite angezeigt."
                  : "Shown in the greeting on the home page."}
              </p>
            </div>

            {/* Firm name */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                {language === "de" ? "Kanzleiname" : "Firm Name"}
              </label>
              <input
                type="text"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder={
                  language === "de" ? "z.B. BHO Legal" : "e.g. BHO Legal"
                }
                aria-describedby="firm-name-hint"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[14px] text-gray-900 placeholder:text-gray-300 focus:border-gray-400 focus:outline-none transition-colors"
              />
              <p
                id="firm-name-hint"
                className="text-[11px] text-gray-400 mt-1.5"
              >
                {language === "de"
                  ? "Wird im Header der exportierten Briefings angezeigt."
                  : "Shown in the header of exported briefings."}
              </p>
            </div>

            {/* Logo upload */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                {language === "de" ? "Kanzleilogo" : "Firm Logo"}
              </label>

              {firmLogo ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-16 w-16 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={firmLogo}
                      alt="Firm logo"
                      className="max-h-14 max-w-14 object-contain"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-[12px] text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {language === "de" ? "Ersetzen" : "Replace"}
                    </button>
                    <button
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-1 text-[12px] text-red-400 hover:text-red-600 transition-colors"
                    >
                      <X size={12} strokeWidth={2} aria-hidden="true" />
                      {language === "de" ? "Entfernen" : "Remove"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white transition-all w-full"
                >
                  <Upload
                    size={18}
                    className="text-gray-400"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <div className="text-left">
                    <span className="block text-[13px] text-gray-600">
                      {language === "de" ? "Logo hochladen" : "Upload logo"}
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      PNG, SVG, JPG &middot; max 512 KB
                    </span>
                  </div>
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                aria-label={
                  language === "de"
                    ? "Kanzleilogo hochladen"
                    : "Upload firm logo"
                }
                aria-describedby="firm-logo-hint"
                className="hidden"
              />

              <p
                id="firm-logo-hint"
                className="text-[11px] text-gray-400 mt-1.5"
              >
                {language === "de"
                  ? "Ersetzt das Caelex-Logo in exportierten PDF-Briefings."
                  : "Replaces the Caelex logo in exported PDF briefings."}
              </p>
            </div>
          </div>
        </section>

        {/* ─── Language ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Globe
              className="h-4 w-4 text-gray-400"
              strokeWidth={1.5}
              aria-hidden="true"
            />
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
                  aria-pressed={isActive}
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
                      <Check
                        className="h-3 w-3 text-white"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
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
            <Info
              className="h-4 w-4 text-gray-400"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h2 className="text-[12px] font-semibold text-gray-500 tracking-[0.1em] uppercase">
              ATLAS
            </h2>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {[
              { label: "Version", value: "1.0" },
              {
                label: language === "de" ? "Jurisdiktionen" : "Jurisdictions",
                value: "10",
              },
              {
                label: language === "de" ? "Rechtsquellen" : "Legal Sources",
                value: "244",
              },
              {
                label: language === "de" ? "Behörden" : "Authorities",
                value: "132",
              },
              { label: "Theme", value: "Light" },
              {
                label: language === "de" ? "Datenstand" : "Data",
                value: language === "de" ? "April 2026" : "April 2026",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-5 py-3"
              >
                <span className="text-[13px] text-gray-600">{row.label}</span>
                <span className="text-[13px] text-gray-400 ">{row.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
