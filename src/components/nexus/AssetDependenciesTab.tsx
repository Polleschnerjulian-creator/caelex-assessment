"use client";

import { useState } from "react";
import { Plus, Trash2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import DependencyGraph from "./DependencyGraph";

interface Dep {
  id: string;
  dependencyType: string;
  strength: string;
  description?: string | null;
  asset: {
    id: string;
    name: string;
    assetType: string;
    criticality: string;
  };
}

interface AssetDependenciesTabProps {
  assetId: string;
  dependencies: {
    from: Dep[]; // This asset depends on these
    to: Dep[]; // These assets depend on this one
  };
  onAdd: (data: {
    targetAssetId: string;
    dependencyType: string;
    strength: string;
    description?: string;
  }) => Promise<void>;
  onRemove: (depId: string) => Promise<void>;
}

const STRENGTH_COLOR: Record<string, string> = {
  HARD: "text-red-400",
  SOFT: "text-amber-400",
  REDUNDANT: "text-emerald-400",
};

const CRITICALITY_COLOR: Record<string, string> = {
  CRITICAL: "text-red-400",
  HIGH: "text-amber-400",
  MEDIUM: "text-blue-400",
  LOW: "text-slate-400",
};

function DepRow({
  dep,
  direction,
  onRemove,
}: {
  dep: Dep;
  direction: "from" | "to";
  onRemove: (id: string) => Promise<void>;
}) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      await onRemove(dep.id);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[var(--glass-border)] last:border-0">
      <div
        className={`flex-shrink-0 ${direction === "from" ? "text-blue-400" : "text-purple-400"}`}
      >
        {direction === "from" ? (
          <ArrowRight size={14} />
        ) : (
          <ArrowLeft size={14} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-small font-medium text-slate-200 truncate">
          {dep.asset.name}
        </p>
        <p className="text-caption text-slate-500">
          {dep.dependencyType.replace(/_/g, " ")} ·{" "}
          <span
            className={`font-medium ${STRENGTH_COLOR[dep.strength] ?? "text-slate-400"}`}
          >
            {dep.strength}
          </span>
          {dep.asset.criticality && (
            <>
              {" "}
              ·{" "}
              <span
                className={
                  CRITICALITY_COLOR[dep.asset.criticality] ?? "text-slate-400"
                }
              >
                {dep.asset.criticality}
              </span>
            </>
          )}
        </p>
        {dep.description && (
          <p className="text-caption text-slate-600 truncate">
            {dep.description}
          </p>
        )}
      </div>
      <button
        onClick={handleRemove}
        disabled={removing}
        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 rounded"
      >
        {removing ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Trash2 size={12} />
        )}
      </button>
    </div>
  );
}

export default function AssetDependenciesTab({
  assetId,
  dependencies,
  onAdd,
  onRemove,
}: AssetDependenciesTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTarget, setAddTarget] = useState("");
  const [addType, setAddType] = useState("REQUIRES");
  const [addStrength, setAddStrength] = useState("HARD");
  const [addDesc, setAddDesc] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!addTarget.trim()) return;
    setAdding(true);
    try {
      await onAdd({
        targetAssetId: addTarget.trim(),
        dependencyType: addType,
        strength: addStrength,
        description: addDesc || undefined,
      });
      setAddTarget("");
      setAddDesc("");
      setShowAddForm(false);
    } finally {
      setAdding(false);
    }
  }

  // Build graph data
  const allNodes = [
    { id: assetId, name: "This Asset", type: "", isCurrent: true },
    ...dependencies.from.map((d) => ({
      id: d.asset.id,
      name: d.asset.name,
      type: d.asset.assetType,
      isCurrent: false,
    })),
    ...dependencies.to.map((d) => ({
      id: d.asset.id,
      name: d.asset.name,
      type: d.asset.assetType,
      isCurrent: false,
    })),
  ];

  // Deduplicate nodes by id
  const seenIds = new Set<string>();
  const uniqueNodes = allNodes.filter((n) => {
    if (seenIds.has(n.id)) return false;
    seenIds.add(n.id);
    return true;
  });

  const allEdges = [
    ...dependencies.from.map((d) => ({
      source: assetId,
      target: d.asset.id,
      strength: d.strength,
      type: d.dependencyType,
    })),
    ...dependencies.to.map((d) => ({
      source: d.asset.id,
      target: assetId,
      strength: d.strength,
      type: d.dependencyType,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Dependency list */}
        <div className="space-y-3">
          {/* Outgoing */}
          <GlassCard hover={false} className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)]">
              <div>
                <h4 className="text-body font-semibold text-slate-200">
                  Depends On ({dependencies.from.length})
                </h4>
                <p className="text-caption text-slate-500">
                  Assets this asset requires
                </p>
              </div>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-caption rounded-lg border border-emerald-500/30 transition-colors"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            {showAddForm && (
              <div className="px-4 py-3 border-b border-[var(--glass-border)] bg-white/[0.02] space-y-2">
                <input
                  type="text"
                  value={addTarget}
                  onChange={(e) => setAddTarget(e.target.value)}
                  placeholder="Target asset ID"
                  className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-small text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                />
                <div className="flex gap-2">
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value)}
                    className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-2 py-1.5 text-small text-slate-200 focus:outline-none"
                  >
                    {[
                      "REQUIRES",
                      "COMMUNICATES_WITH",
                      "CONTROLLED_BY",
                      "PROCESSES_DATA_FROM",
                      "POWERED_BY",
                      "BACKS_UP",
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={addStrength}
                    onChange={(e) => setAddStrength(e.target.value)}
                    className="w-28 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-2 py-1.5 text-small text-slate-200 focus:outline-none"
                  >
                    {["HARD", "SOFT", "REDUNDANT"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-small text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    disabled={adding || !addTarget.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-small rounded-lg transition-colors"
                  >
                    {adding ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : null}
                    Add Dependency
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-small text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="px-4">
              {dependencies.from.length === 0 ? (
                <p className="py-4 text-small text-slate-500 text-center">
                  No outgoing dependencies
                </p>
              ) : (
                dependencies.from.map((dep) => (
                  <DepRow
                    key={dep.id}
                    dep={dep}
                    direction="from"
                    onRemove={onRemove}
                  />
                ))
              )}
            </div>
          </GlassCard>

          {/* Incoming */}
          <GlassCard hover={false} className="overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--glass-border)]">
              <h4 className="text-body font-semibold text-slate-200">
                Depended Upon By ({dependencies.to.length})
              </h4>
              <p className="text-caption text-slate-500">
                Assets that require this one
              </p>
            </div>
            <div className="px-4">
              {dependencies.to.length === 0 ? (
                <p className="py-4 text-small text-slate-500 text-center">
                  No incoming dependencies
                </p>
              ) : (
                dependencies.to.map((dep) => (
                  <DepRow
                    key={dep.id}
                    dep={dep}
                    direction="to"
                    onRemove={onRemove}
                  />
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Graph */}
        <GlassCard hover={false} className="p-4">
          <h4 className="text-body font-semibold text-slate-200 mb-3">
            Dependency Graph
          </h4>
          <DependencyGraph nodes={uniqueNodes} edges={allEdges} />
        </GlassCard>
      </div>

      {/* Impact analysis */}
      {(dependencies.from.length > 0 || dependencies.to.length > 0) && (
        <GlassCard hover={false} className="p-4">
          <h4 className="text-body font-semibold text-slate-200 mb-2">
            Impact Analysis
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-white/[0.02] border border-[var(--glass-border)]">
              <p className="text-display-sm font-bold text-red-400">
                {dependencies.from.filter((d) => d.strength === "HARD").length}
              </p>
              <p className="text-caption text-slate-500 mt-1">
                Hard dependencies
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/[0.02] border border-[var(--glass-border)]">
              <p className="text-display-sm font-bold text-amber-400">
                {dependencies.from.filter((d) => d.strength === "SOFT").length}
              </p>
              <p className="text-caption text-slate-500 mt-1">
                Soft dependencies
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/[0.02] border border-[var(--glass-border)]">
              <p className="text-display-sm font-bold text-emerald-400">
                {
                  dependencies.from.filter((d) => d.strength === "REDUNDANT")
                    .length
                }
              </p>
              <p className="text-caption text-slate-500 mt-1">
                Redundant paths
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
