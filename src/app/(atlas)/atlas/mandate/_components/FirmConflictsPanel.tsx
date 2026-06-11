"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Firm-weites Konflikt-Panel auf der Mandate-Übersicht.
 *
 * Lädt GET /api/atlas/conflicts: offene (nicht freigegebene)
 * Interessenkonflikte aller aktiven Mandate der Kanzlei. Detail-Gruppen
 * enthalten nur Mandate, auf die der Nutzer Zugriff hat; der org-weite
 * Zähler kann höher liegen (abgeschottete Mandate zählen mit, ihre
 * Identitäten bleiben serverseitig — §43a-BRAO-Modell der Route).
 *
 * Kein Treffer → rendert nichts. Freigeben passiert im Mandat selbst
 * (Banner auf der Detailseite) — hier nur Überblick + Absprung.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";

type ConflictSeverity = "high" | "medium" | "info";

interface ConflictMatch {
  newPartyName: string;
  matchedMandateName: string;
  severity: ConflictSeverity;
}

interface FirmConflictGroup {
  mandateId: string;
  mandateName: string;
  conflicts: ConflictMatch[];
}

interface FirmWideConflictResult {
  groups: FirmConflictGroup[];
  totalOpenConflicts: number;
}

const SEVERITY_RANK: Record<ConflictSeverity, number> = {
  high: 0,
  medium: 1,
  info: 2,
};

const SEVERITY_BADGE: Record<ConflictSeverity, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  info: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
};

const SEVERITY_LABEL: Record<ConflictSeverity, string> = {
  high: "Hoch",
  medium: "Mittel",
  info: "Hinweis",
};

function worstSeverity(conflicts: ConflictMatch[]): ConflictSeverity {
  let worst: ConflictSeverity = "info";
  for (const c of conflicts) {
    if (SEVERITY_RANK[c.severity] < SEVERITY_RANK[worst]) worst = c.severity;
  }
  return worst;
}

export function FirmConflictsPanel() {
  const [result, setResult] = useState<FirmWideConflictResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/atlas/conflicts", {
          cache: "no-store",
        });
        if (res.ok && !cancelled) {
          setResult((await res.json()) as FirmWideConflictResult);
        }
      } catch {
        /* Übersichts-Panel ist Zusatzinformation — Ladefehler stören
           die Mandate-Liste nicht. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!result || result.totalOpenConflicts === 0) return null;

  const hiddenCount =
    result.totalOpenConflicts -
    result.groups.reduce((n, g) => n + g.conflicts.length, 0);

  return (
    <div className="border-b border-slate-100 px-6 py-3 dark:border-white/[0.05]">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle
          size={13}
          className="shrink-0 text-amber-600 dark:text-amber-400"
        />
        <h2 className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200">
          Offene Interessenkonflikte ({result.totalOpenConflicts})
        </h2>
      </div>
      <ul className="space-y-1">
        {result.groups.map((g) => {
          const worst = worstSeverity(g.conflicts);
          return (
            <li key={g.mandateId}>
              <Link
                href={`/atlas/mandate/${g.mandateId}#conflicts`}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-slate-700 transition-colors hover:bg-black/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.04]"
              >
                <span
                  className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_BADGE[worst]}`}
                >
                  {SEVERITY_LABEL[worst]}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {g.mandateName}
                  </span>{" "}
                  — {g.conflicts.length}{" "}
                  {g.conflicts.length === 1 ? "Treffer" : "Treffer"} (z.&nbsp;B.
                  „{g.conflicts[0].newPartyName}&ldquo; vs.{" "}
                  {g.conflicts[0].matchedMandateName})
                </span>
                <ChevronRight
                  size={13}
                  className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 && (
        <p className="mt-1.5 px-2 text-[11.5px] text-slate-500 dark:text-slate-400">
          {hiddenCount} weitere{hiddenCount === 1 ? "r" : ""} Konflikt
          {hiddenCount === 1 ? "" : "e"} in Mandaten, auf die Sie keinen Zugriff
          haben — die jeweiligen Mandatsverantwortlichen sehen sie in ihrer
          Übersicht.
        </p>
      )}
    </div>
  );
}
