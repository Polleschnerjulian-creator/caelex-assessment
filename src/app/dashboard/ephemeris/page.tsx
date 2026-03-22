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
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import Card, { CardContent } from "@/components/ui/Card";
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

// ─── Color Helpers ────────────────────────────────────────────────────────────

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

function riskBadgeClass(category: string): string {
  switch (category) {
    case "NOMINAL":
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25";
    case "WATCH":
      return "bg-amber-500/15 text-amber-400 border border-amber-500/25";
    case "WARNING":
      return "bg-orange-500/15 text-orange-400 border border-orange-500/25";
    case "CRITICAL":
      return "bg-red-500/15 text-red-400 border border-red-500/25";
    default:
      return "bg-slate-500/15 text-slate-400 border border-slate-500/25";
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
  return "text-[var(--text-tertiary)]";
}

function severityBadgeClass(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-500/15 text-red-400 border border-red-500/25";
    case "HIGH":
      return "bg-orange-500/15 text-orange-400 border border-orange-500/25";
    case "MEDIUM":
      return "bg-amber-500/15 text-amber-400 border border-amber-500/25";
    default:
      return "bg-slate-500/15 text-slate-400 border border-slate-500/25";
  }
}

function freshnessColorClass(freshness: string): string {
  switch (freshness) {
    case "LIVE":
      return "text-emerald-400";
    case "RECENT":
      return "text-[var(--text-tertiary)]";
    case "STALE":
      return "text-amber-400";
    default:
      return "text-red-400";
  }
}

function horizonColorClass(days: number | null): string {
  if (days === null) return "text-[var(--text-tertiary)]";
  if (days < 90) return "text-red-400";
  if (days < 365) return "text-amber-400";
  return "text-[var(--text-primary)]";
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

  // ─── Derived Data ──────────────────────────────────────────────────────

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
  const highAlerts = fleet.reduce(
    (s, f) =>
      s + (f.activeAlerts?.filter((a) => a.severity === "HIGH").length ?? 0),
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
    if (sortKey !== field)
      return <span className="inline-block w-3 ml-0.5 opacity-0">↑</span>;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="inline ml-0.5 opacity-70" />
    ) : (
      <ChevronDown size={12} className="inline ml-0.5 opacity-70" />
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 min-h-screen">
        <div className="p-6 space-y-6 max-w-[1600px]">
          {/* ── Header ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-start justify-between"
          >
            <div>
              <h1 className="text-display-sm font-semibold text-[var(--text-primary)]">
                Ephemeris
              </h1>
              <p className="text-body text-[var(--text-secondary)] mt-0.5">
                Fleet compliance forecasting &amp; intelligence
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastCalc && (
                <span className="text-caption text-[var(--text-tertiary)]">
                  Updated{" "}
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--fill-light)] transition-colors disabled:opacity-40"
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
                {loading ? "Calculating..." : "Recalculate"}
              </button>
            </div>
          </motion.div>

          {/* ── Stats Grid ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {/* Fleet Score */}
            <Card variant="elevated">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-caption text-[var(--text-tertiary)] uppercase tracking-wider">
                      Fleet Score
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <p
                        className={`text-title font-semibold tabular-nums ${scoreColorClass(intel?.fleetScore ?? 0)}`}
                      >
                        {intel?.fleetScore ?? "—"}
                      </p>
                      {fleetDelta !== 0 && (
                        <span
                          className={`text-caption font-mono ${trendColorClass(fleetDelta)}`}
                        >
                          {fleetDelta > 0.5 ? (
                            <TrendingUp className="inline w-3 h-3 mr-0.5" />
                          ) : fleetDelta < -0.5 ? (
                            <TrendingDown className="inline w-3 h-3 mr-0.5" />
                          ) : (
                            <Minus className="inline w-3 h-3 mr-0.5" />
                          )}
                          {fleetDelta > 0 ? "+" : ""}
                          {fleetDelta.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-micro text-[var(--text-tertiary)] mt-0.5 uppercase tracking-wider">
                      7d trend
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Horizon */}
            <Card variant="elevated">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500 shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-caption text-[var(--text-tertiary)] uppercase tracking-wider">
                      Compliance Horizon
                    </p>
                    <div className="flex items-baseline gap-1">
                      <p
                        className={`text-title font-semibold tabular-nums ${horizonColorClass(intel?.horizon.earliestBreachDays ?? null)}`}
                      >
                        {intel?.horizon.earliestBreachDays ?? "—"}
                      </p>
                      {intel?.horizon.earliestBreachDays !== null &&
                        intel?.horizon.earliestBreachDays !== undefined && (
                          <span className="text-caption text-[var(--text-tertiary)]">
                            days
                          </span>
                        )}
                    </div>
                    <p className="text-micro text-[var(--text-tertiary)] mt-0.5 truncate">
                      {intel?.horizon.earliestBreachName ?? "first breach"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fleet Size */}
            <Card variant="elevated">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500 shrink-0">
                    <Satellite className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-caption text-[var(--text-tertiary)] uppercase tracking-wider">
                      Fleet Size
                    </p>
                    <p className="text-title font-semibold text-[var(--text-primary)] tabular-nums">
                      {fleet.length}
                      {nominalCount > 0 && (
                        <span className="text-caption font-normal text-[var(--text-tertiary)] ml-1">
                          / {nominalCount} nominal
                        </span>
                      )}
                    </p>
                    <p className="text-micro text-[var(--text-tertiary)] mt-0.5 uppercase tracking-wider">
                      {criticalCount > 0 ? (
                        <span className="text-red-400">
                          {criticalCount} critical
                        </span>
                      ) : watchCount > 0 ? (
                        <span className="text-amber-400">
                          {watchCount} watch
                        </span>
                      ) : (
                        "all nominal"
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Alerts */}
            <Card variant="elevated">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      criticalAlerts > 0
                        ? "bg-red-500/10 text-red-500"
                        : totalAlerts > 0
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-slate-500/10 text-slate-400"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-caption text-[var(--text-tertiary)] uppercase tracking-wider">
                      Active Alerts
                    </p>
                    <p
                      className={`text-title font-semibold tabular-nums ${
                        criticalAlerts > 0
                          ? "text-red-400"
                          : totalAlerts > 0
                            ? "text-amber-400"
                            : "text-[var(--text-primary)]"
                      }`}
                    >
                      {totalAlerts}
                    </p>
                    <p className="text-micro text-[var(--text-tertiary)] mt-0.5 uppercase tracking-wider">
                      {criticalAlerts > 0 ? (
                        <span className="text-red-400">
                          {criticalAlerts} critical
                        </span>
                      ) : highAlerts > 0 ? (
                        <span className="text-orange-400">
                          {highAlerts} high
                        </span>
                      ) : totalAlerts > 0 ? (
                        "no critical"
                      ) : (
                        "none"
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Tab Bar ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex gap-1 p-1 rounded-lg glass-surface"
          >
            {TAB_ITEMS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-body font-medium transition-all duration-200 ${
                  activeTab === key
                    ? "glass-elevated text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--fill-light)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {key === "alerts" && totalAlerts > 0 && (
                  <span
                    className={`text-micro px-1.5 py-0.5 rounded-full font-medium ${
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

          {/* ── Error Banner ─────────────────────────────────────────── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  <p className="text-body text-red-400">{error}</p>
                </div>
                <button
                  onClick={loadAll}
                  className="text-body text-red-400 hover:text-red-300 transition-colors ml-4 shrink-0"
                >
                  Retry
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Tab Content ──────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {/* ── FLEET TAB ────────────────────────────────────────── */}
            {activeTab === "fleet" && (
              <motion.div
                key="fleet"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {loading && fleet.length === 0 ? (
                  <div className="flex items-center justify-center py-24">
                    <Loader2
                      size={22}
                      className="animate-spin text-[var(--text-tertiary)]"
                    />
                  </div>
                ) : fleet.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--fill-light)] flex items-center justify-center mb-4">
                      <Satellite
                        size={24}
                        className="text-[var(--text-tertiary)]"
                        strokeWidth={1.5}
                      />
                    </div>
                    <h3 className="text-title font-medium text-[var(--text-primary)] mb-1">
                      No entities registered
                    </h3>
                    <p className="text-body text-[var(--text-secondary)]">
                      Add spacecraft or launch vehicles to your organization.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Type filter */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-caption text-[var(--text-tertiary)] uppercase tracking-wider">
                        Type
                      </span>
                      <select
                        value={typeFilter}
                        onChange={(e) =>
                          setTypeFilter(e.target.value as TypeFilter)
                        }
                        className="glass-surface border border-[var(--glass-border-subtle)] rounded-lg px-3 py-1.5 text-body text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 transition-colors"
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
                          className="text-caption px-2.5 py-1 rounded-md border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--fill-light)] transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Fleet Table */}
                    <Card variant="elevated" padding="none">
                      <div className="overflow-x-auto">
                        <table className="w-full text-body">
                          <thead>
                            <tr className="border-b border-[var(--border-subtle)]">
                              <th className="px-4 py-3 text-center text-caption text-[var(--text-tertiary)] uppercase tracking-wider w-14">
                                Type
                              </th>
                              <th
                                className="px-4 py-3 text-left text-caption text-[var(--text-tertiary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none w-24"
                                onClick={() => toggleSort("name")}
                              >
                                NORAD
                                <SortIcon field="name" />
                              </th>
                              <th
                                className="px-4 py-3 text-left text-caption text-[var(--text-tertiary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
                                onClick={() => toggleSort("name")}
                              >
                                Name
                                <SortIcon field="name" />
                              </th>
                              <th
                                className="px-4 py-3 text-right text-caption text-[var(--text-tertiary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none w-20"
                                onClick={() => toggleSort("score")}
                              >
                                Score
                                <SortIcon field="score" />
                              </th>
                              <th
                                className="px-4 py-3 text-right text-caption text-[var(--text-tertiary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none w-28"
                                onClick={() => toggleSort("horizon")}
                              >
                                Horizon
                                <SortIcon field="horizon" />
                              </th>
                              <th
                                className="px-4 py-3 text-center text-caption text-[var(--text-tertiary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none w-28"
                                onClick={() => toggleSort("risk")}
                              >
                                Risk
                                <SortIcon field="risk" />
                              </th>
                              <th className="px-4 py-3 text-left text-caption text-[var(--text-tertiary)] uppercase tracking-wider">
                                Weakest Module
                              </th>
                              <th className="px-4 py-3 text-center text-caption text-[var(--text-tertiary)] uppercase tracking-wider w-24">
                                Freshness
                              </th>
                              <th
                                className="px-4 py-3 text-center text-caption text-[var(--text-tertiary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none w-20"
                                onClick={() => toggleSort("alerts")}
                              >
                                Alerts
                                <SortIcon field="alerts" />
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)]">
                            {sortedFleet.map((sat) => {
                              const risk = scoreRisk(sat.overallScore);
                              const wm = weakestModule(sat);
                              return (
                                <tr
                                  key={sat.noradId}
                                  className="cursor-pointer hover:bg-[var(--fill-light)] transition-colors"
                                  onClick={() => {
                                    window.location.href = `/dashboard/ephemeris/${sat.noradId}`;
                                  }}
                                >
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-micro font-bold tracking-wider text-white ${
                                        sat.operatorType === "LO"
                                          ? "bg-amber-500"
                                          : "bg-blue-500"
                                      }`}
                                    >
                                      {sat.operatorType ?? "SCO"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-caption text-[var(--text-tertiary)] font-mono">
                                    {sat.noradId}
                                  </td>
                                  <td className="px-4 py-3 text-body font-medium text-[var(--text-primary)]">
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
                                      <span className="text-[var(--text-tertiary)]">
                                        —
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-micro font-medium ${riskBadgeClass(risk)}`}
                                    >
                                      {risk}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-caption">
                                    {wm ? (
                                      <span>
                                        <span className="text-[var(--text-secondary)]">
                                          {wm.name}
                                        </span>
                                        <span
                                          className={`ml-1.5 font-mono ${scoreColorClass(wm.score)}`}
                                        >
                                          {wm.score}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-[var(--text-tertiary)]">
                                        —
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`text-caption flex items-center justify-center gap-1 ${freshnessColorClass(sat.dataFreshness)}`}
                                    >
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
                                      {sat.dataFreshness}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {(sat.activeAlerts?.length ?? 0) > 0 ? (
                                      <span
                                        className={`font-semibold tabular-nums ${
                                          sat.activeAlerts?.some(
                                            (a) => a.severity === "CRITICAL",
                                          )
                                            ? "text-red-400"
                                            : "text-amber-400"
                                        }`}
                                      >
                                        {sat.activeAlerts.length}
                                      </span>
                                    ) : (
                                      <span className="text-[var(--text-tertiary)]">
                                        —
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
                        <span className="text-caption text-[var(--text-tertiary)]">
                          Showing {sortedFleet.length} of {fleet.length}{" "}
                          entities
                        </span>
                      </div>
                    </Card>
                  </>
                )}
              </motion.div>
            )}

            {/* ── ALERTS TAB ───────────────────────────────────────── */}
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
                      <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                          <Shield
                            size={24}
                            className="text-emerald-400"
                            strokeWidth={1.5}
                          />
                        </div>
                        <h3 className="text-title font-medium text-[var(--text-primary)] mb-1">
                          No active alerts
                        </h3>
                        <p className="text-body text-[var(--text-secondary)]">
                          All systems nominal.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <Card variant="elevated" padding="none">
                      <div className="overflow-x-auto">
                        <table className="w-full text-body">
                          <thead>
                            <tr className="border-b border-[var(--border-subtle)]">
                              <th className="px-4 py-3 text-left text-caption text-[var(--text-tertiary)] uppercase tracking-wider w-28">
                                Severity
                              </th>
                              <th className="px-4 py-3 text-left text-caption text-[var(--text-tertiary)] uppercase tracking-wider w-36">
                                Entity
                              </th>
                              <th className="px-4 py-3 text-left text-caption text-[var(--text-tertiary)] uppercase tracking-wider">
                                Title
                              </th>
                              <th className="px-4 py-3 text-left text-caption text-[var(--text-tertiary)] uppercase tracking-wider">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)]">
                            {sortedAlerts.map((alert, i) => (
                              <tr
                                key={`${alert.noradId}-${alert.id ?? i}`}
                                className="cursor-pointer hover:bg-[var(--fill-light)] transition-colors"
                                onClick={() => {
                                  window.location.href = `/dashboard/ephemeris/${alert.noradId}`;
                                }}
                              >
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-micro font-medium ${severityBadgeClass(alert.severity)}`}
                                  >
                                    {alert.severity}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-body text-[var(--text-secondary)]">
                                  {alert.satelliteName}
                                </td>
                                <td className="px-4 py-3 text-body text-[var(--text-primary)]">
                                  {alert.title}
                                </td>
                                <td className="px-4 py-3 text-caption text-[var(--text-secondary)] max-w-[400px] truncate">
                                  {alert.description}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  );
                })()}
              </motion.div>
            )}

            {/* ── INTELLIGENCE TAB ─────────────────────────────────── */}
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
                <Card variant="elevated">
                  <div className="mb-4">
                    <h3 className="text-title font-semibold text-[var(--text-primary)]">
                      Risk Distribution
                    </h3>
                    <p className="text-caption text-[var(--text-secondary)] mt-0.5">
                      Fleet entities by risk category
                    </p>
                  </div>
                  <div className="space-y-3">
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
                            <span
                              className={`text-micro uppercase tracking-wider w-16 font-medium ${riskColorClass(cat)}`}
                            >
                              {cat}
                            </span>
                            <div className="flex-1 h-1.5 bg-[var(--fill-light)] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${riskBgClass(cat)}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-caption text-[var(--text-secondary)] w-20 text-right tabular-nums font-mono">
                              {count}{" "}
                              <span className="text-[var(--text-tertiary)]">
                                ({pct.toFixed(0)}%)
                              </span>
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </Card>

                {/* Panel 2: Weakest Links */}
                <Card variant="elevated">
                  <div className="mb-4">
                    <h3 className="text-title font-semibold text-[var(--text-primary)]">
                      Weakest Links
                    </h3>
                    <p className="text-caption text-[var(--text-secondary)] mt-0.5">
                      Entities with highest fleet impact potential
                    </p>
                  </div>
                  {(intel?.weakestLinks ?? []).length > 0 ? (
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {(intel?.weakestLinks ?? []).map((link, i) => (
                        <Link
                          key={link.noradId}
                          href={`/dashboard/ephemeris/${link.noradId}`}
                          className="flex items-center gap-3 py-2.5 hover:bg-[var(--fill-light)] transition-colors -mx-2 px-2 rounded-lg"
                        >
                          <span className="text-caption text-[var(--text-tertiary)] w-5 tabular-nums">
                            {i + 1}.
                          </span>
                          <span className="text-body text-[var(--text-primary)] flex-1 truncate">
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
                            <span className="text-caption text-[var(--text-tertiary)]">
                              {link.weakestModule} ({link.weakestModuleScore})
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-body text-[var(--text-tertiary)]">
                      No data yet
                    </p>
                  )}
                </Card>

                {/* Panel 3: Fleet Trend */}
                <Card variant="elevated">
                  <div className="mb-4">
                    <h3 className="text-title font-semibold text-[var(--text-primary)]">
                      Fleet Trend
                    </h3>
                    <p className="text-caption text-[var(--text-secondary)] mt-0.5">
                      Score trajectory over time
                    </p>
                  </div>
                  {intel?.trend ? (
                    <div>
                      <div className="flex items-baseline gap-3 mb-5">
                        <span
                          className={`text-display-sm font-bold ${trendColorClass(intel.trend.longTermDelta)}`}
                        >
                          {trendArrow(intel.trend.longTermDelta)}{" "}
                          {intel.trend.direction}
                        </span>
                        <span className="text-caption text-[var(--text-tertiary)] uppercase tracking-wider">
                          {intel.trend.trendStrength}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg glass-surface">
                          <p className="text-caption text-[var(--text-tertiary)] mb-1 uppercase tracking-wider">
                            7d Delta
                          </p>
                          <p
                            className={`text-title font-semibold tabular-nums font-mono ${trendColorClass(intel.trend.shortTermDelta)}`}
                          >
                            {intel.trend.shortTermDelta > 0 ? "+" : ""}
                            {intel.trend.shortTermDelta}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg glass-surface">
                          <p className="text-caption text-[var(--text-tertiary)] mb-1 uppercase tracking-wider">
                            30d Delta
                          </p>
                          <p
                            className={`text-title font-semibold tabular-nums font-mono ${trendColorClass(intel.trend.longTermDelta)}`}
                          >
                            {intel.trend.longTermDelta > 0 ? "+" : ""}
                            {intel.trend.longTermDelta}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-body text-[var(--text-tertiary)]">
                      Insufficient history data
                    </p>
                  )}
                </Card>

                {/* Panel 4: Industry Benchmark */}
                <Card variant="elevated">
                  <div className="mb-4">
                    <h3 className="text-title font-semibold text-[var(--text-primary)]">
                      Industry Benchmark
                    </h3>
                    <p className="text-caption text-[var(--text-secondary)] mt-0.5">
                      Your fleet vs. industry peers
                    </p>
                  </div>
                  {benchmark?.operatorRanking ? (
                    <div className="space-y-3">
                      {[
                        {
                          label: "Your Fleet Score",
                          value: String(benchmark.operatorRanking.score),
                          cls: "text-[var(--text-primary)] font-semibold",
                        },
                        {
                          label: "Industry Average",
                          value: String(benchmark.overall.averageScore ?? "—"),
                          cls: "text-[var(--text-secondary)]",
                        },
                        {
                          label: "Percentile Rank",
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
                          className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)] last:border-0"
                        >
                          <span className="text-body text-[var(--text-secondary)]">
                            {label}
                          </span>
                          <span
                            className={`text-body tabular-nums font-mono ${cls}`}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                      <p className="text-caption text-[var(--text-tertiary)] pt-1">
                        Compared to {benchmark.overall.operatorCount} operators
                      </p>
                    </div>
                  ) : (
                    <p className="text-body text-[var(--text-tertiary)]">
                      Benchmark available when 5+ operators are in the system.
                    </p>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ── DEPENDENCIES TAB ─────────────────────────────────── */}
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

      {/* ── Alerts Sidebar ─────────────────────────────────────────── */}
      <AlertsSidebar alerts={allAlerts} />
    </div>
  );
}
