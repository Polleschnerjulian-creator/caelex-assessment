"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Growth — the top-of-funnel demand + pipeline surface.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The ONE screen that answers "where is demand coming from, how much of it
 * converts, and what's in the pipeline?" — surfacing the inbound interest Caelex
 * captures today (demo requests, bookings, contact requests, newsletter sign-ups,
 * public /pulse leads, and the CRM deal pipeline) that is shown nowhere else.
 * Fed by GET /api/admin/v2/growth?range=<range> ({@link GrowthResponse}).
 *
 * Sections, top to bottom:
 *   1. Page header + range tabs + an "as of" freshness stamp.
 *   2. Demand tiles — demos / bookings / contacts / newsletter / invites.
 *   3. Channel mix — inbound touches by (source × medium), with share bars.
 *   4. Demo funnel — requested → booked → completed, with stage conversion.
 *   5. CRM pipeline — open value + weighted forecast + won/lost + per-stage bars.
 *   6. Lead → customer — public /pulse lead → paying-org conversion.
 *
 * Loading → skeleton; error → inline message; empty (no demand this window) →
 * a friendly explainer. This component is a THIN renderer — every number comes
 * from the unit-tested pure helpers in `growth-data.ts`; nothing is computed,
 * randomised, or hard-coded here.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import type { AdminRange } from "@/lib/admin/analytics-types";
import type {
  GrowthResponse,
  ChannelMix,
  GrowthDemand,
  GrowthPipeline,
  GrowthLeadConversion,
  DemoFunnelStage,
  PipelineStageRow,
} from "@/lib/admin/growth-data";
import {
  isGrowthEmpty,
  isChannelMixEmpty,
  isPipelineEmpty,
} from "@/lib/admin/growth-data";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import KpiTile from "@/components/admin/KpiTile";
import RangeTabs from "@/components/admin/RangeTabs";
import ExportButton from "@/components/admin/ExportButton";
import type { CsvRow } from "@/components/admin/export-utils";
import { useAdminData } from "@/components/admin/useAdminData";
import { compactNumber, eur, pctLabel } from "@/components/admin/format";

/* ─────────────────────────────────────────────────────────────────────────────
 * CSV row projections — flatten the already-fetched, PII-free view-model arrays
 * into spreadsheet-shaped rows for ExportButton. No new fetch, no recompute: the
 * page hands its `data` (from useAdminData) straight through. Share/conversion
 * are emitted as their 0..1 fraction (rounded to 4dp) so the CSV stays a faithful
 * machine copy of what the table shows.
 * ────────────────────────────────────────────────────────────────────────── */

/** Channel-mix rows → one CSV line per (source × medium) bucket. */
function channelMixCsvRows(data: GrowthResponse): CsvRow[] {
  return data.channelMix.rows.map((row) => ({
    source: row.source,
    medium: row.medium,
    touches: row.touches,
    share: Number(row.share.toFixed(4)),
  }));
}

const CHANNEL_MIX_COLUMNS = [
  { key: "source", header: "Source" },
  { key: "medium", header: "Medium" },
  { key: "touches", header: "Touches" },
  { key: "share", header: "Share" },
];

/** CRM pipeline rows → one CSV line per deal stage (canonical order). */
function pipelineCsvRows(data: GrowthResponse): CsvRow[] {
  return data.pipeline.stages.map((stage) => ({
    stage: stageLabel(stage.stage),
    deals: stage.count,
    valueEur: stage.valueEur,
  }));
}

const PIPELINE_COLUMNS = [
  { key: "stage", header: "Stage" },
  { key: "deals", header: "Deals" },
  { key: "valueEur", header: "Value (EUR)" },
];

export default function GrowthPage() {
  // The page owns the selected range; RangeTabs reports changes and the URL is
  // re-derived (useAdminData aborts the prior fetch on a fast toggle).
  const [range, setRange] = useState<AdminRange>("30d");
  const { data, loading, error } = useAdminData<GrowthResponse>(
    `/api/admin/v2/growth?range=${range}`,
  );

  return (
    <div>
      <AdminPageHeader
        title="Growth"
        subtitle="Top-of-funnel demand, channel mix, and the deal pipeline"
        right={
          <div className="flex items-center gap-3">
            {data && !loading && !error && (
              <span
                className="hidden text-[11px] tabular-nums sm:inline"
                style={{ color: "var(--text-tertiary)" }}
              >
                as of {data.asOf}
              </span>
            )}
            {data &&
              !loading &&
              !error &&
              !isChannelMixEmpty(data.channelMix) && (
                <ExportButton
                  rows={channelMixCsvRows(data)}
                  columns={CHANNEL_MIX_COLUMNS}
                  filename={`caelex-growth-channel-mix-${range}`}
                  label="Channel mix"
                />
              )}
            {data && !loading && !error && !isPipelineEmpty(data.pipeline) && (
              <ExportButton
                rows={pipelineCsvRows(data)}
                columns={PIPELINE_COLUMNS}
                filename={`caelex-growth-pipeline-${range}`}
                label="Pipeline"
              />
            )}
            <RangeTabs value={range} onChange={setRange} />
          </div>
        }
      />

      {loading && <GrowthSkeleton />}

      {!loading && error && (
        <AdminCard>
          <p
            className="text-[13px] leading-snug"
            style={{ color: "var(--accent-danger)" }}
          >
            Could not load growth: {error}
          </p>
        </AdminCard>
      )}

      {!loading && !error && data && isGrowthEmpty(data) && (
        <AdminCard>
          <EmptyState />
        </AdminCard>
      )}

      {!loading && !error && data && !isGrowthEmpty(data) && (
        <GrowthBody data={data} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Body — the populated growth screen. Split out so the top-level component reads
 * as a clean state machine (loading / error / empty / body).
 * ────────────────────────────────────────────────────────────────────────── */

function GrowthBody({ data }: { data: GrowthResponse }) {
  const { channelMix, demand, pipeline, leads } = data;

  return (
    <div className="flex flex-col gap-5">
      {/* Demand tiles — the headline inbound counts. */}
      <DemandTiles demand={demand} leads={leads} />

      {/* Channel mix — inbound touches by source × medium. */}
      <AdminCard
        title="Channel mix"
        subtitle="Inbound touches by source × medium — site visits with UTM + /pulse leads"
      >
        {isChannelMixEmpty(channelMix) ? (
          <NoSeries label="No attributed inbound touches for this range yet." />
        ) : (
          <ChannelMixTable mix={channelMix} />
        )}
      </AdminCard>

      {/* Demo funnel — requested → booked → completed. */}
      <AdminCard
        title="Demo funnel"
        subtitle="Requested → booked → completed, with stage-to-stage conversion"
      >
        {demand.demoFunnel.some((s) => s.count > 0) ? (
          <DemoFunnel stages={demand.demoFunnel} />
        ) : (
          <NoSeries label="No demo activity for this range yet." />
        )}
      </AdminCard>

      {/* CRM pipeline — open value, forecast, won/lost, per-stage. */}
      <AdminCard
        title="CRM pipeline"
        subtitle="Open deal value, probability-weighted forecast, and stage breakdown"
      >
        {isPipelineEmpty(pipeline) ? (
          <NoSeries label="No deals in the pipeline yet." />
        ) : (
          <Pipeline pipeline={pipeline} />
        )}
      </AdminCard>

      {/* Lead → customer — public /pulse conversion. */}
      <AdminCard
        title="Lead → customer"
        subtitle="Public verification leads that became a paying organisation"
      >
        <LeadConversion leads={leads} />
      </AdminCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Demand tiles — the headline inbound counts as a responsive KPI grid.
 * ────────────────────────────────────────────────────────────────────────── */

function DemandTiles({
  demand,
  leads,
}: {
  demand: GrowthDemand;
  leads: GrowthLeadConversion;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiTile
        label="Demos requested"
        value={compactNumber(demand.demosRequested)}
        sub="this range"
        tone={demand.demosRequested > 0 ? "positive" : "default"}
      />
      <KpiTile
        label="Demos booked"
        value={compactNumber(demand.demosBooked)}
        sub="meetings set"
      />
      <KpiTile
        label="Contact requests"
        value={compactNumber(demand.contactRequests)}
        sub="this range"
      />
      <KpiTile
        label="Newsletter"
        value={compactNumber(demand.newsletterActive)}
        sub={`+${compactNumber(demand.newsletterNew)} new`}
      />
      <KpiTile
        label="Invites sent"
        value={compactNumber(demand.invitesSent)}
        sub="team virality"
      />
      <KpiTile
        label="Pulse leads"
        value={compactNumber(leads.total)}
        sub="this range"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Channel-mix table — (source × medium) buckets with a share bar. The bar width
 * is the bucket's share of all inbound (already 0..1 from the helper), so the
 * busiest channel reads as a full bar and the rest taper.
 * ────────────────────────────────────────────────────────────────────────── */

function ChannelMixTable({ mix }: { mix: ChannelMix }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-left" style={{ color: "var(--text-secondary)" }}>
            <Th className="text-left">Source</Th>
            <Th className="text-left">Medium</Th>
            <Th className="text-right">Touches</Th>
            <Th className="text-left">Share</Th>
          </tr>
        </thead>
        <tbody>
          {mix.rows.map((row) => (
            <tr
              key={`${row.source}|${row.medium}`}
              style={{ borderTop: "1px solid var(--border-default)" }}
            >
              <Td className="text-left">
                <span
                  className="font-medium capitalize"
                  style={{ color: "var(--text-primary)" }}
                >
                  {row.source}
                </span>
              </Td>
              <Td className="text-left capitalize">{row.medium}</Td>
              <Td className="text-right tabular-nums">
                {compactNumber(row.touches)}
              </Td>
              <Td className="text-left">
                <div className="flex items-center gap-2">
                  {/* Share bar. */}
                  <div
                    className="h-2 w-24 flex-shrink-0 overflow-hidden rounded-full"
                    style={{
                      background:
                        "var(--separator-strong, rgba(148,163,184,0.16))",
                    }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(row.share * 100)}%`,
                        background: "var(--accent-primary)",
                      }}
                    />
                  </div>
                  <span
                    className="tabular-nums"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {pctLabel(row.share)}
                  </span>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
      <p
        className="mt-3 text-[11px] leading-snug"
        style={{ color: "var(--text-tertiary)" }}
      >
        Of {compactNumber(mix.totalTouches)} attributed inbound touch
        {mix.totalTouches === 1 ? "" : "es"} this range. Untracked visits are
        bucketed as direct / unknown.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Demo funnel — a horizontal bar list. Bars are relative to the first stage
 * (requested), so the funnel tapers; each row shows the absolute count and the
 * conversion from the prior stage (em-dash for the first stage / no sample).
 * ────────────────────────────────────────────────────────────────────────── */

function DemoFunnel({ stages }: { stages: DemoFunnelStage[] }) {
  // Anchor bar widths to the largest stage count so the widest stage is a full
  // bar (usually 'requested', but robust if a window has carry-over bookings).
  const maxCount = stages.reduce((m, s) => (s.count > m ? s.count : m), 0);

  return (
    <ul className="flex flex-col gap-3">
      {stages.map((stage) => (
        <li key={stage.key}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {stage.label}
            </span>
            <span
              className="flex-shrink-0 text-[12px] tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              {compactNumber(stage.count)}
              {stage.conversionFromPrev !== null && (
                <span style={{ color: "var(--text-tertiary)" }}>
                  {" · "}
                  {pctLabel(stage.conversionFromPrev)} from prev
                </span>
              )}
            </span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full"
            style={{
              background: "var(--separator-strong, rgba(148,163,184,0.16))",
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${maxCount > 0 ? (stage.count / maxCount) * 100 : 0}%`,
                background: "var(--accent-primary)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CRM pipeline — three headline tiles (open value, weighted forecast, won) plus
 * a per-stage bar list (value per stage, relative to the richest stage).
 * ────────────────────────────────────────────────────────────────────────── */

function Pipeline({ pipeline }: { pipeline: GrowthPipeline }) {
  // Only render stage rows that have any deals (a dense all-zero list would be
  // noise); the canonical order is preserved from the API.
  const occupied = pipeline.stages.filter((s) => s.count > 0);
  const maxValue = occupied.reduce(
    (m, s) => (s.valueEur > m ? s.valueEur : m),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Headline tiles. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="Open value"
          value={eur(pipeline.openValueEur)}
          sub={`${compactNumber(pipeline.openCount)} open deal${pipeline.openCount === 1 ? "" : "s"}`}
          tone={pipeline.openValueEur > 0 ? "positive" : "default"}
        />
        <KpiTile
          label="Weighted"
          value={eur(pipeline.weightedValueEur)}
          sub="forecast"
        />
        <KpiTile
          label="Won"
          value={eur(pipeline.wonValueEur)}
          sub={`${compactNumber(pipeline.wonCount)} deal${pipeline.wonCount === 1 ? "" : "s"}`}
          tone={pipeline.wonCount > 0 ? "positive" : "default"}
        />
        <KpiTile
          label="Lost"
          value={compactNumber(pipeline.lostCount)}
          sub="closed lost"
          tone={pipeline.lostCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* Per-stage value bars (occupied stages only). */}
      {occupied.length > 0 && (
        <div>
          <p
            className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.06em]"
            style={{ color: "var(--text-secondary)" }}
          >
            Value by stage
          </p>
          <ul className="flex flex-col gap-2.5">
            {occupied.map((stage) => (
              <PipelineStageBar
                key={stage.stage}
                stage={stage}
                maxValue={maxValue}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PipelineStageBar({
  stage,
  maxValue,
}: {
  stage: PipelineStageRow;
  maxValue: number;
}) {
  return (
    <li>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span
          className="text-[12px] font-medium capitalize"
          style={{ color: "var(--text-primary)" }}
        >
          {stageLabel(stage.stage)}
        </span>
        <span
          className="flex-shrink-0 text-[12px] tabular-nums"
          style={{ color: "var(--text-secondary)" }}
        >
          {eur(stage.valueEur)}
          <span style={{ color: "var(--text-tertiary)" }}>
            {" · "}
            {compactNumber(stage.count)} deal{stage.count === 1 ? "" : "s"}
          </span>
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{
          background: "var(--separator-strong, rgba(148,163,184,0.16))",
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${maxValue > 0 ? (stage.valueEur / maxValue) * 100 : 0}%`,
            background: "var(--accent-primary)",
          }}
        />
      </div>
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Lead → customer — the public /pulse lead → paying-org conversion. The rate is
 * an em-dash when there were no leads (honest "no sample", not 0%).
 * ────────────────────────────────────────────────────────────────────────── */

function LeadConversion({ leads }: { leads: GrowthLeadConversion }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <KpiTile
        label="Leads"
        value={compactNumber(leads.total)}
        sub="captured"
      />
      <KpiTile
        label="Converted"
        value={compactNumber(leads.converted)}
        sub="to paying org"
        tone={leads.converted > 0 ? "positive" : "default"}
      />
      <KpiTile
        label="Conversion"
        value={
          leads.conversionRate === null ? "—" : pctLabel(leads.conversionRate)
        }
        sub="lead → customer"
        tone={
          leads.conversionRate === null
            ? "default"
            : leads.conversionRate > 0
              ? "positive"
              : "default"
        }
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Small helpers + states.
 * ────────────────────────────────────────────────────────────────────────── */

/** Humanise a CrmDealStage enum value ("CLOSED_WON" → "Closed won"). */
function stageLabel(stage: string): string {
  const lower = stage.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.05em] ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`px-2 py-2.5 ${className}`}
      style={{ color: "var(--text-secondary)" }}
    >
      {children}
    </td>
  );
}

function GrowthSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="glass-surface h-[84px] animate-pulse rounded-xl"
            style={{ border: "1px solid var(--border-default)" }}
          />
        ))}
      </div>
      <div
        className="glass-elevated h-[240px] animate-pulse rounded-2xl"
        style={{ border: "1px solid var(--border-default)" }}
      />
      <div
        className="glass-elevated h-[220px] animate-pulse rounded-2xl"
        style={{ border: "1px solid var(--border-default)" }}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl glass-surface"
        style={{ border: "1px solid var(--border-default)" }}
      >
        <TrendingUp size={20} style={{ color: "var(--text-secondary)" }} />
      </div>
      <p
        className="text-[14px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        No demand recorded this range
      </p>
      <p
        className="max-w-sm text-[12px] leading-snug"
        style={{ color: "var(--text-secondary)" }}
      >
        This view tracks real inbound demand — demo requests, bookings, contact
        forms, newsletter sign-ups, public /pulse leads, and the CRM pipeline.
        As soon as one is captured in this window, it appears here.
      </p>
    </div>
  );
}

function NoSeries({ label }: { label: string }) {
  return (
    <p
      className="py-8 text-center text-[12px]"
      style={{ color: "var(--text-tertiary)" }}
    >
      {label}
    </p>
  );
}
