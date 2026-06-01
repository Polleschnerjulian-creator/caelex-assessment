"use client";

/**
 * ClassificationCoverageNote.tsx — Ehrlichkeits-Hinweis zur Einstufungsabdeckung.
 *
 * Zeigt compact den Abdeckungsstatus des Auto-Klassifizierers oder des
 * gespeicherten Einstufungszustands an. Ziel: Die ABWESENHEIT einer
 * Einstufung klar als "wir wissen es nicht" kommunizieren — niemals als
 * "frei / unkontrolliert".
 *
 * Drei Stufen:
 *   - no-data  → amber/stark (AlertTriangle) — fehlende Abdeckung, starke Warnung
 *   - uncertain → amber/dezent (Info)         — schwache Treffer, Bestätigung nötig
 *   - matched   → neutral/ruhig (CheckCircle2) — Vorschlag vorhanden, bestätigen
 *
 * Design: Trade-light-Theme (--trade-* Tokens). Kein jsdom-Test (hängt in CI)
 * — per tsc + eslint verifiziert.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  type LucideIcon,
} from "lucide-react";
import type { CoverageVerdict } from "@/lib/trade/classification-coverage";

// ─── Stufen-Styling ───────────────────────────────────────────────────────────

interface LevelConfig {
  wrapper: string;
  iconColor: string;
  headlineColor: string;
  messageColor: string;
  disclaimerColor: string;
  Icon: LucideIcon;
}

const LEVEL_CONFIG: Record<CoverageVerdict["level"], LevelConfig> = {
  "no-data": {
    wrapper: "rounded-md border border-amber-300 bg-amber-50 p-3",
    iconColor: "text-amber-600",
    headlineColor: "text-amber-900 font-semibold",
    messageColor: "text-amber-800",
    disclaimerColor: "text-amber-700",
    Icon: AlertTriangle,
  },
  uncertain: {
    wrapper: "rounded-md border border-amber-200 bg-amber-50/60 p-3",
    iconColor: "text-amber-500",
    headlineColor: "text-amber-800 font-medium",
    messageColor: "text-amber-700",
    disclaimerColor: "text-amber-600",
    Icon: Info,
  },
  matched: {
    wrapper:
      "rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-3",
    iconColor: "text-trade-text-muted",
    headlineColor: "text-trade-text-secondary font-medium",
    messageColor: "text-trade-text-muted",
    disclaimerColor: "text-trade-text-muted",
    Icon: CheckCircle2,
  },
};

// ─── Komponente ───────────────────────────────────────────────────────────────

interface ClassificationCoverageNoteProps {
  verdict: CoverageVerdict;
}

export function ClassificationCoverageNote({
  verdict,
}: ClassificationCoverageNoteProps) {
  const cfg = LEVEL_CONFIG[verdict.level];
  const { Icon } = cfg;

  return (
    <div className={cfg.wrapper}>
      {/* Header */}
      <div className="mb-1.5 flex items-start gap-2">
        <Icon
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${cfg.iconColor}`}
          strokeWidth={2}
        />
        <p className={`text-[12px] leading-snug ${cfg.headlineColor}`}>
          {verdict.headline}
        </p>
      </div>

      {/* Message */}
      <p className={`mb-2 text-[11px] leading-relaxed ${cfg.messageColor}`}>
        {verdict.message}
      </p>

      {/* Disclaimer */}
      <p className={`text-[10px] leading-relaxed ${cfg.disclaimerColor}`}>
        <strong className="font-semibold">Risikohinweis:</strong>{" "}
        {verdict.disclaimer}
      </p>
    </div>
  );
}
