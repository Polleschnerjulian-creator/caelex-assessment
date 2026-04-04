"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  ShieldCheck,
  Shield,
  ShieldAlert,
  ShieldOff,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  HelpCircle,
  Cpu,
  Info,
  Download,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import EvidencePanel from "@/components/audit/EvidencePanel";
import AstraButton from "@/components/astra/AstraButton";
import AssessmentFieldForm from "@/components/shared/AssessmentFieldForm";
import { suggestComplianceStatus } from "@/lib/compliance/auto-assess";
import { CRA_REQUIREMENTS } from "@/data/cra-requirements";
import type { ClassificationStep } from "@/lib/cra-types";
import SBOMUpload from "@/components/cra/SBOMUpload";
import NotifiedBodyWorkflow from "@/components/cra/NotifiedBodyWorkflow";

// ─── Types ───

interface RequirementStatus {
  id: string;
  requirementId: string;
  status: string;
  notes: string | null;
  evidenceNotes: string | null;
  targetDate: string | null;
  responses: Record<string, unknown> | null;
}

interface RequirementMeta {
  title: string;
  articleRef: string;
  category: string;
  severity: string;
  complianceQuestion: string;
  description: string;
  spaceSpecificGuidance: string;
  implementationTimeWeeks: number;
  canBeSimplified: boolean;
  nis2Ref?: string;
  iso27001Ref?: string;
  iec62443Ref?: string;
  ecssRef?: string;
}

interface CRAAssessment {
  id: string;
  productName: string;
  productVersion: string | null;
  spaceProductTypeId: string | null;
  economicOperatorRole: string;
  productClassification: string;
  conformityRoute: string;
  classificationReasoning: ClassificationStep[];
  classificationConflict: Record<string, unknown> | null;
  isOutOfScope: boolean;
  outOfScopeReason: string | null;
  segments: string;
  hasNetworkFunction: boolean | null;
  processesAuthData: boolean | null;
  usedInCriticalInfra: boolean | null;
  performsCryptoOps: boolean | null;
  controlsPhysicalSystem: boolean | null;
  hasMicrocontroller: boolean | null;
  isOSSComponent: boolean | null;
  isEUEstablished: boolean | null;
  hasIEC62443: boolean | null;
  hasETSIEN303645: boolean | null;
  hasCommonCriteria: boolean | null;
  hasISO27001: boolean | null;
  complianceScore: number | null;
  maturityScore: number | null;
  riskLevel: string | null;
  nis2OverlapCount: number | null;
  nis2AssessmentId: string | null;
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

// ─── Category Labels ───

const CATEGORY_LABELS: Record<string, string> = {
  security_by_design: "Security by Design",
  vulnerability_handling: "Vulnerability Handling",
  documentation: "Documentation",
  conformity_assessment: "Conformity Assessment",
  incident_reporting: "Incident Reporting",
  post_market_obligations: "Post-Market",
  software_update: "Software Update",
  sbom: "SBOM",
  support_period: "Support Period",
};

// ─── Config ───

const classificationConfig: Record<
  string,
  { icon: typeof Shield; label: string; color: string; bgColor: string }
> = {
  class_II: {
    icon: ShieldAlert,
    label: "Class II",
    color: "text-[var(--accent-danger)]",
    bgColor: "bg-[var(--accent-danger)]/10",
  },
  class_I: {
    icon: Shield,
    label: "Class I",
    color: "text-[var(--accent-warning)]",
    bgColor: "bg-[var(--accent-warning-soft)]",
  },
  default: {
    icon: ShieldCheck,
    label: "Default",
    color: "text-[var(--accent-success)]",
    bgColor: "bg-[var(--accent-success)]/10",
  },
};

const conformityRouteLabels: Record<string, string> = {
  self_assessment: "Self-Assessment (Module A)",
  harmonised_standard: "Harmonised Standard / Third-Party (Module B+C or H)",
  third_party_type_exam: "Third-Party Type Examination (Module B+C)",
  full_quality_assurance: "Full Quality Assurance (Module H)",
};

const statusConfig: Record<
  ReqStatusValue,
  { label: string; icon: typeof Check; color: string; bgColor: string }
> = {
  compliant: {
    label: "Compliant",
    icon: CheckCircle2,
    color: "text-[var(--accent-success)]",
    bgColor: "bg-[var(--accent-success)]/10",
  },
  partial: {
    label: "Partial",
    icon: Clock,
    color: "text-[var(--accent-warning)]",
    bgColor: "bg-[var(--accent-warning-soft)]",
  },
  non_compliant: {
    label: "Non-Compliant",
    icon: AlertTriangle,
    color: "text-[var(--accent-danger)]",
    bgColor: "bg-[var(--accent-danger)]/10",
  },
  not_applicable: {
    label: "N/A",
    icon: Ban,
    color: "text-[var(--text-tertiary)]",
    bgColor: "bg-[var(--surface-sunken)]0/10",
  },
  not_assessed: {
    label: "Not Assessed",
    icon: HelpCircle,
    color: "text-[var(--text-tertiary)]",
    bgColor: "bg-[var(--surface-sunken)]0/10",
  },
};

// ─── Page ───

export default function CRAAssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<CRAAssessment | null>(null);
  const [reqMeta, setReqMeta] = useState<Record<string, RequirementMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active category tab
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
  const [requirementResponses, setRequirementResponses] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [saveTimers, setSaveTimers] = useState<Record<string, NodeJS.Timeout>>(
    {},
  );

  // Reasoning chain expand
  const [expandedReasoning, setExpandedReasoning] = useState(false);

  // PDF generation
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  // Fetch assessment
  const fetchAssessment = useCallback(async () => {
    try {
      const res = await fetch(`/api/cra/${assessmentId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to load assessment (${res.status})`,
        );
      }
      const json = await res.json();
      const data = json.data ?? json;
      setAssessment(data.assessment);
      if (data.requirementMeta) {
        setReqMeta(data.requirementMeta);
      }
      // Initialize local responses from persisted data
      if (data.assessment?.requirements) {
        const initial: Record<string, Record<string, unknown>> = {};
        for (const req of data.assessment.requirements) {
          if (req.responses) {
            initial[req.requirementId] = req.responses;
          }
        }
        setRequirementResponses(initial);
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

  // Set default active category once data is loaded
  useEffect(() => {
    if (assessment && !activeCategory) {
      const cats = new Set<string>();
      for (const req of assessment.requirements) {
        const meta = reqMeta[req.requirementId];
        if (meta?.category) cats.add(meta.category);
      }
      const order = Object.keys(CATEGORY_LABELS);
      const sorted = Array.from(cats).sort(
        (a, b) => order.indexOf(a) - order.indexOf(b),
      );
      if (sorted.length > 0) {
        setActiveCategory(sorted[0]);
      }
    }
  }, [assessment, activeCategory, reqMeta]);

  // Update assessment name
  const handleSaveName = async () => {
    if (!nameInput.trim() || !assessment) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/cra/${assessmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ productName: nameInput.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update name");
      const json = await res.json();
      setAssessment((json.data ?? json).assessment);
      setEditingName(false);
    } catch {
      setError("Failed to update product name");
    } finally {
      setSavingName(false);
    }
  };

  // Delete assessment
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/cra/${assessmentId}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/dashboard/modules/cra");
    } catch {
      setError("Failed to delete assessment");
      setDeleting(false);
    }
  };

  // Generate PDF report
  const handleGeneratePdf = async (
    reportType: "cra_declaration" | "cra_compliance_summary",
  ) => {
    setGeneratingPdf(reportType);
    try {
      const res = await fetch(`/api/cra/${assessmentId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ reportType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate report");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        reportType === "cra_declaration"
          ? `cra-eu-declaration-${assessmentId}.pdf`
          : `cra-compliance-summary-${assessmentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate report",
      );
    } finally {
      setGeneratingPdf(null);
    }
  };

  // Update requirement status
  const handleUpdateRequirement = async (
    requirementId: string,
    status: ReqStatusValue,
  ) => {
    setUpdatingReq(requirementId);
    try {
      const res = await fetch("/api/cra/requirements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          assessmentId,
          requirementId,
          status,
        }),
      });
      if (!res.ok) throw new Error("Failed to update requirement");
      await fetchAssessment();
    } catch {
      setError("Failed to update requirement status");
    } finally {
      setUpdatingReq(null);
    }
  };

  const saveResponses = useCallback(
    async (requirementId: string, responses: Record<string, unknown>) => {
      try {
        await fetch("/api/cra/requirements", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            assessmentId,
            requirementId,
            responses,
          }),
        });
      } catch (error) {
        console.error("Error saving responses:", error);
      }
    },
    [assessmentId],
  );

  const handleFieldChange = useCallback(
    (requirementId: string, fieldId: string, value: unknown) => {
      setRequirementResponses((prev) => {
        const updated = { ...prev[requirementId], [fieldId]: value };
        const next = { ...prev, [requirementId]: updated };

        // Debounced save
        if (saveTimers[requirementId]) {
          clearTimeout(saveTimers[requirementId]);
        }
        const timer = setTimeout(() => {
          saveResponses(requirementId, updated);
        }, 500);
        setSaveTimers((t) => ({ ...t, [requirementId]: timer }));

        return next;
      });
    },
    [saveTimers, saveResponses],
  );

  const getFieldCompletionCount = (
    requirementId: string,
    _totalFields: number,
  ) => {
    const resp = requirementResponses[requirementId];
    if (!resp) return 0;
    return Object.values(resp).filter(
      (v) => v !== null && v !== undefined && v !== "",
    ).length;
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

  // Get unique categories from requirements
  const getRequirementCategories = (): string[] => {
    if (!assessment) return [];
    const cats = new Set<string>();
    for (const req of assessment.requirements) {
      const meta = reqMeta[req.requirementId];
      if (meta?.category) cats.add(meta.category);
    }
    // Sort by predefined order
    const order = Object.keys(CATEGORY_LABELS);
    return Array.from(cats).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  };

  // Filter requirements by active category
  const getFilteredRequirements = () => {
    if (!assessment) return [];
    if (!activeCategory) return assessment.requirements;
    return assessment.requirements.filter((req) => {
      const meta = reqMeta[req.requirementId];
      return meta?.category === activeCategory;
    });
  };

  if (loading) {
    return (
      <FeatureGate module="cra">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
        </div>
      </FeatureGate>
    );
  }

  if (error && !assessment) {
    return (
      <FeatureGate module="cra">
        <div className="space-y-4">
          <button
            onClick={() => router.push("/dashboard/modules/cra")}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to CRA
          </button>
          <div className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--accent-danger)] flex-shrink-0" />
            <p className="text-sm text-[var(--accent-danger)]">{error}</p>
          </div>
        </div>
      </FeatureGate>
    );
  }

  if (!assessment) return null;

  const config =
    classificationConfig[assessment.productClassification || "default"] ||
    classificationConfig.default;
  const ClassIcon = config.icon;

  const totalReqs = assessment.requirements.length;
  const compliantReqs = assessment.requirements.filter(
    (r) => r.status === "compliant",
  ).length;
  const notAssessedReqs = assessment.requirements.filter(
    (r) => r.status === "not_assessed",
  ).length;

  const categories = getRequirementCategories();
  const filteredReqs = getFilteredRequirements();

  // Parse reasoning chain
  const reasoning: ClassificationStep[] = Array.isArray(
    assessment.classificationReasoning,
  )
    ? (assessment.classificationReasoning as ClassificationStep[])
    : [];

  return (
    <FeatureGate module="cra">
      <div className="space-y-6">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/modules/cra")}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to CRA
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleGeneratePdf("cra_declaration")}
              disabled={generatingPdf !== null}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--accent-primary)] hover:text-emerald-300 border border-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)]/40 rounded-lg transition-colors disabled:opacity-50"
            >
              {generatingPdf === "cra_declaration" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              EU Declaration
            </button>
            <button
              onClick={() => handleGeneratePdf("cra_compliance_summary")}
              disabled={generatingPdf !== null}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--accent-primary)] hover:text-emerald-300 border border-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)]/40 rounded-lg transition-colors disabled:opacity-50"
            >
              {generatingPdf === "cra_compliance_summary" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              Compliance Summary
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--accent-danger)] hover:text-red-300 border border-[var(--accent-danger)]/20 hover:border-[var(--accent-danger)]/40 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {/* Error banner */}
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

        {/* Delete confirm */}
        {showDeleteConfirm && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 rounded-xl p-5"
          >
            <h3 className="text-sm font-medium text-[var(--accent-danger)] mb-2">
              Delete this assessment?
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              This will permanently delete &ldquo;
              {assessment.productName || "Untitled"}&rdquo; and all its
              requirement tracking data. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-danger)] hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Header Card */}
        <div className="bg-[var(--surface-raised)][0.02] border border-[var(--border-default)] rounded-xl p-6">
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
                  className="flex-1 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-lg font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]/50"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="p-2 text-[var(--accent-success)] hover:text-green-300"
                >
                  {savingName ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-tertiary)]"
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
                    <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                      {assessment.productName || "Untitled Product"}
                    </h1>
                    {assessment.productVersion && (
                      <span className="text-sm text-[var(--text-tertiary)]">
                        v{assessment.productVersion}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setNameInput(assessment.productName || "");
                        setEditingName(true);
                      }}
                      className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-sm font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {conformityRouteLabels[assessment.conformityRoute] ||
                        assessment.conformityRoute}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Classification Reasoning (collapsible) */}
          {reasoning.length > 0 && (
            <div className="mb-5">
              <button
                onClick={() => setExpandedReasoning(!expandedReasoning)}
                className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {expandedReasoning ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                Classification Reasoning ({reasoning.length} criteria)
              </button>
              <AnimatePresence>
                {expandedReasoning && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 mt-3">
                      {reasoning.map((step, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            step.satisfied
                              ? "bg-[var(--accent-success)]/5 border-[var(--accent-success)]/20"
                              : "bg-[var(--surface-sunken)] border-[var(--border-subtle)]"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {step.satisfied ? (
                              <Check
                                size={14}
                                className="text-[var(--accent-success)] mt-0.5 flex-shrink-0"
                              />
                            ) : (
                              <X
                                size={14}
                                className="text-[var(--text-tertiary)] mt-0.5 flex-shrink-0"
                              />
                            )}
                            <div>
                              <div className="text-xs font-medium text-[var(--text-primary)]">
                                {step.criterion}
                              </div>
                              <div className="text-micro text-[var(--text-tertiary)] mt-0.5">
                                {step.legalBasis}
                                {step.annexRef !== "N/A" &&
                                  ` (${step.annexRef}${step.annexCategory ? ` Kat. ${step.annexCategory}` : ""})`}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                                {step.reasoning}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Maturity Score */}
            <div className="bg-[var(--surface-sunken)] rounded-xl p-4">
              <div className="text-micro uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Maturity
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {assessment.maturityScore ?? 0}%
              </div>
              <div className="h-1.5 bg-[var(--surface-sunken)] rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
                  style={{ width: `${assessment.maturityScore ?? 0}%` }}
                />
              </div>
            </div>

            {/* Compliance Progress */}
            <div className="bg-[var(--surface-sunken)] rounded-xl p-4">
              <div className="text-micro uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Compliant
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {compliantReqs}/{totalReqs}
              </div>
              <div className="text-caption text-[var(--text-tertiary)] mt-1">
                {notAssessedReqs > 0 && `${notAssessedReqs} pending`}
              </div>
            </div>

            {/* Conformity Route */}
            <div className="bg-[var(--surface-sunken)] rounded-xl p-4">
              <div className="text-micro uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Conformity
              </div>
              <div className={`text-sm font-bold ${config.color}`}>
                {config.label}
              </div>
              <div className="text-caption text-[var(--text-tertiary)] mt-1 truncate">
                {conformityRouteLabels[assessment.conformityRoute]
                  ?.split("(")[0]
                  ?.trim() || assessment.conformityRoute}
              </div>
            </div>

            {/* NIS2 Overlap */}
            <div className="bg-[var(--surface-sunken)] rounded-xl p-4">
              <div className="text-micro uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                NIS2 Overlap
              </div>
              <div className="text-2xl font-bold text-cyan-400">
                {assessment.nis2OverlapCount || 0}
              </div>
              <div className="text-caption text-cyan-400/60 mt-1">
                Requirements
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="mt-5 pt-5 border-t border-[var(--border-default)] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[var(--text-tertiary)] block mb-0.5">
                Operator Role
              </span>
              <span className="text-[var(--text-secondary)] capitalize">
                {assessment.economicOperatorRole}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)] block mb-0.5">
                Segments
              </span>
              <span className="text-[var(--text-secondary)]">
                {(() => {
                  try {
                    const parsed = JSON.parse(assessment.segments);
                    return Array.isArray(parsed)
                      ? parsed.join(", ")
                      : assessment.segments;
                  } catch {
                    return assessment.segments;
                  }
                })()}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)] block mb-0.5">
                Created
              </span>
              <span className="text-[var(--text-secondary)]">
                {new Date(assessment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)] block mb-0.5">
                EU Established
              </span>
              <span className="text-[var(--text-secondary)]">
                {assessment.isEUEstablished === true
                  ? "Yes"
                  : assessment.isEUEstablished === false
                    ? "No"
                    : "N/A"}
              </span>
            </div>
          </div>

          {/* Certification badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            {assessment.hasIEC62443 && (
              <span className="text-caption bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] rounded-lg px-2 py-1">
                IEC 62443
              </span>
            )}
            {assessment.hasCommonCriteria && (
              <span className="text-caption bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] rounded-lg px-2 py-1">
                Common Criteria
              </span>
            )}
            {assessment.hasETSIEN303645 && (
              <span className="text-caption bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] rounded-lg px-2 py-1">
                ETSI EN 303 645
              </span>
            )}
            {assessment.hasISO27001 && (
              <span className="text-caption bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] rounded-lg px-2 py-1">
                ISO 27001
              </span>
            )}
          </div>
        </div>

        {/* NIS2 Callout (when no linked NIS2 assessment) */}
        {!assessment.nis2AssessmentId && (
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-cyan-400 mb-1">
                  NIS2-Assessment empfohlen
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                  Du hast noch kein NIS2-Assessment. Basierend auf deinem
                  Produktprofil als Hersteller in der Space-Branche w&auml;rst
                  du wahrscheinlich NIS2-pflichtig (Annex I, Sektor 11). Starte
                  ein NIS2-Assessment um Requirements automatisch vorzubelegen.
                </p>
                <Link
                  href="/dashboard/modules/nis2"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium transition-colors"
                >
                  <ShieldCheck size={14} />
                  NIS2-Assessment starten
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* SBOM Upload & Analysis */}
        {!assessment.isOutOfScope && (
          <SBOMUpload
            assessmentId={assessmentId}
            onAnalysisComplete={fetchAssessment}
          />
        )}

        {/* Notified Body Workflow — Class II (mandatory) or Class I with third-party route */}
        {!assessment.isOutOfScope &&
          (assessment.productClassification === "class_II" ||
            (assessment.productClassification === "class_I" &&
              assessment.conformityRoute === "third_party_type_exam")) && (
            <NotifiedBodyWorkflow
              assessmentId={assessmentId}
              productClassification={assessment.productClassification}
              conformityRoute={assessment.conformityRoute}
              productName={assessment.productName}
            />
          )}

        {/* Legal network link — near Notified Body workflow */}
        {!assessment.isOutOfScope && (
          <div className="flex justify-end">
            <a
              href="/legal-network"
              className="inline-flex items-center gap-1.5 text-small text-[#9ca3af] hover:text-[#111827] transition-colors"
            >
              Rechtliche Beratung benötigt? Anwalt finden →
            </a>
          </div>
        )}

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
                  <div className={`text-lg font-bold ${sc.color}`}>{count}</div>
                  <div className="text-micro text-[var(--text-secondary)]">
                    {sc.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-[var(--border-default)] pb-0">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              const catReqs = assessment.requirements.filter(
                (r) => reqMeta[r.requirementId]?.category === cat,
              );
              const catCompliant = catReqs.filter(
                (r) => r.status === "compliant",
              ).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 ${
                    isActive
                      ? "text-[var(--accent-primary)] border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                      : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]"
                  }`}
                >
                  {CATEGORY_LABELS[cat] || cat}
                  <span className="ml-1.5 text-micro text-[var(--text-tertiary)]">
                    {catCompliant}/{catReqs.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Requirements List */}
        {filteredReqs.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
              <FileText size={16} className="text-[var(--text-tertiary)]" />
              {CATEGORY_LABELS[activeCategory || ""] || "Requirements"} (
              {filteredReqs.length})
            </h2>
            {filteredReqs
              .sort((a, b) => a.requirementId.localeCompare(b.requirementId))
              .map((req) => {
                const sc =
                  statusConfig[req.status as ReqStatusValue] ||
                  statusConfig.not_assessed;
                const StatusIcon = sc.icon;
                const isExpanded = expandedReqs.has(req.requirementId);
                const isUpdating = updatingReq === req.requirementId;
                const meta = reqMeta[req.requirementId];
                const craDef = CRA_REQUIREMENTS.find(
                  (r) => r.id === req.requirementId,
                );
                const fields = craDef?.assessmentFields || [];
                const responses = requirementResponses[req.requirementId] || {};
                const completedFields = getFieldCompletionCount(
                  req.requirementId,
                  fields.length,
                );
                const suggested = suggestComplianceStatus(
                  craDef?.complianceRule,
                  responses,
                  { supportPartial: true },
                );
                const severityColors: Record<string, string> = {
                  critical:
                    "text-[var(--accent-danger)] bg-[var(--accent-danger)]/10",
                  major:
                    "text-[var(--accent-warning)] bg-[var(--accent-warning-soft)]",
                  minor:
                    "text-[var(--text-tertiary)] bg-[var(--surface-sunken)]0/10",
                };

                return (
                  <motion.div
                    key={req.id}
                    layout
                    className={`rounded-xl overflow-hidden transition-all ${
                      isExpanded
                        ? "bg-[var(--surface-raised)] border border-[var(--border-default)][0.15] ring-1 ring-slate-200[0.05]"
                        : "bg-[var(--surface-raised)][0.02] border border-[var(--border-default)]"
                    }`}
                  >
                    <button
                      onClick={() => toggleReqExpand(req.requirementId)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-sunken)]:bg-[var(--surface-sunken)] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <StatusIcon
                          className={`w-4 h-4 ${sc.color} flex-shrink-0`}
                        />
                        <span className="text-caption font-mono text-[var(--text-tertiary)] flex-shrink-0">
                          {meta?.articleRef || req.requirementId}
                        </span>
                        <span className="text-sm text-[var(--text-primary)] truncate">
                          {meta?.title || req.requirementId}
                        </span>
                        {!isExpanded && fields.length > 0 && (
                          <span className="text-micro text-[var(--text-tertiary)] flex-shrink-0">
                            {completedFields}/{fields.length}
                          </span>
                        )}
                        {meta?.severity && (
                          <span
                            className={`text-micro font-medium px-1.5 py-0.5 rounded ${severityColors[meta.severity] || ""} flex-shrink-0`}
                          >
                            {meta.severity}
                          </span>
                        )}
                        {/* NIS2 overlap badge */}
                        {meta?.nis2Ref && (
                          <span className="text-micro bg-cyan-500/10 text-cyan-400 rounded px-1.5 py-0.5 flex-shrink-0">
                            NIS2
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span
                          className={`text-caption font-medium ${sc.color} hidden sm:inline`}
                        >
                          {sc.label}
                        </span>
                        {isUpdating && (
                          <Loader2
                            size={14}
                            className="animate-spin text-[var(--accent-primary)]"
                          />
                        )}
                        {isExpanded ? (
                          <ChevronUp
                            size={14}
                            className="text-[var(--text-tertiary)]"
                          />
                        ) : (
                          <ChevronDown
                            size={14}
                            className="text-[var(--text-tertiary)]"
                          />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <motion.div
                        initial={false}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-[var(--border-default)] px-4 py-4 space-y-4"
                      >
                        {/* Compliance Question */}
                        {meta?.complianceQuestion && (
                          <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-3">
                            <div className="text-micro uppercase tracking-wider text-orange-400/60 mb-1">
                              Compliance Question
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {meta.complianceQuestion}
                            </p>
                          </div>
                        )}

                        {/* Description */}
                        {meta?.description && (
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            {meta.description}
                          </p>
                        )}

                        {/* Space-Specific Guidance */}
                        {meta?.spaceSpecificGuidance && (
                          <div className="border-l-2 border-orange-500/30 pl-3">
                            <div className="text-micro uppercase tracking-wider text-orange-400/60 mb-1">
                              Space Sector Guidance
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              {meta.spaceSpecificGuidance}
                            </p>
                          </div>
                        )}

                        {/* Sub-question form */}
                        {fields.length > 0 && (
                          <div className="p-4 bg-[var(--surface-sunken)][0.02] rounded-lg border border-[var(--border-subtle)][0.05]">
                            <p className="text-micro uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                              Assessment Details
                            </p>
                            <AssessmentFieldForm
                              fields={fields}
                              values={responses}
                              onChange={(fieldId, value) =>
                                handleFieldChange(
                                  req.requirementId,
                                  fieldId,
                                  value,
                                )
                              }
                            />
                          </div>
                        )}

                        {/* Auto-suggested status */}
                        {suggested && suggested !== req.status && (
                          <div className="flex items-center gap-3 p-3 bg-[var(--accent-info-soft)]0/5 rounded-lg border border-[var(--accent-primary)]/10">
                            <Cpu
                              size={14}
                              className="text-[var(--accent-primary)]"
                            />
                            <span className="text-small text-[var(--accent-primary)]/80">
                              ASTRA suggests:{" "}
                              <span className="font-medium capitalize">
                                {statusConfig[suggested as ReqStatusValue]
                                  ?.label || suggested}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateRequirement(
                                  req.requirementId,
                                  suggested as ReqStatusValue,
                                )
                              }
                              className="ml-auto text-caption bg-[var(--accent-info-soft)]0/10 text-[var(--accent-primary)] px-3 py-1 rounded-lg hover:bg-[var(--accent-info-soft)]0/20 transition-colors"
                            >
                              Accept
                            </button>
                          </div>
                        )}

                        {/* Cross-references */}
                        {(meta?.nis2Ref ||
                          meta?.iso27001Ref ||
                          meta?.iec62443Ref ||
                          meta?.ecssRef) && (
                          <div className="flex flex-wrap gap-2">
                            {meta.nis2Ref && (
                              <span className="text-micro bg-cyan-500/10 text-cyan-400 rounded-lg px-2 py-1">
                                NIS2 {meta.nis2Ref}
                              </span>
                            )}
                            {meta.iso27001Ref && (
                              <span className="text-micro bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] rounded-lg px-2 py-1">
                                ISO 27001 {meta.iso27001Ref}
                              </span>
                            )}
                            {meta.iec62443Ref && (
                              <span className="text-micro bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] rounded-lg px-2 py-1">
                                IEC 62443 {meta.iec62443Ref}
                              </span>
                            )}
                            {meta.ecssRef && (
                              <span className="text-micro bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] rounded-lg px-2 py-1">
                                ECSS {meta.ecssRef}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Compliance Evidence */}
                        <EvidencePanel
                          regulationType="CRA"
                          requirementId={req.requirementId}
                        />

                        {/* ASTRA AI Agent */}
                        <AstraButton
                          articleId={req.requirementId}
                          articleRef={meta?.articleRef || req.requirementId}
                          title={meta?.title || req.requirementId}
                          severity={meta?.severity || "major"}
                          regulationType="CRA"
                        />

                        {/* Status buttons */}
                        <div className="pt-3 border-t border-[var(--border-default)]">
                          <div className="text-micro uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
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
                                      : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
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
                          <p className="text-xs text-[var(--text-secondary)] border-l-2 border-[var(--border-default)] pl-2 italic">
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
          <div className="bg-[var(--surface-raised)][0.02] border border-[var(--border-default)] rounded-xl p-8 text-center">
            <ShieldOff className="w-10 h-10 text-[var(--text-tertiary)]/40 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              No requirements applicable
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              This product classification does not have applicable CRA
              requirements, or the assessment is still being processed.
            </p>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
