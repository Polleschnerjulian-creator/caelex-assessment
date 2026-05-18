"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Letterhead (Kanzlei-Briefkopf) Settings Card.
 *
 * Sprint 3a (2026-05-18). Lebt im /atlas/settings → Firm-Tab.
 * Editiert Kanzlei-Name, Logo (PNG/JPG max 200KB), Logo-Breite, sowie
 * den Footer-Block (mehrzeilig — typischerweise Adresse + Telefon +
 * USt-ID + IBAN). Werte werden in localStorage persistiert (siehe
 * /lib/atlas/letterhead.ts) und beim PDF/DOCX-Render automatisch
 * eingesetzt.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState } from "react";
import { Upload, X, Check, ImageIcon, Info } from "lucide-react";
import {
  readLetterhead,
  writeLetterhead,
  clearLetterhead,
  fileToDataUrl,
  type LetterheadConfig,
} from "@/lib/atlas/letterhead";

export function LetterheadSettings() {
  const [cfg, setCfg] = useState<LetterheadConfig>({
    kanzleiName: "",
    logoDataUrl: null,
    logoWidthMm: 32,
    footerLine: "",
  });
  const [savedFlash, setSavedFlash] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Hydrate from localStorage on mount + react to cross-tab edits. */
  useEffect(() => {
    setCfg(readLetterhead());
    const onChange = () => setCfg(readLetterhead());
    window.addEventListener("atlas-letterhead-changed", onChange);
    return () =>
      window.removeEventListener("atlas-letterhead-changed", onChange);
  }, []);

  const persist = (next: Partial<LetterheadConfig>) => {
    const merged = { ...cfg, ...next };
    setCfg(merged);
    writeLetterhead(merged);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleFile = async (file: File | null) => {
    setUploadError(null);
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      setUploadError("Nur PNG oder JPG erlaubt.");
      return;
    }
    const dataUrl = await fileToDataUrl(file, 200 * 1024);
    if (!dataUrl) {
      setUploadError("Datei zu groß (max 200 KB).");
      return;
    }
    persist({ logoDataUrl: dataUrl });
  };

  const handleClear = () => {
    clearLetterhead();
    setCfg({
      kanzleiName: "",
      logoDataUrl: null,
      logoWidthMm: 32,
      footerLine: "",
    });
  };

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <ImageIcon
          className="h-4 w-4 text-slate-400 dark:text-slate-500"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Kanzlei-Briefkopf (Letterhead)
        </h2>
        {savedFlash && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <Check size={12} /> Gespeichert
          </span>
        )}
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/[0.04] dark:bg-white/[0.02]">
        <Info
          size={13}
          className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500"
          strokeWidth={1.5}
        />
        <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400">
          Diese Einstellungen werden lokal in diesem Browser gespeichert
          (localStorage). Logo + Kanzlei-Name erscheinen automatisch im
          PDF/DOCX-Export von Briefen und Schriftsätzen.
        </p>
      </div>

      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
        {/* Kanzlei-Name */}
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300">
            Kanzlei-Name
          </label>
          <input
            type="text"
            value={cfg.kanzleiName}
            onChange={(e) => persist({ kanzleiName: e.target.value })}
            placeholder="z. B. Rechtsanwälte Schmidt & Partner"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-400 focus:outline-none dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/[0.16]"
          />
          <p className="mt-1 text-[10.5px] text-slate-500 dark:text-slate-500">
            Erscheint als Absender-Mini-Linie über dem Adress-Block (Brief /
            Schriftsatz) und im PDF-Footer.
          </p>
        </div>

        {/* Logo upload */}
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300">
            Logo (PNG/JPG, max 200 KB)
          </label>
          <div className="flex items-start gap-3">
            <div
              className={`flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed ${
                cfg.logoDataUrl
                  ? "border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white"
                  : "border-slate-300 bg-slate-50 dark:border-white/[0.10] dark:bg-white/[0.02]"
              }`}
            >
              {cfg.logoDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={cfg.logoDataUrl}
                  alt="Logo-Vorschau"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-[10.5px] text-slate-400 dark:text-slate-500">
                  Keine Datei
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/[0.05]"
              >
                <Upload size={11} />
                {cfg.logoDataUrl ? "Logo ändern" : "Logo hochladen"}
              </button>
              {cfg.logoDataUrl && (
                <button
                  type="button"
                  onClick={() => persist({ logoDataUrl: null })}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:border-white/[0.10] dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <X size={11} />
                  Logo entfernen
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
          </div>
          {uploadError && (
            <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
              {uploadError}
            </p>
          )}
        </div>

        {/* Logo-Breite */}
        {cfg.logoDataUrl && (
          <div>
            <label className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-slate-700 dark:text-slate-300">
              <span>Logo-Breite</span>
              <span className="font-mono text-[11px] text-slate-500">
                {cfg.logoWidthMm} mm
              </span>
            </label>
            <input
              type="range"
              min="15"
              max="60"
              step="1"
              value={cfg.logoWidthMm}
              onChange={(e) => persist({ logoWidthMm: Number(e.target.value) })}
              className="w-full"
            />
            <p className="mt-0.5 text-[10.5px] text-slate-500">
              Logo erscheint rechts oben auf der ersten Seite (Briefe +
              Schriftsätze).
            </p>
          </div>
        )}

        {/* Footer-Block */}
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300">
            Footer-Block (mehrzeilig)
          </label>
          <textarea
            value={cfg.footerLine}
            onChange={(e) => persist({ footerLine: e.target.value })}
            rows={3}
            placeholder={`Schmidt & Partner Rechtsanwälte mbB · Maximilianstr. 35 · 80539 München\nTel +49 89 12345-0 · Fax +49 89 12345-99 · info@kanzlei.de\nUSt-IdNr. DE123456789 · IBAN DE12 3456 7890 1234 5678 90`}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-[11.5px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-400 focus:outline-none dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/[0.16]"
          />
          <p className="mt-1 text-[10.5px] text-slate-500">
            Erscheint zentriert oberhalb der Seitenzahl auf jeder Seite.
            Typisch: Kanzlei-Adresse, Kontaktdaten, USt-ID, Bankverbindung.
          </p>
        </div>

        {/* Reset */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/[0.04]">
          <p className="text-[10.5px] text-slate-500">
            Werte werden lokal in diesem Browser persistiert.
          </p>
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-slate-500 underline-offset-2 hover:text-red-600 hover:underline dark:text-slate-400 dark:hover:text-red-400"
          >
            Alle Werte löschen
          </button>
        </div>
      </div>
    </section>
  );
}
