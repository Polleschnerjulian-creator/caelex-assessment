"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Satellite } from "lucide-react";
import { FORGE, GLASS } from "../../../theme";
import type { SatelliteOriginData } from "../types";

function getScoreColor(score: number): string {
  if (score >= 85) return FORGE.nominal;
  if (score >= 70) return FORGE.watch;
  if (score >= 50) return FORGE.warning;
  return FORGE.critical;
}

function getScoreLabel(score: number): string {
  if (score >= 85) return "NOMINAL";
  if (score >= 70) return "WATCH";
  if (score >= 50) return "WARNING";
  return "CRITICAL";
}

function SatelliteOriginNode({ data }: NodeProps) {
  const d = data as unknown as SatelliteOriginData;
  const score = d.overallScore;
  const scoreColor = score !== null ? getScoreColor(score) : FORGE.textMuted;
  const scoreLabel = score !== null ? getScoreLabel(score) : "—";
  const horizonText = d.horizonDays !== null ? `${d.horizonDays}d` : "—";
  const weakestText = d.weakestModule ?? "—";

  return (
    <div className="forge-node-spawn" style={nodeStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <Satellite
            size={14}
            color={FORGE.originBorder}
            strokeWidth={2}
            style={{ flexShrink: 0 }}
          />
          <span style={satelliteNameStyle}>{d.satelliteName}</span>
        </div>
        <span style={noradIdStyle}>{d.noradId}</span>
      </div>

      {/* Score */}
      <div style={scoreSectionStyle}>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1,
            color: scoreColor,
          }}
        >
          {score !== null ? score : "—"}
        </span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.05em",
            color: scoreColor,
            marginTop: 4,
          }}
        >
          {scoreLabel}
        </span>
      </div>

      {/* Metrics row */}
      <div style={metricsRowStyle}>
        <div style={metricStyle}>
          <span style={metricLabelStyle}>HORIZON</span>
          <span style={metricValueStyle}>{horizonText}</span>
        </div>
        <div style={{ ...metricStyle, alignItems: "flex-end" }}>
          <span style={metricLabelStyle}>WEAKEST</span>
          <span style={metricValueStyle}>{weakestText}</span>
        </div>
      </div>

      {/* Output handle only */}
      <Handle type="source" position={Position.Right} style={handleStyle} />

      {/* Hint text — positioned below the node, fades when nodes are added */}
      {d.showHint && (
        <div style={hintStyle}>
          <div style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500 }}>
            Right-click or drag a block to start building
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#9CA3AF",
              marginTop: 4,
              opacity: 0.7,
            }}
          >
            Press{" "}
            <kbd
              style={{
                padding: "1px 5px",
                background: "rgba(255,255,255,0.6)",
                borderRadius: 3,
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              /
            </kbd>{" "}
            for quick search
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────────── */

const nodeStyle: React.CSSProperties = {
  width: 280,
  background: GLASS.bg,
  backdropFilter: `blur(${GLASS.blur}px)`,
  WebkitBackdropFilter: `blur(${GLASS.blur}px)`,
  border: `2px solid ${FORGE.originBorder}`,
  borderRadius: GLASS.nodeRadius,
  boxShadow: `${FORGE.originGlow}, ${GLASS.shadow}, ${GLASS.insetGlow}`,
  padding: 16,
  position: "relative",
  transition: "box-shadow 200ms ease, border-color 200ms ease",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};

const headerLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
};

const satelliteNameStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 12,
  fontWeight: 700,
  color: FORGE.textPrimary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const noradIdStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  color: FORGE.textMuted,
  flexShrink: 0,
  marginLeft: 8,
};

const scoreSectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 0 12px",
};

const metricsRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  borderTop: "1px solid rgba(0,0,0,0.06)",
  paddingTop: 10,
};

const metricStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const metricLabelStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.06em",
  color: FORGE.textMuted,
};

const metricValueStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 12,
  fontWeight: 600,
  color: FORGE.textSecondary,
};

const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: FORGE.originBorder,
  border: "2px solid rgba(255,255,255,0.9)",
  outline: `2px solid ${FORGE.originBorder}`,
  borderRadius: "50%",
};

const hintStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: "50%",
  transform: "translateX(-50%)",
  marginTop: 20,
  textAlign: "center",
  whiteSpace: "nowrap",
  pointerEvents: "none",
};

export default memo(SatelliteOriginNode);
