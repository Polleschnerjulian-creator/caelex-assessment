"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — DocumentMetaPane (Aktenzeichen + Briefkopf-Felder).
 *
 * Sprint 14 (2026-05-19). Erscheint zwischen Ribbon und A4-Seite. Per
 * Default collapsed (single-line summary), expanded zeigt strukturierte
 * Inputs für DIN-5008-konforme Briefkopf-Felder + jur. Metadaten.
 *
 * Daten werden als YAML-frontmatter im markdown body persistiert
 * (siehe lib/atlas/document-meta.ts). PDF/DOCX-export liest die felder
 * aus dem body — Editor-state ist die master.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileSignature,
  Building,
  Hash,
  User,
  Calendar,
  Mail,
  Type as TypeIcon,
} from "lucide-react";
import type { DocumentMeta } from "@/lib/atlas/document-meta";

interface Props {
  meta: DocumentMeta;
  onChange: (next: DocumentMeta) => void;
}

export function DocumentMetaPane({ meta, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const filledCount = Object.values(meta).filter(
    (v) => v !== undefined && v !== null && String(v).trim() !== "",
  ).length;

  const summary = [
    meta.aktenzeichen,
    meta.mandant && `· ${meta.mandant}`,
    meta.betreff && `· ${meta.betreff}`,
  ]
    .filter(Boolean)
    .join(" ");

  const set = <K extends keyof DocumentMeta>(
    key: K,
    value: DocumentMeta[K],
  ) => {
    onChange({ ...meta, [key]: value });
  };

  return (
    <div className="shrink-0 border-b border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
      {/* Collapsed summary row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-1.5 text-left text-[11.5px] text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
      >
        {expanded ? (
          <ChevronDown size={11} className="shrink-0 text-slate-400" />
        ) : (
          <ChevronRight size={11} className="shrink-0 text-slate-400" />
        )}
        <FileSignature
          size={11}
          className="shrink-0 text-emerald-600 dark:text-emerald-400"
        />
        <span className="font-medium">Dokument-Eigenschaften</span>
        <span className="text-slate-400">·</span>
        <span className="truncate text-slate-500">
          {filledCount === 0 ? (
            <em className="italic">leer — click zum Ausfüllen</em>
          ) : (
            summary || `${filledCount} Felder befüllt`
          )}
        </span>
      </button>

      {/* Expanded form */}
      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="grid grid-cols-2 gap-3">
            <MetaField
              icon={Hash}
              label="Aktenzeichen"
              value={meta.aktenzeichen ?? ""}
              onChange={(v) => set("aktenzeichen", v)}
              placeholder="KM/2026/123"
            />
            <MetaField
              icon={Calendar}
              label="Datum"
              value={meta.datum ?? ""}
              onChange={(v) => set("datum", v)}
              placeholder="19.05.2026"
            />
            <MetaField
              icon={Building}
              label="Mandant"
              value={meta.mandant ?? ""}
              onChange={(v) => set("mandant", v)}
              placeholder="SpaceCo GmbH"
            />
            <MetaField
              icon={Building}
              label="Gericht / Behörde"
              value={meta.gericht ?? ""}
              onChange={(v) => set("gericht", v)}
              placeholder="BGH / BNetzA / OLG München"
            />
            <MetaField
              icon={User}
              label="Bearbeiter"
              value={meta.bearbeiter ?? ""}
              onChange={(v) => set("bearbeiter", v)}
              placeholder="RA Dr. Müller"
            />
            <MetaField
              icon={TypeIcon}
              label="Betreff"
              value={meta.betreff ?? ""}
              onChange={(v) => set("betreff", v)}
              placeholder="Antrag auf Genehmigung gem. § 2 WeltraumG"
              full
            />
            <MetaTextarea
              icon={Mail}
              label="Empfänger (multi-line Anschrift)"
              value={meta.empfänger ?? ""}
              onChange={(v) => set("empfänger", v)}
              placeholder={
                "Bundesministerium für Wirtschaft\nReferat VB3\nScharnhorststr. 34-37\n10115 Berlin"
              }
              rows={4}
              full
            />
          </div>
          <div className="mt-2 text-[10.5px] text-slate-500">
            Diese Felder werden als YAML-Header im Dokument-Markdown gespeichert
            und vom PDF/DOCX-Export automatisch in den Briefkopf eingesetzt.
          </div>
        </div>
      )}
    </div>
  );
}

function MetaField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  full,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-slate-500">
        <Icon size={9} />
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12.5px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </div>
  );
}

function MetaTextarea({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  rows,
  full,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-slate-500">
        <Icon size={9} />
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows ?? 3}
        className="w-full resize-y rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </div>
  );
}
