"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { csrfHeaders } from "@/lib/csrf-client";
import AlertsSidebar from "./components/alerts-sidebar";
import { useEphemerisTheme } from "./theme";

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

const TYPE_BADGE_COLORS: Record<string, string> = {
  SCO: "#3B82F6",
  LO: "#F59E0B",
};

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

// ─── Color Helpers (theme-aware — see ./theme.ts) ────────────────────────────

import type { EphemerisColors } from "./theme";

function riskColor(category: string, C: EphemerisColors): string {
  switch (category) {
    case "NOMINAL":
      return C.nominal;
    case "WATCH":
      return C.watch;
    case "WARNING":
      return C.warning;
    case "CRITICAL":
      return C.critical;
    default:
      return C.textTertiary;
  }
}

function scoreColor(score: number, C: EphemerisColors): string {
  if (score >= 85) return C.nominal;
  if (score >= 70) return C.watch;
  if (score >= 50) return C.warning;
  return C.critical;
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

function trendColor(delta: number, C: EphemerisColors): string {
  if (delta > 0.5) return C.nominal;
  if (delta < -0.5) return C.critical;
  return C.textTertiary;
}

function severityColor(severity: string, C: EphemerisColors): string {
  switch (severity) {
    case "CRITICAL":
      return C.critical;
    case "HIGH":
      return C.warning;
    case "MEDIUM":
      return C.watch;
    default:
      return C.textTertiary;
  }
}

// ─── Sortable Column ──────────────────────────────────────────────────────────

type SortKey = "name" | "score" | "horizon" | "risk" | "alerts";
type SortDir = "asc" | "desc";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EphemerisDashboard() {
  const COLORS = useEphemerisTheme();
  const [fleet, setFleet] = useState<FleetState[]>([]);
  const [intel, setIntel] = useState<FleetIntelligence | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "fleet" | "alerts" | "intelligence"
  >("fleet");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [lastCalc, setLastCalc] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load fleet data first (fast — reads from DB cache)
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
      // Show fleet immediately, then load intelligence in background
      setLoading(false);

      // Load intelligence + benchmark (slower, non-blocking)
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

  // Fleet score delta from intelligence
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

  // Find weakest module for each satellite
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

  // ─── Styles ───────────────────────────────────────────────────────────

  const mono: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
  };
  const sans: React.CSSProperties = {
    fontFamily: "'Inter', -apple-system, sans-serif",
  };

  const cellStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: "12px",
    borderBottom: `1px solid ${COLORS.border}`,
    color: COLORS.textSecondary,
    ...mono,
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontSize: "10px",
    fontWeight: 500,
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    cursor: "pointer",
    userSelect: "none" as const,
    ...sans,
  };

  // ─── Render ───────────────────────────────────────────────────────────

  // Collect all alerts for sidebar
  const allAlerts = fleet.flatMap((f) =>
    (f.activeAlerts ?? []).map((a) => ({
      ...a,
      noradId: f.noradId,
      satelliteName: f.satelliteName,
    })),
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        style={{
          flex: 1,
          background: COLORS.bg,
          minHeight: "100vh",
          color: COLORS.textPrimary,
        }}
      >
        {/* ── Top Bar ──────────────────────────────────────────────────── */}
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.sunken,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: COLORS.brand,
                letterSpacing: "0.05em",
                ...sans,
              }}
            >
              EPHEMERIS
            </span>
            <span style={{ fontSize: 12, color: COLORS.textTertiary, ...sans }}>
              Fleet Command
            </span>
            <span style={{ fontSize: 10, color: COLORS.textMuted, ...mono }}>
              v3.1.0
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {lastCalc && (
              <span style={{ fontSize: 10, color: COLORS.textMuted, ...mono }}>
                Last calculated:{" "}
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
                fontSize: 11,
                padding: "4px 12px",
                background: COLORS.elevated,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 4,
                color: COLORS.textSecondary,
                cursor: loading ? "wait" : "pointer",
                ...sans,
              }}
            >
              {loading ? "↻ ..." : "↻ Recalculate"}
            </button>
          </div>
        </div>

        {/* ── Fleet Metrics Strip ──────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.sunken,
          }}
        >
          {/* Fleet Score */}
          <div
            style={{
              padding: "12px 24px",
              borderRight: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 4,
                ...sans,
              }}
            >
              Fleet Score
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: scoreColor(intel?.fleetScore ?? 0, COLORS),
                  ...mono,
                }}
              >
                {intel?.fleetScore ?? "—"}
              </span>
              {fleetDelta !== 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: trendColor(fleetDelta, COLORS),
                    ...mono,
                  }}
                >
                  {trendArrow(fleetDelta)} {fleetDelta > 0 ? "+" : ""}
                  {fleetDelta.toFixed(1)}
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: COLORS.textMuted, ...sans }}>
              7d trend
            </div>
          </div>

          {/* Fleet Horizon */}
          <div
            style={{
              padding: "12px 24px",
              borderRight: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 4,
                ...sans,
              }}
            >
              Fleet Horizon
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  ...mono,
                  color:
                    (intel?.horizon.earliestBreachDays ?? 999) < 90
                      ? COLORS.critical
                      : (intel?.horizon.earliestBreachDays ?? 999) < 365
                        ? COLORS.warning
                        : COLORS.textPrimary,
                }}
              >
                {intel?.horizon.earliestBreachDays ?? "∞"}
              </span>
              <span
                style={{ fontSize: 12, color: COLORS.textTertiary, ...sans }}
              >
                days
              </span>
            </div>
            <div style={{ fontSize: 10, color: COLORS.textMuted, ...sans }}>
              first breach
            </div>
          </div>

          {/* Satellites */}
          <div
            style={{
              padding: "12px 24px",
              borderRight: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 4,
                ...sans,
              }}
            >
              Entities
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  ...mono,
                }}
              >
                {nominalCount}/{fleet.length}
              </span>
              <span style={{ fontSize: 12, color: COLORS.nominal, ...sans }}>
                nominal
              </span>
            </div>
            <div style={{ fontSize: 10, color: COLORS.textMuted, ...sans }}>
              {watchCount > 0 && (
                <span style={{ color: COLORS.watch }}>{watchCount} watch </span>
              )}
              {warningCount > 0 && (
                <span style={{ color: COLORS.warning }}>
                  {warningCount} warning{" "}
                </span>
              )}
              {criticalCount > 0 && (
                <span style={{ color: COLORS.critical }}>
                  {criticalCount} critical
                </span>
              )}
              {watchCount === 0 &&
                warningCount === 0 &&
                criticalCount === 0 &&
                "all clear"}
            </div>
          </div>

          {/* Active Alerts */}
          <div style={{ padding: "12px 24px" }}>
            <div
              style={{
                fontSize: 10,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 4,
                ...sans,
              }}
            >
              Active Alerts
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  ...mono,
                  color:
                    criticalAlerts > 0
                      ? COLORS.critical
                      : totalAlerts > 0
                        ? COLORS.warning
                        : COLORS.textPrimary,
                }}
              >
                {totalAlerts}
              </span>
            </div>
            <div style={{ fontSize: 10, color: COLORS.textMuted, ...sans }}>
              {criticalAlerts > 0 && (
                <span style={{ color: COLORS.critical }}>
                  {criticalAlerts} critical
                </span>
              )}
              {criticalAlerts === 0 && totalAlerts > 0 && "no critical"}
              {totalAlerts === 0 && "none"}
            </div>
          </div>
        </div>

        {/* ── Tab Bar ──────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.sunken,
            padding: "0 24px",
          }}
        >
          {(["fleet", "alerts", "intelligence"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px",
                fontSize: 12,
                fontWeight: 500,
                color:
                  activeTab === tab ? COLORS.textPrimary : COLORS.textMuted,
                borderBottom:
                  activeTab === tab
                    ? `2px solid ${COLORS.brand}`
                    : "2px solid transparent",
                background: "none",
                border: "none",
                cursor: "pointer",
                textTransform: "capitalize",
                ...sans,
              }}
            >
              {tab === "alerts" ? `Alerts (${totalAlerts})` : tab}
            </button>
          ))}
        </div>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              margin: "16px 24px",
              padding: "8px 16px",
              background: "#2d1215",
              border: `1px solid ${COLORS.critical}33`,
              borderRadius: 4,
              fontSize: 12,
              color: COLORS.critical,
              ...mono,
            }}
          >
            {error}
          </div>
        )}

        {/* ── Tab Content ──────────────────────────────────────────────── */}
        <div style={{ padding: "0 24px 24px" }}>
          {/* FLEET TAB */}
          {activeTab === "fleet" && (
            <div>
              {loading && fleet.length === 0 ? (
                <div
                  style={{
                    padding: "64px 0",
                    textAlign: "center",
                    color: COLORS.textMuted,
                    fontSize: 12,
                    ...sans,
                  }}
                >
                  Loading fleet data...
                </div>
              ) : fleet.length === 0 ? (
                <div
                  style={{
                    padding: "64px 0",
                    textAlign: "center",
                    color: COLORS.textMuted,
                    fontSize: 12,
                    ...sans,
                  }}
                >
                  No entities registered. Add spacecraft or launch vehicles to
                  your organization.
                </div>
              ) : (
                <>
                  {/* Type filter bar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 0 6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: COLORS.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        ...sans,
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
                        fontSize: 11,
                        padding: "3px 8px",
                        background: COLORS.elevated,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 4,
                        color: COLORS.textSecondary,
                        cursor: "pointer",
                        outline: "none",
                        ...sans,
                      }}
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
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          background: "transparent",
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 3,
                          color: COLORS.textMuted,
                          cursor: "pointer",
                          ...sans,
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      marginTop: 1,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            ...headerCellStyle,
                            textAlign: "center",
                            width: 52,
                          }}
                        >
                          Type
                        </th>
                        <th
                          style={{
                            ...headerCellStyle,
                            textAlign: "left",
                            width: 90,
                          }}
                          onClick={() => toggleSort("name")}
                        >
                          ID{" "}
                          {sortKey === "name"
                            ? sortDir === "asc"
                              ? "↑"
                              : "↓"
                            : ""}
                        </th>
                        <th
                          style={{ ...headerCellStyle, textAlign: "left" }}
                          onClick={() => toggleSort("name")}
                        >
                          Name{" "}
                          {sortKey === "name"
                            ? sortDir === "asc"
                              ? "↑"
                              : "↓"
                            : ""}
                        </th>
                        <th
                          style={{
                            ...headerCellStyle,
                            textAlign: "right",
                            width: 70,
                          }}
                          onClick={() => toggleSort("score")}
                        >
                          Score{" "}
                          {sortKey === "score"
                            ? sortDir === "asc"
                              ? "↑"
                              : "↓"
                            : ""}
                        </th>
                        <th
                          style={{
                            ...headerCellStyle,
                            textAlign: "right",
                            width: 80,
                          }}
                          onClick={() => toggleSort("horizon")}
                        >
                          Horizon{" "}
                          {sortKey === "horizon"
                            ? sortDir === "asc"
                              ? "↑"
                              : "↓"
                            : ""}
                        </th>
                        <th
                          style={{
                            ...headerCellStyle,
                            textAlign: "center",
                            width: 80,
                          }}
                          onClick={() => toggleSort("risk")}
                        >
                          Risk{" "}
                          {sortKey === "risk"
                            ? sortDir === "asc"
                              ? "↑"
                              : "↓"
                            : ""}
                        </th>
                        <th style={{ ...headerCellStyle, textAlign: "left" }}>
                          Weakest Module
                        </th>
                        <th
                          style={{
                            ...headerCellStyle,
                            textAlign: "center",
                            width: 60,
                          }}
                        >
                          Freshness
                        </th>
                        <th
                          style={{
                            ...headerCellStyle,
                            textAlign: "center",
                            width: 60,
                          }}
                          onClick={() => toggleSort("alerts")}
                        >
                          Alerts{" "}
                          {sortKey === "alerts"
                            ? sortDir === "asc"
                              ? "↑"
                              : "↓"
                            : ""}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFleet.map((sat) => {
                        const risk = scoreRisk(sat.overallScore);
                        const wm = weakestModule(sat);
                        return (
                          <tr
                            key={sat.noradId}
                            style={{ cursor: "pointer" }}
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as HTMLTableRowElement
                              ).style.background = COLORS.elevated;
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLTableRowElement
                              ).style.background = "transparent";
                            }}
                            onClick={() => {
                              window.location.href = `/dashboard/ephemeris/${sat.noradId}`;
                            }}
                          >
                            <td
                              style={{
                                ...cellStyle,
                                textAlign: "center",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "1px 6px",
                                  borderRadius: 3,
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: "0.04em",
                                  color: "#fff",
                                  backgroundColor:
                                    TYPE_BADGE_COLORS[
                                      sat.operatorType ?? "SCO"
                                    ] ?? COLORS.textMuted,
                                  ...sans,
                                }}
                              >
                                {sat.operatorType ?? "SCO"}
                              </span>
                            </td>
                            <td
                              style={{
                                ...cellStyle,
                                color: COLORS.textMuted,
                                fontSize: 11,
                              }}
                            >
                              {sat.noradId}
                            </td>
                            <td
                              style={{
                                ...cellStyle,
                                color: COLORS.textPrimary,
                                fontWeight: 500,
                              }}
                            >
                              {sat.satelliteName}
                            </td>
                            <td
                              style={{
                                ...cellStyle,
                                textAlign: "right",
                                color: scoreColor(sat.overallScore, COLORS),
                                fontWeight: 600,
                              }}
                            >
                              {sat.overallScore}
                            </td>
                            <td style={{ ...cellStyle, textAlign: "right" }}>
                              {sat.complianceHorizon.daysUntilFirstBreach !==
                              null ? (
                                <span
                                  style={{
                                    color:
                                      sat.complianceHorizon
                                        .daysUntilFirstBreach < 90
                                        ? COLORS.critical
                                        : sat.complianceHorizon
                                              .daysUntilFirstBreach < 365
                                          ? COLORS.warning
                                          : COLORS.textSecondary,
                                  }}
                                >
                                  {sat.complianceHorizon.daysUntilFirstBreach}d
                                </span>
                              ) : (
                                <span style={{ color: COLORS.textMuted }}>
                                  ∞
                                </span>
                              )}
                            </td>
                            <td style={{ ...cellStyle, textAlign: "center" }}>
                              <span
                                style={{
                                  color: riskColor(risk, COLORS),
                                  fontSize: 11,
                                }}
                              >
                                ● {risk.slice(0, 4)}
                              </span>
                            </td>
                            <td style={{ ...cellStyle, fontSize: 11 }}>
                              {wm ? (
                                <span>
                                  <span style={{ color: COLORS.textTertiary }}>
                                    {wm.name}
                                  </span>
                                  <span
                                    style={{
                                      color: scoreColor(wm.score, COLORS),
                                      marginLeft: 6,
                                    }}
                                  >
                                    ({wm.score})
                                  </span>
                                </span>
                              ) : (
                                <span style={{ color: COLORS.textMuted }}>
                                  —
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                ...cellStyle,
                                textAlign: "center",
                                fontSize: 10,
                              }}
                            >
                              <span
                                style={{
                                  color:
                                    sat.dataFreshness === "LIVE"
                                      ? COLORS.nominal
                                      : sat.dataFreshness === "RECENT"
                                        ? COLORS.textTertiary
                                        : sat.dataFreshness === "STALE"
                                          ? COLORS.warning
                                          : COLORS.critical,
                                }}
                              >
                                ● {sat.dataFreshness}
                              </span>
                            </td>
                            <td style={{ ...cellStyle, textAlign: "center" }}>
                              {(sat.activeAlerts?.length ?? 0) > 0 ? (
                                <span
                                  style={{
                                    color: sat.activeAlerts?.some(
                                      (a) => a.severity === "CRITICAL",
                                    )
                                      ? COLORS.critical
                                      : COLORS.warning,
                                  }}
                                >
                                  {sat.activeAlerts.length}
                                </span>
                              ) : (
                                <span style={{ color: COLORS.textMuted }}>
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div
                    style={{
                      padding: "8px 12px",
                      fontSize: 10,
                      color: COLORS.textMuted,
                      ...sans,
                    }}
                  >
                    Showing {sortedFleet.length} of {fleet.length} entities
                  </div>
                </>
              )}
            </div>
          )}

          {/* ALERTS TAB */}
          {activeTab === "alerts" && (
            <div style={{ marginTop: 16 }}>
              {(() => {
                const allAlerts = fleet
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

                if (allAlerts.length === 0) {
                  return (
                    <div
                      style={{
                        padding: "64px 0",
                        textAlign: "center",
                        color: COLORS.textMuted,
                        fontSize: 12,
                        ...sans,
                      }}
                    >
                      No active alerts. All systems nominal.
                    </div>
                  );
                }

                return (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th
                          style={{
                            ...headerCellStyle,
                            width: 80,
                            textAlign: "left",
                          }}
                        >
                          Severity
                        </th>
                        <th
                          style={{
                            ...headerCellStyle,
                            width: 100,
                            textAlign: "left",
                          }}
                        >
                          Satellite
                        </th>
                        <th style={{ ...headerCellStyle, textAlign: "left" }}>
                          Title
                        </th>
                        <th style={{ ...headerCellStyle, textAlign: "left" }}>
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAlerts.map((alert, i) => (
                        <tr
                          key={`${alert.noradId}-${alert.id ?? i}`}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLTableRowElement
                            ).style.background = COLORS.elevated;
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLTableRowElement
                            ).style.background = "transparent";
                          }}
                          onClick={() => {
                            window.location.href = `/dashboard/ephemeris/${alert.noradId}`;
                          }}
                        >
                          <td style={{ ...cellStyle }}>
                            <span
                              style={{
                                color: severityColor(alert.severity, COLORS),
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              ● {alert.severity}
                            </span>
                          </td>
                          <td style={{ ...cellStyle, fontSize: 11 }}>
                            {alert.satelliteName}
                          </td>
                          <td
                            style={{ ...cellStyle, color: COLORS.textPrimary }}
                          >
                            {alert.title}
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              fontSize: 11,
                              color: COLORS.textTertiary,
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
                );
              })()}
            </div>
          )}

          {/* INTELLIGENCE TAB */}
          {activeTab === "intelligence" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginTop: 16,
              }}
            >
              {/* Panel 1: Risk Distribution */}
              <div
                style={{
                  background: COLORS.elevated,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 4,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: COLORS.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 12,
                    ...sans,
                  }}
                >
                  Risk Distribution
                </div>
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
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: COLORS.textMuted,
                            width: 60,
                            ...sans,
                          }}
                        >
                          {cat}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 14,
                            background: COLORS.sunken,
                            borderRadius: 2,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: riskColor(cat, COLORS),
                              borderRadius: 2,
                              transition: "width 0.3s",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            color: COLORS.textSecondary,
                            width: 60,
                            textAlign: "right",
                            ...mono,
                          }}
                        >
                          {count} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                    );
                  },
                )}
              </div>

              {/* Panel 2: Weakest Links */}
              <div
                style={{
                  background: COLORS.elevated,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 4,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: COLORS.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 12,
                    ...sans,
                  }}
                >
                  Weakest Links
                </div>
                {(intel?.weakestLinks ?? []).map((link, i) => (
                  <Link
                    key={link.noradId}
                    href={`/dashboard/ephemeris/${link.noradId}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                      borderBottom:
                        i < 2 ? `1px solid ${COLORS.border}` : "none",
                      textDecoration: "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        width: 16,
                        ...mono,
                      }}
                    >
                      {i + 1}.
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: COLORS.textPrimary,
                        flex: 1,
                        ...mono,
                      }}
                    >
                      {link.name}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: scoreColor(link.score, COLORS),
                        fontWeight: 600,
                        ...mono,
                      }}
                    >
                      {link.score}
                    </span>
                    <span
                      style={{ fontSize: 10, color: COLORS.nominal, ...mono }}
                    >
                      +{link.fleetImpact.toFixed(1)}pts
                    </span>
                    {link.weakestModule && (
                      <span
                        style={{
                          fontSize: 10,
                          color: COLORS.textTertiary,
                          ...sans,
                        }}
                      >
                        {link.weakestModule} ({link.weakestModuleScore})
                      </span>
                    )}
                  </Link>
                ))}
                {(!intel?.weakestLinks || intel.weakestLinks.length === 0) && (
                  <div
                    style={{ fontSize: 11, color: COLORS.textMuted, ...sans }}
                  >
                    No data yet
                  </div>
                )}
              </div>

              {/* Panel 3: Fleet Trend */}
              <div
                style={{
                  background: COLORS.elevated,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 4,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: COLORS.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 12,
                    ...sans,
                  }}
                >
                  Fleet Trend
                </div>
                {intel?.trend ? (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: trendColor(intel.trend.longTermDelta, COLORS),
                          ...mono,
                        }}
                      >
                        {trendArrow(intel.trend.longTermDelta)}{" "}
                        {intel.trend.direction}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: COLORS.textMuted,
                          ...sans,
                        }}
                      >
                        {intel.trend.trendStrength}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: COLORS.textMuted,
                            ...sans,
                          }}
                        >
                          7d Delta
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: trendColor(
                              intel.trend.shortTermDelta,
                              COLORS,
                            ),
                            ...mono,
                          }}
                        >
                          {intel.trend.shortTermDelta > 0 ? "+" : ""}
                          {intel.trend.shortTermDelta}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: COLORS.textMuted,
                            ...sans,
                          }}
                        >
                          30d Delta
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: trendColor(
                              intel.trend.longTermDelta,
                              COLORS,
                            ),
                            ...mono,
                          }}
                        >
                          {intel.trend.longTermDelta > 0 ? "+" : ""}
                          {intel.trend.longTermDelta}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{ fontSize: 11, color: COLORS.textMuted, ...sans }}
                  >
                    Insufficient history data
                  </div>
                )}
              </div>

              {/* Panel 4: Industry Benchmark */}
              <div
                style={{
                  background: COLORS.elevated,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 4,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: COLORS.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 12,
                    ...sans,
                  }}
                >
                  Industry Benchmark
                </div>
                {benchmark?.operatorRanking ? (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: COLORS.textTertiary,
                          ...sans,
                        }}
                      >
                        Your Fleet Score
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: COLORS.textPrimary,
                          ...mono,
                        }}
                      >
                        {benchmark.operatorRanking.score}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: COLORS.textTertiary,
                          ...sans,
                        }}
                      >
                        Industry Average
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          color: COLORS.textSecondary,
                          ...mono,
                        }}
                      >
                        {benchmark.overall.averageScore}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: COLORS.textTertiary,
                          ...sans,
                        }}
                      >
                        Percentile
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: COLORS.accent,
                          ...mono,
                        }}
                      >
                        {benchmark.operatorRanking.rank}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: COLORS.textTertiary,
                          ...sans,
                        }}
                      >
                        vs Average
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: trendColor(
                            benchmark.operatorRanking.vsAverage,
                            COLORS,
                          ),
                          ...mono,
                        }}
                      >
                        {benchmark.operatorRanking.vsAverage > 0 ? "+" : ""}
                        {benchmark.operatorRanking.vsAverage}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: COLORS.textMuted,
                        marginTop: 8,
                        ...sans,
                      }}
                    >
                      Compared to {benchmark.overall.operatorCount} operators
                    </div>
                  </div>
                ) : (
                  <div
                    style={{ fontSize: 11, color: COLORS.textMuted, ...sans }}
                  >
                    Benchmark available when 5+ operators are in the system.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <AlertsSidebar alerts={allAlerts} />
    </div>
  );
}
