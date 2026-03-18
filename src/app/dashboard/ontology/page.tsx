"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Layers,
  MousePointer2,
  Eye,
  EyeOff,
  CircleDot,
  ArrowRight,
  Network,
  Shield,
  Scale,
  FileCheck,
  Globe,
  Building2,
  Tag,
  Users,
  Crosshair,
} from "lucide-react";

// ─── Dynamic import (canvas-based, no SSR) ──────────────────────────────────

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full">
      <Loader2 className="w-6 h-6 animate-spin text-[#4C90F0]" />
    </div>
  ),
});

// ─── Palantir Blueprint Color Palette ────────────────────────────────────────

const BP = {
  BLACK: "#111418",
  DARK_GRAY1: "#1C2127",
  DARK_GRAY2: "#252A31",
  DARK_GRAY3: "#2F343C",
  DARK_GRAY4: "#383E47",
  DARK_GRAY5: "#404854",
  GRAY1: "#5F6B7C",
  GRAY3: "#8F99A8",
  GRAY4: "#ABB3BF",
  GRAY5: "#C5CBD3",
  LIGHT_GRAY5: "#F6F7F9",
  BLUE3: "#2D72D2",
  BLUE4: "#4C90F0",
  BLUE5: "#8ABBFF",
  GREEN3: "#238551",
  GREEN4: "#32A467",
  CERULEAN3: "#147EB3",
  CERULEAN4: "#3FA6DA",
  ORANGE3: "#C87619",
  ORANGE4: "#EC9A3C",
  RED3: "#CD4246",
  RED4: "#E76A6E",
  INDIGO3: "#7961DB",
  INDIGO4: "#9881F3",
  VIOLET3: "#9D3F9D",
  VIOLET4: "#BD6BBD",
  FOREST3: "#29A634",
  GOLD3: "#D1980B",
  GOLD4: "#F0B726",
  ROSE3: "#DB2C6F",
  TURQUOISE3: "#00A396",
};

const NODE_COLORS: Record<string, string> = {
  REGULATION: BP.BLUE4,
  OBLIGATION: BP.GREEN4,
  JURISDICTION: BP.GOLD4,
  OPERATOR_TYPE: BP.INDIGO4,
  EVIDENCE_REQ: BP.ROSE3,
  STANDARD: BP.CERULEAN4,
  AUTHORITY: BP.ORANGE4,
  DOMAIN: BP.VIOLET4,
};

const NODE_ICONS: Record<string, typeof Network> = {
  REGULATION: Shield,
  OBLIGATION: FileCheck,
  JURISDICTION: Globe,
  OPERATOR_TYPE: Users,
  EVIDENCE_REQ: CircleDot,
  STANDARD: Scale,
  AUTHORITY: Building2,
  DOMAIN: Tag,
};

const NODE_SIZES: Record<string, number> = {
  REGULATION: 12,
  STANDARD: 12,
  DOMAIN: 10,
  JURISDICTION: 9,
  AUTHORITY: 8,
  OBLIGATION: 6,
  OPERATOR_TYPE: 7,
  EVIDENCE_REQ: 5,
};

const NODE_LABELS: Record<string, string> = {
  REGULATION: "Regulation",
  OBLIGATION: "Obligation",
  JURISDICTION: "Jurisdiction",
  OPERATOR_TYPE: "Operator Type",
  EVIDENCE_REQ: "Evidence Requirement",
  STANDARD: "Standard",
  AUTHORITY: "Authority",
  DOMAIN: "Domain",
};

const EDGE_LABELS: Record<string, string> = {
  IMPLEMENTS: "Implements",
  APPLIES_TO: "Applies To",
  REQUIRES_EVIDENCE: "Requires Evidence",
  CONFLICTS_WITH: "Conflicts With",
  SUPERSEDES: "Supersedes",
  CODIFIES: "Codifies",
  EXTENDS: "Extends",
  NEW_OBLIGATION: "New Obligation",
  ADMINISTERED_BY: "Administered By",
  BELONGS_TO: "Belongs To",
  SCOPED_TO: "Scoped To",
  CONTAINS: "Contains",
};

const BG_COLOR = BP.DARK_GRAY1;

// ─── Types ───────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  code: string;
  label: string;
  type: string;
  confidence: number;
  properties: Record<string, unknown>;
  sourceFile: string | null;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  id: string;
  type: string;
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
}

interface NodeDetail {
  id: string;
  code: string;
  label: string;
  type: string;
  properties: Record<string, unknown>;
  confidence: number;
  validFrom: string;
  validUntil: string | null;
  sourceFile: string | null;
  inEdges: Array<{
    edgeType: string;
    fromCode: string;
    fromLabel: string;
    fromType: string;
  }>;
  outEdges: Array<{
    edgeType: string;
    toCode: string;
    toLabel: string;
    toType: string;
  }>;
}

interface OntologyStats {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<string, number>;
  edgesByType: Record<string, number>;
  lastSeeded: string | null;
  version: string | null;
}

type LeftTab = "layers" | "selection" | "search";

// ─── Page Component ──────────────────────────────────────────────────────────

export default function OntologyPage() {
  // Graph data
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [stats, setStats] = useState<OntologyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection & detail
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<Set<string>>(
    new Set(Object.keys(NODE_COLORS)),
  );
  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState<Set<string>>(
    new Set(Object.keys(EDGE_LABELS)),
  );
  const [minConfidence, setMinConfidence] = useState(0);

  // Left sidebar
  const [leftTab, setLeftTab] = useState<LeftTab>("layers");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["nodeTypes", "edgeTypes"]),
  );

  // Seeding
  const [seeding, setSeeding] = useState(false);

  // Graph ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  // Hover
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // ─── Data Loading ────────────────────────────────────────────────────────

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fullRes, statsRes] = await Promise.all([
        fetch("/api/ontology/full"),
        fetch("/api/ontology/stats"),
      ]);

      if (!fullRes.ok) throw new Error("Failed to load graph data");
      if (!statsRes.ok) throw new Error("Failed to load stats");

      const fullData = await fullRes.json();
      const statsData = await statsRes.json();

      setNodes(fullData.nodes);
      setEdges(fullData.edges);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // ─── Node Detail ─────────────────────────────────────────────────────────

  const loadNodeDetail = useCallback(async (nodeId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/ontology/node/${nodeId}`);
      if (!res.ok) throw new Error("Failed to load node detail");
      const data = await res.json();
      setNodeDetail(data);
    } catch {
      setNodeDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setSelectedNodeId(node.id);
      setLeftTab("selection");
      loadNodeDetail(node.id);

      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 600);
        graphRef.current.zoom(3.5, 600);
      }
    },
    [loadNodeDetail],
  );

  // ─── Search ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = nodes
      .filter(
        (n) =>
          n.code.toLowerCase().includes(q) || n.label.toLowerCase().includes(q),
      )
      .slice(0, 20);
    setSearchResults(results);
  }, [searchQuery, nodes]);

  const selectSearchResult = useCallback(
    (node: GraphNode) => {
      setSearchQuery("");
      handleNodeClick(node);
    },
    [handleNodeClick],
  );

  // ─── Filtered Data ───────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    const filteredNodes = nodes.filter(
      (n) => visibleNodeTypes.has(n.type) && n.confidence >= minConfidence,
    );
    const nodeIdSet = new Set(filteredNodes.map((n) => n.id));

    const filteredEdges = edges.filter((e) => {
      const sourceId =
        typeof e.source === "string" ? e.source : (e.source as GraphNode).id;
      const targetId =
        typeof e.target === "string" ? e.target : (e.target as GraphNode).id;
      return (
        visibleEdgeTypes.has(e.type) &&
        nodeIdSet.has(sourceId) &&
        nodeIdSet.has(targetId)
      );
    });

    return { nodes: filteredNodes, links: filteredEdges };
  }, [nodes, edges, visibleNodeTypes, visibleEdgeTypes, minConfidence]);

  // ─── Seed ────────────────────────────────────────────────────────────────

  const handleSeed = useCallback(async () => {
    if (seeding) return;
    if (!confirm("Re-seed the ontology from regulatory data files?")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/ontology/seed", { method: "POST" });
      if (!res.ok) throw new Error("Seed failed");
      await loadGraph();
    } catch {
      // error visible in UI
    } finally {
      setSeeding(false);
    }
  }, [seeding, loadGraph]);

  // ─── Graph Rendering (Palantir-style) ─────────────────────────────────────

  const paintNode = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const radius = NODE_SIZES[node.type] || 5;
      const color = NODE_COLORS[node.type] || BP.GRAY1;
      const isSelected = node.id === selectedNodeId;
      const isHovered = hoveredNode?.id === node.id;
      const x = node.x ?? 0;
      const y = node.y ?? 0;

      // Selection ring — Blueprint blue focus indicator
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = BP.BLUE4;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Soft glow
        ctx.beginPath();
        ctx.arc(x, y, radius + 8, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(76, 144, 240, 0.08)";
        ctx.fill();
      }

      // Hover ring
      if (isHovered && !isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}60`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Main circle — filled with slight gradient feel
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);

      // Darker fill for the node body
      const nodeColor = color;
      ctx.fillStyle = isSelected || isHovered ? nodeColor : `${nodeColor}CC`;
      ctx.fill();

      // Subtle inner highlight (top-left)
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = `${color}40`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Confidence indicator for proposals (confidence < 1.0)
      if (node.confidence < 1.0 && node.confidence > 0) {
        // Dashed ring
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
        ctx.strokeStyle = BP.GOLD3;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Icon inside node (for larger nodes)
      if (radius >= 7 && globalScale > 1.5) {
        const iconSize = Math.min(radius * 0.9, 6);
        ctx.font = `${iconSize}px Inter, system-ui`;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const symbols: Record<string, string> = {
          REGULATION: "§",
          OBLIGATION: "○",
          JURISDICTION: "◈",
          OPERATOR_TYPE: "◇",
          EVIDENCE_REQ: "◉",
          STANDARD: "△",
          AUTHORITY: "◆",
          DOMAIN: "▣",
        };
        ctx.fillText(symbols[node.type] || "·", x, y);
      }

      // Label
      const fontSize = Math.max(2.5, 9 / globalScale);
      if (isSelected || isHovered || globalScale > 3) {
        const label =
          node.code.length > 24 ? node.code.slice(0, 22) + "…" : node.code;
        ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        // Text shadow for readability
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillText(label, x + 0.3, y + radius + 2.3);

        ctx.fillStyle = isSelected
          ? BP.LIGHT_GRAY5
          : isHovered
            ? BP.GRAY5
            : BP.GRAY4;
        ctx.fillText(label, x, y + radius + 2);
      }
    },
    [selectedNodeId, hoveredNode],
  );

  const paintLink = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any, ctx: CanvasRenderingContext2D) => {
      const source = link.source;
      const target = link.target;
      if (!source.x || !source.y || !target.x || !target.y) return;

      const isSelectedEdge =
        selectedNodeId &&
        ((typeof link.source === "object" &&
          link.source.id === selectedNodeId) ||
          (typeof link.target === "object" &&
            link.target.id === selectedNodeId));

      // Edge line
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = isSelectedEdge ? `${BP.BLUE4}50` : `${BP.GRAY1}25`;
      ctx.lineWidth = isSelectedEdge ? 0.8 : 0.3;
      ctx.stroke();

      // Directed arrow
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return;

      const targetRadius = NODE_SIZES[target.type] || 5;
      const ratio = (dist - targetRadius - 2) / dist;
      const ax = source.x + dx * ratio;
      const ay = source.y + dy * ratio;

      const arrowLen = isSelectedEdge ? 3.5 : 2.5;
      const arrowAngle = Math.PI / 7;
      const angle = Math.atan2(dy, dx);

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - arrowLen * Math.cos(angle - arrowAngle),
        ay - arrowLen * Math.sin(angle - arrowAngle),
      );
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - arrowLen * Math.cos(angle + arrowAngle),
        ay - arrowLen * Math.sin(angle + arrowAngle),
      );
      ctx.strokeStyle = isSelectedEdge ? `${BP.BLUE4}60` : `${BP.GRAY1}30`;
      ctx.lineWidth = isSelectedEdge ? 0.8 : 0.4;
      ctx.stroke();
    },
    [selectedNodeId],
  );

  // ─── Navigate to connected node ─────────────────────────────────────────

  const navigateToNode = useCallback(
    (code: string) => {
      const node = nodes.find((n) => n.code === code);
      if (node) handleNodeClick(node);
    },
    [nodes, handleNodeClick],
  );

  // ─── Zoom controls ───────────────────────────────────────────────────────

  const zoomIn = () => {
    if (graphRef.current)
      graphRef.current.zoom(graphRef.current.zoom() * 1.5, 300);
  };
  const zoomOut = () => {
    if (graphRef.current)
      graphRef.current.zoom(graphRef.current.zoom() / 1.5, 300);
  };
  const zoomFit = () => {
    if (graphRef.current) graphRef.current.zoomToFit(400, 60);
  };

  // ─── Toggle helpers ───────────────────────────────────────────────────────

  const toggleNodeType = (type: string) => {
    setVisibleNodeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleEdgeType = (type: string) => {
    setVisibleEdgeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedNodeId) {
          setSelectedNodeId(null);
          setNodeDetail(null);
          setLeftTab("layers");
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setLeftTab("search");
        setLeftCollapsed(false);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNodeId]);

  // ─── Render: Loading ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className="flex items-center justify-center w-full h-screen"
        style={{ background: BG_COLOR }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div
              className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: `${BP.BLUE4}40`,
                borderTopColor: "transparent",
              }}
            />
            <div
              className="absolute inset-0 w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: `${BP.BLUE4}`,
                borderTopColor: "transparent",
                animationDuration: "0.8s",
                animationDirection: "reverse",
                scale: "0.7",
                margin: "auto",
                width: "28px",
                height: "28px",
              }}
            />
          </div>
          <p style={{ color: BP.GRAY3 }} className="text-[13px] font-medium">
            Loading ontology graph...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center w-full h-screen"
        style={{ background: BG_COLOR }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: `${BP.RED3}20` }}
          >
            <X className="w-6 h-6" style={{ color: BP.RED4 }} />
          </div>
          <p style={{ color: BP.GRAY4 }} className="text-[13px]">
            Failed to load ontology
          </p>
          <p style={{ color: BP.GRAY1 }} className="text-[11px] max-w-[300px]">
            {error}
          </p>
          <button
            onClick={loadGraph}
            className="px-4 py-2 text-[12px] font-medium rounded transition-colors"
            style={{
              background: BP.DARK_GRAY3,
              color: BP.GRAY4,
              border: `1px solid ${BP.DARK_GRAY5}`,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ background: BG_COLOR }}
    >
      {/* ═══ Graph Canvas ═══ */}
      <ForceGraph2D
        ref={graphRef}
        graphData={filteredData}
        nodeId="id"
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(
          node: { type?: string; x?: number; y?: number },
          color: string,
          ctx: CanvasRenderingContext2D,
        ) => {
          const radius = NODE_SIZES[node.type ?? ""] || 5;
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, radius + 4, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkCanvasObject={paintLink}
        onNodeClick={(node: { [key: string]: unknown }) =>
          handleNodeClick(node as unknown as GraphNode)
        }
        onNodeHover={(node: { [key: string]: unknown } | null) =>
          setHoveredNode(node as GraphNode | null)
        }
        backgroundColor={BG_COLOR}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        d3AlphaMin={0.001}
        cooldownTicks={200}
        warmupTicks={100}
        enableNodeDrag
        enableZoomInteraction
        enablePanInteraction
      />

      {/* ═══ Left Sidebar (Palantir-style multi-tab) ═══ */}
      <div className="absolute top-0 left-0 bottom-0 z-20 flex">
        {/* Tab bar */}
        <div
          className="flex flex-col items-center py-3 gap-1 w-[42px]"
          style={{
            background: BP.BLACK,
            borderRight: `1px solid ${BP.DARK_GRAY3}`,
          }}
        >
          {/* Ontology icon */}
          <div className="flex items-center justify-center w-8 h-8 mb-2">
            <Network size={16} style={{ color: BP.BLUE4 }} />
          </div>

          <div
            className="w-6 h-px mb-1"
            style={{ background: BP.DARK_GRAY4 }}
          />

          {[
            { id: "layers" as LeftTab, icon: Layers, tooltip: "Layers" },
            {
              id: "selection" as LeftTab,
              icon: MousePointer2,
              tooltip: "Selection",
            },
            { id: "search" as LeftTab, icon: Search, tooltip: "Search" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (leftTab === tab.id && !leftCollapsed) {
                  setLeftCollapsed(true);
                } else {
                  setLeftTab(tab.id);
                  setLeftCollapsed(false);
                  if (tab.id === "search") {
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }
                }
              }}
              title={tab.tooltip}
              className="flex items-center justify-center w-8 h-8 rounded transition-colors"
              style={{
                background:
                  leftTab === tab.id && !leftCollapsed
                    ? BP.DARK_GRAY3
                    : "transparent",
                color:
                  leftTab === tab.id && !leftCollapsed
                    ? BP.LIGHT_GRAY5
                    : BP.GRAY1,
              }}
            >
              <tab.icon size={15} />
            </button>
          ))}

          {/* Bottom spacer + Re-seed */}
          <div className="flex-1" />
          <button
            onClick={handleSeed}
            disabled={seeding}
            title="Re-seed ontology"
            className="flex items-center justify-center w-8 h-8 rounded transition-colors disabled:opacity-30"
            style={{ color: BP.GRAY1 }}
          >
            <RefreshCw size={14} className={seeding ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Panel content */}
        {!leftCollapsed && (
          <div
            className="w-[280px] h-full overflow-y-auto"
            style={{
              background: BP.DARK_GRAY2,
              borderRight: `1px solid ${BP.DARK_GRAY4}`,
            }}
          >
            {/* ─── Layers Tab ─── */}
            {leftTab === "layers" && (
              <div className="flex flex-col">
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: `1px solid ${BP.DARK_GRAY4}` }}
                >
                  <span
                    className="text-[12px] font-semibold uppercase tracking-wider"
                    style={{ color: BP.GRAY3 }}
                  >
                    Layers
                  </span>
                  <span className="text-[11px]" style={{ color: BP.GRAY1 }}>
                    {filteredData.nodes.length} / {nodes.length}
                  </span>
                </div>

                {/* Stats row */}
                <div
                  className="grid grid-cols-2 gap-px mx-4 mt-3 rounded overflow-hidden"
                  style={{ background: BP.DARK_GRAY4 }}
                >
                  <div
                    className="flex flex-col items-center py-3"
                    style={{ background: BP.DARK_GRAY3 }}
                  >
                    <span
                      className="text-[18px] font-bold"
                      style={{ color: BP.BLUE4 }}
                    >
                      {stats?.totalNodes.toLocaleString() ?? 0}
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: BP.GRAY1 }}
                    >
                      Nodes
                    </span>
                  </div>
                  <div
                    className="flex flex-col items-center py-3"
                    style={{ background: BP.DARK_GRAY3 }}
                  >
                    <span
                      className="text-[18px] font-bold"
                      style={{ color: BP.BLUE4 }}
                    >
                      {stats?.totalEdges.toLocaleString() ?? 0}
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: BP.GRAY1 }}
                    >
                      Edges
                    </span>
                  </div>
                </div>

                {/* Node types section */}
                <button
                  onClick={() => toggleSection("nodeTypes")}
                  className="flex items-center gap-2 px-4 py-2.5 mt-3 w-full text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                >
                  {expandedSections.has("nodeTypes") ? (
                    <ChevronDown size={12} style={{ color: BP.GRAY1 }} />
                  ) : (
                    <ChevronRight size={12} style={{ color: BP.GRAY1 }} />
                  )}
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: BP.GRAY3 }}
                  >
                    Node Types
                  </span>
                </button>

                {expandedSections.has("nodeTypes") && (
                  <div className="px-2 pb-2">
                    {Object.entries(NODE_COLORS).map(([type, color]) => {
                      const count = stats?.nodesByType[type] ?? 0;
                      const Icon = NODE_ICONS[type] || CircleDot;
                      const visible = visibleNodeTypes.has(type);
                      return (
                        <button
                          key={type}
                          onClick={() => toggleNodeType(type)}
                          className="flex items-center gap-2.5 w-full px-3 py-[6px] rounded transition-colors group"
                          style={{
                            background: visible
                              ? "rgba(255,255,255,0.02)"
                              : "transparent",
                          }}
                        >
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                            style={{
                              background: visible
                                ? `${color}20`
                                : "transparent",
                              border: `1px solid ${visible ? color : BP.DARK_GRAY5}`,
                            }}
                          >
                            <Icon
                              size={11}
                              style={{ color: visible ? color : BP.DARK_GRAY5 }}
                            />
                          </div>
                          <span
                            className="text-[12px] flex-1 text-left"
                            style={{ color: visible ? BP.GRAY5 : BP.GRAY1 }}
                          >
                            {NODE_LABELS[type] || type}
                          </span>
                          <span
                            className="text-[10px] tabular-nums"
                            style={{ color: BP.GRAY1 }}
                          >
                            {count}
                          </span>
                          {visible ? (
                            <Eye
                              size={11}
                              style={{ color: BP.GRAY1 }}
                              className="opacity-0 group-hover:opacity-100"
                            />
                          ) : (
                            <EyeOff
                              size={11}
                              style={{ color: BP.DARK_GRAY5 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Edge types section */}
                <button
                  onClick={() => toggleSection("edgeTypes")}
                  className="flex items-center gap-2 px-4 py-2.5 w-full text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                >
                  {expandedSections.has("edgeTypes") ? (
                    <ChevronDown size={12} style={{ color: BP.GRAY1 }} />
                  ) : (
                    <ChevronRight size={12} style={{ color: BP.GRAY1 }} />
                  )}
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: BP.GRAY3 }}
                  >
                    Edge Types
                  </span>
                </button>

                {expandedSections.has("edgeTypes") && (
                  <div className="px-2 pb-2">
                    {Object.entries(EDGE_LABELS).map(([type, label]) => {
                      const count = stats?.edgesByType[type] ?? 0;
                      const visible = visibleEdgeTypes.has(type);
                      return (
                        <button
                          key={type}
                          onClick={() => toggleEdgeType(type)}
                          className="flex items-center gap-2.5 w-full px-3 py-[6px] rounded transition-colors group"
                          style={{
                            background: visible
                              ? "rgba(255,255,255,0.02)"
                              : "transparent",
                          }}
                        >
                          <div
                            className="w-5 h-0.5 flex-shrink-0 rounded-full"
                            style={{
                              background: visible ? BP.GRAY3 : BP.DARK_GRAY5,
                            }}
                          />
                          <span
                            className="text-[12px] flex-1 text-left"
                            style={{ color: visible ? BP.GRAY5 : BP.GRAY1 }}
                          >
                            {label}
                          </span>
                          <span
                            className="text-[10px] tabular-nums"
                            style={{ color: BP.GRAY1 }}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Confidence filter */}
                <div
                  className="px-4 py-3"
                  style={{ borderTop: `1px solid ${BP.DARK_GRAY4}` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: BP.GRAY3 }}
                    >
                      Min Confidence
                    </span>
                    <span
                      className="text-[11px] tabular-nums"
                      style={{ color: BP.GRAY4 }}
                    >
                      {(minConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(Number(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${BP.BLUE3} ${minConfidence * 100}%, ${BP.DARK_GRAY4} ${minConfidence * 100}%)`,
                    }}
                  />
                </div>

                {/* Version info */}
                {stats?.version && (
                  <div
                    className="px-4 py-3 mt-auto"
                    style={{ borderTop: `1px solid ${BP.DARK_GRAY4}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: BP.GRAY1 }}>
                        Version
                      </span>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: BP.GRAY3 }}
                      >
                        v{stats.version}
                      </span>
                    </div>
                    {stats.lastSeeded && (
                      <div className="flex items-center justify-between mt-1">
                        <span
                          className="text-[10px]"
                          style={{ color: BP.GRAY1 }}
                        >
                          Seeded
                        </span>
                        <span
                          className="text-[10px]"
                          style={{ color: BP.GRAY3 }}
                        >
                          {new Date(stats.lastSeeded).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── Selection Tab ─── */}
            {leftTab === "selection" && (
              <div className="flex flex-col h-full">
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: `1px solid ${BP.DARK_GRAY4}` }}
                >
                  <span
                    className="text-[12px] font-semibold uppercase tracking-wider"
                    style={{ color: BP.GRAY3 }}
                  >
                    Selection
                  </span>
                  {selectedNodeId && (
                    <button
                      onClick={() => {
                        setSelectedNodeId(null);
                        setNodeDetail(null);
                      }}
                      className="p-1 rounded transition-colors"
                      style={{ color: BP.GRAY1 }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {!selectedNodeId ? (
                  <div className="flex-1 flex items-center justify-center px-6">
                    <div className="text-center">
                      <MousePointer2
                        size={24}
                        style={{ color: BP.DARK_GRAY5 }}
                        className="mx-auto mb-3"
                      />
                      <p className="text-[12px]" style={{ color: BP.GRAY1 }}>
                        Click a node to inspect its properties and connections.
                      </p>
                    </div>
                  </div>
                ) : detailLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2
                      size={20}
                      className="animate-spin"
                      style={{ color: BP.BLUE4 }}
                    />
                  </div>
                ) : nodeDetail ? (
                  <div className="flex-1 overflow-y-auto">
                    {/* Node header */}
                    <div
                      className="px-4 py-3"
                      style={{ borderBottom: `1px solid ${BP.DARK_GRAY4}` }}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div
                          className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `${NODE_COLORS[nodeDetail.type]}20`,
                            border: `1px solid ${NODE_COLORS[nodeDetail.type]}40`,
                          }}
                        >
                          {(() => {
                            const Icon =
                              NODE_ICONS[nodeDetail.type] || CircleDot;
                            return (
                              <Icon
                                size={14}
                                style={{ color: NODE_COLORS[nodeDetail.type] }}
                              />
                            );
                          })()}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-[11px] font-medium uppercase tracking-wider"
                            style={{
                              color: NODE_COLORS[nodeDetail.type] || BP.GRAY3,
                            }}
                          >
                            {NODE_LABELS[nodeDetail.type] || nodeDetail.type}
                          </p>
                        </div>
                      </div>
                      <p
                        className="text-[13px] font-semibold"
                        style={{ color: BP.LIGHT_GRAY5 }}
                      >
                        {nodeDetail.code}
                      </p>
                      <p
                        className="text-[11px] mt-1 leading-relaxed"
                        style={{ color: BP.GRAY4 }}
                      >
                        {nodeDetail.label}
                      </p>
                    </div>

                    {/* Properties */}
                    <div
                      className="px-4 py-3"
                      style={{ borderBottom: `1px solid ${BP.DARK_GRAY4}` }}
                    >
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                        style={{ color: BP.GRAY1 }}
                      >
                        Properties
                      </p>
                      <div className="space-y-1.5">
                        <PropRow
                          label="Confidence"
                          value={`${(nodeDetail.confidence * 100).toFixed(0)}%`}
                          color={
                            nodeDetail.confidence < 1 ? BP.GOLD4 : BP.GREEN4
                          }
                        />
                        <PropRow
                          label="Valid From"
                          value={new Date(
                            nodeDetail.validFrom,
                          ).toLocaleDateString()}
                        />
                        {nodeDetail.validUntil && (
                          <PropRow
                            label="Valid Until"
                            value={new Date(
                              nodeDetail.validUntil,
                            ).toLocaleDateString()}
                          />
                        )}
                        {nodeDetail.sourceFile && (
                          <PropRow
                            label="Source"
                            value={nodeDetail.sourceFile.split("/").pop() || ""}
                          />
                        )}
                        {Object.entries(nodeDetail.properties).map(
                          ([key, value]) => (
                            <PropRow
                              key={key}
                              label={key}
                              value={String(value)}
                            />
                          ),
                        )}
                      </div>
                    </div>

                    {/* Outgoing edges */}
                    {nodeDetail.outEdges.length > 0 && (
                      <div
                        className="px-4 py-3"
                        style={{ borderBottom: `1px solid ${BP.DARK_GRAY4}` }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                          style={{ color: BP.GRAY1 }}
                        >
                          Outgoing ({nodeDetail.outEdges.length})
                        </p>
                        <div className="space-y-0.5">
                          {nodeDetail.outEdges.slice(0, 30).map((edge, i) => (
                            <button
                              key={i}
                              onClick={() => navigateToNode(edge.toCode)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-left transition-colors group"
                              style={{ background: "transparent" }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  BP.DARK_GRAY3)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <ArrowRight
                                size={10}
                                style={{ color: BP.GRAY1 }}
                                className="flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className="text-[11px] truncate"
                                  style={{ color: BP.GRAY5 }}
                                >
                                  {edge.toCode}
                                </p>
                                <p
                                  className="text-[9px] truncate"
                                  style={{ color: BP.GRAY1 }}
                                >
                                  {EDGE_LABELS[edge.edgeType] || edge.edgeType}
                                </p>
                              </div>
                              <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{
                                  background:
                                    NODE_COLORS[edge.toType] || BP.GRAY1,
                                }}
                              />
                            </button>
                          ))}
                          {nodeDetail.outEdges.length > 30 && (
                            <p
                              className="text-[10px] px-2 py-1"
                              style={{ color: BP.GRAY1 }}
                            >
                              +{nodeDetail.outEdges.length - 30} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Incoming edges */}
                    {nodeDetail.inEdges.length > 0 && (
                      <div className="px-4 py-3">
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                          style={{ color: BP.GRAY1 }}
                        >
                          Incoming ({nodeDetail.inEdges.length})
                        </p>
                        <div className="space-y-0.5">
                          {nodeDetail.inEdges.slice(0, 30).map((edge, i) => (
                            <button
                              key={i}
                              onClick={() => navigateToNode(edge.fromCode)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-left transition-colors"
                              style={{ background: "transparent" }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  BP.DARK_GRAY3)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <ArrowRight
                                size={10}
                                style={{
                                  color: BP.GRAY1,
                                  transform: "rotate(180deg)",
                                }}
                                className="flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className="text-[11px] truncate"
                                  style={{ color: BP.GRAY5 }}
                                >
                                  {edge.fromCode}
                                </p>
                                <p
                                  className="text-[9px] truncate"
                                  style={{ color: BP.GRAY1 }}
                                >
                                  {EDGE_LABELS[edge.edgeType] || edge.edgeType}
                                </p>
                              </div>
                              <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{
                                  background:
                                    NODE_COLORS[edge.fromType] || BP.GRAY1,
                                }}
                              />
                            </button>
                          ))}
                          {nodeDetail.inEdges.length > 30 && (
                            <p
                              className="text-[10px] px-2 py-1"
                              style={{ color: BP.GRAY1 }}
                            >
                              +{nodeDetail.inEdges.length - 30} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center px-6">
                    <p className="text-[12px]" style={{ color: BP.GRAY1 }}>
                      Could not load node details.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Search Tab ─── */}
            {leftTab === "search" && (
              <div className="flex flex-col h-full">
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: `1px solid ${BP.DARK_GRAY4}` }}
                >
                  <div
                    className="flex items-center gap-2 h-8 px-2.5 rounded"
                    style={{
                      background: BP.DARK_GRAY3,
                      border: `1px solid ${BP.DARK_GRAY5}`,
                    }}
                  >
                    <Search size={13} style={{ color: BP.GRAY1 }} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search objects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent outline-none text-[12px] w-full placeholder:opacity-40"
                      style={{ color: BP.LIGHT_GRAY5 }}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")}>
                        <X size={12} style={{ color: BP.GRAY1 }} />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: BP.GRAY1 }}>
                    {searchQuery
                      ? `${searchResults.length} results`
                      : `${nodes.length} objects in graph`}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {searchResults.length > 0
                    ? searchResults.map((node) => (
                        <button
                          key={node.id}
                          onClick={() => selectSearchResult(node)}
                          className="flex items-center gap-2.5 w-full px-4 py-2 text-left transition-colors"
                          style={{ borderBottom: `1px solid ${BP.DARK_GRAY3}` }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = BP.DARK_GRAY3)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              background: NODE_COLORS[node.type] || BP.GRAY1,
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-[12px] font-medium truncate"
                              style={{ color: BP.GRAY5 }}
                            >
                              {node.code}
                            </p>
                            <p
                              className="text-[10px] truncate"
                              style={{ color: BP.GRAY1 }}
                            >
                              {node.label}
                            </p>
                          </div>
                          <span
                            className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{
                              background: `${NODE_COLORS[node.type]}15`,
                              color: NODE_COLORS[node.type] || BP.GRAY3,
                            }}
                          >
                            {node.type.slice(0, 4)}
                          </span>
                        </button>
                      ))
                    : searchQuery && (
                        <div className="flex items-center justify-center px-4 py-8">
                          <p
                            className="text-[12px]"
                            style={{ color: BP.GRAY1 }}
                          >
                            No objects found
                          </p>
                        </div>
                      )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Top Bar ═══ */}
      <div
        className="absolute top-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded"
        style={{
          left: leftCollapsed ? "58px" : "338px",
          background: `${BP.DARK_GRAY2}E0`,
          border: `1px solid ${BP.DARK_GRAY4}`,
          backdropFilter: "blur(12px)",
          transition: "left 0.2s ease",
        }}
      >
        <Network size={14} style={{ color: BP.BLUE4 }} />
        <span
          className="text-[13px] font-semibold"
          style={{ color: BP.LIGHT_GRAY5 }}
        >
          Regulatory Ontology
        </span>
        <span className="text-[11px] ml-1" style={{ color: BP.GRAY1 }}>
          {stats ? `${filteredData.nodes.length} nodes` : ""}
        </span>
        {stats?.version && (
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: BP.DARK_GRAY4, color: BP.GRAY3 }}
          >
            v{stats.version}
          </span>
        )}
        {/* Keyboard shortcut hint */}
        <div
          className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded cursor-pointer"
          style={{
            background: BP.DARK_GRAY3,
            border: `1px solid ${BP.DARK_GRAY5}`,
          }}
          onClick={() => {
            setLeftTab("search");
            setLeftCollapsed(false);
            setTimeout(() => searchInputRef.current?.focus(), 100);
          }}
        >
          <Search size={10} style={{ color: BP.GRAY1 }} />
          <span className="text-[10px]" style={{ color: BP.GRAY1 }}>
            Ctrl+K
          </span>
        </div>
      </div>

      {/* ═══ Zoom Controls (bottom-left, offset for sidebar) ═══ */}
      <div
        className="absolute bottom-4 z-10 flex flex-col gap-px rounded overflow-hidden"
        style={{
          left: leftCollapsed ? "58px" : "338px",
          border: `1px solid ${BP.DARK_GRAY4}`,
          transition: "left 0.2s ease",
        }}
      >
        {[
          { icon: ZoomIn, action: zoomIn, tooltip: "Zoom in" },
          { icon: ZoomOut, action: zoomOut, tooltip: "Zoom out" },
          { icon: Maximize2, action: zoomFit, tooltip: "Fit to view" },
          {
            icon: Crosshair,
            action: () => {
              if (selectedNode && graphRef.current) {
                graphRef.current.centerAt(selectedNode.x, selectedNode.y, 400);
              }
            },
            tooltip: "Center on selection",
          },
        ].map((ctrl, i) => (
          <button
            key={i}
            onClick={ctrl.action}
            title={ctrl.tooltip}
            className="flex items-center justify-center w-8 h-8 transition-colors"
            style={{ background: BP.DARK_GRAY2, color: BP.GRAY3 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = BP.DARK_GRAY3;
              e.currentTarget.style.color = BP.LIGHT_GRAY5;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = BP.DARK_GRAY2;
              e.currentTarget.style.color = BP.GRAY3;
            }}
          >
            <ctrl.icon size={14} />
          </button>
        ))}
      </div>

      {/* ═══ Hover Tooltip ═══ */}
      {hoveredNode && !selectedNodeId && (
        <div
          className="absolute z-30 pointer-events-none px-3 py-2 rounded"
          style={{
            left: "50%",
            bottom: "60px",
            transform: "translateX(-50%)",
            background: `${BP.DARK_GRAY2}F0`,
            border: `1px solid ${BP.DARK_GRAY5}`,
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: NODE_COLORS[hoveredNode.type] }}
            />
            <span
              className="text-[12px] font-medium"
              style={{ color: BP.LIGHT_GRAY5 }}
            >
              {hoveredNode.code}
            </span>
            <span
              className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded"
              style={{
                background: `${NODE_COLORS[hoveredNode.type]}20`,
                color: NODE_COLORS[hoveredNode.type],
              }}
            >
              {NODE_LABELS[hoveredNode.type] || hoveredNode.type}
            </span>
          </div>
          <p
            className="text-[10px] mt-0.5 max-w-[300px] truncate"
            style={{ color: BP.GRAY3 }}
          >
            {hoveredNode.label}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function PropRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: BP.GRAY1 }}>
        {label}
      </span>
      <span
        className="text-[11px] font-medium text-right truncate max-w-[140px]"
        style={{ color: color || BP.GRAY4 }}
      >
        {value}
      </span>
    </div>
  );
}
