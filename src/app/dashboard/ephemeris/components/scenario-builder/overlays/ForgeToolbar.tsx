"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Save,
  FolderOpen,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Map,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { FORGE, GLASS } from "../../../theme";
import type { SavedScenario } from "../types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ForgeToolbarProps {
  satelliteName: string;
  noradId: string;
  onBack: () => void;
  onReset: () => void;
  onSave: (name: string) => SavedScenario;
  onLoad: (saved: SavedScenario) => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function storageKey(noradId: string): string {
  return `ephemeris-forge-scenarios-${noradId}`;
}

function loadSavedScenarios(noradId: string): SavedScenario[] {
  try {
    const raw = localStorage.getItem(storageKey(noradId));
    return raw ? (JSON.parse(raw) as SavedScenario[]) : [];
  } catch {
    return [];
  }
}

function persistScenarios(noradId: string, scenarios: SavedScenario[]): void {
  localStorage.setItem(storageKey(noradId), JSON.stringify(scenarios));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ForgeToolbar({
  satelliteName,
  noradId,
  onBack,
  onReset,
  onSave,
  onLoad,
  showMinimap,
  onToggleMinimap,
}: ForgeToolbarProps) {
  const { getZoom, zoomIn, zoomOut } = useReactFlow();

  const [scenarioName, setScenarioName] = useState("Untitled Scenario");
  const [zoom, setZoom] = useState(100);
  const [loadOpen, setLoadOpen] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Poll zoom level periodically (React Flow does not emit zoom events)
  useEffect(() => {
    const interval = setInterval(() => {
      setZoom(Math.round(getZoom() * 100));
    }, 200);
    return () => clearInterval(interval);
  }, [getZoom]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setLoadOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Refresh saved list when dropdown opens
  useEffect(() => {
    if (loadOpen) {
      setSavedScenarios(loadSavedScenarios(noradId));
    }
  }, [loadOpen, noradId]);

  const handleSave = useCallback(() => {
    const name = scenarioName.trim() || "Untitled Scenario";
    const saved = onSave(name);
    const existing = loadSavedScenarios(noradId);
    const idx = existing.findIndex((s) => s.id === saved.id);
    if (idx >= 0) {
      existing[idx] = saved;
    } else {
      existing.unshift(saved);
    }
    persistScenarios(noradId, existing);
  }, [scenarioName, noradId, onSave]);

  const handleLoad = useCallback(
    (scenario: SavedScenario) => {
      setScenarioName(scenario.name);
      setLoadOpen(false);
      onLoad(scenario);
    },
    [onLoad],
  );

  // ─── Shared button styles ──────────────────────────────────────────────────

  const btnBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 32,
    padding: "0 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.5)",
    background: "rgba(255,255,255,0.3)",
    color: FORGE.textSecondary,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Inter, system-ui, sans-serif",
    transition: "all 200ms ease",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        height: 48,
        background: GLASS.bgToolbar,
        backdropFilter: `blur(${GLASS.blur}px)`,
        WebkitBackdropFilter: `blur(${GLASS.blur}px)`,
        border: `1px solid ${GLASS.border}`,
        borderRadius: GLASS.panelRadius,
        boxShadow: `${GLASS.shadowToolbar}, ${GLASS.insetGlow}`,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* ── Left Section ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={onBack}
          style={{ ...btnBase, padding: "0 8px" }}
          title="Back"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.5)";
            e.currentTarget.style.borderColor = GLASS.borderHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.3)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
          }}
        >
          <ArrowLeft size={16} />
        </button>

        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: FORGE.textPrimary,
            whiteSpace: "nowrap",
          }}
        >
          {satelliteName}
        </span>

        <span
          style={{
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            color: FORGE.textTertiary,
            background: "rgba(0,0,0,0.04)",
            padding: "2px 7px",
            borderRadius: 4,
            letterSpacing: "0.02em",
          }}
        >
          {noradId}
        </span>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div
        style={{
          width: 1,
          height: 20,
          background: "rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}
      />

      {/* ── Center Section ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          ref={nameInputRef}
          type="text"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          onFocus={(e) => e.target.select()}
          style={{
            width: 180,
            height: 32,
            padding: "0 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.5)",
            background: "rgba(255,255,255,0.3)",
            color: FORGE.textPrimary,
            fontSize: 13,
            fontFamily: "Inter, system-ui, sans-serif",
            outline: "none",
            textAlign: "center",
            transition: "all 200ms ease",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
              handleSave();
            }
          }}
        />

        <button
          onClick={handleSave}
          style={btnBase}
          title="Save scenario"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.5)";
            e.currentTarget.style.borderColor = GLASS.borderHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.3)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
          }}
        >
          <Save size={14} />
          <span>Save</span>
        </button>

        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => setLoadOpen((v) => !v)}
            style={btnBase}
            title="Load scenario"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.5)";
              e.currentTarget.style.borderColor = GLASS.borderHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.3)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
            }}
          >
            <FolderOpen size={14} />
            <span>Load</span>
          </button>

          {loadOpen && (
            <div
              style={{
                position: "absolute",
                top: 42,
                left: "50%",
                transform: "translateX(-50%)",
                minWidth: 240,
                maxHeight: 280,
                overflowY: "auto",
                background: GLASS.bg,
                backdropFilter: `blur(${GLASS.blur}px)`,
                WebkitBackdropFilter: `blur(${GLASS.blur}px)`,
                border: `1px solid ${GLASS.border}`,
                borderRadius: GLASS.panelRadius,
                boxShadow: `${GLASS.shadow}, ${GLASS.insetGlow}`,
                zIndex: 60,
                padding: 4,
              }}
            >
              {savedScenarios.length === 0 ? (
                <div
                  style={{
                    padding: "12px 16px",
                    color: FORGE.textMuted,
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  No saved scenarios
                </div>
              ) : (
                savedScenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleLoad(s)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      transition: "background 150ms",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.5)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: FORGE.textPrimary,
                      }}
                    >
                      {s.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: FORGE.textTertiary,
                        marginTop: 2,
                      }}
                    >
                      {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div
        style={{
          width: 1,
          height: 20,
          background: "rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}
      />

      {/* ── Right Section ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={onReset}
          style={{ ...btnBase, padding: "0 8px" }}
          title="Reset canvas"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.5)";
            e.currentTarget.style.borderColor = GLASS.borderHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.3)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
          }}
        >
          <RotateCcw size={14} />
        </button>

        <span
          style={{
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            color: FORGE.textTertiary,
            minWidth: 38,
            textAlign: "center",
          }}
        >
          {zoom}%
        </span>

        <button
          onClick={() => zoomOut()}
          style={{ ...btnBase, padding: "0 8px" }}
          title="Zoom out"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.5)";
            e.currentTarget.style.borderColor = GLASS.borderHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.3)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
          }}
        >
          <ZoomOut size={14} />
        </button>

        <button
          onClick={() => zoomIn()}
          style={{ ...btnBase, padding: "0 8px" }}
          title="Zoom in"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.5)";
            e.currentTarget.style.borderColor = GLASS.borderHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.3)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
          }}
        >
          <ZoomIn size={14} />
        </button>

        <button
          onClick={onToggleMinimap}
          style={{
            ...btnBase,
            padding: "0 8px",
            background: showMinimap
              ? "rgba(255,255,255,0.5)"
              : "rgba(255,255,255,0.3)",
            color: showMinimap ? FORGE.textPrimary : FORGE.textSecondary,
          }}
          title="Toggle minimap"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.5)";
            e.currentTarget.style.borderColor = GLASS.borderHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = showMinimap
              ? "rgba(255,255,255,0.5)"
              : "rgba(255,255,255,0.3)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
          }}
        >
          <Map size={14} />
        </button>
      </div>
    </div>
  );
}
