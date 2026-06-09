"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Efficiency — the unit-economics screen (virality + AI margin).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The ONE screen that answers "is the product spreading, and what does the AI
 * cost relative to revenue?". Fed by GET /api/admin/v2/efficiency?range=<range>
 * ({@link EfficiencyResponse}).
 *
 * Sections, top to bottom:
 *   1. Page header + range tabs + an "as of" freshness stamp.
 *   2. Virality — the viral coefficient k headline + the SENT → ACCEPTED invite
 *      funnel (accepted / pending / expired), with the honest "activation isn't
 *      tracked here" caveat.
 *   3. AI margin — total AI cost, cost per active account, and cost as a % of
 *      MRR, plus a per-product split (Atlas real spend vs Astra token estimate).
 *
 * Loading → skeleton; error → inline message; empty (no invites AND no AI
 * footprint this window) → a friendly explainer. This component is a THIN
 * renderer — every number comes from the unit-tested pure helpers in
 * `virality.ts` / `ai-cost.ts`; nothing is computed, randomised, or hard-coded
 * here.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { Gauge } from "lucide-react";
import type { AdminRange } from "@/lib/admin/analytics-types";
import type { Virality, InviteFunnel } from "@/lib/admin/virality";
import type { AiCost, AiCostProductLine } from "@/lib/admin/ai-cost";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import KpiTile from "@/components/admin/KpiTile";
import RangeTabs from "@/components/admin/RangeTabs";
import { useAdminData } from "@/components/admin/useAdminData";
import { compactNumber, eur, pctLabel } from "@/components/admin/format";

/**
 * The efficiency payload shape this page consumes. Mirrors the route's exported
 * `EfficiencyResponse` (the composite of the two pure-helper slices `Virality`
 * and `AiCost`). Declared locally — built from the lib-owned slice types — so
 * the client page never imports from the API route module (matching how the
 * other admin pages source their response shape from a lib module, not a route).
 */
interface EfficiencyResponse {
  range: AdminRange;
  /** ISO timestamp the payload was computed (for the "as of" stamp). */
  generatedAt: string;
  virality: Virality;
  aiCost: AiCost;
}

export default function EfficiencyPage() {
  // The page owns the selected range; RangeTabs reports changes and the URL is
  // re-derived (useAdminData aborts the prior fetch on a fast toggle).
  const [range, setRange] = useState<AdminRange>("30d");
  const { data, loading, error } = useAdminData<EfficiencyResponse>(
    `/api/admin/v2/efficiency?range=${range}`,
  );

  return (
    <div>
      <AdminPageHeader
        title="Efficiency"
        subtitle="Virality and AI unit economics — how the product spreads and what it costs"
        right={
          <div className="flex items-center gap-3">
            {data && !loading && !error && (
              <span
                className="hidden text-[11px] tabular-nums sm:inline"
                style={{ color: "var(--text-tertiary)" }}
              >
                as of {data.generatedAt.slice(0, 10)}
              </span>
            )}
            <RangeTabs value={range} onChange={setRange} />
          </div>
        }
      />

      {loading && <EfficiencySkeleton />}

      {!loading && error && (
        <AdminCard>
          <p
            className="text-[13px] leading-snug"
            style={{ color: "var(--accent-danger)" }}
          >
            Could not load efficiency: {error}
          </p>
        </AdminCard>
      )}

      {!loading && !error && data && isEfficiencyEmpty(data) && (
        <AdminCard>
          <EmptyState />
        </AdminCard>
      )}

      {!loading && !error && data && !isEfficiencyEmpty(data) && (
        <EfficiencyBody data={data} />
      )}
    </div>
  );
}

/** True when there is nothing real to show across BOTH sections. */
function isEfficiencyEmpty(data: EfficiencyResponse): boolean {
  return data.virality.isEmpty && data.aiCost.isEmpty;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Body — the populated efficiency screen. Split out so the top-level component
 * reads as a clean state machine (loading / error / empty / body). Each section
 * carries its OWN empty note so one populated half still renders cleanly.
 * ────────────────────────────────────────────────────────────────────────── */

function EfficiencyBody({ data }: { data: EfficiencyResponse }) {
  const { virality, aiCost } = data;

  return (
    <div className="flex flex-col gap-5">
      <AdminCard
        title="Virality"
        subtitle="Viral coefficient k and the invite funnel — read from team invitations"
      >
        {virality.isEmpty ? (
          <NoSeries label="No team invitations were sent in this window yet." />
        ) : (
          <ViralitySection virality={virality} />
        )}
      </AdminCard>

      <AdminCard
        title="AI unit economics"
        subtitle="Assistant cost per active account and as a share of MRR, by product"
      >
        {aiCost.isEmpty ? (
          <NoSeries label="No AI assistant activity in this window yet." />
        ) : (
          <AiCostSection aiCost={aiCost} />
        )}
      </AdminCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Virality — the k headline + a SENT → ACCEPTED funnel. k is an em-dash when no
 * org has invited anyone yet (no denominator), never a misleading 0.
 * ────────────────────────────────────────────────────────────────────────── */

function ViralitySection({ virality }: { virality: Virality }) {
  const { k, invitingOrgs, funnel } = virality;
  // k ≥ 1 means the loop is self-sustaining; tint accordingly.
  const kTone = k === null ? "default" : k >= 1 ? "positive" : "warning";

  return (
    <div className="flex flex-col gap-5">
      {/* Headline tiles. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="Viral coefficient k"
          value={k === null ? "—" : k.toFixed(2)}
          sub="accepts / inviting org"
          tone={kTone}
        />
        <KpiTile
          label="Inviting orgs"
          value={compactNumber(invitingOrgs)}
          sub="sent ≥1 invite"
        />
        <KpiTile
          label="Invites sent"
          value={compactNumber(funnel.sent)}
          sub="this window"
        />
        <KpiTile
          label="Acceptance"
          value={
            funnel.acceptanceRate === null
              ? "—"
              : pctLabel(funnel.acceptanceRate)
          }
          sub={`${compactNumber(funnel.accepted)} accepted`}
          tone={
            funnel.acceptanceRate === null
              ? "default"
              : funnel.acceptanceRate > 0
                ? "positive"
                : "default"
          }
        />
      </div>

      {/* SENT → ACCEPTED funnel bars. */}
      <div>
        <p
          className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.06em]"
          style={{ color: "var(--text-secondary)" }}
        >
          Invite funnel
        </p>
        <InviteFunnelBars funnel={funnel} />
      </div>

      <p
        className="text-[11px] leading-snug"
        style={{ color: "var(--text-tertiary)" }}
      >
        k counts accepted invitations per organisation that invited someone this
        window. The funnel stops at &ldquo;accepted&rdquo; — whether an accepted
        invitee became an active user is not tracked on the invitation, so no
        activation rate is shown here.
      </p>
    </div>
  );
}

function InviteFunnelBars({ funnel }: { funnel: InviteFunnel }) {
  // Each leg is a share of the total sent, so the bars read as a breakdown of
  // the funnel mouth. Guard the (already non-empty) sent against 0.
  const rows: Array<{ label: string; value: number; color: string }> = [
    { label: "Sent", value: funnel.sent, color: "var(--accent-primary)" },
    {
      label: "Accepted",
      value: funnel.accepted,
      color: "var(--accent-success)",
    },
    { label: "Pending", value: funnel.pending, color: "var(--text-tertiary)" },
    { label: "Expired", value: funnel.expired, color: "var(--accent-danger)" },
  ];
  const max = funnel.sent > 0 ? funnel.sent : 1;

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {row.label}
            </span>
            <span
              className="flex-shrink-0 text-[12px] tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              {compactNumber(row.value)}
              <span style={{ color: "var(--text-tertiary)" }}>
                {" · "}
                {pctLabel(row.value / max)} of sent
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
                width: `${(row.value / max) * 100}%`,
                background: row.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * AI unit economics — headline cost tiles + a per-product split. Atlas spend is
 * real (summed costUsd); Astra spend is a token-derived ESTIMATE, badged as such.
 * Per-account + % of MRR are em-dashes when their denominators are 0.
 * ────────────────────────────────────────────────────────────────────────── */

function AiCostSection({ aiCost }: { aiCost: AiCost }) {
  const {
    totalCostUsd,
    totalIncludesEstimate,
    costPerActiveAccount,
    activeAccounts,
    marginCostPctOfMrr,
    perProduct,
  } = aiCost;
  // Cost-of-AI as a share of revenue: lower is healthier. Tint by intensity.
  const marginTone =
    marginCostPctOfMrr === null
      ? "default"
      : marginCostPctOfMrr > 0.3
        ? "danger"
        : marginCostPctOfMrr > 0.1
          ? "warning"
          : "positive";

  return (
    <div className="flex flex-col gap-5">
      {/* Headline tiles. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="Total AI cost"
          value={eur(totalCostUsd)}
          sub={totalIncludesEstimate ? "incl. estimate" : "this window"}
        />
        <KpiTile
          label="Per active account"
          value={
            costPerActiveAccount === null ? "—" : eur(costPerActiveAccount)
          }
          sub={`${compactNumber(activeAccounts)} active account${activeAccounts === 1 ? "" : "s"}`}
        />
        <KpiTile
          label="Cost vs MRR"
          value={
            marginCostPctOfMrr === null ? "—" : pctLabel(marginCostPctOfMrr)
          }
          sub="AI as % of MRR"
          tone={marginTone}
        />
        <KpiTile
          label="Margin headroom"
          value={
            marginCostPctOfMrr === null
              ? "—"
              : pctLabel(Math.max(0, 1 - marginCostPctOfMrr))
          }
          sub="MRR net of AI"
          tone={marginCostPctOfMrr === null ? "default" : "positive"}
        />
      </div>

      {/* Per-product split. */}
      <div>
        <p
          className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.06em]"
          style={{ color: "var(--text-secondary)" }}
        >
          Cost by product
        </p>
        <AiCostByProduct rows={perProduct} totalCostUsd={totalCostUsd} />
      </div>

      <p
        className="text-[11px] leading-snug"
        style={{ color: "var(--text-tertiary)" }}
      >
        Atlas cost is the real summed per-message spend. Astra has no stored
        dollar figure, so its cost is estimated from token usage at the
        published Sonnet input rate — shown with an &ldquo;est.&rdquo; badge and
        its raw token count. The cost-vs-MRR ratio compares USD spend to EUR
        revenue as a cost-intensity proxy.
      </p>
    </div>
  );
}

function AiCostByProduct({
  rows,
  totalCostUsd,
}: {
  rows: AiCostProductLine[];
  totalCostUsd: number;
}) {
  // Bars are relative to the heaviest product's USD cost so the leader reads as
  // a full bar. A null (unknown) cost has no comparable magnitude → 0-width bar.
  const maxCost = rows.reduce(
    (m, r) => ((r.costUsd ?? 0) > m ? r.costUsd! : m),
    0,
  );

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const cost = row.costUsd;
        const share = maxCost > 0 && cost !== null ? (cost / maxCost) * 100 : 0;
        return (
          <li key={row.product}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span
                className="flex items-center gap-2 text-[12px] font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {row.label}
                {row.isEstimate && <EstimateBadge />}
              </span>
              <span
                className="flex-shrink-0 text-[12px] tabular-nums"
                style={{ color: "var(--text-secondary)" }}
              >
                {cost === null ? "—" : eur(cost)}
                <span style={{ color: "var(--text-tertiary)" }}>
                  {" · "}
                  {compactNumber(row.messages)} message
                  {row.messages === 1 ? "" : "s"}
                  {row.tokens !== null && (
                    <>
                      {" · "}
                      {compactNumber(row.tokens)} tokens
                    </>
                  )}
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
                  width: `${share}%`,
                  background: "var(--accent-primary)",
                }}
              />
            </div>
          </li>
        );
      })}
      <li
        className="mt-1 text-[11px] tabular-nums"
        style={{ color: "var(--text-tertiary)" }}
      >
        Total {eur(totalCostUsd)} across all assistants this window.
      </li>
    </ul>
  );
}

/** A small "est." pill marking a token-derived (not real-summed) cost figure. */
function EstimateBadge() {
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em]"
      style={{
        color: "var(--text-tertiary)",
        background: "var(--separator-strong)",
      }}
      title="Estimated from token usage at the published Sonnet input rate — not a stored dollar figure."
    >
      est.
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Small helpers + states.
 * ────────────────────────────────────────────────────────────────────────── */

function EfficiencySkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div
        className="glass-elevated h-[280px] animate-pulse rounded-2xl"
        style={{ border: "1px solid var(--border-default)" }}
      />
      <div
        className="glass-elevated h-[280px] animate-pulse rounded-2xl"
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
        <Gauge size={20} style={{ color: "var(--text-secondary)" }} />
      </div>
      <p
        className="text-[14px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        No efficiency signal this window
      </p>
      <p
        className="max-w-sm text-[12px] leading-snug"
        style={{ color: "var(--text-secondary)" }}
      >
        This view tracks real virality — team invitations and how many are
        accepted — and the cost of the AI assistants per active account. As soon
        as an invite is sent or an assistant turn is produced in this window, it
        appears here.
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
