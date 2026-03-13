"use client";

// ─── EphemerisForge — Inline Canvas with Glassmorphism UI ───────────────────
// Renders inline within the dashboard layout (width/height: 100%). All UI
// overlays float over the ReactFlow canvas using the glassmorphism design system.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useForgeTheme, GLASS } from "../../theme";
import { useForgeGraph } from "./useForgeGraph";
import { useForgeComputation } from "./useForgeComputation";
import { FORGE_NODE_TYPES, type SatelliteOriginData } from "./types";

// Node components
import SatelliteOriginNode from "./nodes/SatelliteOriginNode";
import ScenarioNode from "./nodes/ScenarioNode";
import ResultNode from "./nodes/ResultNode";

// Edge component
import ForgeEdge from "./edges/ForgeEdge";

// Overlay components
import ForgeToolbar from "./overlays/ForgeToolbar";
import BlockPalette from "./overlays/BlockPalette";
import RadialMenu from "./overlays/RadialMenu";
import SlashCommand from "./overlays/SlashCommand";
import ComparisonBar from "./overlays/ComparisonBar";
import ForgeAstraChat from "./overlays/ForgeAstraChat";

// ─── Props ──────────────────────────────────────────────────────────────────

interface EphemerisForgeProps {
  noradId: string;
  satelliteName: string;
  satelliteState: any;
  onBack: () => void;
}

// ─── Inner Component (requires ReactFlowProvider ancestor) ──────────────────

function EphemerisForgeInner({
  noradId,
  satelliteName,
  satelliteState,
  onBack,
}: EphemerisForgeProps) {
  const forgeTheme = useForgeTheme();

  // Build origin data from satellite state
  const originData: SatelliteOriginData = useMemo(
    () => ({
      satelliteName,
      noradId,
      overallScore: satelliteState?.overallScore ?? null,
      riskCategory: satelliteState?.riskCategory ?? null,
      horizonDays: satelliteState?.shortestHorizonDays ?? null,
      horizonRegulation: satelliteState?.criticalRegulation ?? null,
      weakestModule: satelliteState?.weakestModule ?? null,
    }),
    [satelliteName, noradId, satelliteState],
  );

  // Graph state hook
  const graph = useForgeGraph();

  useEffect(() => {
    graph.setOriginData(originData);
  }, [originData, graph.setOriginData]);

  // Derive chains
  const chains = useMemo(
    () => graph.getChains(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph.getChains, graph.nodes, graph.edges],
  );

  // Computation hook (spawns ResultNodes lazily after results arrive)
  useForgeComputation({
    noradId,
    nodes: graph.nodes,
    edges: graph.edges,
    chains,
    updateNodeData: graph.updateNodeData,
    onEdgesChange: graph.onEdgesChange,
    spawnResultNode: graph.spawnResultNode,
    clearResultNodes: graph.clearResultNodes,
  });

  // Local state
  const [showMinimap, setShowMinimap] = useState(true);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [radialMenuPos, setRadialMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showSlashCommand, setShowSlashCommand] = useState(false);
  const [showAstra, setShowAstra] = useState(false);

  // Check if canvas is empty (only origin node, no scenario nodes)
  const isCanvasEmpty = useMemo(
    () => !graph.nodes.some((n) => n.type === FORGE_NODE_TYPES.SCENARIO),
    [graph.nodes],
  );

  // Node/edge types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      [FORGE_NODE_TYPES.ORIGIN]: SatelliteOriginNode,
      [FORGE_NODE_TYPES.SCENARIO]: ScenarioNode,
      [FORGE_NODE_TYPES.RESULT]: ResultNode,
    }),
    [],
  );

  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      "forge-edge": ForgeEdge,
    }),
    [],
  );

  // Inject callbacks into scenario node data + showHint for origin
  const nodesWithCallbacks = useMemo(() => {
    return graph.nodes.map((node) => {
      if (node.type === FORGE_NODE_TYPES.ORIGIN) {
        return {
          ...node,
          data: { ...node.data, showHint: isCanvasEmpty },
        };
      }
      if (node.type === FORGE_NODE_TYPES.SCENARIO) {
        return {
          ...node,
          data: {
            ...node.data,
            onUpdateParams: (
              nodeId: string,
              params: Record<string, unknown>,
            ) => {
              graph.updateNodeData(nodeId, { parameters: params });
            },
            onDelete: (nodeId: string) => {
              graph.removeNode(nodeId);
            },
          },
        };
      }
      return node;
    });
  }, [graph.nodes, graph.updateNodeData, graph.removeNode, isCanvasEmpty]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        setShowSlashCommand(true);
      }
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        graph.undo();
      }
      if (e.key === "z" && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        graph.redo();
      }
      if (e.key === "Escape") {
        setRadialMenuPos(null);
        setShowSlashCommand(false);
      }
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [graph]);

  // Canvas event handlers
  const handlePaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
      e.preventDefault();
      setRadialMenuPos({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handlePaneClick = useCallback(() => {
    setRadialMenuPos(null);
  }, []);

  // Unified block selection — auto-positions + auto-connects to chain end
  const handleAddBlock = useCallback(
    (definitionId: string) => {
      graph.addScenarioNode(definitionId);
      setRadialMenuPos(null);
      setShowSlashCommand(false);
    },
    [graph],
  );

  // Toolbar callbacks
  const handleSave = useCallback(
    (name: string) => {
      return graph.saveScenario(name, noradId);
    },
    [graph, noradId],
  );

  const handleToggleMinimap = useCallback(() => {
    setShowMinimap((prev) => !prev);
  }, []);

  // ─── Render — Inline Glassmorphism ─────────────────────────────────────

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: forgeTheme.canvasBg,
      }}
    >
      {/* Full-bleed React Flow Canvas */}
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={graph.edges}
        onNodesChange={graph.onNodesChange}
        onEdgesChange={graph.onEdgesChange}
        onConnect={graph.onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        panOnScroll
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={forgeTheme.gridDot}
        />
        {showMinimap && (
          <MiniMap
            zoomable
            pannable
            style={{
              background: GLASS.bg,
              backdropFilter: `blur(${GLASS.blur}px)`,
              WebkitBackdropFilter: `blur(${GLASS.blur}px)`,
              border: `1px solid ${GLASS.border}`,
              borderRadius: GLASS.panelRadius,
              boxShadow: GLASS.shadow,
            }}
          />
        )}
      </ReactFlow>

      {/* Floating Glass Toolbar */}
      <ForgeToolbar
        satelliteName={satelliteName}
        noradId={noradId}
        onBack={onBack}
        onReset={graph.reset}
        onSave={handleSave}
        onLoad={graph.loadScenario}
        showMinimap={showMinimap}
        onToggleMinimap={handleToggleMinimap}
      />

      {/* Block Palette (floating glass panel) */}
      <BlockPalette
        onSelectBlock={handleAddBlock}
        collapsed={paletteCollapsed}
        onToggleCollapse={() => setPaletteCollapsed((p) => !p)}
      />

      {/* Radial Menu (right-click) */}
      <RadialMenu
        position={radialMenuPos}
        onSelectBlock={handleAddBlock}
        onClose={() => setRadialMenuPos(null)}
      />

      {/* Slash Command Palette */}
      <SlashCommand
        isOpen={showSlashCommand}
        onSelectBlock={handleAddBlock}
        onClose={() => setShowSlashCommand(false)}
      />

      {/* Comparison Bar */}
      <ComparisonBar nodes={graph.nodes} edges={graph.edges} />

      {/* Floating Astra Button */}
      {!showAstra && (
        <button
          onClick={() => setShowAstra(true)}
          title="Open Astra AI"
          className="astra-fab-pulse"
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 100,
            width: 56,
            height: 56,
            borderRadius: 18,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(24px) saturate(1.4)",
            WebkitBackdropFilter: "blur(24px) saturate(1.4)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 200ms ease, box-shadow 200ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-black.png"
            alt=""
            width={22}
            height={22}
            style={{ objectFit: "contain" }}
          />
        </button>
      )}

      {/* Floating Astra Chat Panel */}
      <ForgeAstraChat isOpen={showAstra} onClose={() => setShowAstra(false)} />

      {/* CSS Keyframe Animations */}
      <style>{`
        @keyframes forgeNodeSpawn {
          0% { transform: scale(0.8); opacity: 0; }
          75% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .forge-node-spawn { animation: forgeNodeSpawn 200ms ease-out; }

        @keyframes forgeCriticalPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
        .forge-critical-pulse { animation: forgeCriticalPulse 2s ease-in-out infinite; }

        @keyframes forgeShimmer {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .forge-shimmer { animation: forgeShimmer 1.5s ease-in-out infinite; }

        .forge-node-delete { opacity: 0; }
        *:hover > .forge-node-delete { opacity: 1; }

        @keyframes astraChatOpen {
          0% { opacity: 0; transform: scale(0.4); filter: blur(8px); }
          70% { opacity: 1; transform: scale(1.02); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }

        @keyframes astraFabPulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06), 0 0 0 0 rgba(0,0,0,0); }
          50% { box-shadow: 0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06), 0 0 0 8px rgba(0,0,0,0.04); }
        }
        .astra-fab-pulse { animation: astraFabPulse 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ─── Exported Wrapper (provides ReactFlowProvider) ──────────────────────────

export default function EphemerisForge(props: EphemerisForgeProps) {
  return (
    <ReactFlowProvider>
      <EphemerisForgeInner {...props} />
    </ReactFlowProvider>
  );
}
