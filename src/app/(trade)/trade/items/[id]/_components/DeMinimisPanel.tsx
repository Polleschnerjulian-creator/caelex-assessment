"use client";

/**
 * DeMinimisPanel — Trade light-theme.
 *
 * Sprint Z12b. Tier 5 per the Living Execution Plan.
 *
 * Renders the BOM-level de-minimis calculation for a `TradeItem`,
 * driven by `GET /api/trade/items/[id]/de-minimis` and the underlying
 * `calculateBomDeMinimis()` engine in `src/lib/trade/bom-de-minimis/`.
 *
 * Shows three things:
 *   1. The aggregate percentage + a colour-coded threshold band
 *      (green < 10%, amber 10–25%, red ≥ 25%) so the operator can see
 *      at a glance which destinations are reachable de-minimis.
 *   2. A per-line breakdown with each line's de-minimis classification
 *      (US_CONTROLLED / US_EAR99_EXCLUDED / US_USML_EXCLUDED /
 *      NON_US_CONTENT / ZERO_VALUE) + rationale.
 *   3. The audit-trail rationale lines from the calculator.
 *
 * The disclaimer is always shown — Caelex output is screening-level.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Layers,
  Loader2,
  Minus,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";

// Mirror calculator output shapes so the client doesn't need to import
// server-only code. Keep these in sync with `calculator.ts`.

type BomLineDeMinimisClassification =
  | "US_CONTROLLED"
  | "US_EAR99_EXCLUDED"
  | "US_USML_EXCLUDED"
  | "NON_US_CONTENT"
  | "ZERO_VALUE";

interface BomLineBreakdown {
  nodeId: string;
  description?: string;
  classification: BomLineDeMinimisClassification;
  usOrigin: boolean;
  eccn: string;
  fairMarketValueEur: number;
  countsTowardUsControlled: boolean;
  rationale: string;
}

interface BomDeMinimisCalculation {
  itemId: string;
  totalValueEur: number;
  usControlledValueEur: number;
  percent: number;
  perLineBreakdown: BomLineBreakdown[];
  excludedLines: BomLineBreakdown[];
  rationale: string[];
  disclaimer: string;
  thresholdAnalysis: {
    exceedsStandard25Percent: boolean;
    exceedsD1TenPercent: boolean;
    hasAnyUsControlledContent: boolean;
  };
}

interface DeMinimisResponse {
  item: {
    id: string;
    name: string;
    countryOfOrigin: string | null;
    legacyUsContentPercent: number | null;
  };
  calculation: BomDeMinimisCalculation;
  meta: {
    bomSource: string;
    bomLineCount: number;
    schemaMigrationPending: boolean;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

const CLASSIFICATION_CONFIG: Record<
  BomLineDeMinimisClassification,
  {
    label: string;
    pillClassName: string;
    iconColor: string;
  }
> = {
  US_CONTROLLED: {
    label: "US-controlled — counted",
    pillClassName: "trade-chip-danger",
    iconColor: "text-trade-accent-danger",
  },
  US_EAR99_EXCLUDED: {
    label: "US EAR99 — excluded",
    pillClassName: "trade-chip-neutral",
    iconColor: "text-trade-text-muted",
  },
  US_USML_EXCLUDED: {
    label: "US USML — Gate 1 (ITAR)",
    pillClassName: "trade-chip-warn",
    iconColor: "text-trade-accent-warn",
  },
  NON_US_CONTENT: {
    label: "Non-US — excluded",
    pillClassName: "trade-chip-neutral",
    iconColor: "text-trade-text-muted",
  },
  ZERO_VALUE: {
    label: "Zero-value — skipped",
    pillClassName: "trade-chip-neutral",
    iconColor: "text-trade-text-muted",
  },
};

// ─── Header — aggregate percentage + threshold band ────────────────

function PercentageHeader({
  calculation,
}: {
  calculation: BomDeMinimisCalculation;
}) {
  const { percent, thresholdAnalysis, totalValueEur, usControlledValueEur } =
    calculation;

  let band: { icon: typeof ShieldCheck; label: string; className: string };
  if (thresholdAnalysis.exceedsStandard25Percent) {
    band = {
      icon: ShieldX,
      label: "Exceeds 25% standard threshold",
      className: "trade-chip-danger",
    };
  } else if (thresholdAnalysis.exceedsD1TenPercent) {
    band = {
      icon: ShieldAlert,
      label: "Exceeds 10% D:1 threshold",
      className: "trade-chip-warn",
    };
  } else if (thresholdAnalysis.hasAnyUsControlledContent) {
    band = {
      icon: ShieldCheck,
      label: "Below 10% — but E:1/E:2 0% rule still applies",
      className: "trade-chip-success",
    };
  } else {
    band = {
      icon: ShieldCheck,
      label: "No US-controlled content",
      className: "trade-chip-success",
    };
  }
  const BandIcon = band.icon;

  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
            US-Controlled Content
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[36px] font-bold leading-none tracking-tight text-trade-text-primary">
              {percent.toFixed(2)}%
            </span>
          </div>
          <div className="mt-1 text-[11px] text-trade-text-muted">
            {formatEur(usControlledValueEur)} of {formatEur(totalValueEur)}
          </div>
        </div>

        <div
          className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 ${band.className}`}
        >
          <BandIcon className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="text-[12px] font-semibold">{band.label}</span>
        </div>
      </div>

      {/* Threshold legend */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <ThresholdChip
          label="§ 734.4(c) — 10% (D:1)"
          crossed={thresholdAnalysis.exceedsD1TenPercent}
        />
        <ThresholdChip
          label="§ 734.4(d) — 25%"
          crossed={thresholdAnalysis.exceedsStandard25Percent}
        />
        <ThresholdChip
          label="§ 734.4(a) — 0% (E:1/E:2)"
          crossed={thresholdAnalysis.hasAnyUsControlledContent}
        />
      </div>
    </div>
  );
}

function ThresholdChip({
  label,
  crossed,
}: {
  label: string;
  crossed: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 ${
        crossed
          ? "trade-chip-danger"
          : "bg-trade-bg-subtle text-trade-text-secondary ring-1 ring-trade-border-subtle"
      }`}
    >
      {crossed ? (
        <AlertCircle className="h-3 w-3 shrink-0" />
      ) : (
        <CheckCircle2 className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate font-medium">{label}</span>
    </div>
  );
}

// ─── Per-line breakdown ────────────────────────────────────────────

function LineRow({ line }: { line: BomLineBreakdown }) {
  const config = CLASSIFICATION_CONFIG[line.classification];
  const Icon = line.countsTowardUsControlled ? AlertCircle : Minus;
  return (
    <div className="flex items-start gap-3 border-b border-trade-border-subtle py-3 last:border-b-0">
      <Icon
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${config.iconColor}`}
        strokeWidth={2.25}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="truncate text-[12px] font-medium text-trade-text-primary">
            {line.description || line.nodeId}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-trade-text-muted">
            {line.eccn}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${config.pillClassName}`}
          >
            {config.label}
          </span>
          <span className="font-mono text-[11px] text-trade-text-muted">
            {formatEur(line.fairMarketValueEur)}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-trade-text-secondary">
          {line.rationale}
        </p>
      </div>
    </div>
  );
}

// ─── Panel ─────────────────────────────────────────────────────────

export function DeMinimisPanel({ itemId }: { itemId: string }) {
  const [data, setData] = useState<DeMinimisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/trade/items/${itemId}/de-minimis`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return (await res.json()) as DeMinimisResponse;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
          <Layers className="h-3 w-3" />
          BOM De Minimis — 15 CFR § 734.4
        </div>
        {data && (
          <span className="text-[11px] text-trade-text-muted">
            {data.meta.bomLineCount} BOM line
            {data.meta.bomLineCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-5">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-trade-text-muted" />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-3 rounded-md px-3 py-2.5 trade-chip-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-[12px]">
              Could not load de-minimis calculation: {error}
            </span>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <PercentageHeader calculation={data.calculation} />

            {/* Per-line breakdown */}
            {data.calculation.perLineBreakdown.length > 0 ? (
              <div className="mt-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
                  Per-Line Breakdown
                </div>
                <div className="rounded-md border border-trade-border-subtle bg-trade-bg-panel px-3">
                  {data.calculation.perLineBreakdown.map((line) => (
                    <LineRow key={line.nodeId} line={line} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-trade-border-subtle bg-trade-bg-panel px-3 py-4 text-center">
                <p className="text-[12px] text-trade-text-secondary">
                  No BOM lines on file for this item.
                </p>
                <p className="mt-1 text-[11px] text-trade-text-muted">
                  Add BOM lines to <code>parametricAttributes.bom</code> to see
                  the de-minimis calculation. Schema-backed BOM relation
                  (TradeBomEdge) is queued for a future sprint.
                </p>
              </div>
            )}

            {/* Rationale */}
            {data.calculation.rationale.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
                  Rationale
                </div>
                <ul className="space-y-1.5 rounded-md border border-trade-border-subtle bg-trade-bg-panel px-3 py-2.5">
                  {data.calculation.rationale.map((line, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[11px] leading-relaxed text-trade-text-secondary"
                    >
                      <Info className="mt-0.5 h-3 w-3 shrink-0 text-trade-text-muted" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <p className="mt-4 text-[10px] leading-relaxed text-trade-text-muted">
              <strong className="font-semibold">Disclaimer:</strong>{" "}
              {data.calculation.disclaimer}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
