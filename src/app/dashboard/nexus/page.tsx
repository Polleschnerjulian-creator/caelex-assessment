"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, Loader2, Filter } from "lucide-react";
import { GlassStagger, glassItemVariants } from "@/components/ui/GlassMotion";
import { motion } from "framer-motion";
import AssetMetricsBar from "@/components/nexus/AssetMetricsBar";
import AssetTable, { type Asset } from "@/components/nexus/AssetTable";
import dynamic from "next/dynamic";
const RiskDistributionChart = dynamic(
  () => import("@/components/nexus/RiskDistributionChart"),
  { ssr: false },
);
import AddAssetWizard from "@/components/nexus/AddAssetWizard";
import type { CreateAssetInput } from "@/lib/nexus/validations";

interface OverviewMetrics {
  totalAssets: number;
  avgComplianceScore: number;
  criticalRiskCount: number;
  openVulnerabilities: number;
}

interface RiskDist {
  criticality: string;
  count: number;
}

interface OverviewData {
  metrics: OverviewMetrics;
  riskDistribution: RiskDist[];
}

interface AssetFilters {
  search: string;
  criticality: string;
  category: string;
  status: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

const DEFAULT_FILTERS: AssetFilters = {
  search: "",
  criticality: "",
  category: "",
  status: "",
  sortBy: "name",
  sortOrder: "asc",
};

const CRITICALITY_OPTIONS = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const CATEGORY_OPTIONS = [
  "",
  "SPACE_SEGMENT",
  "GROUND_SEGMENT",
  "LINK_SEGMENT",
  "SOFTWARE_DATA",
  "ORGANISATIONAL",
];
const STATUS_OPTIONS = [
  "",
  "ACTIVE",
  "STANDBY",
  "MAINTENANCE",
  "DECOMMISSIONED",
  "PLANNED",
];

export default function NexusPage() {
  const router = useRouter();

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssetFilters>(DEFAULT_FILTERS);
  const [showWizard, setShowWizard] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/nexus/overview");
      if (!res.ok) throw new Error("Failed to load overview");
      const data = await res.json();
      setOverview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchAssets = useCallback(
    async (f: AssetFilters = filters) => {
      setLoadingAssets(true);
      try {
        const params = new URLSearchParams();
        if (f.search) params.set("search", f.search);
        if (f.criticality) params.set("criticality", f.criticality);
        if (f.category) params.set("category", f.category);
        if (f.status) params.set("operationalStatus", f.status);
        params.set("sortBy", f.sortBy);
        params.set("sortOrder", f.sortOrder);
        params.set("limit", "50");

        const res = await fetch(`/api/nexus/assets?${params}`);
        if (!res.ok) throw new Error("Failed to load assets");
        const data = await res.json();
        const items: Asset[] = (data.assets ?? data.items ?? []).map(
          (a: {
            id: string;
            name: string;
            assetType: string;
            category: string;
            criticality: string;
            complianceScore?: number;
            riskScore?: number;
            operationalStatus: string;
          }) => ({
            id: a.id,
            name: a.name,
            assetType: a.assetType,
            category: a.category,
            criticality: a.criticality as Asset["criticality"],
            complianceScore: a.complianceScore ?? 0,
            riskScore: a.riskScore ?? 0,
            operationalStatus:
              a.operationalStatus as Asset["operationalStatus"],
          }),
        );
        setAssets(items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load assets");
      } finally {
        setLoadingAssets(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    void fetchOverview();
    void fetchAssets(DEFAULT_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOverview]);

  function handleSort(field: string, order: "asc" | "desc") {
    const newFilters = { ...filters, sortBy: field, sortOrder: order };
    setFilters(newFilters);
    void fetchAssets(newFilters);
  }

  function handleFilterChange<K extends keyof AssetFilters>(
    key: K,
    value: AssetFilters[K],
  ) {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    if (key === "search") {
      // Debounce search to avoid excessive API calls while typing
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        void fetchAssets(newFilters);
      }, 300);
    } else {
      void fetchAssets(newFilters);
    }
  }

  async function handleAddAsset(data: CreateAssetInput) {
    const res = await fetch("/api/nexus/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Failed to create asset");
    }
    // Refresh data
    void fetchOverview();
    void fetchAssets(filters);
  }

  function retry() {
    setError(null);
    setLoadingOverview(true);
    setLoadingAssets(true);
    void fetchOverview();
    void fetchAssets(filters);
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      {/* Header */}
      <motion.div
        variants={glassItemVariants}
        initial="hidden"
        animate="visible"
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-display-sm font-bold text-white">
            Asset Register
          </h1>
          <p className="text-body text-slate-400 mt-1">
            NEXUS — NIS2 space asset inventory &amp; compliance tracking
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-body font-medium rounded-lg transition-colors flex-shrink-0"
        >
          <Plus size={16} />
          Add Asset
        </button>
      </motion.div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-center justify-between">
          <p className="text-small text-red-400">{error}</p>
          <button
            onClick={retry}
            className="flex items-center gap-1.5 px-3 py-1.5 text-small text-red-400 hover:text-white rounded-lg border border-red-500/30 hover:bg-red-500/20 transition-colors"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Metrics bar */}
      <GlassStagger>
        {loadingOverview ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-surface rounded-[var(--radius-lg)] h-[88px] animate-pulse"
              />
            ))}
          </div>
        ) : overview ? (
          <AssetMetricsBar metrics={overview.metrics} />
        ) : null}
      </GlassStagger>

      {/* Filter bar */}
      <motion.div
        variants={glassItemVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap items-center gap-3"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            placeholder="Search assets…"
            className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg pl-8 pr-3 py-2 text-body text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 text-small rounded-lg border transition-colors ${
            showFilters
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
              : "border-[var(--glass-border)] text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Filter size={14} /> Filters
          {(filters.criticality || filters.category || filters.status) && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
        </button>

        {loadingAssets && (
          <Loader2 size={16} className="animate-spin text-slate-500" />
        )}

        {showFilters && (
          <div className="w-full flex flex-wrap gap-3">
            <select
              value={filters.criticality}
              onChange={(e) =>
                handleFilterChange("criticality", e.target.value)
              }
              className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">All criticalities</option>
              {CRITICALITY_OPTIONS.filter(Boolean).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.filter(Boolean).map((o) => (
                <option key={o} value={o}>
                  {o!.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.filter(Boolean).map((o) => (
                <option key={o} value={o}>
                  {o!.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            {(filters.criticality ||
              filters.category ||
              filters.status ||
              filters.search) && (
              <button
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  void fetchAssets(DEFAULT_FILTERS);
                }}
                className="text-small text-slate-400 hover:text-white transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Main content: table + chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Asset table */}
        <motion.div
          variants={glassItemVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-3"
        >
          {loadingAssets && assets.length === 0 ? (
            <div className="glass-elevated rounded-[var(--radius-lg)] overflow-hidden border border-[var(--glass-border)]">
              <div className="p-4 space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-10 bg-white/[0.03] rounded animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : (
            <AssetTable
              assets={assets}
              onSort={handleSort}
              onRowClick={(id) => router.push(`/dashboard/nexus/${id}`)}
            />
          )}
        </motion.div>

        {/* Risk distribution chart */}
        <motion.div
          variants={glassItemVariants}
          initial="hidden"
          animate="visible"
        >
          {loadingOverview ? (
            <div className="glass-surface rounded-[var(--radius-lg)] h-64 animate-pulse" />
          ) : overview ? (
            <RiskDistributionChart data={overview.riskDistribution} />
          ) : null}
        </motion.div>
      </div>

      {/* Add asset wizard */}
      <AddAssetWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSubmit={handleAddAsset}
      />
    </div>
  );
}
