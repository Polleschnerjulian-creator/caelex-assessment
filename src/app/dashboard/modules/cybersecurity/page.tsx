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
} from "lucide-react";
import EvidencePanel from "@/components/audit/EvidencePanel";
import AstraButton from "@/components/astra/AstraButton";
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
        setRequirements(data.requirements);
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
          setAssessments(data.assessments);
          if (data.assessments.length === 1) {
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
    try {
      const res = await fetch("/api/cybersecurity", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          assessmentName: assessmentName || null,
          ...form,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAssessments((prev) => [data.assessment, ...prev]);
        setSelectedAssessment(data.assessment);
        setShowNewAssessment(false);
        setActiveStep(1);
        await fetchRequirements(data.assessment.id);
      }
    } catch (error) {
      console.error("Error creating assessment:", error);
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
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 dark:bg-white/[0.05] rounded w-1/3" />
          <div className="h-4 bg-slate-200 dark:bg-white/[0.05] rounded w-1/2" />
          <div className="grid grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-slate-100 dark:bg-white/[0.04] rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-white/60 mb-3">
          MODULE 04
        </p>
        <h1 className="text-[24px] font-medium text-slate-900 dark:text-white mb-1">
          Cybersecurity & Resilience
        </h1>
        <p className="text-[14px] text-slate-600 dark:text-white/70">
          NIS2-aligned cybersecurity assessment (Art. 74-95)
        </p>
      </div>

      {/* Maturity Metrics (when assessment selected) */}
      {selectedAssessment && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-5">
            <p className="text-[32px] font-mono font-semibold text-slate-900 dark:text-white">
              {selectedAssessment.maturityScore || 0}%
            </p>
            <p className="font-mono text-[11px] text-slate-500 dark:text-white/60 mt-1">
              maturity score
            </p>
          </div>
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-5">
            <p
              className={`text-[18px] font-medium ${
                maturityInfo.color === "red"
                  ? "text-red-600 dark:text-red-400"
                  : maturityInfo.color === "orange"
                    ? "text-orange-600 dark:text-orange-400"
                    : maturityInfo.color === "yellow"
                      ? "text-yellow-600 dark:text-yellow-400"
                      : maturityInfo.color === "blue"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-green-600 dark:text-green-400"
              }`}
            >
              {maturityInfo.label.split(" ")[0]}
            </p>
            <p className="font-mono text-[11px] text-slate-500 dark:text-white/60 mt-1">
              maturity level
            </p>
          </div>
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-5">
            <p className="text-[32px] font-mono font-semibold text-green-600 dark:text-green-400">
              {metrics.compliant}/{metrics.total}
            </p>
            <p className="font-mono text-[11px] text-slate-500 dark:text-white/60 mt-1">
              requirements compliant
            </p>
          </div>
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2">
              {selectedAssessment.isSimplifiedRegime ? (
                <CheckCircle2
                  size={20}
                  className="text-green-600 dark:text-green-400"
                />
              ) : (
                <Shield
                  size={20}
                  className="text-emerald-600 dark:text-emerald-400"
                />
              )}
              <p className="text-[14px] font-medium text-slate-900 dark:text-white">
                {selectedAssessment.isSimplifiedRegime
                  ? "Simplified"
                  : "Standard"}
              </p>
            </div>
            <p className="font-mono text-[11px] text-slate-500 dark:text-white/60 mt-1">
              compliance regime
            </p>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setActiveStep(index)}
                disabled={index > 0 && !selectedAssessment}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeStep === index
                    ? "bg-white/[0.05] border border-white/[0.1]"
                    : index > 0 && !selectedAssessment
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono ${
                    activeStep === index
                      ? "bg-white text-black"
                      : activeStep > index
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/[0.05] text-white/70"
                  }`}
                >
                  {activeStep > index ? <CheckCircle2 size={12} /> : index + 1}
                </div>
                <div className="text-left hidden lg:block">
                  <p
                    className={`text-[13px] font-medium ${activeStep === index ? "text-white" : "text-white/60"}`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] text-white/60">
                    {step.description}
                  </p>
                </div>
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRight size={16} className="text-white/10 mx-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Security Profile */}
        {activeStep === 0 && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Existing assessments */}
            {assessments.length > 0 && !showNewAssessment && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/30">
                    Your Security Assessments
                  </p>
                  <button
                    onClick={() => setShowNewAssessment(true)}
                    className="flex items-center gap-2 text-[12px] text-white/60 hover:text-white/60 transition-colors"
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
                    className={`w-full bg-white/[0.04] border rounded-xl p-5 text-left hover:bg-white/[0.05] transition-all ${
                      selectedAssessment?.id === assessment.id
                        ? "border-white/[0.15]"
                        : "border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Shield size={18} className="text-white/60" />
                          <span className="text-[15px] font-medium text-white">
                            {assessment.assessmentName || "Unnamed Assessment"}
                          </span>
                          {assessment.isSimplifiedRegime && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                              Simplified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[12px] text-white/70">
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
                      <ChevronRight size={18} className="text-white/60" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* New assessment form */}
            {(assessments.length === 0 || showNewAssessment) && (
              <div className="space-y-6">
                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
                  <h2 className="text-[16px] font-medium text-white mb-4">
                    Security Profile
                  </h2>
                  <p className="text-[13px] text-white/60 mb-6">
                    Define your organization&apos;s security profile to
                    determine applicable requirements.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Assessment Name */}
                    <div>
                      <label className="block text-[12px] text-white/60 mb-2">
                        Assessment Name (optional)
                      </label>
                      <input
                        type="text"
                        value={assessmentName}
                        onChange={(e) => setAssessmentName(e.target.value)}
                        placeholder="e.g., Main Operations Assessment"
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
                      />
                    </div>

                    {/* Organization Size */}
                    <div>
                      <label className="block text-[12px] text-white/60 mb-2">
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
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
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
                      <label className="block text-[12px] text-white/60 mb-2">
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
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
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
                          <label className="block text-[12px] text-white/60 mb-2">
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
                            className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
                          />
                        </div>
                      )}

                    {/* Data Sensitivity */}
                    <div>
                      <label className="block text-[12px] text-white/60 mb-2">
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
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
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
                      <label className="block text-[12px] text-white/60 mb-2">
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
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
                      />
                    </div>

                    {/* Critical Suppliers */}
                    <div>
                      <label className="block text-[12px] text-white/60 mb-2">
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
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
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
                          className="w-4 h-4 bg-white/[0.05] border border-white/[0.08] rounded"
                        />
                        <span className="text-[13px] text-white/60">
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
                          className="w-4 h-4 bg-white/[0.05] border border-white/[0.08] rounded"
                        />
                        <span className="text-[13px] text-white/60">
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
                          className="w-4 h-4 bg-white/[0.05] border border-white/[0.08] rounded"
                        />
                        <span className="text-[13px] text-white/60">
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
                          className="w-4 h-4 bg-white/[0.05] border border-white/[0.08] rounded"
                        />
                        <span className="text-[13px] text-white/60">
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
                          className="w-4 h-4 bg-white/[0.05] border border-white/[0.08] rounded"
                        />
                        <span className="text-[13px] text-white/60">
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
                          className="w-4 h-4 bg-white/[0.05] border border-white/[0.08] rounded"
                        />
                        <span className="text-[13px] text-white/60">
                          Supplier security assessed
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Existing Certifications */}
                  <div className="mt-6">
                    <label className="block text-[12px] text-white/60 mb-3">
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
                          className={`px-3 py-1.5 rounded-lg text-[12px] border transition-all ${
                            (form.existingCertifications || []).includes(
                              cert.id,
                            )
                              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                              : "bg-white/[0.04] border-white/10 text-white/60 hover:border-white/[0.1]"
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
                        ? "bg-green-500/10 border-green-500/20"
                        : "bg-emerald-500/10 border-emerald-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {previewSimplified ? (
                        <CheckCircle2 size={20} className="text-green-400" />
                      ) : (
                        <Shield size={20} className="text-emerald-400" />
                      )}
                      <div>
                        <p
                          className={`text-[14px] font-medium ${previewSimplified ? "text-green-400" : "text-emerald-400"}`}
                        >
                          {previewSimplified
                            ? "Eligible for Simplified Regime (Art. 86-88)"
                            : "Standard Compliance Regime"}
                        </p>
                        <p className="text-[12px] text-white/60 mt-0.5">
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
                  <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
                    <h3 className="text-[14px] font-medium text-white mb-4">
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
                            className="bg-white/[0.04] rounded-lg p-3"
                          >
                            <p className="text-[11px] text-white/70 uppercase tracking-wider mb-1">
                              {config.label}
                            </p>
                            <p className="text-[18px] font-mono font-semibold text-white">
                              {count}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[12px] text-white/70 mt-4">
                      {previewRequirements.length} total requirements will apply
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  {assessments.length > 0 && (
                    <button
                      onClick={() => setShowNewAssessment(false)}
                      className="px-4 py-2 text-[13px] text-white/60 hover:text-white/60 transition-colors"
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
                    className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg font-medium text-[13px] hover:bg-white/90 transition-all disabled:opacity-50"
                  >
                    {creating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    Create Assessment
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Compliance Assessment */}
        {activeStep === 1 && (
          <motion.div
            key="checklist"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!selectedAssessment ? (
              <div className="bg-white/[0.04] border border-dashed border-white/[0.08] rounded-xl p-12 text-center">
                <AlertCircle size={32} className="mx-auto text-white/60 mb-3" />
                <p className="text-[14px] text-white/60 mb-4">
                  No assessment selected. Create a security profile first.
                </p>
                <button
                  onClick={() => setActiveStep(0)}
                  className="text-[13px] text-emerald-400 hover:text-emerald-300"
                >
                  ← Go to Security Profile
                </button>
              </div>
            ) : (
              <>
                {/* Maturity Progress */}
                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-[16px] font-medium text-white mb-1">
                        Security Maturity
                      </h2>
                      <p className="text-[13px] text-white/60">
                        {maturityInfo.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[28px] font-mono font-semibold text-white">
                        {selectedAssessment.maturityScore || 0}%
                      </p>
                      <p
                        className={`text-[12px] font-medium ${
                          maturityInfo.color === "red"
                            ? "text-red-400"
                            : maturityInfo.color === "orange"
                              ? "text-orange-400"
                              : maturityInfo.color === "yellow"
                                ? "text-yellow-400"
                                : maturityInfo.color === "blue"
                                  ? "text-emerald-400"
                                  : "text-green-400"
                        }`}
                      >
                        {maturityInfo.label}
                      </p>
                    </div>
                  </div>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${selectedAssessment.maturityScore || 0}%`,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        maturityInfo.color === "red"
                          ? "bg-red-500"
                          : maturityInfo.color === "orange"
                            ? "bg-orange-500"
                            : maturityInfo.color === "yellow"
                              ? "bg-yellow-500"
                              : maturityInfo.color === "blue"
                                ? "bg-emerald-500"
                                : "bg-green-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`px-3 py-2 rounded-lg text-[12px] transition-all ${
                      activeCategory === null
                        ? "bg-white/[0.08] text-white"
                        : "bg-white/[0.04] text-white/60 hover:bg-white/[0.04]"
                    }`}
                  >
                    All ({requirements.length})
                  </button>
                  {(Object.keys(categoryConfig) as RequirementCategory[]).map(
                    (cat) => {
                      const count = groupedRequirements[cat]?.length || 0;
                      if (count === 0) return null;
                      const config = categoryConfig[cat];
                      return (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-all ${
                            activeCategory === cat
                              ? "bg-white/[0.08] text-white"
                              : "bg-white/[0.04] text-white/60 hover:bg-white/[0.04]"
                          }`}
                        >
                          {categoryIcons[cat]}
                          {config.label} ({count})
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

                {/* Requirements list */}
                <div className="space-y-3">
                  {(activeCategory
                    ? groupedRequirements[activeCategory] || []
                    : requirements
                  ).map((req) => {
                    const statConfig = statusConfig[req.status];
                    const isExpanded = expandedReqs.has(req.id);

                    return (
                      <div
                        key={req.id}
                        className="bg-white/[0.015] border border-white/10 rounded-xl overflow-hidden hover:border-white/[0.08] transition-all"
                      >
                        {/* Main row */}
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            <div
                              className={`p-2.5 rounded-lg ${
                                req.severity === "critical"
                                  ? "bg-red-500/10"
                                  : req.severity === "major"
                                    ? "bg-orange-500/10"
                                    : "bg-emerald-500/10"
                              }`}
                            >
                              {categoryIcons[req.category]}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-[11px] text-white/70">
                                      {req.articleRef}
                                    </span>
                                    <h3 className="text-[14px] font-medium text-white">
                                      {req.title}
                                    </h3>
                                    <span
                                      className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                        req.severity === "critical"
                                          ? "bg-red-500/10 text-red-400"
                                          : req.severity === "major"
                                            ? "bg-orange-500/10 text-orange-400"
                                            : "bg-emerald-500/10 text-emerald-400"
                                      }`}
                                    >
                                      {req.severity}
                                    </span>
                                    {selectedAssessment.isSimplifiedRegime &&
                                      req.simplifiedAlternative && (
                                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                                          Simplified
                                        </span>
                                      )}
                                  </div>
                                </div>

                                {/* Status selector */}
                                <select
                                  value={req.status}
                                  onChange={(e) =>
                                    updateRequirementStatus(
                                      req.id,
                                      e.target.value as RequirementStatus,
                                    )
                                  }
                                  className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] focus:outline-none ${statConfig.color === "green" ? "text-green-400" : statConfig.color === "yellow" ? "text-yellow-400" : statConfig.color === "red" ? "text-red-400" : "text-white/60"}`}
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

                              {/* Question */}
                              <p className="text-[13px] text-white/70 mb-2">
                                {req.complianceQuestion}
                              </p>

                              {/* Simplified alternative notice */}
                              {selectedAssessment.isSimplifiedRegime &&
                                req.simplifiedAlternative && (
                                  <p className="text-[12px] text-green-400/60 italic mb-2">
                                    Simplified: {req.simplifiedAlternative}
                                  </p>
                                )}

                              {/* Expand/collapse button */}
                              <button
                                onClick={() => toggleExpanded(req.id)}
                                className="flex items-center gap-1 text-[11px] text-white/70 hover:text-white/70 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp size={14} />
                                ) : (
                                  <ChevronDown size={14} />
                                )}
                                {isExpanded ? "Hide details" : "Show details"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-white/10"
                            >
                              <div className="p-5 pt-4 space-y-4">
                                {/* Tips */}
                                {req.tips.length > 0 && (
                                  <div className="p-3 bg-white/[0.04] rounded-lg">
                                    <p className="text-[10px] uppercase tracking-wider text-white/60 mb-2">
                                      Tips
                                    </p>
                                    <ul className="space-y-1">
                                      {req.tips.map((tip, i) => (
                                        <li
                                          key={i}
                                          className="text-[12px] text-white/60 flex items-start gap-2"
                                        >
                                          <span className="text-white/60">
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
                                  <div className="p-3 bg-white/[0.04] rounded-lg">
                                    <p className="text-[10px] uppercase tracking-wider text-white/60 mb-2">
                                      Evidence Required
                                    </p>
                                    <ul className="space-y-1">
                                      {req.evidenceRequired.map((ev, i) => (
                                        <li
                                          key={i}
                                          className="text-[12px] text-white/60 flex items-start gap-2"
                                        >
                                          <CheckCircle2
                                            size={10}
                                            className="mt-0.5 text-white/60"
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

                                {/* References */}
                                <div className="flex flex-wrap gap-2">
                                  {req.nis2Reference && (
                                    <span className="text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-400">
                                      {req.nis2Reference}
                                    </span>
                                  )}
                                  {req.isoReference && (
                                    <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400">
                                      {req.isoReference}
                                    </span>
                                  )}
                                  {req.implementationTimeWeeks && (
                                    <span className="text-[10px] px-2 py-1 rounded bg-white/[0.05] text-white/60">
                                      ~{req.implementationTimeWeeks} weeks to
                                      implement
                                    </span>
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
              </>
            )}
          </motion.div>
        )}

        {/* Step 3: Framework Generator */}
        {activeStep === 2 && (
          <motion.div
            key="framework"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!selectedAssessment ? (
              <div className="bg-white/[0.04] border border-dashed border-white/[0.08] rounded-xl p-12 text-center">
                <AlertCircle size={32} className="mx-auto text-white/60 mb-3" />
                <p className="text-[14px] text-white/60 mb-4">
                  No assessment selected. Create a security profile first.
                </p>
                <button
                  onClick={() => setActiveStep(0)}
                  className="text-[13px] text-emerald-400 hover:text-emerald-300"
                >
                  ← Go to Security Profile
                </button>
              </div>
            ) : !generatedFramework ? (
              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-8 text-center">
                <FileText size={48} className="mx-auto text-white/10 mb-4" />
                <h2 className="text-[18px] font-medium text-white mb-2">
                  Generate Cybersecurity Framework
                </h2>
                <p className="text-[13px] text-white/60 mb-6 max-w-md mx-auto">
                  Based on your security profile and compliance assessment,
                  generate a comprehensive cybersecurity framework document with
                  gap analysis and recommendations.
                </p>

                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={generateFramework}
                    disabled={generatingFramework}
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-medium text-[14px] hover:bg-white/90 transition-all disabled:opacity-50"
                  >
                    {generatingFramework ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Shield size={16} />
                    )}
                    Generate Framework
                  </button>

                  <p className="text-[11px] text-white/60">
                    Maturity Score: {selectedAssessment.maturityScore || 0}% •{" "}
                    {requirements.length} requirements assessed
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Generated Framework Display */}
                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-[18px] font-medium text-white mb-1">
                        Cybersecurity Framework
                      </h2>
                      <p className="text-[12px] text-white/70">
                        Generated{" "}
                        {new Date(
                          generatedFramework.generatedAt,
                        ).toLocaleString()}
                      </p>
                    </div>
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
                      className="flex items-center gap-2 text-[12px] text-white/60 hover:text-white/60 transition-colors"
                    >
                      <Download size={14} />
                      Export JSON
                    </button>
                  </div>

                  {/* Maturity Overview */}
                  <div className="mb-6 p-4 bg-white/[0.04] rounded-lg">
                    <h3 className="text-[13px] font-medium text-white mb-4">
                      Maturity Assessment
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[32px] font-mono font-semibold text-white">
                          {generatedFramework.maturityAssessment.overallScore}%
                        </p>
                        <p className="text-[11px] text-white/70">
                          Overall Score
                        </p>
                      </div>
                      <div>
                        <p className="text-[16px] font-medium text-white">
                          {generatedFramework.maturityAssessment.maturityLevel}
                        </p>
                        <p className="text-[11px] text-white/70">
                          Maturity Level
                        </p>
                      </div>
                      <div>
                        <p className="text-[16px] font-mono font-semibold text-green-400">
                          {generatedFramework.complianceStatus.compliant}
                        </p>
                        <p className="text-[11px] text-white/70">Compliant</p>
                      </div>
                      <div>
                        <p className="text-[16px] font-mono font-semibold text-red-400">
                          {generatedFramework.complianceStatus.nonCompliant +
                            generatedFramework.complianceStatus.notAssessed}
                        </p>
                        <p className="text-[11px] text-white/70">Gaps</p>
                      </div>
                    </div>
                  </div>

                  {/* Category Scores */}
                  <div className="mb-6 p-4 bg-white/[0.04] rounded-lg">
                    <h3 className="text-[13px] font-medium text-white mb-4">
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
                            className="p-3 bg-white/[0.04] rounded-lg"
                          >
                            <p className="text-[10px] text-white/70 uppercase tracking-wider mb-1">
                              {config?.label || cat}
                            </p>
                            <p className="text-[20px] font-mono font-semibold text-white">
                              {scores.score}%
                            </p>
                            <p className="text-[10px] text-white/60">
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
                    <div className="mb-6 p-4 bg-white/[0.04] rounded-lg">
                      <h3 className="text-[13px] font-medium text-white mb-4">
                        Gap Analysis
                      </h3>

                      {generatedFramework.gapAnalysis.critical.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] uppercase tracking-wider text-red-400/60 mb-2">
                            Critical Gaps (
                            {generatedFramework.gapAnalysis.critical.length})
                          </p>
                          <div className="space-y-2">
                            {generatedFramework.gapAnalysis.critical.map(
                              (gap) => (
                                <div
                                  key={gap.id}
                                  className="flex items-center justify-between p-2 bg-red-500/5 rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <XCircle
                                      size={14}
                                      className="text-red-400"
                                    />
                                    <span className="text-[12px] text-white/60">
                                      {gap.title}
                                    </span>
                                    <span className="font-mono text-[10px] text-white/70">
                                      {gap.articleRef}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-white/70">
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
                          <p className="text-[11px] uppercase tracking-wider text-orange-400/60 mb-2">
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
                                    <span className="text-[12px] text-white/60">
                                      {gap.title}
                                    </span>
                                    <span className="font-mono text-[10px] text-white/70">
                                      {gap.articleRef}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-white/70">
                                    ~{gap.implementationWeeks}w
                                  </span>
                                </div>
                              ))}
                            {generatedFramework.gapAnalysis.major.length >
                              5 && (
                              <p className="text-[11px] text-white/60 text-center">
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
                  <div className="mb-6 p-4 bg-white/[0.04] rounded-lg">
                    <h3 className="text-[13px] font-medium text-white mb-4">
                      Implementation Timeline
                      <span className="ml-2 text-[11px] text-white/70 font-normal">
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
                            className="p-3 bg-white/[0.04] rounded-lg"
                          >
                            <p className="text-[12px] font-medium text-white mb-2">
                              {phase.name}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {phase.requirements.map((req) => (
                                <span
                                  key={req.id}
                                  className={`text-[10px] px-2 py-1 rounded ${
                                    req.priority === "critical"
                                      ? "bg-red-500/10 text-red-400"
                                      : req.priority === "major"
                                        ? "bg-orange-500/10 text-orange-400"
                                        : "bg-emerald-500/10 text-emerald-400"
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
                  <div className="p-4 bg-white/[0.04] rounded-lg">
                    <h3 className="text-[13px] font-medium text-white mb-4">
                      Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {generatedFramework.recommendations.map((rec, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-[12px] text-white/70"
                        >
                          <Info
                            size={14}
                            className="text-emerald-400 mt-0.5 flex-shrink-0"
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
                    className="text-[12px] text-white/70 hover:text-white/70 transition-colors"
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
