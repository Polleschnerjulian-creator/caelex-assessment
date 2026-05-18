"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Letterhead (Kanzlei-Briefkopf) storage utility.
 *
 * Sprint 3a (2026-05-18) — pragmatischer client-only Anfang.
 * Persistiert Kanzlei-Name + Logo (data-URL) in localStorage. Beim
 * PDF/DOCX-Render werden die Werte gelesen und in den Header eingesetzt.
 *
 * Warum localStorage statt DB?
 *   - Logo ist max ~50KB PNG, passt locker in den 5MB-localStorage-Quota
 *   - Keine API-Round-Trips beim PDF-Render (sync read)
 *   - Keine DB-Migration für ein Feature das per-user / per-device ist
 *   - Migration zu DB/R2 später möglich ohne API-Bruch (Hook abstrahiert)
 *
 * Wenn die Kanzlei in einer Organization mit mehreren Anwälten ist,
 * sollte das Letterhead langfristig org-weit über R2 + Prisma laufen.
 * Das ist ein Sprint für später.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface LetterheadConfig {
  /** Kanzlei-Name. Erscheint als Absender-Mini-Linie über Adressblock im
   *  DIN-5008-Letter-Layout sowie im PDF-Footer. */
  kanzleiName: string;
  /** Logo als data-URL (PNG/JPG). Wird via jsPDF.addImage eingebettet. */
  logoDataUrl: string | null;
  /** Logo-Breite in mm (Höhe wird via aspect-ratio berechnet). Default 32mm. */
  logoWidthMm: number;
  /** Adresse + Telefonzeile die als Footer-Block im PDF erscheint.
   *  Mehrzeilig erlaubt — wird Zeile-für-Zeile gerendert. */
  footerLine: string;
}

const STORAGE_KEY = "atlas-letterhead-v1";

const DEFAULT: LetterheadConfig = {
  kanzleiName: "",
  logoDataUrl: null,
  logoWidthMm: 32,
  footerLine: "",
};

export function readLetterhead(): LetterheadConfig {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<LetterheadConfig>;
    return {
      kanzleiName: parsed.kanzleiName ?? "",
      logoDataUrl: parsed.logoDataUrl ?? null,
      logoWidthMm:
        typeof parsed.logoWidthMm === "number" ? parsed.logoWidthMm : 32,
      footerLine: parsed.footerLine ?? "",
    };
  } catch {
    return DEFAULT;
  }
}

export function writeLetterhead(cfg: Partial<LetterheadConfig>): void {
  if (typeof window === "undefined") return;
  const current = readLetterhead();
  const merged: LetterheadConfig = { ...current, ...cfg };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    /* Notify listeners (e.g. settings-page preview, PDF-preview tab) */
    window.dispatchEvent(new CustomEvent("atlas-letterhead-changed"));
  } catch (err) {
    console.error("Failed to persist letterhead config", err);
  }
}

export function clearLetterhead(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("atlas-letterhead-changed"));
}

/** Convert a File (PNG/JPG) to a data-URL. Used by the file-picker
 *  in the settings UI. Returns null if the file is too large. */
export async function fileToDataUrl(
  file: File,
  maxBytes = 200 * 1024,
): Promise<string | null> {
  if (file.size > maxBytes) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader returned non-string"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
