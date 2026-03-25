"use client";

import React, { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useForgeTheme, MONO_FONT } from "../../../theme";
import type { ResultNodeData, SimulationResults } from "../types";

// ─── Severity Mapping ────────────────────────────────────────────────────────

type Severity = SimulationResults["overallSeverity"];

const SEVERITY_LABEL: Record<Severity, string> = {
  LOW: "NOMINAL",
  MEDIUM: "WATCH",
  HIGH: "WARNING",
  CRITICAL: "CRITICAL",
};

// ─── Component ───────────────────────────────────────────────────────────────

function ResultNode({ data }: NodeProps) {
  const { forge, glass, isDark } = useForgeTheme();
  const d = data as unknown as ResultNodeData;
  const [expanded, setExpanded] = useState(false);

  const sevColorMap: Record<Severity, string> = {
    LOW: forge.nominal,
    MEDIUM: forge.watch,
    HIGH: forge.warning,
    CRITICAL: forge.critical,
  };

  const { aggregatedResult: res } = d;
  const severity = res?.overallSeverity ?? null;
  const sevColor = severity ? sevColorMap[severity] : forge.textMuted;
  const isCritical = severity === "CRITICAL";

  const deltaText =
    res !== null && res !== undefined
      ? `${res.totalHorizonDelta >= 0 ? "+" : ""}${res.totalHorizonDelta}d`
      : "--";
  const regsCount =
    res !== null && res !== undefined ? res.allAffectedRegulations.length : 0;

  const borderSep = isDark
    ? "1px solid rgba(255,255,255,0.04)"
    : "1px solid rgba(0,0,0,0.06)";

  return (
    <div
      className={`forge-node-spawn${isCritical ? " forge-critical-pulse" : ""}`}
      style={{
        width: expanded ? 200 : 160,
        background: isDark ? glass.bg : "rgba(248,248,248,0.8)",
        backdropFilter: `blur(${glass.blur}px)`,
        WebkitBackdropFilter: `blur(${glass.blur}px)`,
        borderLeft: `4px solid ${sevColor}`,
        borderTop: `1px solid ${glass.border}`,
        borderRight: `1px solid ${glass.border}`,
        borderBottom: `1px solid ${glass.border}`,
        borderRadius: 12,
        boxShadow: glass.shadow,
        padding: "10px 12px",
        cursor: res ? "pointer" : "default",
        transition: "width 200ms ease, box-shadow 200ms ease",
        position: "relative",
      }}
      onClick={() => res && setExpanded((e) => !e)}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 10,
          height: 10,
          background: forge.edgeIdle,
          border: isDark
            ? "2px solid #0A0A0F"
            : "2px solid rgba(255,255,255,0.9)",
          outline: `2px solid ${forge.edgeIdle}`,
          borderRadius: "50%",
        }}
      />

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
            fontFamily: MONO_FONT,
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
            fontFamily: MONO_FONT,
            fontSize: 10,
            fontWeight: 600,
            color: forge.textMuted,
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
            fontFamily: MONO_FONT,
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
        <div
          style={{
            borderTop: borderSep,
            marginTop: 8,
            paddingTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {/* Cost */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: forge.textMuted,
              }}
            >
              COST
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 11,
                fontWeight: 600,
                color: forge.textSecondary,
              }}
            >
              ${(res.totalCostEstimate.financialUsd / 1000).toFixed(0)}k
            </span>
          </div>

          {/* Fuel */}
          {res.totalCostEstimate.fuelKg > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: forge.textMuted,
                }}
              >
                FUEL
              </span>
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 11,
                  fontWeight: 600,
                  color: forge.textSecondary,
                }}
              >
                {res.totalCostEstimate.fuelKg.toFixed(1)}kg
              </span>
            </div>
          )}

          {/* Per-step breakdown */}
          {res.stepResults.map((step, i) => (
            <div
              key={step.blockInstanceId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 0",
              }}
            >
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 9,
                  fontWeight: 600,
                  color: forge.textMuted,
                  width: 12,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 9,
                  fontWeight: 500,
                  color: forge.textSecondary,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {step.scenarioType}
              </span>
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                  color: step.horizonDelta < 0 ? forge.critical : forge.nominal,
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

export default memo(ResultNode);
