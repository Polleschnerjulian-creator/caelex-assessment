"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Product-Explorer — "which product do I double down on?".
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Pick ONE product (Atlas / Comply / Passage / Scholar / Pharos) and a window,
 * and see THAT product's usage, AI spend, value-outcomes, by-organization
 * breakdown, and entitlement penetration. Fed by
 * GET /api/admin/v2/products?product=…&range=… ({@link ProductExplorerResponse}).
 *
 * 🔒 Everything on this screen is AGGREGATE / ORGANIZATION-LEVEL. There is no
 * field in the payload — and nothing rendered here — that identifies an
 * individual person. "Active users" is a single COUNT(DISTINCT userId) number;
 * the by-organization table shows organization names (legal entities) only.
 *
 * Thin renderer: a clean 4-state machine (skeleton / inline-error / friendly
 * empty / data). The PRODUCT SWITCHER + RANGE TABS own the two query params; the
 * fetch URL is derived from them so a switch re-fetches (the hook aborts the
 * prior request — last-write-wins). Every number comes from the unit-tested pure
 * helpers in `product-explorer.ts`; nothing is computed or hard-coded here.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, useState, type ReactNode } from "react";
import { Boxes, Building2 } from "lucide-react";
import type { AdminRange } from "@/lib/admin/analytics-types";
import {
  EXPLORER_PRODUCTS,
  explorerProductLabel,
  type ExplorerProduct,
  type ProductExplorerResponse,
  type ProductExplorerView,
  type ProductOrgRow,
  type ProductOutcomeLine,
  type ProductAiSpendLine,
} from "@/lib/admin/product-explorer";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import KpiTile from "@/components/admin/KpiTile";
import RangeTabs from "@/components/admin/RangeTabs";
import ExportButton from "@/components/admin/ExportButton";
import { CardSkeleton, KpiTileSkeleton } from "@/components/admin/Skeleton";
import type { CsvRow } from "@/components/admin/export-utils";
import { useAdminData } from "@/components/admin/useAdminData";
import {
  compactNumber,
  dateDe,
  eur,
  pctLabel,
} from "@/components/admin/format";

/**
 * Deutsche Labels für die Ergebnis-Arten aus dem WACO-Katalog (value-events.ts).
 * Über die stabile outcomeId gemappt; unbekannte IDs fallen auf das vom
 * Server gelieferte (englische) Label zurück, damit nie etwas verschwindet.
 */
const OUTCOME_LABEL_DE: Record<string, string> = {
  comply_assessment_completed: "Abgeschlossene Assessments",
  trade_item_classified: "Klassifizierte Güter",
  trade_screening_decided: "Entschiedene Screenings",
  trade_license_issued: "Erteilte Lizenzen",
  atlas_draft_produced: "Erstellte KI-Entwürfe",
  scholar_planspiel_run: "Simulationsläufe",
  scholar_bookmark_saved: "Gemerkte Quellen",
  nca_submission_filed: "Eingereichte NCA-Anträge",
  document_generated: "Erzeugte Dokumente",
  deadline_met: "Eingehaltene Fristen",
};

export default function ProductExplorerPage() {
  // The page owns the two query params; the fetch URL is derived from them so a
  // switch re-fetches (the hook aborts the in-flight request — last-write-wins).
  const [product, setProduct] = useState<ExplorerProduct>("atlas");
  const [range, setRange] = useState<AdminRange>("30d");

  // Stale-while-revalidate: Produkt-/Zeitraum-Wechsel, die schon einmal geladen
  // wurden, erscheinen sofort aus dem Cache — kein Skelett-Blitzen mehr.
  const { data, error } = useAdminData<ProductExplorerResponse>(
    `/api/admin/v2/products?product=${product}&range=${range}`,
  );

  // Offer the by-org export only once there are real org rows in hand.
  const orgRows = data?.view.orgRows ?? [];
  const canExport = orgRows.length > 0;
  const exportRows = useMemo<CsvRow[]>(
    () => (data ? buildOrgExport(data.view) : []),
    [data],
  );

  return (
    <div>
      <AdminPageHeader
        title="Produkt-Explorer"
        subtitle="Nutzung, KI-Kosten, Ergebnisse und Verbreitung je Produkt — als Entscheidungsgrundlage, wo investiert wird. Nur aggregiert und auf Organisations-Ebene."
        right={
          <div className="flex flex-wrap items-center gap-3">
            {data && (
              <span
                className="text-[11px] tabular-nums"
                style={{ color: "var(--text-tertiary)" }}
              >
                Stand{" "}
                {dateDe(data.generatedAt) ?? data.generatedAt.slice(0, 10)} ·
                letzte {data.view.rangeDays} Tage
              </span>
            )}
            {canExport && (
              <ExportButton
                rows={exportRows}
                columns={ORG_EXPORT_COLUMNS}
                filename={`produkt-${product}-nach-org-${range}`}
                label="Export (CSV)"
              />
            )}
            <RangeTabs value={range} onChange={setRange} />
            <ProductSwitcher value={product} onChange={setProduct} />
          </div>
        }
      />

      {!data && error && (
        <AdminCard>
          <p
            className="text-[13px] leading-snug"
            style={{ color: "var(--accent-danger)" }}
          >
            Der Produkt-Explorer konnte nicht geladen werden: {error}
          </p>
        </AdminCard>
      )}

      {!data && !error && <ExplorerSkeleton />}

      {data && data.view.isEmpty && (
        <AdminCard>
          <EmptyState label={data.view.label} />
        </AdminCard>
      )}

      {data && !data.view.isEmpty && <ExplorerBody view={data.view} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Body — the populated explorer. Split out so the top-level component reads as a
 * clean state machine (loading / error / empty / body).
 * ────────────────────────────────────────────────────────────────────────── */

function ExplorerBody({ view }: { view: ProductExplorerView }) {
  return (
    <div className="flex flex-col gap-5">
      <UsageKpis view={view} />

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard
          title="Wertschöpfung (Ergebnisse)"
          subtitle="Echte regulatorische Ergebnisse in diesem Zeitraum, nach Produkt gewichtet."
        >
          <OutcomesBlock view={view} />
        </AdminCard>

        <AdminCard
          title="KI-/Token-Kosten"
          subtitle="Modell-Kosten, die diesem Produkt in diesem Zeitraum zuzuordnen sind."
        >
          <AiSpendBlock view={view} />
        </AdminCard>
      </div>

      <AdminCard
        title="Nach Organisation"
        subtitle="Top-Organisationen für dieses Produkt — aktive Nutzer, KI-Kosten und Ergebnisse. Nur Aggregate auf Organisations-Ebene."
        right={<ProductBadge label={view.label} />}
      >
        <OrgBreakdown view={view} />
      </AdminCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * USAGE — the headline KPI row: active users (+ trend), entitlement penetration.
 * ────────────────────────────────────────────────────────────────────────── */

function UsageKpis({ view }: { view: ProductExplorerView }) {
  const { usage, entitlement } = view;

  // Active-users tone tracks the trend direction (positive ↑, danger ↓).
  const trendTone =
    usage.activeUsersTrend === null
      ? "default"
      : usage.activeUsersTrend > 0
        ? "positive"
        : usage.activeUsersTrend < 0
          ? "danger"
          : "default";

  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-4"
      role="group"
      aria-label="Nutzungs-Überblick"
    >
      <KpiTile
        label="Aktive Nutzer"
        value={compactNumber(usage.activeUsers)}
        sub={trendSub(usage.activeUsersTrend, usage.activeUsersPrior)}
        tone={trendTone}
      />
      <KpiTile
        label="Anmeldungen (Logins)"
        value={usage.logins === null ? "—" : compactNumber(usage.logins)}
        sub={
          usage.logins === null
            ? "kein Login-Signal je Produkt"
            : "in diesem Zeitraum"
        }
      />
      <KpiTile
        label="Freigeschaltete Orgs"
        value={compactNumber(entitlement.entitledOrgs)}
        sub={
          entitlement.entitledOrgs === 0
            ? "noch keine Freischaltungen"
            : `${compactNumber(entitlement.activeOrgs)} aktiv · ${compactNumber(
                entitlement.idleOrgs,
              )} ungenutzt`
        }
      />
      <KpiTile
        label="Aktivierungsquote"
        value={
          entitlement.activationRate === null
            ? "—"
            : pctLabel(entitlement.activationRate)
        }
        sub={
          entitlement.activationRate === null
            ? "keine freigeschaltete Basis"
            : "Anteil der freigeschalteten Orgs, die aktiv sind"
        }
        tone={activationTone(entitlement.activationRate)}
      />
    </div>
  );
}

/** Sub-line for the active-users tile: the signed trend + the prior baseline. */
function trendSub(trend: number | null, prior: number | null): string {
  if (trend === null) {
    return prior === null ? "kein Vergleichszeitraum" : "neu ggü. Vorzeitraum";
  }
  const arrow = trend > 0 ? "+" : "";
  return `${arrow}${pctLabel(trend)} ggü. Vorzeitraum ${
    prior === null ? "" : `(${compactNumber(prior)})`
  }`.trim();
}

/** Activation-rate tone: green at ≥50%, amber 20–50%, red below 20%. */
function activationTone(
  rate: number | null,
): "default" | "positive" | "warning" | "danger" {
  if (rate === null) return "default";
  if (rate >= 0.5) return "positive";
  if (rate >= 0.2) return "warning";
  return "danger";
}

/* ─────────────────────────────────────────────────────────────────────────────
 * OUTCOMES — weighted value-outcome breakdown, heaviest contribution first.
 * ────────────────────────────────────────────────────────────────────────── */

function OutcomesBlock({ view }: { view: ProductExplorerView }) {
  const { outcomes } = view;

  if (outcomes.rawTotal === 0 && outcomes.lines.every((l) => l.count === 0)) {
    return (
      <NoSeries label="Dieses Produkt hat in diesem Zeitraum keine Ergebnisse erzeugt." />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-6">
        <Stat
          label="Gewichtete Ergebnisse"
          value={compactNumber(outcomes.weightedTotal)}
          accent
        />
        <Stat
          label="Ergebnisse (ungewichtet)"
          value={compactNumber(outcomes.rawTotal)}
        />
      </div>
      <OutcomeBars lines={outcomes.lines} />
    </div>
  );
}

function OutcomeBars({ lines }: { lines: ProductOutcomeLine[] }) {
  // Bars are relative to the heaviest weighted contribution; skip all-zero kinds.
  const shown = lines.filter((l) => l.count > 0);
  const maxWeighted = shown.reduce(
    (m, l) => (l.weighted > m ? l.weighted : m),
    0,
  );

  if (shown.length === 0) {
    return (
      <NoSeries label="In diesem Zeitraum wurden keine Ergebnis-Arten erfasst." />
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {shown.map((line) => (
        <li key={line.outcomeId}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {OUTCOME_LABEL_DE[line.outcomeId] ?? line.label}
            </span>
            <span
              className="flex-shrink-0 text-[12px] tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              {compactNumber(line.count)}
              <span style={{ color: "var(--text-tertiary)" }}>
                {" · "}
                {compactNumber(line.weighted)} gewichtet
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
                width: `${maxWeighted > 0 ? (line.weighted / maxWeighted) * 100 : 0}%`,
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
 * AI / TOKEN SPEND — total + per-source split (Atlas real, Astra estimated).
 * ────────────────────────────────────────────────────────────────────────── */

function AiSpendBlock({ view }: { view: ProductExplorerView }) {
  const { aiSpend } = view;

  if (!aiSpend.applicable) {
    return (
      <NoSeries
        label={`${view.label} hat keine KI-Kostenspur — nicht anwendbar.`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <Stat label="Kosten gesamt" value={eur(aiSpend.totalCostUsd)} accent />
        {aiSpend.includesEstimate && <EstimateBadge />}
      </div>
      <ul className="flex flex-col gap-2.5">
        {aiSpend.lines.map((line) => (
          <AiSpendRow key={line.product} line={line} />
        ))}
      </ul>
      <p
        className="text-[11px] leading-snug"
        style={{ color: "var(--text-tertiary)" }}
      >
        Atlas-Kosten sind echte, pro Nachricht summierte Ausgaben. Astra-Kosten
        werden aus der Token-Summe zum Sonnet-Eingaberate-Preis geschätzt.
      </p>
    </div>
  );
}

function AiSpendRow({ line }: { line: ProductAiSpendLine }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span
        className="flex items-center gap-2 text-[12px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {line.label}
        {line.isEstimate && <EstimateBadge compact />}
      </span>
      <span
        className="flex-shrink-0 text-[12px] tabular-nums"
        style={{ color: "var(--text-secondary)" }}
      >
        {line.costUsd === null ? "—" : eur(line.costUsd)}
        <span style={{ color: "var(--text-tertiary)" }}>
          {" · "}
          {compactNumber(line.messages)} Nachr.
          {line.tokens !== null
            ? ` · ${compactNumber(line.tokens)} Tokens`
            : ""}
        </span>
      </span>
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * BY ORGANIZATION — the richest dataset. Org-level aggregates only.
 * ────────────────────────────────────────────────────────────────────────── */

function OrgBreakdown({ view }: { view: ProductExplorerView }) {
  if (view.orgBreakdownUnavailable) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Building2 size={18} style={{ color: "var(--text-tertiary)" }} />
        <p
          className="max-w-md text-[12px] leading-snug"
          style={{ color: "var(--text-secondary)" }}
        >
          {view.label}-Aktivität wird pro Studierendem erfasst, nicht pro
          Organisation — eine Aufschlüsselung nach Organisation gibt es für
          dieses Produkt daher nicht. Die Zahl der aktiven Nutzer oben bleibt
          eine aggregierte Gesamtzahl.
        </p>
      </div>
    );
  }

  if (view.orgRows.length === 0) {
    return (
      <NoSeries label="In diesem Zeitraum hat keine Organisation Aktivität für dieses Produkt erzeugt." />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            <Th align="left">Organisation</Th>
            <Th align="right">Aktive Nutzer</Th>
            <Th align="right">KI-Kosten</Th>
            <Th align="right">Ergebnisse</Th>
          </tr>
        </thead>
        <tbody>
          {view.orgRows.map((row) => (
            <OrgRowView key={row.organizationId} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrgRowView({ row }: { row: ProductOrgRow }) {
  return (
    <tr style={{ borderTop: "1px solid var(--border-default)" }}>
      <td
        className="py-2 pr-3 font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {row.orgName}
      </td>
      <td
        className="py-2 pl-3 text-right tabular-nums"
        style={{ color: "var(--text-secondary)" }}
      >
        {compactNumber(row.activeUsers)}
      </td>
      <td
        className="py-2 pl-3 text-right tabular-nums"
        style={{ color: "var(--text-secondary)" }}
      >
        {row.spendUsd === null ? "—" : eur(row.spendUsd)}
      </td>
      <td
        className="py-2 pl-3 text-right tabular-nums"
        style={{ color: "var(--text-secondary)" }}
      >
        {compactNumber(row.outcomes)}
      </td>
    </tr>
  );
}

function Th({
  children,
  align,
}: {
  children: ReactNode;
  align: "left" | "right";
}) {
  return (
    <th
      className={`pb-2 text-[10px] font-medium uppercase tracking-[0.06em] ${
        align === "right" ? "pl-3 text-right" : "pr-3 text-left"
      }`}
      style={{ color: "var(--text-tertiary)" }}
      scope="col"
    >
      {children}
    </th>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CSV export for the by-organization table.
 * ────────────────────────────────────────────────────────────────────────── */

/** One CSV row per organization, with the metrics the table encodes. Blank cells
 * (an em-dash in the UI) export as "" so the spreadsheet reads them as empty. */
function buildOrgExport(view: ProductExplorerView): CsvRow[] {
  return view.orgRows.map((row) => ({
    organization: row.orgName === "—" ? "" : row.orgName,
    active_users: row.activeUsers,
    ai_spend_usd: row.spendUsd === null ? "" : row.spendUsd,
    outcomes: row.outcomes,
  }));
}

const ORG_EXPORT_COLUMNS = [
  { key: "organization", header: "Organisation" },
  { key: "active_users", header: "Aktive Nutzer" },
  { key: "ai_spend_usd", header: "KI-Kosten (USD)" },
  { key: "outcomes", header: "Ergebnisse" },
] as const;

/* ─────────────────────────────────────────────────────────────────────────────
 * Small shared primitives + states.
 * ────────────────────────────────────────────────────────────────────────── */

/** A small labelled figure. `accent` tints the value emerald for the headline. */
function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className="text-[10px] font-medium uppercase tracking-[0.06em]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-[22px] font-semibold leading-none tabular-nums"
        style={{
          color: accent ? "var(--accent-primary)" : "var(--text-primary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

/** A small "estimate" badge for token-derived AI cost. */
function EstimateBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`rounded font-semibold uppercase tracking-[0.06em] ${
        compact ? "px-1 text-[9px]" : "px-1.5 py-0.5 text-[10px]"
      }`}
      style={{
        background: "var(--separator-strong)",
        color: "var(--text-tertiary)",
      }}
      title="Aus der Token-Summe zum Sonnet-Eingaberate-Preis geschätzt (kein gespeicherter USD-Betrag pro Nachricht)."
    >
      geschätzt
    </span>
  );
}

/** A small bordered pill showing the current product (card header right slot). */
function ProductBadge({ label }: { label: string }) {
  return (
    <span
      className="rounded-md px-2 py-1 text-[11px] font-medium"
      style={{
        color: "var(--text-secondary)",
        border: "1px solid var(--border-default)",
      }}
    >
      {label}
    </span>
  );
}

/**
 * The product switcher — a small segmented control over the five products.
 * Mirrors the RangeTabs / paths ProductSwitcher visual language: a glass-surface
 * pill rail, the active pill in the emerald accent, muted→primary hover driven by
 * a CSS `:hover` rule (never an inline hover mutation). A real WAI-ARIA tablist.
 */
function ProductSwitcher({
  value,
  onChange,
}: {
  value: ExplorerProduct;
  onChange: (p: ExplorerProduct) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Produkt"
      className="inline-flex flex-wrap items-center gap-0.5 rounded-lg p-0.5 glass-surface"
      style={{ border: "1px solid var(--border-default)" }}
    >
      <style>{`
        .explorer-pill { color: var(--text-secondary); transition: color 150ms; }
        .explorer-pill:hover { color: var(--text-primary); }
        .explorer-pill:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 1px;
        }
      `}</style>
      {EXPLORER_PRODUCTS.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p)}
            className="explorer-pill rounded-md px-2.5 py-1 text-[12px] font-medium"
            style={
              active
                ? { background: "var(--accent-primary)", color: "#ffffff" }
                : undefined
            }
          >
            {explorerProductLabel(p)}
          </button>
        );
      })}
    </div>
  );
}

/** Erststart: echte Karten mit deutschen Titeln, Inhalte pulsieren dezent. */
function ExplorerSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiTileSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <CardSkeleton title="Wertschöpfung (Ergebnisse)" rows={5} />
        <CardSkeleton title="KI-/Token-Kosten" rows={5} />
      </div>
      <CardSkeleton title="Nach Organisation" rows={4} />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl glass-surface"
        style={{ border: "1px solid var(--border-default)" }}
      >
        <Boxes size={20} style={{ color: "var(--text-secondary)" }} />
      </div>
      <p
        className="text-[14px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        Keine Aktivität für {label} in diesem Zeitraum
      </p>
      <p
        className="max-w-sm text-[12px] leading-snug"
        style={{ color: "var(--text-secondary)" }}
      >
        Diese Ansicht zählt echte Ergebnisse, aktive Nutzer, KI-Kosten und
        freigeschaltete Organisationen für das gewählte Produkt. Sobald {label}{" "}
        in diesem Zeitraum etwas davon erzeugt — oder eine Organisation
        freigeschaltet wird — erscheint es hier.
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
