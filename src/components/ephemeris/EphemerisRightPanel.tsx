"use client";

interface FleetEntity {
  noradId: string;
  satelliteName: string;
  operatorType?: string;
  overallScore: number;
  altitudeKm?: number;
  activeAlerts: Array<{ severity: string }>;
  modules?: Record<string, { score: number; status: string }>;
}

interface FleetIntelligence {
  fleetScore: number;
  fleetSize: number;
  horizon: {
    earliestBreachDays: number | null;
    earliestBreachRegulation: string | null;
  };
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--nominal)";
  if (score >= 60) return "var(--warning)";
  return "var(--critical)";
}

function scoreCategory(score: number): string {
  if (score >= 85) return "NOMINAL";
  if (score >= 70) return "WATCH";
  if (score >= 50) return "WARNING";
  return "CRITICAL";
}

interface EphemerisRightPanelProps {
  fleet: FleetEntity[];
  intel: FleetIntelligence | null;
  selectedEntity: string | null;
  onEntitySelect: (noradId: string) => void;
}

export default function EphemerisRightPanel({
  fleet,
  intel,
  selectedEntity,
  onEntitySelect,
}: EphemerisRightPanelProps) {
  const totalAlerts = fleet.reduce(
    (s, f) => s + (f.activeAlerts?.length ?? 0),
    0,
  );

  return (
    <div className="eph-right-panel">
      {/* Fleet Status Section */}
      <div className="eph-panel-section">
        <div className="eph-panel-title">Fleet Status</div>
        <div className="eph-data-row">
          <span>FLEET SCORE</span>
          <span className="eph-val">{intel?.fleetScore ?? "--"}</span>
        </div>
        <div className="eph-data-row">
          <span>ENTITIES</span>
          <span className="eph-val">{fleet.length}</span>
        </div>
        <div className="eph-data-row">
          <span>ALERTS</span>
          <span className="eph-val">{totalAlerts}</span>
        </div>
        <div className="eph-data-row">
          <span>HORIZON</span>
          <span className="eph-val">
            {intel?.horizon.earliestBreachDays != null
              ? `${intel.horizon.earliestBreachDays}d`
              : "\u221E"}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="eph-panel-section">
        <div className="eph-panel-title">Tracked Objects</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <div className="eph-metric-card" style={{ flex: 1 }}>
            <div className="eph-metric-label">Objects</div>
            <div className="eph-metric-value">{fleet.length}</div>
          </div>
          <div className="eph-metric-card" style={{ flex: 1 }}>
            <div className="eph-metric-label">Links</div>
            <div className="eph-metric-value">
              {Math.max(0, fleet.length - 1)}
            </div>
          </div>
        </div>
      </div>

      {/* Operators / Entities */}
      <div className="eph-panel-section">
        <div className="eph-panel-title">Operators</div>
        <div>
          {fleet.length === 0 ? (
            <div
              style={{
                fontSize: 9,
                color: "var(--text-dim)",
                letterSpacing: 1,
              }}
            >
              No entities tracked
            </div>
          ) : (
            fleet.slice(0, 12).map((entity) => {
              const isActive = selectedEntity === entity.noradId;
              const dotColor = scoreColor(entity.overallScore);
              return (
                <div
                  key={entity.noradId}
                  className={`eph-op-item ${isActive ? "active" : ""}`}
                  onClick={() => onEntitySelect(entity.noradId)}
                  style={
                    isActive
                      ? ({ "--c": dotColor } as React.CSSProperties)
                      : undefined
                  }
                >
                  <div className="eph-op-name">{entity.satelliteName}</div>
                  <div className="eph-op-meta">
                    {entity.operatorType ?? "SCO"} /{" "}
                    {scoreCategory(entity.overallScore)}
                  </div>
                  <div
                    className="eph-op-dot"
                    style={{ background: dotColor }}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Compliance Status */}
      <div className="eph-panel-section">
        <div className="eph-panel-title">Compliance Status</div>
        <div className="eph-metric-card">
          <div className="eph-metric-label">Fleet Score</div>
          <div
            className="eph-metric-value"
            style={{
              color:
                (intel?.fleetScore ?? 0) >= 80
                  ? "var(--nominal)"
                  : "var(--warning)",
            }}
          >
            {intel?.fleetScore ?? "--"}
          </div>
          <div className="eph-metric-sub">
            {fleet.length} entities monitored
          </div>
        </div>
        {intel?.horizon.earliestBreachRegulation && (
          <div className="eph-metric-card">
            <div className="eph-metric-label">Nearest Breach</div>
            <div
              className="eph-metric-value"
              style={{
                color:
                  (intel.horizon.earliestBreachDays ?? 999) < 90
                    ? "var(--critical)"
                    : "var(--warning)",
              }}
            >
              {intel.horizon.earliestBreachDays ?? "\u221E"}d
            </div>
            <div className="eph-metric-sub">
              {intel.horizon.earliestBreachRegulation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
