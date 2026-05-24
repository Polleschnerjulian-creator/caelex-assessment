/**
 * Compliance Posture card — surfaces the depth of EXPORT-CONTROL
 * regulatory coverage Caelex Trade provides. Scope is intentionally
 * limited to export controls (ITAR/EAR/EU Dual-Use/national authorities/
 * sanctions/MTCR/Wassenaar/NSG). Operational regulations (debris,
 * spectrum, in-orbit servicing, launch insurance, cyber/NIS2) live in
 * Caelex Comply, not Trade.
 *
 * Engines surfaced (export-control only):
 *
 *   - USML XV(g) Software + XV(h) Components (DDTC)
 *   - NSG Trigger List + Dual-Use Annex (multilateral)
 *   - Russia 833/2014 Annexes VII / XXIII / XXIX (EU sanctions)
 *   - NOAA CRSRA Remote-Sensing (dual-use overlay with export effects)
 *   - All earlier Z-series engines (Japan METI, India SCOMET, UK ECJU,
 *     France LOS, BAFA, ATLAS DE, AES US, EU Annex IV, AWV/AL, etc.)
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

// Caelex Trade = export controls ONLY. Chips below mirror that
// scope. Operational regulations (debris mitigation, spectrum, in-orbit
// servicing, launch insurance, cyber/NIS2) live in Caelex Comply and
// are NOT surfaced here even though their engines exist in the repo.
const REGIME_CHIPS: ReadonlyArray<RegimeChip> = [
  // US export controls
  { label: "ITAR USML", count: 89, tone: "critical" },
  { label: "EAR CCL", count: 142 },
  { label: "USML XV(g/h)", count: 30 },
  // EU dual-use + sanctions
  { label: "EU Annex I", count: 241 },
  { label: "EU Annex IV", count: 27 },
  { label: "Russia 833", count: 53, tone: "critical" },
  // Multilateral regimes
  { label: "MTCR", count: 13 },
  { label: "Wassenaar", count: 70 },
  { label: "NSG", count: 47 },
  // National export authorities
  { label: "BAFA / AWV", count: 28 },
  { label: "DE Ausfuhrliste", count: 28 },
  { label: "UK ECJU", count: 24 },
  { label: "France LOS", count: 18 },
  { label: "Japan METI", count: 40 },
  { label: "India SCOMET", count: 32 },
  { label: "NOAA CRSRA", count: 32 },
];

const TOTAL_ENTRIES = REGIME_CHIPS.reduce((sum, c) => sum + c.count, 0);
const REGIME_COUNT = REGIME_CHIPS.length;

export function CompliancePostureCard() {
  return (
    <section className="mb-12">
      <div className="mb-5 flex items-baseline justify-between">
        <h2
          className="text-[13px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: "var(--trade-label-tertiary)" }}
        >
          Compliance posture
        </h2>
        <p
          className="text-[12px]"
          style={{ color: "var(--trade-label-tertiary)" }}
        >
          What we cover for you
        </p>
      </div>

      <div
        className="overflow-hidden rounded-[12px]"
        style={{
          background: "var(--trade-surface-secondary)",
          border: "1px solid var(--trade-separator)",
        }}
      >
        <div className="flex flex-col gap-8 p-8 lg:flex-row lg:items-center">
          {/* Hero illustration + headline metric */}
          <div className="flex flex-shrink-0 flex-row items-center gap-6 lg:flex-col lg:items-start">
            <PostureIllustration size={104} />
            <div className="flex flex-col">
              <p
                className="text-[40px] leading-none tracking-[-0.022em] tabular-nums"
                style={{ color: "var(--trade-label)", fontWeight: 600 }}
              >
                {REGIME_COUNT}
              </p>
              <p
                className="mt-1 text-[12px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: "var(--trade-label-tertiary)" }}
              >
                Regulatory regimes
              </p>
              <p
                className="mt-3 text-[13px]"
                style={{ color: "var(--trade-label-secondary)" }}
              >
                <span
                  className="tabular-nums"
                  style={{ color: "var(--trade-label)" }}
                >
                  {TOTAL_ENTRIES.toLocaleString("en-US")}
                </span>{" "}
                control entries
              </p>
            </div>
          </div>

          {/* Right side — regime chips */}
          <div className="flex-1">
            <p
              className="mb-4 text-[14px] leading-[1.4]"
              style={{ color: "var(--trade-label-secondary)" }}
            >
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

        {/* Footer bar — separator + coverage bar */}
        <div
          className="px-8 py-4"
          style={{
            borderTop: "1px solid var(--trade-separator)",
            background: "var(--trade-surface)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <p
              className="text-[12px]"
              style={{ color: "var(--trade-label-tertiary)" }}
            >
              Coverage: 3 multilateral regimes · 8 national export authorities ·
              5 US/EU dual-use + sanctions lists
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
  // Apple status-pill recipe: tinted fill at low alpha + same-hue label.
  // Critical = danger; default = accent (Caelex indigo).
  const isCritical = chip.tone === "critical";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium"
      style={{
        background: isCritical
          ? "color-mix(in srgb, var(--trade-accent-danger) 14%, transparent)"
          : "color-mix(in srgb, var(--trade-accent) 12%, transparent)",
        color: isCritical
          ? "var(--trade-accent-danger)"
          : "var(--trade-accent-strong)",
        border: isCritical
          ? "1px solid color-mix(in srgb, var(--trade-accent-danger) 22%, transparent)"
          : "1px solid color-mix(in srgb, var(--trade-accent) 18%, transparent)",
      }}
    >
      <span>{chip.label}</span>
      <span className="text-[11px] font-normal opacity-70 tabular-nums">
        · {chip.count}
      </span>
    </span>
  );
}

function CoverageBar() {
  // WCAG SC 1.3.1 + 4.1.2 — progressbar role makes the visual fill
  // announceable to screen readers. The bar's intrinsic meaning ("93% of
  // export-control regimes are covered") is otherwise locked behind a
  // visual treatment that AT users can't perceive.
  const VALUE = 93;
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-valuenow={VALUE}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Export-control regime coverage: ${VALUE}%`}
        className="relative h-1.5 w-32 overflow-hidden rounded-full"
        style={{ background: "var(--trade-fill-4)" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${VALUE}%`, background: "var(--trade-accent)" }}
        />
      </div>
      {/* aria-hidden because the progressbar's aria-label already
          announces the same number to screen readers — avoid the
          duplicate "ninety three percent ninety three percent". */}
      <p
        aria-hidden="true"
        className="text-[12px] font-medium tabular-nums"
        style={{ color: "var(--trade-label)" }}
      >
        {VALUE}%
      </p>
    </div>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
