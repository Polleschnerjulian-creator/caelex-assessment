"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import { EPH } from "./theme";

// Lazy-load 3D Globe — falls back to SVG if import fails
const OrbitalTwinCanvas = dynamic(
  () => import("./components/orbital-twin-3d"),
  {
    ssr: false,
    loading: () => null,
  },
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface FleetState {
  noradId: string;
  satelliteName: string;
  operatorType?: string;
  overallScore: number;
  dataFreshness: string;
  altitudeKm?: number;
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

type TypeFilter = "ALL" | "SCO" | "LO" | "LSO" | "ISOS" | "CAP" | "PDP" | "TCO";
type StatusFilter = "ALL" | "NOMINAL" | "WATCH" | "WARNING" | "CRITICAL";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusColor(score: number): string {
  if (score >= 80) return "#3fb950";
  if (score >= 60) return "#d29922";
  if (score >= 40) return "#f0883e";
  return "#f85149";
}

function statusDotColor(category: string): string {
  switch (category) {
    case "NOMINAL":
      return "#3fb950";
    case "WATCH":
      return "#d29922";
    case "WARNING":
      return "#f0883e";
    case "CRITICAL":
      return "#f85149";
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
  if (days === null) return "rgba(255,255,255,0.3)";
  if (days < 90) return "#f85149";
  if (days < 365) return "#d29922";
  return "rgba(255,255,255,0.9)";
}

function freshnessColor(freshness: string): string {
  switch (freshness) {
    case "LIVE":
      return "#3fb950";
    case "RECENT":
      return "rgba(255,255,255,0.3)";
    case "STALE":
      return "#d29922";
    default:
      return "#f85149";
  }
}

function typeBadgeColor(type: string): string {
  switch (type) {
    case "SCO":
      return "rgba(63,185,80,0.15)";
    case "LO":
      return "rgba(210,153,34,0.15)";
    case "LSO":
      return "rgba(240,136,62,0.15)";
    case "ISOS":
      return "rgba(139,148,158,0.15)";
    case "CAP":
      return "rgba(100,149,237,0.15)";
    case "PDP":
      return "rgba(175,122,197,0.15)";
    case "TCO":
      return "rgba(248,81,73,0.15)";
    default:
      return "rgba(255,255,255,0.06)";
  }
}

function typeBadgeTextColor(type: string): string {
  switch (type) {
    case "SCO":
      return "rgba(63,185,80,0.8)";
    case "LO":
      return "rgba(210,153,34,0.8)";
    case "LSO":
      return "rgba(240,136,62,0.8)";
    case "ISOS":
      return "rgba(139,148,158,0.8)";
    case "CAP":
      return "rgba(100,149,237,0.8)";
    case "PDP":
      return "rgba(175,122,197,0.8)";
    case "TCO":
      return "rgba(248,81,73,0.8)";
    default:
      return "rgba(255,255,255,0.5)";
  }
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortKey = "name" | "score" | "horizon" | "risk" | "alerts" | "type";
type SortDir = "asc" | "desc";

// ─── Shared Styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
};

// ─── Fade wrapper ─────────────────────────────────────────────────────────────

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

// ─── Orbital Twin SVG Fallback ───────────────────────────────────────────────

function OrbitalTwinSVG({ fleet }: { fleet: FleetState[] }) {
  return (
    <div
      style={{
        ...cardStyle,
        height: 400,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="-2.2 -2.2 4.4 4.4"
        style={{ width: "100%", height: "100%" }}
      >
        {/* Earth */}
        <circle
          cx="0"
          cy="0"
          r="1"
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.01"
        />
        {/* Orbit rings */}
        <circle
          cx="0"
          cy="0"
          r="1.08"
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.005"
        />
        <circle
          cx="0"
          cy="0"
          r="1.15"
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.005"
        />
        <circle
          cx="0"
          cy="0"
          r="1.25"
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.005"
        />
        {/* Entity dots */}
        {fleet.map((entity) => {
          const isSurface = ["LO", "LSO", "TCO"].includes(
            entity.operatorType ?? "SCO",
          );
          const radius = isSurface
            ? 1.02
            : 1 + (entity.altitudeKm ?? 550) / 6371;
          const angle =
            ((parseInt(entity.noradId || "0") * 137.5) % 360) * (Math.PI / 180);
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          return (
            <circle
              key={entity.noradId}
              cx={x}
              cy={y}
              r="0.035"
              fill={getStatusColor(entity.overallScore)}
              style={{ cursor: "pointer" }}
              onClick={() => {
                window.location.href = `/dashboard/ephemeris/${entity.noradId}`;
              }}
            >
              <title>
                {entity.satelliteName} - Score: {entity.overallScore}
              </title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Compliance Deadline Heatmap ─────────────────────────────────────────────

function ComplianceHeatmap({ fleet }: { fleet: FleetState[] }) {
  const weeks = useMemo(() => {
    // Build deadline density from fleet horizons
    return Array.from({ length: 52 }, (_, i) => {
      const weekStart = i * 7;
      const weekEnd = weekStart + 7;
      // Count entities that have a breach within this week window
      let deadlines = 0;
      for (const entity of fleet) {
        const days = entity.complianceHorizon.daysUntilFirstBreach;
        if (days !== null && days >= weekStart && days < weekEnd) {
          deadlines++;
        }
        // Also count alerts that might correlate to upcoming deadlines
        if (entity.activeAlerts) {
          for (const alert of entity.activeAlerts) {
            if (alert.severity === "CRITICAL" && i < 4) deadlines++;
            if (alert.severity === "HIGH" && i >= 4 && i < 12) deadlines++;
          }
        }
      }
      return { week: i, deadlines };
    });
  }, [fleet]);

  return (
    <div
      style={{
        ...cardStyle,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          marginBottom: 16,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: 500,
        }}
      >
        Compliance Deadlines
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.3)",
          marginBottom: 16,
        }}
      >
        Next 12 months, by week
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(13, 1fr)",
          gap: 3,
        }}
      >
        {weeks.map((w) => (
          <div
            key={w.week}
            style={{
              width: "100%",
              aspectRatio: "1",
              borderRadius: 3,
              background:
                w.deadlines === 0
                  ? "rgba(255,255,255,0.03)"
                  : w.deadlines <= 1
                    ? "rgba(63,185,80,0.3)"
                    : w.deadlines <= 3
                      ? "rgba(210,153,34,0.4)"
                      : "rgba(248,81,73,0.5)",
              transition: "opacity 150ms ease",
              cursor: w.deadlines > 0 ? "pointer" : "default",
            }}
            title={`Week ${w.week + 1}: ${w.deadlines} deadline${w.deadlines !== 1 ? "s" : ""}`}
          />
        ))}
      </div>
      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 16,
          fontSize: 10,
          color: "rgba(255,255,255,0.25)",
        }}
      >
        <span>Less</span>
        <div style={{ display: "flex", gap: 3 }}>
          {[
            "rgba(255,255,255,0.03)",
            "rgba(63,185,80,0.3)",
            "rgba(210,153,34,0.4)",
            "rgba(248,81,73,0.5)",
          ].map((c, i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: c,
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// ─── AI Advisor (Template-Based) ─────────────────────────────────────────────

function AIAdvisor({
  fleet,
  intel,
}: {
  fleet: FleetState[];
  intel: FleetIntelligence | null;
}) {
  const recommendations = useMemo(() => {
    const recs: Array<{
      text: string;
      severity: "critical" | "warning" | "info";
    }> = [];

    // 1. Entity with lowest horizon
    if (
      intel?.horizon.earliestBreachName &&
      intel.horizon.earliestBreachDays !== null
    ) {
      const regulation =
        intel.horizon.earliestBreachRegulation ?? "compliance requirement";
      recs.push({
        text: `${intel.horizon.earliestBreachName} wird in ${intel.horizon.earliestBreachDays}d ${regulation} non-compliant. Aktion: Renewal jetzt starten.`,
        severity:
          intel.horizon.earliestBreachDays < 90 ? "critical" : "warning",
      });
    }

    // 2. Entity with most critical alerts
    const entityWithMostCritical = fleet
      .map((e) => ({
        name: e.satelliteName,
        critCount: (e.activeAlerts ?? []).filter(
          (a) => a.severity === "CRITICAL",
        ).length,
      }))
      .filter((e) => e.critCount > 0)
      .sort((a, b) => b.critCount - a.critCount)[0];

    if (entityWithMostCritical) {
      recs.push({
        text: `${entityWithMostCritical.name} hat ${entityWithMostCritical.critCount} Critical Alert${entityWithMostCritical.critCount > 1 ? "s" : ""}. Sofort handeln.`,
        severity: "critical",
      });
    }

    // 3. Fleet trend
    if (intel?.trend && Math.abs(intel.trend.shortTermDelta) > 0.5) {
      const direction = intel.trend.shortTermDelta < 0 ? "\u2193" : "\u2191";
      const weakest = intel.weakestLinks?.[0];
      const cause = weakest
        ? ` Hauptursache: ${weakest.name}${weakest.weakestModule ? ` (${weakest.weakestModule})` : ""}.`
        : "";
      recs.push({
        text: `Fleet Score Trend: ${direction}${Math.abs(intel.trend.shortTermDelta).toFixed(1)} pts in 7 Tagen.${cause}`,
        severity: intel.trend.shortTermDelta < -1 ? "warning" : "info",
      });
    }

    // 4. If fleet has entities with low scores
    const lowScoreEntities = fleet.filter((e) => e.overallScore < 60);
    if (lowScoreEntities.length > 0 && recs.length < 3) {
      recs.push({
        text: `${lowScoreEntities.length} Entities unter Score 60. Priorisierung empfohlen.`,
        severity: "warning",
      });
    }

    return recs.slice(0, 3);
  }, [fleet, intel]);

  if (recommendations.length === 0) {
    return (
      <div
        style={{
          ...cardStyle,
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
            marginBottom: 16,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 500,
          }}
        >
          AI Advisor
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
          No recommendations at this time. Fleet is in good shape.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...cardStyle,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          marginBottom: 16,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: 500,
        }}
      >
        AI Advisor
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {recommendations.map((rec, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              padding: 12,
              borderRadius: 10,
              background:
                rec.severity === "critical"
                  ? "rgba(248,81,73,0.06)"
                  : rec.severity === "warning"
                    ? "rgba(210,153,34,0.06)"
                    : "rgba(255,255,255,0.02)",
              border:
                rec.severity === "critical"
                  ? "1px solid rgba(248,81,73,0.12)"
                  : rec.severity === "warning"
                    ? "1px solid rgba(210,153,34,0.12)"
                    : "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                marginTop: 5,
                flexShrink: 0,
                background:
                  rec.severity === "critical"
                    ? "#f85149"
                    : rec.severity === "warning"
                      ? "#d29922"
                      : "#3fb950",
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.5,
              }}
            >
              {rec.text}
            </span>
          </div>
        ))}
      </div>
      <Link
        href="/dashboard/astra"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 16,
          fontSize: 12,
          color: "rgba(255,255,255,0.3)",
          textDecoration: "none",
          transition: "color 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "rgba(255,255,255,0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(255,255,255,0.3)";
        }}
      >
        Ask Ephemeris AI &rarr;
      </Link>
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
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [lastCalc, setLastCalc] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [use3DGlobe, setUse3DGlobe] = useState(true);

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
    let filtered = [...fleet];

    // Type filter
    if (typeFilter !== "ALL") {
      filtered = filtered.filter(
        (f) => (f.operatorType ?? "SCO") === typeFilter,
      );
    }

    // Status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(
        (f) => scoreRisk(f.overallScore) === statusFilter,
      );
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.satelliteName.toLowerCase().includes(q) ||
          f.noradId.toLowerCase().includes(q),
      );
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "type":
          cmp = (a.operatorType ?? "SCO").localeCompare(
            b.operatorType ?? "SCO",
          );
          break;
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
  }, [fleet, sortKey, sortDir, typeFilter, statusFilter, searchQuery]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const weakestModule = (
    entity: FleetState,
  ): { name: string; score: number } | null => {
    if (!entity.modules) return null;
    let worst: { name: string; score: number } | null = null;
    for (const [name, mod] of Object.entries(entity.modules)) {
      if (!worst || mod.score < worst.score) worst = { name, score: mod.score };
    }
    return worst;
  };

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
        flex: 1,
        minHeight: "100vh",
        background: "#000000",
        color: "rgba(255,255,255,0.9)",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ padding: 32, maxWidth: 1600, margin: "0 auto" }}>
        {/* ── 1. Header ──────────────────────────────────────────── */}
        <FadeIn>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 32,
            }}
          >
            <span
              style={{
                fontSize: 24,
                fontWeight: 500,
                color: "rgba(255,255,255,0.9)",
                letterSpacing: "-0.01em",
              }}
            >
              Fleet Overview
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {lastCalc && (
                <span
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.3)",
                    fontWeight: 400,
                  }}
                >
                  Updated{" "}
                  {new Date(lastCalc).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
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
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 13,
                  fontFamily:
                    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                {loading ? "Calculating..." : "\u21BB"}
              </button>
            </div>
          </div>
        </FadeIn>

        {/* ── 2. KPI Cards (5-grid) ──────────────────────────────── */}
        <FadeIn delay={50}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {/* Fleet Score */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 12,
                }}
              >
                Fleet Score
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 300,
                    color: "rgba(255,255,255,0.9)",
                    fontFamily:
                      "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
                    lineHeight: 1,
                  }}
                >
                  {intel?.fleetScore ?? "\u2014"}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.25)",
                  marginTop: 8,
                }}
              >
                {fleet.length > 0 ? `across ${fleet.length} entities` : ""}
              </div>
            </div>

            {/* Horizon */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 12,
                }}
              >
                Horizon
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 300,
                    color: "rgba(255,255,255,0.9)",
                    fontFamily:
                      "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
                    lineHeight: 1,
                  }}
                >
                  {intel?.horizon.earliestBreachDays ?? "\u221E"}
                </span>
                {intel?.horizon.earliestBreachDays != null && (
                  <span
                    style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}
                  >
                    d
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.25)",
                  marginTop: 8,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {intel?.horizon.earliestBreachRegulation ?? "until breach"}
              </div>
            </div>

            {/* Alerts */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 12,
                }}
              >
                Alerts
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 300,
                    color: "rgba(255,255,255,0.9)",
                    fontFamily:
                      "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
                    lineHeight: 1,
                  }}
                >
                  {totalAlerts}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.25)",
                  marginTop: 8,
                }}
              >
                {criticalAlerts > 0 ? (
                  <span style={{ color: "#f85149" }}>
                    {criticalAlerts} critical
                  </span>
                ) : highAlerts > 0 ? (
                  <span style={{ color: "#d29922" }}>{highAlerts} high</span>
                ) : totalAlerts > 0 ? (
                  "no critical"
                ) : (
                  "none"
                )}
              </div>
            </div>

            {/* Fleet Size */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 12,
                }}
              >
                Fleet Size
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 300,
                    color: "rgba(255,255,255,0.9)",
                    fontFamily:
                      "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
                    lineHeight: 1,
                  }}
                >
                  {fleet.length}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.25)",
                  marginTop: 8,
                }}
              >
                entities
              </div>
            </div>

            {/* Trend */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 12,
                }}
              >
                Trend
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 300,
                    color:
                      fleetDelta > 0.5
                        ? "#3fb950"
                        : fleetDelta < -0.5
                          ? "#f85149"
                          : "rgba(255,255,255,0.9)",
                    fontFamily:
                      "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
                    lineHeight: 1,
                  }}
                >
                  {fleetDelta > 0
                    ? "\u2191"
                    : fleetDelta < 0
                      ? "\u2193"
                      : "\u2192"}
                  {Math.abs(fleetDelta).toFixed(1)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.25)",
                  marginTop: 8,
                }}
              >
                7d delta
              </div>
            </div>
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
                  border: "1px solid rgba(248, 81, 73, 0.2)",
                  background: "rgba(248, 81, 73, 0.06)",
                }}
              >
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                  {error}
                </span>
                <button
                  onClick={loadAll}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 13,
                    fontFamily:
                      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              </div>
            </FadeIn>
          )}
        </AnimatePresence>

        {/* ── 3. Main Content (60/40 split) ──────────────────────── */}
        <FadeIn delay={100}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "3fr 2fr",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {/* Left: Orbital Twin */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 12,
                }}
              >
                Orbital Twin
              </div>
              {use3DGlobe ? (
                <OrbitalTwinCanvas
                  fleet={fleet}
                  onError={() => setUse3DGlobe(false)}
                />
              ) : (
                <OrbitalTwinSVG fleet={fleet} />
              )}
            </div>

            {/* Right: Compliance Heatmap */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 12,
                }}
              >
                &nbsp;
              </div>
              <ComplianceHeatmap fleet={fleet} />
            </div>
          </div>
        </FadeIn>

        {/* ── 4. Fleet Table ──────────────────────────────────────── */}
        <FadeIn delay={150}>
          <div style={{ marginBottom: 32 }}>
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
                    color: "rgba(255,255,255,0.3)",
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
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  No entities tracked
                </span>
              </div>
            ) : (
              <>
                {/* Filter bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  {/* Type filter */}
                  <select
                    value={typeFilter}
                    onChange={(e) =>
                      setTypeFilter(e.target.value as TypeFilter)
                    }
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.03)",
                      color: "rgba(255,255,255,0.9)",
                      fontSize: 13,
                      fontFamily:
                        "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="ALL">All Types</option>
                    {(
                      ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"] as const
                    ).map((t) => {
                      const count = fleet.filter(
                        (f) => (f.operatorType ?? "SCO") === t,
                      ).length;
                      return (
                        <option key={t} value={t}>
                          {t} ({count})
                        </option>
                      );
                    })}
                  </select>

                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as StatusFilter)
                    }
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.03)",
                      color: "rgba(255,255,255,0.9)",
                      fontSize: 13,
                      fontFamily:
                        "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="ALL">All Status</option>
                    <option value="NOMINAL">Nominal</option>
                    <option value="WATCH">Watch</option>
                    <option value="WARNING">Warning</option>
                    <option value="CRITICAL">Critical</option>
                  </select>

                  {/* Search */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.03)",
                      flex: 1,
                      maxWidth: 300,
                    }}
                  >
                    <Search
                      size={14}
                      style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      placeholder="Search entities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "rgba(255,255,255,0.9)",
                        fontSize: 13,
                        fontFamily:
                          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        width: "100%",
                      }}
                    />
                  </div>

                  {(typeFilter !== "ALL" ||
                    statusFilter !== "ALL" ||
                    searchQuery) && (
                    <button
                      onClick={() => {
                        setTypeFilter("ALL");
                        setStatusFilter("ALL");
                        setSearchQuery("");
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.06)",
                        background: "transparent",
                        color: "rgba(255,255,255,0.3)",
                        fontSize: 12,
                        fontFamily:
                          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Table */}
                <div
                  style={{
                    ...cardStyle,
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
                        fontFamily:
                          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          {[
                            {
                              key: "type" as SortKey,
                              label: "TYPE",
                              w: 72,
                              align: "center" as const,
                            },
                            {
                              key: "name" as SortKey,
                              label: "ENTITY NAME",
                              w: undefined,
                              align: "left" as const,
                            },
                            {
                              key: null,
                              label: "ENTITY ID",
                              w: 100,
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
                              label: "WEAKEST MODULE",
                              w: undefined,
                              align: "left" as const,
                            },
                            {
                              key: null,
                              label: "FRESHNESS",
                              w: 90,
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
                                col.key ? () => toggleSort(col.key!) : undefined
                              }
                              style={{
                                padding: "10px 16px",
                                textAlign: col.align,
                                fontSize: 10,
                                fontWeight: 500,
                                color: "rgba(255,255,255,0.25)",
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
                        {sortedFleet.map((entity, idx) => {
                          const risk = scoreRisk(entity.overallScore);
                          const wm = weakestModule(entity);
                          const entityType = entity.operatorType ?? "SCO";
                          return (
                            <tr
                              key={entity.noradId}
                              onClick={() => {
                                window.location.href = `/dashboard/ephemeris/${entity.noradId}`;
                              }}
                              style={{
                                cursor: "pointer",
                                background:
                                  idx % 2 === 1
                                    ? "rgba(255,255,255,0.02)"
                                    : "transparent",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.03)",
                                transition: "background 150ms ease",
                              }}
                              onMouseEnter={(e) => {
                                (
                                  e.currentTarget as HTMLElement
                                ).style.background = "rgba(255,255,255,0.04)";
                              }}
                              onMouseLeave={(e) => {
                                (
                                  e.currentTarget as HTMLElement
                                ).style.background =
                                  idx % 2 === 1
                                    ? "rgba(255,255,255,0.02)"
                                    : "transparent";
                              }}
                            >
                              {/* TYPE badge */}
                              <td
                                style={{
                                  padding: "10px 16px",
                                  textAlign: "center",
                                }}
                              >
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "3px 8px",
                                    borderRadius: 6,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    letterSpacing: "0.04em",
                                    background: typeBadgeColor(entityType),
                                    color: typeBadgeTextColor(entityType),
                                  }}
                                >
                                  {entityType}
                                </span>
                              </td>
                              {/* Entity Name */}
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontSize: 13,
                                  fontWeight: 400,
                                  color: "rgba(255,255,255,0.8)",
                                }}
                              >
                                {entity.satelliteName}
                              </td>
                              {/* Entity ID (NORAD for SCO, or internal) */}
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontSize: 12,
                                  fontFamily:
                                    "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
                                  color: "rgba(255,255,255,0.3)",
                                }}
                              >
                                {entity.noradId}
                              </td>
                              {/* Score */}
                              <td
                                style={{
                                  padding: "10px 16px",
                                  textAlign: "right",
                                  fontSize: 16,
                                  fontWeight: 300,
                                  fontFamily:
                                    "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
                                  color: "rgba(255,255,255,0.9)",
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {entity.overallScore}
                              </td>
                              {/* Horizon */}
                              <td
                                style={{
                                  padding: "10px 16px",
                                  textAlign: "right",
                                  fontFamily:
                                    "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
                                  fontSize: 13,
                                  fontWeight: 300,
                                  color: horizonColor(
                                    entity.complianceHorizon
                                      .daysUntilFirstBreach,
                                  ),
                                }}
                              >
                                {entity.complianceHorizon
                                  .daysUntilFirstBreach !== null
                                  ? `${entity.complianceHorizon.daysUntilFirstBreach}d`
                                  : "\u221E"}
                              </td>
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
                              {/* Weakest Module */}
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontSize: 12,
                                  color: "rgba(255,255,255,0.5)",
                                }}
                              >
                                {wm ? (
                                  <span>
                                    <span
                                      style={{ color: "rgba(255,255,255,0.5)" }}
                                    >
                                      {wm.name}
                                    </span>
                                    <span
                                      style={{
                                        marginLeft: 6,
                                        fontFamily:
                                          "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
                                        color: "rgba(255,255,255,0.3)",
                                      }}
                                    >
                                      {wm.score}
                                    </span>
                                  </span>
                                ) : (
                                  <span
                                    style={{ color: "rgba(255,255,255,0.3)" }}
                                  >
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
                                    color: freshnessColor(entity.dataFreshness),
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: freshnessColor(
                                        entity.dataFreshness,
                                      ),
                                      display: "inline-block",
                                    }}
                                  />
                                  {entity.dataFreshness}
                                </span>
                              </td>
                              {/* Alerts */}
                              <td
                                style={{
                                  padding: "10px 16px",
                                  textAlign: "center",
                                  fontFamily:
                                    "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
                                  fontSize: 13,
                                  fontWeight: 300,
                                  color:
                                    (entity.activeAlerts?.length ?? 0) > 0
                                      ? entity.activeAlerts?.some(
                                          (a) => a.severity === "CRITICAL",
                                        )
                                        ? "#f85149"
                                        : "#d29922"
                                      : "rgba(255,255,255,0.3)",
                                }}
                              >
                                {(entity.activeAlerts?.length ?? 0) > 0
                                  ? entity.activeAlerts.length
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
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      fontSize: 12,
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    Showing {sortedFleet.length} of {fleet.length} entities
                  </div>
                </div>
              </>
            )}
          </div>
        </FadeIn>

        {/* ── 5. Bottom Section (50/50) ──────────────────────────── */}
        <FadeIn delay={200}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {/* Left: Intelligence */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Risk Distribution */}
              <div style={{ ...cardStyle, padding: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 16,
                  }}
                >
                  Risk Distribution
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
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
                              width: 80,
                              fontSize: 11,
                              fontWeight: 500,
                              color: "rgba(255,255,255,0.3)",
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
                              fontFamily:
                                "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
                              fontWeight: 300,
                              color: "rgba(255,255,255,0.5)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {count}{" "}
                            <span style={{ color: "rgba(255,255,255,0.3)" }}>
                              ({pct.toFixed(0)}%)
                            </span>
                          </span>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Weakest Links */}
              <div style={{ ...cardStyle, padding: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 16,
                  }}
                >
                  Weakest Links
                </div>
                {(intel?.weakestLinks ?? []).length > 0 ? (
                  <div>
                    {(intel?.weakestLinks ?? []).slice(0, 3).map((link, i) => (
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
                            i <
                            Math.min((intel?.weakestLinks ?? []).length, 3) - 1
                              ? "1px solid rgba(255,255,255,0.04)"
                              : "none",
                          transition: "background 150ms ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "rgba(255,255,255,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.3)",
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
                            color: "rgba(255,255,255,0.9)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {link.name}
                        </span>
                        <span
                          style={{
                            fontSize: 16,
                            fontFamily:
                              "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
                            fontWeight: 300,
                            color: "rgba(255,255,255,0.9)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {link.score}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span
                    style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}
                  >
                    No data yet
                  </span>
                )}
              </div>
            </div>

            {/* Right: AI Advisor */}
            <AIAdvisor fleet={fleet} intel={intel} />
          </div>
        </FadeIn>
      </div>

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
