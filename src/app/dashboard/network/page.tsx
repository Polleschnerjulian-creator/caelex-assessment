"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Users,
  FolderLock,
  ShieldCheck,
  Mail,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Building2,
  X,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import StakeholderCard, {
  type StakeholderEngagement,
} from "@/components/network/StakeholderCard";
import InviteStakeholderModal from "@/components/network/InviteStakeholderModal";
import NetworkActivityFeed, {
  type NetworkActivity,
} from "@/components/network/NetworkActivityFeed";
import StakeholderTypeBadge, {
  type StakeholderType as StakeholderTypeEnum,
} from "@/components/network/StakeholderTypeBadge";

// ─── Types ───

type StakeholderType =
  | "all"
  | "legal"
  | "insurers"
  | "auditors"
  | "suppliers"
  | "ncas";

interface Engagement {
  id: string;
  stakeholderName: string;
  stakeholderType: string;
  contactEmail: string;
  status: string;
  scope: string;
  createdAt: string;
  lastActivity: string | null;
}

interface NetworkStats {
  activeEngagements: number;
  openDataRooms: number;
  totalAttestations: number;
  pendingInvitations: number;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  actorName: string;
  engagementId: string | null;
}

// ─── Tab Configuration ───

const TABS: { id: StakeholderType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "legal", label: "Legal" },
  { id: "insurers", label: "Insurers" },
  { id: "auditors", label: "Auditors" },
  { id: "suppliers", label: "Suppliers" },
  { id: "ncas", label: "NCAs" },
];

// ─── Glass Styles ───

const glassPanel: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.55)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid rgba(255, 255, 255, 0.45)",
  borderRadius: 20,
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
  overflow: "hidden",
};

const innerGlass: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.45)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  borderRadius: 14,
  boxShadow:
    "0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
};

// ─── Sidebar Stat ───

function SidebarStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/30 transition-colors">
      <span className={color}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

// ─── Page ───

export default function NetworkHubPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { t } = useLanguage();

  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<StakeholderType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);

  const orgId = organization?.id;

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!orgId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const typeFilter = activeTab !== "all" ? activeTab : "";
        const [engRes, actRes] = await Promise.all([
          fetch(
            `/api/network/engagements?organizationId=${orgId}&type=${typeFilter}`,
          ),
          fetch(`/api/network/activity?organizationId=${orgId}&limit=20`),
        ]);

        if (!engRes.ok) {
          const data = await engRes.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load engagements");
        }

        const engData = await engRes.json();
        setEngagements(engData.engagements || []);
        setStats({
          activeEngagements: engData.activeEngagements ?? 0,
          openDataRooms: engData.openDataRooms ?? 0,
          totalAttestations: engData.totalAttestations ?? 0,
          pendingInvitations: engData.pendingInvitations ?? 0,
        });

        if (actRes.ok) {
          const actData = await actRes.json();
          setActivities(actData.activities || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId, activeTab],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEngagements = engagements.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.stakeholderName.toLowerCase().includes(q) ||
      e.contactEmail.toLowerCase().includes(q) ||
      e.scope?.toLowerCase().includes(q)
    );
  });

  // ─── Loading State ───

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">
            Loading Compliance Network...
          </p>
        </div>
      </div>
    );
  }

  // ─── Error State (full page) ───

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322]">
        <div className="rounded-2xl p-6" style={innerGlass}>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ───

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] p-3 gap-3">
      {/* ─── Left Panel — Sidebar ─── */}
      <div className="w-[260px] shrink-0 flex flex-col" style={glassPanel}>
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Compliance Network
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Stakeholder engagements
          </p>
        </div>

        {/* Tab Filter Buttons */}
        <nav className="px-3 space-y-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-5 my-3 border-t border-black/[0.06] dark:border-white/10" />

        {/* Stats Summary */}
        <div className="px-4 space-y-2 flex-1">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium px-1 mb-1.5">
            Overview
          </p>
          <SidebarStat
            icon={<Users size={14} />}
            label="Active Engagements"
            value={stats?.activeEngagements ?? 0}
            color="text-indigo-600"
          />
          <SidebarStat
            icon={<FolderLock size={14} />}
            label="Data Rooms"
            value={stats?.openDataRooms ?? 0}
            color="text-blue-600"
          />
          <SidebarStat
            icon={<ShieldCheck size={14} />}
            label="Attestations"
            value={stats?.totalAttestations ?? 0}
            color="text-emerald-600"
          />
          <SidebarStat
            icon={<Mail size={14} />}
            label="Pending Invitations"
            value={stats?.pendingInvitations ?? 0}
            color="text-amber-500"
          />
        </div>

        {/* Bottom Buttons */}
        <div className="px-4 pb-4 pt-2 space-y-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/40 hover:bg-white/60 border border-black/[0.06] text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700 dark:hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Invite Stakeholder
          </button>
        </div>
      </div>

      {/* ─── Right Panel — Main Content ─── */}
      <div className="flex-1 flex flex-col min-w-0" style={glassPanel}>
        {/* Error Banner */}
        {error && (
          <div className="mx-5 mt-4 flex items-center gap-3 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400 flex-1">
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Search Bar */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="network-search" className="sr-only">
              Search stakeholders
            </label>
            <input
              id="network-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stakeholders..."
              className="w-full bg-white/40 border border-black/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all"
            />
          </div>

          {/* Stakeholder Grid */}
          {filteredEngagements.length === 0 ? (
            <div className="rounded-2xl p-12" style={innerGlass}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-black/[0.04] flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-title font-medium text-slate-800 dark:text-white mb-2">
                  {searchQuery
                    ? "No matching stakeholders"
                    : "No stakeholders yet"}
                </h3>
                <p className="text-small text-slate-500 mb-6 max-w-sm mx-auto">
                  {searchQuery
                    ? "Try adjusting your search or filter criteria."
                    : "Invite your first stakeholder to start building your compliance network. Share data rooms, request attestations, and track engagement activity."}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700 dark:hover:bg-emerald-500 text-white rounded-xl transition-colors"
                  >
                    <Plus size={14} />
                    Invite Stakeholder
                  </button>
                )}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {filteredEngagements.map((eng) => (
                  <StakeholderCard
                    key={eng.id}
                    engagement={{
                      id: eng.id,
                      companyName: eng.stakeholderName,
                      contactName: eng.contactEmail,
                      contactEmail: eng.contactEmail,
                      type: eng.stakeholderType as StakeholderTypeEnum,
                      status:
                        (eng.status as StakeholderEngagement["status"]) ||
                        "ACTIVE",
                      lastAccessAt: eng.lastActivity,
                      dataRoomCount: 0,
                      attestationCount: 0,
                    }}
                    onView={(id) => router.push(`/dashboard/network/${id}`)}
                    onRevoke={() => {}}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Activity Feed Section */}
          <div className="rounded-2xl p-5" style={innerGlass}>
            <h3 className="text-sm font-medium text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Network size={14} className="text-indigo-500" />
              Network Activity
            </h3>
            {activities.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No recent activity.
              </p>
            ) : (
              <NetworkActivityFeed
                activities={activities.map(
                  (a): NetworkActivity => ({
                    id: a.id,
                    action: a.type as NetworkActivity["action"],
                    description: a.description,
                    timestamp: a.timestamp,
                    entityId: a.engagementId || "",
                    entityType: "engagement",
                  }),
                )}
              />
            )}
          </div>
        </div>
      </div>

      {/* Invite Stakeholder Modal */}
      <InviteStakeholderModal
        isOpen={showInviteModal}
        organizationId={orgId || ""}
        onClose={() => setShowInviteModal(false)}
        onSubmit={() => {
          setShowInviteModal(false);
          fetchData(true);
        }}
      />
    </div>
  );
}
