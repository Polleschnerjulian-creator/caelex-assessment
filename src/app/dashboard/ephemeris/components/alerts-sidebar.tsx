"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Color System ─────────────────────────────────────────────────────────────

const C = {
  bg: "#0d1117",
  elevated: "#161b22",
  sunken: "#0a0e16",
  border: "#21262d",
  borderActive: "#30363d",
  textPrimary: "#e6edf3",
  textSecondary: "#c9d1d9",
  textTertiary: "#8b949e",
  textMuted: "#484f58",
  nominal: "#3fb950",
  watch: "#d29922",
  warning: "#f0883e",
  critical: "#f85149",
  accent: "#58a6ff",
};

function severityColor(severity: string): string {
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
  /** Pre-loaded alerts from parent (optional — sidebar can fetch its own) */
  alerts?: AlertItem[];
  /** Filter to a specific satellite */
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

      // Load anomalies
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

      // Load alerts if not provided via props
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

  if (collapsed) {
    return (
      <div
        style={{
          width: 40,
          minHeight: "100%",
          background: C.sunken,
          borderLeft: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 12,
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          style={{
            background: "transparent",
            border: "none",
            color: C.textTertiary,
            cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            padding: 4,
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            letterSpacing: "0.1em",
          }}
        >
          ALERTS
        </button>
        {criticalCount > 0 && (
          <span
            style={{
              background: C.critical,
              color: "#fff",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              borderRadius: "50%",
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {criticalCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width: 300,
        minHeight: "100%",
        background: C.sunken,
        borderLeft: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
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
          ALERTS & ANOMALIES
        </span>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: "transparent",
            border: "none",
            color: C.textMuted,
            cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14,
            padding: "2px 6px",
          }}
        >
          →
        </button>
      </div>

      {/* Section Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {(["alerts", "anomalies"] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            style={{
              flex: 1,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.06em",
              padding: "8px 0",
              border: "none",
              borderBottom:
                activeSection === section
                  ? `2px solid ${C.accent}`
                  : "2px solid transparent",
              background: "transparent",
              color: activeSection === section ? C.textPrimary : C.textMuted,
              cursor: "pointer",
            }}
          >
            {section.toUpperCase()} (
            {section === "alerts" ? alerts.length : anomalies.length})
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 8,
        }}
      >
        {loading && (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: C.textMuted,
            }}
          >
            LOADING...
          </div>
        )}

        {!loading && activeSection === "alerts" && (
          <>
            {sortedAlerts.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: C.textMuted,
                }}
              >
                NO ACTIVE ALERTS
              </div>
            ) : (
              sortedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: "10px 12px",
                    borderBottom: `1px solid ${C.border}`,
                    borderLeft: `3px solid ${severityColor(alert.severity)}`,
                    marginBottom: 4,
                    borderRadius: 2,
                    background: C.elevated,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        color: severityColor(alert.severity),
                        fontWeight: 600,
                      }}
                    >
                      {alert.severity}
                    </span>
                    {alert.satelliteName && (
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10,
                          color: C.textMuted,
                        }}
                      >
                        {alert.satelliteName}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textSecondary,
                      marginBottom: 2,
                      lineHeight: 1.3,
                    }}
                  >
                    {alert.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.textTertiary,
                      lineHeight: 1.3,
                    }}
                  >
                    {alert.message ?? alert.description}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {!loading && activeSection === "anomalies" && (
          <>
            {sortedAnomalies.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: C.textMuted,
                }}
              >
                NO ANOMALIES DETECTED
              </div>
            ) : (
              sortedAnomalies.map((anomaly, i) => (
                <div
                  key={`${anomaly.satellite}-${anomaly.type}-${i}`}
                  style={{
                    padding: "10px 12px",
                    borderBottom: `1px solid ${C.border}`,
                    borderLeft: `3px solid ${severityColor(anomaly.severity)}`,
                    marginBottom: 4,
                    borderRadius: 2,
                    background: C.elevated,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        color: severityColor(anomaly.severity),
                        fontWeight: 600,
                      }}
                    >
                      {anomaly.type}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        color: C.textMuted,
                      }}
                    >
                      {anomaly.satelliteName}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textSecondary,
                      lineHeight: 1.3,
                    }}
                  >
                    {anomaly.description}
                  </div>
                  {anomaly.metric && anomaly.value !== undefined && (
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        color: C.textMuted,
                        marginTop: 4,
                      }}
                    >
                      {anomaly.metric}: {anomaly.value}
                    </div>
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
