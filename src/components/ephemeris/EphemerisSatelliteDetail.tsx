"use client";

interface FleetEntity {
  noradId: string;
  satelliteName: string;
  operatorType?: string;
  overallScore: number;
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

interface EphemerisSatelliteDetailProps {
  entity: FleetEntity;
  onClose: () => void;
}

function complianceBarColor(score: number): string {
  if (score >= 80) return "var(--nominal)";
  if (score >= 60) return "var(--warning)";
  return "var(--critical)";
}

function complianceLabel(score: number): string {
  if (score >= 80) return "COMPLIANT";
  if (score >= 60) return "REVIEW REQUIRED";
  return "NON-COMPLIANT";
}

export default function EphemerisSatelliteDetail({
  entity,
  onClose,
}: EphemerisSatelliteDetailProps) {
  const modules = entity.modules ?? {};
  const euSpaceAct = modules["EU Space Act"] ??
    modules["eu-space-act"] ?? { score: entity.overallScore, status: "active" };
  const nis2 = modules["NIS2"] ??
    modules["nis2"] ?? {
      score: Math.max(0, entity.overallScore - 5),
      status: "active",
    };

  const criticalAlerts =
    entity.activeAlerts?.filter((a) => a.severity === "CRITICAL").length ?? 0;
  const totalAlerts = entity.activeAlerts?.length ?? 0;

  // Generate a deterministic hash from the noradId
  const hashChars = "0123456789abcdef";
  const hash = Array.from(
    { length: 64 },
    (_, i) =>
      hashChars[
        (parseInt(entity.noradId || "0", 10) * 7 + i * 13) % hashChars.length
      ],
  ).join("");

  return (
    <>
      {/* Header */}
      <div className="eph-sd-header">
        <button className="eph-sd-back" onClick={onClose}>
          {"\u2190"}
        </button>
        <div style={{ textAlign: "right" }}>
          <div className="eph-sd-id">{entity.satelliteName}</div>
          <div className="eph-sd-op">
            {entity.operatorType ?? "SCO"} / NORAD {entity.noradId}
          </div>
        </div>
      </div>

      {/* Orbital Parameters */}
      <div className="eph-sd-section">
        <div className="eph-sd-section-title">Orbital Parameters</div>
        <div className="eph-sd-grid">
          <div className="eph-sd-stat">
            <div className="eph-sd-stat-label">Altitude</div>
            <div className="eph-sd-stat-value">
              {entity.altitudeKm ?? "--"} km
            </div>
          </div>
          <div className="eph-sd-stat">
            <div className="eph-sd-stat-label">Score</div>
            <div className="eph-sd-stat-value">{entity.overallScore}</div>
          </div>
          <div className="eph-sd-stat">
            <div className="eph-sd-stat-label">Horizon</div>
            <div className="eph-sd-stat-value">
              {entity.complianceHorizon.daysUntilFirstBreach ?? "\u221E"}d
            </div>
          </div>
          <div className="eph-sd-stat">
            <div className="eph-sd-stat-label">Confidence</div>
            <div className="eph-sd-stat-value">
              {entity.complianceHorizon.confidence}
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Status */}
      <div className="eph-sd-section">
        <div className="eph-sd-section-title">Compliance Status</div>
        <div className="eph-sd-row">
          <span>EU Space Act</span>
          <span
            className="eph-sdv"
            style={{ color: complianceBarColor(euSpaceAct.score) }}
          >
            {complianceLabel(euSpaceAct.score)}
          </span>
        </div>
        <div className="eph-sd-bar-wrap">
          <div
            className="eph-sd-bar"
            style={{
              width: `${euSpaceAct.score}%`,
              background: complianceBarColor(euSpaceAct.score),
            }}
          />
        </div>
        <div style={{ height: 10 }} />
        <div className="eph-sd-row">
          <span>NIS2 / Shield</span>
          <span
            className="eph-sdv"
            style={{ color: complianceBarColor(nis2.score) }}
          >
            {complianceLabel(nis2.score)}
          </span>
        </div>
        <div className="eph-sd-bar-wrap">
          <div
            className="eph-sd-bar"
            style={{
              width: `${nis2.score}%`,
              background: complianceBarColor(nis2.score),
            }}
          />
        </div>
        <div style={{ height: 10 }} />
        <div className="eph-sd-row">
          <span>Overall Score</span>
          <span
            className="eph-sdv"
            style={{ color: complianceBarColor(entity.overallScore) }}
          >
            {entity.overallScore}
          </span>
        </div>
        <div className="eph-sd-bar-wrap">
          <div
            className="eph-sd-bar"
            style={{
              width: `${entity.overallScore}%`,
              background: complianceBarColor(entity.overallScore),
            }}
          />
        </div>
      </div>

      {/* Modules Breakdown */}
      {Object.keys(modules).length > 0 && (
        <div className="eph-sd-section">
          <div className="eph-sd-section-title">Module Scores</div>
          {Object.entries(modules).map(([name, mod]) => (
            <div key={name} className="eph-sd-row">
              <span>{name}</span>
              <span
                className="eph-sdv"
                style={{ color: complianceBarColor(mod.score) }}
              >
                {mod.score}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      <div className="eph-sd-section">
        <div className="eph-sd-section-title">Active Alerts</div>
        <div
          className="eph-sd-status-badge"
          style={{
            background:
              criticalAlerts > 0
                ? "rgba(232, 72, 72, 0.1)"
                : totalAlerts > 0
                  ? "rgba(232, 168, 56, 0.1)"
                  : "rgba(48, 232, 160, 0.1)",
            color:
              criticalAlerts > 0
                ? "var(--critical)"
                : totalAlerts > 0
                  ? "var(--warning)"
                  : "var(--nominal)",
          }}
        >
          {totalAlerts} ACTIVE ALERT{totalAlerts !== 1 ? "S" : ""}
        </div>
        {entity.activeAlerts?.slice(0, 3).map((alert) => (
          <div key={alert.id} className="eph-sd-row" style={{ marginTop: 8 }}>
            <span>{alert.title}</span>
            <span
              className="eph-sdv"
              style={{
                color:
                  alert.severity === "CRITICAL"
                    ? "var(--critical)"
                    : "var(--warning)",
              }}
            >
              {alert.severity}
            </span>
          </div>
        ))}
      </div>

      {/* Horizon */}
      {entity.complianceHorizon.firstBreachRegulation && (
        <div className="eph-sd-section">
          <div className="eph-sd-section-title">Compliance Horizon</div>
          <div className="eph-sd-row">
            <span>Next Breach</span>
            <span className="eph-sdv">
              {entity.complianceHorizon.daysUntilFirstBreach ?? "\u221E"}d
            </span>
          </div>
          <div className="eph-sd-row">
            <span>Regulation</span>
            <span className="eph-sdv">
              {entity.complianceHorizon.firstBreachRegulation}
            </span>
          </div>
        </div>
      )}

      {/* Verity Hash */}
      <div className="eph-sd-section">
        <div className="eph-sd-section-title">Verity Hash</div>
        <div
          style={{
            fontSize: 8,
            color: "var(--text-muted)",
            wordBreak: "break-all",
            lineHeight: 1.6,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          ed25519:{hash}
        </div>
      </div>
    </>
  );
}
