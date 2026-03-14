"use client";

import React, { memo, useCallback, useRef } from "react";
import { Handle, Position, useStore, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { FORGE, GLASS } from "../../../theme";
import { CATEGORY_COLORS, type ScenarioNodeData } from "../types";
import {
  BLOCK_DEFINITIONS,
  type SliderParameterDef,
  type SelectParameterDef,
} from "../block-definitions";
import { ICON_MAP } from "../icon-map";

// ─── Extended node data shape (includes callbacks set by parent) ─────────────

interface ScenarioNodeDataWithCallbacks extends ScenarioNodeData {
  onUpdateParams?: (nodeId: string, params: Record<string, unknown>) => void;
  onDelete?: (nodeId: string) => void;
}

// ─── Severity helpers ────────────────────────────────────────────────────────

function getSeverityColor(level?: string): string {
  switch (level) {
    case "LOW":
      return FORGE.nominal;
    case "MEDIUM":
      return FORGE.watch;
    case "HIGH":
      return FORGE.warning;
    case "CRITICAL":
      return FORGE.critical;
    default:
      return FORGE.textMuted;
  }
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta}d`;
}

// ─── Component ───────────────────────────────────────────────────────────────

function ScenarioNode({ id, data }: NodeProps) {
  const d = data as unknown as ScenarioNodeDataWithCallbacks;
  const zoom = useStore((s) => s.transform[2]);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Release any active slider when mouse leaves the node
  const handleNodeMouseLeave = useCallback(() => {
    const el = nodeRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLInputElement>(
      'input[type="range"]:active, input[type="range"]:focus',
    );
    if (active) active.blur();
  }, []);

  const handleParamChange = useCallback(
    (key: string, value: unknown) => {
      if (!d.onUpdateParams) return;
      d.onUpdateParams(id, { ...d.parameters, [key]: value });
    },
    [id, d],
  );

  const handleDelete = useCallback(() => {
    if (d.onDelete) d.onDelete(id);
  }, [id, d]);

  const definition = BLOCK_DEFINITIONS.find((b) => b.id === d.definitionId);
  if (!definition) return null;

  const categoryColor = CATEGORY_COLORS[definition.category] ?? FORGE.textMuted;
  const IconComponent = ICON_MAP[definition.icon];

  const isComputing = d.computeState === "computing";
  const isDone = d.computeState === "done";
  const hasResult = isDone && d.stepResult !== null;

  // Zoom detail levels — full controls at normal zoom, summary when zoomed out
  const showParams = zoom >= 0.5;
  const showFullControls = zoom >= 0.6;

  return (
    <div
      ref={nodeRef}
      className="forge-node-spawn"
      style={nodeStyle(categoryColor)}
      onMouseLeave={handleNodeMouseLeave}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={handleTargetStyle(categoryColor)}
      />

      {/* Header: icon + name + delete */}
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          {IconComponent && (
            <IconComponent
              style={{
                width: 14,
                height: 14,
                flexShrink: 0,
                color: categoryColor,
              }}
            />
          )}
          <span style={nameStyle}>{definition.name}</span>
        </div>
        <button
          onClick={handleDelete}
          className="forge-node-delete"
          style={deleteBtnStyle}
          aria-label="Delete block"
        >
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* Parameters — zoom-adaptive */}
      {showParams && definition.parameterDefs.length > 0 && (
        <div style={paramsContainerStyle}>
          {definition.parameterDefs.map((pDef) => {
            if (showFullControls) {
              // Full inline controls
              if (pDef.type === "slider") {
                const sp = pDef as SliderParameterDef;
                const val = (d.parameters[sp.key] as number) ?? sp.defaultValue;
                return (
                  <div key={sp.key} style={paramRowStyle}>
                    <div style={paramHeaderStyle}>
                      <span style={paramLabelStyle}>{sp.label}</span>
                      <span style={paramValueStyle}>
                        {val}
                        {sp.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={sp.min}
                      max={sp.max}
                      step={sp.step}
                      value={val}
                      onChange={(e) =>
                        handleParamChange(sp.key, parseFloat(e.target.value))
                      }
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={sliderStyle(categoryColor)}
                    />
                  </div>
                );
              }
              if (pDef.type === "select") {
                const sp = pDef as SelectParameterDef;
                const val = (d.parameters[sp.key] as string) ?? sp.defaultValue;
                return (
                  <div key={sp.key} style={paramRowStyle}>
                    <span style={paramLabelStyle}>{sp.label}</span>
                    <select
                      value={val}
                      onChange={(e) =>
                        handleParamChange(sp.key, e.target.value)
                      }
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={selectStyle}
                    >
                      {sp.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              return null;
            }

            // Summary text mode (zoom 0.5-1.0)
            const val = d.parameters[pDef.key];
            const unit =
              pDef.type === "slider" ? (pDef as SliderParameterDef).unit : "";
            return (
              <span key={pDef.key} style={paramSummaryStyle}>
                {pDef.label}: {String(val ?? pDef.defaultValue)}
                {unit}
              </span>
            );
          })}
        </div>
      )}

      {/* Result footer */}
      {(isComputing || hasResult) && (
        <div style={resultFooterStyle}>
          {hasResult && d.stepResult && (
            <>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  color:
                    d.stepResult.horizonDelta >= 0
                      ? FORGE.nominal
                      : FORGE.critical,
                }}
              >
                {"\u0394"}H {formatDelta(d.stepResult.horizonDelta)}
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: getSeverityColor(d.stepResult.severityLevel),
                  flexShrink: 0,
                }}
              />
            </>
          )}
          {isComputing && <span style={shimmerStyle}>computing...</span>}
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={handleSourceStyle(categoryColor)}
      />
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const nodeStyle = (categoryColor: string): React.CSSProperties => ({
  width: 240,
  background: GLASS.bg,
  backdropFilter: `blur(${GLASS.blur}px)`,
  WebkitBackdropFilter: `blur(${GLASS.blur}px)`,
  border: `1px solid ${GLASS.border}`,
  borderLeft: `3px solid ${categoryColor}`,
  borderRadius: GLASS.nodeRadius,
  padding: 10,
  position: "relative",
  boxShadow: `${GLASS.shadow}, ${GLASS.insetGlow}`,
  transition: "box-shadow 200ms ease, border-color 200ms ease",
});

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  marginBottom: 6,
};

const headerLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
};

const nameStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 11,
  fontWeight: 700,
  color: FORGE.textPrimary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const deleteBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  height: 20,
  borderRadius: 4,
  border: "none",
  background: "transparent",
  color: FORGE.textMuted,
  cursor: "pointer",
  flexShrink: 0,
  opacity: 0,
  transition: "opacity 0.15s ease, color 0.15s ease",
};

const paramsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  borderTop: "1px solid rgba(0,0,0,0.06)",
  paddingTop: 8,
  marginTop: 2,
};

const paramRowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
};

const paramHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const paramLabelStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.05em",
  color: FORGE.textTertiary,
  textTransform: "uppercase",
};

const paramValueStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  fontWeight: 600,
  color: FORGE.textSecondary,
};

const sliderStyle = (accentColor: string): React.CSSProperties => ({
  width: "100%",
  height: 4,
  appearance: "auto",
  cursor: "pointer",
  accentColor,
});

const selectStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  fontWeight: 500,
  color: FORGE.textSecondary,
  background: "rgba(255,255,255,0.4)",
  border: "1px solid rgba(255,255,255,0.6)",
  borderRadius: 6,
  padding: "2px 4px",
  outline: "none",
  cursor: "pointer",
};

const paramSummaryStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 9,
  color: FORGE.textTertiary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const resultFooterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderTop: "1px solid rgba(0,0,0,0.06)",
  paddingTop: 6,
  marginTop: 6,
};

const shimmerStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  fontWeight: 500,
  color: FORGE.textMuted,
  animation: "shimmer 1.5s ease-in-out infinite alternate",
};

const handleTargetStyle = (color: string): React.CSSProperties => ({
  width: 8,
  height: 8,
  background: "rgba(255,255,255,0.9)",
  border: `2px solid ${color}`,
  borderRadius: "50%",
});

const handleSourceStyle = (color: string): React.CSSProperties => ({
  width: 8,
  height: 8,
  background: color,
  border: "2px solid rgba(255,255,255,0.9)",
  outline: `1px solid ${color}`,
  borderRadius: "50%",
});

export default memo(ScenarioNode);
