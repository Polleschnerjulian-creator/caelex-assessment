"use client";

/**
 * DeemedExportWarning.tsx — Kompakter Deemed-Export-Hinweisblock.
 *
 * Zeigt Risikostufe, Erklärung, Handlungsempfehlungen und Disclaimer
 * für einen kontrollierten Artikel an.
 *
 * Props:
 *   - risk: Ergebnis von evaluateDeemedExportRisk()
 *   - itemName: Anzeigename des Artikels (für den Astra-Prefill-Link)
 *
 * Rendert nichts bei risk.level === "none".
 *
 * Design: Trade-light-Theme (--trade-* Tokens), amber für "awareness",
 * rot getönt für "action". Kein jsdom-Test (hängt in CI) — per tsc +
 * eslint verifiziert.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import type { DeemedExportRisk } from "@/lib/trade/deemed-export";

// ─── Props ───────────────────────────────────────────────────────────────────

interface DeemedExportWarningProps {
  risk: DeemedExportRisk;
  itemName: string;
}

// ─── Styling je Risikostufe ───────────────────────────────────────────────────

const LEVEL_STYLES = {
  awareness: {
    wrapper: "rounded-md p-4 trade-chip-warn",
    iconColor: "text-current",
    headlineColor: "text-current",
    bodyColor: "text-current",
    guidanceColor: "text-current",
    disclaimerColor: "text-current",
    bullet: "text-current",
  },
  action: {
    wrapper: "rounded-md p-4 trade-chip-danger",
    iconColor: "text-current",
    headlineColor: "text-current",
    bodyColor: "text-current",
    guidanceColor: "text-current",
    disclaimerColor: "text-current",
    bullet: "text-current",
  },
} as const satisfies Record<
  Exclude<DeemedExportRisk["level"], "none">,
  {
    wrapper: string;
    iconColor: string;
    headlineColor: string;
    bodyColor: string;
    guidanceColor: string;
    disclaimerColor: string;
    bullet: string;
  }
>;

// ─── Komponente ───────────────────────────────────────────────────────────────

export function DeemedExportWarning({
  risk,
  itemName,
}: DeemedExportWarningProps) {
  // Keine Ausgabe für unkontrollierte Artikel
  if (risk.level === "none") return null;

  const styles = LEVEL_STYLES[risk.level];

  const astraPrefill = encodeURIComponent(
    `Erkläre mir Deemed Exports / Technologietransfer für "${itemName}" — was muss ich vor dem Teilen technischer Daten beachten?`,
  );

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className="mb-2 flex items-start gap-2.5">
        <AlertTriangle
          className={`mt-0.5 h-4 w-4 shrink-0 ${styles.iconColor}`}
          strokeWidth={2}
        />
        <p
          className={`text-[13px] font-semibold leading-snug ${styles.headlineColor}`}
        >
          {risk.headline}
        </p>
      </div>

      {/* Erklärung */}
      <p className={`mb-3 text-[12px] leading-relaxed ${styles.bodyColor}`}>
        {risk.explanation}
      </p>

      {/* Handlungsempfehlungen */}
      {risk.guidance.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {risk.guidance.map((line, i) => (
            <li
              key={i}
              className={`flex items-start gap-2 text-[12px] leading-relaxed ${styles.guidanceColor}`}
            >
              <span
                className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${styles.bullet.replace("text-", "bg-")}`}
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Links */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Link
          href="/trade/deemed-exports"
          className={`text-[11px] font-medium underline underline-offset-2 transition hover:opacity-80 ${styles.iconColor}`}
        >
          Mehr zu Deemed Exports
        </Link>
        <Link
          href={`/trade/astra?prefill=${astraPrefill}`}
          className={`flex items-center gap-1 text-[11px] font-medium underline underline-offset-2 transition hover:opacity-80 ${styles.iconColor}`}
          title="Astra zur Deemed-Export-Einschätzung für diesen Artikel befragen"
        >
          <Sparkles className="h-3 w-3" />
          Astra fragen
        </Link>
      </div>

      {/* Disclaimer */}
      <p className={`text-[10px] leading-relaxed ${styles.disclaimerColor}`}>
        <strong className="font-semibold">Risikohinweis:</strong>{" "}
        {risk.disclaimer}
      </p>
    </div>
  );
}
