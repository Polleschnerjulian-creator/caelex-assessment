"use client";

import React, { memo, useState, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { FORGE, GLASS } from "../../../theme";
import type { ResultNodeData, SimulationResults } from "../types";

// ─── Severity Mapping ────────────────────────────────────────────────────────

type Severity = SimulationResults["overallSeverity"];

const SEVERITY_COLOR: Record<Severity, string> = {
  LOW: FORGE.nominal,
  MEDIUM: FORGE.watch,
  HIGH: FORGE.warning,
  CRITICAL: FORGE.critical,
};

const SEVERITY_LABEL: Record<Severity, string> = {
  LOW: "NOMINAL",
  MEDIUM: "WATCH",
  HIGH: "WARNING",
  CRITICAL: "CRITICAL",
};

// ─── Sparkline ───────────────────────────────────────────────────────────────

function ComplianceSparkline({
  steps,
  color,
}: {
  steps: SimulationResults["stepResults"];
  color: string;
}) {
  const points = steps.map((s, i) => ({
    x: i,
    y: s.projectedHorizon,
  }));
  if (points.length === 0) return null;
  const maxY = Math.max(...points.map((p) => p.y), 1);
  const w = 160;
  const h = 28;
  const path = points
    .map((p, i) => {
      const px = (p.x / Math.max(points.length - 1, 1)) * w;
      const py = h - (p.y / maxY) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${px},${py}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} style={{ display: "block", marginTop: 6 }}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

function ResultNode({ data }: NodeProps) {
  const d = data as unknown as ResultNodeData;
  const [expanded, setExpanded] = useState(false);

  const { computeState, aggregatedResult: res } = d;
  const severity = res?.overallSeverity ?? null;
  const sevColor = severity ? SEVERITY_COLOR[severity] : FORGE.textMuted;

  const borderStyle = useMemo<React.CSSProperties>(() => {
    if (computeState === "error") {
      return { border: `2px solid ${FORGE.critical}` };
    }
    if (computeState === "computing") {
      return {
        border: `1px solid ${GLASS.border}`,
        animation: "forge-shimmer 1.5s ease-in-out infinite",
      };
    }
    if (computeState === "idle" || !res) {
      return { border: `1px solid ${GLASS.border}` };
    }
    // done
    return { border: `2px solid ${sevColor}` };
  }, [computeState, res, sevColor]);

  const bgTint = useMemo(() => {
    if (computeState !== "done" || !severity) return "rgba(248,248,248,0.8)";
    return sevColor + "18"; // severity tint over glass
  }, [computeState, severity, sevColor]);

  const nodeContainerStyle: React.CSSProperties = {
    width: 200,
    minHeight: 140,
    background: bgTint,
    backdropFilter: `blur(${GLASS.blur}px)`,
    WebkitBackdropFilter: `blur(${GLASS.blur}px)`,
    borderRadius: GLASS.nodeRadius,
    boxShadow: `${GLASS.shadow}, ${GLASS.insetGlow}`,
    padding: 14,
    position: "relative",
    cursor: res ? "pointer" : "default",
    transition: "box-shadow 200ms ease, border-color 200ms ease",
    ...borderStyle,
  };

  const isCritical = computeState === "done" && severity === "CRITICAL";

  // Format helpers
  const deltaText =
    res !== null && res !== undefined
      ? `${res.totalHorizonDelta >= 0 ? "+" : ""}${res.totalHorizonDelta}d`
      : "--";
  const regsCount =
    res !== null && res !== undefined
      ? res.allAffectedRegulations.length
      : "--";
  const costText =
    res !== null && res !== undefined
      ? `$${(res.totalCostEstimate.financialUsd / 1000).toFixed(0)}k`
      : "--";

  return (
    <div
      className={isCritical ? "forge-critical-pulse" : undefined}
      style={nodeContainerStyle}
      onClick={() => res && setExpanded((e) => !e)}
    >
      {/* Input handle */}
      <Handle type="target" position={Position.Left} style={handleStyle} />

      {/* Header */}
      <div style={headerStyle}>
        <BarChart3 size={12} color={sevColor} strokeWidth={2.5} />
        <span style={headerLabelStyle}>RESULT</span>
      </div>

      {/* Computing shimmer */}
      {computeState === "computing" && (
        <div style={shimmerStyle}>Computing...</div>
      )}

      {/* Error state */}
      {computeState === "error" && (
        <div style={errorStyle}>
          <AlertTriangle size={16} color={FORGE.critical} />
          <span style={{ color: FORGE.critical, fontSize: 11 }}>Error</span>
        </div>
      )}

      {/* Main delta display */}
      {(computeState === "done" || computeState === "idle") && (
        <>
          <div style={deltaSection}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1,
                color: sevColor,
              }}
            >
              {deltaText}
            </span>
            <span style={deltaLabelStyle}>TOTAL {"\u0394"}H</span>
          </div>

          {/* Severity badge */}
          {severity && (
            <div
              style={{
                ...badgeStyle,
                background: sevColor + "1A",
                color: sevColor,
              }}
            >
              {SEVERITY_LABEL[severity]}
            </div>
          )}

          {/* Metrics */}
          <div style={metricsRow}>
            <div style={metricBlock}>
              <span style={metricLabel}>REGS</span>
              <span style={metricValue}>{regsCount}</span>
            </div>
            <div style={{ ...metricBlock, alignItems: "flex-end" }}>
              <span style={metricLabel}>COST</span>
              <span style={metricValue}>{costText}</span>
            </div>
          </div>

          {/* Expanded details */}
          {expanded && res && (
            <div style={expandedSection}>
              <ComplianceSparkline steps={res.stepResults} color={sevColor} />
              {res.stepResults.map((step, i) => (
                <div key={step.blockInstanceId} style={detailRow}>
                  <span style={detailIndex}>{i + 1}</span>
                  <span style={detailType}>{step.scenarioType}</span>
                  <span
                    style={{
                      ...detailDelta,
                      color:
                        step.horizonDelta < 0 ? FORGE.critical : FORGE.nominal,
                    }}
                  >
                    {step.horizonDelta >= 0 ? "+" : ""}
                    {step.horizonDelta}d
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Inject keyframes */}
      <style>{`
        .forge-critical-pulse {
          animation: critical-pulse 2s ease-in-out infinite;
        }
        @keyframes critical-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          50% { box-shadow: 0 0 12px 4px rgba(220, 38, 38, 0.25); }
        }
        @keyframes forge-shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const MONO = "'IBM Plex Mono', monospace";

const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: FORGE.edgeIdle,
  border: "2px solid rgba(255,255,255,0.9)",
  outline: `2px solid ${FORGE.edgeIdle}`,
  borderRadius: "50%",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  marginBottom: 10,
};

const headerLabelStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: FORGE.textTertiary,
};

const shimmerStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  color: FORGE.textMuted,
  textAlign: "center",
  padding: "20px 0",
  animation: "forge-shimmer 1.5s ease-in-out infinite",
};

const errorStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  padding: "16px 0",
};

const deltaSection: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "4px 0 8px",
};

const deltaLabelStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.06em",
  color: FORGE.textMuted,
  marginTop: 4,
};

const badgeStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textAlign: "center",
  padding: "3px 8px",
  borderRadius: 4,
  marginBottom: 10,
};

const metricsRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  borderTop: "1px solid rgba(0,0,0,0.06)",
  paddingTop: 8,
};

const metricBlock: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const metricLabel: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.06em",
  color: FORGE.textMuted,
};

const metricValue: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 12,
  fontWeight: 600,
  color: FORGE.textSecondary,
};

const expandedSection: React.CSSProperties = {
  borderTop: "1px solid rgba(0,0,0,0.06)",
  marginTop: 8,
  paddingTop: 8,
};

const detailRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 0",
};

const detailIndex: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 600,
  color: FORGE.textMuted,
  width: 14,
  flexShrink: 0,
};

const detailType: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 500,
  color: FORGE.textSecondary,
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const detailDelta: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 700,
  flexShrink: 0,
};

export default memo(ResultNode);
