"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import type { EphemerisColors } from "../../theme";
import type {
  ForecastData,
  SatelliteAlert,
  ModuleScore,
  HistoryPoint,
  TimeRange,
  ForecastCurve,
} from "./types";
import { TIME_RANGE_DAYS } from "./types";
import ForecastHeader from "./ForecastHeader";
import BreachSummaryBar from "./BreachSummaryBar";
import ForecastChart from "./ForecastChart";
import ComplianceTimeline from "./ComplianceTimeline";
import ModuleForecastTable from "./ModuleForecastTable";

interface ForecastTabProps {
  forecast: ForecastData | null;
  modules: Record<string, ModuleScore> | null;
  historyData: HistoryPoint[];
  alerts: SatelliteAlert[];
  noradId: string;
  calculatedAt: string | null;
  horizonDays: number | null;
  horizonRegulation: string | null;
  horizonConfidence: string;
  isRecalculating: boolean;
  onRecalculate: () => void;
  C: EphemerisColors;
}

export default function ForecastTab({
  forecast,
  modules,
  historyData: initialHistory,
  alerts,
  noradId,
  calculatedAt,
  horizonDays,
  horizonRegulation,
  horizonConfidence,
  isRecalculating,
  onRecalculate,
  C,
}: ForecastTabProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("90D");
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [historyData, setHistoryData] =
    useState<HistoryPoint[]>(initialHistory);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Auto-select first metric
  useEffect(() => {
    if (selectedMetric === null && forecast?.forecastCurves[0]?.metric) {
      setSelectedMetric(forecast.forecastCurves[0].metric);
    }
  }, [forecast, selectedMetric]);

  // Update history when initial data changes
  useEffect(() => {
    setHistoryData(initialHistory);
  }, [initialHistory]);

  // Refetch history when time range changes
  const fetchHistory = useCallback(
    async (range: TimeRange) => {
      setLoadingHistory(true);
      try {
        const days = TIME_RANGE_DAYS[range];
        const from = new Date(
          Date.now() - days * 24 * 60 * 60 * 1000,
        ).toISOString();
        const to = new Date().toISOString();
        const res = await fetch(
          `/api/v1/ephemeris/history?norad_id=${noradId}&from=${from}&to=${to}`,
          { headers: csrfHeaders() },
        );
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d.data)) {
            setHistoryData(
              d.data.map(
                (h: {
                  calculatedAt: string;
                  overallScore: number;
                  moduleScores?: Record<string, { score: number }>;
                }) => ({
                  calculatedAt: h.calculatedAt,
                  overallScore: h.overallScore,
                  moduleScores: h.moduleScores,
                }),
              ),
            );
          }
        }
      } catch {
        // Silent
      } finally {
        setLoadingHistory(false);
      }
    },
    [noradId],
  );

  const handleRangeChange = useCallback(
    (range: TimeRange) => {
      setSelectedRange(range);
      fetchHistory(range);
    },
    [fetchHistory],
  );

  const selectedCurve: ForecastCurve | undefined = useMemo(
    () => forecast?.forecastCurves.find((c) => c.metric === selectedMetric),
    [forecast, selectedMetric],
  );

  if (!forecast || forecast.forecastCurves.length === 0) {
    return (
      <div
        style={{
          padding: 60,
          textAlign: "center",
          color: C.textMuted,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 12,
          letterSpacing: "0.08em",
        }}
      >
        NO FORECAST DATA AVAILABLE
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Row 1: Header — Time range selector + Recalculate */}
      <ForecastHeader
        selectedRange={selectedRange}
        onRangeChange={handleRangeChange}
        onRecalculate={onRecalculate}
        isRecalculating={isRecalculating || loadingHistory}
        calculatedAt={calculatedAt}
        C={C}
      />

      {/* Row 2: Breach Summary Bar */}
      <BreachSummaryBar
        horizonDays={horizonDays}
        horizonRegulation={horizonRegulation}
        horizonConfidence={horizonConfidence}
        C={C}
      />

      {/* Row 3: Curve Selector (pill buttons) */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {forecast.forecastCurves.map((c) => {
          const isActive = selectedMetric === c.metric;
          const hasBreach = c.crossingDaysFromNow !== null;
          return (
            <button
              key={c.metric}
              onClick={() => setSelectedMetric(c.metric)}
              style={{
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                padding: "7px 14px",
                borderRadius: 8,
                border: `1px solid ${isActive ? C.accent + "40" : C.border}`,
                background: isActive ? `${C.accent}08` : "transparent",
                color: isActive ? C.accent : C.textTertiary,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {c.regulationName}
              {hasBreach && (
                <span
                  style={{
                    marginLeft: 8,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: `${C.warning}15`,
                    color: C.warning,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {c.crossingDaysFromNow}d
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Row 4: Chart + Timeline side-by-side */}
      {selectedCurve && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <ForecastChart
            curve={selectedCurve}
            historyData={historyData}
            C={C}
          />
          <ComplianceTimeline
            events={forecast.complianceEvents}
            alerts={alerts}
            C={C}
          />
        </div>
      )}

      {/* Row 5: Module Forecast Table */}
      {modules && (
        <ModuleForecastTable
          modules={modules}
          historyData={historyData}
          C={C}
        />
      )}
    </div>
  );
}
