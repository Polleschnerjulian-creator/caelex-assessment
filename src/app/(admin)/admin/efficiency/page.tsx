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

import { useMemo, useState } from "react";
import { Gauge } from "lucide-react";
import type { AdminRange } from "@/lib/admin/analytics-types";
import type { Virality, InviteFunnel } from "@/lib/admin/virality";
import type { AiCost, AiCostProductLine } from "@/lib/admin/ai-cost";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import KpiTile from "@/components/admin/KpiTile";
import RangeTabs from "@/components/admin/RangeTabs";
import ExportButton from "@/components/admin/ExportButton";
import { CardSkeleton } from "@/components/admin/Skeleton";
import type { CsvRow } from "@/components/admin/export-utils";
import { useAdminData } from "@/components/admin/useAdminData";
import {
  compactNumber,
  dateDe,
  eur,
  pctLabel,
} from "@/components/admin/format";

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
  // Stale-while-revalidate: bekannte Zeiträume erscheinen sofort aus dem Cache.
  const { data, error } = useAdminData<EfficiencyResponse>(
    `/api/admin/v2/efficiency?range=${range}`,
  );

  // Export rows from the ALREADY-FETCHED view-model — no extra fetch. One CSV
  // carries BOTH halves of the page under a "section" column: the per-product
  // AI-cost lines (real Atlas USD + estimated Astra), then the SENT→ACCEPTED
  // invite-funnel legs. Each section's rows are only emitted when that half has
  // real data, so a page with just one populated half still exports cleanly.
  const exportRows = useMemo<CsvRow[]>(() => {
    if (!data || isEfficiencyEmpty(data)) return [];
    const rows: CsvRow[] = [];

    if (!data.aiCost.isEmpty) {
      for (const line of data.aiCost.perProduct) {
        rows.push({
          section: "KI-Kosten",
          item: line.label,
          messages: line.messages,
          tokens: line.tokens === null ? "" : line.tokens,
          cost_usd: line.costUsd === null ? "" : line.costUsd,
          is_estimate: line.isEstimate,
        });
      }
    }

    if (!data.virality.isEmpty) {
      const f = data.virality.funnel;
      const legs: Array<[string, number]> = [
        ["Gesendet", f.sent],
        ["Angenommen", f.accepted],
        ["Ausstehend", f.pending],
        ["Abgelaufen", f.expired],
      ];
      for (const [item, value] of legs) {
        rows.push({
          section: "Einladungs-Trichter",
          item,
          messages: value,
          tokens: "",
          cost_usd: "",
          is_estimate: "",
        });
      }
    }

    return rows;
  }, [data]);

  return (
    <div>
      <AdminPageHeader
        title="Effizienz"
        subtitle="Viralität und KI-Stückkosten — wie sich das Produkt verbreitet und was es kostet"
        right={
          <div className="flex items-center gap-3">
            {data && (
              <span
                className="hidden text-[11px] tabular-nums sm:inline"
                style={{ color: "var(--text-tertiary)" }}
              >
                Stand{" "}
                {dateDe(data.generatedAt) ?? data.generatedAt.slice(0, 10)}
              </span>
            )}
            {data && !isEfficiencyEmpty(data) && (
              <ExportButton
                rows={exportRows}
                filename={`caelex-effizienz-${range}`}
                columns={[
                  { key: "section", header: "Bereich" },
                  { key: "item", header: "Posten" },
                  { key: "messages", header: "Nachrichten / Anzahl" },
                  { key: "tokens", header: "Tokens" },
                  { key: "cost_usd", header: "Kosten (USD)" },
                  { key: "is_estimate", header: "Schätzung?" },
                ]}
                label="Export (CSV)"
              />
            )}
            <RangeTabs value={range} onChange={setRange} />
          </div>
        }
      />

      {!data && error && (
        <AdminCard>
          <p
            className="text-[13px] leading-snug"
            style={{ color: "var(--accent-danger)" }}
          >
            Effizienz konnte nicht geladen werden: {error}
          </p>
        </AdminCard>
      )}

      {!data && !error && <EfficiencySkeleton />}

      {data && isEfficiencyEmpty(data) && (
        <AdminCard>
          <EmptyState />
        </AdminCard>
      )}

      {data && !isEfficiencyEmpty(data) && <EfficiencyBody data={data} />}
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
        title="Viralität"
        subtitle="Viraler Koeffizient k und der Einladungs-Trichter — gelesen aus den Team-Einladungen"
      >
        {virality.isEmpty ? (
          <NoSeries label="In diesem Zeitraum wurden noch keine Team-Einladungen gesendet." />
        ) : (
          <ViralitySection virality={virality} />
        )}
      </AdminCard>

      <AdminCard
        title="KI-Stückkosten"
        subtitle="Assistenten-Kosten je aktivem Konto und als Anteil am monatlich wiederkehrenden Umsatz (MRR), nach Produkt"
      >
        {aiCost.isEmpty ? (
          <NoSeries label="In diesem Zeitraum gab es noch keine KI-Assistenten-Aktivität." />
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
          label="Viraler Koeffizient k"
          value={k === null ? "—" : k.toFixed(2).replace(".", ",")}
          sub="Annahmen je einladender Org — ab 1 trägt sich das Wachstum selbst"
          tone={kTone}
        />
        <KpiTile
          label="Einladende Orgs"
          value={compactNumber(invitingOrgs)}
          sub="haben ≥ 1 Einladung gesendet"
        />
        <KpiTile
          label="Einladungen gesendet"
          value={compactNumber(funnel.sent)}
          sub="in diesem Zeitraum"
        />
        <KpiTile
          label="Annahmequote"
          value={
            funnel.acceptanceRate === null
              ? "—"
              : pctLabel(funnel.acceptanceRate)
          }
          sub={`${compactNumber(funnel.accepted)} angenommen`}
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
          Einladungs-Trichter
        </p>
        <InviteFunnelBars funnel={funnel} />
      </div>

      <p
        className="text-[11px] leading-snug"
        style={{ color: "var(--text-tertiary)" }}
      >
        k zählt angenommene Einladungen je Organisation, die in diesem Zeitraum
        jemanden eingeladen hat. Der Trichter endet bei „angenommen" — ob aus
        der angenommenen Einladung ein aktiver Nutzer wurde, wird an der
        Einladung nicht erfasst, daher gibt es hier keine Aktivierungsquote.
      </p>
    </div>
  );
}

function InviteFunnelBars({ funnel }: { funnel: InviteFunnel }) {
  // Each leg is a share of the total sent, so the bars read as a breakdown of
  // the funnel mouth. Guard the (already non-empty) sent against 0.
  const rows: Array<{ label: string; value: number; color: string }> = [
    { label: "Gesendet", value: funnel.sent, color: "var(--accent-primary)" },
    {
      label: "Angenommen",
      value: funnel.accepted,
      color: "var(--accent-success)",
    },
    {
      label: "Ausstehend",
      value: funnel.pending,
      color: "var(--text-tertiary)",
    },
    {
      label: "Abgelaufen",
      value: funnel.expired,
      color: "var(--accent-danger)",
    },
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
                {pctLabel(row.value / max)} der gesendeten
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
          label="KI-Kosten gesamt"
          value={eur(totalCostUsd)}
          sub={totalIncludesEstimate ? "inkl. Schätzung" : "in diesem Zeitraum"}
        />
        <KpiTile
          label="Je aktivem Konto"
          value={
            costPerActiveAccount === null ? "—" : eur(costPerActiveAccount)
          }
          sub={`${compactNumber(activeAccounts)} aktive${activeAccounts === 1 ? "s Konto" : " Konten"}`}
        />
        <KpiTile
          label="Kosten vs. MRR"
          value={
            marginCostPctOfMrr === null ? "—" : pctLabel(marginCostPctOfMrr)
          }
          sub="KI-Kosten als Anteil am Monats-Umsatz (MRR)"
          tone={marginTone}
        />
        <KpiTile
          label="Margen-Puffer"
          value={
            marginCostPctOfMrr === null
              ? "—"
              : pctLabel(Math.max(0, 1 - marginCostPctOfMrr))
          }
          sub="MRR nach Abzug der KI-Kosten"
          tone={marginCostPctOfMrr === null ? "default" : "positive"}
        />
      </div>

      {/* Per-product split. */}
      <div>
        <p
          className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.06em]"
          style={{ color: "var(--text-secondary)" }}
        >
          Kosten nach Produkt
        </p>
        <AiCostByProduct rows={perProduct} totalCostUsd={totalCostUsd} />
      </div>

      <p
        className="text-[11px] leading-snug"
        style={{ color: "var(--text-tertiary)" }}
      >
        Atlas-Kosten sind echte, pro Nachricht summierte Ausgaben. Für Astra
        gibt es keinen gespeicherten Dollar-Betrag — die Kosten werden aus der
        Token-Nutzung zum veröffentlichten Sonnet-Eingabepreis geschätzt
        (Kennzeichen „geschätzt" samt Token-Zahl). Das Verhältnis Kosten vs. MRR
        vergleicht USD-Ausgaben mit EUR-Umsatz als Näherung für die
        Kostenintensität.
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
                  {compactNumber(row.messages)} Nachricht
                  {row.messages === 1 ? "" : "en"}
                  {row.tokens !== null && (
                    <>
                      {" · "}
                      {compactNumber(row.tokens)} Tokens
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
        Gesamt {eur(totalCostUsd)} über alle Assistenten in diesem Zeitraum.
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
      title="Aus der Token-Nutzung zum veröffentlichten Sonnet-Eingabepreis geschätzt — kein gespeicherter Dollar-Betrag."
    >
      geschätzt
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Small helpers + states.
 * ────────────────────────────────────────────────────────────────────────── */

/** Erststart: echte Karten mit deutschen Titeln, Inhalte pulsieren dezent. */
function EfficiencySkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <CardSkeleton
        title="Viralität"
        subtitle="Viraler Koeffizient k und der Einladungs-Trichter"
        rows={5}
      />
      <CardSkeleton
        title="KI-Stückkosten"
        subtitle="Assistenten-Kosten je aktivem Konto und als Anteil am MRR"
        rows={5}
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
        Kein Effizienz-Signal in diesem Zeitraum
      </p>
      <p
        className="max-w-sm text-[12px] leading-snug"
        style={{ color: "var(--text-secondary)" }}
      >
        Diese Ansicht misst echte Viralität — Team-Einladungen und wie viele
        davon angenommen werden — sowie die Kosten der KI-Assistenten je aktivem
        Konto. Sobald in diesem Zeitraum eine Einladung gesendet oder eine
        Assistenten-Antwort erzeugt wird, erscheint sie hier.
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
