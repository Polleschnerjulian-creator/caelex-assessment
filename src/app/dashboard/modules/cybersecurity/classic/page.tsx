"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  Shield,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Info,
  FileText,
  Loader2,
  Download,
  Plus,
  Lock,
  Key,
  Eye,
  LifeBuoy,
  Network,
  Search,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import EvidencePanel from "@/components/audit/EvidencePanel";
import AstraButton from "@/components/astra/AstraButton";
import AssessmentFieldForm from "@/components/shared/AssessmentFieldForm";
import { suggestComplianceStatus } from "@/lib/compliance/auto-assess";
import {
  ProvenanceChip,
  CausalBreadcrumb,
  ModuleWhySidebar,
  ControlContextWindow,
} from "@/components/provenance";
import {
  describeApplicabilityReason,
  describeModuleScope,
  buildControlContext,
} from "@/lib/provenance/cybersecurity-provenance";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { csrfHeaders } from "@/lib/csrf-client";
import AstraBulkButton from "@/components/astra/AstraBulkButton";
import {
  getApplicableRequirements,
  isEligibleForSimplifiedRegime,
  getMaturityLevel,
  categoryConfig,
  statusConfig,
  maturityLevelConfig,
  organizationSizeConfig,
  spaceSegmentConfig,
  dataSensitivityConfig,
  certificationOptions,
  cybersecurityRequirements,
  type CybersecurityProfile,
  type CybersecurityRequirement,
  type OrganizationSize,
  type SpaceSegmentComplexity,
  type DataSensitivityLevel,
  type RequirementStatus,
  type RequirementCategory,
} from "@/data/cybersecurity-requirements";

interface Assessment {
  id: string;
  assessmentName: string | null;
  organizationSize: string;
  employeeCount: number | null;
  annualRevenue: number | null;
  spaceSegmentComplexity: string;
  satelliteCount: number | null;
  hasGroundSegment: boolean;
  groundStationCount: number | null;
  dataSensitivityLevel: string;
  processesPersonalData: boolean;
  handlesGovData: boolean;
  existingCertifications: string | null;
  hasSecurityTeam: boolean;
  securityTeamSize: number | null;
  hasIncidentResponsePlan: boolean;
  hasBCP: boolean;
  criticalSupplierCount: number | null;
  supplierSecurityAssessed: boolean;
  isSimplifiedRegime: boolean;
  maturityScore: number | null;
  frameworkGenerated: boolean;
  requirements: RequirementStatusRecord[];
}

interface RequirementStatusRecord {
  id: string;
  requirementId: string;
  status: string;
  notes: string | null;
  evidenceNotes: string | null;
  targetDate: string | null;
}

interface RequirementWithStatus extends CybersecurityRequirement {
  status: RequirementStatus;
  notes: string | null;
  evidenceNotes: string | null;
  targetDate: string | null;
  statusId: string | null;
  responses: Record<string, unknown> | null;
}

interface Framework {
  organizationProfile: {
    name: string | null;
    organizationSize: string;
    spaceSegmentComplexity: string;
    dataSensitivity: string;
    simplifiedRegime: boolean;
    existingCertifications: string[];
  };
  maturityAssessment: {
    overallScore: number;
    maturityLevel: string;
    maturityDescription: string;
    categoryScores: Record<
      string,
      { score: number; compliant: number; total: number }
    >;
  };
  complianceStatus: {
    totalRequirements: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
    notAssessed: number;
    notApplicable: number;
  };
  gapAnalysis: {
    critical: Array<{
      id: string;
      title: string;
      articleRef: string;
      status: string;
      implementationWeeks: number;
    }>;
    major: Array<{
      id: string;
      title: string;
      articleRef: string;
      status: string;
      implementationWeeks: number;
    }>;
    minor: Array<{
      id: string;
      title: string;
      articleRef: string;
      status: string;
      implementationWeeks: number;
    }>;
  };
  implementationPlan: {
    totalEstimatedWeeks: number;
    phases: Array<{
      name: string;
      category: string;
      requirements: Array<{
        id: string;
        title: string;
        priority: string;
        estimatedWeeks: number;
      }>;
    }>;
  };
  recommendations: string[];
  generatedAt: string;
}

// Wizard steps
const STEPS = [
  {
    id: "profile",
    label: "Security Profile",
    description: "Define your organization",
  },
  {
    id: "checklist",
    label: "Compliance Assessment",
    description: "Assess requirements",
  },
  {
    id: "framework",
    label: "Framework Generator",
    description: "Generate security framework",
  },
];

// Category icons
const categoryIcons: Record<RequirementCategory, React.ReactNode> = {
  governance: <Shield size={18} />,
  risk_assessment: <Search size={18} />,
  infosec: <Lock size={18} />,
  cryptography: <Key size={18} />,
  detection_monitoring: <Eye size={18} />,
  business_continuity: <LifeBuoy size={18} />,
  incident_reporting: <AlertTriangle size={18} />,
  eusrn: <Network size={18} />,
};

function CybersecurityPageContent() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] =
    useState<Assessment | null>(null);
  const [requirements, setRequirements] = useState<RequirementWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<RequirementCategory | null>(null);
  const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());
  const [requirementResponses, setRequirementResponses] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [saveTimers, setSaveTimers] = useState<Record<string, NodeJS.Timeout>>(
    {},
  );

  // Form state for new assessment
  const [form, setForm] = useState<Partial<CybersecurityProfile>>({
    organizationSize: undefined,
    employeeCount: undefined,
    annualRevenue: undefined,
    spaceSegmentComplexity: undefined,
    satelliteCount: undefined,
    hasGroundSegment: true,
    groundStationCount: undefined,
    dataSensitivityLevel: undefined,
    processesPersonalData: false,
    handlesGovData: false,
    existingCertifications: [],
    hasSecurityTeam: false,
    securityTeamSize: undefined,
    hasIncidentResponsePlan: false,
    hasBCP: false,
    criticalSupplierCount: undefined,
    supplierSecurityAssessed: false,
  });
  const [assessmentName, setAssessmentName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Generated framework state
  const [generatedFramework, setGeneratedFramework] =
    useState<Framework | null>(null);
  const [generatingFramework, setGeneratingFramework] = useState(false);

  const fetchRequirements = useCallback(async (assessmentId: string) => {
    try {
      const res = await fetch(
        `/api/cybersecurity/requirements?assessmentId=${assessmentId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setRequirements(data.requirements || []);
        // Initialize local responses from persisted data
        const initial: Record<string, Record<string, unknown>> = {};
        for (const req of data.requirements || []) {
          if (req.responses) {
            initial[req.id] = req.responses;
          }
        }
        setRequirementResponses(initial);
      }
    } catch (error) {
      console.error("Error fetching requirements:", error);
    }
  }, []);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const res = await fetch("/api/cybersecurity");
        if (res.ok) {
          const data = await res.json();
          setAssessments(data.assessments || []);
          if (data.assessments?.length === 1) {
            setSelectedAssessment(data.assessments[0]);
            await fetchRequirements(data.assessments[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching assessments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, [fetchRequirements]);

  const createAssessment = async () => {
    if (
      !form.organizationSize ||
      !form.spaceSegmentComplexity ||
      !form.dataSensitivityLevel
    )
      return;

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/cybersecurity", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          assessmentName: assessmentName || null,
          ...form,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const msg =
          res.status === 401
            ? "Session expired — please log in again."
            : res.status === 403
              ? "Request blocked — please reload the page and try again."
              : errData?.error || `Failed to create assessment (${res.status})`;
        setCreateError(msg);
        return;
      }

      const data = await res.json();
      setAssessments((prev) => [data.assessment, ...prev]);
      setSelectedAssessment(data.assessment);
      setShowNewAssessment(false);
      setActiveStep(1);
      await fetchRequirements(data.assessment.id);
    } catch (error) {
      console.error("Error creating assessment:", error);
      setCreateError(
        "Network error — please check your connection and try again.",
      );
    } finally {
      setCreating(false);
    }
  };

  const updateRequirementStatus = async (
    requirementId: string,
    status: RequirementStatus,
  ) => {
    if (!selectedAssessment) return;

    // Optimistic update
    setRequirements((prev) =>
      prev.map((req) => (req.id === requirementId ? { ...req, status } : req)),
    );

    try {
      const res = await fetch("/api/cybersecurity/requirements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          assessmentId: selectedAssessment.id,
          requirementId,
          status,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedAssessment((prev) =>
          prev ? { ...prev, maturityScore: data.maturityScore } : prev,
        );
      }
    } catch (error) {
      console.error("Error updating requirement:", error);
      fetchRequirements(selectedAssessment.id);
    }
  };

  const saveResponses = useCallback(
    async (requirementId: string, responses: Record<string, unknown>) => {
      if (!selectedAssessment) return;
      try {
        await fetch("/api/cybersecurity/requirements", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            assessmentId: selectedAssessment.id,
            requirementId,
            responses,
          }),
        });
      } catch (error) {
        console.error("Error saving responses:", error);
      }
    },
    [selectedAssessment],
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
    totalFields: number,
  ) => {
    const resp = requirementResponses[requirementId];
    if (!resp) return 0;
    return Object.values(resp).filter(
      (v) => v !== null && v !== undefined && v !== "",
    ).length;
  };

  const exportFrameworkPDF = async (fw: Framework) => {
    const { generateDocumentPDF } = await import("@/lib/pdf/jspdf-generator");
    type Content = import("@/lib/pdf/types").ReportSectionContent;
    type Section = import("@/lib/pdf/types").ReportSection;

    const sections: Section[] = [
      {
        title: "Organization Profile",
        content: [
          {
            type: "keyValue" as const,
            items: [
              {
                key: "Organization Size",
                value: fw.organizationProfile.organizationSize,
              },
              {
                key: "Space Segment Complexity",
                value: fw.organizationProfile.spaceSegmentComplexity,
              },
              {
                key: "Data Sensitivity",
                value: fw.organizationProfile.dataSensitivity,
              },
              {
                key: "Simplified Regime",
                value: fw.organizationProfile.simplifiedRegime ? "Yes" : "No",
              },
              ...(fw.organizationProfile.existingCertifications.length > 0
                ? [
                    {
                      key: "Certifications",
                      value:
                        fw.organizationProfile.existingCertifications.join(
                          ", ",
                        ),
                    },
                  ]
                : []),
            ],
          },
        ],
      },
      {
        title: "Maturity Assessment",
        content: [
          {
            type: "keyValue" as const,
            items: [
              {
                key: "Overall Score",
                value: `${fw.maturityAssessment.overallScore}%`,
              },
              {
                key: "Maturity Level",
                value: fw.maturityAssessment.maturityLevel,
              },
              {
                key: "Description",
                value: fw.maturityAssessment.maturityDescription,
              },
            ],
          },
          {
            type: "heading" as const,
            value: "Scores by Category",
            level: 3 as const,
          },
          {
            type: "table" as const,
            headers: ["Category", "Score", "Compliant", "Total"],
            rows: Object.entries(fw.maturityAssessment.categoryScores).map(
              ([cat, s]) => [
                cat.replace(/_/g, " "),
                `${s.score}%`,
                String(s.compliant),
                String(s.total),
              ],
            ),
          },
        ],
      },
      {
        title: "Compliance Status",
        content: [
          {
            type: "keyValue" as const,
            items: [
              {
                key: "Total Requirements",
                value: String(fw.complianceStatus.totalRequirements),
              },
              {
                key: "Compliant",
                value: String(fw.complianceStatus.compliant),
              },
              { key: "Partial", value: String(fw.complianceStatus.partial) },
              {
                key: "Non-Compliant",
                value: String(fw.complianceStatus.nonCompliant),
              },
              {
                key: "Not Assessed",
                value: String(fw.complianceStatus.notAssessed),
              },
              {
                key: "Not Applicable",
                value: String(fw.complianceStatus.notApplicable),
              },
            ],
          },
        ],
      },
      ...(fw.gapAnalysis.critical.length > 0 || fw.gapAnalysis.major.length > 0
        ? [
            {
              title: "Gap Analysis",
              content: [
                ...(fw.gapAnalysis.critical.length > 0
                  ? [
                      {
                        type: "alert" as const,
                        message: `${fw.gapAnalysis.critical.length} critical gap(s) require immediate attention.`,
                        severity: "error" as const,
                      },
                      {
                        type: "table" as const,
                        headers: [
                          "Requirement",
                          "Article",
                          "Status",
                          "Est. Weeks",
                        ],
                        rows: fw.gapAnalysis.critical.map((g) => [
                          g.title,
                          g.articleRef,
                          g.status,
                          String(g.implementationWeeks),
                        ]),
                      },
                    ]
                  : []),
                ...(fw.gapAnalysis.major.length > 0
                  ? [
                      {
                        type: "alert" as const,
                        message: `${fw.gapAnalysis.major.length} major gap(s) should be addressed soon.`,
                        severity: "warning" as const,
                      },
                      {
                        type: "table" as const,
                        headers: [
                          "Requirement",
                          "Article",
                          "Status",
                          "Est. Weeks",
                        ],
                        rows: fw.gapAnalysis.major.map((g) => [
                          g.title,
                          g.articleRef,
                          g.status,
                          String(g.implementationWeeks),
                        ]),
                      },
                    ]
                  : []),
              ] as Content[],
            },
          ]
        : []),
      {
        title: "Implementation Plan",
        content: [
          {
            type: "text" as const,
            value: `Estimated total implementation time: ${fw.implementationPlan.totalEstimatedWeeks} weeks.`,
          },
          ...fw.implementationPlan.phases.map((phase) => ({
            type: "table" as const,
            headers: [`${phase.name}`, "Priority", "Est. Weeks"],
            rows: phase.requirements.map((r) => [
              r.title,
              r.priority,
              String(r.estimatedWeeks),
            ]),
          })),
        ],
      },
      {
        title: "Recommendations",
        content: [
          { type: "list" as const, items: fw.recommendations, ordered: true },
        ],
      },
    ];

    const blob = generateDocumentPDF(
      "Cybersecurity Framework Report",
      sections,
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cybersecurity-framework-${selectedAssessment?.id || "report"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateFramework = async () => {
    if (!selectedAssessment) return;

    setGeneratingFramework(true);
    try {
      const res = await fetch("/api/cybersecurity/framework/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ assessmentId: selectedAssessment.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedFramework(data.framework);
        setSelectedAssessment((prev) =>
          prev ? { ...prev, frameworkGenerated: true } : prev,
        );
      }
    } catch (error) {
      console.error("Error generating framework:", error);
    } finally {
      setGeneratingFramework(false);
    }
  };

  // Calculate metrics
  const getMetrics = () => {
    const total = requirements.length;
    const compliant = requirements.filter(
      (r) => r.status === "compliant",
    ).length;
    const partial = requirements.filter((r) => r.status === "partial").length;
    const nonCompliant = requirements.filter(
      (r) => r.status === "non_compliant",
    ).length;
    const notAssessed = requirements.filter(
      (r) => r.status === "not_assessed",
    ).length;

    return { total, compliant, partial, nonCompliant, notAssessed };
  };

  const metrics = getMetrics();

  // Preview simplified regime eligibility
  const previewSimplified =
    form.organizationSize && form.spaceSegmentComplexity
      ? isEligibleForSimplifiedRegime({
          organizationSize: form.organizationSize as OrganizationSize,
          spaceSegmentComplexity:
            form.spaceSegmentComplexity as SpaceSegmentComplexity,
          dataSensitivityLevel: (form.dataSensitivityLevel ||
            "internal") as DataSensitivityLevel,
          hasGroundSegment: form.hasGroundSegment ?? true,
          processesPersonalData: form.processesPersonalData ?? false,
          handlesGovData: form.handlesGovData ?? false,
          existingCertifications: form.existingCertifications || [],
          hasSecurityTeam: form.hasSecurityTeam ?? false,
          hasIncidentResponsePlan: form.hasIncidentResponsePlan ?? false,
          hasBCP: form.hasBCP ?? false,
          supplierSecurityAssessed: form.supplierSecurityAssessed ?? false,
          satelliteCount: form.satelliteCount,
        })
      : null;

  // Preview applicable requirements
  const previewRequirements =
    form.organizationSize &&
    form.spaceSegmentComplexity &&
    form.dataSensitivityLevel
      ? getApplicableRequirements({
          organizationSize: form.organizationSize as OrganizationSize,
          spaceSegmentComplexity:
            form.spaceSegmentComplexity as SpaceSegmentComplexity,
          dataSensitivityLevel:
            form.dataSensitivityLevel as DataSensitivityLevel,
          hasGroundSegment: form.hasGroundSegment ?? true,
          processesPersonalData: form.processesPersonalData ?? false,
          handlesGovData: form.handlesGovData ?? false,
          existingCertifications: form.existingCertifications || [],
          hasSecurityTeam: form.hasSecurityTeam ?? false,
          hasIncidentResponsePlan: form.hasIncidentResponsePlan ?? false,
          hasBCP: form.hasBCP ?? false,
          supplierSecurityAssessed: form.supplierSecurityAssessed ?? false,
          satelliteCount: form.satelliteCount,
        })
      : [];

  // Group requirements by category
  const groupedRequirements = requirements.reduce(
    (acc, req) => {
      if (!acc[req.category]) acc[req.category] = [];
      acc[req.category].push(req);
      return acc;
    },
    {} as Record<RequirementCategory, RequirementWithStatus[]>,
  );

  // Get maturity info
  const maturityLevel =
    selectedAssessment?.maturityScore != null
      ? getMaturityLevel(selectedAssessment.maturityScore)
      : "initial";
  const maturityInfo = maturityLevelConfig[maturityLevel];

  // Toggle expanded requirement
  const toggleExpanded = (reqId: string) => {
    setExpandedReqs((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) {
        next.delete(reqId);
      } else {
        next.add(reqId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="" role="status" aria-live="polite">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--surface-sunken)] rounded w-1/3" />
          <div className="h-4 bg-[var(--surface-sunken)] rounded w-1/2" />
          <div className="grid grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-[var(--surface-sunken)] rounded-xl"
              />
            ))}
          </div>
        </div>
        <span className="sr-only">Loading cybersecurity assessment...</span>
      </div>
    );
  }

  // Tiny helper — percentage segments for the new summary bar.
  const metricSegments = metrics.total
    ? [
        {
          label: "Compliant",
          count: metrics.compliant,
          color: "bg-emerald-500",
        },
        {
          label: "Partial",
          count: metrics.partial ?? 0,
          color: "bg-amber-400",
        },
        {
          label: "Non-compliant",
          count: metrics.nonCompliant ?? 0,
          color: "bg-red-500",
        },
      ].filter((s) => s.count > 0)
    : [];

  return (
    <div className="max-w-[1024px] mx-auto px-2">
      {/* ─── Editorial header — Doc-Generator feel ─── */}
      <header className="pt-2 pb-10">
        <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-[var(--text-tertiary)] mb-3">
          Module 04
        </p>
        <h1 className="text-[32px] md:text-[40px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
          Cybersecurity & Resilience
        </h1>
        <p className="mt-2 text-[15px] text-[var(--text-secondary)] max-w-2xl">
          NIS2-aligned cybersecurity assessment · Art. 74&ndash;95
        </p>
      </header>

      {/* ─── Summary card (replaces 4 tiles + stepper + maturity band) ─── */}
      {selectedAssessment && (
        <section className="mb-8 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-raised)] overflow-hidden">
          <div className="px-6 py-5 flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[var(--text-tertiary)] mb-1.5">
                Assessment
              </p>
              <p className="text-[15px] text-[var(--text-primary)] font-medium">
                {selectedAssessment.assessmentName || "Unnamed"}
                <span className="ml-2 text-[var(--text-tertiary)] font-normal">
                  ·{" "}
                  {organizationSizeConfig[
                    selectedAssessment.organizationSize as OrganizationSize
                  ]?.label ?? selectedAssessment.organizationSize}
                  {" · "}
                  {selectedAssessment.isSimplifiedRegime
                    ? "Simplified regime"
                    : "Standard regime"}
                </span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[var(--text-tertiary)] mb-1.5">
                Maturity
              </p>
              <p className="text-[15px] text-[var(--text-primary)] font-medium">
                {selectedAssessment.maturityScore || 0}%
                <span className="ml-2 text-[var(--text-tertiary)] font-normal">
                  · {maturityInfo.label}
                </span>
              </p>
            </div>
          </div>

          {/* Thin progress bar + legend */}
          <div className="px-6 pb-5">
            <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-[var(--surface-sunken)]">
              {metricSegments.map((s) => (
                <div
                  key={s.label}
                  className={s.color}
                  style={{
                    width: `${Math.round((s.count / metrics.total) * 100)}%`,
                  }}
                  aria-label={`${s.label} ${s.count}`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px] text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Compliant{" "}
                <span className="text-[var(--text-tertiary)]">
                  {metrics.compliant}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Partial{" "}
                <span className="text-[var(--text-tertiary)]">
                  {metrics.partial ?? 0}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Non-compliant{" "}
                <span className="text-[var(--text-tertiary)]">
                  {metrics.nonCompliant ?? 0}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)]/50" />
                Not assessed{" "}
                <span className="text-[var(--text-tertiary)]">
                  {metrics.total -
                    metrics.compliant -
                    (metrics.partial ?? 0) -
                    (metrics.nonCompliant ?? 0)}
                </span>
              </span>
            </div>
          </div>

          {/* Minimal step tabs — Doc-Gen subtle, no stepper circles */}
          <div
            role="tablist"
            aria-label="Cybersecurity assessment steps"
            className="border-t border-[var(--border-default)] px-6 flex gap-1 overflow-x-auto"
          >
            {STEPS.map((step, index) => {
              const disabled = index > 0 && !selectedAssessment;
              const active = activeStep === index;
              return (
                <button
                  key={step.id}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`tabpanel-${step.id}`}
                  id={`tab-${step.id}`}
                  onClick={() => !disabled && setActiveStep(index)}
                  disabled={disabled}
                  className={[
                    "relative px-3 py-2.5 text-[13px] font-medium transition-colors -mb-px border-b-2 whitespace-nowrap",
                    active
                      ? "text-[var(--text-primary)] border-emerald-500"
                      : disabled
                        ? "text-[var(--text-tertiary)]/50 border-transparent cursor-not-allowed"
                        : "text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]",
                  ].join(" ")}
                >
                  <span className="text-[var(--text-tertiary)] mr-1.5">
                    {index + 1}
                  </span>
                  {step.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Minimal step tabs when no assessment yet (Profile-only view) */}
      {!selectedAssessment && (
        <div
          role="tablist"
          aria-label="Cybersecurity assessment steps"
          className="mb-8 border-b border-[var(--border-default)] flex gap-1"
        >
          {STEPS.map((step, index) => {
            const disabled = index > 0;
            const active = activeStep === index;
            return (
              <button
                key={step.id}
                role="tab"
                aria-selected={active}
                onClick={() => !disabled && setActiveStep(index)}
                disabled={disabled}
                className={[
                  "px-3 py-2.5 text-[13px] font-medium -mb-px border-b-2 whitespace-nowrap",
                  active
                    ? "text-[var(--text-primary)] border-emerald-500"
                    : "text-[var(--text-tertiary)]/60 border-transparent cursor-not-allowed",
                ].join(" ")}
              >
                <span className="text-[var(--text-tertiary)] mr-1.5">
                  {index + 1}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Security Profile */}
        {activeStep === 0 && (
          <motion.div
            key="profile"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Existing assessments */}
            {assessments.length > 0 && !showNewAssessment && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-caption uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                    Your Security Assessments
                  </p>
                  <button
                    onClick={() => setShowNewAssessment(true)}
                    className="flex items-center gap-2 text-small text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <Plus size={14} />
                    New Assessment
                  </button>
                </div>

                {assessments.map((assessment) => (
                  <button
                    key={assessment.id}
                    onClick={() => {
                      setSelectedAssessment(assessment);
                      fetchRequirements(assessment.id);
                      setActiveStep(1);
                    }}
                    className={`w-full bg-[var(--surface-sunken)] border rounded-xl p-5 text-left hover:bg-[var(--surface-sunken)] transition-all ${
                      selectedAssessment?.id === assessment.id
                        ? "border-[var(--border-default)]"
                        : "border-[var(--border-default)]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Shield
                            size={18}
                            className="text-[var(--text-tertiary)]"
                          />
                          <span className="text-subtitle font-medium text-white">
                            {assessment.assessmentName || "Unnamed Assessment"}
                          </span>
                          {assessment.isSimplifiedRegime && (
                            <span className="text-micro uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-success)]/10 text-[var(--accent-success)]">
                              Simplified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-small text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1.5">
                            {organizationSizeConfig[
                              assessment.organizationSize as OrganizationSize
                            ]?.label || assessment.organizationSize}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {assessment.maturityScore || 0}% maturity
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-[var(--text-tertiary)]"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* New assessment form */}
            {(assessments.length === 0 || showNewAssessment) && (
              <div className="space-y-6">
                <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-6">
                  <h2 className="text-title font-medium text-white mb-4">
                    Security Profile
                  </h2>
                  <p className="text-body text-[var(--text-tertiary)] mb-6">
                    Define your organization&apos;s security profile to
                    determine applicable requirements.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Assessment Name */}
                    <div>
                      <label className="block text-small text-[var(--text-tertiary)] mb-2">
                        Assessment Name (optional)
                      </label>
                      <input
                        type="text"
                        value={assessmentName}
                        onChange={(e) => setAssessmentName(e.target.value)}
                        placeholder="e.g., Main Operations Assessment"
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-white rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      />
                    </div>

                    {/* Organization Size */}
                    <div>
                      <label className="block text-small text-[var(--text-tertiary)] mb-2">
                        Organization Size *
                      </label>
                      <select
                        value={form.organizationSize || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            organizationSize: e.target
                              .value as OrganizationSize,
                          }))
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-white rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      >
                        <option value="">Select size...</option>
                        {Object.entries(organizationSizeConfig).map(
                          ([key, config]) => (
                            <option key={key} value={key}>
                              {config.label} ({config.description})
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {/* Space Segment Complexity */}
                    <div>
                      <label className="block text-small text-[var(--text-tertiary)] mb-2">
                        Space Segment Complexity *
                      </label>
                      <select
                        value={form.spaceSegmentComplexity || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            spaceSegmentComplexity: e.target
                              .value as SpaceSegmentComplexity,
                          }))
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-white rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      >
                        <option value="">Select complexity...</option>
                        {Object.entries(spaceSegmentConfig).map(
                          ([key, config]) => (
                            <option key={key} value={key}>
                              {config.label} - {config.description}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {/* Satellite Count (if applicable) */}
                    {form.spaceSegmentComplexity &&
                      form.spaceSegmentComplexity !== "ground_only" && (
                        <div>
                          <label className="block text-small text-[var(--text-tertiary)] mb-2">
                            Number of Satellites
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={form.satelliteCount || ""}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                satelliteCount: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              }))
                            }
                            placeholder="e.g., 5"
                            className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-white rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                          />
                        </div>
                      )}

                    {/* Data Sensitivity */}
                    <div>
                      <label className="block text-small text-[var(--text-tertiary)] mb-2">
                        Data Sensitivity Level *
                      </label>
                      <select
                        value={form.dataSensitivityLevel || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            dataSensitivityLevel: e.target
                              .value as DataSensitivityLevel,
                          }))
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-white rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      >
                        <option value="">Select sensitivity...</option>
                        {Object.entries(dataSensitivityConfig).map(
                          ([key, config]) => (
                            <option key={key} value={key}>
                              {config.label} - {config.description}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {/* Ground Station Count */}
                    <div>
                      <label className="block text-small text-[var(--text-tertiary)] mb-2">
                        Ground Station Count
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.groundStationCount || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            groundStationCount: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          }))
                        }
                        placeholder="e.g., 2"
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-white rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      />
                    </div>

                    {/* Critical Suppliers */}
                    <div>
                      <label className="block text-small text-[var(--text-tertiary)] mb-2">
                        Critical Supplier Count
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.criticalSupplierCount || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            criticalSupplierCount: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          }))
                        }
                        placeholder="e.g., 5"
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-white rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      />
                    </div>
                  </div>

                  {/* Checkboxes section */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={form.processesPersonalData || false}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              processesPersonalData: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded"
                        />
                        <span className="text-body text-[var(--text-tertiary)]">
                          Processes personal data
                        </span>
                      </label>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={form.handlesGovData || false}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              handlesGovData: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded"
                        />
                        <span className="text-body text-[var(--text-tertiary)]">
                          Handles government data
                        </span>
                      </label>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={form.hasSecurityTeam || false}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              hasSecurityTeam: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded"
                        />
                        <span className="text-body text-[var(--text-tertiary)]">
                          Has dedicated security team
                        </span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={form.hasIncidentResponsePlan || false}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              hasIncidentResponsePlan: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded"
                        />
                        <span className="text-body text-[var(--text-tertiary)]">
                          Has incident response plan
                        </span>
                      </label>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={form.hasBCP || false}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              hasBCP: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded"
                        />
                        <span className="text-body text-[var(--text-tertiary)]">
                          Has business continuity plan
                        </span>
                      </label>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={form.supplierSecurityAssessed || false}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              supplierSecurityAssessed: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded"
                        />
                        <span className="text-body text-[var(--text-tertiary)]">
                          Supplier security assessed
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Existing Certifications */}
                  <div className="mt-6">
                    <label className="block text-small text-[var(--text-tertiary)] mb-3">
                      Existing Certifications
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {certificationOptions.map((cert) => (
                        <button
                          key={cert.id}
                          onClick={() => {
                            const current = form.existingCertifications || [];
                            const next = current.includes(cert.id)
                              ? current.filter((c) => c !== cert.id)
                              : [...current, cert.id];
                            setForm((prev) => ({
                              ...prev,
                              existingCertifications: next,
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-small border transition-all ${
                            (form.existingCertifications || []).includes(
                              cert.id,
                            )
                              ? "bg-[var(--accent-success-soft)] border-[var(--accent-success)/30] text-[var(--accent-primary)]"
                              : "bg-[var(--surface-sunken)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]"
                          }`}
                        >
                          {cert.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simplified Regime Indicator */}
                {previewSimplified !== null && (
                  <div
                    className={`p-4 rounded-lg border ${
                      previewSimplified
                        ? "bg-[var(--accent-success)]/10 border-[var(--accent-success)]/20"
                        : "bg-[var(--accent-primary-soft)] border-[var(--accent-primary)/20]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {previewSimplified ? (
                        <CheckCircle2
                          size={20}
                          className="text-[var(--accent-success)]"
                        />
                      ) : (
                        <Shield
                          size={20}
                          className="text-[var(--accent-primary)]"
                        />
                      )}
                      <div>
                        <p
                          className={`text-body-lg font-medium ${previewSimplified ? "text-[var(--accent-success)]" : "text-[var(--accent-primary)]"}`}
                        >
                          {previewSimplified
                            ? "Eligible for Simplified Regime (Art. 86-88)"
                            : "Standard Compliance Regime"}
                        </p>
                        <p className="text-small text-[var(--text-tertiary)] mt-0.5">
                          {previewSimplified
                            ? "Reduced requirements for micro/small operators with limited space segments"
                            : "Full compliance requirements apply based on your organization profile"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview applicable requirements */}
                {previewRequirements.length > 0 && (
                  <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-6">
                    <h3 className="text-body-lg font-medium text-white mb-4">
                      Applicable Requirements Preview
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(
                        Object.keys(categoryConfig) as RequirementCategory[]
                      ).map((cat) => {
                        const count = previewRequirements.filter(
                          (r) => r.category === cat,
                        ).length;
                        if (count === 0) return null;
                        const config = categoryConfig[cat];
                        return (
                          <div
                            key={cat}
                            className="bg-[var(--surface-sunken)] rounded-lg p-3"
                          >
                            <p className="text-caption text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                              {config.label}
                            </p>
                            <p className="text-heading font-semibold text-white">
                              {count}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-small text-[var(--text-secondary)] mt-4">
                      {previewRequirements.length} total requirements will apply
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  {assessments.length > 0 && (
                    <button
                      onClick={() => setShowNewAssessment(false)}
                      className="px-4 py-2 text-body text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={createAssessment}
                    disabled={
                      creating ||
                      !form.organizationSize ||
                      !form.spaceSegmentComplexity ||
                      !form.dataSensitivityLevel
                    }
                    className="flex items-center gap-2 bg-[var(--surface-raised)] text-black px-5 py-2.5 rounded-lg font-medium text-body hover:bg-[var(--surface-raised)/90] transition-all disabled:opacity-50"
                  >
                    {creating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    Create Assessment
                  </button>
                </div>

                {createError && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 text-[var(--accent-danger)] text-body">
                    <AlertTriangle size={14} className="flex-shrink-0" />
                    {createError}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Compliance Assessment */}
        {activeStep === 1 && (
          <motion.div
            key="checklist"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!selectedAssessment ? (
              <div className="bg-[var(--surface-sunken)] border border-dashed border-[var(--border-default)] rounded-xl p-12 text-center">
                <AlertCircle
                  size={32}
                  className="mx-auto text-[var(--text-tertiary)] mb-3"
                />
                <p className="text-body-lg text-[var(--text-tertiary)] mb-4">
                  No assessment selected. Create a security profile first.
                </p>
                <button
                  onClick={() => setActiveStep(0)}
                  className="text-body text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                >
                  ← Go to Security Profile
                </button>
              </div>
            ) : (
              <>
                {/* Maturity Progress */}
                <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-title font-medium text-white mb-1">
                        Security Maturity
                      </h2>
                      <p className="text-body text-[var(--text-tertiary)]">
                        {maturityInfo.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[28px] font-semibold text-white">
                        {selectedAssessment.maturityScore || 0}%
                      </p>
                      <p
                        className={`text-small font-medium ${
                          maturityInfo.color === "red"
                            ? "text-[var(--accent-danger)]"
                            : maturityInfo.color === "orange"
                              ? "text-orange-400"
                              : maturityInfo.color === "yellow"
                                ? "text-yellow-400"
                                : maturityInfo.color === "blue"
                                  ? "text-[var(--accent-primary)]"
                                  : "text-[var(--accent-success)]"
                        }`}
                      >
                        {maturityInfo.label}
                      </p>
                    </div>
                  </div>
                  <div className="h-2 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${selectedAssessment.maturityScore || 0}%`,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      role="progressbar"
                      aria-valuenow={selectedAssessment.maturityScore || 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Security maturity score"
                      className={`h-full rounded-full ${
                        maturityInfo.color === "red"
                          ? "bg-[var(--accent-danger)]"
                          : maturityInfo.color === "orange"
                            ? "bg-orange-500"
                            : maturityInfo.color === "yellow"
                              ? "bg-yellow-500"
                              : maturityInfo.color === "blue"
                                ? "bg-[var(--accent-success-soft)]0"
                                : "bg-[var(--accent-success)]"
                      }`}
                    />
                  </div>
                </div>

                {/* Category tabs — underline style, Doc-Gen typography */}
                <div className="border-b border-[var(--border-default)] flex gap-1 overflow-x-auto -mx-1 px-1">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={[
                      "relative px-3 py-2.5 text-[13px] font-medium transition-colors -mb-px border-b-2 whitespace-nowrap",
                      activeCategory === null
                        ? "text-[var(--text-primary)] border-emerald-500"
                        : "text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]",
                    ].join(" ")}
                  >
                    All
                    <span className="ml-1.5 text-[11px] opacity-60">
                      {requirements.length}
                    </span>
                  </button>
                  {(Object.keys(categoryConfig) as RequirementCategory[]).map(
                    (cat) => {
                      const count = groupedRequirements[cat]?.length || 0;
                      if (count === 0) return null;
                      const config = categoryConfig[cat];
                      const active = activeCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={[
                            "relative px-3 py-2.5 text-[13px] font-medium transition-colors -mb-px border-b-2 whitespace-nowrap",
                            active
                              ? "text-[var(--text-primary)] border-emerald-500"
                              : "text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]",
                          ].join(" ")}
                        >
                          {config.label}
                          <span className="ml-1.5 text-[11px] opacity-60">
                            {count}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>

                {/* ASTRA Bulk Button for active category */}
                {activeCategory && groupedRequirements[activeCategory] && (
                  <div className="flex justify-end">
                    <AstraBulkButton
                      category={activeCategory}
                      categoryLabel={categoryConfig[activeCategory].label}
                      articles={(groupedRequirements[activeCategory] || []).map(
                        (r) => ({
                          id: r.id,
                          articleRef: r.articleRef,
                          title: r.title,
                          severity: r.severity,
                        }),
                      )}
                      regulationType="CYBERSECURITY"
                    />
                  </div>
                )}

                {/* Provenance: Why-Sidebar — one-line scope summary,
                    expandable to show the dimensions that scoped it.
                    Only rendered behind the provenance feature flag to
                    keep the default dashboard visually unchanged. */}
                {isFeatureEnabled("provenance_v1") &&
                  (() => {
                    const profile: CybersecurityProfile = {
                      organizationSize:
                        selectedAssessment.organizationSize as OrganizationSize,
                      spaceSegmentComplexity:
                        selectedAssessment.spaceSegmentComplexity as SpaceSegmentComplexity,
                      dataSensitivityLevel:
                        selectedAssessment.dataSensitivityLevel as DataSensitivityLevel,
                      hasGroundSegment:
                        selectedAssessment.hasGroundSegment ?? true,
                      processesPersonalData:
                        selectedAssessment.processesPersonalData ?? false,
                      handlesGovData:
                        selectedAssessment.handlesGovData ?? false,
                      existingCertifications: [],
                      hasSecurityTeam:
                        selectedAssessment.hasSecurityTeam ?? false,
                      hasIncidentResponsePlan:
                        selectedAssessment.hasIncidentResponsePlan ?? false,
                      hasBCP: selectedAssessment.hasBCP ?? false,
                      supplierSecurityAssessed:
                        selectedAssessment.supplierSecurityAssessed ?? false,
                      satelliteCount:
                        selectedAssessment.satelliteCount ?? undefined,
                    };
                    const scope = describeModuleScope({
                      profile,
                      isSimplified: selectedAssessment.isSimplifiedRegime,
                      applicableCount: requirements.length,
                      // totalCount = full requirement catalogue size —
                      // shows "15 of 47 apply" so the operator sees how
                      // many were filtered out by their profile scope.
                      totalCount: cybersecurityRequirements.length,
                    });
                    return (
                      <ModuleWhySidebar
                        scope={scope}
                        editHref="/dashboard/settings?tab=profile"
                      />
                    );
                  })()}

                {/* Requirements list */}
                <div className="space-y-3">
                  {(activeCategory
                    ? groupedRequirements[activeCategory] || []
                    : requirements
                  ).map((req) => {
                    const statConfig = statusConfig[req.status];
                    const isExpanded = expandedReqs.has(req.id);
                    const fields = req.assessmentFields || [];
                    const responses = requirementResponses[req.id] || {};
                    const completedFields = getFieldCompletionCount(
                      req.id,
                      fields.length,
                    );
                    const suggested = suggestComplianceStatus(
                      req.complianceRule,
                      responses,
                      { supportPartial: true },
                    );

                    // Provenance: compute why this control is applicable
                    // from the currently-selected assessment profile.
                    // Pure computation, no DB hit.
                    const provenanceEnabled = isFeatureEnabled("provenance_v1");
                    const applicabilityReason = provenanceEnabled
                      ? describeApplicabilityReason(
                          req,
                          {
                            organizationSize:
                              selectedAssessment.organizationSize as OrganizationSize,
                            spaceSegmentComplexity:
                              selectedAssessment.spaceSegmentComplexity as SpaceSegmentComplexity,
                            dataSensitivityLevel:
                              selectedAssessment.dataSensitivityLevel as DataSensitivityLevel,
                            hasGroundSegment:
                              selectedAssessment.hasGroundSegment ?? true,
                            processesPersonalData:
                              selectedAssessment.processesPersonalData ?? false,
                            handlesGovData:
                              selectedAssessment.handlesGovData ?? false,
                            existingCertifications: [],
                            hasSecurityTeam:
                              selectedAssessment.hasSecurityTeam ?? false,
                            hasIncidentResponsePlan:
                              selectedAssessment.hasIncidentResponsePlan ??
                              false,
                            hasBCP: selectedAssessment.hasBCP ?? false,
                            supplierSecurityAssessed:
                              selectedAssessment.supplierSecurityAssessed ??
                              false,
                            satelliteCount:
                              selectedAssessment.satelliteCount ?? undefined,
                          },
                          selectedAssessment.isSimplifiedRegime,
                        )
                      : null;

                    // Status dot color (replaces loud coloured severity pills)
                    const STATUS_DOT: Record<string, string> = {
                      compliant: "bg-emerald-500",
                      partial: "bg-amber-400",
                      non_compliant: "bg-red-500",
                      not_assessed: "bg-[var(--text-tertiary)]/40",
                      not_applicable: "bg-[var(--text-tertiary)]/20",
                    };
                    // Severity as muted text accent — no more filled pills
                    const SEVERITY_TEXT: Record<string, string> = {
                      critical: "text-red-500",
                      major: "text-amber-500",
                      minor: "text-[var(--text-tertiary)]",
                    };

                    return (
                      <article
                        key={req.id}
                        className={[
                          "rounded-2xl border transition-colors overflow-hidden",
                          isExpanded
                            ? "border-[var(--border-default)] bg-[var(--surface-raised)]"
                            : "border-[var(--border-default)] bg-[var(--surface-raised)] hover:border-[var(--text-tertiary)]/30",
                        ].join(" ")}
                      >
                        {/* Main row — editorial header */}
                        <button
                          type="button"
                          onClick={() => toggleExpanded(req.id)}
                          aria-expanded={isExpanded}
                          className="w-full text-left px-6 py-5"
                        >
                          <div className="flex items-start gap-4">
                            {/* Status dot — replaces category-icon block */}
                            <span
                              className={[
                                "mt-2 w-2 h-2 rounded-full flex-shrink-0",
                                STATUS_DOT[req.status] ??
                                  "bg-[var(--text-tertiary)]/40",
                              ].join(" ")}
                              aria-hidden
                            />

                            <div className="flex-1 min-w-0">
                              {/* Article ref · title · severity + chip */}
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="text-[11px] tracking-wide text-[var(--text-tertiary)]">
                                      {req.articleRef}
                                    </span>
                                    <span
                                      className={[
                                        "text-[10px] uppercase tracking-[0.14em]",
                                        SEVERITY_TEXT[req.severity] ??
                                          "text-[var(--text-tertiary)]",
                                      ].join(" ")}
                                    >
                                      {req.severity}
                                    </span>
                                    {applicabilityReason && (
                                      <ProvenanceChip
                                        origin={applicabilityReason.origin}
                                        density="icon"
                                      />
                                    )}
                                    {selectedAssessment.isSimplifiedRegime &&
                                      req.simplifiedAlternative && (
                                        <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-500">
                                          Simplified
                                        </span>
                                      )}
                                  </div>

                                  <h3 className="mt-1 text-[17px] font-medium tracking-tight text-[var(--text-primary)] leading-snug">
                                    {req.title}
                                  </h3>

                                  {/* Causal breadcrumb — ⟵ weil … */}
                                  {applicabilityReason && (
                                    <div className="mt-1.5">
                                      <CausalBreadcrumb
                                        origin={applicabilityReason.origin}
                                        reason={applicabilityReason.summary}
                                      />
                                    </div>
                                  )}

                                  {/* Field completion counter */}
                                  {!isExpanded && fields.length > 0 && (
                                    <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
                                      {completedFields}/{fields.length} fields
                                      completed
                                    </p>
                                  )}
                                </div>

                                {/* Status picker — native select kept, but
                                    subtler visual. Click stopPropagation
                                    so the row doesn't expand on pick. */}
                                <div
                                  className="flex-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <select
                                    value={req.status}
                                    onChange={(e) =>
                                      updateRequirementStatus(
                                        req.id,
                                        e.target.value as RequirementStatus,
                                      )
                                    }
                                    aria-label={`Compliance status for ${req.title}`}
                                    className={[
                                      "text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-transparent cursor-pointer focus:outline-none focus:border-emerald-500",
                                      statConfig.color === "green"
                                        ? "text-emerald-500"
                                        : statConfig.color === "yellow"
                                          ? "text-amber-500"
                                          : statConfig.color === "red"
                                            ? "text-red-500"
                                            : "text-[var(--text-tertiary)]",
                                    ].join(" ")}
                                  >
                                    <option value="not_assessed">
                                      Not Assessed
                                    </option>
                                    <option value="compliant">Compliant</option>
                                    <option value="partial">Partial</option>
                                    <option value="non_compliant">
                                      Non-Compliant
                                    </option>
                                    <option value="not_applicable">N/A</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Expand chevron — minimalist */}
                            <span
                              className="mt-1 text-[var(--text-tertiary)] flex-shrink-0"
                              aria-hidden
                            >
                              {isExpanded ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </span>
                          </div>
                        </button>

                        {/* Expanded content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-[var(--border-default)]"
                            >
                              <div
                                className="p-5 pt-4 space-y-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Provenance context window — three-beat
                                    animated explainer that answers
                                    wieso / weshalb / warum. First thing
                                    the operator sees on expand. Only when
                                    the provenance flag is on. */}
                                {provenanceEnabled &&
                                  (() => {
                                    const ctx = buildControlContext({
                                      req,
                                      reason: applicabilityReason,
                                    });
                                    return (
                                      <ControlContextWindow
                                        context={ctx}
                                        hideTopRule
                                      />
                                    );
                                  })()}

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
                                          req.id,
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
                                    <Sparkles
                                      size={14}
                                      className="text-[var(--accent-primary)]"
                                    />
                                    <span className="text-small text-[var(--accent-primary)]/80">
                                      ASTRA suggests:{" "}
                                      <span className="font-medium capitalize">
                                        {statusConfig[
                                          suggested as RequirementStatus
                                        ]?.label || suggested}
                                      </span>
                                    </span>
                                    {/* Trust chip — makes it explicit
                                        that this is an AI inference, not
                                        a regulatory fact. */}
                                    {provenanceEnabled && (
                                      <ProvenanceChip
                                        origin="ai-inferred"
                                        density="compact"
                                        confidence={0.8}
                                      />
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateRequirementStatus(
                                          req.id,
                                          suggested as RequirementStatus,
                                        )
                                      }
                                      className="ml-auto text-caption bg-[var(--accent-info-soft)]0/10 text-[var(--accent-primary)] px-3 py-1 rounded-lg hover:bg-[var(--accent-info-soft)]0/20 transition-colors"
                                    >
                                      Accept
                                    </button>
                                  </div>
                                )}

                                {/* Tips */}
                                {req.tips.length > 0 && (
                                  <div className="p-3 bg-[var(--surface-sunken)] rounded-lg">
                                    <p className="text-micro uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                                      Tips
                                    </p>
                                    <ul className="space-y-1">
                                      {req.tips.map((tip, i) => (
                                        <li
                                          key={i}
                                          className="text-small text-[var(--text-tertiary)] flex items-start gap-2"
                                        >
                                          <span className="text-[var(--text-tertiary)]">
                                            •
                                          </span>
                                          {tip}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Evidence Required */}
                                {req.evidenceRequired.length > 0 && (
                                  <div className="p-3 bg-[var(--surface-sunken)] rounded-lg">
                                    <p className="text-micro uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                                      Evidence Required
                                    </p>
                                    <ul className="space-y-1">
                                      {req.evidenceRequired.map((ev, i) => (
                                        <li
                                          key={i}
                                          className="text-small text-[var(--text-tertiary)] flex items-start gap-2"
                                        >
                                          <CheckCircle2
                                            size={10}
                                            className="mt-0.5 text-[var(--text-tertiary)]"
                                          />
                                          {ev}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Compliance Evidence */}
                                <EvidencePanel
                                  regulationType="CYBERSECURITY"
                                  requirementId={req.id}
                                />

                                {/* ASTRA AI Agent */}
                                <AstraButton
                                  articleId={req.id}
                                  articleRef={req.articleRef}
                                  title={req.title}
                                  severity={req.severity}
                                  regulationType="CYBERSECURITY"
                                />

                                {/* Regulation Sources & References */}
                                <div className="space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                    <span className="text-micro px-2 py-1 rounded bg-[var(--accent-info-soft)]0/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                                      EU Space Act
                                    </span>
                                    {req.nis2Reference && (
                                      <span className="text-micro px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                        NIS2 · {req.nis2Reference}
                                      </span>
                                    )}
                                    {req.enisaGuidance &&
                                      req.enisaGuidance.length > 0 && (
                                        <span className="text-micro px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                          ENISA · {req.enisaGuidance.length}{" "}
                                          {req.enisaGuidance.length === 1
                                            ? "control"
                                            : "controls"}
                                        </span>
                                      )}
                                    {req.isoReference && (
                                      <span className="text-micro px-2 py-1 rounded bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)/20]">
                                        ISO · {req.isoReference}
                                      </span>
                                    )}
                                    {req.implementationTimeWeeks && (
                                      <span className="text-micro px-2 py-1 rounded bg-[var(--surface-sunken)] text-[var(--text-tertiary)]">
                                        ~{req.implementationTimeWeeks} weeks to
                                        implement
                                      </span>
                                    )}
                                  </div>

                                  {/* ENISA Guidance Details */}
                                  {req.enisaGuidance &&
                                    req.enisaGuidance.length > 0 && (
                                      <div className="p-3 bg-cyan-500/[0.03] rounded-lg border border-cyan-500/10">
                                        <p className="text-micro uppercase tracking-wider text-cyan-400/70 mb-2">
                                          ENISA Space Cybersecurity Controls
                                        </p>
                                        <div className="space-y-2">
                                          {req.enisaGuidance.map((g) => (
                                            <div
                                              key={g.controlId}
                                              className="flex items-start gap-2"
                                            >
                                              <span className="font-mono text-micro text-cyan-400/60 mt-0.5 shrink-0">
                                                {g.controlId}
                                              </span>
                                              <div className="min-w-0">
                                                <span className="text-small text-[var(--text-secondary)]">
                                                  {g.controlName}
                                                </span>
                                                <span className="text-micro text-[var(--text-tertiary)] ml-2">
                                                  [{g.segment}]
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 3: Framework Generator */}
        {activeStep === 2 && (
          <motion.div
            key="framework"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!selectedAssessment ? (
              <div className="bg-[var(--surface-sunken)] border border-dashed border-[var(--border-default)] rounded-xl p-12 text-center">
                <AlertCircle
                  size={32}
                  className="mx-auto text-[var(--text-tertiary)] mb-3"
                />
                <p className="text-body-lg text-[var(--text-tertiary)] mb-4">
                  No assessment selected. Create a security profile first.
                </p>
                <button
                  onClick={() => setActiveStep(0)}
                  className="text-body text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                >
                  ← Go to Security Profile
                </button>
              </div>
            ) : !generatedFramework ? (
              <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-8 text-center">
                <FileText
                  size={48}
                  className="mx-auto text-[var(--text-tertiary)] mb-4"
                />
                <h2 className="text-heading font-medium text-white mb-2">
                  Generate Cybersecurity Framework
                </h2>
                <p className="text-body text-[var(--text-tertiary)] mb-6 max-w-md mx-auto">
                  Based on your security profile and compliance assessment,
                  generate a comprehensive cybersecurity framework document with
                  gap analysis and recommendations.
                </p>

                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={generateFramework}
                    disabled={generatingFramework}
                    className="flex items-center gap-2 bg-[var(--surface-raised)] text-black px-6 py-3 rounded-lg font-medium text-body-lg hover:bg-[var(--surface-raised)/90] transition-all disabled:opacity-50"
                  >
                    {generatingFramework ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Shield size={16} />
                    )}
                    Generate Framework
                  </button>

                  <p className="text-caption text-[var(--text-tertiary)]">
                    Maturity Score: {selectedAssessment.maturityScore || 0}% •{" "}
                    {requirements.length} requirements assessed
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Generated Framework Display */}
                <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-heading font-medium text-white mb-1">
                        Cybersecurity Framework
                      </h2>
                      <p className="text-small text-[var(--text-secondary)]">
                        Generated{" "}
                        {new Date(
                          generatedFramework.generatedAt,
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => exportFrameworkPDF(generatedFramework)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-small font-medium bg-[var(--surface-raised)] text-black hover:bg-[var(--surface-raised)/90] transition-colors"
                      >
                        <Download size={14} />
                        Export PDF
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob(
                            [JSON.stringify(generatedFramework, null, 2)],
                            { type: "application/json" },
                          );
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `cybersecurity-framework-${selectedAssessment.id}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-2 text-small text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        <Download size={14} />
                        JSON
                      </button>
                    </div>
                  </div>

                  {/* Maturity Overview */}
                  <div className="mb-6 p-4 bg-[var(--surface-sunken)] rounded-lg">
                    <h3 className="text-body font-medium text-white mb-4">
                      Maturity Assessment
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-display font-semibold text-white">
                          {generatedFramework.maturityAssessment.overallScore}%
                        </p>
                        <p className="text-caption text-[var(--text-secondary)]">
                          Overall Score
                        </p>
                      </div>
                      <div>
                        <p className="text-title font-medium text-white">
                          {generatedFramework.maturityAssessment.maturityLevel}
                        </p>
                        <p className="text-caption text-[var(--text-secondary)]">
                          Maturity Level
                        </p>
                      </div>
                      <div>
                        <p className="text-title font-semibold text-[var(--accent-success)]">
                          {generatedFramework.complianceStatus.compliant}
                        </p>
                        <p className="text-caption text-[var(--text-secondary)]">
                          Compliant
                        </p>
                      </div>
                      <div>
                        <p className="text-title font-semibold text-[var(--accent-danger)]">
                          {generatedFramework.complianceStatus.nonCompliant +
                            generatedFramework.complianceStatus.notAssessed}
                        </p>
                        <p className="text-caption text-[var(--text-secondary)]">
                          Gaps
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category Scores */}
                  <div className="mb-6 p-4 bg-[var(--surface-sunken)] rounded-lg">
                    <h3 className="text-body font-medium text-white mb-4">
                      Scores by Category
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(
                        generatedFramework.maturityAssessment.categoryScores,
                      ).map(([cat, scores]) => {
                        const config =
                          categoryConfig[cat as RequirementCategory];
                        return (
                          <div
                            key={cat}
                            className="p-3 bg-[var(--surface-sunken)] rounded-lg"
                          >
                            <p className="text-micro text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                              {config?.label || cat}
                            </p>
                            <p className="text-heading-lg font-semibold text-white">
                              {scores.score}%
                            </p>
                            <p className="text-micro text-[var(--text-tertiary)]">
                              {scores.compliant}/{scores.total} compliant
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gap Analysis */}
                  {(generatedFramework.gapAnalysis.critical.length > 0 ||
                    generatedFramework.gapAnalysis.major.length > 0) && (
                    <div className="mb-6 p-4 bg-[var(--surface-sunken)] rounded-lg">
                      <h3 className="text-body font-medium text-white mb-4">
                        Gap Analysis
                      </h3>

                      {generatedFramework.gapAnalysis.critical.length > 0 && (
                        <div className="mb-4">
                          <p className="text-caption uppercase tracking-wider text-[var(--accent-danger)]/60 mb-2">
                            Critical Gaps (
                            {generatedFramework.gapAnalysis.critical.length})
                          </p>
                          <div className="space-y-2">
                            {generatedFramework.gapAnalysis.critical.map(
                              (gap) => (
                                <div
                                  key={gap.id}
                                  className="flex items-center justify-between p-2 bg-[var(--accent-danger)]/5 rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <XCircle
                                      size={14}
                                      className="text-[var(--accent-danger)]"
                                    />
                                    <span className="text-small text-[var(--text-tertiary)]">
                                      {gap.title}
                                    </span>
                                    <span className="font-mono text-micro text-[var(--text-secondary)]">
                                      {gap.articleRef}
                                    </span>
                                  </div>
                                  <span className="text-micro text-[var(--text-secondary)]">
                                    ~{gap.implementationWeeks}w
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      {generatedFramework.gapAnalysis.major.length > 0 && (
                        <div>
                          <p className="text-caption uppercase tracking-wider text-orange-400/60 mb-2">
                            Major Gaps (
                            {generatedFramework.gapAnalysis.major.length})
                          </p>
                          <div className="space-y-2">
                            {generatedFramework.gapAnalysis.major
                              .slice(0, 5)
                              .map((gap) => (
                                <div
                                  key={gap.id}
                                  className="flex items-center justify-between p-2 bg-orange-500/5 rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <AlertCircle
                                      size={14}
                                      className="text-orange-400"
                                    />
                                    <span className="text-small text-[var(--text-tertiary)]">
                                      {gap.title}
                                    </span>
                                    <span className="font-mono text-micro text-[var(--text-secondary)]">
                                      {gap.articleRef}
                                    </span>
                                  </div>
                                  <span className="text-micro text-[var(--text-secondary)]">
                                    ~{gap.implementationWeeks}w
                                  </span>
                                </div>
                              ))}
                            {generatedFramework.gapAnalysis.major.length >
                              5 && (
                              <p className="text-caption text-[var(--text-tertiary)] text-center">
                                +
                                {generatedFramework.gapAnalysis.major.length -
                                  5}{" "}
                                more gaps
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Implementation Timeline */}
                  <div className="mb-6 p-4 bg-[var(--surface-sunken)] rounded-lg">
                    <h3 className="text-body font-medium text-white mb-4">
                      Implementation Timeline
                      <span className="ml-2 text-caption text-[var(--text-secondary)] font-normal">
                        (~
                        {
                          generatedFramework.implementationPlan
                            .totalEstimatedWeeks
                        }{" "}
                        weeks total)
                      </span>
                    </h3>
                    <div className="space-y-3">
                      {generatedFramework.implementationPlan.phases.map(
                        (phase, i) => (
                          <div
                            key={i}
                            className="p-3 bg-[var(--surface-sunken)] rounded-lg"
                          >
                            <p className="text-small font-medium text-white mb-2">
                              {phase.name}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {phase.requirements.map((req) => (
                                <span
                                  key={req.id}
                                  className={`text-micro px-2 py-1 rounded ${
                                    req.priority === "critical"
                                      ? "bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]"
                                      : req.priority === "major"
                                        ? "bg-orange-500/10 text-orange-400"
                                        : "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]"
                                  }`}
                                >
                                  {req.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 bg-[var(--surface-sunken)] rounded-lg">
                    <h3 className="text-body font-medium text-white mb-4">
                      Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {generatedFramework.recommendations.map((rec, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-small text-[var(--text-secondary)]"
                        >
                          <Info
                            size={14}
                            className="text-[var(--accent-primary)] mt-0.5 flex-shrink-0"
                          />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Regenerate button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setGeneratedFramework(null)}
                    className="text-small text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    Regenerate Framework
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CybersecurityPage() {
  return (
    <FeatureGate module="cybersecurity">
      <CybersecurityPageContent />
    </FeatureGate>
  );
}
