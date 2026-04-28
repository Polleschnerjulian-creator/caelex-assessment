"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * CrossBorderQuickRef — lightweight comparison surface for the Atlas
 * extended jurisdictions (JP / IN / AU / CA / AE / KR / IL / CN / RU /
 * BR / ZA). These don't have full JurisdictionLaw entries (insurance
 * regime, debris-mitigation thresholds, etc.) — just legal-source
 * catalogues — so the deep ComparisonTable can't render them.
 *
 * Instead this surfaces a compact card per jurisdiction with:
 *   - jurisdiction code + flag emoji
 *   - source count (national + applicable INT/EU)
 *   - principal authority abbreviations
 *   - top compliance areas (by frequency)
 *   - deep-link to the Atlas jurisdiction page
 *
 * Used as a separate panel below the main ComparisonTable on the
 * comparator page, so EU+UK lawyers see deep data + non-EU at a
 * glance without conflating data quality.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import {
  ATLAS_EXTENDED_JURISDICTION_CODES,
  type AtlasExtendedJurisdictionCode,
} from "@/lib/space-law-types";
import {
  getLegalSourcesByJurisdiction,
  getAuthoritiesByJurisdiction,
  type ComplianceArea,
} from "@/data/legal-sources";

const FLAG: Record<AtlasExtendedJurisdictionCode, string> = {
  JP: "🇯🇵",
  IN: "🇮🇳",
  AU: "🇦🇺",
  CA: "🇨🇦",
  AE: "🇦🇪",
  KR: "🇰🇷",
  IL: "🇮🇱",
  CN: "🇨🇳",
  RU: "🇷🇺",
  BR: "🇧🇷",
  ZA: "🇿🇦",
};

const NAME: Record<AtlasExtendedJurisdictionCode, string> = {
  JP: "Japan",
  IN: "India",
  AU: "Australia",
  CA: "Canada",
  AE: "United Arab Emirates",
  KR: "South Korea",
  IL: "Israel",
  CN: "China",
  RU: "Russian Federation",
  BR: "Brazil",
  ZA: "South Africa",
};

interface QuickRefCard {
  code: AtlasExtendedJurisdictionCode;
  name: string;
  flag: string;
  sourceCount: number;
  authorities: { id: string; abbreviation: string }[];
  topAreas: ComplianceArea[];
}

function buildCard(code: AtlasExtendedJurisdictionCode): QuickRefCard {
  const sources = getLegalSourcesByJurisdiction(code);
  const authorities = getAuthoritiesByJurisdiction(code);

  // Tally compliance areas across this JD's sources, return top 3.
  const tally = new Map<ComplianceArea, number>();
  for (const s of sources) {
    for (const a of s.compliance_areas) {
      tally.set(a, (tally.get(a) ?? 0) + 1);
    }
  }
  const topAreas = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([a]) => a);

  return {
    code,
    name: NAME[code],
    flag: FLAG[code],
    sourceCount: sources.length,
    authorities: authorities.slice(0, 3).map((a) => ({
      id: a.id,
      abbreviation: a.abbreviation,
    })),
    topAreas,
  };
}

export default function CrossBorderQuickRef() {
  const cards: QuickRefCard[] =
    ATLAS_EXTENDED_JURISDICTION_CODES.map(buildCard);

  return (
    <section className="mt-8">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--atlas-text-primary)]">
            Cross-Border Quick Reference
          </h3>
          <p className="mt-0.5 text-[11.5px] text-[var(--atlas-text-muted)]">
            Strategische Nicht-EU-/Non-UK-Jurisdiktionen — leichtere Coverage
            (Catalogue + Authorities, ohne Insurance- und Debris- Schwellwerte).
            Klick öffnet die volle Atlas-Quellseite.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link
            key={c.code}
            href={`/atlas/jurisdictions/${c.code}`}
            className="
              group block rounded-xl border border-[var(--atlas-border)]
              bg-[var(--atlas-bg-surface)] p-3
              hover:border-[var(--atlas-border-strong)]
              hover:bg-[var(--atlas-bg-elevated)]
              transition-colors no-underline
            "
          >
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <span className="text-[20px]" aria-hidden>
                {c.flag}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--atlas-text-muted)] font-mono">
                {c.code}
              </span>
            </div>
            <div className="text-[12.5px] font-semibold text-[var(--atlas-text-primary)] mb-1">
              {c.name}
            </div>
            <div className="text-[10.5px] text-[var(--atlas-text-muted)] mb-2">
              {c.sourceCount} Quellen
              {c.authorities.length > 0 && (
                <>
                  {" · "}
                  {c.authorities.map((a) => a.abbreviation).join(" · ")}
                </>
              )}
            </div>
            {c.topAreas.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {c.topAreas.map((a) => (
                  <span
                    key={a}
                    className="text-[9.5px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  >
                    {a.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
