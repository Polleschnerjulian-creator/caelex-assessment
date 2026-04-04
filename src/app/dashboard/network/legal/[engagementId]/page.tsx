"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Scale,
  Loader2,
  AlertCircle,
  X,
  Shield,
  Eye,
  Ban,
  Users,
  Clock,
  Calendar,
  FileText,
  Building2,
  Mail,
  CheckCircle2,
  Download,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import FeatureGate from "@/components/dashboard/FeatureGate";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Engagement Type Labels ───

const ENGAGEMENT_TYPE_LABELS: Record<string, string> = {
  cra_notified_body: "CRA Notified Body Submission",
  nis2_nca_registration: "NIS2 NCA Registration",
  jurisdiction_selection: "Jurisdiktionswahl & Licensing",
  incident_response: "Incident Response",
  export_control: "Export Control (ITAR/EAR)",
  full_compliance_review: "Full Compliance Audit",
  custom: "Custom",
};

// ─── Types ───

interface Attorney {
  id: string;
  attorney: {
    id: string;
    barNumber: string | null;
    jurisdiction: string | null;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  };
  acceptedAt: string | null;
  createdAt: string;
}

interface EngagementDetail {
  id: string;
  title: string;
  engagementType: string;
  status: string;
  expiresAt: string;
  allowExport: boolean;
  createdAt: string;
  revokedAt: string | null;
  note: string | null;
  scopedModules: string[];
  scopedDataTypes: string[];
  includeNIS2Overlap: boolean;
  firm: {
    id: string;
    name: string;
    city: string | null;
    website: string | null;
  };
  attorneys: Attorney[];
  _count: {
    attorneys: number;
    accessLogs: number;
    comments: number;
  };
}

// ─── Status Badge ───

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    pending: {
      label: "Pending",
      bg: "bg-[var(--fill-medium)]",
      text: "text-[var(--text-secondary)]",
    },
    active: {
      label: "Active",
      bg: "bg-[var(--accent-primary)]/15",
      text: "text-[var(--text-primary)]",
    },
    completed: {
      label: "Completed",
      bg: "bg-[var(--fill-medium)]",
      text: "text-[var(--text-secondary)]",
    },
    revoked: {
      label: "Revoked",
      bg: "bg-[var(--fill-light)]",
      text: "text-[var(--text-tertiary)]",
    },
  };
  const c = config[status] || config.pending;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium uppercase tracking-wider ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

// ─── Module Label mapping ───

const MODULE_LABELS: Record<string, string> = {
  cra: "CRA",
  nis2: "NIS2",
  authorization: "Authorization",
  space_law: "Space Law",
  cybersecurity: "Cybersecurity",
  export_control: "Export Control",
  debris: "Debris Mitigation",
  environmental: "Environmental",
  insurance: "Insurance",
  supervision: "Supervision",
  copuos: "COPUOS/IADC",
  spectrum: "Spectrum/ITU",
  uk_space: "UK Space",
  us_regulatory: "US Regulatory",
  all: "All Modules",
};

// ─── Expiry Extension Options ───

const EXTEND_OPTIONS = [
  { label: "+30 Tage", days: 30 },
  { label: "+60 Tage", days: 60 },
  { label: "+90 Tage", days: 90 },
];

// ─── Page ───

export default function EngagementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { organization } = useOrganization();

  const engagementId = params.engagementId as string;

  const [engagement, setEngagement] = useState<EngagementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showExtendOptions, setShowExtendOptions] = useState(false);

  const fetchEngagement = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/legal-engagements/${engagementId}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error || json.message || "Failed to load engagement",
        );
      }

      setEngagement(json.data?.engagement || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    if (engagementId) fetchEngagement();
  }, [engagementId, fetchEngagement]);

  const handleRevoke = async () => {
    if (
      !confirm(
        "Are you sure you want to revoke this engagement? This cannot be undone.",
      )
    )
      return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/legal-engagements/${engagementId}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to revoke");
      }
      fetchEngagement();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async (days: number) => {
    if (!engagement) return;
    setActionLoading(true);
    setShowExtendOptions(false);

    const currentExpiry = new Date(engagement.expiresAt);
    const newExpiry = new Date(
      currentExpiry.getTime() + days * 24 * 60 * 60 * 1000,
    );

    try {
      const res = await fetch(`/api/legal-engagements/${engagementId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ expiresAt: newExpiry.toISOString() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to extend");
      }
      fetchEngagement();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extension failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleExport = async () => {
    if (!engagement) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/legal-engagements/${engagementId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ allowExport: !engagement.allowExport }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update");
      }
      fetchEngagement();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Loading ───

  if (loading) {
    return (
      <FeatureGate module="network">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3">
            <Loader2
              size={20}
              className="animate-spin text-[var(--text-tertiary)]"
            />
            <p className="text-sm text-[var(--text-tertiary)]">
              Loading engagement...
            </p>
          </div>
        </div>
      </FeatureGate>
    );
  }

  // ─── Error / Not Found ───

  if (error && !engagement) {
    return (
      <FeatureGate module="network">
        <div className="flex items-center justify-center min-h-screen">
          <div className="glass-elevated rounded-2xl p-6 border border-[var(--separator)] max-w-sm">
            <div className="flex items-center gap-3">
              <AlertCircle
                size={18}
                className="text-[var(--text-secondary)] flex-shrink-0"
              />
              <p className="text-sm text-[var(--text-secondary)]">{error}</p>
            </div>
            <Link
              href="/dashboard/network/legal"
              className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Engagements
            </Link>
          </div>
        </div>
      </FeatureGate>
    );
  }

  if (!engagement) return null;

  const expiryDate = new Date(engagement.expiresAt);
  const isExpired = expiryDate < new Date();
  const daysLeft = Math.ceil(
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const isRevoked = engagement.status === "revoked";

  return (
    <FeatureGate module="network">
      <div className="min-h-screen p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Back Link */}
        <Link
          href="/dashboard/network/legal"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Legal Engagements
        </Link>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-[var(--fill-light)] border border-[var(--separator-strong)]">
            <AlertCircle
              size={15}
              className="text-[var(--text-secondary)] flex-shrink-0"
            />
            <p className="text-sm text-[var(--text-secondary)] flex-1">
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="glass-elevated rounded-2xl p-6 border border-[var(--separator)] mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--fill-medium)] border border-[var(--separator-strong)]">
                <Scale
                  size={20}
                  className="text-[var(--text-secondary)]"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[var(--text-primary)]">
                  {engagement.title}
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {ENGAGEMENT_TYPE_LABELS[engagement.engagementType] ||
                    engagement.engagementType}
                </p>
              </div>
            </div>
            <StatusBadge status={engagement.status} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Law Firm
              </p>
              <div className="flex items-center gap-1.5">
                <Building2 size={13} className="text-[var(--text-tertiary)]" />
                <p className="text-sm text-[var(--text-primary)]">
                  {engagement.firm.name}
                </p>
              </div>
              {engagement.firm.city && (
                <p className="text-[11px] text-[var(--text-tertiary)] ml-5">
                  {engagement.firm.city}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Attorneys
              </p>
              <div className="flex items-center gap-1.5">
                <Users size={13} className="text-[var(--text-tertiary)]" />
                <p className="text-sm text-[var(--text-primary)]">
                  {engagement._count.attorneys}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Expires
              </p>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-[var(--text-tertiary)]" />
                <p
                  className={`text-sm ${isExpired ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}`}
                >
                  {expiryDate.toLocaleDateString("de-DE")}
                  {!isExpired && !isRevoked && (
                    <span className="text-[var(--text-tertiary)] text-xs ml-1">
                      ({daysLeft}d)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Access Logs
              </p>
              <div className="flex items-center gap-1.5">
                <Eye size={13} className="text-[var(--text-tertiary)]" />
                <p className="text-sm text-[var(--text-primary)]">
                  {engagement._count.accessLogs}
                </p>
              </div>
            </div>
          </div>

          {engagement.note && (
            <div className="mt-4 pt-4 border-t border-[var(--separator)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Note
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {engagement.note}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Scope + Attorneys */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scope Visualization */}
            <div className="glass-elevated rounded-2xl p-6 border border-[var(--separator)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Shield size={15} className="text-[var(--text-secondary)]" />
                Data Scope
              </h2>

              {/* Modules */}
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                  Shared Modules
                </p>
                <div className="flex flex-wrap gap-2">
                  {engagement.scopedModules.length === 0 ? (
                    <span className="text-xs text-[var(--text-tertiary)] italic">
                      No modules scoped
                    </span>
                  ) : (
                    engagement.scopedModules.map((mod) => (
                      <div
                        key={mod}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--fill-medium)] border border-[var(--separator-strong)]"
                      >
                        <CheckCircle2
                          size={12}
                          className="text-[var(--text-tertiary)]"
                        />
                        <span className="text-xs text-[var(--text-secondary)] font-medium">
                          {MODULE_LABELS[mod] || mod}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Data Types */}
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                  Data Types
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {engagement.scopedDataTypes.length === 0 ? (
                    <span className="text-xs text-[var(--text-tertiary)] italic">
                      No data types scoped
                    </span>
                  ) : (
                    engagement.scopedDataTypes.map((dt) => (
                      <span
                        key={dt}
                        className="px-2.5 py-1 rounded-md text-[11px] text-[var(--text-secondary)] bg-[var(--fill-light)] border border-[var(--separator)]"
                      >
                        {dt.replace(/_/g, " ")}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* NIS2 Overlap */}
              <div className="flex items-center gap-2 pt-3 border-t border-[var(--separator)]">
                <div
                  className={`w-3 h-3 rounded-sm border ${
                    engagement.includeNIS2Overlap
                      ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]"
                      : "border-[var(--separator-strong)]"
                  }`}
                >
                  {engagement.includeNIS2Overlap && (
                    <CheckCircle2
                      size={12}
                      className="text-[var(--text-secondary)]"
                    />
                  )}
                </div>
                <span className="text-xs text-[var(--text-secondary)]">
                  NIS2 Overlap included
                </span>
              </div>
            </div>

            {/* Attorneys */}
            <div className="glass-elevated rounded-2xl p-6 border border-[var(--separator)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Users size={15} className="text-[var(--text-secondary)]" />
                Attorneys ({engagement.attorneys.length})
              </h2>

              {engagement.attorneys.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
                  No attorneys assigned yet. The invited attorney will appear
                  here after accepting.
                </p>
              ) : (
                <div className="space-y-3">
                  {engagement.attorneys.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--fill-light)] border border-[var(--separator)]"
                    >
                      <div className="w-9 h-9 rounded-full bg-[var(--fill-medium)] flex items-center justify-center text-xs font-medium text-[var(--text-secondary)]">
                        {(a.attorney.user.name || a.attorney.user.email)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {a.attorney.user.name || a.attorney.user.email}
                        </p>
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          {a.attorney.user.email}
                          {a.attorney.barNumber && ` | ${a.attorney.barNumber}`}
                        </p>
                      </div>
                      <div>
                        {a.acceptedAt ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                            <CheckCircle2 size={11} />
                            Accepted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                            <Clock size={11} />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="glass-elevated rounded-2xl p-6 border border-[var(--separator)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <MessageSquare
                  size={15}
                  className="text-[var(--text-secondary)]"
                />
                Comments ({engagement._count.comments})
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
                {engagement._count.comments === 0
                  ? "No comments yet."
                  : `${engagement._count.comments} comment(s) — view in the full audit log.`}
              </p>
            </div>
          </div>

          {/* Right Column: Actions */}
          <div className="space-y-6">
            {/* Actions Panel */}
            <div className="glass-elevated rounded-2xl p-5 border border-[var(--separator)]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
                Actions
              </h3>

              <div className="space-y-2">
                {/* Extend Expiry */}
                {!isRevoked && (
                  <div>
                    <button
                      onClick={() => setShowExtendOptions(!showExtendOptions)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] bg-[var(--fill-medium)] hover:bg-[var(--fill-medium)]/80 disabled:opacity-40 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Calendar size={14} />
                        Extend Expiry
                      </span>
                      {showExtendOptions ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>
                    <AnimatePresence>
                      {showExtendOptions && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 space-y-1">
                            {EXTEND_OPTIONS.map((opt) => (
                              <button
                                key={opt.days}
                                onClick={() => handleExtend(opt.days)}
                                disabled={actionLoading}
                                className="w-full text-left px-4 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--fill-light)] hover:bg-[var(--fill-medium)] disabled:opacity-40 transition-colors"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Toggle Export */}
                {!isRevoked && (
                  <button
                    onClick={handleToggleExport}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] bg-[var(--fill-medium)] hover:bg-[var(--fill-medium)]/80 disabled:opacity-40 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Download size={14} />
                      Export:
                      {engagement.allowExport ? " Enabled" : " Disabled"}
                    </span>
                    <div
                      className={`w-8 h-4 rounded-full ${
                        engagement.allowExport
                          ? "bg-[var(--accent-primary)]"
                          : "bg-[var(--fill-medium)]"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-transform ${
                          engagement.allowExport
                            ? "translate-x-4"
                            : "translate-x-0.5"
                        }`}
                      />
                    </div>
                  </button>
                )}

                {/* Revoke */}
                {!isRevoked && (
                  <button
                    onClick={handleRevoke}
                    disabled={actionLoading}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-[var(--fill-light)] hover:bg-[var(--fill-medium)] disabled:opacity-40 transition-colors"
                  >
                    <Ban size={14} />
                    Revoke Access
                  </button>
                )}

                {isRevoked && engagement.revokedAt && (
                  <div className="px-4 py-3 rounded-xl bg-[var(--fill-light)] border border-[var(--separator)]">
                    <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                      Revoked
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {new Date(engagement.revokedAt).toLocaleDateString(
                        "de-DE",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Meta Info */}
            <div className="glass-elevated rounded-2xl p-5 border border-[var(--separator)]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-0.5">
                    Created
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {new Date(engagement.createdAt).toLocaleDateString(
                      "de-DE",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-0.5">
                    Engagement ID
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)] font-mono truncate">
                    {engagement.id}
                  </p>
                </div>
                {engagement.firm.website && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-0.5">
                      Firm Website
                    </p>
                    <a
                      href={engagement.firm.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors underline underline-offset-2"
                    >
                      {engagement.firm.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}
