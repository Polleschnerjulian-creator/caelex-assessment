"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { glassItemVariants } from "@/components/ui/GlassMotion";
import GlassCard from "@/components/ui/GlassCard";

import AssetOverviewTab, {
  type AssetDetail,
} from "@/components/nexus/AssetOverviewTab";
import AssetRequirementsTab, {
  type AssetRequirement,
} from "@/components/nexus/AssetRequirementsTab";
import AssetDependenciesTab from "@/components/nexus/AssetDependenciesTab";
import AssetSecurityTab, {
  type Vuln,
  type Supplier,
  type Personnel,
} from "@/components/nexus/AssetSecurityTab";
import AssetAuditTab from "@/components/nexus/AssetAuditTab";

type TabId =
  | "Overview"
  | "Requirements"
  | "Dependencies"
  | "Security"
  | "Audit";

const TABS: TabId[] = [
  "Overview",
  "Requirements",
  "Dependencies",
  "Security",
  "Audit",
];

interface DepsData {
  from: Array<{
    id: string;
    dependencyType: string;
    strength: string;
    description?: string | null;
    asset: { id: string; name: string; assetType: string; criticality: string };
  }>;
  to: Array<{
    id: string;
    dependencyType: string;
    strength: string;
    description?: string | null;
    asset: { id: string; name: string; assetType: string; criticality: string };
  }>;
}

const tabContentVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as number[] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -20 : 20,
    opacity: 0,
    transition: { duration: 0.15 },
  }),
};

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(true);
  const [assetError, setAssetError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>("Overview");
  const [tabDirection, setTabDirection] = useState(1);
  const prevTabRef = useRef<TabId>("Overview");

  // Per-tab data
  const [requirements, setRequirements] = useState<AssetRequirement[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [reqsLoaded, setReqsLoaded] = useState(false);

  const [deps, setDeps] = useState<DepsData>({ from: [], to: [] });
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [depsLoaded, setDepsLoaded] = useState(false);

  const [vulns, setVulns] = useState<Vuln[]>([]);
  const [suppliersData, setSuppliersData] = useState<Supplier[]>([]);
  const [personnelData, setPersonnelData] = useState<Personnel[]>([]);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [securityLoaded, setSecurityLoaded] = useState(false);

  // Fetch asset
  const fetchAsset = useCallback(async () => {
    if (!id) return;
    setLoadingAsset(true);
    setAssetError(null);
    try {
      const res = await fetch(`/api/nexus/assets/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Asset not found");
        throw new Error("Failed to load asset");
      }
      const data = await res.json();
      setAsset(data.asset ?? data);
    } catch (e) {
      setAssetError(e instanceof Error ? e.message : "Failed to load asset");
    } finally {
      setLoadingAsset(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchAsset();
  }, [fetchAsset]);

  // Lazy-load tab data
  const fetchRequirements = useCallback(async () => {
    if (!id || reqsLoaded) return;
    setLoadingReqs(true);
    try {
      const res = await fetch(`/api/nexus/assets/${id}/requirements`);
      if (!res.ok) throw new Error("Failed to load requirements");
      const data = await res.json();
      setRequirements(data.requirements ?? data.items ?? []);
      setReqsLoaded(true);
    } catch {
      // Keep empty, user can retry via tab navigation
    } finally {
      setLoadingReqs(false);
    }
  }, [id, reqsLoaded]);

  const fetchDeps = useCallback(async () => {
    if (!id || depsLoaded) return;
    setLoadingDeps(true);
    try {
      const res = await fetch(`/api/nexus/assets/${id}/dependencies`);
      if (!res.ok) throw new Error("Failed to load dependencies");
      const data = await res.json();
      setDeps({
        from: data.from ?? data.outgoing ?? [],
        to: data.to ?? data.incoming ?? [],
      });
      setDepsLoaded(true);
    } catch {
      // Keep empty
    } finally {
      setLoadingDeps(false);
    }
  }, [id, depsLoaded]);

  const fetchSecurity = useCallback(async () => {
    if (!id || securityLoaded) return;
    setLoadingSecurity(true);
    try {
      const [vRes, sRes, pRes] = await Promise.allSettled([
        fetch(`/api/nexus/assets/${id}/vulnerabilities`),
        fetch(`/api/nexus/assets/${id}/suppliers`),
        fetch(`/api/nexus/assets/${id}/personnel`),
      ]);
      if (vRes.status === "fulfilled" && vRes.value.ok) {
        const d = await vRes.value.json();
        setVulns(d.vulnerabilities ?? d.items ?? []);
      }
      if (sRes.status === "fulfilled" && sRes.value.ok) {
        const d = await sRes.value.json();
        setSuppliersData(d.suppliers ?? d.items ?? []);
      }
      if (pRes.status === "fulfilled" && pRes.value.ok) {
        const d = await pRes.value.json();
        setPersonnelData(d.personnel ?? d.items ?? []);
      }
      setSecurityLoaded(true);
    } catch {
      // Keep empty
    } finally {
      setLoadingSecurity(false);
    }
  }, [id, securityLoaded]);

  function switchTab(tab: TabId) {
    const prevIdx = TABS.indexOf(prevTabRef.current);
    const newIdx = TABS.indexOf(tab);
    setTabDirection(newIdx >= prevIdx ? 1 : -1);
    prevTabRef.current = tab;
    setActiveTab(tab);

    // Lazy load
    if (tab === "Requirements") void fetchRequirements();
    else if (tab === "Dependencies") void fetchDeps();
    else if (tab === "Security") void fetchSecurity();
  }

  async function handleRequirementUpdate(
    reqId: string,
    data: {
      status?: AssetRequirement["status"];
      notes?: string;
      nextReviewDate?: string;
    },
  ) {
    const res = await fetch(`/api/nexus/assets/${id}/requirements/${reqId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update requirement");
    const updated = await res.json();
    setRequirements((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, ...updated.requirement } : r)),
    );
  }

  async function handleAddDependency(data: {
    targetAssetId: string;
    dependencyType: string;
    strength: string;
    description?: string;
  }) {
    const res = await fetch(`/api/nexus/assets/${id}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to add dependency");
    const result = await res.json();
    setDeps((prev) => ({
      ...prev,
      from: [...prev.from, result.dependency],
    }));
  }

  async function handleRemoveDependency(depId: string) {
    const res = await fetch(`/api/nexus/assets/${id}/dependencies/${depId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to remove dependency");
    setDeps((prev) => ({
      from: prev.from.filter((d) => d.id !== depId),
      to: prev.to.filter((d) => d.id !== depId),
    }));
  }

  // Loading state
  if (loadingAsset) {
    return (
      <div className="p-6 space-y-4 max-w-[1200px]">
        <div className="h-8 w-64 glass-surface rounded animate-pulse" />
        <div className="h-12 w-full glass-surface rounded-[var(--radius-lg)] animate-pulse" />
        <div className="h-64 w-full glass-surface rounded-[var(--radius-lg)] animate-pulse" />
      </div>
    );
  }

  // Error state
  if (assetError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-body text-red-400">{assetError}</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-4 py-2 text-body text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors border border-[var(--glass-border)]"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <button
            onClick={fetchAsset}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-body rounded-lg transition-colors"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!asset) return null;

  const CRITICALITY_COLOR: Record<string, string> = {
    CRITICAL: "text-red-400",
    HIGH: "text-amber-400",
    MEDIUM: "text-blue-400",
    LOW: "text-slate-400",
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Breadcrumb + Header */}
      <motion.div
        variants={glassItemVariants}
        initial="hidden"
        animate="visible"
      >
        <button
          onClick={() => router.push("/dashboard/nexus")}
          className="flex items-center gap-1.5 text-small text-slate-400 hover:text-white transition-colors mb-3"
        >
          <ChevronLeft size={14} /> Asset Register
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-bold text-white">
              {asset.name}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-small text-slate-400">
                {asset.assetType.replace(/_/g, " ")}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-small text-slate-400">
                {asset.category.replace(/_/g, " ")}
              </span>
              <span className="text-slate-600">·</span>
              <span
                className={`text-small font-medium ${
                  CRITICALITY_COLOR[asset.criticality] ?? "text-slate-400"
                }`}
              >
                {asset.criticality}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={fetchAsset}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors border border-[var(--glass-border)]"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tab bar */}
      <motion.div
        variants={glassItemVariants}
        initial="hidden"
        animate="visible"
      >
        <GlassCard hover={false} className="p-1">
          <div className="relative flex">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`relative flex-1 px-3 py-2 text-small font-medium rounded-md transition-colors z-10 ${
                  activeTab === tab
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {/* Active indicator */}
                {activeTab === tab && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 bg-white/[0.08] rounded-md border border-white/10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait" custom={tabDirection}>
        <motion.div
          key={activeTab}
          custom={tabDirection}
          variants={tabContentVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {activeTab === "Overview" && <AssetOverviewTab asset={asset} />}

          {activeTab === "Requirements" && (
            <div>
              {loadingReqs ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 glass-surface rounded-[var(--radius-lg)] animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <AssetRequirementsTab
                  requirements={requirements}
                  assetId={id}
                  onUpdate={handleRequirementUpdate}
                />
              )}
            </div>
          )}

          {activeTab === "Dependencies" && (
            <div>
              {loadingDeps ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-slate-500" />
                </div>
              ) : (
                <AssetDependenciesTab
                  assetId={id}
                  dependencies={deps}
                  onAdd={handleAddDependency}
                  onRemove={handleRemoveDependency}
                />
              )}
            </div>
          )}

          {activeTab === "Security" && (
            <div>
              {loadingSecurity ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-slate-500" />
                </div>
              ) : (
                <AssetSecurityTab
                  assetId={id}
                  vulnerabilities={vulns}
                  suppliers={suppliersData}
                  personnel={personnelData}
                />
              )}
            </div>
          )}

          {activeTab === "Audit" && <AssetAuditTab assetId={id} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
