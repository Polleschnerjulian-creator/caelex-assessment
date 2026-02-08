"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  ShieldCheck,
  Shield,
  ShieldAlert,
  ShieldOff,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Building2,
  Globe,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  HelpCircle,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Types ───

interface RequirementStatus {
  id: string;
  requirementId: string;
  status: string;
  notes: string | null;
  evidenceNotes: string | null;
  targetDate: string | null;
}

interface RequirementMeta {
  title: string;
  articleRef: string;
  category: string;
  severity: string;
  complianceQuestion: string;
  description: string;
  spaceSpecificGuidance: string;
  tips: string[];
  evidenceRequired: string[];
  euSpaceActRef?: string;
  iso27001Ref?: string;
}

interface NIS2Assessment {
  id: string;
  assessmentName: string | null;
  entityClassification: string | null;
  classificationReason: string | null;
  sector: string | null;
  subSector: string | null;
  organizationSize: string | null;
  employeeCount: number | null;
  annualRevenue: number | null;
  memberStateCount: number;
  complianceScore: number | null;
  maturityScore: number | null;
  riskLevel: string | null;
  euSpaceActOverlapCount: number | null;
  operatesGroundInfra: boolean;
  operatesSatComms: boolean;
  manufacturesSpacecraft: boolean;
  providesLaunchServices: boolean;
  providesEOData: boolean;
  hasISO27001: boolean;
  hasExistingCSIRT: boolean;
  hasRiskManagement: boolean;
  requirements: RequirementStatus[];
  createdAt: string;
  updatedAt: string;
}

type ReqStatusValue =
  | "not_assessed"
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_applicable";

// ─── Config ───

const classificationConfig: Record<
  string,
  { icon: typeof Shield; label: string; color: string; bgColor: string }
> = {
  essential: {
    icon: ShieldAlert,
    label: "Essential Entity",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  important: {
    icon: Shield,
    label: "Important Entity",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  out_of_scope: {
    icon: ShieldOff,
    label: "Out of Scope",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
  },
};

const statusConfig: Record<
  ReqStatusValue,
  { label: string; icon: typeof Check; color: string; bgColor: string }
> = {
  compliant: {
    label: "Compliant",
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  partial: {
    label: "Partial",
    icon: Clock,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  non_compliant: {
    label: "Non-Compliant",
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  not_applicable: {
    label: "N/A",
    icon: Ban,
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
  },
  not_assessed: {
    label: "Not Assessed",
    icon: HelpCircle,
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
  },
};

const riskLevelConfig: Record<string, { label: string; color: string }> = {
  high: { label: "High", color: "text-red-400" },
  medium: { label: "Medium", color: "text-amber-400" },
  low: { label: "Low", color: "text-green-400" },
  critical: { label: "Critical", color: "text-red-500" },
};

// ─── Page ───

export default function NIS2AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<NIS2Assessment | null>(null);
  const [reqMeta, setReqMeta] = useState<Record<string, RequirementMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Requirements expand
  const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());
  const [updatingReq, setUpdatingReq] = useState<string | null>(null);

  // Fetch assessment
  const fetchAssessment = useCallback(async () => {
    try {
      const res = await fetch(`/api/nis2/${assessmentId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to load assessment (${res.status})`,
        );
      }
      const data = await res.json();
      setAssessment(data.assessment);
      if (data.requirementMeta) {
        setReqMeta(data.requirementMeta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  // Update assessment name
  const handleSaveName = async () => {
    if (!nameInput.trim() || !assessment) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/nis2/${assessmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ assessmentName: nameInput.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update name");
      const data = await res.json();
      setAssessment(data.assessment);
      setEditingName(false);
    } catch {
      setError("Failed to update assessment name");
    } finally {
      setSavingName(false);
    }
  };

  // Delete assessment
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/nis2/${assessmentId}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/dashboard/modules/nis2");
    } catch {
      setError("Failed to delete assessment");
      setDeleting(false);
    }
  };

  // Update requirement status
  const handleUpdateRequirement = async (
    requirementId: string,
    status: ReqStatusValue,
  ) => {
    setUpdatingReq(requirementId);
    try {
      const res = await fetch("/api/nis2/requirements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          assessmentId,
          requirementId,
          status,
        }),
      });
      if (!res.ok) throw new Error("Failed to update requirement");
      // Refresh assessment to get updated scores
      await fetchAssessment();
    } catch {
      setError("Failed to update requirement status");
    } finally {
      setUpdatingReq(null);
    }
  };

  // Toggle requirement expand
  const toggleReqExpand = (reqId: string) => {
    setExpandedReqs((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) next.delete(reqId);
      else next.add(reqId);
      return next;
    });
  };

  if (loading) {
    return (
      <FeatureGate module="nis2">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-white/40" />
        </div>
      </FeatureGate>
    );
  }

  if (error && !assessment) {
    return (
      <FeatureGate module="nis2">
        <div className="space-y-4">
          <button
            onClick={() => router.push("/dashboard/modules/nis2")}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to NIS2
          </button>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      </FeatureGate>
    );
  }

  if (!assessment) return null;

  const config =
    classificationConfig[assessment.entityClassification || "out_of_scope"] ||
    classificationConfig.out_of_scope;
  const ClassIcon = config.icon;

  const totalReqs = assessment.requirements.length;
  const compliantReqs = assessment.requirements.filter(
    (r) => r.status === "compliant",
  ).length;
  const partialReqs = assessment.requirements.filter(
    (r) => r.status === "partial",
  ).length;
  const nonCompliantReqs = assessment.requirements.filter(
    (r) => r.status === "non_compliant",
  ).length;
  const notAssessedReqs = assessment.requirements.filter(
    (r) => r.status === "not_assessed",
  ).length;
  const progress =
    totalReqs > 0 ? Math.round((compliantReqs / totalReqs) * 100) : 0;
  const risk =
    riskLevelConfig[assessment.riskLevel || "low"] || riskLevelConfig.low;

  return (
    <FeatureGate module="nis2">
      <div className="space-y-6">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/modules/nis2")}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to NIS2
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {/* Error banner */}
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

        {/* Delete confirm modal */}
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-5"
          >
            <h3 className="text-sm font-medium text-red-400 mb-2">
              Delete this assessment?
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40 mb-4">
              This will permanently delete &ldquo;
              {assessment.assessmentName || "Untitled"}&rdquo; and all its
              requirement tracking data. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Header Card */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6">
          {/* Name */}
          <div className="flex items-start justify-between mb-4">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1 mr-4">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  autoFocus
                  className="flex-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-lg font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="p-2 text-green-400 hover:text-green-300"
                >
                  {savingName ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="p-2 text-slate-400 hover:text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}
                >
                  <ClassIcon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {assessment.assessmentName || "Untitled Assessment"}
                    </h1>
                    <button
                      onClick={() => {
                        setNameInput(assessment.assessmentName || "");
                        setEditingName(true);
                      }}
                      className="p-1 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  <span className={`text-sm font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Classification Reason */}
          {assessment.classificationReason && (
            <p className="text-xs text-slate-500 dark:text-white/40 leading-relaxed mb-5 border-l-2 border-slate-200 dark:border-white/10 pl-3">
              {assessment.classificationReason}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Compliance Progress */}
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-1">
                Compliance
              </div>
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                {progress}%
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-1">
                Requirements
              </div>
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                {compliantReqs}/{totalReqs}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-white/30 mt-1">
                {notAssessedReqs > 0 && `${notAssessedReqs} pending`}
              </div>
            </div>

            {/* Risk Level */}
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-1">
                Risk Level
              </div>
              <div className={`text-2xl font-mono font-bold ${risk.color}`}>
                {risk.label}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-white/30 mt-1">
                {assessment.organizationSize || "unknown"} entity
              </div>
            </div>

            {/* EU Space Act Overlaps */}
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-1">
                Overlaps
              </div>
              <div className="text-2xl font-mono font-bold text-green-400">
                {assessment.euSpaceActOverlapCount || 0}
              </div>
              <div className="text-[11px] text-green-400/60 mt-1">
                EU Space Act
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 dark:text-white/30 block mb-0.5">
                Sector
              </span>
              <span className="text-slate-700 dark:text-white/70">
                {assessment.sector?.replace(/_/g, " ") || "Space"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-white/30 block mb-0.5">
                Member States
              </span>
              <span className="text-slate-700 dark:text-white/70">
                {assessment.memberStateCount}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-white/30 block mb-0.5">
                Created
              </span>
              <span className="text-slate-700 dark:text-white/70">
                {new Date(assessment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-white/30 block mb-0.5">
                Maturity Score
              </span>
              <span className="text-slate-700 dark:text-white/70">
                {assessment.maturityScore ?? 0}%
              </span>
            </div>
          </div>

          {/* Space Activities */}
          <div className="mt-4 flex flex-wrap gap-2">
            {assessment.operatesGroundInfra && (
              <span className="text-[11px] bg-cyan-500/10 text-cyan-400 rounded-md px-2 py-1">
                Ground Infra
              </span>
            )}
            {assessment.operatesSatComms && (
              <span className="text-[11px] bg-cyan-500/10 text-cyan-400 rounded-md px-2 py-1">
                SatCom
              </span>
            )}
            {assessment.manufacturesSpacecraft && (
              <span className="text-[11px] bg-cyan-500/10 text-cyan-400 rounded-md px-2 py-1">
                Spacecraft Mfg
              </span>
            )}
            {assessment.providesLaunchServices && (
              <span className="text-[11px] bg-cyan-500/10 text-cyan-400 rounded-md px-2 py-1">
                Launch Services
              </span>
            )}
            {assessment.providesEOData && (
              <span className="text-[11px] bg-cyan-500/10 text-cyan-400 rounded-md px-2 py-1">
                Earth Observation
              </span>
            )}
            {assessment.hasISO27001 && (
              <span className="text-[11px] bg-blue-500/10 text-blue-400 rounded-md px-2 py-1">
                ISO 27001
              </span>
            )}
            {assessment.hasExistingCSIRT && (
              <span className="text-[11px] bg-blue-500/10 text-blue-400 rounded-md px-2 py-1">
                CSIRT
              </span>
            )}
            {assessment.hasRiskManagement && (
              <span className="text-[11px] bg-blue-500/10 text-blue-400 rounded-md px-2 py-1">
                Risk Mgmt
              </span>
            )}
          </div>
        </div>

        {/* Requirements Status Summary */}
        {totalReqs > 0 && (
          <div className="grid grid-cols-5 gap-3">
            {(
              [
                "compliant",
                "partial",
                "non_compliant",
                "not_applicable",
                "not_assessed",
              ] as ReqStatusValue[]
            ).map((s) => {
              const sc = statusConfig[s];
              const StatusIcon = sc.icon;
              const count = assessment.requirements.filter(
                (r) => r.status === s,
              ).length;
              return (
                <div
                  key={s}
                  className={`${sc.bgColor} border border-transparent rounded-xl p-3 text-center`}
                >
                  <StatusIcon className={`w-4 h-4 ${sc.color} mx-auto mb-1`} />
                  <div className={`text-lg font-mono font-bold ${sc.color}`}>
                    {count}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-white/40">
                    {sc.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Requirements List */}
        {totalReqs > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <FileText
                size={16}
                className="text-slate-400 dark:text-white/40"
              />
              Requirements ({totalReqs})
            </h2>
            {assessment.requirements
              .sort((a, b) => a.requirementId.localeCompare(b.requirementId))
              .map((req) => {
                const sc =
                  statusConfig[req.status as ReqStatusValue] ||
                  statusConfig.not_assessed;
                const StatusIcon = sc.icon;
                const isExpanded = expandedReqs.has(req.requirementId);
                const isUpdating = updatingReq === req.requirementId;
                const meta = reqMeta[req.requirementId];
                const severityColors: Record<string, string> = {
                  critical: "text-red-400 bg-red-500/10",
                  major: "text-amber-400 bg-amber-500/10",
                  minor: "text-slate-400 bg-slate-500/10",
                };

                return (
                  <motion.div
                    key={req.id}
                    layout
                    className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleReqExpand(req.requirementId)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <StatusIcon
                          className={`w-4 h-4 ${sc.color} flex-shrink-0`}
                        />
                        <span className="text-[11px] font-mono text-slate-400 dark:text-white/30 flex-shrink-0">
                          {meta?.articleRef || req.requirementId}
                        </span>
                        <span className="text-sm text-slate-900 dark:text-white/80 truncate">
                          {meta?.title || req.requirementId}
                        </span>
                        {meta?.severity && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${severityColors[meta.severity] || ""} flex-shrink-0`}
                          >
                            {meta.severity}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span
                          className={`text-[11px] font-medium ${sc.color} hidden sm:inline`}
                        >
                          {sc.label}
                        </span>
                        {isUpdating && (
                          <Loader2
                            size={14}
                            className="animate-spin text-blue-400"
                          />
                        )}
                        {isExpanded ? (
                          <ChevronUp
                            size={14}
                            className="text-slate-400 dark:text-white/30"
                          />
                        ) : (
                          <ChevronDown
                            size={14}
                            className="text-slate-400 dark:text-white/30"
                          />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-200 dark:border-white/[0.06] px-4 py-4 space-y-4"
                      >
                        {/* Compliance Question */}
                        {meta?.complianceQuestion && (
                          <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400/60 mb-1">
                              Compliance Question
                            </div>
                            <p className="text-sm text-slate-700 dark:text-white/70">
                              {meta.complianceQuestion}
                            </p>
                          </div>
                        )}

                        {/* Description */}
                        {meta?.description && (
                          <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed">
                            {meta.description}
                          </p>
                        )}

                        {/* Space-Specific Guidance */}
                        {meta?.spaceSpecificGuidance && (
                          <div className="border-l-2 border-cyan-500/30 pl-3">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60 mb-1">
                              Space Sector Guidance
                            </div>
                            <p className="text-xs text-slate-500 dark:text-white/45 leading-relaxed">
                              {meta.spaceSpecificGuidance}
                            </p>
                          </div>
                        )}

                        {/* Cross-references */}
                        {(meta?.euSpaceActRef || meta?.iso27001Ref) && (
                          <div className="flex flex-wrap gap-2">
                            {meta.euSpaceActRef && (
                              <span className="text-[10px] bg-green-500/10 text-green-400 rounded-md px-2 py-1">
                                EU Space Act {meta.euSpaceActRef}
                              </span>
                            )}
                            {meta.iso27001Ref && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-400 rounded-md px-2 py-1">
                                ISO 27001 {meta.iso27001Ref}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Tips */}
                        {meta?.tips && meta.tips.length > 0 && (
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-1.5">
                              Implementation Tips
                            </div>
                            <ul className="space-y-1">
                              {meta.tips.map((tip, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-slate-500 dark:text-white/40 flex items-start gap-2"
                                >
                                  <span className="text-blue-400 mt-0.5">
                                    &bull;
                                  </span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Evidence Required */}
                        {meta?.evidenceRequired &&
                          meta.evidenceRequired.length > 0 && (
                            <div>
                              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-1.5">
                                Evidence Required
                              </div>
                              <ul className="space-y-1">
                                {meta.evidenceRequired.map((ev, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-slate-500 dark:text-white/40 flex items-start gap-2"
                                  >
                                    <CheckCircle2
                                      size={12}
                                      className="text-slate-400/50 mt-0.5 flex-shrink-0"
                                    />
                                    {ev}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* Status buttons */}
                        <div className="pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-2">
                            Set Status
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                "compliant",
                                "partial",
                                "non_compliant",
                                "not_applicable",
                                "not_assessed",
                              ] as ReqStatusValue[]
                            ).map((s) => {
                              const btnSc = statusConfig[s];
                              const isActive = req.status === s;
                              return (
                                <button
                                  key={s}
                                  onClick={() =>
                                    handleUpdateRequirement(
                                      req.requirementId,
                                      s,
                                    )
                                  }
                                  disabled={isUpdating}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    isActive
                                      ? `${btnSc.bgColor} ${btnSc.color} ring-1 ring-current`
                                      : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60"
                                  } disabled:opacity-50`}
                                >
                                  {btnSc.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* User notes */}
                        {req.notes && (
                          <p className="text-xs text-slate-500 dark:text-white/40 border-l-2 border-slate-200 dark:border-white/10 pl-2 italic">
                            {req.notes}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
          </div>
        )}

        {/* Empty requirements */}
        {totalReqs === 0 && (
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-8 text-center">
            <ShieldOff className="w-10 h-10 text-slate-400/40 dark:text-white/20 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-700 dark:text-white/70 mb-1">
              No requirements applicable
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              This entity classification does not have applicable NIS2
              requirements.
            </p>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
