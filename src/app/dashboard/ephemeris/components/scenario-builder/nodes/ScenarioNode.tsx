"use client";

import React, { memo, useCallback, useRef } from "react";
import { Handle, Position, useStore, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { useForgeTheme, MONO_FONT } from "../../../theme";
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

function getSeverityColor(level: string | undefined, forge: any): string {
  switch (level) {
    case "LOW":
      return forge.nominal;
    case "MEDIUM":
      return forge.watch;
    case "HIGH":
      return forge.warning;
    case "CRITICAL":
      return forge.critical;
    default:
      return forge.textMuted;
  }
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta}d`;
}

// ─── Component ───────────────────────────────────────────────────────────────

function ScenarioNode({ id, data }: NodeProps) {
  const { forge, glass, isDark } = useForgeTheme();

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

  const categoryColor = CATEGORY_COLORS[definition.category] ?? forge.textMuted;
  const IconComponent = ICON_MAP[definition.icon];

  const isComputing = d.computeState === "computing";
  const isDone = d.computeState === "done";
  const hasResult = isDone && d.stepResult !== null;

  // Zoom detail levels — full controls at normal zoom, summary when zoomed out
  const showParams = zoom >= 0.5;
  const showFullControls = zoom >= 0.6;

  const borderSep = isDark
    ? "1px solid rgba(255,255,255,0.04)"
    : "1px solid rgba(0,0,0,0.06)";

  return (
    <div
      ref={nodeRef}
      className="forge-node-spawn"
      style={{
        width: 240,
        background: glass.bg,
        backdropFilter: `blur(${glass.blur}px)`,
        WebkitBackdropFilter: `blur(${glass.blur}px)`,
        border: `1px solid ${glass.border}`,
        borderLeft: `3px solid ${categoryColor}`,
        borderRadius: glass.nodeRadius,
        padding: 10,
        position: "relative",
        boxShadow: `${glass.shadow}, ${glass.insetGlow}`,
        transition: "box-shadow 200ms ease, border-color 200ms ease",
      }}
      onMouseLeave={handleNodeMouseLeave}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 8,
          height: 8,
          background: isDark ? "#0A0A0F" : "rgba(255,255,255,0.9)",
          border: `2px solid ${categoryColor}`,
          borderRadius: "50%",
        }}
      />

      {/* Header: icon + name + delete */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
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
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 11,
              fontWeight: 700,
              color: forge.textPrimary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {definition.name}
          </span>
        </div>
        <button
          onClick={handleDelete}
          className="forge-node-delete"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            color: forge.textMuted,
            cursor: "pointer",
            flexShrink: 0,
            opacity: 0,
            transition: "opacity 0.15s ease, color 0.15s ease",
          }}
          aria-label="Delete block"
        >
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* Parameters — zoom-adaptive */}
      {showParams && definition.parameterDefs.length > 0 && (
        <div
          className="nodrag nopan nowheel"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            borderTop: borderSep,
            paddingTop: 8,
            marginTop: 2,
          }}
        >
          {definition.parameterDefs.map((pDef) => {
            if (showFullControls) {
              // Full inline controls
              if (pDef.type === "slider") {
                const sp = pDef as SliderParameterDef;
                const val = (d.parameters[sp.key] as number) ?? sp.defaultValue;
                return (
                  <div
                    key={sp.key}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                    }}
                  >
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
                          letterSpacing: "0.05em",
                          color: forge.textTertiary,
                          textTransform: "uppercase",
                        }}
                      >
                        {sp.label}
                      </span>
                      <span
                        style={{
                          fontFamily: MONO_FONT,
                          fontSize: 10,
                          fontWeight: 600,
                          color: forge.textSecondary,
                        }}
                      >
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
                      style={{
                        width: "100%",
                        height: 4,
                        appearance: "auto",
                        cursor: "pointer",
                        accentColor: categoryColor,
                      }}
                    />
                  </div>
                );
              }
              if (pDef.type === "select") {
                const sp = pDef as SelectParameterDef;
                const val = (d.parameters[sp.key] as string) ?? sp.defaultValue;
                return (
                  <div
                    key={sp.key}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: MONO_FONT,
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        color: forge.textTertiary,
                        textTransform: "uppercase",
                      }}
                    >
                      {sp.label}
                    </span>
                    <select
                      value={val}
                      onChange={(e) =>
                        handleParamChange(sp.key, e.target.value)
                      }
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        fontFamily: MONO_FONT,
                        fontSize: 10,
                        fontWeight: 500,
                        color: forge.textSecondary,
                        background: isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(255,255,255,0.4)",
                        border: isDark
                          ? "1px solid rgba(255,255,255,0.06)"
                          : "1px solid rgba(255,255,255,0.6)",
                        borderRadius: 6,
                        padding: "2px 4px",
                        outline: "none",
                        cursor: "pointer",
                      }}
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
              <span
                key={pDef.key}
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 9,
                  color: forge.textTertiary,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {pDef.label}: {String(val ?? pDef.defaultValue)}
                {unit}
              </span>
            );
          })}
        </div>
      )}

      {/* Result footer */}
      {(isComputing || hasResult) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: borderSep,
            paddingTop: 6,
            marginTop: 6,
          }}
        >
          {hasResult && d.stepResult && (
            <>
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 12,
                  fontWeight: 700,
                  color:
                    d.stepResult.horizonDelta >= 0
                      ? forge.nominal
                      : forge.critical,
                }}
              >
                {"\u0394"}H {formatDelta(d.stepResult.horizonDelta)}
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: getSeverityColor(
                    d.stepResult.severityLevel,
                    forge,
                  ),
                  flexShrink: 0,
                  ...(isDark
                    ? {
                        boxShadow: `0 0 6px ${getSeverityColor(d.stepResult.severityLevel, forge)}60`,
                      }
                    : {}),
                }}
              />
            </>
          )}
          {isComputing && (
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10,
                fontWeight: 500,
                color: forge.textMuted,
                animation: "shimmer 1.5s ease-in-out infinite alternate",
              }}
            >
              computing...
            </span>
          )}
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 8,
          height: 8,
          background: categoryColor,
          border: isDark
            ? "2px solid #0A0A0F"
            : "2px solid rgba(255,255,255,0.9)",
          outline: `1px solid ${categoryColor}`,
          borderRadius: "50%",
          ...(isDark ? { boxShadow: `0 0 8px ${categoryColor}50` } : {}),
        }}
      />
    </div>
  );
}

export default memo(ScenarioNode);
