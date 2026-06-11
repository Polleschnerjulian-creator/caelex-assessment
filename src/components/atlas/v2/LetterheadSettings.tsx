"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Letterhead (Kanzlei-Briefkopf) Settings Card.
 *
 * Originally Sprint 3a (2026-05-18) — localStorage-only.
 * Upgraded to server-persistent: reads/writes via
 * /api/atlas/settings/branding (AtlasOrgBranding model).
 *
 * PDF/DOCX ripple strategy:
 *   artifact-pdf.ts + artifact-docx.ts call readLetterhead() from
 *   src/lib/atlas/letterhead.ts which is synchronous localStorage.
 *   To keep those consumers working WITHOUT changing them, this
 *   component hydrates localStorage from the server response on mount.
 *   So: server is the source of truth for cross-device sync; localStorage
 *   is a write-through cache for the PDF/DOCX render path.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, Check, ImageIcon, Info, Lock } from "lucide-react";
import {
  writeLetterhead,
  clearLetterhead,
  fileToDataUrl,
  type LetterheadConfig,
} from "@/lib/atlas/letterhead";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface BrandingResponse {
  letterheadName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  raNumber: string | null;
  authority: string | null;
  insuranceNote: string | null;
  bankName: string | null;
  iban: string | null;
  bic: string | null;
  defaultJurisdiction: string | null;
  defaultClosing: string | null;
  logoUrl: string | null;
  logoStorageKey: string | null;
  canEditFirm: boolean;
  role: string;
}

/** Shape stored in component state — includes the localStorage-only fields
 *  (logoDataUrl, logoWidthMm, footerLine) alongside the server fields. */
interface LocalState {
  // ── server-persisted fields ──────────────────────────────────────────
  letterheadName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  raNumber: string;
  authority: string;
  insuranceNote: string;
  bankName: string;
  iban: string;
  bic: string;
  defaultJurisdiction: string;
  defaultClosing: string;
  logoUrl: string | null;
  logoStorageKey: string | null;
  // ── localStorage-only fields (PDF/DOCX render path) ──────────────────
  /** Legacy kanzleiName for the PDF footer / header line.
   *  Mirrors letterheadName on save so old consumers keep working. */
  kanzleiName: string;
  logoDataUrl: string | null;
  logoWidthMm: number;
  footerLine: string;
}

const EMPTY_STATE: LocalState = {
  letterheadName: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  raNumber: "",
  authority: "",
  insuranceNote: "",
  bankName: "",
  iban: "",
  bic: "",
  defaultJurisdiction: "",
  defaultClosing: "",
  logoUrl: null,
  logoStorageKey: null,
  kanzleiName: "",
  logoDataUrl: null,
  logoWidthMm: 32,
  footerLine: "",
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** Sync state → localStorage so artifact-pdf.ts / artifact-docx.ts
 *  (which call readLetterhead() synchronously) stay in lock-step. */
function hydrateLocalStorage(state: LocalState): void {
  const cfg: LetterheadConfig = {
    kanzleiName: state.letterheadName || state.kanzleiName,
    logoDataUrl: state.logoDataUrl,
    logoWidthMm: state.logoWidthMm,
    footerLine: state.footerLine,
  };
  writeLetterhead(cfg);
}

function serverResponseToState(
  data: BrandingResponse,
  prev: LocalState,
): LocalState {
  return {
    ...prev,
    letterheadName: data.letterheadName ?? "",
    address: data.address ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    website: data.website ?? "",
    raNumber: data.raNumber ?? "",
    authority: data.authority ?? "",
    insuranceNote: data.insuranceNote ?? "",
    bankName: data.bankName ?? "",
    iban: data.iban ?? "",
    bic: data.bic ?? "",
    defaultJurisdiction: data.defaultJurisdiction ?? "",
    defaultClosing: data.defaultClosing ?? "",
    logoUrl: data.logoUrl ?? null,
    logoStorageKey: data.logoStorageKey ?? null,
    // Mirror letterheadName → kanzleiName for localStorage consumers.
    kanzleiName: data.letterheadName ?? prev.kanzleiName,
  };
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function LetterheadSettings() {
  const [state, setState] = useState<LocalState>(EMPTY_STATE);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Initial fetch ────────────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/atlas/settings/branding")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<BrandingResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setState((prev) => {
          const next = serverResponseToState(data, prev);
          // Hydrate localStorage so PDF/DOCX render path picks up
          // server-persisted values immediately.
          hydrateLocalStorage(next);
          return next;
        });
        setCanEdit(data.canEditFirm);
      })
      .catch(() => {
        if (!cancelled) setError("Einstellungen konnten nicht geladen werden.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Save helper ─────────────────────────────────────────────────────── */

  const persist = useCallback(
    async (patch: Partial<LocalState>) => {
      /* L-b fix (2026-06-11): snapshot the pre-patch state so a failed
         server write can roll back BOTH the optimistic local state and
         the localStorage write-through cache. Without the rollback the
         UI (and the PDF/DOCX render path) showed values the server
         never accepted — silent divergence across devices. */
      const prev = state;
      const next = { ...state, ...patch };
      setState(next);
      // Always keep localStorage in sync for PDF/DOCX render path.
      hydrateLocalStorage(next);

      if (!canEdit) return; // read-only member — skip server write

      setSaving(true);
      setError(null);

      // Build the server payload — only the DB-persisted fields.
      const serverPayload: Record<string, unknown> = {};
      const SERVER_FIELDS: (keyof LocalState)[] = [
        "letterheadName",
        "address",
        "phone",
        "email",
        "website",
        "raNumber",
        "authority",
        "insuranceNote",
        "bankName",
        "iban",
        "bic",
        "defaultJurisdiction",
        "defaultClosing",
        "logoUrl",
        "logoStorageKey",
      ];
      for (const key of SERVER_FIELDS) {
        if (key in patch) {
          serverPayload[key] = patch[key] ?? null;
        }
      }

      if (Object.keys(serverPayload).length > 0) {
        try {
          const res = await fetch("/api/atlas/settings/branding", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(serverPayload),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
        } catch (err) {
          /* L-b fix: roll back the optimistic update — local state AND
             localStorage return to the last server-accepted values.
             Success path below stays unchanged. */
          setState(prev);
          hydrateLocalStorage(prev);
          setError(
            err instanceof Error
              ? err.message
              : "Speichern fehlgeschlagen. Bitte erneut versuchen.",
          );
          setSaving(false);
          return;
        }
      }

      setSaving(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    },
    [state, canEdit],
  );

  /* ── Logo upload ─────────────────────────────────────────────────────── */

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
    await persist({ logoDataUrl: dataUrl });
  };

  /* ── Reset ───────────────────────────────────────────────────────────── */

  const handleClear = async () => {
    clearLetterhead();
    const cleared: LocalState = { ...EMPTY_STATE };
    setState(cleared);
    if (canEdit) {
      await persist({
        letterheadName: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        raNumber: "",
        authority: "",
        insuranceNote: "",
        bankName: "",
        iban: "",
        bic: "",
        defaultJurisdiction: "",
        defaultClosing: "",
        logoUrl: null,
        logoStorageKey: null,
        kanzleiName: "",
        logoDataUrl: null,
        logoWidthMm: 32,
        footerLine: "",
      });
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────── */

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-400 focus:outline-none dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/[0.16] disabled:opacity-50 disabled:cursor-not-allowed";

  const labelClass =
    "mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300";

  const hintClass = "mt-1 text-[10.5px] text-slate-500 dark:text-slate-500";

  if (loading) {
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
        </div>
        <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.02]" />
      </section>
    );
  }

  return (
    <section>
      {/* ── Header ── */}
      <div className="mb-4 flex items-center gap-2">
        <ImageIcon
          className="h-4 w-4 text-slate-400 dark:text-slate-500"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Kanzlei-Briefkopf (Letterhead)
        </h2>
        {saving && (
          <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
            Speichern…
          </span>
        )}
        {!saving && savedFlash && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <Check size={12} /> Gespeichert
          </span>
        )}
        {!canEdit && !loading && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <Lock size={11} /> Nur Lesen
          </span>
        )}
      </div>

      {/* ── Info banner ── */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/[0.04] dark:bg-white/[0.02]">
        <Info
          size={13}
          className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500"
          strokeWidth={1.5}
        />
        <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400">
          Diese Einstellungen werden organisationsweit gespeichert und auf allen
          Geräten synchronisiert. Logo + Kanzlei-Name erscheinen automatisch im
          PDF/DOCX-Export von Briefen und Schriftsätzen.
        </p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
        {/* ── Kanzlei-Name ── */}
        <div>
          <label className={labelClass}>Kanzlei-Name</label>
          <input
            type="text"
            value={state.letterheadName}
            onChange={(e) =>
              persist({
                letterheadName: e.target.value,
                kanzleiName: e.target.value,
              })
            }
            disabled={!canEdit}
            placeholder="z. B. Rechtsanwälte Schmidt & Partner"
            className={inputClass}
          />
          <p className={hintClass}>
            Erscheint als Absender-Mini-Linie über dem Adress-Block (Brief /
            Schriftsatz) und im PDF-Footer.
          </p>
        </div>

        {/* ── Adresse ── */}
        <div>
          <label className={labelClass}>Adresse</label>
          <textarea
            value={state.address}
            onChange={(e) => persist({ address: e.target.value })}
            disabled={!canEdit}
            rows={2}
            placeholder={"Maximilianstr. 35\n80539 München"}
            className={`${inputClass} font-mono text-[12px]`}
          />
        </div>

        {/* ── Kontakt: Phone + Email ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Telefon</label>
            <input
              type="tel"
              value={state.phone}
              onChange={(e) => persist({ phone: e.target.value })}
              disabled={!canEdit}
              placeholder="+49 89 12345-0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>E-Mail</label>
            <input
              type="email"
              value={state.email}
              onChange={(e) => persist({ email: e.target.value })}
              disabled={!canEdit}
              placeholder="info@kanzlei.de"
              className={inputClass}
            />
          </div>
        </div>

        {/* ── Website ── */}
        <div>
          <label className={labelClass}>Website</label>
          <input
            type="url"
            value={state.website}
            onChange={(e) => persist({ website: e.target.value })}
            disabled={!canEdit}
            placeholder="https://www.kanzlei.de"
            className={inputClass}
          />
        </div>

        {/* ── Anwaltliche Pflichtangaben ── */}
        <div className="border-t border-slate-100 pt-4 dark:border-white/[0.04]">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Anwaltliche Pflichtangaben
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>RA-Nummer / Zulassung</label>
              <input
                type="text"
                value={state.raNumber}
                onChange={(e) => persist({ raNumber: e.target.value })}
                disabled={!canEdit}
                placeholder="DE123456"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Zugelassene Behörde</label>
              <input
                type="text"
                value={state.authority}
                onChange={(e) => persist({ authority: e.target.value })}
                disabled={!canEdit}
                placeholder="Rechtsanwaltskammer München"
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>Berufshaftpflicht-Hinweis</label>
            <textarea
              value={state.insuranceNote}
              onChange={(e) => persist({ insuranceNote: e.target.value })}
              disabled={!canEdit}
              rows={2}
              placeholder="Versichert bei XYZ Versicherung, Poliçennr. 123-456"
              className={`${inputClass} text-[12px]`}
            />
          </div>
        </div>

        {/* ── Bankverbindung ── */}
        <div className="border-t border-slate-100 pt-4 dark:border-white/[0.04]">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Bankverbindung
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 sm:col-span-1">
              <label className={labelClass}>Bank</label>
              <input
                type="text"
                value={state.bankName}
                onChange={(e) => persist({ bankName: e.target.value })}
                disabled={!canEdit}
                placeholder="Stadtsparkasse München"
                className={inputClass}
              />
            </div>
            <div className="col-span-3 sm:col-span-1">
              <label className={labelClass}>IBAN</label>
              <input
                type="text"
                value={state.iban}
                onChange={(e) =>
                  persist({ iban: e.target.value.toUpperCase() })
                }
                disabled={!canEdit}
                placeholder="DE12 3456 7890 1234 5678 90"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="col-span-3 sm:col-span-1">
              <label className={labelClass}>BIC</label>
              <input
                type="text"
                value={state.bic}
                onChange={(e) => persist({ bic: e.target.value.toUpperCase() })}
                disabled={!canEdit}
                placeholder="SSKMDEMMXXX"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
        </div>

        {/* ── Defaults ── */}
        <div className="border-t border-slate-100 pt-4 dark:border-white/[0.04]">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Dokument-Defaults
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Standard-Gerichtsstand</label>
              <input
                type="text"
                value={state.defaultJurisdiction}
                onChange={(e) =>
                  persist({ defaultJurisdiction: e.target.value })
                }
                disabled={!canEdit}
                placeholder="München"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Standard-Schlussformel</label>
              <input
                type="text"
                value={state.defaultClosing}
                onChange={(e) => persist({ defaultClosing: e.target.value })}
                disabled={!canEdit}
                placeholder="Mit freundlichen Grüßen"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* ── Logo upload (localStorage-only, no R2 yet) ── */}
        <div className="border-t border-slate-100 pt-4 dark:border-white/[0.04]">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Logo (PDF / DOCX)
          </p>
          <label className={labelClass}>Logo (PNG/JPG, max 200 KB)</label>
          <div className="flex items-start gap-3">
            <div
              className={`flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed ${
                state.logoDataUrl
                  ? "border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white"
                  : "border-slate-300 bg-slate-50 dark:border-white/[0.10] dark:bg-white/[0.02]"
              }`}
            >
              {state.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.logoDataUrl}
                  alt="Logo-Vorschau"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-[10.5px] text-slate-400 dark:text-slate-500">
                  Keine Datei
                </span>
              )}
            </div>
            {canEdit && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/[0.05]"
                >
                  <Upload size={11} />
                  {state.logoDataUrl ? "Logo ändern" : "Logo hochladen"}
                </button>
                {state.logoDataUrl && (
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
            )}
          </div>
          {uploadError && (
            <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
              {uploadError}
            </p>
          )}
          <p className={hintClass}>
            Logo wird lokal im Browser gespeichert und in PDF/DOCX-Exporte
            eingebettet. (R2-Upload für organisationsweite Logos folgt in einem
            späteren Sprint.)
          </p>
        </div>

        {/* ── Logo-Breite ── */}
        {state.logoDataUrl && canEdit && (
          <div>
            <label className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-slate-700 dark:text-slate-300">
              <span>Logo-Breite</span>
              <span className="font-mono text-[11px] text-slate-500">
                {state.logoWidthMm} mm
              </span>
            </label>
            <input
              type="range"
              min="15"
              max="60"
              step="1"
              value={state.logoWidthMm}
              onChange={(e) => persist({ logoWidthMm: Number(e.target.value) })}
              className="w-full"
            />
            <p className={hintClass}>
              Logo erscheint rechts oben auf der ersten Seite (Briefe +
              Schriftsätze).
            </p>
          </div>
        )}

        {/* ── Footer-Block (localStorage-only, for PDF) ── */}
        <div>
          <label className={labelClass}>
            Footer-Block (mehrzeilig, für PDF)
          </label>
          <textarea
            value={state.footerLine}
            onChange={(e) => persist({ footerLine: e.target.value })}
            disabled={!canEdit}
            rows={3}
            placeholder={`Schmidt & Partner Rechtsanwälte mbB · Maximilianstr. 35 · 80539 München\nTel +49 89 12345-0 · Fax +49 89 12345-99 · info@kanzlei.de\nUSt-IdNr. DE123456789 · IBAN DE12 3456 7890 1234 5678 90`}
            className={`${inputClass} font-mono text-[11.5px]`}
          />
          <p className={hintClass}>
            Erscheint zentriert oberhalb der Seitenzahl auf jeder Seite.
            Typisch: Kanzlei-Adresse, Kontaktdaten, USt-ID, Bankverbindung. Wird
            lokal im Browser gespeichert.
          </p>
        </div>

        {/* ── Reset ── */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/[0.04]">
          <p className="text-[10.5px] text-slate-500">
            {canEdit
              ? "Einstellungen werden organisationsweit synchronisiert."
              : "Nur Owner und Admins können Briefkopf-Einstellungen bearbeiten."}
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-slate-500 underline-offset-2 hover:text-red-600 hover:underline dark:text-slate-400 dark:hover:text-red-400"
            >
              Alle Werte löschen
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
