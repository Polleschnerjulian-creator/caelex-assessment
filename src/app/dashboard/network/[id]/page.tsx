"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Mail,
  Calendar,
  Shield,
  FolderLock,
  ShieldCheck,
  Activity,
  Settings,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Power,
  Key,
  Globe,
  Fingerprint,
  Trash2,
  X,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { csrfHeaders } from "@/lib/csrf-client";
import DataRoomCard from "@/components/network/DataRoomCard";
import CreateDataRoomModal from "@/components/network/CreateDataRoomModal";
import AttestationTimeline from "@/components/network/AttestationTimeline";
import AccessLogTable from "@/components/network/AccessLogTable";
import StakeholderTypeBadge, {
  type StakeholderType,
} from "@/components/network/StakeholderTypeBadge";
import { type DataRoom as DataRoomCardType } from "@/components/network/DataRoomCard";
import { type Attestation as AttestationCardType } from "@/components/network/AttestationCard";
import { type AccessLog } from "@/components/network/AccessLogTable";
import { type StakeholderEngagement } from "@/components/network/StakeholderCard";

// ─── Types ───

type TabId = "data-rooms" | "attestations" | "activity" | "settings";

interface EngagementDetail {
  id: string;
  stakeholderName: string;
  stakeholderType: string;
  contactEmail: string;
  contactName: string | null;
  status: string;
  scope: string;
  contractStart: string | null;
  contractEnd: string | null;
  ipAllowlist: string[];
  mfaRequired: boolean;
  createdAt: string;
  lastActivity: string | null;
}

interface DataRoom {
  id: string;
  name: string;
  description: string | null;
  accessLevel: string;
  documentCount: number;
  expiresAt: string | null;
  status: string;
  createdAt: string;
}

interface Attestation {
  id: string;
  type: string;
  status: string;
  statement: string;
  signedBy: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface AccessLogEntry {
  id: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  actorName: string;
}

// ─── Status Badges ───

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  ACTIVE: {
    label: "Active",
    color: "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]",
  },
  SUSPENDED: {
    label: "Suspended",
    color: "bg-[var(--accent-warning-soft)] text-[var(--accent-warning)]",
  },
  REVOKED: {
    label: "Revoked",
    color: "bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]",
  },
  PENDING: {
    label: "Pending",
    color: "bg-[var(--surface-sunken)]0/10 text-[var(--text-tertiary)]",
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-[var(--surface-sunken)]0/10 text-[var(--text-tertiary)]",
  },
};

// ─── Tab Config ───

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "data-rooms",
    label: "Data Rooms",
    icon: <FolderLock size={16} />,
  },
  {
    id: "attestations",
    label: "Attestations",
    icon: <ShieldCheck size={16} />,
  },
  {
    id: "activity",
    label: "Activity",
    icon: <Activity size={16} />,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings size={16} />,
  },
];

// ─── Page ───

export default function EngagementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { organization } = useOrganization();
  const { t } = useLanguage();
  const engagementId = params.id as string;
  const orgId = organization?.id;

  // Core state
  const [engagement, setEngagement] = useState<EngagementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("data-rooms");

  // Data Rooms
  const [dataRooms, setDataRooms] = useState<DataRoom[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  // Attestations
  const [attestations, setAttestations] = useState<Attestation[]>([]);

  // Access Logs
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);

  // Settings
  const [settingsForm, setSettingsForm] = useState({
    status: "ACTIVE",
    ipAllowlist: "",
    mfaRequired: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [rotatingToken, setRotatingToken] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);

  // ─── Data Fetching ───

  const loadEngagement = useCallback(async () => {
    if (!orgId || !engagementId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/network/engagements/${engagementId}?organizationId=${orgId}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load engagement");
      }
      const data = await res.json();
      setEngagement(data.engagement || data);
      setSettingsForm({
        status: data.engagement?.status || data.status || "ACTIVE",
        ipAllowlist: (
          data.engagement?.ipAllowlist ||
          data.ipAllowlist ||
          []
        ).join(", "),
        mfaRequired: data.engagement?.mfaRequired ?? data.mfaRequired ?? false,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load engagement",
      );
    } finally {
      setLoading(false);
    }
  }, [orgId, engagementId]);

  const loadTabData = useCallback(async () => {
    if (!orgId || !engagementId) return;

    try {
      if (activeTab === "data-rooms") {
        const res = await fetch(
          `/api/network/engagements/${engagementId}/data-rooms?organizationId=${orgId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setDataRooms(data.dataRooms || []);
        }
      } else if (activeTab === "attestations") {
        const res = await fetch(
          `/api/network/engagements/${engagementId}/attestations?organizationId=${orgId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setAttestations(data.attestations || []);
        }
      } else if (activeTab === "activity") {
        const res = await fetch(
          `/api/network/engagements/${engagementId}/access-logs?organizationId=${orgId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setAccessLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.error("Failed to load tab data:", err);
    }
  }, [orgId, engagementId, activeTab]);

  useEffect(() => {
    loadEngagement();
  }, [loadEngagement]);

  useEffect(() => {
    if (engagement) {
      loadTabData();
    }
  }, [loadTabData, engagement]);

  // ─── Settings Handlers ───

  const handleSaveSettings = async () => {
    if (!orgId || !engagementId) return;
    setSavingSettings(true);

    try {
      const res = await fetch(
        `/api/network/engagements/${engagementId}/settings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            organizationId: orgId,
            status: settingsForm.status,
            ipAllowlist: settingsForm.ipAllowlist
              .split(",")
              .map((ip) => ip.trim())
              .filter(Boolean),
            mfaRequired: settingsForm.mfaRequired,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save settings");
      }

      await loadEngagement();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRotateToken = async () => {
    if (!orgId || !engagementId) return;
    setRotatingToken(true);

    try {
      const res = await fetch(
        `/api/network/engagements/${engagementId}/rotate-token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ organizationId: orgId }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to rotate token");
      }

      setShowRotateConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rotate token");
    } finally {
      setRotatingToken(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!orgId || !engagementId) return;
    setRevoking(true);

    try {
      const res = await fetch(
        `/api/network/engagements/${engagementId}/revoke`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ organizationId: orgId }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to revoke access");
      }

      router.push("/dashboard/network");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke access");
      setRevoking(false);
      setShowRevokeConfirm(false);
    }
  };

  // ─── Loading State ───

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <div className="h-8 bg-[var(--surface-sunken)] rounded animate-pulse w-48" />
        <div className="h-48 bg-[var(--surface-sunken)] rounded-xl animate-pulse" />
        <div className="h-64 bg-[var(--surface-sunken)] rounded-xl animate-pulse" />
        <span className="sr-only">Loading engagement details...</span>
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">
          {error || "Engagement not found"}
        </p>
        <button
          onClick={() => router.push("/dashboard/network")}
          className="mt-4 text-sm text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors"
        >
          Back to Network
        </button>
      </div>
    );
  }

  const statusBadge = STATUS_BADGES[engagement.status] || STATUS_BADGES.PENDING;

  return (
    <div className="space-y-6">
      {/* Back Link + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/network")}
          aria-label="Back to Compliance Network"
          className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]:text-white rounded-lg hover:bg-[var(--surface-sunken)] transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] truncate">
              {engagement.stakeholderName}
            </h1>
            <StakeholderTypeBadge
              type={engagement.stakeholderType as StakeholderType}
            />
            <span
              className={`text-micro px-2 py-0.5 rounded font-medium ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-secondary)]">
            {engagement.contactEmail && (
              <span className="flex items-center gap-1">
                <Mail size={12} />
                {engagement.contactEmail}
              </span>
            )}
            {engagement.scope && (
              <span className="flex items-center gap-1">
                <Shield size={12} />
                {engagement.scope}
              </span>
            )}
            {engagement.contractStart && engagement.contractEnd && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(engagement.contractStart).toLocaleDateString()} -{" "}
                {new Date(engagement.contractEnd).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--accent-danger)] flex-shrink-0" />
          <p className="text-sm text-[var(--accent-danger)]">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-[var(--accent-danger)] hover:text-red-300"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex items-center gap-1 p-1 bg-[var(--surface-raised)][0.02] rounded-xl border border-[var(--border-default)]"
        role="tablist"
        aria-label="Engagement sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              text-sm font-medium transition-all
              ${
                activeTab === tab.id
                  ? "bg-[var(--surface-sunken)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
              }
            `}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Data Rooms Tab */}
          {activeTab === "data-rooms" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                  <FolderLock
                    size={16}
                    className="text-[var(--text-tertiary)]"
                  />
                  Data Rooms ({dataRooms.length})
                </h2>
                <button
                  onClick={() => setShowCreateRoom(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  Create Data Room
                </button>
              </div>

              {dataRooms.length === 0 ? (
                <GlassCard hover={false} className="p-12">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--surface-sunken)] flex items-center justify-center mx-auto mb-4">
                      <FolderLock className="w-7 h-7 text-[var(--text-tertiary)]" />
                    </div>
                    <h3 className="text-title font-medium text-[var(--text-primary)] mb-2">
                      No data rooms yet
                    </h3>
                    <p className="text-small text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
                      Create a secure data room to share compliance documents
                      with this stakeholder.
                    </p>
                    <button
                      onClick={() => setShowCreateRoom(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      Create Data Room
                    </button>
                  </div>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dataRooms.map((room) => (
                    <DataRoomCard
                      key={room.id}
                      dataRoom={{
                        ...room,
                        purpose: room.description || "",
                        stakeholderName: engagement.stakeholderName,
                        accessLevel:
                          (room.accessLevel as DataRoomCardType["accessLevel"]) ||
                          "VIEW_ONLY",
                        status:
                          (room.status as DataRoomCardType["status"]) ||
                          "ACTIVE",
                      }}
                      onView={(id) =>
                        router.push(`/dashboard/network/data-room/${id}`)
                      }
                      onClose={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attestations Tab */}
          {activeTab === "attestations" && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck
                  size={16}
                  className="text-[var(--text-tertiary)]"
                />
                Attestations ({attestations.length})
              </h2>

              {attestations.length === 0 ? (
                <GlassCard hover={false} className="p-12">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--surface-sunken)] flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-7 h-7 text-[var(--text-tertiary)]" />
                    </div>
                    <h3 className="text-title font-medium text-[var(--text-primary)] mb-2">
                      No attestations yet
                    </h3>
                    <p className="text-small text-[var(--text-secondary)] max-w-sm mx-auto">
                      Attestations will appear here once this stakeholder
                      provides compliance confirmations.
                    </p>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard hover={false} className="p-5">
                  <AttestationTimeline
                    attestations={attestations.map(
                      (a): AttestationCardType => ({
                        id: a.id,
                        type: a.type,
                        title: a.statement,
                        signerName: a.signedBy || "",
                        signerTitle: "",
                        signerOrganization: "",
                        issuedAt: a.signedAt || a.createdAt,
                        validUntil: a.expiresAt,
                        signatureHash: "",
                        isRevoked: a.status === "REVOKED",
                        isVerified: a.status === "SIGNED",
                      }),
                    )}
                  />
                </GlassCard>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                <Activity size={16} className="text-[var(--text-tertiary)]" />
                Access Logs
              </h2>

              {accessLogs.length === 0 ? (
                <GlassCard hover={false} className="p-12">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--surface-sunken)] flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-7 h-7 text-[var(--text-tertiary)]" />
                    </div>
                    <h3 className="text-title font-medium text-[var(--text-primary)] mb-2">
                      No activity recorded
                    </h3>
                    <p className="text-small text-[var(--text-secondary)] max-w-sm mx-auto">
                      Stakeholder access events will be logged here
                      automatically.
                    </p>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard hover={false} className="overflow-hidden">
                  <AccessLogTable
                    logs={accessLogs.map(
                      (log): AccessLog => ({
                        id: log.id,
                        timestamp: log.timestamp,
                        action: log.action,
                        ipAddress: log.ipAddress,
                        userAgent: log.userAgent,
                        entityType: "engagement",
                        entityId: engagementId,
                        entityName: log.resource || log.actorName,
                        durationMs: null,
                      }),
                    )}
                  />
                </GlassCard>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <GlassCard hover={false} className="p-6">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-5">
                  Engagement Settings
                </h3>

                <div className="space-y-5">
                  {/* Status Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[var(--accent-primary-soft)]">
                        <Power
                          size={16}
                          className="text-[var(--accent-primary)]"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                          Engagement Status
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Active engagements can access shared resources
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          status:
                            prev.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                        }))
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settingsForm.status === "ACTIVE"
                          ? "bg-[var(--accent-success-soft)]0"
                          : "bg-[var(--surface-sunken)]"
                      }`}
                      role="switch"
                      aria-checked={settingsForm.status === "ACTIVE"}
                      aria-label="Toggle engagement status"
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-[var(--surface-raised)] rounded-full shadow transition-transform ${
                          settingsForm.status === "ACTIVE"
                            ? "translate-x-6"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* IP Allowlist */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-[var(--accent-primary-soft)]">
                        <Globe
                          size={16}
                          className="text-[var(--accent-primary)]"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                          IP Allowlist
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Restrict access to specific IP addresses
                          (comma-separated)
                        </p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={settingsForm.ipAllowlist}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          ipAllowlist: e.target.value,
                        }))
                      }
                      placeholder="e.g., 192.168.1.0/24, 10.0.0.1"
                      className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                    />
                  </div>

                  {/* MFA Requirement */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[var(--surface-sunken)]0/10">
                        <Fingerprint
                          size={16}
                          className="text-[var(--text-tertiary)]"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                          Require MFA
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Require multi-factor authentication for this
                          stakeholder
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          mfaRequired: !prev.mfaRequired,
                        }))
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settingsForm.mfaRequired
                          ? "bg-[var(--accent-success-soft)]0"
                          : "bg-[var(--surface-sunken)]"
                      }`}
                      role="switch"
                      aria-checked={settingsForm.mfaRequired}
                      aria-label="Toggle MFA requirement"
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-[var(--surface-raised)] rounded-full shadow transition-transform ${
                          settingsForm.mfaRequired
                            ? "translate-x-6"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {savingSettings ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Save Settings
                    </button>
                  </div>
                </div>
              </GlassCard>

              {/* Danger Zone */}
              <GlassCard
                hover={false}
                className="p-6 border-[var(--accent-danger)]/20"
              >
                <h3 className="text-sm font-medium text-[var(--accent-danger)] mb-5">
                  Danger Zone
                </h3>

                <div className="space-y-4">
                  {/* Token Rotation */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[var(--accent-warning-soft)]">
                        <Key
                          size={16}
                          className="text-[var(--accent-warning)]"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                          Rotate Access Token
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Invalidate the current token and issue a new one
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRotateConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--accent-warning)] border border-amber-500/30 hover:bg-[var(--accent-warning-soft)] rounded-lg transition-colors"
                    >
                      <RefreshCw size={14} />
                      Rotate
                    </button>
                  </div>

                  {/* Revoke Access */}
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)][0.06]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[var(--accent-danger)]/10">
                        <Trash2
                          size={16}
                          className="text-[var(--accent-danger)]"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                          Revoke Access
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Permanently revoke this stakeholder's access. This
                          cannot be undone.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRevokeConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--accent-danger)] border border-[var(--accent-danger)/30] hover:bg-[var(--accent-danger)]/10 rounded-lg transition-colors"
                    >
                      <XCircle size={14} />
                      Revoke
                    </button>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Create Data Room Modal */}
      <CreateDataRoomModal
        isOpen={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        onSubmit={() => {
          setShowCreateRoom(false);
          loadTabData();
        }}
        engagements={
          engagement
            ? [
                {
                  id: engagement.id,
                  companyName: engagement.stakeholderName,
                  contactName: engagement.contactName || "",
                  contactEmail: engagement.contactEmail,
                  type: engagement.stakeholderType as StakeholderType,
                  status:
                    (engagement.status as StakeholderEngagement["status"]) ||
                    "ACTIVE",
                  lastAccessAt: engagement.lastActivity,
                  dataRoomCount: 0,
                  attestationCount: 0,
                },
              ]
            : []
        }
      />

      {/* Token Rotation Confirmation Dialog */}
      {showRotateConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Confirm token rotation"
            aria-modal="true"
            className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[var(--accent-warning-soft)]">
                <Key size={20} className="text-[var(--accent-warning)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Rotate Access Token
              </h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              This will invalidate the current access token for{" "}
              <strong className="text-[var(--text-primary)]">
                {engagement.stakeholderName}
              </strong>
              . They will need to re-authenticate with the new token. Are you
              sure you want to proceed?
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowRotateConfirm(false)}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRotateToken}
                disabled={rotatingToken}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--accent-warning)] hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {rotatingToken ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Confirm Rotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Access Confirmation Dialog */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Confirm access revocation"
            aria-modal="true"
            className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[var(--accent-danger)]/10">
                <Trash2 size={20} className="text-[var(--accent-danger)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Revoke Access
              </h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              This action is{" "}
              <strong className="text-[var(--accent-danger)]">
                permanent and irreversible
              </strong>
              . It will:
            </p>
            <ul className="text-sm text-[var(--text-secondary)] mb-6 space-y-1 list-disc list-inside">
              <li>Revoke all access for {engagement.stakeholderName}</li>
              <li>Close all associated data rooms</li>
              <li>Invalidate all active tokens</li>
            </ul>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowRevokeConfirm(false)}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeAccess}
                disabled={revoking}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--accent-danger)] hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {revoking ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
