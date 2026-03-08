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
import { FORGE } from "../../../theme";
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
    borderRadius: 6,
    border: `1px solid ${FORGE.toolbarBorder}`,
    background: "transparent",
    color: FORGE.textSecondary,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Inter, system-ui, sans-serif",
    transition: "background 150ms, color 150ms",
  };

  return (
    <div
      style={{
        position: "relative",
        height: 48,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        background: FORGE.toolbarBg,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${FORGE.toolbarBorder}`,
        boxShadow: FORGE.toolbarShadow,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* ── Left Section ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          style={{ ...btnBase, padding: "0 8px" }}
          title="Back"
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = FORGE.nodeBorder)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <ArrowLeft size={16} />
        </button>

        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: FORGE.textPrimary,
            whiteSpace: "nowrap",
          }}
        >
          {satelliteName}
        </span>

        <span
          style={{
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            color: FORGE.textTertiary,
            background: FORGE.nodeBorder,
            padding: "2px 8px",
            borderRadius: 4,
            letterSpacing: "0.02em",
          }}
        >
          {noradId}
        </span>
      </div>

      {/* ── Center Section ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          ref={nameInputRef}
          type="text"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          onFocus={(e) => e.target.select()}
          style={{
            width: 200,
            height: 32,
            padding: "0 10px",
            borderRadius: 6,
            border: `1px solid ${FORGE.toolbarBorder}`,
            background: "transparent",
            color: FORGE.textPrimary,
            fontSize: 13,
            fontFamily: "Inter, system-ui, sans-serif",
            outline: "none",
            textAlign: "center",
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
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = FORGE.nodeBorder)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Save size={14} />
          <span>Save</span>
        </button>

        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => setLoadOpen((v) => !v)}
            style={btnBase}
            title="Load scenario"
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = FORGE.nodeBorder)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <FolderOpen size={14} />
            <span>Load</span>
          </button>

          {loadOpen && (
            <div
              style={{
                position: "absolute",
                top: 38,
                left: "50%",
                transform: "translateX(-50%)",
                minWidth: 240,
                maxHeight: 280,
                overflowY: "auto",
                background: "#FFFFFF",
                border: `1px solid ${FORGE.toolbarBorder}`,
                borderRadius: 8,
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
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
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      transition: "background 120ms",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = FORGE.canvasBg)
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

      {/* ── Right Section ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={onReset}
          style={btnBase}
          title="Reset canvas"
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = FORGE.nodeBorder)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <RotateCcw size={14} />
        </button>

        <span
          style={{
            fontSize: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            color: FORGE.textTertiary,
            minWidth: 42,
            textAlign: "center",
          }}
        >
          {zoom}%
        </span>

        <button
          onClick={() => zoomOut()}
          style={{ ...btnBase, padding: "0 8px" }}
          title="Zoom out"
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = FORGE.nodeBorder)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <ZoomOut size={14} />
        </button>

        <button
          onClick={() => zoomIn()}
          style={{ ...btnBase, padding: "0 8px" }}
          title="Zoom in"
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = FORGE.nodeBorder)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <ZoomIn size={14} />
        </button>

        <button
          onClick={onToggleMinimap}
          style={{
            ...btnBase,
            padding: "0 8px",
            background: showMinimap ? FORGE.nodeBorder : "transparent",
            color: showMinimap ? FORGE.textPrimary : FORGE.textSecondary,
          }}
          title="Toggle minimap"
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = FORGE.nodeBorder)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = showMinimap
              ? FORGE.nodeBorder
              : "transparent")
          }
        >
          <Map size={14} />
        </button>
      </div>
    </div>
  );
}
