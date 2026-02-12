"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  Globe2,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  MinusCircle,
  FileText,
  Loader2,
  Download,
  Plus,
  Shield,
  Building2,
  ArrowRight,
  Filter,
  Rocket,
  ArrowDownCircle,
  Satellite,
  Radio,
  FileCheck,
  Scale,
  Leaf,
  Lock,
  ClipboardList,
  Users,
  Siren,
  ExternalLink,
} from "lucide-react";

// Types
type UkOperatorType =
  | "launch_operator"
  | "return_operator"
  | "satellite_operator"
  | "spaceport_operator"
  | "range_control";
type UkActivityType =
  | "launch"
  | "return"
  | "orbital_operations"
  | "suborbital"
  | "spaceport_operations"
  | "range_services";
type UkLicenseType =
  | "launch_licence"
  | "return_licence"
  | "orbital_operator_licence"
  | "spaceport_licence"
  | "range_control_licence";
type UkRequirementCategory =
  | "operator_licensing"
  | "range_control"
  | "liability_insurance"
  | "safety"
  | "environmental"
  | "security"
  | "registration"
  | "informed_consent"
  | "emergency_response";
type UkComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_assessed"
  | "not_applicable";

interface Assessment {
  id: string;
  assessmentName: string | null;
  status: string;
  operatorType: string;
  activityTypes: string;
  launchFromUk: boolean;
  launchToOrbit: boolean;
  isSuborbital: boolean;
  hasUkNexus: boolean;
  involvesPeople: boolean;
  isCommercial: boolean;
  spacecraftName: string | null;
  spacecraftMassKg: number | null;
  plannedLaunchSite: string | null;
  targetOrbit: string | null;
  missionDurationYears: number | null;
  requiredLicenses: string | null;
  safetyCaseStatus: string | null;
  insuranceProvider: string | null;
  insuranceCoverage: number | null;
  ukRegistryRef: string | null;
  complianceScore: number | null;
  mandatoryScore: number | null;
  riskLevel: string | null;
  criticalGaps: number | null;
  majorGaps: number | null;
  requirementStatuses: RequirementStatusRecord[];
}

interface RequirementStatusRecord {
  id: string;
  requirementId: string;
  status: string;
  notes: string | null;
  evidenceNotes: string | null;
}

interface Requirement {
  id: string;
  sectionRef: string;
  title: string;
  description: string;
  category: UkRequirementCategory;
  bindingLevel: string;
  severity: string;
  complianceQuestion: string;
  evidenceRequired: string[];
  implementationGuidance: string[];
  caaGuidanceRef?: string;
  euSpaceActCrossRef?: string[];
  licenseTypes: UkLicenseType[];
}

interface GapAnalysisItem {
  requirementId: string;
  status: UkComplianceStatus;
  priority: "high" | "medium" | "low";
  gap: string;
  recommendation: string;
  estimatedEffort: "low" | "medium" | "high";
  dependencies: string[];
  caaGuidanceRef?: string;
}

// Configuration
const operatorTypeConfig: Record<
  UkOperatorType,
  { label: string; description: string; icon: typeof Rocket }
> = {
  launch_operator: {
    label: "Launch Operator",
    description: "Conducts launch activities",
    icon: Rocket,
  },
  return_operator: {
    label: "Return Operator",
    description: "Conducts controlled return",
    icon: ArrowDownCircle,
  },
  satellite_operator: {
    label: "Satellite Operator",
    description: "Operates satellites in orbit",
    icon: Satellite,
  },
  spaceport_operator: {
    label: "Spaceport Operator",
    description: "Operates spaceport facility",
    icon: Building2,
  },
  range_control: {
    label: "Range Control",
    description: "Provides range services",
    icon: Radio,
  },
};

const activityTypeConfig: Record<UkActivityType, { label: string }> = {
  launch: { label: "Launch" },
  return: { label: "Return" },
  orbital_operations: { label: "Orbital Operations" },
  suborbital: { label: "Suborbital" },
  spaceport_operations: { label: "Spaceport Operations" },
  range_services: { label: "Range Services" },
};

const licenseTypeConfig: Record<
  UkLicenseType,
  { label: string; section: string }
> = {
  launch_licence: { label: "Launch Licence", section: "SIA s.3" },
  return_licence: { label: "Return Licence", section: "SIA s.3" },
  orbital_operator_licence: {
    label: "Orbital Operator Licence",
    section: "SIA s.7",
  },
  spaceport_licence: { label: "Spaceport Licence", section: "SIA s.5" },
  range_control_licence: { label: "Range Control Licence", section: "SIA s.6" },
};

const categoryConfig: Record<
  UkRequirementCategory,
  { label: string; color: string; icon: typeof FileCheck }
> = {
  operator_licensing: {
    label: "Operator Licensing",
    color: "blue",
    icon: FileCheck,
  },
  range_control: { label: "Range Control", color: "purple", icon: Radio },
  liability_insurance: {
    label: "Liability & Insurance",
    color: "amber",
    icon: Scale,
  },
  safety: { label: "Safety", color: "red", icon: Shield },
  environmental: { label: "Environmental", color: "green", icon: Leaf },
  security: { label: "Security", color: "orange", icon: Lock },
  registration: { label: "Registration", color: "cyan", icon: ClipboardList },
  informed_consent: { label: "Informed Consent", color: "pink", icon: Users },
  emergency_response: {
    label: "Emergency Response",
    color: "rose",
    icon: Siren,
  },
};

const statusConfig: Record<
  UkComplianceStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  compliant: { label: "Compliant", color: "green", icon: CheckCircle2 },
  partial: { label: "Partial", color: "amber", icon: AlertTriangle },
  non_compliant: { label: "Non-Compliant", color: "red", icon: XCircle },
  not_assessed: { label: "Not Assessed", color: "slate", icon: HelpCircle },
  not_applicable: { label: "N/A", color: "gray", icon: MinusCircle },
};

// Wizard Steps
const STEPS = [
  {
    id: "profile",
    label: "Operator Profile",
    description: "Define operator type & activities",
  },
  {
    id: "checklist",
    label: "Compliance Assessment",
    description: "Assess requirements",
  },
  { id: "gaps", label: "Gap Analysis", description: "Review gaps & actions" },
  { id: "report", label: "Report", description: "Generate compliance report" },
];

function UkSpacePageContent() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] =
    useState<Assessment | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [score, setScore] = useState<{
    overall: number;
    mandatory: number;
    byCategory: Record<string, number>;
    byLicenseType: Record<string, number>;
  } | null>(null);
  const [requiredLicenses, setRequiredLicenses] = useState<UkLicenseType[]>([]);

  // Form state
  const [form, setForm] = useState<{
    operatorType?: UkOperatorType;
    activityTypes: UkActivityType[];
    launchFromUk: boolean;
    launchToOrbit: boolean;
    isSuborbital: boolean;
    hasUkNexus: boolean;
    involvesPeople: boolean;
    isCommercial: boolean;
    spacecraftName?: string;
    spacecraftMassKg?: number;
    plannedLaunchSite?: string;
    targetOrbit?: string;
    missionDurationYears?: number;
  }>({
    activityTypes: [],
    launchFromUk: false,
    launchToOrbit: false,
    isSuborbital: false,
    hasUkNexus: true,
    involvesPeople: false,
    isCommercial: true,
  });
  const [assessmentName, setAssessmentName] = useState("");
  const [creating, setCreating] = useState(false);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<
    UkRequirementCategory | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<UkComplianceStatus | "all">(
    "all",
  );

  // Report state
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await fetch("/api/uk-space");
      if (res.ok) {
        const data = await res.json();
        setAssessments(data.assessments);
        if (data.assessments.length === 1) {
          await selectAssessment(data.assessments[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectAssessment = async (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setActiveStep(1);
    try {
      const res = await fetch(`/api/uk-space/${assessment.id}`);
      if (res.ok) {
        const data = await res.json();
        setRequirements(data.applicableRequirements);
        setGapAnalysis(data.gapAnalysis);
        setScore(data.score);
        setRequiredLicenses(data.requiredLicenses);
      }
    } catch (error) {
      console.error("Error fetching assessment details:", error);
    }
  };

  const createAssessment = async () => {
    if (!form.operatorType || form.activityTypes.length === 0) return;

    setCreating(true);
    try {
      const res = await fetch("/api/uk-space", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentName: assessmentName || null,
          ...form,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAssessments((prev) => [data.assessment, ...prev]);
        await selectAssessment(data.assessment);
        setShowNewAssessment(false);
      }
    } catch (error) {
      console.error("Error creating assessment:", error);
    } finally {
      setCreating(false);
    }
  };

  const updateRequirementStatus = async (
    requirementId: string,
    status: UkComplianceStatus,
    notes?: string,
  ) => {
    if (!selectedAssessment) return;

    try {
      const res = await fetch(`/api/uk-space/${selectedAssessment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirementStatuses: [{ requirementId, status, notes }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedAssessment(data.assessment);
        setScore(data.score);
        setGapAnalysis(data.gapAnalysis);
      }
    } catch (error) {
      console.error("Error updating requirement status:", error);
    }
  };

  const generateReport = async () => {
    if (!selectedAssessment) return;

    setGeneratingReport(true);
    try {
      const res = await fetch(`/api/uk-space/report/${selectedAssessment.id}`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `uk-space-compliance-report-${selectedAssessment.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const getRequirementStatus = (requirementId: string): UkComplianceStatus => {
    const status = selectedAssessment?.requirementStatuses.find(
      (rs) => rs.requirementId === requirementId,
    );
    return (status?.status as UkComplianceStatus) || "not_assessed";
  };

  const toggleActivityType = (activity: UkActivityType) => {
    setForm((prev) => ({
      ...prev,
      activityTypes: prev.activityTypes.includes(activity)
        ? prev.activityTypes.filter((a) => a !== activity)
        : [...prev.activityTypes, activity],
    }));
  };

  const filteredRequirements = requirements.filter((r) => {
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (statusFilter !== "all" && getRequirementStatus(r.id) !== statusFilter)
      return false;
    return true;
  });

  // Calculate summary stats
  const stats = {
    total: requirements.length,
    compliant: requirements.filter(
      (r) => getRequirementStatus(r.id) === "compliant",
    ).length,
    partial: requirements.filter(
      (r) => getRequirementStatus(r.id) === "partial",
    ).length,
    nonCompliant: requirements.filter(
      (r) => getRequirementStatus(r.id) === "non_compliant",
    ).length,
    notAssessed: requirements.filter(
      (r) => getRequirementStatus(r.id) === "not_assessed",
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            UK Space Industry Act Compliance
          </h1>
          <p className="text-slate-400 mt-1">
            Assess compliance with UK Space Industry Act 2018 and Space Industry
            Regulations 2021
          </p>
        </div>
        <button
          onClick={() => setShowNewAssessment(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Assessment
        </button>
      </div>

      {/* Required Licenses Overview */}
      {selectedAssessment && requiredLicenses.length > 0 && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
          <h3 className="font-medium text-white mb-3">Required CAA Licenses</h3>
          <div className="flex flex-wrap gap-2">
            {requiredLicenses.map((license) => {
              const config = licenseTypeConfig[license];
              const licenseScore = score?.byLicenseType[license];
              return (
                <div
                  key={license}
                  className="flex items-center gap-2 px-3 py-2 bg-navy-900 rounded-lg"
                >
                  <FileCheck className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {config.label}
                    </div>
                    <div className="text-xs text-slate-400">
                      {config.section}
                    </div>
                  </div>
                  {licenseScore !== undefined && (
                    <span
                      className={`ml-2 text-sm font-medium ${
                        licenseScore >= 80
                          ? "text-green-400"
                          : licenseScore >= 60
                            ? "text-amber-400"
                            : "text-red-400"
                      }`}
                    >
                      {licenseScore}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories Overview */}
      {score && (
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              "operator_licensing",
              "safety",
              "liability_insurance",
            ] as UkRequirementCategory[]
          ).map((category) => {
            const config = categoryConfig[category];
            const Icon = config.icon;
            return (
              <div
                key={category}
                className="bg-navy-800 border border-navy-700 rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${config.color}-500/20`}>
                    <Icon className={`w-5 h-5 text-${config.color}-400`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{config.label}</h3>
                    <p className="text-sm text-slate-400">
                      {score.byCategory[category] ?? 0}% compliant
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Steps */}
      {selectedAssessment && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  activeStep === index
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    activeStep === index
                      ? "bg-blue-500 text-white"
                      : activeStep > index
                        ? "bg-green-500 text-white"
                        : "bg-navy-700 text-slate-400"
                  }`}
                >
                  {activeStep > index ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="text-left">
                  <div className="font-medium">{step.label}</div>
                  <div className="text-xs text-slate-500">
                    {step.description}
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-slate-600 ml-4" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {/* No Assessment Selected */}
        {!selectedAssessment && !showNewAssessment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {assessments.length > 0 ? (
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Your Assessments
                </h2>
                <div className="space-y-3">
                  {assessments.map((assessment) => {
                    const Icon =
                      operatorTypeConfig[
                        assessment.operatorType as UkOperatorType
                      ]?.icon || Building2;
                    return (
                      <button
                        key={assessment.id}
                        onClick={() => selectAssessment(assessment)}
                        className="w-full flex items-center justify-between p-4 bg-navy-900 rounded-lg hover:bg-navy-700 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-blue-500/20">
                            <Icon className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-white">
                              {assessment.assessmentName ||
                                assessment.spacecraftName ||
                                "Untitled"}
                            </div>
                            <div className="text-sm text-slate-400">
                              {
                                operatorTypeConfig[
                                  assessment.operatorType as UkOperatorType
                                ]?.label
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {assessment.complianceScore !== null && (
                            <div className="text-right">
                              <div className="text-lg font-bold text-white">
                                {assessment.complianceScore}%
                              </div>
                              <div className="text-xs text-slate-400">
                                Compliance
                              </div>
                            </div>
                          )}
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
                <Globe2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  No Assessments Yet
                </h2>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Start your UK Space Industry Act compliance assessment by
                  defining your operator profile.
                </p>
                <button
                  onClick={() => setShowNewAssessment(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Start New Assessment
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* New Assessment Form */}
        {showNewAssessment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-navy-800 border border-navy-700 rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6">
              Operator Profile
            </h2>

            <div className="grid grid-cols-2 gap-6">
              {/* Assessment Name */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assessment Name
                </label>
                <input
                  type="text"
                  value={assessmentName}
                  onChange={(e) => setAssessmentName(e.target.value)}
                  placeholder="e.g., SatCom-1 Launch Assessment"
                  className="w-full px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Operator Type */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Operator Type *
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(
                    Object.entries(operatorTypeConfig) as [
                      UkOperatorType,
                      typeof operatorTypeConfig.launch_operator,
                    ][]
                  ).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setForm({ ...form, operatorType: type })}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          form.operatorType === type
                            ? "bg-blue-500/20 border-blue-500 text-white"
                            : "bg-navy-900 border-navy-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <Icon className="w-6 h-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">
                          {config.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Activity Types */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Activity Types *
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    Object.entries(activityTypeConfig) as [
                      UkActivityType,
                      typeof activityTypeConfig.launch,
                    ][]
                  ).map(([activity, config]) => (
                    <button
                      key={activity}
                      onClick={() => toggleActivityType(activity)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        form.activityTypes.includes(activity)
                          ? "bg-blue-500/20 border-blue-500 text-white"
                          : "bg-navy-900 border-navy-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Characteristics */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Activity Characteristics
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.launchFromUk}
                      onChange={(e) =>
                        setForm({ ...form, launchFromUk: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-navy-700 bg-navy-900 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-slate-300">Launch from UK</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.launchToOrbit}
                      onChange={(e) =>
                        setForm({ ...form, launchToOrbit: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-navy-700 bg-navy-900 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-slate-300">Orbital Mission</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isSuborbital}
                      onChange={(e) =>
                        setForm({ ...form, isSuborbital: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-navy-700 bg-navy-900 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-slate-300">Suborbital</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.involvesPeople}
                      onChange={(e) =>
                        setForm({ ...form, involvesPeople: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-navy-700 bg-navy-900 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-slate-300">Human Spaceflight</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isCommercial}
                      onChange={(e) =>
                        setForm({ ...form, isCommercial: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-navy-700 bg-navy-900 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-slate-300">Commercial Activity</span>
                  </label>
                </div>
              </div>

              {/* Spacecraft Details (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Spacecraft Name
                </label>
                <input
                  type="text"
                  value={form.spacecraftName || ""}
                  onChange={(e) =>
                    setForm({ ...form, spacecraftName: e.target.value })
                  }
                  placeholder="e.g., SatCom-1"
                  className="w-full px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Spacecraft Mass (kg)
                </label>
                <input
                  type="number"
                  value={form.spacecraftMassKg || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      spacecraftMassKg: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="e.g., 500"
                  className="w-full px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Planned Launch Site
                </label>
                <input
                  type="text"
                  value={form.plannedLaunchSite || ""}
                  onChange={(e) =>
                    setForm({ ...form, plannedLaunchSite: e.target.value })
                  }
                  placeholder="e.g., SaxaVord Spaceport"
                  className="w-full px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Target Orbit
                </label>
                <input
                  type="text"
                  value={form.targetOrbit || ""}
                  onChange={(e) =>
                    setForm({ ...form, targetOrbit: e.target.value })
                  }
                  placeholder="e.g., LEO 550km SSO"
                  className="w-full px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-navy-700">
              <button
                onClick={() => setShowNewAssessment(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createAssessment}
                disabled={
                  !form.operatorType ||
                  form.activityTypes.length === 0 ||
                  creating
                }
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Start Assessment
              </button>
            </div>
          </motion.div>
        )}

        {/* Compliance Assessment Step */}
        {selectedAssessment && activeStep === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
                <div className="text-2xl font-bold text-white">
                  {stats.total}
                </div>
                <div className="text-sm text-slate-400">
                  Applicable Requirements
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-400">
                  {stats.compliant}
                </div>
                <div className="text-sm text-green-400/70">Compliant</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-amber-400">
                  {stats.partial}
                </div>
                <div className="text-sm text-amber-400/70">Partial</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-red-400">
                  {stats.nonCompliant}
                </div>
                <div className="text-sm text-red-400/70">Non-Compliant</div>
              </div>
              <div className="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-slate-400">
                  {stats.notAssessed}
                </div>
                <div className="text-sm text-slate-500">Not Assessed</div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(
                      e.target.value as UkRequirementCategory | "all",
                    )
                  }
                  className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {(
                    Object.entries(categoryConfig) as [
                      UkRequirementCategory,
                      typeof categoryConfig.operator_licensing,
                    ][]
                  ).map(([cat, config]) => (
                    <option key={cat} value={cat}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as UkComplianceStatus | "all")
                }
                className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="compliant">Compliant</option>
                <option value="partial">Partial</option>
                <option value="non_compliant">Non-Compliant</option>
                <option value="not_assessed">Not Assessed</option>
              </select>
            </div>

            {/* Requirements List */}
            <div className="space-y-3">
              {filteredRequirements.map((requirement) => {
                const status = getRequirementStatus(requirement.id);
                const StatusIcon = statusConfig[status].icon;
                const catConfig = categoryConfig[requirement.category];

                return (
                  <div
                    key={requirement.id}
                    className="bg-navy-800 border border-navy-700 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium bg-${catConfig.color}-500/20 text-${catConfig.color}-400`}
                          >
                            {catConfig.label}
                          </span>
                          <span className="text-sm text-slate-400">
                            {requirement.sectionRef}
                          </span>
                          {requirement.bindingLevel === "mandatory" && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                              Mandatory
                            </span>
                          )}
                          {requirement.severity === "critical" && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400">
                              Critical
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-white mb-1">
                          {requirement.title}
                        </h3>
                        <p className="text-sm text-slate-400 mb-3">
                          {requirement.complianceQuestion}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {requirement.caaGuidanceRef && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {requirement.caaGuidanceRef}
                            </span>
                          )}
                          {requirement.euSpaceActCrossRef &&
                            requirement.euSpaceActCrossRef.length > 0 && (
                              <span className="flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                EU Space Act:{" "}
                                {requirement.euSpaceActCrossRef.join(", ")}
                              </span>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(
                          [
                            "compliant",
                            "partial",
                            "non_compliant",
                            "not_applicable",
                          ] as UkComplianceStatus[]
                        ).map((s) => {
                          const config = statusConfig[s];
                          const Icon = config.icon;
                          return (
                            <button
                              key={s}
                              onClick={() =>
                                updateRequirementStatus(requirement.id, s)
                              }
                              className={`p-2 rounded-lg transition-colors ${
                                status === s
                                  ? `bg-${config.color}-500/20 text-${config.color}-400`
                                  : "bg-navy-700 text-slate-500 hover:text-white"
                              }`}
                              title={config.label}
                            >
                              <Icon className="w-5 h-5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Continue Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setActiveStep(2)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Continue to Gap Analysis
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Gap Analysis Step */}
        {selectedAssessment && activeStep === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">
                  Gap Analysis
                </h2>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <AlertCircle className="w-4 h-4" />
                  {gapAnalysis.length} gaps identified
                </div>
              </div>

              {gapAnalysis.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-white font-medium">No gaps identified</p>
                  <p className="text-sm text-slate-400">
                    All assessed requirements are compliant
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gapAnalysis.slice(0, 15).map((gap) => (
                    <div
                      key={gap.requirementId}
                      className={`p-4 rounded-lg border ${
                        gap.priority === "high"
                          ? "bg-red-500/10 border-red-500/30"
                          : gap.priority === "medium"
                            ? "bg-amber-500/10 border-amber-500/30"
                            : "bg-slate-500/10 border-slate-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                gap.priority === "high"
                                  ? "bg-red-500/20 text-red-400"
                                  : gap.priority === "medium"
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-slate-500/20 text-slate-400"
                              }`}
                            >
                              {gap.priority.toUpperCase()} PRIORITY
                            </span>
                            <span className="text-xs text-slate-500">
                              Effort: {gap.estimatedEffort}
                            </span>
                            {gap.caaGuidanceRef && (
                              <span className="text-xs text-slate-500">
                                {gap.caaGuidanceRef}
                              </span>
                            )}
                          </div>
                          <p className="text-white font-medium mb-1">
                            {gap.gap}
                          </p>
                          <p className="text-sm text-slate-400">
                            {gap.recommendation}
                          </p>
                          {gap.dependencies.length > 0 && (
                            <div className="mt-2 text-xs text-slate-500">
                              Dependencies: {gap.dependencies.join(", ")}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setCategoryFilter("all");
                            setStatusFilter("all");
                            setActiveStep(1);
                          }}
                          className="px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-white text-sm rounded-lg transition-colors"
                        >
                          Address
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Continue Button */}
            <div className="flex justify-between">
              <button
                onClick={() => setActiveStep(1)}
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to Assessment
              </button>
              <button
                onClick={() => setActiveStep(3)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Generate Report
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Report Step */}
        {selectedAssessment && activeStep === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  Compliance Report Ready
                </h2>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Generate a comprehensive compliance report covering UK Space
                  Industry Act 2018 and Space Industry Regulations 2021.
                </p>

                {score && (
                  <div className="flex items-center justify-center gap-8 mb-8">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white">
                        {score.overall}%
                      </div>
                      <div className="text-sm text-slate-400">
                        Overall Score
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-amber-400">
                        {score.mandatory}%
                      </div>
                      <div className="text-sm text-slate-400">Mandatory</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-4xl font-bold ${
                          selectedAssessment.riskLevel === "low"
                            ? "text-green-400"
                            : selectedAssessment.riskLevel === "medium"
                              ? "text-amber-400"
                              : selectedAssessment.riskLevel === "high"
                                ? "text-orange-400"
                                : "text-red-400"
                        }`}
                      >
                        {selectedAssessment.riskLevel?.toUpperCase() || "N/A"}
                      </div>
                      <div className="text-sm text-slate-400">Risk Level</div>
                    </div>
                  </div>
                )}

                {/* Required Licenses Summary */}
                {requiredLicenses.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-medium text-slate-400 mb-3">
                      Required CAA Licenses
                    </h3>
                    <div className="flex justify-center gap-4">
                      {requiredLicenses.map((license) => (
                        <div
                          key={license}
                          className="flex items-center gap-2 px-3 py-2 bg-navy-700 rounded-lg"
                        >
                          <FileCheck className="w-4 h-4 text-blue-400" />
                          <span className="text-white text-sm">
                            {licenseTypeConfig[license].label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  {generatingReport ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  {generatingReport ? "Generating..." : "Download Report"}
                </button>
              </div>
            </div>

            {/* Back Button */}
            <div className="flex justify-start">
              <button
                onClick={() => setActiveStep(2)}
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to Gap Analysis
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function UkSpacePage() {
  return (
    <FeatureGate module="uk-space">
      <UkSpacePageContent />
    </FeatureGate>
  );
}
