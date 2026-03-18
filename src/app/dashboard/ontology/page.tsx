"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  X,
  Filter,
  ChevronRight,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  Loader2,
  ArrowRight,
  ArrowLeft,
  GitBranch,
} from "lucide-react";

// ─── Dynamic import (canvas-based, no SSR) ──────────────────────────────────

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full">
      <Loader2 className="w-8 h-8 animate-spin text-white/30" />
    </div>
  ),
});

// ─── Constants ───────────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  REGULATION: "#3B82F6",
  OBLIGATION: "#10B981",
  JURISDICTION: "#F59E0B",
  OPERATOR_TYPE: "#8B5CF6",
  EVIDENCE_REQ: "#EC4899",
  STANDARD: "#06B6D4",
  AUTHORITY: "#F97316",
  DOMAIN: "#6366F1",
};

const NODE_SIZES: Record<string, number> = {
  REGULATION: 10,
  STANDARD: 10,
  OBLIGATION: 6,
  JURISDICTION: 5,
  OPERATOR_TYPE: 4,
  EVIDENCE_REQ: 4,
  AUTHORITY: 5,
  DOMAIN: 5,
};

const EDGE_COLORS: Record<string, string> = {
  IMPLEMENTS: "#3B82F6",
  APPLIES_TO: "#10B981",
  REQUIRES_EVIDENCE: "#EC4899",
  CONFLICTS_WITH: "#EF4444",
  SUPERSEDES: "#F59E0B",
  CODIFIES: "#8B5CF6",
  EXTENDS: "#06B6D4",
  NEW_OBLIGATION: "#22C55E",
  ADMINISTERED_BY: "#F97316",
  BELONGS_TO: "#6366F1",
  SCOPED_TO: "#94A3B8",
  CONTAINS: "#64748B",
};

const BG_COLOR = "#0A0F1E";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  code: string;
  label: string;
  type: string;
  confidence: number;
  properties: Record<string, unknown>;
  sourceFile: string | null;
  // Force-graph additions
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
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<Set<string>>(
    new Set(Object.keys(NODE_COLORS)),
  );
  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState<Set<string>>(
    new Set(Object.keys(EDGE_COLORS)),
  );
  const [minConfidence, setMinConfidence] = useState(0);

  // Panel
  const [panelOpen, setPanelOpen] = useState(true);

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

  // ─── Node Detail Fetching ───────────────────────────────────────────────

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
      setPanelOpen(true);
      loadNodeDetail(node.id);

      // Center on node
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 600);
        graphRef.current.zoom(3, 600);
      }
    },
    [loadNodeDetail],
  );

  // ─── Search ──────────────────────────────────────────────────────────────

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
      .slice(0, 12);
    setSearchResults(results);
  }, [searchQuery, nodes]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectSearchResult = useCallback(
    (node: GraphNode) => {
      setSearchQuery("");
      setSearchOpen(false);
      handleNodeClick(node);
    },
    [handleNodeClick],
  );

  // ─── Filtered Graph Data ────────────────────────────────────────────────

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

  // ─── Seed Ontology ──────────────────────────────────────────────────────

  const handleSeed = useCallback(async () => {
    if (seeding) return;
    if (!confirm("Re-seed the ontology? This will refresh all graph data."))
      return;
    setSeeding(true);
    try {
      const res = await fetch("/api/ontology/seed", { method: "POST" });
      if (!res.ok) throw new Error("Seed failed");
      await loadGraph();
    } catch {
      // silently fail, user can see the error in the toast
    } finally {
      setSeeding(false);
    }
  }, [seeding, loadGraph]);

  // ─── Graph Rendering ────────────────────────────────────────────────────

  const paintNode = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const radius = NODE_SIZES[node.type] || 4;
      const color = NODE_COLORS[node.type] || "#64748B";
      const isSelected = node.id === selectedNodeId;
      const isHovered = hoveredNode?.id === node.id;
      const x = node.x ?? 0;
      const y = node.y ?? 0;

      // Glow for selected/hovered
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 6, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? `${color}40` : `${color}20`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? `${color}60` : `${color}30`;
        ctx.fill();
      }

      // Main circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Border
      ctx.strokeStyle = isSelected ? "#FFFFFF" : `${color}80`;
      ctx.lineWidth = isSelected ? 2 : 0.5;
      ctx.stroke();

      // Confidence ring for proposals (confidence < 1.0)
      if (node.confidence < 1.0 && node.confidence > 0) {
        ctx.beginPath();
        ctx.arc(
          x,
          y,
          radius + 2,
          -Math.PI / 2,
          -Math.PI / 2 + 2 * Math.PI * node.confidence,
        );
        ctx.strokeStyle = "#F59E0B";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Label — show when zoom is sufficient or node is selected/hovered
      const fontSize = Math.max(3, 10 / globalScale);
      if (isSelected || isHovered || globalScale > 2.5) {
        const label = node.code;
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = isSelected || isHovered ? "#F8FAFC" : "#F8FAFC90";
        ctx.fillText(label, x, y + radius + 2);
      }
    },
    [selectedNodeId, hoveredNode],
  );

  const paintLink = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any, ctx: CanvasRenderingContext2D, _globalScale: number) => {
      const source = link.source;
      const target = link.target;
      if (!source.x || !source.y || !target.x || !target.y) return;

      const color = EDGE_COLORS[link.type] || "#475569";

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = `${color}40`;
      ctx.lineWidth = 0.4;
      ctx.stroke();

      // Arrow
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return;

      const targetRadius = NODE_SIZES[target.type] || 4;
      const ratio = (dist - targetRadius - 2) / dist;
      const ax = source.x + dx * ratio;
      const ay = source.y + dy * ratio;

      const arrowLen = 3;
      const arrowAngle = Math.PI / 6;
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
      ctx.strokeStyle = `${color}60`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    },
    [],
  );

  // ─── Navigate to connected node ─────────────────────────────────────────

  const navigateToNode = useCallback(
    (code: string) => {
      const node = nodes.find((n) => n.code === code);
      if (node) handleNodeClick(node);
    },
    [nodes, handleNodeClick],
  );

  // ─── Zoom controls ─────────────────────────────────────────────────────

  const zoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.4, 300);
    }
  };

  const zoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom / 1.4, 300);
    }
  };

  const zoomFit = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 60);
    }
  };

  // ─── Toggle helpers ─────────────────────────────────────────────────────

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

  // ─── Keyboard shortcut: Escape closes panel ───────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (searchOpen) setSearchOpen(false);
        else if (filtersOpen) setFiltersOpen(false);
        else if (selectedNodeId) {
          setSelectedNodeId(null);
          setNodeDetail(null);
        }
      }
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen, filtersOpen, selectedNodeId]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className="flex items-center justify-center w-full h-screen"
        style={{ background: BG_COLOR }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-white/30" />
          <p className="text-white/40 text-sm font-medium">
            Loading regulatory ontology...
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
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <Info className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-white/60 text-sm">Failed to load ontology graph</p>
          <p className="text-white/30 text-xs max-w-[300px]">{error}</p>
          <button
            onClick={loadGraph}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors border border-white/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
          const radius = NODE_SIZES[node.type ?? ""] || 4;
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

      {/* ═══ Header Overlay ═══ */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div
          className="pointer-events-auto mx-4 mt-4 flex items-center gap-3 px-5 py-3.5 rounded-2xl"
          style={{
            background: "rgba(10, 15, 30, 0.75)",
            backdropFilter: "blur(24px) saturate(1.6)",
            WebkitBackdropFilter: "blur(24px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Icon */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(59,130,246,0.15))",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <GitBranch size={18} className="text-indigo-400" />
          </div>

          {/* Title & stats */}
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-semibold text-white/90 leading-tight">
              Regulatory Ontology
            </h1>
            <p className="text-[11px] text-white/35 leading-tight mt-0.5">
              {stats
                ? `${stats.totalNodes.toLocaleString()} nodes \u00B7 ${stats.totalEdges.toLocaleString()} edges`
                : "Loading..."}
              {stats?.version && (
                <span className="ml-2 text-white/20">v{stats.version}</span>
              )}
            </p>
          </div>

          {/* Search */}
          <div ref={searchRef} className="relative">
            <div
              className="flex items-center gap-2 h-8 px-3 rounded-lg min-w-[200px] cursor-text"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onClick={() => setSearchOpen(true)}
            >
              <Search size={14} className="text-white/30 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search nodes... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                className="bg-transparent outline-none text-[12px] text-white/70 placeholder:text-white/25 w-full"
              />
              {searchQuery && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="text-white/30 hover:text-white/60"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchOpen && searchResults.length > 0 && (
              <div
                className="absolute top-full mt-2 right-0 w-[320px] rounded-xl overflow-hidden z-50"
                style={{
                  background: "rgba(10, 15, 30, 0.95)",
                  backdropFilter: "blur(24px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <div className="max-h-[320px] overflow-y-auto">
                  {searchResults.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => selectSearchResult(node)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          background: NODE_COLORS[node.type] || "#64748B",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-white/80 truncate">
                          {node.code}
                        </p>
                        <p className="text-[10px] text-white/35 truncate">
                          {node.label}
                        </p>
                      </div>
                      <span
                        className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          background: `${NODE_COLORS[node.type] || "#64748B"}20`,
                          color: NODE_COLORS[node.type] || "#64748B",
                        }}
                      >
                        {node.type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors ${
              filtersOpen
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "bg-white/4 text-white/50 hover:text-white/70 hover:bg-white/8 border border-white/8"
            }`}
          >
            <Filter size={13} />
            Filters
          </button>

          {/* Re-seed */}
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium bg-white/4 text-white/50 hover:text-white/70 hover:bg-white/8 transition-colors border border-white/8 disabled:opacity-40"
          >
            <RefreshCw size={13} className={seeding ? "animate-spin" : ""} />
            Re-seed
          </button>
        </div>
      </div>

      {/* ═══ Filters Panel ═══ */}
      {filtersOpen && (
        <div
          className="absolute top-[80px] right-4 z-20 w-[280px] rounded-xl overflow-hidden"
          style={{
            background: "rgba(10, 15, 30, 0.9)",
            backdropFilter: "blur(24px) saturate(1.6)",
            WebkitBackdropFilter: "blur(24px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[12px] font-semibold text-white/70 uppercase tracking-wider">
                Node Types
              </h3>
              <button
                onClick={() => setFiltersOpen(false)}
                className="text-white/30 hover:text-white/60"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-1.5">
              {Object.entries(NODE_COLORS).map(([type, color]) => (
                <label
                  key={type}
                  className="flex items-center gap-2.5 py-1 cursor-pointer group"
                >
                  <div className="relative w-4 h-4 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={visibleNodeTypes.has(type)}
                      onChange={() => toggleNodeType(type)}
                      className="sr-only"
                    />
                    <div
                      className="w-4 h-4 rounded border transition-colors"
                      style={{
                        background: visibleNodeTypes.has(type)
                          ? color
                          : "transparent",
                        borderColor: visibleNodeTypes.has(type)
                          ? color
                          : "rgba(255,255,255,0.15)",
                      }}
                    >
                      {visibleNodeTypes.has(type) && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-[12px] text-white/60 group-hover:text-white/80 transition-colors">
                    {type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-white/25 ml-auto">
                    {stats?.nodesByType?.[type] || 0}
                  </span>
                </label>
              ))}
            </div>

            <div className="my-4 border-t border-white/6" />

            <h3 className="text-[12px] font-semibold text-white/70 uppercase tracking-wider mb-3">
              Edge Types
            </h3>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar">
              {Object.entries(EDGE_COLORS).map(([type, color]) => (
                <label
                  key={type}
                  className="flex items-center gap-2.5 py-1 cursor-pointer group"
                >
                  <div className="relative w-4 h-4 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={visibleEdgeTypes.has(type)}
                      onChange={() => toggleEdgeType(type)}
                      className="sr-only"
                    />
                    <div
                      className="w-4 h-4 rounded border transition-colors"
                      style={{
                        background: visibleEdgeTypes.has(type)
                          ? color
                          : "transparent",
                        borderColor: visibleEdgeTypes.has(type)
                          ? color
                          : "rgba(255,255,255,0.15)",
                      }}
                    >
                      {visibleEdgeTypes.has(type) && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-[12px] text-white/60 group-hover:text-white/80 transition-colors">
                    {type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-white/25 ml-auto">
                    {stats?.edgesByType?.[type] || 0}
                  </span>
                </label>
              ))}
            </div>

            <div className="my-4 border-t border-white/6" />

            <h3 className="text-[12px] font-semibold text-white/70 uppercase tracking-wider mb-3">
              Confidence Threshold
            </h3>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #6366F1 ${minConfidence * 100}%, rgba(255,255,255,0.1) ${minConfidence * 100}%)`,
                }}
              />
              <span className="text-[11px] text-white/50 tabular-nums min-w-[32px] text-right">
                {(minConfidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Zoom Controls ═══ */}
      <div
        className="absolute bottom-6 left-6 z-10 flex flex-col gap-1.5 rounded-xl overflow-hidden"
        style={{
          background: "rgba(10, 15, 30, 0.75)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          onClick={zoomIn}
          className="flex items-center justify-center w-9 h-9 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <div className="border-t border-white/6" />
        <button
          onClick={zoomOut}
          className="flex items-center justify-center w-9 h-9 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <div className="border-t border-white/6" />
        <button
          onClick={zoomFit}
          className="flex items-center justify-center w-9 h-9 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
          title="Fit to view"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* ═══ Legend (bottom-left, above zoom) ═══ */}
      <div
        className="absolute bottom-6 left-[60px] z-10 flex items-center gap-3 px-3 py-2 rounded-xl"
        style={{
          background: "rgba(10, 15, 30, 0.65)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: color }}
            />
            <span className="text-[9px] text-white/30 uppercase tracking-wider">
              {type.replace(/_/g, " ").slice(0, 8)}
            </span>
          </div>
        ))}
      </div>

      {/* ═══ Side Detail Panel ═══ */}
      <div
        className="absolute top-4 bottom-4 right-4 z-10 transition-all duration-300 ease-out"
        style={{
          width: panelOpen && selectedNodeId ? 340 : 0,
          opacity: panelOpen && selectedNodeId ? 1 : 0,
          pointerEvents: panelOpen && selectedNodeId ? "auto" : "none",
        }}
      >
        <div
          className="h-full rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "rgba(10, 15, 30, 0.88)",
            backdropFilter: "blur(32px) saturate(1.8)",
            WebkitBackdropFilter: "blur(32px) saturate(1.8)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Panel Header */}
          <div
            className="flex items-center justify-between px-5 py-4 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <h2 className="text-[13px] font-semibold text-white/70 uppercase tracking-wider">
              Node Detail
            </h2>
            <button
              onClick={() => {
                setSelectedNodeId(null);
                setNodeDetail(null);
              }}
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-white/20" />
              </div>
            ) : nodeDetail ? (
              <div className="space-y-5">
                {/* Node Identity */}
                <div>
                  <p className="text-[18px] font-bold text-white/90 leading-tight">
                    {nodeDetail.code}
                  </p>
                  <p className="text-[13px] text-white/50 mt-1 leading-snug">
                    {nodeDetail.label}
                  </p>
                </div>

                {/* Type badge + Confidence */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{
                      background: `${NODE_COLORS[nodeDetail.type] || "#64748B"}20`,
                      color: NODE_COLORS[nodeDetail.type] || "#64748B",
                      border: `1px solid ${NODE_COLORS[nodeDetail.type] || "#64748B"}30`,
                    }}
                  >
                    {nodeDetail.type.replace(/_/g, " ")}
                  </span>
                  {nodeDetail.confidence < 1.0 && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                      Proposal
                    </span>
                  )}
                </div>

                {/* Confidence bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                      Confidence
                    </span>
                    <span className="text-[11px] text-white/60 tabular-nums font-medium">
                      {(nodeDetail.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${nodeDetail.confidence * 100}%`,
                        background:
                          nodeDetail.confidence >= 0.9
                            ? "#10B981"
                            : nodeDetail.confidence >= 0.7
                              ? "#F59E0B"
                              : "#EF4444",
                      }}
                    />
                  </div>
                </div>

                {/* Properties */}
                {Object.keys(nodeDetail.properties).length > 0 && (
                  <div>
                    <h3 className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-2">
                      Properties
                    </h3>
                    <div className="space-y-1.5">
                      {Object.entries(nodeDetail.properties).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="flex items-start gap-2 py-1.5 px-3 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.02)" }}
                          >
                            <span className="text-[10px] text-white/30 font-medium min-w-[70px] flex-shrink-0">
                              {key}
                            </span>
                            <span className="text-[11px] text-white/60 break-words">
                              {String(value)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Source */}
                {nodeDetail.sourceFile && (
                  <div
                    className="px-3 py-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <span className="text-[10px] text-white/30 font-medium">
                      Source
                    </span>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      {nodeDetail.sourceFile}
                    </p>
                  </div>
                )}

                {/* Connections */}
                <div>
                  <h3 className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-3">
                    Connections
                  </h3>

                  {/* Outgoing */}
                  {nodeDetail.outEdges.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <ArrowRight size={10} className="text-emerald-400/60" />
                        Outgoing ({nodeDetail.outEdges.length})
                      </p>
                      <div className="space-y-1">
                        {nodeDetail.outEdges.map((edge, i) => (
                          <button
                            key={`out-${i}`}
                            onClick={() => navigateToNode(edge.toCode)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
                          >
                            <span
                              className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{
                                background: `${EDGE_COLORS[edge.edgeType] || "#475569"}15`,
                                color: EDGE_COLORS[edge.edgeType] || "#475569",
                              }}
                            >
                              {edge.edgeType.replace(/_/g, " ")}
                            </span>
                            <span className="text-[11px] text-white/50 group-hover:text-white/70 truncate transition-colors">
                              {edge.toLabel}
                            </span>
                            <ChevronRight
                              size={12}
                              className="text-white/15 group-hover:text-white/40 ml-auto flex-shrink-0 transition-colors"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Incoming */}
                  {nodeDetail.inEdges.length > 0 && (
                    <div>
                      <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <ArrowLeft size={10} className="text-blue-400/60" />
                        Incoming ({nodeDetail.inEdges.length})
                      </p>
                      <div className="space-y-1">
                        {nodeDetail.inEdges.map((edge, i) => (
                          <button
                            key={`in-${i}`}
                            onClick={() => navigateToNode(edge.fromCode)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
                          >
                            <span
                              className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{
                                background: `${EDGE_COLORS[edge.edgeType] || "#475569"}15`,
                                color: EDGE_COLORS[edge.edgeType] || "#475569",
                              }}
                            >
                              {edge.edgeType.replace(/_/g, " ")}
                            </span>
                            <span className="text-[11px] text-white/50 group-hover:text-white/70 truncate transition-colors">
                              {edge.fromLabel}
                            </span>
                            <ChevronRight
                              size={12}
                              className="text-white/15 group-hover:text-white/40 ml-auto flex-shrink-0 transition-colors"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {nodeDetail.outEdges.length === 0 &&
                    nodeDetail.inEdges.length === 0 && (
                      <p className="text-[11px] text-white/25 text-center py-4">
                        No connections found
                      </p>
                    )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Info className="w-8 h-8 text-white/10 mb-3" />
                <p className="text-[12px] text-white/30">
                  Select a node to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Stats Sidebar (when no node selected) ═══ */}
      {!selectedNodeId && stats && (
        <div
          className="absolute top-[80px] right-4 z-10 w-[240px] rounded-xl overflow-hidden"
          style={{
            background: "rgba(10, 15, 30, 0.65)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div className="p-4">
            <h3 className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-3">
              Graph Overview
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div
                className="px-3 py-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <p className="text-[16px] font-bold text-white/80 tabular-nums">
                  {stats.totalNodes.toLocaleString()}
                </p>
                <p className="text-[9px] text-white/30 uppercase tracking-wider">
                  Nodes
                </p>
              </div>
              <div
                className="px-3 py-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <p className="text-[16px] font-bold text-white/80 tabular-nums">
                  {stats.totalEdges.toLocaleString()}
                </p>
                <p className="text-[9px] text-white/30 uppercase tracking-wider">
                  Edges
                </p>
              </div>
            </div>

            <h3 className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-2">
              By Type
            </h3>
            <div className="space-y-1.5">
              {Object.entries(stats.nodesByType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: NODE_COLORS[type] || "#64748B",
                      }}
                    />
                    <span className="text-[11px] text-white/50 flex-1 truncate">
                      {type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-white/30 tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/6">
              <p className="text-[10px] text-white/25 text-center">
                Click a node to explore
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Hover Tooltip ═══ */}
      {hoveredNode && !selectedNodeId && (
        <div
          className="absolute z-30 pointer-events-none px-3 py-2 rounded-lg"
          style={{
            left: (hoveredNode.x ?? 0) + 20,
            top: (hoveredNode.y ?? 0) - 10,
            background: "rgba(10, 15, 30, 0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            // Tooltip positioning uses screen coords from the graph
            // We let the graph canvas handle this through CSS transform
            display: "none",
          }}
        >
          <p className="text-[11px] font-medium text-white/80">
            {hoveredNode.code}
          </p>
          <p className="text-[9px] text-white/40">{hoveredNode.label}</p>
        </div>
      )}
    </div>
  );
}
