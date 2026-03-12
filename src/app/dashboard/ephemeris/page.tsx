"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Loader2,
  RefreshCw,
  Satellite,
  Shield,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { GlassStagger, glassItemVariants } from "@/components/ui/GlassMotion";
import { csrfHeaders } from "@/lib/csrf-client";
import AlertsSidebar from "./components/alerts-sidebar";
import DependencyGraphView from "./components/dependency-graph-view";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FleetState {
  noradId: string;
  satelliteName: string;
  operatorType?: string;
  overallScore: number;
  dataFreshness: string;
  complianceHorizon: {
    daysUntilFirstBreach: number | null;
    firstBreachRegulation: string | null;
    confidence: string;
  };
  activeAlerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
  }>;
  modules?: Record<string, { score: number; status: string }>;
}

type TypeFilter = "ALL" | "SCO" | "LO";

interface FleetIntelligence {
  fleetScore: number;
  fleetSize: number;
  riskDistribution: Record<string, number>;
  riskDistributionPct: Record<string, number>;
  weakestLinks: Array<{
    noradId: string;
    name: string;
    score: number;
    fleetImpact: number;
    weakestModule: string | null;
    weakestModuleScore: number | null;
    riskCategory: string;
  }>;
  horizon: {
    earliestBreachSatellite: string | null;
    earliestBreachName: string | null;
    earliestBreachDays: number | null;
    earliestBreachRegulation: string | null;
    averageHorizonDays: number | null;
    satellitesWithHorizon: number;
  };
  trend: {
    direction: string;
    shortTermDelta: number;
    longTermDelta: number;
    trendStrength: string;
  } | null;
  moduleAverages: Record<string, number>;
  correlationMatrix: Array<{
    satA: string;
    satB: string;
    nameA: string;
    nameB: string;
    correlation: number;
    strength: string;
  }>;
}

interface BenchmarkData {
  overall: {
    meetsThreshold: boolean;
    averageScore: number | null;
    operatorCount: number;
  };
  operatorRanking: {
    score: number;
    percentile: number;
    rank: string;
    vsAverage: number;
  } | null;
}

// ─── Color Helpers (Tailwind class-based) ────────────────────────────────────

function riskColorClass(category: string): string {
  switch (category) {
    case "NOMINAL":
      return "text-emerald-400";
    case "WATCH":
      return "text-amber-400";
    case "WARNING":
      return "text-orange-400";
    case "CRITICAL":
      return "text-red-400";
    default:
      return "text-slate-500";
  }
}

function riskBgClass(category: string): string {
  switch (category) {
    case "NOMINAL":
      return "bg-emerald-500";
    case "WATCH":
      return "bg-amber-500";
    case "WARNING":
      return "bg-orange-500";
    case "CRITICAL":
      return "bg-red-500";
    default:
      return "bg-slate-500";
  }
}

function scoreColorClass(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-amber-400";
  if (score >= 50) return "text-orange-400";
  return "text-red-400";
}

function scoreRisk(score: number): string {
  if (score >= 85) return "NOMINAL";
  if (score >= 70) return "WATCH";
  if (score >= 50) return "WARNING";
  return "CRITICAL";
}

function trendArrow(delta: number): string {
  if (delta > 0.5) return "↑";
  if (delta < -0.5) return "↓";
  return "→";
}

function trendColorClass(delta: number): string {
  if (delta > 0.5) return "text-emerald-400";
  if (delta < -0.5) return "text-red-400";
  return "text-slate-500";
}

function severityColorClass(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "text-red-400";
    case "HIGH":
      return "text-orange-400";
    case "MEDIUM":
      return "text-amber-400";
    default:
      return "text-slate-500";
  }
}

function freshnessColorClass(freshness: string): string {
  switch (freshness) {
    case "LIVE":
      return "text-emerald-400";
    case "RECENT":
      return "text-slate-400";
    case "STALE":
      return "text-amber-400";
    default:
      return "text-red-400";
  }
}

function horizonColorClass(days: number | null): string {
  if (days === null) return "text-slate-500";
  if (days < 90) return "text-red-400";
  if (days < 365) return "text-amber-400";
  return "text-slate-200";
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortKey = "name" | "score" | "horizon" | "risk" | "alerts";
type SortDir = "asc" | "desc";

const TAB_ITEMS = [
  { key: "fleet" as const, label: "Fleet", icon: Satellite },
  { key: "alerts" as const, label: "Alerts", icon: AlertTriangle },
  { key: "intelligence" as const, label: "Intelligence", icon: BarChart3 },
  { key: "dependencies" as const, label: "Dependencies", icon: GitBranch },
] as const;

type TabKey = (typeof TAB_ITEMS)[number]["key"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EphemerisDashboard() {
  const [fleet, setFleet] = useState<FleetState[]>([]);
  const [intel, setIntel] = useState<FleetIntelligence | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("fleet");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [lastCalc, setLastCalc] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fleetRes = await fetch("/api/v1/ephemeris/fleet", {
        headers: csrfHeaders(),
      });

      if (fleetRes.ok) {
        const data = await fleetRes.json();
        setFleet(data.data ?? []);
      } else {
        const errBody = await fleetRes.json().catch(() => ({}));
        throw new Error(
          errBody.message || errBody.error || fleetRes.statusText,
        );
      }

      setLastCalc(new Date().toISOString());
      setLoading(false);

      const intelRes = await fetch(
        "/api/v1/ephemeris/fleet/intelligence?include_benchmark=true&lookback_days=90",
        { headers: csrfHeaders() },
      );

      if (intelRes.ok) {
        const data = await intelRes.json();
        setIntel(data.data ?? null);
        setBenchmark(data.benchmark ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ─── Derived Data ─────────────────────────────────────────────────────

  const totalAlerts = fleet.reduce(
    (s, f) => s + (f.activeAlerts?.length ?? 0),
    0,
  );
  const criticalAlerts = fleet.reduce(
    (s, f) =>
      s +
      (f.activeAlerts?.filter((a) => a.severity === "CRITICAL").length ?? 0),
    0,
  );

  const nominalCount = fleet.filter((f) => f.overallScore >= 85).length;
  const watchCount = fleet.filter(
    (f) => f.overallScore >= 70 && f.overallScore < 85,
  ).length;
  const warningCount = fleet.filter(
    (f) => f.overallScore >= 50 && f.overallScore < 70,
  ).length;
  const criticalCount = fleet.filter((f) => f.overallScore < 50).length;

  const fleetDelta = intel?.trend?.shortTermDelta ?? 0;

  // Filter + sort fleet
  const sortedFleet = useMemo(() => {
    const filtered =
      typeFilter === "ALL"
        ? [...fleet]
        : fleet.filter((f) => (f.operatorType ?? "SCO") === typeFilter);
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.satelliteName.localeCompare(b.satelliteName);
          break;
        case "score":
          cmp = a.overallScore - b.overallScore;
          break;
        case "horizon":
          cmp =
            (a.complianceHorizon.daysUntilFirstBreach ?? 99999) -
            (b.complianceHorizon.daysUntilFirstBreach ?? 99999);
          break;
        case "risk":
          cmp = a.overallScore - b.overallScore;
          break;
        case "alerts":
          cmp = (a.activeAlerts?.length ?? 0) - (b.activeAlerts?.length ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return filtered;
  }, [fleet, sortKey, sortDir, typeFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const weakestModule = (
    sat: FleetState,
  ): { name: string; score: number } | null => {
    if (!sat.modules) return null;
    let worst: { name: string; score: number } | null = null;
    for (const [name, mod] of Object.entries(sat.modules)) {
      if (!worst || mod.score < worst.score) worst = { name, score: mod.score };
    }
    return worst;
  };

  // Collect all alerts for sidebar
  const allAlerts = fleet.flatMap((f) =>
    (f.activeAlerts ?? []).map((a) => ({
      ...a,
      noradId: f.noradId,
      satelliteName: f.satelliteName,
    })),
  );

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="inline ml-0.5" />
    ) : (
      <ChevronDown size={12} className="inline ml-0.5" />
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 min-h-screen">
        {/* ── Page Content ─────────────────────────────────────────── */}
        <div className="p-6 space-y-6 max-w-[1600px]">
          {/* ── Header ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-start justify-between"
          >
            <div>
              <h1 className="text-display-sm font-bold text-white">
                Ephemeris
              </h1>
              <p className="text-body text-slate-400 mt-1">
                Fleet compliance forecasting & intelligence
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastCalc && (
                <span className="text-caption text-slate-500 font-mono">
                  {new Date(lastCalc).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZoneName: "short",
                  })}
                </span>
              )}
              <button
                onClick={loadAll}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg text-small text-slate-300 hover:bg-[var(--glass-bg-hover)] hover:border-[var(--glass-border-hover)] transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
                {loading ? "Calculating..." : "Recalculate"}
              </button>
            </div>
          </motion.div>

          {/* ── Metrics Strip ────────────────────────────────────── */}
          <GlassStagger>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {/* Fleet Score */}
              <motion.div variants={glassItemVariants}>
                <GlassCard hover className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-slate-400 uppercase tracking-wider">
                        Fleet Score
                      </p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span
                          className={`text-display-sm font-bold tabular-nums ${scoreColorClass(intel?.fleetScore ?? 0)}`}
                        >
                          {intel?.fleetScore ?? "—"}
                        </span>
                        {fleetDelta !== 0 && (
                          <span
                            className={`text-small font-mono ${trendColorClass(fleetDelta)}`}
                          >
                            {trendArrow(fleetDelta)} {fleetDelta > 0 ? "+" : ""}
                            {fleetDelta.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-caption text-slate-500 mt-0.5">
                        7d trend
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0 text-emerald-500">
                      <Shield size={20} strokeWidth={1.5} />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Fleet Horizon */}
              <motion.div variants={glassItemVariants}>
                <GlassCard hover className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-slate-400 uppercase tracking-wider">
                        Fleet Horizon
                      </p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span
                          className={`text-display-sm font-bold tabular-nums ${horizonColorClass(intel?.horizon.earliestBreachDays ?? null)}`}
                        >
                          {intel?.horizon.earliestBreachDays ?? "∞"}
                        </span>
                        <span className="text-small text-slate-400">days</span>
                      </div>
                      <p className="text-caption text-slate-500 mt-0.5">
                        first breach
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0 text-amber-500">
                      <Activity size={20} strokeWidth={1.5} />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Entities */}
              <motion.div variants={glassItemVariants}>
                <GlassCard hover className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-slate-400 uppercase tracking-wider">
                        Entities
                      </p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-display-sm font-bold text-white tabular-nums">
                          {nominalCount}/{fleet.length}
                        </span>
                        <span className="text-small text-emerald-400">
                          nominal
                        </span>
                      </div>
                      <p className="text-caption text-slate-500 mt-0.5">
                        {watchCount > 0 && (
                          <span className="text-amber-400">
                            {watchCount} watch{" "}
                          </span>
                        )}
                        {warningCount > 0 && (
                          <span className="text-orange-400">
                            {warningCount} warning{" "}
                          </span>
                        )}
                        {criticalCount > 0 && (
                          <span className="text-red-400">
                            {criticalCount} critical
                          </span>
                        )}
                        {watchCount === 0 &&
                          warningCount === 0 &&
                          criticalCount === 0 &&
                          "all clear"}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0 text-blue-500">
                      <Satellite size={20} strokeWidth={1.5} />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Active Alerts */}
              <motion.div variants={glassItemVariants}>
                <GlassCard hover className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-slate-400 uppercase tracking-wider">
                        Active Alerts
                      </p>
                      <p
                        className={`text-display-sm font-bold mt-1 tabular-nums ${
                          criticalAlerts > 0
                            ? "text-red-400"
                            : totalAlerts > 0
                              ? "text-amber-400"
                              : "text-white"
                        }`}
                      >
                        {totalAlerts}
                      </p>
                      <p className="text-caption text-slate-500 mt-0.5">
                        {criticalAlerts > 0 && (
                          <span className="text-red-400">
                            {criticalAlerts} critical
                          </span>
                        )}
                        {criticalAlerts === 0 &&
                          totalAlerts > 0 &&
                          "no critical"}
                        {totalAlerts === 0 && "none"}
                      </p>
                    </div>
                    <div
                      className={`ml-3 flex-shrink-0 ${criticalAlerts > 0 ? "text-red-500" : "text-slate-500"}`}
                    >
                      <AlertTriangle size={20} strokeWidth={1.5} />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </GlassStagger>

          {/* ── Tab Bar ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-1 border-b border-[var(--glass-border)]"
          >
            {TAB_ITEMS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-small font-medium transition-all duration-200 border-b-2 -mb-px ${
                  activeTab === key
                    ? "border-emerald-500 text-white"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon size={14} />
                {label}
                {key === "alerts" && totalAlerts > 0 && (
                  <span
                    className={`text-caption px-1.5 py-0.5 rounded-full ${
                      criticalAlerts > 0
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {totalAlerts}
                  </span>
                )}
              </button>
            ))}
          </motion.div>

          {/* ── Error Banner ─────────────────────────────────────── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle size={16} className="text-red-400" />
                  <p className="text-small text-red-400">{error}</p>
                </div>
                <button
                  onClick={loadAll}
                  className="text-small text-red-400 hover:text-red-300 transition-colors"
                >
                  Retry
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Tab Content ──────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {/* FLEET TAB */}
            {activeTab === "fleet" && (
              <motion.div
                key="fleet"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {loading && fleet.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2
                      size={24}
                      className="animate-spin text-slate-500"
                    />
                  </div>
                ) : fleet.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center mb-4">
                      <Satellite
                        size={28}
                        className="text-slate-500"
                        strokeWidth={1.5}
                      />
                    </div>
                    <h3 className="text-subtitle font-medium text-slate-300 mb-1">
                      No entities registered
                    </h3>
                    <p className="text-body text-slate-500">
                      Add spacecraft or launch vehicles to your organization.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Type filter bar */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-caption text-slate-500 uppercase tracking-wider">
                        Type
                      </span>
                      <select
                        value={typeFilter}
                        onChange={(e) =>
                          setTypeFilter(e.target.value as TypeFilter)
                        }
                        className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="ALL">All ({fleet.length})</option>
                        <option value="SCO">
                          SCO — Spacecraft (
                          {
                            fleet.filter(
                              (f) => (f.operatorType ?? "SCO") === "SCO",
                            ).length
                          }
                          )
                        </option>
                        <option value="LO">
                          LO — Launch Vehicle (
                          {fleet.filter((f) => f.operatorType === "LO").length})
                        </option>
                      </select>
                      {typeFilter !== "ALL" && (
                        <button
                          onClick={() => setTypeFilter("ALL")}
                          className="text-caption px-2 py-1 rounded border border-[var(--glass-border)] text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Fleet Table */}
                    <div className="glass-elevated rounded-[var(--radius-lg)] overflow-hidden border border-[var(--glass-border)]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-body">
                          <thead>
                            <tr className="border-b border-[var(--glass-border)]">
                              <th className="px-4 py-3 text-center text-caption text-slate-400 uppercase tracking-wider w-14">
                                Type
                              </th>
                              <th
                                className="px-4 py-3 text-left text-caption text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none w-20"
                                onClick={() => toggleSort("name")}
                              >
                                ID
                                <SortIcon field="name" />
                              </th>
                              <th
                                className="px-4 py-3 text-left text-caption text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none"
                                onClick={() => toggleSort("name")}
                              >
                                Name
                                <SortIcon field="name" />
                              </th>
                              <th
                                className="px-4 py-3 text-right text-caption text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none w-20"
                                onClick={() => toggleSort("score")}
                              >
                                Score
                                <SortIcon field="score" />
                              </th>
                              <th
                                className="px-4 py-3 text-right text-caption text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none w-24"
                                onClick={() => toggleSort("horizon")}
                              >
                                Horizon
                                <SortIcon field="horizon" />
                              </th>
                              <th
                                className="px-4 py-3 text-center text-caption text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none w-24"
                                onClick={() => toggleSort("risk")}
                              >
                                Risk
                                <SortIcon field="risk" />
                              </th>
                              <th className="px-4 py-3 text-left text-caption text-slate-400 uppercase tracking-wider">
                                Weakest Module
                              </th>
                              <th className="px-4 py-3 text-center text-caption text-slate-400 uppercase tracking-wider w-20">
                                Freshness
                              </th>
                              <th
                                className="px-4 py-3 text-center text-caption text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none w-16"
                                onClick={() => toggleSort("alerts")}
                              >
                                Alerts
                                <SortIcon field="alerts" />
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--glass-border)]">
                            {sortedFleet.map((sat) => {
                              const risk = scoreRisk(sat.overallScore);
                              const wm = weakestModule(sat);
                              return (
                                <tr
                                  key={sat.noradId}
                                  className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                                  onClick={() => {
                                    window.location.href = `/dashboard/ephemeris/${sat.noradId}`;
                                  }}
                                >
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-micro font-bold tracking-wider text-white ${
                                        sat.operatorType === "LO"
                                          ? "bg-amber-500"
                                          : "bg-blue-500"
                                      }`}
                                    >
                                      {sat.operatorType ?? "SCO"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-small text-slate-500 font-mono">
                                    {sat.noradId}
                                  </td>
                                  <td className="px-4 py-3 text-body font-medium text-slate-200">
                                    {sat.satelliteName}
                                  </td>
                                  <td
                                    className={`px-4 py-3 text-right font-semibold tabular-nums font-mono ${scoreColorClass(sat.overallScore)}`}
                                  >
                                    {sat.overallScore}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono">
                                    {sat.complianceHorizon
                                      .daysUntilFirstBreach !== null ? (
                                      <span
                                        className={horizonColorClass(
                                          sat.complianceHorizon
                                            .daysUntilFirstBreach,
                                        )}
                                      >
                                        {
                                          sat.complianceHorizon
                                            .daysUntilFirstBreach
                                        }
                                        d
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">∞</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`text-small ${riskColorClass(risk)}`}
                                    >
                                      <span className="mr-1">●</span>
                                      {risk.slice(0, 4)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-small">
                                    {wm ? (
                                      <span>
                                        <span className="text-slate-400">
                                          {wm.name}
                                        </span>
                                        <span
                                          className={`ml-1.5 ${scoreColorClass(wm.score)}`}
                                        >
                                          ({wm.score})
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`text-caption ${freshnessColorClass(sat.dataFreshness)}`}
                                    >
                                      <span className="mr-1">●</span>
                                      {sat.dataFreshness}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {(sat.activeAlerts?.length ?? 0) > 0 ? (
                                      <span
                                        className={
                                          sat.activeAlerts?.some(
                                            (a) => a.severity === "CRITICAL",
                                          )
                                            ? "text-red-400 font-semibold"
                                            : "text-amber-400"
                                        }
                                      >
                                        {sat.activeAlerts.length}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-4 py-2.5 border-t border-[var(--glass-border)]">
                        <span className="text-caption text-slate-500">
                          Showing {sortedFleet.length} of {fleet.length}{" "}
                          entities
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ALERTS TAB */}
            {activeTab === "alerts" && (
              <motion.div
                key="alerts"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {(() => {
                  const sortedAlerts = fleet
                    .flatMap((s) =>
                      (s.activeAlerts ?? []).map((a) => ({
                        ...a,
                        noradId: s.noradId,
                        satelliteName: s.satelliteName,
                      })),
                    )
                    .sort((a, b) => {
                      const order: Record<string, number> = {
                        CRITICAL: 0,
                        HIGH: 1,
                        MEDIUM: 2,
                        LOW: 3,
                        ANOMALY: 1,
                      };
                      return (
                        (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
                      );
                    });

                  if (sortedAlerts.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-16 h-16 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                          <Shield
                            size={28}
                            className="text-emerald-400"
                            strokeWidth={1.5}
                          />
                        </div>
                        <h3 className="text-subtitle font-medium text-slate-300 mb-1">
                          No active alerts
                        </h3>
                        <p className="text-body text-slate-500">
                          All systems nominal.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="glass-elevated rounded-[var(--radius-lg)] overflow-hidden border border-[var(--glass-border)]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-body">
                          <thead>
                            <tr className="border-b border-[var(--glass-border)]">
                              <th className="px-4 py-3 text-left text-caption text-slate-400 uppercase tracking-wider w-24">
                                Severity
                              </th>
                              <th className="px-4 py-3 text-left text-caption text-slate-400 uppercase tracking-wider w-32">
                                Entity
                              </th>
                              <th className="px-4 py-3 text-left text-caption text-slate-400 uppercase tracking-wider">
                                Title
                              </th>
                              <th className="px-4 py-3 text-left text-caption text-slate-400 uppercase tracking-wider">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--glass-border)]">
                            {sortedAlerts.map((alert, i) => (
                              <tr
                                key={`${alert.noradId}-${alert.id ?? i}`}
                                className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                                onClick={() => {
                                  window.location.href = `/dashboard/ephemeris/${alert.noradId}`;
                                }}
                              >
                                <td className="px-4 py-3">
                                  <span
                                    className={`text-small font-semibold ${severityColorClass(alert.severity)}`}
                                  >
                                    <span className="mr-1">●</span>
                                    {alert.severity}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-small text-slate-300">
                                  {alert.satelliteName}
                                </td>
                                <td className="px-4 py-3 text-body text-slate-200">
                                  {alert.title}
                                </td>
                                <td className="px-4 py-3 text-small text-slate-400 max-w-[400px] truncate">
                                  {alert.description}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* INTELLIGENCE TAB */}
            {activeTab === "intelligence" && (
              <motion.div
                key="intelligence"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 gap-4 lg:grid-cols-2"
              >
                {/* Panel 1: Risk Distribution */}
                <GlassCard hover={false} className="p-5">
                  <h3 className="text-title font-semibold text-slate-200 mb-1">
                    Risk Distribution
                  </h3>
                  <p className="text-small text-slate-400 mb-4">
                    Fleet entities by risk category
                  </p>
                  <div className="space-y-2.5">
                    {(["NOMINAL", "WATCH", "WARNING", "CRITICAL"] as const).map(
                      (cat) => {
                        const count =
                          cat === "NOMINAL"
                            ? nominalCount
                            : cat === "WATCH"
                              ? watchCount
                              : cat === "WARNING"
                                ? warningCount
                                : criticalCount;
                        const pct =
                          fleet.length > 0 ? (count / fleet.length) * 100 : 0;
                        return (
                          <div key={cat} className="flex items-center gap-3">
                            <span className="text-caption text-slate-500 w-16 uppercase tracking-wider">
                              {cat}
                            </span>
                            <div className="flex-1 h-2 bg-navy-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${riskBgClass(cat)}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-small text-slate-300 w-16 text-right tabular-nums font-mono">
                              {count} ({pct.toFixed(0)}%)
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </GlassCard>

                {/* Panel 2: Weakest Links */}
                <GlassCard hover={false} className="p-5">
                  <h3 className="text-title font-semibold text-slate-200 mb-1">
                    Weakest Links
                  </h3>
                  <p className="text-small text-slate-400 mb-4">
                    Entities with highest fleet impact potential
                  </p>
                  {(intel?.weakestLinks ?? []).length > 0 ? (
                    <div className="space-y-0 divide-y divide-[var(--glass-border)]">
                      {(intel?.weakestLinks ?? []).map((link, i) => (
                        <Link
                          key={link.noradId}
                          href={`/dashboard/ephemeris/${link.noradId}`}
                          className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02] transition-colors -mx-2 px-2 rounded"
                        >
                          <span className="text-small text-slate-500 w-5 tabular-nums">
                            {i + 1}.
                          </span>
                          <span className="text-body text-slate-200 flex-1 truncate">
                            {link.name}
                          </span>
                          <span
                            className={`text-body font-semibold tabular-nums font-mono ${scoreColorClass(link.score)}`}
                          >
                            {link.score}
                          </span>
                          <span className="text-caption text-emerald-400 font-mono">
                            +{link.fleetImpact.toFixed(1)}pts
                          </span>
                          {link.weakestModule && (
                            <span className="text-caption text-slate-500">
                              {link.weakestModule} ({link.weakestModuleScore})
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-small text-slate-500">No data yet</p>
                  )}
                </GlassCard>

                {/* Panel 3: Fleet Trend */}
                <GlassCard hover={false} className="p-5">
                  <h3 className="text-title font-semibold text-slate-200 mb-1">
                    Fleet Trend
                  </h3>
                  <p className="text-small text-slate-400 mb-4">
                    Score trajectory over time
                  </p>
                  {intel?.trend ? (
                    <div>
                      <div className="flex items-baseline gap-3 mb-4">
                        <span
                          className={`text-heading-lg font-bold ${trendColorClass(intel.trend.longTermDelta)}`}
                        >
                          {trendArrow(intel.trend.longTermDelta)}{" "}
                          {intel.trend.direction}
                        </span>
                        <span className="text-caption text-slate-500 uppercase tracking-wider">
                          {intel.trend.trendStrength}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-caption text-slate-500 mb-1">
                            7d Delta
                          </p>
                          <p
                            className={`text-heading font-semibold tabular-nums font-mono ${trendColorClass(intel.trend.shortTermDelta)}`}
                          >
                            {intel.trend.shortTermDelta > 0 ? "+" : ""}
                            {intel.trend.shortTermDelta}
                          </p>
                        </div>
                        <div>
                          <p className="text-caption text-slate-500 mb-1">
                            30d Delta
                          </p>
                          <p
                            className={`text-heading font-semibold tabular-nums font-mono ${trendColorClass(intel.trend.longTermDelta)}`}
                          >
                            {intel.trend.longTermDelta > 0 ? "+" : ""}
                            {intel.trend.longTermDelta}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-small text-slate-500">
                      Insufficient history data
                    </p>
                  )}
                </GlassCard>

                {/* Panel 4: Industry Benchmark */}
                <GlassCard hover={false} className="p-5">
                  <h3 className="text-title font-semibold text-slate-200 mb-1">
                    Industry Benchmark
                  </h3>
                  <p className="text-small text-slate-400 mb-4">
                    Your fleet vs. industry peers
                  </p>
                  {benchmark?.operatorRanking ? (
                    <div className="space-y-3">
                      {[
                        {
                          label: "Your Fleet Score",
                          value: benchmark.operatorRanking.score,
                          cls: "text-slate-200 font-semibold",
                        },
                        {
                          label: "Industry Average",
                          value: benchmark.overall.averageScore,
                          cls: "text-slate-400",
                        },
                        {
                          label: "Percentile",
                          value: benchmark.operatorRanking.rank,
                          cls: "text-blue-400 font-semibold",
                        },
                        {
                          label: "vs Average",
                          value: `${benchmark.operatorRanking.vsAverage > 0 ? "+" : ""}${benchmark.operatorRanking.vsAverage}`,
                          cls:
                            trendColorClass(
                              benchmark.operatorRanking.vsAverage,
                            ) + " font-semibold",
                        },
                      ].map(({ label, value, cls }) => (
                        <div
                          key={label}
                          className="flex items-center justify-between"
                        >
                          <span className="text-small text-slate-400">
                            {label}
                          </span>
                          <span
                            className={`text-body tabular-nums font-mono ${cls}`}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                      <div className="mt-4 pt-3 border-t border-[var(--glass-border)]">
                        <span className="text-caption text-slate-500">
                          Compared to {benchmark.overall.operatorCount}{" "}
                          operators
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-small text-slate-500">
                      Benchmark available when 5+ operators are in the system.
                    </p>
                  )}
                </GlassCard>
              </motion.div>
            )}

            {/* DEPENDENCIES TAB */}
            {activeTab === "dependencies" && (
              <motion.div
                key="dependencies"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <DependencyGraphView />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Alerts Sidebar ──────────────────────────────────────── */}
      <AlertsSidebar alerts={allAlerts} />
    </div>
  );
}
