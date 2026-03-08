"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Ban,
  Filter,
  Copy,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Eye,
} from "lucide-react";
import CreateAttestationModal from "./CreateAttestationModal";
import RevokeAttestationModal from "./RevokeAttestationModal";

// ─── Types ───

interface AttestationItem {
  id: string;
  attestationId: string;
  operatorId: string;
  satelliteNorad: string | null;
  regulationRef: string;
  dataPoint: string;
  result: boolean;
  claimStatement: string;
  evidenceSource: string;
  trustLevel: string;
  status: "VALID" | "EXPIRED" | "REVOKED";
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  description: string | null;
  entityId: string | null;
  isManual: boolean;
  verifyUrl: string;
}

// ─── Status Config ───

const statusConfig: Record<
  string,
  {
    icon: typeof CheckCircle2;
    color: string;
    bg: string;
    border: string;
    label: string;
  }
> = {
  VALID: {
    icon: CheckCircle2,
    color: "text-[var(--status-success)]",
    bg: "bg-[var(--status-success-bg)]",
    border: "border-[var(--status-success-border)]",
    label: "Valid",
  },
  EXPIRED: {
    icon: Clock,
    color: "text-[var(--status-warning)]",
    bg: "bg-[var(--status-warning-bg)]",
    border: "border-[var(--status-warning-border)]",
    label: "Expired",
  },
  REVOKED: {
    icon: XCircle,
    color: "text-[var(--status-danger)]",
    bg: "bg-[var(--status-danger-bg)]",
    border: "border-[var(--status-danger-border)]",
    label: "Revoked",
  },
};

const trustLevelColors: Record<string, { bg: string; text: string }> = {
  HIGH: {
    bg: "bg-[rgba(61,214,140,0.10)]",
    text: "text-[var(--status-success)]",
  },
  MEDIUM: {
    bg: "bg-[rgba(90,173,255,0.10)]",
    text: "text-[var(--module-nis2)]",
  },
  LOW: {
    bg: "bg-[rgba(245,166,35,0.10)]",
    text: "text-[var(--status-warning)]",
  },
};

// ─── Component ───

export default function AttestationsTab() {
  const [attestations, setAttestations] = useState<AttestationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [regulationFilter, setRegulationFilter] = useState<string>("all");

  // Expanded detail
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AttestationItem | null>(
    null,
  );

  // Copied state for share
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAttestations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (regulationFilter !== "all")
        params.set("regulation", regulationFilter);

      const res = await fetch(
        `/api/v1/verity/attestation/list?${params.toString()}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load attestations");
      }
      const data = await res.json();
      setAttestations(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, regulationFilter]);

  useEffect(() => {
    fetchAttestations();
  }, [fetchAttestations]);

  const handleCopyVerifyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get unique regulation refs for filter
  const uniqueRegulations = [
    ...new Set(attestations.map((a) => a.regulationRef)),
  ];

  const filteredAttestations = attestations.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });

  // Stats
  const validCount = attestations.filter((a) => a.status === "VALID").length;
  const expiredCount = attestations.filter(
    (a) => a.status === "EXPIRED",
  ).length;
  const revokedCount = attestations.filter(
    (a) => a.status === "REVOKED",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
            Attestations
          </h2>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
            {total} total attestation{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white text-[13px] font-medium rounded-[var(--radius-sm)] hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Plus size={14} />
          Create Attestation
        </button>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Valid",
            count: validCount,
            color: "var(--status-success)",
            bg: "var(--status-success-bg)",
          },
          {
            label: "Expired",
            count: expiredCount,
            color: "var(--status-warning)",
            bg: "var(--status-warning-bg)",
          },
          {
            label: "Revoked",
            count: revokedCount,
            color: "var(--status-danger)",
            bg: "var(--status-danger-bg)",
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-elevated rounded-[var(--radius-md)] p-4"
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.03em] text-[var(--text-tertiary)]">
              {stat.label}
            </div>
            <div
              className="text-[28px] font-semibold tracking-[-0.02em] mt-1"
              style={{ color: stat.color }}
            >
              {stat.count}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-[var(--text-disabled)]" />
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Status:
          </span>
        </div>
        {["all", "VALID", "EXPIRED", "REVOKED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              statusFilter === s
                ? "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]"
                : "bg-[var(--fill-light)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}

        {uniqueRegulations.length > 1 && (
          <>
            <div className="w-px h-4 bg-[var(--separator)]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--text-tertiary)]">
                Regulation:
              </span>
            </div>
            <select
              value={regulationFilter}
              onChange={(e) => setRegulationFilter(e.target.value)}
              className="px-2 py-1 text-[11px] bg-[var(--fill-light)] border border-[var(--fill-strong)] rounded-[var(--radius-sm)] text-[var(--text-secondary)] focus:outline-none"
            >
              <option value="all">All</option>
              {uniqueRegulations.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--text-disabled)]" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] rounded-[var(--radius-md)] p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--status-danger)] flex-shrink-0" />
          <p className="text-[13px] text-[var(--status-danger)]">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredAttestations.length === 0 && (
        <div className="glass-elevated rounded-[var(--radius-lg)] p-12 text-center">
          <Shield className="w-10 h-10 text-[var(--text-disabled)] mx-auto mb-3" />
          <h3 className="text-[15px] font-medium text-[var(--text-secondary)]">
            No attestations yet
          </h3>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-1 max-w-[300px] mx-auto">
            Create your first manual attestation to declare compliance with a
            regulation.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 mx-auto bg-[var(--accent-primary)] text-white text-[13px] font-medium rounded-[var(--radius-sm)] hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus size={14} />
            Create Attestation
          </button>
        </div>
      )}

      {/* Attestations list */}
      {!loading && !error && filteredAttestations.length > 0 && (
        <div className="glass-elevated rounded-[var(--radius-lg)] divide-y divide-[var(--fill-subtle)] overflow-hidden">
          {filteredAttestations.map((attestation) => {
            const status =
              statusConfig[attestation.status] ?? statusConfig.VALID;
            const StatusIcon = status.icon;
            const trustColors =
              trustLevelColors[attestation.trustLevel] ?? trustLevelColors.LOW;
            const isExpanded = expandedId === attestation.id;

            return (
              <div key={attestation.id}>
                {/* Row */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : attestation.id)
                  }
                  className="w-full text-left px-4 py-3 hover:bg-[var(--fill-subtle)] transition-all duration-[var(--duration-fast)] flex items-center gap-3"
                >
                  {/* Status dot */}
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      attestation.status === "VALID"
                        ? "bg-[var(--status-success)]"
                        : attestation.status === "EXPIRED"
                          ? "bg-[var(--status-warning)]"
                          : "bg-[var(--status-danger)]"
                    }`}
                  />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                        {attestation.claimStatement}
                      </span>
                      {attestation.isManual && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--fill-light)] text-[var(--text-tertiary)] font-medium uppercase tracking-wider flex-shrink-0">
                          Manual
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
                        {attestation.regulationRef}
                      </span>
                      <span className="text-[10px] text-[var(--text-disabled)]">
                        |
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        {new Date(attestation.issuedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Trust level badge */}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${trustColors.bg} ${trustColors.text} flex-shrink-0`}
                  >
                    {attestation.trustLevel}
                  </span>

                  {/* Status badge */}
                  <span
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.color} ${status.border} border flex-shrink-0`}
                  >
                    <StatusIcon size={10} />
                    {status.label}
                  </span>

                  {/* Expand */}
                  {isExpanded ? (
                    <ChevronUp
                      size={14}
                      className="text-[var(--text-disabled)] flex-shrink-0"
                    />
                  ) : (
                    <ChevronDown
                      size={14}
                      className="text-[var(--text-disabled)] flex-shrink-0"
                    />
                  )}
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 space-y-3">
                        {/* Detail grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="glass-inset rounded-[var(--radius-sm)] p-3">
                            <div className="text-[10px] text-[var(--text-disabled)] uppercase tracking-wider mb-1">
                              Attestation ID
                            </div>
                            <div className="text-[11px] font-mono text-[var(--text-secondary)] break-all">
                              {attestation.attestationId}
                            </div>
                          </div>
                          <div className="glass-inset rounded-[var(--radius-sm)] p-3">
                            <div className="text-[10px] text-[var(--text-disabled)] uppercase tracking-wider mb-1">
                              Expires
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)]">
                              {new Date(attestation.expiresAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {attestation.description && (
                          <div className="glass-inset rounded-[var(--radius-sm)] p-3">
                            <div className="text-[10px] text-[var(--text-disabled)] uppercase tracking-wider mb-1">
                              Description
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)]">
                              {attestation.description}
                            </div>
                          </div>
                        )}

                        {attestation.revokedAt && (
                          <div className="bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] rounded-[var(--radius-sm)] p-3">
                            <div className="text-[10px] text-[var(--status-danger)] uppercase tracking-wider mb-1">
                              Revoked
                            </div>
                            <div className="text-[11px] text-[var(--status-danger)]">
                              {attestation.revokedReason} —{" "}
                              {new Date(attestation.revokedAt).toLocaleString()}
                            </div>
                          </div>
                        )}

                        {/* Crypto proof */}
                        <div className="glass-inset rounded-[var(--radius-sm)] p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Fingerprint
                              size={12}
                              className="text-[var(--accent-400)]"
                            />
                            <span className="text-[10px] text-[var(--text-disabled)] uppercase tracking-wider">
                              Cryptographic Proof
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-[var(--status-success)]" />
                              <span className="text-[11px] text-[var(--text-tertiary)]">
                                Ed25519 signed
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-[var(--status-success)]" />
                              <span className="text-[11px] text-[var(--text-tertiary)]">
                                SHA-256 commitment
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-1 h-1 rounded-full ${
                                  attestation.evidenceSource === "sentinel"
                                    ? "bg-[var(--status-success)]"
                                    : "bg-[var(--text-disabled)]"
                                }`}
                              />
                              <span className="text-[11px] text-[var(--text-tertiary)]">
                                Sentinel anchored:{" "}
                                {attestation.evidenceSource === "sentinel"
                                  ? "Yes"
                                  : "No"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={attestation.verifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[var(--accent-primary)] bg-[var(--accent-primary-soft)] rounded-[var(--radius-sm)] hover:opacity-80 transition-opacity"
                          >
                            <Eye size={12} />
                            Verify
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyVerifyUrl(
                                attestation.verifyUrl,
                                attestation.id,
                              );
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--fill-light)] rounded-[var(--radius-sm)] hover:bg-[var(--fill-medium)] transition-colors"
                          >
                            <Copy size={12} />
                            {copiedId === attestation.id ? "Copied" : "Share"}
                          </button>
                          {attestation.status === "VALID" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRevokeTarget(attestation);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[var(--status-danger)] bg-[var(--status-danger-bg)] rounded-[var(--radius-sm)] hover:opacity-80 transition-opacity ml-auto"
                            >
                              <Ban size={12} />
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreateAttestationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchAttestations}
      />

      {/* Revoke Modal */}
      {revokeTarget && (
        <RevokeAttestationModal
          isOpen={!!revokeTarget}
          attestationId={revokeTarget.attestationId}
          attestationDbId={revokeTarget.id}
          regulationName={revokeTarget.regulationRef}
          onClose={() => setRevokeTarget(null)}
          onRevoked={fetchAttestations}
        />
      )}
    </div>
  );
}
