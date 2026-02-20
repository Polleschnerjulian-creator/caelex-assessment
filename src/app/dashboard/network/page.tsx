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
  Loader2,
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

// ─── Skeleton Components ───

function StatSkeleton() {
  return (
    <GlassCard hover={false} className="p-5">
      <div className="animate-pulse space-y-3">
        <div className="h-3 bg-slate-200 dark:bg-white/[0.06] rounded w-24" />
        <div className="h-8 bg-slate-200 dark:bg-white/[0.06] rounded w-16" />
        <div className="h-2 bg-slate-200 dark:bg-white/[0.06] rounded w-32" />
      </div>
    </GlassCard>
  );
}

function CardSkeleton() {
  return (
    <GlassCard hover={false} className="p-5">
      <div className="animate-pulse space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 dark:bg-white/[0.06] rounded-lg" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 dark:bg-white/[0.06] rounded w-2/3" />
            <div className="h-3 bg-slate-200 dark:bg-white/[0.06] rounded w-1/3" />
          </div>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-white/[0.06] rounded w-full" />
        <div className="h-3 bg-slate-200 dark:bg-white/[0.06] rounded w-3/4" />
      </div>
    </GlassCard>
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

  // ─── Render ───

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 flex items-center justify-center">
            <Network className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              Compliance Network
            </h1>
            <p className="text-xs text-slate-500 dark:text-white/45">
              Manage stakeholder engagements, data rooms, and attestations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-white/45 hover:text-slate-700 dark:hover:text-white/70 border border-slate-200 dark:border-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            <Plus size={14} />
            Invite Stakeholder
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span className="text-micro uppercase tracking-wider text-slate-400 dark:text-white/30">
                  Active Engagements
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {stats?.activeEngagements ?? 0}
              </div>
              <div className="text-caption text-slate-400 dark:text-white/30 mt-2">
                Across all stakeholder types
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <FolderLock className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span className="text-micro uppercase tracking-wider text-slate-400 dark:text-white/30">
                  Open Data Rooms
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {stats?.openDataRooms ?? 0}
              </div>
              <div className="text-caption text-slate-400 dark:text-white/30 mt-2">
                Secure document sharing
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-green-500 dark:text-green-400" />
                <span className="text-micro uppercase tracking-wider text-slate-400 dark:text-white/30">
                  Total Attestations
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {stats?.totalAttestations ?? 0}
              </div>
              <div className="text-caption text-slate-400 dark:text-white/30 mt-2">
                Compliance confirmations
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span className="text-micro uppercase tracking-wider text-slate-400 dark:text-white/30">
                  Pending Invitations
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {stats?.pendingInvitations ?? 0}
              </div>
              <div className="text-caption text-slate-400 dark:text-white/30 mt-2">
                Awaiting response
              </div>
            </GlassCard>
          </>
        )}
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 relative w-full sm:w-auto">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/45"
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
            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div
          className="flex items-center gap-1 p-1 bg-white dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/5"
          role="tablist"
          aria-label="Stakeholder type filter"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-3 py-1.5 rounded-lg text-caption font-medium transition-colors whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                    : "text-slate-500 dark:text-white/45 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stakeholder Grid */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredEngagements.length === 0 ? (
            <GlassCard hover={false} className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-slate-300 dark:text-white/15" />
                </div>
                <h3 className="text-title font-medium text-slate-900 dark:text-white mb-2">
                  {searchQuery
                    ? "No matching stakeholders"
                    : "No stakeholders yet"}
                </h3>
                <p className="text-small text-slate-500 dark:text-white/45 mb-6 max-w-sm mx-auto">
                  {searchQuery
                    ? "Try adjusting your search or filter criteria."
                    : "Invite your first stakeholder to start building your compliance network. Share data rooms, request attestations, and track engagement activity."}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                    Invite Stakeholder
                  </button>
                )}
              </div>
            </GlassCard>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
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
        </div>

        {/* Right: Activity Feed */}
        <div className="space-y-4">
          <GlassCard hover={false} className="p-5">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Network size={14} className="text-emerald-400" />
              Network Activity
            </h3>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-6 h-6 bg-slate-200 dark:bg-white/[0.06] rounded-full flex-shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 bg-slate-200 dark:bg-white/[0.06] rounded w-3/4" />
                      <div className="h-2 bg-slate-200 dark:bg-white/[0.06] rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-white/45 py-4 text-center">
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
          </GlassCard>
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
