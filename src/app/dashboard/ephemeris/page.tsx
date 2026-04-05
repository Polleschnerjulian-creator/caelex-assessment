"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import AlertsSidebar from "./components/alerts-sidebar";
import DependencyGraphView from "./components/dependency-graph-view";
import { EPH } from "./theme";

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

// ─── Status dot color ────────────────────────────────────────────────────────

function statusDotColor(category: string): string {
  switch (category) {
    case "NOMINAL":
      return EPH.nominal;
    case "WATCH":
      return EPH.watch;
    case "WARNING":
      return EPH.warning;
    case "CRITICAL":
      return EPH.critical;
    default:
      return "rgba(255,255,255,0.2)";
  }
}

function severityDotColor(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return EPH.critical;
    case "HIGH":
      return EPH.warning;
    case "MEDIUM":
      return EPH.watch;
    default:
      return "rgba(255,255,255,0.2)";
  }
}

function scoreRisk(score: number): string {
  if (score >= 85) return "NOMINAL";
  if (score >= 70) return "WATCH";
  if (score >= 50) return "WARNING";
  return "CRITICAL";
}

function horizonColor(days: number | null): string {
  if (days === null) return EPH.textTertiary;
  if (days < 90) return EPH.critical;
  if (days < 365) return EPH.watch;
  return EPH.textPrimary;
}

function freshnessColor(freshness: string): string {
  switch (freshness) {
    case "LIVE":
      return EPH.nominal;
    case "RECENT":
      return EPH.textTertiary;
    case "STALE":
      return EPH.watch;
    default:
      return EPH.critical;
  }
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortKey = "name" | "score" | "horizon" | "risk" | "alerts";
type SortDir = "asc" | "desc";

const TAB_ITEMS = [
  { key: "fleet" as const, label: "Fleet" },
  { key: "alerts" as const, label: "Alerts" },
  { key: "intelligence" as const, label: "Intelligence" },
  { key: "dependencies" as const, label: "Dependencies" },
] as const;

type TabKey = (typeof TAB_ITEMS)[number]["key"];

// ─── Shared Styles ───────────────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background: EPH.cardBg,
  border: `1px solid ${EPH.cardBorder}`,
  borderRadius: EPH.cardRadius,
  transition: "background 200ms ease, border-color 200ms ease",
};

const glassCardHover: React.CSSProperties = {
  background: EPH.cardBgHover,
  borderColor: EPH.cardBorderHover,
};

// ─── Fade wrapper ────────────────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Glass Card with hover ───────────────────────────────────────────────────

function GlassPanel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...glassCard,
        ...(hovered ? glassCardHover : {}),
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

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
      return (
        <span
          style={{
            display: "inline-block",
            width: 12,
            marginLeft: 2,
            opacity: 0,
          }}
        >
          ^
        </span>
      );
    return sortDir === "asc" ? (
      <ChevronUp
        size={12}
        style={{ display: "inline", marginLeft: 2, opacity: 0.7 }}
      />
    ) : (
      <ChevronDown
        size={12}
        style={{ display: "inline", marginLeft: 2, opacity: 0.7 }}
      />
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: EPH.pageBg,
        color: EPH.textPrimary,
        fontFamily: EPH.sans,
      }}
    >
      <div style={{ flex: 1, minHeight: "100vh" }}>
        <div style={{ padding: 32, maxWidth: 1600, margin: "0 auto" }}>
          {/* ── Header ──────────────────────────────────────────────── */}
          <FadeIn>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 32,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {/* "e" logo */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    background: "white",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      color: "black",
                      fontSize: 18,
                      fontWeight: 700,
                      fontFamily: EPH.sans,
                      lineHeight: 1,
                    }}
                  >
                    e
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 500,
                    color: EPH.textPrimary,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Ephemeris
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {lastCalc && (
                  <span
                    style={{
                      fontSize: 13,
                      color: EPH.textTertiary,
                      fontWeight: 400,
                    }}
                  >
                    Last updated{" "}
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
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1px solid ${EPH.cardBorder}`,
                    background: "transparent",
                    color: EPH.textSecondary,
                    fontSize: 13,
                    fontFamily: EPH.sans,
                    cursor: loading ? "default" : "pointer",
                    opacity: loading ? 0.4 : 1,
                    transition: "all 200ms ease",
                  }}
                >
                  <RefreshCw
                    size={14}
                    style={
                      loading ? { animation: "spin 1s linear infinite" } : {}
                    }
                  />
                  {loading ? "Calculating..." : "Refresh"}
                </button>
              </div>
            </div>
          </FadeIn>

          {/* ── KPI Cards ──────────────────────────────────────────── */}
          <FadeIn delay={50}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 24,
                marginBottom: 32,
              }}
            >
              {/* Fleet Score */}
              <GlassPanel>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: EPH.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 12,
                  }}
                >
                  Fleet Score
                </div>
                <div
                  style={{ display: "flex", alignItems: "baseline", gap: 8 }}
                >
                  <span
                    style={{
                      fontSize: 48,
                      fontWeight: 300,
                      color: EPH.textPrimary,
                      fontFamily: EPH.mono,
                      lineHeight: 1,
                    }}
                  >
                    {intel?.fleetScore ?? "\u2014"}
                  </span>
                  {fleetDelta !== 0 && (
                    <span
                      style={{
                        fontSize: 13,
                        fontFamily: EPH.mono,
                        color:
                          fleetDelta > 0.5
                            ? EPH.nominal
                            : fleetDelta < -0.5
                              ? EPH.critical
                              : EPH.textTertiary,
                      }}
                    >
                      {fleetDelta > 0 ? "+" : ""}
                      {fleetDelta.toFixed(1)}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: EPH.textTertiary,
                    marginTop: 8,
                  }}
                >
                  7d trend
                </div>
              </GlassPanel>

              {/* Horizon */}
              <GlassPanel>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: EPH.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 12,
                  }}
                >
                  Horizon
                </div>
                <div
                  style={{ display: "flex", alignItems: "baseline", gap: 6 }}
                >
                  <span
                    style={{
                      fontSize: 48,
                      fontWeight: 300,
                      color: EPH.textPrimary,
                      fontFamily: EPH.mono,
                      lineHeight: 1,
                    }}
                  >
                    {intel?.horizon.earliestBreachDays ?? "\u2014"}
                  </span>
                  {intel?.horizon.earliestBreachDays != null && (
                    <span
                      style={{
                        fontSize: 13,
                        color: EPH.textTertiary,
                      }}
                    >
                      days
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: EPH.textTertiary,
                    marginTop: 8,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {intel?.horizon.earliestBreachName ?? "until breach"}
                </div>
              </GlassPanel>

              {/* Active Alerts */}
              <GlassPanel>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: EPH.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 12,
                  }}
                >
                  Active Alerts
                </div>
                <div
                  style={{ display: "flex", alignItems: "baseline", gap: 8 }}
                >
                  <span
                    style={{
                      fontSize: 48,
                      fontWeight: 300,
                      color: EPH.textPrimary,
                      fontFamily: EPH.mono,
                      lineHeight: 1,
                    }}
                  >
                    {totalAlerts}
                  </span>
                  {criticalAlerts > 0 && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 13,
                        color: EPH.critical,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: EPH.critical,
                          display: "inline-block",
                        }}
                      />
                      {criticalAlerts} crit
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: EPH.textTertiary,
                    marginTop: 8,
                  }}
                >
                  {criticalAlerts > 0
                    ? `${criticalAlerts} critical`
                    : highAlerts > 0
                      ? `${highAlerts} high`
                      : totalAlerts > 0
                        ? "no critical"
                        : "none"}
                </div>
              </GlassPanel>

              {/* Fleet Size */}
              <GlassPanel>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: EPH.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 12,
                  }}
                >
                  Fleet Size
                </div>
                <div
                  style={{ display: "flex", alignItems: "baseline", gap: 6 }}
                >
                  <span
                    style={{
                      fontSize: 48,
                      fontWeight: 300,
                      color: EPH.textPrimary,
                      fontFamily: EPH.mono,
                      lineHeight: 1,
                    }}
                  >
                    {fleet.length}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: EPH.textTertiary,
                    }}
                  >
                    sats
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: EPH.textTertiary,
                    marginTop: 8,
                  }}
                >
                  {criticalCount > 0 ? (
                    <span style={{ color: EPH.critical }}>
                      {criticalCount} critical
                    </span>
                  ) : watchCount > 0 ? (
                    <span style={{ color: EPH.watch }}>{watchCount} watch</span>
                  ) : (
                    `${nominalCount} nominal`
                  )}
                </div>
              </GlassPanel>
            </div>
          </FadeIn>

          {/* ── Tab Bar ──────────────────────────────────────────────── */}
          <FadeIn delay={100}>
            <div
              style={{
                display: "flex",
                gap: 0,
                borderBottom: `1px solid ${EPH.cardBorder}`,
                marginBottom: 24,
              }}
            >
              {TAB_ITEMS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    padding: "12px 20px",
                    fontSize: 13,
                    fontWeight: 400,
                    fontFamily: EPH.sans,
                    color:
                      activeTab === key ? EPH.textPrimary : EPH.textTertiary,
                    background: "transparent",
                    border: "none",
                    borderBottom:
                      activeTab === key
                        ? `2px solid ${EPH.textPrimary}`
                        : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 200ms ease",
                    position: "relative",
                    marginBottom: -1,
                  }}
                >
                  {label}
                  {key === "alerts" && totalAlerts > 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        padding: "2px 7px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 500,
                        fontFamily: EPH.mono,
                        background: EPH.badgeBg,
                        color:
                          criticalAlerts > 0 ? EPH.critical : EPH.textSecondary,
                      }}
                    >
                      {totalAlerts}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </FadeIn>

          {/* ── Error Banner ─────────────────────────────────────────── */}
          <AnimatePresence>
            {error && (
              <FadeIn>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    marginBottom: 24,
                    borderRadius: 12,
                    border: `1px solid rgba(248, 81, 73, 0.2)`,
                    background: "rgba(248, 81, 73, 0.06)",
                  }}
                >
                  <span style={{ fontSize: 13, color: EPH.textSecondary }}>
                    {error}
                  </span>
                  <button
                    onClick={loadAll}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 6,
                      border: `1px solid ${EPH.cardBorder}`,
                      background: "transparent",
                      color: EPH.textSecondary,
                      fontSize: 13,
                      fontFamily: EPH.sans,
                      cursor: "pointer",
                    }}
                  >
                    Retry
                  </button>
                </div>
              </FadeIn>
            )}
          </AnimatePresence>

          {/* ── Tab Content ──────────────────────────────────────────── */}

          {/* ── FLEET TAB ────────────────────────────────────────── */}
          {activeTab === "fleet" && (
            <FadeIn>
              {loading && fleet.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "96px 0",
                  }}
                >
                  <Loader2
                    size={22}
                    style={{
                      color: EPH.textTertiary,
                      animation: "spin 1s linear infinite",
                    }}
                  />
                </div>
              ) : fleet.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "96px 0",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: EPH.textTertiary,
                    }}
                  >
                    No satellites tracked
                  </span>
                </div>
              ) : (
                <>
                  {/* Type filter */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: EPH.textMicro,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Type
                    </span>
                    <select
                      value={typeFilter}
                      onChange={(e) =>
                        setTypeFilter(e.target.value as TypeFilter)
                      }
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: `1px solid ${EPH.cardBorder}`,
                        background: EPH.cardBg,
                        color: EPH.textPrimary,
                        fontSize: 13,
                        fontFamily: EPH.sans,
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="ALL">All ({fleet.length})</option>
                      <option value="SCO">
                        SCO (
                        {
                          fleet.filter(
                            (f) => (f.operatorType ?? "SCO") === "SCO",
                          ).length
                        }
                        )
                      </option>
                      <option value="LO">
                        LO (
                        {fleet.filter((f) => f.operatorType === "LO").length})
                      </option>
                    </select>
                    {typeFilter !== "ALL" && (
                      <button
                        onClick={() => setTypeFilter("ALL")}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: `1px solid ${EPH.cardBorder}`,
                          background: "transparent",
                          color: EPH.textTertiary,
                          fontSize: 12,
                          fontFamily: EPH.sans,
                          cursor: "pointer",
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Fleet Table */}
                  <div
                    style={{
                      ...glassCard,
                      overflow: "hidden",
                      padding: 0,
                    }}
                  >
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          fontSize: 13,
                          borderCollapse: "collapse",
                          fontFamily: EPH.sans,
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              borderBottom: `1px solid ${EPH.cardBorder}`,
                            }}
                          >
                            {[
                              {
                                key: null,
                                label: "",
                                w: 14,
                                align: "center" as const,
                              },
                              {
                                key: "name" as SortKey,
                                label: "NORAD",
                                w: 80,
                                align: "left" as const,
                              },
                              {
                                key: "name" as SortKey,
                                label: "NAME",
                                w: undefined,
                                align: "left" as const,
                              },
                              {
                                key: "score" as SortKey,
                                label: "SCORE",
                                w: 72,
                                align: "right" as const,
                              },
                              {
                                key: "horizon" as SortKey,
                                label: "HORIZON",
                                w: 100,
                                align: "right" as const,
                              },
                              {
                                key: "risk" as SortKey,
                                label: "STATUS",
                                w: 56,
                                align: "center" as const,
                              },
                              {
                                key: null,
                                label: "WEAKEST",
                                w: undefined,
                                align: "left" as const,
                              },
                              {
                                key: null,
                                label: "FRESH",
                                w: 72,
                                align: "center" as const,
                              },
                              {
                                key: "alerts" as SortKey,
                                label: "ALERTS",
                                w: 64,
                                align: "center" as const,
                              },
                            ].map((col, i) => (
                              <th
                                key={i}
                                onClick={
                                  col.key
                                    ? () => toggleSort(col.key!)
                                    : undefined
                                }
                                style={{
                                  padding: "10px 16px",
                                  textAlign: col.align,
                                  fontSize: 10,
                                  fontWeight: 500,
                                  color: EPH.textMicro,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                  width: col.w,
                                  cursor: col.key ? "pointer" : "default",
                                  userSelect: "none",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {col.label}
                                {col.key && <SortIcon field={col.key} />}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedFleet.map((sat, idx) => {
                            const risk = scoreRisk(sat.overallScore);
                            const wm = weakestModule(sat);
                            return (
                              <tr
                                key={sat.noradId}
                                onClick={() => {
                                  window.location.href = `/dashboard/ephemeris/${sat.noradId}`;
                                }}
                                style={{
                                  cursor: "pointer",
                                  background:
                                    idx % 2 === 1 ? EPH.rowAlt : "transparent",
                                  borderBottom: `1px solid rgba(255,255,255,0.03)`,
                                  transition: "background 150ms ease",
                                }}
                                onMouseEnter={(e) => {
                                  (
                                    e.currentTarget as HTMLElement
                                  ).style.background = EPH.rowHover;
                                }}
                                onMouseLeave={(e) => {
                                  (
                                    e.currentTarget as HTMLElement
                                  ).style.background =
                                    idx % 2 === 1 ? EPH.rowAlt : "transparent";
                                }}
                              >
                                {/* Status dot */}
                                <td
                                  style={{
                                    padding: "10px 16px",
                                    textAlign: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "inline-block",
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: statusDotColor(risk),
                                    }}
                                  />
                                </td>
                                {/* NORAD */}
                                <td
                                  style={{
                                    padding: "10px 16px",
                                    fontSize: 12,
                                    fontFamily: EPH.mono,
                                    color: EPH.textTertiary,
                                  }}
                                >
                                  {sat.noradId}
                                </td>
                                {/* Name */}
                                <td
                                  style={{
                                    padding: "10px 16px",
                                    fontSize: 13,
                                    fontWeight: 400,
                                    color: "rgba(255,255,255,0.8)",
                                  }}
                                >
                                  {sat.satelliteName}
                                </td>
                                {/* Score */}
                                <td
                                  style={{
                                    padding: "10px 16px",
                                    textAlign: "right",
                                    fontSize: 16,
                                    fontWeight: 400,
                                    fontFamily: EPH.mono,
                                    color: EPH.textPrimary,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {sat.overallScore}
                                </td>
                                {/* Horizon */}
                                <td
                                  style={{
                                    padding: "10px 16px",
                                    textAlign: "right",
                                    fontFamily: EPH.mono,
                                    fontSize: 13,
                                    color: horizonColor(
                                      sat.complianceHorizon
                                        .daysUntilFirstBreach,
                                    ),
                                  }}
                                >
                                  {sat.complianceHorizon
                                    .daysUntilFirstBreach !== null
                                    ? `${sat.complianceHorizon.daysUntilFirstBreach}d`
                                    : "\u2014"}
                                </td>
                                {/* Status dot column */}
                                <td
                                  style={{
                                    padding: "10px 16px",
                                    textAlign: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "inline-block",
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: statusDotColor(risk),
                                    }}
                                  />
                                </td>
                                {/* Weakest Module */}
                                <td
                                  style={{
                                    padding: "10px 16px",
                                    fontSize: 12,
                                    color: EPH.textSecondary,
                                  }}
                                >
                                  {wm ? (
                                    <span>
                                      <span
                                        style={{ color: EPH.textSecondary }}
                                      >
                                        {wm.name}
                                      </span>
                                      <span
                                        style={{
                                          marginLeft: 6,
                                          fontFamily: EPH.mono,
                                          color: EPH.textTertiary,
                                        }}
                                      >
                                        {wm.score}
                                      </span>
                                    </span>
                                  ) : (
                                    <span style={{ color: EPH.textTertiary }}>
                                      \u2014
                                    </span>
                                  )}
                                </td>
                                {/* Freshness */}
                                <td
                                  style={{
                                    padding: "10px 16px",
                                    textAlign: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 5,
                                      fontSize: 11,
                                      color: freshnessColor(sat.dataFreshness),
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        background: freshnessColor(
                                          sat.dataFreshness,
                                        ),
                                        display: "inline-block",
                                      }}
                                    />
                                    {sat.dataFreshness}
                                  </span>
                                </td>
                                {/* Alerts */}
                                <td
                                  style={{
                                    padding: "10px 16px",
                                    textAlign: "center",
                                    fontFamily: EPH.mono,
                                    fontSize: 13,
                                    color:
                                      (sat.activeAlerts?.length ?? 0) > 0
                                        ? sat.activeAlerts?.some(
                                            (a) => a.severity === "CRITICAL",
                                          )
                                          ? EPH.critical
                                          : EPH.watch
                                        : EPH.textTertiary,
                                  }}
                                >
                                  {(sat.activeAlerts?.length ?? 0) > 0
                                    ? sat.activeAlerts.length
                                    : "\u2014"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div
                      style={{
                        padding: "10px 16px",
                        borderTop: `1px solid ${EPH.cardBorder}`,
                        fontSize: 12,
                        color: EPH.textTertiary,
                      }}
                    >
                      Showing {sortedFleet.length} of {fleet.length} entities
                    </div>
                  </div>
                </>
              )}
            </FadeIn>
          )}

          {/* ── ALERTS TAB ───────────────────────────────────────── */}
          {activeTab === "alerts" && (
            <FadeIn>
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
                    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
                  });

                if (sortedAlerts.length === 0) {
                  return (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "96px 0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: EPH.nominal,
                            display: "inline-block",
                          }}
                        />
                        <span
                          style={{ fontSize: 13, color: EPH.textSecondary }}
                        >
                          No active alerts
                        </span>
                      </div>
                      <span style={{ fontSize: 13, color: EPH.textTertiary }}>
                        All systems nominal.
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    style={{
                      ...glassCard,
                      overflow: "hidden",
                      padding: 0,
                    }}
                  >
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          fontSize: 13,
                          borderCollapse: "collapse",
                          fontFamily: EPH.sans,
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              borderBottom: `1px solid ${EPH.cardBorder}`,
                            }}
                          >
                            {[
                              "",
                              "SEVERITY",
                              "ENTITY",
                              "TITLE",
                              "DESCRIPTION",
                            ].map((h, i) => (
                              <th
                                key={i}
                                style={{
                                  padding: "10px 16px",
                                  textAlign: "left",
                                  fontSize: 10,
                                  fontWeight: 500,
                                  color: EPH.textMicro,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                  width:
                                    i === 0
                                      ? 14
                                      : i === 1
                                        ? 80
                                        : i === 2
                                          ? 140
                                          : undefined,
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedAlerts.map((alert, i) => (
                            <tr
                              key={`${alert.noradId}-${alert.id ?? i}`}
                              onClick={() => {
                                window.location.href = `/dashboard/ephemeris/${alert.noradId}`;
                              }}
                              style={{
                                cursor: "pointer",
                                background:
                                  i % 2 === 1 ? EPH.rowAlt : "transparent",
                                borderBottom: `1px solid rgba(255,255,255,0.03)`,
                                transition: "background 150ms ease",
                              }}
                              onMouseEnter={(e) => {
                                (
                                  e.currentTarget as HTMLElement
                                ).style.background = EPH.rowHover;
                              }}
                              onMouseLeave={(e) => {
                                (
                                  e.currentTarget as HTMLElement
                                ).style.background =
                                  i % 2 === 1 ? EPH.rowAlt : "transparent";
                              }}
                            >
                              <td style={{ padding: "10px 16px" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: severityDotColor(
                                      alert.severity,
                                    ),
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontSize: 11,
                                  fontWeight: 500,
                                  color: EPH.textTertiary,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {alert.severity}
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontSize: 13,
                                  color: EPH.textSecondary,
                                }}
                              >
                                {alert.satelliteName}
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontSize: 13,
                                  color: EPH.textPrimary,
                                }}
                              >
                                {alert.title}
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontSize: 12,
                                  color: EPH.textTertiary,
                                  maxWidth: 400,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
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
            </FadeIn>
          )}

          {/* ── INTELLIGENCE TAB ─────────────────────────────────── */}
          {activeTab === "intelligence" && (
            <FadeIn>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 24,
                }}
              >
                {/* Risk Distribution */}
                <GlassPanel>
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: EPH.textSecondary,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Risk Distribution
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: EPH.textTertiary,
                        marginTop: 4,
                      }}
                    >
                      Fleet entities by risk category
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
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
                          <div
                            key={cat}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                width: 72,
                                fontSize: 11,
                                fontWeight: 500,
                                color: EPH.textTertiary,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: statusDotColor(cat),
                                  display: "inline-block",
                                  flexShrink: 0,
                                }}
                              />
                              {cat}
                            </span>
                            <div
                              style={{
                                flex: 1,
                                height: 4,
                                background: "rgba(255,255,255,0.06)",
                                borderRadius: 2,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  borderRadius: 2,
                                  background: statusDotColor(cat),
                                  width: `${pct}%`,
                                  opacity: 0.6,
                                  transition: "width 500ms ease",
                                }}
                              />
                            </div>
                            <span
                              style={{
                                width: 64,
                                textAlign: "right",
                                fontSize: 12,
                                fontFamily: EPH.mono,
                                color: EPH.textSecondary,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {count}{" "}
                              <span style={{ color: EPH.textTertiary }}>
                                ({pct.toFixed(0)}%)
                              </span>
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </GlassPanel>

                {/* Weakest Links */}
                <GlassPanel>
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: EPH.textSecondary,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Weakest Links
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: EPH.textTertiary,
                        marginTop: 4,
                      }}
                    >
                      Entities with highest fleet impact
                    </div>
                  </div>
                  {(intel?.weakestLinks ?? []).length > 0 ? (
                    <div>
                      {(intel?.weakestLinks ?? []).map((link, i) => (
                        <Link
                          key={link.noradId}
                          href={`/dashboard/ephemeris/${link.noradId}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 8px",
                            borderRadius: 8,
                            textDecoration: "none",
                            borderBottom:
                              i < (intel?.weakestLinks ?? []).length - 1
                                ? `1px solid rgba(255,255,255,0.04)`
                                : "none",
                            transition: "background 150ms ease",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              EPH.rowHover;
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "transparent";
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: EPH.textTertiary,
                              width: 20,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {i + 1}.
                          </span>
                          <span
                            style={{
                              flex: 1,
                              fontSize: 13,
                              color: EPH.textPrimary,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {link.name}
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              fontFamily: EPH.mono,
                              fontWeight: 400,
                              color: EPH.textPrimary,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {link.score}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: EPH.mono,
                              color: EPH.textTertiary,
                            }}
                          >
                            +{link.fleetImpact.toFixed(1)}pts
                          </span>
                          {link.weakestModule && (
                            <span
                              style={{
                                fontSize: 11,
                                color: EPH.textTertiary,
                              }}
                            >
                              {link.weakestModule} ({link.weakestModuleScore})
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: EPH.textTertiary }}>
                      No data yet
                    </span>
                  )}
                </GlassPanel>

                {/* Fleet Trend */}
                <GlassPanel>
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: EPH.textSecondary,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Fleet Trend
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: EPH.textTertiary,
                        marginTop: 4,
                      }}
                    >
                      Score trajectory over time
                    </div>
                  </div>
                  {intel?.trend ? (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 12,
                          marginBottom: 20,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 32,
                            fontWeight: 300,
                            color:
                              intel.trend.longTermDelta > 0.5
                                ? EPH.nominal
                                : intel.trend.longTermDelta < -0.5
                                  ? EPH.critical
                                  : EPH.textPrimary,
                            fontFamily: EPH.mono,
                          }}
                        >
                          {intel.trend.longTermDelta > 0.5
                            ? "\u2191"
                            : intel.trend.longTermDelta < -0.5
                              ? "\u2193"
                              : "\u2192"}{" "}
                          {intel.trend.direction}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            color: EPH.textMicro,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {intel.trend.trendStrength}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 16,
                        }}
                      >
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            background: EPH.cardBg,
                            border: `1px solid ${EPH.cardBorder}`,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 500,
                              color: EPH.textMicro,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              marginBottom: 6,
                            }}
                          >
                            7d Delta
                          </div>
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 300,
                              fontFamily: EPH.mono,
                              color:
                                intel.trend.shortTermDelta > 0.5
                                  ? EPH.nominal
                                  : intel.trend.shortTermDelta < -0.5
                                    ? EPH.critical
                                    : EPH.textPrimary,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {intel.trend.shortTermDelta > 0 ? "+" : ""}
                            {intel.trend.shortTermDelta}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            background: EPH.cardBg,
                            border: `1px solid ${EPH.cardBorder}`,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 500,
                              color: EPH.textMicro,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              marginBottom: 6,
                            }}
                          >
                            30d Delta
                          </div>
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 300,
                              fontFamily: EPH.mono,
                              color:
                                intel.trend.longTermDelta > 0.5
                                  ? EPH.nominal
                                  : intel.trend.longTermDelta < -0.5
                                    ? EPH.critical
                                    : EPH.textPrimary,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {intel.trend.longTermDelta > 0 ? "+" : ""}
                            {intel.trend.longTermDelta}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: EPH.textTertiary }}>
                      Insufficient history data
                    </span>
                  )}
                </GlassPanel>

                {/* Industry Benchmark */}
                <GlassPanel>
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: EPH.textSecondary,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Industry Benchmark
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: EPH.textTertiary,
                        marginTop: 4,
                      }}
                    >
                      Your fleet vs. industry peers
                    </div>
                  </div>
                  {benchmark?.operatorRanking ? (
                    <div>
                      {[
                        {
                          label: "Your Fleet Score",
                          value: String(benchmark.operatorRanking.score),
                          color: EPH.textPrimary,
                        },
                        {
                          label: "Industry Average",
                          value: String(
                            benchmark.overall.averageScore ?? "\u2014",
                          ),
                          color: EPH.textSecondary,
                        },
                        {
                          label: "Percentile Rank",
                          value: benchmark.operatorRanking.rank,
                          color: EPH.textPrimary,
                        },
                        {
                          label: "vs Average",
                          value: `${benchmark.operatorRanking.vsAverage > 0 ? "+" : ""}${benchmark.operatorRanking.vsAverage}`,
                          color:
                            benchmark.operatorRanking.vsAverage > 0.5
                              ? EPH.nominal
                              : benchmark.operatorRanking.vsAverage < -0.5
                                ? EPH.critical
                                : EPH.textPrimary,
                        },
                      ].map(({ label, value, color }, i) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 0",
                            borderBottom:
                              i < 3
                                ? `1px solid rgba(255,255,255,0.04)`
                                : "none",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              color: EPH.textSecondary,
                            }}
                          >
                            {label}
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              fontFamily: EPH.mono,
                              fontWeight: 400,
                              color,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                      <div
                        style={{
                          fontSize: 11,
                          color: EPH.textTertiary,
                          marginTop: 8,
                        }}
                      >
                        Compared to {benchmark.overall.operatorCount} operators
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: EPH.textTertiary }}>
                      Benchmark available when 5+ operators are in the system.
                    </span>
                  )}
                </GlassPanel>
              </div>
            </FadeIn>
          )}

          {/* ── DEPENDENCIES TAB ─────────────────────────────────── */}
          {activeTab === "dependencies" && (
            <FadeIn>
              <DependencyGraphView />
            </FadeIn>
          )}
        </div>
      </div>

      {/* ── Alerts Sidebar ─────────────────────────────────────────── */}
      <AlertsSidebar alerts={allAlerts} />

      {/* Keyframes for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
