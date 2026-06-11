"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Customers — the customer-health watchlist + expansion surface (P1a).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The ONE screen that answers "who is about to churn, and who is ready to
 * expand?". Fed by GET /api/admin/v2/customers ({@link CustomersResponse}).
 *
 * Sections, top to bottom:
 *   1. AT-RISK watchlist — tenants ranked worst-first, each with reason-code
 *      chips (cancelling, payment failed, low health, activity drop, gone quiet,
 *      trial ending) + a trend pill, so the founder sees exactly what to action.
 *   2. EXPANSION list — healthy tenants near a plan limit (seat / spacecraft
 *      utilisation), highest pressure first — the natural upsell candidates.
 *   3. PORTFOLIO — per-product paid/trial/churn counts + the active-base plan
 *      mix.
 *
 * Loading → skeleton; error → inline message; empty (no tenants/lists) → a
 * friendly explainer. This component is a THIN renderer — every number comes
 * from the unit-tested pure helpers in `@/lib/admin/health`; nothing is
 * computed, randomised, or hard-coded here.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { ArrowDownRight, ArrowUpRight, Minus, HeartPulse } from "lucide-react";
import {
  isCustomersEmpty,
  type CustomersResponse,
  type WatchlistEntry,
  type ExpansionEntry,
  type ProductStatusCounts,
  type PlanMixEntry,
  type HealthTrend,
  type RiskLevel,
  type RiskReasonCode,
  type ExpansionReasonCode,
} from "@/lib/admin/health";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import ExportButton from "@/components/admin/ExportButton";
import { CardSkeleton } from "@/components/admin/Skeleton";
import type { CsvRow } from "@/components/admin/export-utils";
import { useAdminData } from "@/components/admin/useAdminData";
import { compactNumber, pctLabel } from "@/components/admin/format";

/** Brand display name for a plan/product slug (Trade → Passage). */
function productLabel(slug: string): string {
  if (slug === "trade") return "Passage";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** Human label + tone for each at-risk reason code. Stable map = the contract. */
const RISK_REASON_META: Record<
  RiskReasonCode,
  { label: string; tone: "danger" | "warning" }
> = {
  CANCELLING: { label: "Kündigt", tone: "danger" },
  PAYMENT_FAILED: { label: "Zahlung fehlgeschlagen", tone: "danger" },
  TRIAL_ENDING: { label: "Testphase endet", tone: "warning" },
  LOW_HEALTH: { label: "Niedriger Gesundheitswert", tone: "warning" },
  ACTIVITY_DROP: { label: "Aktivität eingebrochen", tone: "warning" },
  GONE_QUIET: { label: "Still geworden", tone: "warning" },
};

/** Human label for each expansion reason code. */
const EXPANSION_REASON_LABEL: Record<ExpansionReasonCode, string> = {
  NEAR_SEAT_LIMIT: "Nahe am Nutzerplatz-Limit",
  NEAR_SPACECRAFT_LIMIT: "Nahe am Raumfahrzeug-Limit",
  RISING_USAGE: "Steigende Nutzung",
};

/* ─────────────────────────────────────────────────────────────────────────────
 * CSV row projections — flatten the already-fetched watchlist / expansion arrays
 * into spreadsheet-shaped rows for ExportButton. No new fetch, no recompute: the
 * page hands its `data` (from useAdminData) straight through, reusing the SAME
 * reason-code label maps the table renders so the CSV reads identically. An
 * unknown health score is exported as an empty cell (never a fabricated 0). A
 * null/unlimited cap is exported as an empty cap cell.
 * ────────────────────────────────────────────────────────────────────────── */

/** At-risk watchlist → one CSV line per tenant, worst-first (array order). */
function watchlistCsvRows(rows: WatchlistEntry[]): CsvRow[] {
  return rows.map((row) => ({
    tenant: row.name,
    plan: row.plan,
    health: row.scoreUnknown ? "" : row.score,
    trend: row.trend,
    risk: row.risk,
    riskScore: row.riskScore,
    reasons: row.reasons.map((c) => RISK_REASON_META[c].label).join("; "),
    recentActivity: row.recentActivity,
    priorActivity: row.priorActivity,
    lastActivity: row.lastActivityDate ?? "",
  }));
}

const WATCHLIST_COLUMNS = [
  { key: "tenant", header: "Kunde" },
  { key: "plan", header: "Plan" },
  { key: "health", header: "Gesundheitswert" },
  { key: "trend", header: "Trend" },
  { key: "risk", header: "Risiko" },
  { key: "riskScore", header: "Risiko-Wert" },
  { key: "reasons", header: "Gründe" },
  { key: "recentActivity", header: "Aktivität zuletzt" },
  { key: "priorActivity", header: "Aktivität davor" },
  { key: "lastActivity", header: "Letzte Aktivität" },
];

/** Expansion candidates → one CSV line per tenant, highest pressure first. */
function expansionCsvRows(rows: ExpansionEntry[]): CsvRow[] {
  return rows.map((row) => ({
    tenant: row.name,
    plan: row.plan,
    health: row.scoreUnknown ? "" : row.score,
    seatsUsed: row.seatsUsed,
    seatCap: row.seatCap ?? "",
    spacecraftUsed: row.spacecraftUsed,
    spacecraftCap: row.spacecraftCap ?? "",
    topUtilisation: Number(row.topUtilisation.toFixed(4)),
    signals: row.reasons.map((c) => EXPANSION_REASON_LABEL[c]).join("; "),
  }));
}

const EXPANSION_COLUMNS = [
  { key: "tenant", header: "Kunde" },
  { key: "plan", header: "Plan" },
  { key: "health", header: "Gesundheitswert" },
  { key: "seatsUsed", header: "Nutzerplätze belegt" },
  { key: "seatCap", header: "Nutzerplatz-Limit" },
  { key: "spacecraftUsed", header: "Raumfahrzeuge belegt" },
  { key: "spacecraftCap", header: "Raumfahrzeug-Limit" },
  { key: "topUtilisation", header: "Höchste Auslastung" },
  { key: "signals", header: "Signale" },
];

export default function CustomersPage() {
  // Stale-while-revalidate: Folgebesuche zeigen sofort die gecachten Daten;
  // das Struktur-Skelett unten erscheint nur beim allerersten Laden.
  const { data, error } = useAdminData<CustomersResponse>(
    "/api/admin/v2/customers",
  );

  return (
    <div>
      <AdminPageHeader
        title="Kunden"
        subtitle="Abwanderungs-Watchlist, Upsell-Kandidaten und Portfolio-Status"
        right={
          data ? (
            <div className="flex items-center gap-3">
              <span
                className="hidden text-[11px] tabular-nums sm:inline"
                style={{ color: "var(--text-tertiary)" }}
              >
                {compactNumber(data.totalTenants)} Kunde
                {data.totalTenants === 1 ? "" : "n"}
              </span>
              {data.atRisk.length > 0 && (
                <ExportButton
                  rows={watchlistCsvRows(data.atRisk)}
                  columns={WATCHLIST_COLUMNS}
                  filename="caelex-kunden-risiko-watchlist"
                  label="Risiko-CSV"
                />
              )}
              {data.expansion.length > 0 && (
                <ExportButton
                  rows={expansionCsvRows(data.expansion)}
                  columns={EXPANSION_COLUMNS}
                  filename="caelex-kunden-upsell"
                  label="Upsell-CSV"
                />
              )}
            </div>
          ) : undefined
        }
      />

      {!data && error && (
        <AdminCard>
          <p
            className="text-[13px] leading-snug"
            style={{ color: "var(--accent-danger)" }}
          >
            Kunden konnten nicht geladen werden: {error}
          </p>
        </AdminCard>
      )}

      {!data && !error && <CustomersSkeleton />}

      {data && isCustomersEmpty(data) && (
        <AdminCard>
          <EmptyState />
        </AdminCard>
      )}

      {data && !isCustomersEmpty(data) && <CustomersBody data={data} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Body — the populated customers screen. Split out so the top-level component
 * reads as a clean state machine (loading / error / empty / body).
 * ────────────────────────────────────────────────────────────────────────── */

function CustomersBody({ data }: { data: CustomersResponse }) {
  const { atRisk, expansion, productStatus, planMix } = data;

  return (
    <div className="flex flex-col gap-5">
      <AdminCard
        title="Abwanderungs-Risiko (Churn-Watchlist)"
        subtitle="Kunden mit Abwanderungs-Signalen — die dringendsten zuerst"
        right={<CountBadge n={atRisk.length} tone="danger" />}
      >
        {atRisk.length > 0 ? (
          <WatchlistTable rows={atRisk} />
        ) : (
          <NoSeries label="Derzeit zeigt kein Kunde Abwanderungs-Signale." />
        )}
      </AdminCard>

      <AdminCard
        title="Upsell-Kandidaten (Expansion)"
        subtitle="Gesunde Kunden nahe an einem Plan-Limit — reif für ein Upgrade"
        right={<CountBadge n={expansion.length} tone="positive" />}
      >
        {expansion.length > 0 ? (
          <ExpansionTable rows={expansion} />
        ) : (
          <NoSeries label="Noch kein gesunder Kunde nahe an einem Plan-Limit." />
        )}
      </AdminCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard
          title="Produkt-Status"
          subtitle="Bezahlt · Testphase · ausgelaufen — Zugänge je Produkt"
        >
          {productStatus.length > 0 ? (
            <ProductStatusTable rows={productStatus} />
          ) : (
            <NoSeries label="Noch keine Produkt-Zugänge erfasst." />
          )}
        </AdminCard>

        <AdminCard title="Plan-Verteilung" subtitle="Aktive Abos nach Plan">
          {planMix.length > 0 ? (
            <PlanMixList rows={planMix} />
          ) : (
            <NoSeries label="Noch keine aktiven Abos." />
          )}
        </AdminCard>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * At-risk watchlist table.
 * ────────────────────────────────────────────────────────────────────────── */

function WatchlistTable({ rows }: { rows: WatchlistEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <Th>Kunde</Th>
            <Th>Plan</Th>
            <Th align="right">Gesundheit</Th>
            <Th>Trend</Th>
            <Th>Gründe</Th>
            <Th align="right">Aktivität</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.organizationId}
              style={{ borderTop: "1px solid var(--border-default)" }}
            >
              <Td>
                <span
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {row.name}
                </span>
              </Td>
              <Td>
                <PlanChip plan={row.plan} />
              </Td>
              <Td align="right">
                <HealthScore
                  score={row.score}
                  unknown={row.scoreUnknown}
                  risk={row.risk}
                />
              </Td>
              <Td>
                <TrendPill trend={row.trend} />
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {row.reasons.map((code) => (
                    <ReasonChip key={code} code={code} />
                  ))}
                </div>
              </Td>
              <Td align="right">
                <ActivityDelta
                  recent={row.recentActivity}
                  prior={row.priorActivity}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Expansion table.
 * ────────────────────────────────────────────────────────────────────────── */

function ExpansionTable({ rows }: { rows: ExpansionEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <Th>Kunde</Th>
            <Th>Plan</Th>
            <Th align="right">Gesundheit</Th>
            <Th align="right">Nutzerplätze</Th>
            <Th align="right">Raumfahrzeuge</Th>
            <Th>Signale</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.organizationId}
              style={{ borderTop: "1px solid var(--border-default)" }}
            >
              <Td>
                <span
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {row.name}
                </span>
              </Td>
              <Td>
                <PlanChip plan={row.plan} />
              </Td>
              <Td align="right">
                <HealthScore
                  score={row.score}
                  unknown={row.scoreUnknown}
                  risk={row.risk}
                />
              </Td>
              <Td align="right">
                <Utilisation used={row.seatsUsed} cap={row.seatCap} />
              </Td>
              <Td align="right">
                <Utilisation
                  used={row.spacecraftUsed}
                  cap={row.spacecraftCap}
                />
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {row.reasons.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                      style={{
                        color: "var(--accent-primary)",
                        background: "var(--accent-primary-soft)",
                      }}
                    >
                      {EXPANSION_REASON_LABEL[code]}
                    </span>
                  ))}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Portfolio — per-product status counts + plan mix.
 * ────────────────────────────────────────────────────────────────────────── */

function ProductStatusTable({ rows }: { rows: ProductStatusCounts[] }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          <Th>Produkt</Th>
          <Th align="right">Bezahlt</Th>
          <Th align="right">Testphase</Th>
          <Th align="right">Ausgelaufen</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.product}
            style={{ borderTop: "1px solid var(--border-default)" }}
          >
            <Td>
              <span
                className="font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {productLabel(row.product)}
              </span>
            </Td>
            <Td align="right">
              <Stat value={row.paid} tone="positive" />
            </Td>
            <Td align="right">
              <Stat value={row.trial} tone="default" />
            </Td>
            <Td align="right">
              <Stat
                value={row.churned}
                tone={row.churned > 0 ? "danger" : "muted"}
              />
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PlanMixList({ rows }: { rows: PlanMixEntry[] }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li key={row.plan}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span
              className="text-[12px] font-medium capitalize"
              style={{ color: "var(--text-primary)" }}
            >
              {row.plan.toLowerCase()}
            </span>
            <span
              className="flex-shrink-0 text-[12px] tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              {compactNumber(row.count)}
              <span style={{ color: "var(--text-tertiary)" }}>
                {" · "}
                {total > 0 ? pctLabel(row.count / total) : "0%"}
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
                width: `${total > 0 ? (row.count / total) * 100 : 0}%`,
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
 * Small shared cells / chips.
 * ────────────────────────────────────────────────────────────────────────── */

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className="pb-2 text-[10px] font-medium uppercase tracking-[0.06em]"
      style={{
        color: "var(--text-tertiary)",
        textAlign: align,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className="py-2.5 align-middle"
      style={{ textAlign: align, color: "var(--text-secondary)" }}
    >
      {children}
    </td>
  );
}

/** The derived health score, tinted by its risk band. An unknown score shows a
 * dash (no fabricated 0). */
function HealthScore({
  score,
  unknown,
  risk,
}: {
  score: number;
  unknown: boolean;
  risk: RiskLevel;
}) {
  if (unknown) {
    return (
      <span
        className="text-[13px] tabular-nums"
        style={{ color: "var(--text-tertiary)" }}
        title="Noch kein Gesundheitswert berechnet"
      >
        —
      </span>
    );
  }
  const color =
    risk === "critical" || risk === "high"
      ? "var(--accent-danger)"
      : risk === "medium"
        ? "#f59e0b"
        : "var(--accent-success)";
  return (
    <span
      className="text-[13px] font-semibold tabular-nums"
      style={{ color }}
      title={`Risiko: ${risk}`}
    >
      {compactNumber(score)}
    </span>
  );
}

/** A signed trend pill: ↑ improving (green) / ↓ declining (red) / flat stable. */
function TrendPill({ trend }: { trend: HealthTrend }) {
  const map: Record<
    HealthTrend,
    { color: string; bg: string; Icon: typeof Minus; label: string }
  > = {
    improving: {
      color: "var(--accent-success)",
      bg: "var(--accent-success-soft)",
      Icon: ArrowUpRight,
      label: "Verbessert sich",
    },
    declining: {
      color: "var(--accent-danger)",
      bg: "var(--accent-danger-soft)",
      Icon: ArrowDownRight,
      label: "Verschlechtert sich",
    },
    stable: {
      color: "var(--text-tertiary)",
      bg: "var(--separator-strong)",
      Icon: Minus,
      label: "Stabil",
    },
  };
  const { color, bg, Icon, label } = map[trend];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color, background: bg }}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

/** An at-risk reason chip (danger / warning tone). */
function ReasonChip({ code }: { code: RiskReasonCode }) {
  const { label, tone } = RISK_REASON_META[code];
  const color = tone === "danger" ? "var(--accent-danger)" : "#f59e0b";
  const bg =
    tone === "danger" ? "var(--accent-danger-soft)" : "rgba(245,158,11,0.12)";
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}

/** A plan chip (neutral). */
function PlanChip({ plan }: { plan: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize"
      style={{
        color: "var(--text-secondary)",
        background: "var(--separator-strong)",
      }}
    >
      {plan.toLowerCase()}
    </span>
  );
}

/** Recent vs prior activity, with a tiny directional caption. */
function ActivityDelta({ recent, prior }: { recent: number; prior: number }) {
  return (
    <span
      className="text-[12px] tabular-nums"
      style={{ color: "var(--text-secondary)" }}
    >
      {compactNumber(recent)}
      <span style={{ color: "var(--text-tertiary)" }}>
        {" "}
        vorher {compactNumber(prior)}
      </span>
    </span>
  );
}

/** Seats/spacecraft utilisation "used/cap (pct)"; an unlimited cap shows ∞. */
function Utilisation({ used, cap }: { used: number; cap: number | null }) {
  if (cap == null || cap <= 0) {
    return (
      <span
        className="text-[12px] tabular-nums"
        style={{ color: "var(--text-secondary)" }}
      >
        {compactNumber(used)}
        <span style={{ color: "var(--text-tertiary)" }}> / ∞</span>
      </span>
    );
  }
  const ratio = used / cap;
  const hot = ratio >= 0.8;
  return (
    <span
      className="text-[12px] font-medium tabular-nums"
      style={{ color: hot ? "var(--accent-primary)" : "var(--text-secondary)" }}
    >
      {compactNumber(used)}
      <span style={{ color: "var(--text-tertiary)" }}>
        {" / "}
        {compactNumber(cap)} · {pctLabel(ratio)}
      </span>
    </span>
  );
}

/** A bare stat number with a tone tint (used in the product-status table). */
function Stat({
  value,
  tone,
}: {
  value: number;
  tone: "positive" | "danger" | "default" | "muted";
}) {
  const color =
    tone === "positive"
      ? "var(--accent-success)"
      : tone === "danger"
        ? "var(--accent-danger)"
        : tone === "muted"
          ? "var(--text-tertiary)"
          : "var(--text-primary)";
  return (
    <span className="text-[13px] font-semibold tabular-nums" style={{ color }}>
      {compactNumber(value)}
    </span>
  );
}

/** A small count badge for a card header (danger/positive tone). */
function CountBadge({ n, tone }: { n: number; tone: "danger" | "positive" }) {
  const color =
    tone === "danger" ? "var(--accent-danger)" : "var(--accent-primary)";
  const bg =
    tone === "danger"
      ? "var(--accent-danger-soft)"
      : "var(--accent-primary-soft)";
  return (
    <span
      className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
      style={{ color, background: bg }}
    >
      {compactNumber(n)}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * States.
 * ────────────────────────────────────────────────────────────────────────── */

/** Erststart: echte Karten mit deutschen Titeln, Inhalte pulsieren dezent. */
function CustomersSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <CardSkeleton
        title="Abwanderungs-Risiko (Churn-Watchlist)"
        subtitle="Kunden mit Abwanderungs-Signalen — die dringendsten zuerst"
        rows={5}
      />
      <CardSkeleton
        title="Upsell-Kandidaten (Expansion)"
        subtitle="Gesunde Kunden nahe an einem Plan-Limit"
        rows={4}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <CardSkeleton title="Produkt-Status" rows={4} />
        <CardSkeleton title="Plan-Verteilung" rows={4} />
      </div>
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
        <HeartPulse size={20} style={{ color: "var(--text-secondary)" }} />
      </div>
      <p
        className="text-[14px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        Noch keine Kunden-Signale
      </p>
      <p
        className="max-w-sm text-[12px] leading-snug"
        style={{ color: "var(--text-secondary)" }}
      >
        Die Watchlist zeigt Abwanderungs-Risiken und Upsell-Kandidaten aus
        echten Daten zu Kundengesundheit, Abrechnung und Produkt-Aktivität.
        Sobald es aktive Kunden mit Abos und Nutzung gibt, erscheinen sie hier.
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
