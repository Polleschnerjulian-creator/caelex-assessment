"use client";

import React, { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
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

// ─── Component ───────────────────────────────────────────────────────────────

function ResultNode({ data }: NodeProps) {
  const d = data as unknown as ResultNodeData;
  const [expanded, setExpanded] = useState(false);

  const { aggregatedResult: res } = d;
  const severity = res?.overallSeverity ?? null;
  const sevColor = severity ? SEVERITY_COLOR[severity] : FORGE.textMuted;
  const isCritical = severity === "CRITICAL";

  const deltaText =
    res !== null && res !== undefined
      ? `${res.totalHorizonDelta >= 0 ? "+" : ""}${res.totalHorizonDelta}d`
      : "--";
  const regsCount =
    res !== null && res !== undefined ? res.allAffectedRegulations.length : 0;

  return (
    <div
      className={`forge-node-spawn${isCritical ? " forge-critical-pulse" : ""}`}
      style={{
        width: expanded ? 200 : 160,
        background: "rgba(248,248,248,0.8)",
        backdropFilter: `blur(${GLASS.blur}px)`,
        WebkitBackdropFilter: `blur(${GLASS.blur}px)`,
        borderLeft: `4px solid ${sevColor}`,
        borderTop: `1px solid ${GLASS.border}`,
        borderRight: `1px solid ${GLASS.border}`,
        borderBottom: `1px solid ${GLASS.border}`,
        borderRadius: 12,
        boxShadow: GLASS.shadow,
        padding: "10px 12px",
        cursor: res ? "pointer" : "default",
        transition: "width 200ms ease, box-shadow 200ms ease",
        position: "relative",
      }}
      onClick={() => res && setExpanded((e) => !e)}
    >
      {/* Input handle */}
      <Handle type="target" position={Position.Left} style={handleStyle} />

      {/* Compact: delta + reg count */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1,
            color: sevColor,
          }}
        >
          {deltaText}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 600,
            color: FORGE.textMuted,
            whiteSpace: "nowrap",
          }}
        >
          {regsCount} REGS
        </span>
      </div>

      {/* Severity label */}
      {severity && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: sevColor,
            marginTop: 6,
          }}
        >
          {SEVERITY_LABEL[severity]}
        </div>
      )}

      {/* Expanded details */}
      {expanded && res && (
        <div style={expandedSection}>
          {/* Cost */}
          <div style={expandedRow}>
            <span style={expandedLabel}>COST</span>
            <span style={expandedValue}>
              ${(res.totalCostEstimate.financialUsd / 1000).toFixed(0)}k
            </span>
          </div>

          {/* Fuel */}
          {res.totalCostEstimate.fuelKg > 0 && (
            <div style={expandedRow}>
              <span style={expandedLabel}>FUEL</span>
              <span style={expandedValue}>
                {res.totalCostEstimate.fuelKg.toFixed(1)}kg
              </span>
            </div>
          )}

          {/* Per-step breakdown */}
          {res.stepResults.map((step, i) => (
            <div key={step.blockInstanceId} style={stepRow}>
              <span style={stepIndex}>{i + 1}</span>
              <span style={stepType}>{step.scenarioType}</span>
              <span
                style={{
                  ...stepDelta,
                  color: step.horizonDelta < 0 ? FORGE.critical : FORGE.nominal,
                }}
              >
                {step.horizonDelta >= 0 ? "+" : ""}
                {step.horizonDelta}d
              </span>
            </div>
          ))}
        </div>
      )}
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

const expandedSection: React.CSSProperties = {
  borderTop: "1px solid rgba(0,0,0,0.06)",
  marginTop: 8,
  paddingTop: 8,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const expandedRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const expandedLabel: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.06em",
  color: FORGE.textMuted,
};

const expandedValue: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  fontWeight: 600,
  color: FORGE.textSecondary,
};

const stepRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 0",
};

const stepIndex: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 600,
  color: FORGE.textMuted,
  width: 12,
  flexShrink: 0,
};

const stepType: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 500,
  color: FORGE.textSecondary,
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const stepDelta: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 700,
  flexShrink: 0,
};

export default memo(ResultNode);
