"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — MandateAttachChip
 *
 * Pill oberhalb des Composers, sichtbar wenn ein Mandat an den
 * aktuellen Chat angehängt ist. Klick auf [×] detached. Klick auf
 * den Mandats-Namen navigiert zum Mandat-Workspace (öffnet in
 * neuem Tab — der laufende Chat soll nicht verloren gehen).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { Briefcase, X } from "lucide-react";

interface Props {
  mandateId: string;
  mandateName: string;
  onDetach: () => void;
  /** Disable während gerade ein Attach/Detach läuft. */
  disabled?: boolean;
}

export function MandateAttachChip({
  mandateId,
  mandateName,
  onDetach,
  disabled,
}: Props) {
  return (
    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2 pr-1 text-[12px] dark:border-white/[0.08] dark:bg-white/[0.04]">
      <Link
        href={`/atlas/mandate/${mandateId}`}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-1.5 text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-200 dark:hover:text-slate-50"
        title={`Mandat-Workspace öffnen: ${mandateName}`}
      >
        <Briefcase size={11} className="shrink-0 opacity-60" />
        <span className="line-clamp-1 max-w-[180px]">{mandateName}</span>
      </Link>
      <button
        type="button"
        onClick={onDetach}
        disabled={disabled}
        aria-label="Mandat abhängen"
        title="Abhängen"
        className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-black/[0.06] hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
      >
        <X size={11} strokeWidth={2.5} />
      </button>
    </div>
  );
}
