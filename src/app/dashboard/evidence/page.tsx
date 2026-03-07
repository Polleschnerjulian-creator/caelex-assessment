"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileCheck,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  Link2,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface OverviewStats {
  totalEvidence: number;
  acceptedEvidence: number;
  pendingEvidence: number;
  rejectedEvidence: number;
}

interface RegulationCoverage {
  regulationType: string;
  totalRequirements: number;
  coveredRequirements: number;
  coveragePct: number;
}

interface RecentEvidence {
  id: string;
  title: string;
  status: string;
  regulationType: string;
  updatedAt: string;
}

interface GapCategory {
  category: string;
  gaps: number;
  total: number;
}

interface ChainIntegrity {
  verified: boolean;
  totalRecords: number;
  lastVerified: string;
}

interface DashboardData {
  overviewStats: OverviewStats;
  coverageByRegulation: RegulationCoverage[];
  recentEvidence: RecentEvidence[];
  gapsByCategory: GapCategory[];
  chainIntegrity: ChainIntegrity;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const REGULATION_LABELS: Record<string, string> = {
  EU_SPACE_ACT: "EU Space Act",
  NIS2: "NIS2 Directive",
  CYBERSECURITY: "Cybersecurity",
  DEBRIS: "Debris Mitigation",
  ENVIRONMENTAL: "Environmental",
  INSURANCE: "Insurance",
  AUTHORIZATION: "Authorization",
  REGISTRATION: "Registration",
  SUPERVISION: "Supervision",
  NATIONAL_SPACE_LAW: "National Space Law",
  UK_SPACE_ACT: "UK Space Act",
  US_REGULATORY: "US Regulatory",
  COPUOS_IADC: "COPUOS/IADC",
  ITU_SPECTRUM: "ITU/Spectrum",
  EXPORT_CONTROL: "Export Control",
};

function getRegulationLabel(type: string): string {
  return REGULATION_LABELS[type] || type.replace(/_/g, " ");
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACCEPTED":
      return {
        label: "Accepted",
        className:
          "bg-[var(--accent-primary-soft)] text-[var(--accent-success)]",
      };
    case "SUBMITTED":
      return {
        label: "Submitted",
        className:
          "bg-[var(--accent-warning-soft)] text-[var(--accent-warning)]",
      };
    case "PENDING":
      return {
        label: "Pending",
        className:
          "bg-[var(--accent-warning-soft)] text-[var(--accent-warning)]",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        className: "bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]",
      };
    case "DRAFT":
      return {
        label: "Draft",
        className:
          "bg-[var(--surface-sunken)]0/10 text-[var(--text-secondary)]",
      };
    case "EXPIRED":
      return {
        label: "Expired",
        className: "bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]",
      };
    default:
      return {
        label: status,
        className:
          "bg-[var(--surface-sunken)]0/10 text-[var(--text-secondary)]",
      };
  }
}

function getCoverageColor(pct: number): string {
  if (pct >= 80) return "bg-[var(--accent-success-soft)]0";
  if (pct >= 50) return "bg-[var(--accent-warning)]";
  return "bg-[var(--accent-danger)]";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Component ───────────────────────────────────────────────────────────────

export default function EvidenceCoveragePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/evidence");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="w-8 h-8 text-[var(--accent-danger)]" />
        <p className="text-sm text-[var(--text-secondary)]">
          {error || "Failed to load evidence data"}
        </p>
        <button
          onClick={fetchData}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    overviewStats,
    coverageByRegulation,
    recentEvidence,
    gapsByCategory,
    chainIntegrity,
  } = data;

  const overallCoveragePct =
    overviewStats.totalEvidence > 0
      ? Math.round(
          (overviewStats.acceptedEvidence / overviewStats.totalEvidence) * 100,
        )
      : 0;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-primary)/20]">
          <FileCheck className="w-5 h-5 text-[var(--accent-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Evidence Coverage
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            ACE — Autonomous Compliance Evidence Engine
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-info-soft)]0/10">
              <BarChart3 className="w-4 h-4 text-[var(--accent-primary)]" />
            </div>
            <span className="text-sm text-[var(--text-secondary)]">
              Total Evidence
            </span>
          </div>
          <p className="text-2xl font-semibold text-[var(--text-primary)]">
            {overviewStats.totalEvidence}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-primary-soft)]">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)]" />
            </div>
            <span className="text-sm text-[var(--text-secondary)]">
              Accepted
            </span>
          </div>
          <p className="text-2xl font-semibold text-[var(--accent-success)]">
            {overviewStats.acceptedEvidence}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-warning-soft)]">
              <Clock className="w-4 h-4 text-[var(--accent-warning)]" />
            </div>
            <span className="text-sm text-[var(--text-secondary)]">
              Pending
            </span>
          </div>
          <p className="text-2xl font-semibold text-[var(--accent-warning)]">
            {overviewStats.pendingEvidence}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-primary-soft)]">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
            </div>
            <span className="text-sm text-[var(--text-secondary)]">
              Coverage
            </span>
          </div>
          <p className="text-2xl font-semibold text-[var(--text-primary)]">
            {overallCoveragePct}%
          </p>
        </motion.div>
      </div>

      {/* Coverage by Regulation */}
      {coverageByRegulation.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Coverage by Regulation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coverageByRegulation.map((reg, i) => (
              <motion.div
                key={reg.regulationType}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.04 }}
                className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">
                    {getRegulationLabel(reg.regulationType)}
                  </h3>
                  <span
                    className={`text-sm font-semibold ${
                      reg.coveragePct >= 80
                        ? "text-[var(--accent-success)]"
                        : reg.coveragePct >= 50
                          ? "text-[var(--accent-warning)]"
                          : "text-[var(--accent-danger)]"
                    }`}
                  >
                    {reg.coveragePct}%
                  </span>
                </div>
                <div className="h-1.5 bg-[var(--surface-sunken)] rounded-full">
                  <div
                    className={`h-full ${getCoverageColor(reg.coveragePct)} rounded-full transition-all duration-500`}
                    style={{ width: `${reg.coveragePct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {reg.coveredRequirements} of {reg.totalRequirements}{" "}
                  requirements covered
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Two-column layout: Recent Evidence + Gap Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Evidence */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5"
        >
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Recent Evidence
          </h2>
          {recentEvidence.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-8 text-center">
              No evidence records yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentEvidence.map((item) => {
                const badge = getStatusBadge(item.status);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-2 border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {getRegulationLabel(item.regulationType)} &middot;{" "}
                        {formatDate(item.updatedAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Gap Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5"
        >
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Gap Summary
          </h2>
          {gapsByCategory.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-8 text-center">
              No regulatory requirements configured
            </p>
          ) : (
            <div className="space-y-3">
              {gapsByCategory.slice(0, 8).map((cat) => {
                const coveredPct =
                  cat.total > 0
                    ? Math.round(((cat.total - cat.gaps) / cat.total) * 100)
                    : 0;
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[var(--text-secondary)] capitalize">
                        {cat.category.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {cat.gaps > 0 ? (
                          <span className="text-[var(--accent-danger)]">
                            {cat.gaps} gap{cat.gaps !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-[var(--accent-primary)]">
                            Complete
                          </span>
                        )}
                        {" / "}
                        {cat.total} total
                      </span>
                    </div>
                    <div className="h-1.5 bg-[var(--surface-sunken)] rounded-full">
                      <div
                        className={`h-full ${getCoverageColor(coveredPct)} rounded-full transition-all duration-500`}
                        style={{ width: `${coveredPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Chain Integrity Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <Link2 className="w-4 h-4 text-[var(--text-tertiary)]" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Evidence Hash-Chain Integrity
              </span>
              {chainIntegrity.verified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-primary-soft)] text-[var(--accent-success)]">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]">
                  <XCircle className="w-3 h-3" />
                  Integrity Issue
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {chainIntegrity.totalRecords} hashed record
              {chainIntegrity.totalRecords !== 1 ? "s" : ""} &middot; Last
              verified {formatDate(chainIntegrity.lastVerified)}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
