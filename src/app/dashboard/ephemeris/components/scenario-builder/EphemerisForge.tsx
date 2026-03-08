"use client";

// ─── EphemerisForge — Inline Canvas with Liquid Glass UI ────────────────────
// Renders inline within the dashboard layout (width/height: 100%). All UI
// overlays float over the ReactFlow canvas using the Liquid Glass design system.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
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

// ─── Props ──────────────────────────────────────────────────────────────────

interface EphemerisForgeProps {
  noradId: string;
  satelliteName: string;
  satelliteState: any;
  onBack: () => void;
}

// ─── Ghost Hint (static overlay, centered in canvas viewport) ───────────────

function GhostHint({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 5,
        textAlign: "center",
        opacity: visible ? 1 : 0,
        transition: "opacity 500ms ease",
      }}
    >
      <div
        style={{
          fontSize: 14,
          color: "#9CA3AF",
          fontWeight: 500,
          lineHeight: 1.5,
        }}
      >
        Right-click or drag a block to start building your scenario
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#9CA3AF",
          marginTop: 6,
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
  );
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

  // Computation hook
  useForgeComputation({
    noradId,
    nodes: graph.nodes,
    edges: graph.edges,
    chains,
    updateNodeData: graph.updateNodeData,
    onEdgesChange: graph.onEdgesChange,
  });

  // Local state
  const [showMinimap, setShowMinimap] = useState(true);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [radialMenuPos, setRadialMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showSlashCommand, setShowSlashCommand] = useState(false);

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

  // Inject callbacks into scenario node data
  const nodesWithCallbacks = useMemo(() => {
    return graph.nodes.map((node) => {
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
  }, [graph.nodes, graph.updateNodeData, graph.removeNode]);

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

  // Block selection handler
  const reactFlowInstance = useReactFlow();

  const handleSelectBlock = useCallback(
    (definitionId: string, screenPos?: { x: number; y: number }) => {
      const position = screenPos
        ? reactFlowInstance.screenToFlowPosition(screenPos)
        : reactFlowInstance.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          });
      graph.addScenarioNode(position, definitionId);
      setRadialMenuPos(null);
      setShowSlashCommand(false);
    },
    [reactFlowInstance, graph],
  );

  // Palette block selection (no screen position — spawn at viewport center)
  const handlePaletteSelectBlock = useCallback(
    (definitionId: string) => {
      handleSelectBlock(definitionId);
    },
    [handleSelectBlock],
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

  // ─── Render — Inline Liquid Glass ───────────────────────────────────────

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
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
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

      {/* Ghost Hint — fades out when first ScenarioNode is added */}
      <GhostHint visible={isCanvasEmpty} />

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
        onSelectBlock={handlePaletteSelectBlock}
        collapsed={paletteCollapsed}
        onToggleCollapse={() => setPaletteCollapsed((p) => !p)}
      />

      {/* Radial Menu (right-click) */}
      <RadialMenu
        position={radialMenuPos}
        onSelectBlock={handleSelectBlock}
        onClose={() => setRadialMenuPos(null)}
      />

      {/* Slash Command Palette */}
      <SlashCommand
        isOpen={showSlashCommand}
        onSelectBlock={handlePaletteSelectBlock}
        onClose={() => setShowSlashCommand(false)}
      />

      {/* Comparison Bar */}
      <ComparisonBar nodes={graph.nodes} edges={graph.edges} />

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
