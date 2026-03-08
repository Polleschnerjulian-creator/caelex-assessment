"use client";

import { useState, useEffect, useCallback, use, useMemo } from "react";
import Link from "next/link";
import { csrfHeaders } from "@/lib/csrf-client";
import AlertsSidebar from "../components/alerts-sidebar";
import { useEphemerisTheme, type EphemerisColors } from "../theme";
import {
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import EphemerisForge from "../components/scenario-builder/EphemerisForge";

// ─── Color Helpers (theme-aware — see ../theme.ts) ──────────────────────────

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

function riskColor(category: string, C: EphemerisColors): string {
  switch (category) {
    case "NOMINAL":
    case "COMPLIANT":
      return C.nominal;
    case "WATCH":
    case "WARNING":
      return C.watch;
    case "NON_COMPLIANT":
    case "CRITICAL":
      return C.critical;
    default:
      return C.textTertiary;
  }
}

function severityColor(sev: string, C: EphemerisColors): string {
  switch (sev) {
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

function trendArrow(delta: number): string {
  if (delta > 0.5) return "↑";
  if (delta < -0.5) return "↓";
  return "→";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SatelliteState {
  noradId: string;
  satelliteName: string;
  overallScore: number;
  dataFreshness: string;
  complianceHorizon: {
    daysUntilFirstBreach: number | null;
    firstBreachRegulation: string | null;
    firstBreachType: string | null;
    confidence: string;
  };
  modules: Record<
    string,
    {
      status: string;
      score: number;
      dataSource: string;
      factors: Array<{
        id: string;
        name: string;
        regulationRef: string;
        status: string;
        thresholdValue: number;
        unit: string;
        daysToThreshold: number | null;
        confidence: number;
      }>;
    }
  >;
  dataSources: Record<
    string,
    { connected: boolean; lastUpdate: string | null; status: string }
  >;
  activeAlerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
  }>;
  calculatedAt: string;
}

interface ForecastPoint {
  date: string;
  nominal: number;
  bestCase: number;
  worstCase: number;
  isHistorical: boolean;
}

interface ForecastCurve {
  regulationRef: string;
  regulationName: string;
  metric: string;
  unit: string;
  thresholdValue: number;
  dataPoints: ForecastPoint[];
  crossingDate: string | null;
  crossingDaysFromNow: number | null;
  confidence: string;
}

interface ComplianceEvent {
  id: string;
  date: string;
  daysFromNow: number;
  regulationRef: string;
  regulationName: string;
  eventType: string;
  severity: string;
  description: string;
  recommendedAction: string;
}

interface ForecastData {
  forecastCurves: ForecastCurve[];
  complianceEvents: ComplianceEvent[];
  horizonDays: number | null;
}

interface HistoryPoint {
  date: string;
  score: number;
}

// ─── Module Labels ────────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  fuel: "Fuel & Passivation",
  orbital: "Orbital Lifetime",
  subsystems: "Subsystems",
  cyber: "Cybersecurity",
  ground: "Ground Segment",
  documentation: "Documentation",
  insurance: "Insurance",
  registration: "Registration",
};

const SOURCE_LABELS: Record<string, string> = {
  sentinel: "Sentinel Telemetry",
  celestrak: "CelesTrak TLE",
  verity: "Verity Attestations",
  assessment: "Compliance Assessments",
  solarFlux: "NOAA Solar Flux",
};

type TabId = "forecast" | "modules" | "scenarios" | "cascade" | "datasources";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SatelliteDetailPage({
  params,
}: {
  params: Promise<{ noradId: string }>;
}) {
  const { noradId } = use(params);
  const C = useEphemerisTheme();
  const [state, setState] = useState<SatelliteState | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("forecast");
  const [verityAttestations, setVerityAttestations] = useState<
    Array<{
      regulationRef: string;
      trustLevel: string;
      status: string;
      attestationId: string;
    }>
  >([]);

  // Notify sidebar of forge mode (scenarios tab active)
  useEffect(() => {
    const isForge = activeTab === "scenarios";
    window.dispatchEvent(
      new CustomEvent("forge-mode-change", { detail: { active: isForge } }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("forge-mode-change", { detail: { active: false } }),
      );
    };
  }, [activeTab]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load state first (fast — reads from DB cache), show immediately
      const stateRes = await fetch(
        `/api/v1/ephemeris/state?norad_id=${noradId}`,
        { headers: csrfHeaders() },
      );
      if (stateRes.ok) {
        const d = await stateRes.json();
        setState(d.data);
      }
      setLoading(false);

      // Then load forecast + history + attestations in parallel (non-blocking)
      const [forecastRes, historyRes, attestRes] = await Promise.all([
        fetch(`/api/v1/ephemeris/forecast?norad_id=${noradId}`, {
          headers: csrfHeaders(),
        }),
        fetch(
          `/api/v1/ephemeris/history?norad_id=${noradId}&lookback_days=30`,
          { headers: csrfHeaders() },
        ),
        fetch(`/api/v1/verity/attestation/list?status=VALID&limit=100`).catch(
          () => null,
        ),
      ]);

      if (forecastRes.ok) {
        const d = await forecastRes.json();
        setForecast(d.data);
      }
      if (historyRes.ok) {
        const d = await historyRes.json();
        if (Array.isArray(d.data)) {
          setHistory(
            d.data.map((h: { calculatedAt: string; overallScore: number }) => ({
              date: h.calculatedAt,
              score: h.overallScore,
            })),
          );
        }
      }
      if (attestRes?.ok) {
        const d = await attestRes.json();
        if (Array.isArray(d.items)) {
          setVerityAttestations(
            d.items.map(
              (a: {
                regulationRef: string;
                trustLevel: string;
                status: string;
                attestationId: string;
              }) => ({
                regulationRef: a.regulationRef,
                trustLevel: a.trustLevel,
                status: a.status,
                attestationId: a.attestationId,
              }),
            ),
          );
        }
      }
    } catch {
      // Silent
      setLoading(false);
    }
  }, [noradId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const recalculate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ephemeris/recalculate", {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ norad_id: noradId }),
      });
      if (res.ok) await loadData();
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  };

  // Derived data
  const alertCount = state?.activeAlerts.length ?? 0;
  const horizonDays = state?.complianceHorizon.daysUntilFirstBreach ?? null;

  const trend7d = useMemo(() => {
    if (history.length < 2) return null;
    const current = history[history.length - 1]!.score;
    const weekAgo =
      history.length >= 8
        ? history[history.length - 8]!.score
        : history[0]!.score;
    return Math.round((current - weekAgo) * 10) / 10;
  }, [history]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "forecast", label: "FORECAST" },
    { id: "modules", label: "MODULES" },
    { id: "scenarios", label: "SCENARIOS" },
    { id: "cascade", label: "CASCADE" },
    { id: "datasources", label: "DATA SOURCES" },
  ];

  if (loading && !state) {
    return (
      <div
        style={{
          background: C.bg,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.textTertiary,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 13,
        }}
      >
        LOADING SATELLITE DATA...
      </div>
    );
  }

  // Collect alerts for sidebar
  const sidebarAlerts = (state?.activeAlerts ?? []).map((a) => ({
    ...a,
    noradId,
    satelliteName: state?.satelliteName,
  }));

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        style={{
          flex: 1,
          background: C.bg,
          minHeight: "100vh",
          color: C.textPrimary,
          fontFamily: "'Inter', sans-serif",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Top Bar (hidden in scenarios mode) ───────────────────────────── */}
        <div
          style={{
            background: C.sunken,
            borderBottom: `1px solid ${C.border}`,
            padding: "10px 24px",
            display: activeTab === "scenarios" ? "none" : "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/dashboard/ephemeris"
              style={{
                color: C.textTertiary,
                textDecoration: "none",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 4,
                border: `1px solid ${C.border}`,
              }}
            >
              ← FLEET
            </Link>
            <div>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.textPrimary,
                  letterSpacing: "0.02em",
                }}
              >
                {state?.satelliteName ?? noradId}
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: C.textTertiary,
                  marginLeft: 12,
                }}
              >
                NORAD {noradId}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: C.textMuted,
              }}
            >
              CALCULATED{" "}
              {state?.calculatedAt
                ? new Date(state.calculatedAt).toLocaleString()
                : "—"}
            </span>
            <button
              onClick={recalculate}
              disabled={loading}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                padding: "4px 12px",
                borderRadius: 4,
                border: `1px solid ${C.border}`,
                background: C.elevated,
                color: loading ? C.textMuted : C.textSecondary,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "CALCULATING..." : "RECALCULATE"}
            </button>
          </div>
        </div>

        {/* ── Metrics Strip (hidden in scenarios mode) ────────────────────── */}
        <div
          style={{
            display: activeTab === "scenarios" ? "none" : "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {/* Score */}
          <MetricCell
            label="SCORE"
            value={
              state && state.overallScore !== null
                ? `${state.overallScore}`
                : "—"
            }
            valueColor={
              state && state.overallScore !== null
                ? scoreColor(state.overallScore, C)
                : C.textMuted
            }
            sub={
              state && state.overallScore !== null
                ? scoreRisk(state.overallScore)
                : ""
            }
            C={C}
          />
          {/* Horizon */}
          <MetricCell
            label="HORIZON"
            value={horizonDays !== null ? `${horizonDays}d` : "∞"}
            valueColor={
              horizonDays !== null
                ? horizonDays < 90
                  ? C.critical
                  : horizonDays < 365
                    ? C.warning
                    : C.nominal
                : C.textMuted
            }
            sub={state?.complianceHorizon.firstBreachRegulation ?? "No breach"}
            C={C}
          />
          {/* 7d Trend */}
          <MetricCell
            label="7D TREND"
            value={
              trend7d !== null
                ? `${trendArrow(trend7d)} ${trend7d > 0 ? "+" : ""}${trend7d}`
                : "—"
            }
            valueColor={
              trend7d !== null
                ? trend7d > 0.5
                  ? C.nominal
                  : trend7d < -0.5
                    ? C.critical
                    : C.textSecondary
                : C.textMuted
            }
            sub="pts"
            C={C}
          />
          {/* Alerts */}
          <MetricCell
            label="ALERTS"
            value={`${alertCount}`}
            valueColor={alertCount > 0 ? C.critical : C.nominal}
            sub="active"
            C={C}
          />
          {/* Modules */}
          <MetricCell
            label="MODULES"
            value={`${state ? Object.keys(state.modules).length : 0}`}
            valueColor={C.textSecondary}
            sub="tracked"
            C={C}
          />
        </div>

        {/* ── Tab Bar (hidden in scenarios mode) ──────────────────────────── */}
        <div
          style={{
            display: activeTab === "scenarios" ? "none" : "flex",
            borderBottom: `1px solid ${C.border}`,
            background: C.sunken,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.05em",
                padding: "10px 20px",
                border: "none",
                borderBottom:
                  activeTab === tab.id
                    ? `2px solid ${C.accent}`
                    : "2px solid transparent",
                background: "transparent",
                color: activeTab === tab.id ? C.textPrimary : C.textTertiary,
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ───────────────────────────────────────────────────── */}
        <div
          style={
            activeTab === "scenarios"
              ? { flex: 1, display: "flex", flexDirection: "column" as const }
              : { padding: 24 }
          }
        >
          {activeTab === "forecast" && (
            <ForecastTab
              forecast={forecast}
              events={forecast?.complianceEvents ?? []}
              C={C}
            />
          )}
          {activeTab === "modules" && state && (
            <ModulesTab
              modules={state.modules}
              C={C}
              attestations={verityAttestations}
            />
          )}
          {activeTab === "scenarios" && (
            <div style={{ flex: 1, minHeight: "calc(100vh - 100px)" }}>
              <EphemerisForge
                noradId={noradId}
                satelliteName={state?.satelliteName ?? noradId}
                satelliteState={state}
                onBack={() => setActiveTab("forecast")}
              />
            </div>
          )}
          {activeTab === "cascade" && <CascadeTab noradId={noradId} C={C} />}
          {activeTab === "datasources" && state && (
            <DataSourcesTab
              dataSources={state.dataSources}
              dataFreshness={state.dataFreshness}
              C={C}
              attestationCount={verityAttestations.length}
            />
          )}
        </div>
      </div>
      {activeTab !== "scenarios" && (
        <AlertsSidebar alerts={sidebarAlerts} noradId={noradId} />
      )}
    </div>
  );
}

// ─── Metric Cell ──────────────────────────────────────────────────────────────

function MetricCell({
  label,
  value,
  valueColor,
  sub,
  C,
}: {
  label: string;
  value: string;
  valueColor: string;
  sub: string;
  C: EphemerisColors;
}) {
  return (
    <div
      style={{
        padding: "14px 20px",
        borderRight: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          color: C.textMuted,
          letterSpacing: "0.08em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 22,
          fontWeight: 600,
          color: valueColor,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: C.textMuted,
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Forecast Tab ─────────────────────────────────────────────────────────────

function ForecastTab({
  forecast,
  events,
  C,
}: {
  forecast: ForecastData | null;
  events: ComplianceEvent[];
  C: EphemerisColors;
}) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(
    forecast?.forecastCurves[0]?.metric ?? null,
  );

  const curve = forecast?.forecastCurves.find(
    (c) => c.metric === selectedMetric,
  );

  // Transform data points for Recharts
  const chartData = useMemo(() => {
    if (!curve) return [];
    return curve.dataPoints.map((pt) => ({
      date: new Date(pt.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullDate: pt.date,
      nominal: Math.round(pt.nominal * 100) / 100,
      bestCase: Math.round(pt.bestCase * 100) / 100,
      worstCase: Math.round(pt.worstCase * 100) / 100,
      isHistorical: pt.isHistorical,
      // Band for area fill (P10 to P90)
      band: [
        Math.round(pt.worstCase * 100) / 100,
        Math.round(pt.bestCase * 100) / 100,
      ] as [number, number],
    }));
  }, [curve]);

  if (!forecast || forecast.forecastCurves.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: C.textMuted,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
        }}
      >
        NO FORECAST DATA AVAILABLE
      </div>
    );
  }

  return (
    <div>
      {/* Curve Selector */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {forecast.forecastCurves.map((c) => (
          <button
            key={c.metric}
            onClick={() => setSelectedMetric(c.metric)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              padding: "6px 14px",
              borderRadius: 4,
              border: `1px solid ${selectedMetric === c.metric ? C.accent : C.border}`,
              background:
                selectedMetric === c.metric ? C.elevated : "transparent",
              color: selectedMetric === c.metric ? C.accent : C.textTertiary,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {c.regulationName}
            {c.crossingDaysFromNow !== null && (
              <span style={{ color: C.warning, marginLeft: 8 }}>
                {c.crossingDaysFromNow}d
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Chart */}
      {curve && (
        <div
          style={{
            background: C.elevated,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "16px 16px 8px 8px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 8px 12px",
            }}
          >
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                color: C.textSecondary,
              }}
            >
              {curve.regulationName}{" "}
              <span style={{ color: C.textMuted }}>({curve.unit})</span>
            </span>
            {curve.crossingDaysFromNow !== null && (
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: C.warning,
                }}
              >
                BREACH IN {curve.crossingDaysFromNow}d
              </span>
            )}
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid
                stroke={C.border}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{
                  fill: C.textMuted,
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
                axisLine={{ stroke: C.border }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{
                  fill: C.textMuted,
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
                axisLine={{ stroke: C.border }}
                tickLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  background: C.sunken,
                  border: `1px solid ${C.borderActive}`,
                  borderRadius: 4,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: C.textPrimary,
                }}
                labelStyle={{ color: C.textTertiary }}
              />

              {/* Confidence band (P10-P90 area) */}
              <Area
                dataKey="band"
                fill={C.accent}
                fillOpacity={0.08}
                stroke="none"
              />

              {/* Threshold line */}
              <ReferenceLine
                y={curve.thresholdValue}
                stroke={C.critical}
                strokeDasharray="6 4"
                strokeOpacity={0.6}
                label={{
                  value: `Threshold ${curve.thresholdValue}${curve.unit}`,
                  fill: C.critical,
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  position: "right",
                }}
              />

              {/* Worst case (P10) */}
              <Line
                type="monotone"
                dataKey="worstCase"
                stroke={C.critical}
                strokeWidth={1}
                strokeOpacity={0.3}
                dot={false}
                name="P10 (Worst)"
              />

              {/* Best case (P90) */}
              <Line
                type="monotone"
                dataKey="bestCase"
                stroke={C.nominal}
                strokeWidth={1}
                strokeOpacity={0.3}
                dot={false}
                name="P90 (Best)"
              />

              {/* Nominal (P50) */}
              <Line
                type="monotone"
                dataKey="nominal"
                stroke={C.accent}
                strokeWidth={2}
                dot={false}
                name="Nominal (P50)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Compliance Events Table */}
      {events.length > 0 && (
        <div
          style={{
            background: C.elevated,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${C.border}`,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: C.textTertiary,
              letterSpacing: "0.05em",
            }}
          >
            COMPLIANCE EVENTS ({events.length})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: `1px solid ${C.border}`,
                  background: C.sunken,
                }}
              >
                {["DAYS", "SEVERITY", "REGULATION", "EVENT", "ACTION"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        fontWeight: 500,
                        color: C.textMuted,
                        letterSpacing: "0.08em",
                        padding: "8px 12px",
                        textAlign: "left",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr
                  key={ev.id}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = C.sunken)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 13,
                      fontWeight: 600,
                      color: severityColor(ev.severity, C),
                      padding: "10px 12px",
                    }}
                  >
                    {ev.daysFromNow}d
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: severityColor(ev.severity, C),
                        marginRight: 8,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color: C.textSecondary,
                      }}
                    >
                      {ev.severity}
                    </span>
                  </td>
                  <td
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: C.accent,
                      padding: "10px 12px",
                    }}
                  >
                    {ev.regulationName}
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      color: C.textSecondary,
                      padding: "10px 12px",
                      maxWidth: 300,
                    }}
                  >
                    {ev.description}
                  </td>
                  <td
                    style={{
                      fontSize: 11,
                      color: C.textTertiary,
                      padding: "10px 12px",
                      maxWidth: 200,
                    }}
                  >
                    {ev.recommendedAction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Modules Tab ──────────────────────────────────────────────────────────────

function ModulesTab({
  modules,
  C,
  attestations = [],
}: {
  modules: SatelliteState["modules"];
  C: EphemerisColors;
  attestations?: Array<{
    regulationRef: string;
    trustLevel: string;
    status: string;
    attestationId: string;
  }>;
}) {
  // Build a map of regulationRef -> attestation for quick lookup
  const attestationMap = useMemo(() => {
    const map = new Map<
      string,
      { trustLevel: string; status: string; attestationId: string }
    >();
    for (const a of attestations) {
      // Keep the highest trust level attestation per regulation
      const existing = map.get(a.regulationRef);
      if (
        !existing ||
        (a.trustLevel === "HIGH" && existing.trustLevel !== "HIGH")
      ) {
        map.set(a.regulationRef, a);
      }
    }
    return map;
  }, [attestations]);

  const sorted = useMemo(
    () => Object.entries(modules).sort(([, a], [, b]) => a.score - b.score),
    [modules],
  );

  return (
    <div>
      {/* Module Bars */}
      <div
        style={{
          background: C.elevated,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${C.border}`,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: C.textTertiary,
            letterSpacing: "0.05em",
          }}
        >
          MODULE SCORES (sorted by risk)
        </div>
        <div style={{ padding: 16 }}>
          {sorted.map(([key, mod]) => {
            // Check if any factor in this module has a Verity attestation
            const moduleAttestations = mod.factors
              .map((f) => attestationMap.get(f.regulationRef))
              .filter(Boolean);
            const hasAttestation = moduleAttestations.length > 0;
            const highestTrust = hasAttestation
              ? moduleAttestations.some((a) => a!.trustLevel === "HIGH")
                ? "HIGH"
                : moduleAttestations.some((a) => a!.trustLevel === "MEDIUM")
                  ? "MEDIUM"
                  : "LOW"
              : null;

            return (
              <div
                key={key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 60px 40px 80px",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 0",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: C.textSecondary,
                  }}
                >
                  {MODULE_LABELS[key] ?? key}
                </span>

                {/* Bar */}
                <div
                  style={{
                    height: 8,
                    background: C.sunken,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${mod.score}%`,
                      background: scoreColor(mod.score, C),
                      borderRadius: 4,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 13,
                    fontWeight: 600,
                    color: scoreColor(mod.score, C),
                    textAlign: "right",
                  }}
                >
                  {mod.score}
                </span>

                {/* Verity badge */}
                <span
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {hasAttestation && (
                    <span
                      title={`Verity attested (${highestTrust})`}
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        padding: "2px 6px",
                        borderRadius: 3,
                        background:
                          highestTrust === "HIGH"
                            ? "rgba(61,214,140,0.12)"
                            : highestTrust === "MEDIUM"
                              ? "rgba(90,173,255,0.12)"
                              : "rgba(245,166,35,0.12)",
                        color:
                          highestTrust === "HIGH"
                            ? C.nominal
                            : highestTrust === "MEDIUM"
                              ? "#5AADFF"
                              : C.warning,
                        border: `1px solid ${
                          highestTrust === "HIGH"
                            ? "rgba(61,214,140,0.2)"
                            : highestTrust === "MEDIUM"
                              ? "rgba(90,173,255,0.2)"
                              : "rgba(245,166,35,0.2)"
                        }`,
                      }}
                    >
                      ✓ V
                    </span>
                  )}
                </span>

                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: riskColor(mod.status, C),
                    textAlign: "right",
                  }}
                >
                  {mod.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Factor Details */}
      <div
        style={{
          background: C.elevated,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${C.border}`,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: C.textTertiary,
            letterSpacing: "0.05em",
          }}
        >
          FACTOR DETAILS
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: `1px solid ${C.border}`,
                background: C.sunken,
              }}
            >
              {[
                "MODULE",
                "FACTOR",
                "REGULATION",
                "STATUS",
                "DAYS TO THRESHOLD",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    fontWeight: 500,
                    color: C.textMuted,
                    letterSpacing: "0.08em",
                    padding: "8px 12px",
                    textAlign: "left",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.flatMap(([modKey, mod]) =>
              mod.factors.map((f) => (
                <tr
                  key={f.id}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = C.sunken)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: C.textTertiary,
                      padding: "8px 12px",
                    }}
                  >
                    {MODULE_LABELS[modKey] ?? modKey}
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      color: C.textSecondary,
                      padding: "8px 12px",
                    }}
                  >
                    {f.name}
                  </td>
                  <td
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: C.accent,
                      padding: "8px 12px",
                    }}
                  >
                    {f.regulationRef}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: riskColor(f.status, C),
                        marginRight: 6,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color: riskColor(f.status, C),
                      }}
                    >
                      {f.status}
                    </span>
                  </td>
                  <td
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      fontWeight: 600,
                      color:
                        f.daysToThreshold !== null
                          ? f.daysToThreshold < 90
                            ? C.critical
                            : f.daysToThreshold < 365
                              ? C.warning
                              : C.textSecondary
                          : C.textMuted,
                      padding: "8px 12px",
                    }}
                  >
                    {f.daysToThreshold !== null ? `${f.daysToThreshold}d` : "—"}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Cascade Placeholder ──────────────────────────────────────────────────────

interface CascadeNode {
  id: string;
  framework: string;
  article: string;
  title: string;
  affectedModules: string[];
}

interface CascadeResult {
  trigger: string;
  changeType: string;
  affectedNodes: string[];
  affectedSatellites: Array<{
    noradId: string;
    name: string;
    currentScore: number | null;
    projectedScore: number | null;
    scoreDelta: number;
    affectedModules: string[];
    severity: string;
  }>;
  totalImpact: number;
  propagationPath: Array<{
    from: string;
    to: string;
    impact: number;
  }>;
}

function CascadeTab({
  noradId: _noradId,
  C,
}: {
  noradId: string;
  C: EphemerisColors;
}) {
  const [nodes, setNodes] = useState<CascadeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>("");
  const [changeType, setChangeType] = useState<string>("threshold_change");
  const [result, setResult] = useState<CascadeResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState(true);

  useEffect(() => {
    fetch("/api/v1/ephemeris/cascade", { headers: csrfHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.data?.nodes) {
          setNodes(data.data.nodes);
          if (data.data.nodes.length > 0) {
            setSelectedNode(data.data.nodes[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingNodes(false));
  }, []);

  const simulate = async () => {
    if (!selectedNode) return;
    setSimulating(true);
    setResult(null);
    try {
      const res = await fetch("/api/v1/ephemeris/cascade", {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          regulatoryNodeId: selectedNode,
          changeType,
          includeConflicts: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data.data);
      }
    } catch {
      // Silent
    } finally {
      setSimulating(false);
    }
  };

  const selectedNodeData = nodes.find((n) => n.id === selectedNode);

  // Group nodes by framework for the dropdown
  const frameworks = [...new Set(nodes.map((n) => n.framework))].sort();

  return (
    <div>
      {/* Controls */}
      <div
        style={{
          background: C.elevated,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: C.textTertiary,
            letterSpacing: "0.05em",
            marginBottom: 12,
          }}
        >
          CASCADE SIMULATION
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 200px auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          {/* Regulation selector */}
          <div>
            <label
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: C.textMuted,
                display: "block",
                marginBottom: 4,
              }}
            >
              REGULATION
            </label>
            <select
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
              disabled={loadingNodes}
              style={{
                width: "100%",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                padding: "8px 12px",
                borderRadius: 4,
                border: `1px solid ${C.border}`,
                background: C.sunken,
                color: C.textPrimary,
                appearance: "none",
              }}
            >
              {loadingNodes ? (
                <option>Loading...</option>
              ) : (
                frameworks.map((fw) => (
                  <optgroup key={fw} label={fw}>
                    {nodes
                      .filter((n) => n.framework === fw)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.article} — {n.title}
                        </option>
                      ))}
                  </optgroup>
                ))
              )}
            </select>
          </div>

          {/* Change type */}
          <div>
            <label
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: C.textMuted,
                display: "block",
                marginBottom: 4,
              }}
            >
              CHANGE TYPE
            </label>
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value)}
              style={{
                width: "100%",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                padding: "8px 12px",
                borderRadius: 4,
                border: `1px solid ${C.border}`,
                background: C.sunken,
                color: C.textPrimary,
                appearance: "none",
              }}
            >
              <option value="threshold_change">Threshold Change</option>
              <option value="new_requirement">New Requirement</option>
              <option value="deadline_change">Deadline Change</option>
              <option value="repeal">Repeal</option>
            </select>
          </div>

          {/* Simulate button */}
          <button
            onClick={simulate}
            disabled={simulating || !selectedNode}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              padding: "8px 20px",
              borderRadius: 4,
              border: `1px solid ${C.accent}`,
              background: simulating ? C.elevated : "transparent",
              color: simulating ? C.textMuted : C.accent,
              cursor: simulating ? "not-allowed" : "pointer",
            }}
          >
            {simulating ? "SIMULATING..." : "SIMULATE"}
          </button>
        </div>

        {/* Selected node info */}
        {selectedNodeData && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: C.sunken,
              borderRadius: 4,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: C.textTertiary,
            }}
          >
            {selectedNodeData.framework} · {selectedNodeData.article} · Modules:{" "}
            {selectedNodeData.affectedModules.join(", ") || "—"}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div>
          {/* Impact Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: C.elevated,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: C.textMuted,
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                TOTAL IMPACT
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 22,
                  fontWeight: 600,
                  color:
                    result.totalImpact < -5
                      ? C.critical
                      : result.totalImpact < 0
                        ? C.warning
                        : C.nominal,
                }}
              >
                {result.totalImpact > 0 ? "+" : ""}
                {result.totalImpact}
              </div>
            </div>
            <div
              style={{
                background: C.elevated,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: C.textMuted,
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                AFFECTED NODES
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 22,
                  fontWeight: 600,
                  color: C.textSecondary,
                }}
              >
                {result.affectedNodes.length}
              </div>
            </div>
            <div
              style={{
                background: C.elevated,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: C.textMuted,
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                SATELLITES AFFECTED
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 22,
                  fontWeight: 600,
                  color: C.textSecondary,
                }}
              >
                {result.affectedSatellites.length}
              </div>
            </div>
          </div>

          {/* Propagation Path */}
          {result.propagationPath.length > 0 && (
            <div
              style={{
                background: C.elevated,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${C.border}`,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: C.textTertiary,
                  letterSpacing: "0.05em",
                }}
              >
                PROPAGATION PATH
              </div>
              <div style={{ padding: 12 }}>
                {result.propagationPath.map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                      borderBottom:
                        i < result.propagationPath.length - 1
                          ? `1px solid ${C.border}`
                          : "none",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color: C.accent,
                        minWidth: 160,
                      }}
                    >
                      {step.from}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color: C.textMuted,
                      }}
                    >
                      →
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color: C.textSecondary,
                        minWidth: 160,
                      }}
                    >
                      {step.to}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color:
                          step.impact < -3
                            ? C.critical
                            : step.impact < 0
                              ? C.warning
                              : C.nominal,
                        marginLeft: "auto",
                      }}
                    >
                      {step.impact > 0 ? "+" : ""}
                      {step.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Satellite Impacts Table */}
          {result.affectedSatellites.length > 0 && (
            <div
              style={{
                background: C.elevated,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${C.border}`,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: C.textTertiary,
                  letterSpacing: "0.05em",
                }}
              >
                SATELLITE IMPACTS
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: C.sunken,
                    }}
                  >
                    {[
                      "SATELLITE",
                      "CURRENT",
                      "PROJECTED",
                      "DELTA",
                      "SEVERITY",
                      "MODULES",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10,
                          fontWeight: 500,
                          color: C.textMuted,
                          letterSpacing: "0.08em",
                          padding: "8px 12px",
                          textAlign: "left",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.affectedSatellites.map((sat) => (
                    <tr
                      key={sat.noradId}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = C.sunken)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 12,
                          color: C.textSecondary,
                          padding: "10px 12px",
                        }}
                      >
                        {sat.name}
                      </td>
                      <td
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 12,
                          color: C.textTertiary,
                          padding: "10px 12px",
                        }}
                      >
                        {sat.currentScore ?? "—"}
                      </td>
                      <td
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            sat.projectedScore !== null
                              ? scoreColor(sat.projectedScore, C)
                              : C.textMuted,
                          padding: "10px 12px",
                        }}
                      >
                        {sat.projectedScore ?? "—"}
                      </td>
                      <td
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            sat.scoreDelta < -5
                              ? C.critical
                              : sat.scoreDelta < 0
                                ? C.warning
                                : C.nominal,
                          padding: "10px 12px",
                        }}
                      >
                        {sat.scoreDelta > 0 ? "+" : ""}
                        {sat.scoreDelta}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: severityColor(sat.severity, C),
                            marginRight: 6,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 11,
                            color: severityColor(sat.severity, C),
                          }}
                        >
                          {sat.severity}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10,
                          color: C.textTertiary,
                          padding: "10px 12px",
                        }}
                      >
                        {sat.affectedModules.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Data Sources Tab ─────────────────────────────────────────────────────────

function DataSourcesTab({
  dataSources,
  dataFreshness,
  C,
  attestationCount = 0,
}: {
  dataSources: SatelliteState["dataSources"];
  dataFreshness: string;
  C: EphemerisColors;
  attestationCount?: number;
}) {
  const freshnessInfo = (() => {
    switch (dataFreshness) {
      case "LIVE":
        return { label: "LIVE (<1h)", color: C.nominal };
      case "RECENT":
        return { label: "RECENT (<24h)", color: C.watch };
      case "STALE":
        return { label: "STALE (>24h)", color: C.warning };
      default:
        return { label: "NO DATA", color: C.critical };
    }
  })();

  return (
    <div
      style={{
        background: C.elevated,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {/* Header with freshness */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: C.textTertiary,
            letterSpacing: "0.05em",
          }}
        >
          DATA SOURCES
        </span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: freshnessInfo.color,
          }}
        >
          ● {freshnessInfo.label}
        </span>
      </div>

      {/* Sources table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr
            style={{
              borderBottom: `1px solid ${C.border}`,
              background: C.sunken,
            }}
          >
            {["STATUS", "SOURCE", "LAST UPDATE", "CONNECTION"].map((h) => (
              <th
                key={h}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  fontWeight: 500,
                  color: C.textMuted,
                  letterSpacing: "0.08em",
                  padding: "8px 12px",
                  textAlign: "left",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(dataSources).map(([key, src]) => (
            <tr
              key={key}
              style={{
                borderBottom: `1px solid ${C.border}`,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = C.sunken)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <td style={{ padding: "10px 12px" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: src.connected
                      ? src.status === "error"
                        ? C.warning
                        : C.nominal
                      : C.critical,
                  }}
                />
              </td>
              <td
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: C.textSecondary,
                  padding: "10px 12px",
                }}
              >
                {SOURCE_LABELS[key] ?? key}
                {key === "verity" && attestationCount > 0 && (
                  <a
                    href="/dashboard/audit-center"
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 3,
                      background: "rgba(74,98,232,0.10)",
                      color: "#6E8BFA",
                      border: "1px solid rgba(74,98,232,0.15)",
                      textDecoration: "none",
                    }}
                  >
                    {attestationCount} active
                  </a>
                )}
              </td>
              <td
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: C.textTertiary,
                  padding: "10px 12px",
                }}
              >
                {src.lastUpdate
                  ? new Date(src.lastUpdate).toLocaleString()
                  : "Never"}
              </td>
              <td
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: src.connected ? C.nominal : C.critical,
                  padding: "10px 12px",
                }}
              >
                {src.connected ? "CONNECTED" : "DISCONNECTED"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
