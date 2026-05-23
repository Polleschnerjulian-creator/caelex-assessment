/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * LicenseTimePredictionPanel — Sprint Z15. Tier 6 per the Living
 * Execution Plan.
 *
 * Renders the output of `predictLicenseTime()` as a visual horizontal
 * bar with markers at p25 (optimistic) / median / p75 (conservative)
 * + date labels.
 *
 * Pure presentational component — accepts a `prediction` prop produced
 * by the server-side predictor (or computed in a parent effect). Does
 * NOT fetch data itself; consumers (the new-license form, the
 * operation-detail page) compose the input shape and pass it down.
 *
 * Visual structure:
 *
 *   ┌─ Header ─────────────────────────────────────┐
 *   │  PREDICTED PROCESSING TIME          [conf.]  │
 *   │  ~45 days median                              │
 *   ├─ Timeline bar ────────────────────────────────┤
 *   │  [submitted] ─●───────●───────●─→  [conserv.] │
 *   │     today    p25    median   p75              │
 *   ├─ Date callouts ───────────────────────────────┤
 *   │  Optimistic  Median     Conservative          │
 *   │  Jun 16      Jul 7      Aug 9                 │
 *   └─ Footnote ────────────────────────────────────┘
 *     Based on: <dataBasis citation>
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { Calendar, Clock, Info, TrendingUp } from "lucide-react";
import type { LicenseTimePrediction } from "@/lib/trade/license-analytics/predictor";

interface LicenseTimePredictionPanelProps {
  prediction: LicenseTimePrediction;
  /** ISO date string of the planned submission — used as bar origin. */
  submissionDate: Date;
  /** Optional className for wrapper sizing. */
  className?: string;
}

const CONFIDENCE_META: Record<
  LicenseTimePrediction["confidence"],
  { label: string; className: string }
> = {
  high: {
    label: "High confidence",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  medium: {
    label: "Medium confidence",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  low: {
    label: "Low confidence",
    className: "bg-orange-50 text-orange-700 ring-orange-200",
  },
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function LicenseTimePredictionPanel({
  prediction,
  submissionDate,
  className,
}: LicenseTimePredictionPanelProps) {
  const conf = CONFIDENCE_META[prediction.confidence];

  // Horizontal bar geometry: percentile markers as % of (p75 + 10% pad).
  // We use p75 + 10% headroom so the conservative marker doesn't hug
  // the right edge.
  const scaleMax = Math.max(prediction.p75Days * 1.1, 1);
  const p25Pct = (prediction.p25Days / scaleMax) * 100;
  const medianPct = (prediction.medianDays / scaleMax) * 100;
  const p75Pct = (prediction.p75Days / scaleMax) * 100;

  return (
    <div
      className={`rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-5 ${
        className ?? ""
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
            <TrendingUp className="h-3 w-3" />
            Predicted processing time
          </div>
          <div className="flex items-baseline gap-2 text-trade-text-primary">
            <span className="text-[24px] font-bold leading-none tracking-tight">
              ~{prediction.medianDays}
            </span>
            <span className="text-[13px] font-medium text-trade-text-secondary">
              days median
            </span>
          </div>
          <div className="mt-0.5 text-[12px] text-trade-text-muted">
            Range: {prediction.p25Days}–{prediction.p75Days} days (25–75th
            percentile)
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ring-1 ${conf.className}`}
        >
          {conf.label}
        </span>
      </div>

      {/* Timeline bar */}
      <div className="mb-5">
        <div className="relative h-2.5 w-full overflow-visible rounded-full bg-trade-bg-subtle">
          {/* Filled segment up to p75 with gradient */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500"
            style={{ width: `${p75Pct}%` }}
          />
          {/* p25 marker — optimistic */}
          <Marker leftPct={p25Pct} variant="optimistic" />
          {/* median marker */}
          <Marker leftPct={medianPct} variant="median" />
          {/* p75 marker — conservative */}
          <Marker leftPct={p75Pct} variant="conservative" />
        </div>

        {/* Tick labels under the bar */}
        <div className="relative mt-2 h-4">
          <span
            className="absolute -translate-x-1/2 text-[9px] font-semibold uppercase tracking-widest text-trade-text-muted"
            style={{ left: `${p25Pct}%` }}
          >
            P25
          </span>
          <span
            className="absolute -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest text-trade-text-primary"
            style={{ left: `${medianPct}%` }}
          >
            Median
          </span>
          <span
            className="absolute -translate-x-1/2 text-[9px] font-semibold uppercase tracking-widest text-trade-text-muted"
            style={{ left: `${p75Pct}%` }}
          >
            P75
          </span>
        </div>
      </div>

      {/* Date callouts */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <DateCallout
          label="Optimistic"
          date={prediction.optimisticDate}
          tone="optimistic"
        />
        <DateCallout
          label="Expected approval"
          date={prediction.expectedApprovalDate}
          tone="median"
        />
        <DateCallout
          label="Conservative"
          date={prediction.conservativeDate}
          tone="conservative"
        />
      </div>

      {/* Submission anchor */}
      <div className="mb-3 flex items-center gap-2 text-[11px] text-trade-text-muted">
        <Calendar className="h-3 w-3" />
        <span>
          Anchored to submission date:{" "}
          <span className="font-mono text-trade-text-secondary">
            {formatDate(submissionDate)}
          </span>
        </span>
      </div>

      {/* Footnote — citation + match tier */}
      <div className="border-t border-trade-border-subtle pt-3">
        <div className="flex items-start gap-2 text-[10px] leading-relaxed text-trade-text-muted">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <div>
            <span className="font-semibold uppercase tracking-widest">
              Based on:
            </span>{" "}
            <span>{prediction.dataBasis}</span>
            {prediction.matchTier !== "synthetic" &&
              prediction.industrySampleSize > 0 && (
                <span className="ml-1">
                  (n={prediction.industrySampleSize.toLocaleString("en-GB")})
                </span>
              )}
            {prediction.orgCalibrationApplied && (
              <span className="ml-1 inline-flex items-center gap-1 rounded bg-trade-accent-soft px-1.5 py-0.5 font-semibold text-trade-accent-strong">
                <Clock className="h-2.5 w-2.5" />
                Calibrated with {prediction.orgSampleSize} prior org licences
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Internal marker + callout components ──────────────────────────

function Marker({
  leftPct,
  variant,
}: {
  leftPct: number;
  variant: "optimistic" | "median" | "conservative";
}) {
  const sizePx = variant === "median" ? 14 : 10;
  const ringClass =
    variant === "median"
      ? "ring-2 ring-trade-text-primary bg-white"
      : variant === "optimistic"
        ? "ring-2 ring-emerald-600 bg-white"
        : "ring-2 ring-orange-600 bg-white";
  return (
    <div
      className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${ringClass}`}
      style={{
        left: `${leftPct}%`,
        width: `${sizePx}px`,
        height: `${sizePx}px`,
      }}
    />
  );
}

function DateCallout({
  label,
  date,
  tone,
}: {
  label: string;
  date: Date;
  tone: "optimistic" | "median" | "conservative";
}) {
  const toneClass =
    tone === "median"
      ? "border-trade-accent bg-trade-accent-soft text-trade-accent-strong"
      : tone === "optimistic"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-orange-200 bg-orange-50 text-orange-700";
  return (
    <div className={`rounded-md border px-2.5 py-2 text-center ${toneClass}`}>
      <div className="text-[9px] font-semibold uppercase tracking-widest opacity-80">
        {label}
      </div>
      <div className="mt-0.5 text-[12px] font-bold tabular-nums">
        {formatDate(date)}
      </div>
    </div>
  );
}
