"use client";

// ─── EphemerisForge — Main Container ────────────────────────────────────────
// Renders within the normal dashboard layout (not fullscreen). Wires React Flow
// canvas, custom nodes/edges, overlays, BlockPalette, and both hooks.

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

import { useForgeTheme } from "../../theme";
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

// ─── Ghost Hint (shown when canvas is empty) ────────────────────────────────

function GhostHint() {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 1,
        textAlign: "center",
        opacity: 0.45,
      }}
    >
      <div
        style={{
          fontSize: 14,
          color: "#64748B",
          fontWeight: 500,
          lineHeight: 1.5,
        }}
      >
        Right-click or drag a block to start building your scenario
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#94A3B8",
          marginTop: 6,
        }}
      >
        Press{" "}
        <kbd
          style={{
            padding: "1px 5px",
            background: "#E2E8F0",
            borderRadius: 3,
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
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

  // Render — inline layout (not fullscreen)
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "calc(100vh - 220px)",
        minHeight: 500,
        background: forgeTheme.canvasBg,
        borderRadius: 8,
        border: `1px solid ${forgeTheme.nodeBorder}`,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Toolbar */}
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

      {/* Body: Palette + Canvas */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Block Palette (left side) */}
        <BlockPalette
          onSelectBlock={handlePaletteSelectBlock}
          collapsed={paletteCollapsed}
          onToggleCollapse={() => setPaletteCollapsed((p) => !p)}
        />

        {/* React Flow Canvas */}
        <div style={{ flex: 1, position: "relative" }}>
          {isCanvasEmpty && <GhostHint />}
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
                  background: forgeTheme.canvasBg,
                  border: `1px solid ${forgeTheme.nodeBorder}`,
                  borderRadius: 8,
                }}
              />
            )}
          </ReactFlow>
        </div>
      </div>

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
