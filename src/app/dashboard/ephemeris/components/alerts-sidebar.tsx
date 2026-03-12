"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Color Helpers ───────────────────────────────────────────────────────────

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

function severityBorderClass(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "border-l-red-500";
    case "HIGH":
      return "border-l-orange-500";
    case "MEDIUM":
      return "border-l-amber-500";
    default:
      return "border-l-slate-600";
  }
}

function severityOrder(severity: string): number {
  switch (severity) {
    case "CRITICAL":
      return 0;
    case "HIGH":
      return 1;
    case "MEDIUM":
      return 2;
    default:
      return 3;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlertItem {
  id: string;
  noradId: string;
  satelliteName?: string;
  type: string;
  severity: string;
  title: string;
  message?: string;
  description?: string;
  createdAt?: string;
}

interface AnomalyItem {
  satellite: string;
  satelliteName: string;
  type: string;
  severity: string;
  description: string;
  metric?: string;
  value?: number;
  detectedAt?: string;
}

interface AlertsSidebarProps {
  alerts?: AlertItem[];
  noradId?: string;
}

// ─── Sidebar Component ────────────────────────────────────────────────────────

export default function AlertsSidebar({
  alerts: propAlerts,
  noradId,
}: AlertsSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<"alerts" | "anomalies">(
    "alerts",
  );
  const [alerts, setAlerts] = useState<AlertItem[]>(propAlerts ?? []);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(!propAlerts);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = noradId ? `?norad_id=${noradId}` : "";

      const anomalyRes = await fetch(
        `/api/v1/ephemeris/anomalies${params}&lookback_days=30`,
        { headers: csrfHeaders() },
      );
      if (anomalyRes.ok) {
        const data = await anomalyRes.json();
        if (data.data?.anomalies) {
          setAnomalies(data.data.anomalies);
        }
      }

      if (!propAlerts) {
        const alertRes = await fetch(`/api/v1/ephemeris/fleet`, {
          headers: csrfHeaders(),
        });
        if (alertRes.ok) {
          const data = await alertRes.json();
          if (Array.isArray(data.data)) {
            const allAlerts: AlertItem[] = [];
            for (const sat of data.data) {
              if (sat.activeAlerts) {
                for (const alert of sat.activeAlerts) {
                  allAlerts.push({
                    ...alert,
                    noradId: sat.noradId,
                    satelliteName: sat.satelliteName,
                  });
                }
              }
            }
            setAlerts(allAlerts);
          }
        }
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [noradId, propAlerts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (propAlerts) setAlerts(propAlerts);
  }, [propAlerts]);

  const sortedAlerts = [...alerts].sort(
    (a, b) => severityOrder(a.severity) - severityOrder(b.severity),
  );

  const sortedAnomalies = [...anomalies].sort(
    (a, b) => severityOrder(a.severity) - severityOrder(b.severity),
  );

  const criticalCount =
    alerts.filter((a) => a.severity === "CRITICAL").length +
    anomalies.filter((a) => a.severity === "CRITICAL").length;

  // ── Collapsed State ──────────────────────────────────────────

  if (collapsed) {
    return (
      <div className="w-10 min-h-full bg-[var(--glass-bg)] border-l border-[var(--glass-border)] flex flex-col items-center pt-3 gap-2 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
        >
          <ChevronRight size={14} className="rotate-180" />
        </button>
        <span className="text-micro text-slate-500 uppercase tracking-widest [writing-mode:vertical-rl] [text-orientation:mixed]">
          Alerts
        </span>
        {criticalCount > 0 && (
          <span className="bg-red-500 text-white text-micro font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {criticalCount}
          </span>
        )}
      </div>
    );
  }

  // ── Expanded State ───────────────────────────────────────────

  return (
    <div className="w-[300px] min-h-full bg-[var(--glass-bg)] border-l border-[var(--glass-border)] flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--glass-border)]">
        <span className="text-caption text-slate-400 uppercase tracking-wider font-medium">
          Alerts & Anomalies
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded hover:bg-white/5"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-[var(--glass-border)]">
        {(["alerts", "anomalies"] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`flex-1 text-caption uppercase tracking-wider py-2 transition-all duration-200 border-b-2 -mb-px ${
              activeSection === section
                ? "border-emerald-500 text-white"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {section} ({section === "alerts" ? alerts.length : anomalies.length}
            )
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading && (
          <div className="py-10 text-center text-caption text-slate-500">
            Loading...
          </div>
        )}

        {!loading && activeSection === "alerts" && (
          <>
            {sortedAlerts.length === 0 ? (
              <div className="py-10 text-center text-caption text-slate-500">
                No active alerts
              </div>
            ) : (
              sortedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] border-l-[3px] ${severityBorderClass(alert.severity)}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-caption font-semibold ${severityColorClass(alert.severity)}`}
                    >
                      {alert.severity}
                    </span>
                    {alert.satelliteName && (
                      <span className="text-caption text-slate-500">
                        {alert.satelliteName}
                      </span>
                    )}
                  </div>
                  <p className="text-small text-slate-300 leading-snug mb-0.5">
                    {alert.title}
                  </p>
                  <p className="text-caption text-slate-500 leading-snug">
                    {alert.message ?? alert.description}
                  </p>
                </div>
              ))
            )}
          </>
        )}

        {!loading && activeSection === "anomalies" && (
          <>
            {sortedAnomalies.length === 0 ? (
              <div className="py-10 text-center text-caption text-slate-500">
                No anomalies detected
              </div>
            ) : (
              sortedAnomalies.map((anomaly, i) => (
                <div
                  key={`${anomaly.satellite}-${anomaly.type}-${i}`}
                  className={`p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] border-l-[3px] ${severityBorderClass(anomaly.severity)}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-caption font-semibold ${severityColorClass(anomaly.severity)}`}
                    >
                      {anomaly.type}
                    </span>
                    <span className="text-caption text-slate-500">
                      {anomaly.satelliteName}
                    </span>
                  </div>
                  <p className="text-small text-slate-300 leading-snug">
                    {anomaly.description}
                  </p>
                  {anomaly.metric && anomaly.value !== undefined && (
                    <p className="text-caption text-slate-500 font-mono mt-1">
                      {anomaly.metric}: {anomaly.value}
                    </p>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
