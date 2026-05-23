/**
 * Caelex Trade — Welcome dashboard KPI cards row.
 *
 * Renders the four headline KPI cards atop the /trade welcome page:
 *
 *   1. Active Operations   — count + trend arrow vs prior 30 days
 *   2. Open Licenses       — count + "expiring soon" badge
 *   3. Pending Reviews     — counterparties + classification drafts
 *   4. Compliance Score    — 0-100 health score
 *
 * Each card is wrapped in a Link to its respective detail page.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import {
  Workflow,
  FileCheck,
  ScanSearch,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  type LucideIcon,
} from "lucide-react";
import type { WelcomeKpiSummary } from "@/lib/trade/welcome-feed/kpi-aggregator";

interface KpiCardsRowProps {
  kpis: WelcomeKpiSummary;
}

export function KpiCardsRow({ kpis }: KpiCardsRowProps) {
  return (
    <section className="mb-8" data-testid="kpi-cards-row">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-trade-text-primary">
          Key indicators
        </h2>
        <p className="text-[12px] text-trade-text-muted">
          Snapshot of the last 30 days.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Operations */}
        <KpiCard
          icon={Workflow}
          label="Active Operations"
          href="/trade/operations"
          value={kpis.operations.activeCount}
          subtext={`${kpis.operations.createdLast30Days} created last 30d`}
          trend={kpis.operations.trend}
          trendPercent={kpis.operations.trendPercent}
        />

        {/* Open Licenses */}
        <KpiCard
          icon={FileCheck}
          label="Open Licenses"
          href="/trade/licenses"
          value={kpis.licenses.openCount}
          subtext={kpis.licenses.expiringSoon > 0 ? null : "BAFA · BIS · DDTC"}
          badge={
            kpis.licenses.expiringSoon > 0
              ? {
                  text: `${kpis.licenses.expiringSoon} expiring ≤30d`,
                  tone: "warn",
                }
              : undefined
          }
        />

        {/* Pending Reviews */}
        <KpiCard
          icon={ScanSearch}
          label="Pending Reviews"
          href="/trade/parties"
          value={kpis.reviews.total}
          subtext={`${kpis.reviews.partiesPending} parties · ${kpis.reviews.classificationsPending} drafts`}
          badge={
            kpis.reviews.total > 0
              ? { text: "Awaiting review", tone: "warn" }
              : { text: "All clear", tone: "ok" }
          }
        />

        {/* Compliance Score */}
        <KpiCard
          icon={ShieldCheck}
          label="Compliance Score"
          href="/dashboard"
          value={kpis.compliance.score}
          suffix="/100"
          subtext={
            kpis.compliance.actionItemCount === 0
              ? "Nothing on fire"
              : `${kpis.compliance.actionItemCount} action item${kpis.compliance.actionItemCount === 1 ? "" : "s"}`
          }
          accent={scoreAccent(kpis.compliance.score)}
        />
      </div>
    </section>
  );
}

// ─── Card primitive ─────────────────────────────────────────────────

type Tone = "ok" | "warn" | "danger" | "muted";

interface KpiBadge {
  text: string;
  tone: Tone;
}

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  href: string;
  value: number;
  /** Optional suffix appended to the value (e.g. "/100"). */
  suffix?: string;
  /** Optional one-line subtext below the value. */
  subtext?: string | null;
  /** Optional small badge in the top-right. */
  badge?: KpiBadge;
  /** Trend arrow direction (Operations card only). */
  trend?: "up" | "down" | "flat";
  trendPercent?: number | null;
  /** Optional left-border accent colour (Compliance Score card). */
  accent?: "emerald" | "amber" | "red";
}

function KpiCard({
  icon: Icon,
  label,
  href,
  value,
  suffix,
  subtext,
  badge,
  trend,
  trendPercent,
  accent,
}: KpiCardProps) {
  const accentClass = accent
    ? {
        emerald: "border-l-4 border-l-emerald-500",
        amber: "border-l-4 border-l-amber-500",
        red: "border-l-4 border-l-red-500",
      }[accent]
    : "";

  return (
    <Link
      href={href}
      className={`group block rounded-md border border-trade-border-subtle bg-trade-bg-panel p-4 transition hover:border-trade-accent hover:bg-trade-bg-elevated ${accentClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-trade-text-muted">
          <Icon size={14} />
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            {label}
          </span>
        </div>
        {badge && <Badge tone={badge.tone}>{badge.text}</Badge>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[28px] font-bold leading-none tabular-nums text-trade-text-primary">
          {value}
        </span>
        {suffix && (
          <span className="text-[14px] font-medium text-trade-text-muted">
            {suffix}
          </span>
        )}
        {trend && <TrendArrow trend={trend} percent={trendPercent ?? null} />}
      </div>

      {subtext && (
        <p className="mt-2 text-[11px] text-trade-text-muted">{subtext}</p>
      )}

      <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-trade-text-secondary transition group-hover:text-trade-accent-strong">
        View details
        <ArrowRight
          size={11}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

// ─── Badge ──────────────────────────────────────────────────────────

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const toneClass = {
    ok: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    muted: "bg-trade-bg-subtle text-trade-text-secondary",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${toneClass}`}
    >
      {children}
    </span>
  );
}

// ─── Trend arrow ────────────────────────────────────────────────────

function TrendArrow({
  trend,
  percent,
}: {
  trend: "up" | "down" | "flat";
  percent: number | null;
}) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-emerald-600">
        <ArrowUpRight size={14} />
        {percent === null ? "new" : `${percent > 0 ? "+" : ""}${percent}%`}
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-red-600">
        <ArrowDownRight size={14} />
        {percent === null ? "—" : `${percent}%`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-trade-text-muted">
      <Minus size={14} />
      flat
    </span>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function scoreAccent(score: number): "emerald" | "amber" | "red" {
  if (score >= 80) return "emerald";
  if (score >= 50) return "amber";
  return "red";
}
