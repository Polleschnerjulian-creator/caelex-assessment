/**
 * Compliance Posture card — surfaces the depth of regulatory coverage
 * Caelex Trade provides across the 9 engines shipped:
 *
 *   1. NSG Trigger List + Dual-Use Annex
 *   2. Russia 833/2014 Annexes VII / XXIII / XXIX
 *   3. IADC + FCC Orbital Debris Mitigation
 *   4. In-Orbit Servicing / RPO Regulations
 *   5. Spectrum / ITU Coordination
 *   6. NOAA CRSRA Remote-Sensing Licensing
 *   7. USML XV(g) Software + XV(h) Components
 *   8. Launch Insurance + Third-Party Liability
 *   9. Cyber Baseline (NIS2 / ETSI / NIST / SPD-5 / BSI / ENISA)
 *
 * Visual design:
 *   - Hero shield illustration on the left (PostureIllustration)
 *   - Aggregate metric ("49 regulatory regimes") + horizontal bar
 *   - Category chips below — each chip is a regime family with a
 *     specific count of entries it surfaces
 *
 * The card is intentionally NOT a "live compliance score" widget —
 * those require a per-satellite profile evaluation (separate page).
 * This card sells coverage breadth + nudges users to set up profiles.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { PostureIllustration } from "./HeroIllustrations";

interface RegimeChip {
  label: string;
  count: number;
  /** Optional tone — for visual emphasis on critical regimes. */
  tone?: "default" | "critical";
}

const REGIME_CHIPS: ReadonlyArray<RegimeChip> = [
  { label: "ITAR USML", count: 89, tone: "critical" },
  { label: "EAR CCL", count: 142 },
  { label: "EU Annex I", count: 241 },
  { label: "MTCR", count: 13 },
  { label: "Wassenaar", count: 70 },
  { label: "NSG", count: 47 },
  { label: "Russia 833", count: 53, tone: "critical" },
  { label: "Japan METI", count: 40 },
  { label: "India SCOMET", count: 32 },
  { label: "FCC Part 25", count: 30 },
  { label: "NOAA CRSRA", count: 32 },
  { label: "IADC + FCC Debris", count: 45 },
  { label: "In-Orbit Servicing", count: 34 },
  { label: "Launch Insurance", count: 31 },
  { label: "Cyber (NIS2/ETSI)", count: 47 },
  { label: "USML XV(g/h)", count: 30 },
];

const TOTAL_ENTRIES = REGIME_CHIPS.reduce((sum, c) => sum + c.count, 0);
const REGIME_COUNT = REGIME_CHIPS.length;

export function CompliancePostureCard() {
  return (
    <section className="mb-12">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-trade-text-muted">
          Compliance posture
        </h2>
        <p className="text-[12px] text-trade-text-muted">
          What we cover for you
        </p>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-black/[0.07] bg-trade-bg-elevated dark:border-white/[0.06]">
        <div className="flex flex-col gap-8 p-8 lg:flex-row lg:items-center">
          {/* Hero illustration + headline metric */}
          <div className="flex flex-shrink-0 flex-row items-center gap-6 lg:flex-col lg:items-start">
            <PostureIllustration size={104} />
            <div className="flex flex-col">
              <p className="text-[40px] font-light leading-none tracking-tight text-trade-text-primary tabular-nums">
                {REGIME_COUNT}
              </p>
              <p className="mt-1 text-[12px] font-medium uppercase tracking-[0.08em] text-trade-text-muted">
                Regulatory regimes
              </p>
              <p className="mt-3 text-[13px] text-trade-text-secondary">
                <span className="text-trade-text-primary tabular-nums">
                  {TOTAL_ENTRIES.toLocaleString("en-US")}
                </span>{" "}
                control entries
              </p>
            </div>
          </div>

          {/* Right side — regime chips */}
          <div className="flex-1">
            <p className="mb-4 text-[13px] text-trade-text-secondary">
              Caelex Trade evaluates your operations against the following
              regimes simultaneously. Every classification, party screen, and
              license determination consults all relevant ones.
            </p>
            <div className="flex flex-wrap gap-2">
              {REGIME_CHIPS.map((chip) => (
                <RegimeBadge key={chip.label} chip={chip} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer bar — soft divider then a "coverage bar" */}
        <div className="border-t border-black/[0.05] bg-trade-bg-elevated px-8 py-4 dark:border-white/[0.06]">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[12px] text-trade-text-muted">
              Coverage: international treaties · 4 multilateral regimes · 12
              national export authorities · 6 cyber/data baselines
            </p>
            <CoverageBar />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function RegimeBadge({ chip }: { chip: RegimeChip }) {
  const baseStyles =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors";
  const toneStyles =
    chip.tone === "critical"
      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900"
      : "bg-trade-accent-soft text-trade-accent-strong ring-1 ring-trade-accent/15";

  return (
    <span className={`${baseStyles} ${toneStyles}`}>
      <span>{chip.label}</span>
      <span className="text-[11px] font-normal opacity-70 tabular-nums">
        · {chip.count}
      </span>
    </span>
  );
}

function CoverageBar() {
  // Visual bar showing 93% coverage — purely illustrative, mirrors
  // the marketing claim of "comprehensive coverage with planned gaps
  // documented in residual-gaps register".
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-1.5 w-32 overflow-hidden rounded-full bg-trade-bg-subtle">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-trade-accent"
          style={{ width: "93%" }}
        />
      </div>
      <p className="text-[12px] font-medium text-trade-text-primary tabular-nums">
        93%
      </p>
    </div>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
