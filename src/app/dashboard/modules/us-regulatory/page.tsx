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
  DollarSign,
  Leaf,
  Lock,
  Eye,
  Users,
  Trash2,
  Calculator,
  ExternalLink,
  Clock,
  Info,
} from "lucide-react";

// Types
type UsAgency = "FCC" | "FAA" | "NOAA";
type UsOperatorType =
  | "satellite_operator"
  | "launch_operator"
  | "reentry_operator"
  | "remote_sensing_operator"
  | "spectrum_user"
  | "spaceport_operator";
type UsActivityType =
  | "satellite_communications"
  | "earth_observation"
  | "scientific_research"
  | "commercial_launch"
  | "commercial_reentry"
  | "spectrum_operations"
  | "remote_sensing"
  | "navigation"
  | "broadband"
  | "direct_broadcast";
type UsLicenseType =
  | "fcc_space_station"
  | "fcc_earth_station"
  | "fcc_spectrum"
  | "fcc_experimental"
  | "faa_launch"
  | "faa_reentry"
  | "faa_spaceport"
  | "faa_safety_approval"
  | "noaa_remote_sensing";
type UsRequirementCategory =
  | "licensing"
  | "spectrum"
  | "orbital_debris"
  | "launch_safety"
  | "reentry_safety"
  | "remote_sensing"
  | "financial_responsibility"
  | "environmental"
  | "national_security"
  | "coordination"
  | "reporting";
type UsComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_assessed"
  | "not_applicable";

interface Assessment {
  id: string;
  assessmentName: string | null;
  status: string;
  operatorTypes: string;
  activityTypes: string;
  agencies: string;
  isUsEntity: boolean;
  usNexus: string;
  orbitRegime: string | null;
  altitudeKm: number | null;
  satelliteCount: number | null;
  hasManeuverability: boolean;
  hasPropulsion: boolean;
  missionDurationYears: number | null;
  isConstellation: boolean;
  isNGSO: boolean;
  providesRemoteSensing: boolean;
  launchDate: string | null;
  fccComplianceScore: number | null;
  faaComplianceScore: number | null;
  noaaComplianceScore: number | null;
  overallComplianceScore: number | null;
  mandatoryScore: number | null;
  riskLevel: string | null;
  criticalGaps: number | null;
  majorGaps: number | null;
  plannedDisposalYears: number | null;
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
  cfrReference: string;
  title: string;
  description: string;
  agency: UsAgency;
  category: UsRequirementCategory;
  bindingLevel: string;
  severity: string;
  complianceQuestion: string;
  evidenceRequired: string[];
  implementationGuidance: string[];
  licenseTypes: UsLicenseType[];
  euSpaceActCrossRef?: string[];
  copuosCrossRef?: string[];
  penalties?: { description: string; maxFine?: number };
}

interface GapAnalysisItem {
  requirementId: string;
  agency: UsAgency;
  status: UsComplianceStatus;
  priority: "high" | "medium" | "low";
  gap: string;
  recommendation: string;
  estimatedEffort: "low" | "medium" | "high";
  dependencies: string[];
  cfrReference: string;
  potentialPenalty?: string;
}

interface AgencyStatus {
  agency: UsAgency;
  fullName: string;
  score: number;
  riskLevel: string;
  requirements: Requirement[];
  gaps: GapAnalysisItem[];
  requiredLicenses: UsLicenseType[];
}

// Configuration
const agencyConfig: Record<
  UsAgency,
  { label: string; fullName: string; color: string; icon: typeof Satellite }
> = {
  FCC: {
    label: "FCC",
    fullName: "Federal Communications Commission",
    color: "blue",
    icon: Radio,
  },
  FAA: {
    label: "FAA/AST",
    fullName: "Federal Aviation Administration",
    color: "orange",
    icon: Rocket,
  },
  NOAA: {
    label: "NOAA",
    fullName: "National Oceanic and Atmospheric Administration",
    color: "green",
    icon: Eye,
  },
};

const operatorTypeConfig: Record<
  UsOperatorType,
  {
    label: string;
    description: string;
    icon: typeof Satellite;
    agencies: UsAgency[];
  }
> = {
  satellite_operator: {
    label: "Satellite Operator",
    description:
      "Operates satellites for communications, EO, or other purposes",
    icon: Satellite,
    agencies: ["FCC", "NOAA"],
  },
  launch_operator: {
    label: "Launch Operator",
    description: "Conducts commercial space launches",
    icon: Rocket,
    agencies: ["FAA"],
  },
  reentry_operator: {
    label: "Reentry Operator",
    description: "Conducts controlled vehicle reentry",
    icon: ArrowDownCircle,
    agencies: ["FAA"],
  },
  remote_sensing_operator: {
    label: "Remote Sensing Operator",
    description: "Operates commercial Earth observation systems",
    icon: Eye,
    agencies: ["NOAA"],
  },
  spectrum_user: {
    label: "Spectrum User",
    description: "Uses RF spectrum for space operations",
    icon: Radio,
    agencies: ["FCC"],
  },
  spaceport_operator: {
    label: "Spaceport Operator",
    description: "Operates licensed launch/reentry site",
    icon: Building2,
    agencies: ["FAA"],
  },
};

const activityTypeConfig: Record<UsActivityType, { label: string }> = {
  satellite_communications: { label: "Satellite Communications" },
  earth_observation: { label: "Earth Observation" },
  scientific_research: { label: "Scientific Research" },
  commercial_launch: { label: "Commercial Launch" },
  commercial_reentry: { label: "Commercial Reentry" },
  spectrum_operations: { label: "Spectrum Operations" },
  remote_sensing: { label: "Remote Sensing" },
  navigation: { label: "Navigation Services" },
  broadband: { label: "Broadband Services" },
  direct_broadcast: { label: "Direct Broadcast" },
};

const licenseTypeConfig: Record<
  UsLicenseType,
  { label: string; agency: UsAgency; cfrPart: string }
> = {
  fcc_space_station: {
    label: "Space Station License",
    agency: "FCC",
    cfrPart: "47 CFR Part 25",
  },
  fcc_earth_station: {
    label: "Earth Station License",
    agency: "FCC",
    cfrPart: "47 CFR Part 25",
  },
  fcc_spectrum: {
    label: "Spectrum License",
    agency: "FCC",
    cfrPart: "47 CFR Part 2/25",
  },
  fcc_experimental: {
    label: "Experimental License",
    agency: "FCC",
    cfrPart: "47 CFR Part 5",
  },
  faa_launch: {
    label: "Launch License",
    agency: "FAA",
    cfrPart: "14 CFR Part 450",
  },
  faa_reentry: {
    label: "Reentry License",
    agency: "FAA",
    cfrPart: "14 CFR Part 450",
  },
  faa_spaceport: {
    label: "Launch Site License",
    agency: "FAA",
    cfrPart: "14 CFR Part 420",
  },
  faa_safety_approval: {
    label: "Safety Element Approval",
    agency: "FAA",
    cfrPart: "14 CFR Part 414",
  },
  noaa_remote_sensing: {
    label: "Remote Sensing License",
    agency: "NOAA",
    cfrPart: "15 CFR Part 960",
  },
};

const categoryConfig: Record<
  UsRequirementCategory,
  { label: string; color: string; icon: typeof FileCheck }
> = {
  licensing: { label: "Licensing", color: "blue", icon: FileCheck },
  spectrum: { label: "Spectrum", color: "purple", icon: Radio },
  orbital_debris: { label: "Orbital Debris", color: "orange", icon: Trash2 },
  launch_safety: { label: "Launch Safety", color: "red", icon: Shield },
  reentry_safety: {
    label: "Reentry Safety",
    color: "rose",
    icon: ArrowDownCircle,
  },
  remote_sensing: { label: "Remote Sensing", color: "green", icon: Eye },
  financial_responsibility: {
    label: "Financial Resp.",
    color: "amber",
    icon: DollarSign,
  },
  environmental: { label: "Environmental", color: "emerald", icon: Leaf },
  national_security: { label: "National Security", color: "slate", icon: Lock },
  coordination: { label: "Coordination", color: "cyan", icon: Users },
  reporting: { label: "Reporting", color: "indigo", icon: FileText },
};

const statusConfig: Record<
  UsComplianceStatus,
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
    description: "Define US operations",
  },
  {
    id: "checklist",
    label: "Compliance Assessment",
    description: "Assess requirements",
  },
  { id: "gaps", label: "Gap Analysis", description: "Review gaps & actions" },
  { id: "report", label: "Report", description: "Generate compliance report" },
];

function UsRegulatoryPageContent() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] =
    useState<Assessment | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisItem[]>([]);
  const [agencyStatuses, setAgencyStatuses] = useState<AgencyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [activeAgencyTab, setActiveAgencyTab] = useState<UsAgency | "overview">(
    "overview",
  );
  const [score, setScore] = useState<{
    overall: number;
    mandatory: number;
    byAgency: Record<UsAgency, number>;
    byCategory: Record<string, number>;
    byLicenseType: Record<string, number>;
  } | null>(null);
  const [requiredLicenses, setRequiredLicenses] = useState<UsLicenseType[]>([]);
  const [requiredAgencies, setRequiredAgencies] = useState<UsAgency[]>([]);

  // Form state
  const [form, setForm] = useState<{
    operatorTypes: UsOperatorType[];
    activityTypes: UsActivityType[];
    isUsEntity: boolean;
    usNexus: string;
    orbitRegime?: string;
    altitudeKm?: number;
    satelliteCount?: number;
    hasManeuverability: boolean;
    hasPropulsion: boolean;
    missionDurationYears?: number;
    isConstellation: boolean;
    isNGSO: boolean;
    providesRemoteSensing: boolean;
    launchVehicle?: string;
    launchSite?: string;
  }>({
    operatorTypes: [],
    activityTypes: [],
    isUsEntity: true,
    usNexus: "us_licensed",
    hasManeuverability: false,
    hasPropulsion: false,
    isConstellation: false,
    isNGSO: true,
    providesRemoteSensing: false,
  });
  const [assessmentName, setAssessmentName] = useState("");
  const [creating, setCreating] = useState(false);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<
    UsRequirementCategory | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<UsComplianceStatus | "all">(
    "all",
  );

  // Deorbit calculator state
  const [showDeorbitCalc, setShowDeorbitCalc] = useState(false);
  const [deorbitResult, setDeorbitResult] = useState<{
    isLeoSubject: boolean;
    requiredDisposalYears: number;
    recommendations: string[];
  } | null>(null);

  // Report state
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await fetch("/api/us-regulatory");
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
      const res = await fetch(`/api/us-regulatory/${assessment.id}`);
      if (res.ok) {
        const data = await res.json();
        setRequirements(data.applicableRequirements);
        setGapAnalysis(data.gapAnalysis);
        setScore(data.score);
        setRequiredLicenses(data.requiredLicenses);
        setRequiredAgencies(data.requiredAgencies);
        setAgencyStatuses(data.agencyStatuses);

        // Check deorbit compliance
        if (data.deorbitCompliance) {
          setDeorbitResult({
            isLeoSubject: data.deorbitCompliance.isLeo,
            requiredDisposalYears: data.deorbitCompliance.requiredDisposalYears,
            recommendations: data.deorbitCompliance.warnings,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching assessment details:", error);
    }
  };

  const createAssessment = async () => {
    if (form.operatorTypes.length === 0 || form.activityTypes.length === 0)
      return;

    setCreating(true);
    try {
      const res = await fetch("/api/us-regulatory", {
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
        // Reset form
        setForm({
          operatorTypes: [],
          activityTypes: [],
          isUsEntity: true,
          usNexus: "us_licensed",
          hasManeuverability: false,
          hasPropulsion: false,
          isConstellation: false,
          isNGSO: true,
          providesRemoteSensing: false,
        });
        setAssessmentName("");
      }
    } catch (error) {
      console.error("Error creating assessment:", error);
    } finally {
      setCreating(false);
    }
  };

  const updateRequirementStatus = async (
    requirementId: string,
    status: UsComplianceStatus,
    notes?: string,
  ) => {
    if (!selectedAssessment) return;

    try {
      const res = await fetch(`/api/us-regulatory/${selectedAssessment.id}`, {
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
        setAgencyStatuses(data.agencyStatuses);
      }
    } catch (error) {
      console.error("Error updating requirement status:", error);
    }
  };

  const generateReport = async () => {
    if (!selectedAssessment) return;

    setGeneratingReport(true);
    try {
      const res = await fetch(
        `/api/us-regulatory/report/${selectedAssessment.id}`,
      );
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `us-regulatory-compliance-report-${selectedAssessment.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const getRequirementStatus = (requirementId: string): UsComplianceStatus => {
    const status = selectedAssessment?.requirementStatuses.find(
      (rs) => rs.requirementId === requirementId,
    );
    return (status?.status as UsComplianceStatus) || "not_assessed";
  };

  const toggleOperatorType = (opType: UsOperatorType) => {
    setForm((prev) => ({
      ...prev,
      operatorTypes: prev.operatorTypes.includes(opType)
        ? prev.operatorTypes.filter((o) => o !== opType)
        : [...prev.operatorTypes, opType],
    }));
  };

  const toggleActivityType = (activity: UsActivityType) => {
    setForm((prev) => ({
      ...prev,
      activityTypes: prev.activityTypes.includes(activity)
        ? prev.activityTypes.filter((a) => a !== activity)
        : [...prev.activityTypes, activity],
    }));
  };

  // Filter requirements by agency tab
  const getFilteredRequirements = () => {
    let filtered = requirements;

    // Filter by agency tab
    if (activeAgencyTab !== "overview") {
      filtered = filtered.filter((r) => r.agency === activeAgencyTab);
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((r) => r.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (r) => getRequirementStatus(r.id) === statusFilter,
      );
    }

    return filtered;
  };

  const filteredRequirements = getFilteredRequirements();

  // Calculate summary stats for current view
  const stats = {
    total: filteredRequirements.length,
    compliant: filteredRequirements.filter(
      (r) => getRequirementStatus(r.id) === "compliant",
    ).length,
    partial: filteredRequirements.filter(
      (r) => getRequirementStatus(r.id) === "partial",
    ).length,
    nonCompliant: filteredRequirements.filter(
      (r) => getRequirementStatus(r.id) === "non_compliant",
    ).length,
    notAssessed: filteredRequirements.filter(
      (r) => getRequirementStatus(r.id) === "not_assessed",
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            US Space Regulatory
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-white/70 mt-1">
            FCC, FAA/AST & NOAA compliance
          </p>
        </div>
        <button
          onClick={() => setShowNewAssessment(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Assessment</span>
        </button>
      </div>

      {/* Multi-Agency Tabs */}
      {selectedAssessment && (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide border-b border-slate-200 dark:border-white/10">
            <button
              onClick={() => setActiveAgencyTab("overview")}
              className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                activeAgencyTab === "overview"
                  ? "text-white border-b-2 border-emerald-500 bg-slate-100 dark:bg-white/[0.06]/50"
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:bg-white/[0.06]/30"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <Globe2 className="w-4 h-4" />
                <span className="hidden xs:inline">Overview</span>
              </div>
            </button>
            {requiredAgencies.map((agency) => {
              const config = agencyConfig[agency];
              const Icon = config.icon;
              const agencyScore = score?.byAgency[agency] ?? 0;
              return (
                <button
                  key={agency}
                  onClick={() => setActiveAgencyTab(agency)}
                  className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                    activeAgencyTab === agency
                      ? "text-white border-b-2 border-emerald-500 bg-slate-100 dark:bg-white/[0.06]/50"
                      : "text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:bg-white/[0.06]/30"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{config.label}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        agencyScore >= 80
                          ? "bg-green-500/20 text-green-400"
                          : agencyScore >= 60
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {agencyScore}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Agency-specific content */}
          <div className="p-3 sm:p-4">
            {activeAgencyTab === "overview" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {agencyStatuses.map((status) => {
                  const config = agencyConfig[status.agency];
                  const Icon = config.icon;
                  return (
                    <div
                      key={status.agency}
                      className="bg-slate-50 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 rounded-lg p-3 sm:p-4"
                    >
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <Icon
                          className={`w-4 sm:w-5 h-4 sm:h-5 text-${config.color}-400`}
                        />
                        <span className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                          {config.label}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-slate-600 dark:text-white/60">
                            Score
                          </span>
                          <span
                            className={`font-medium ${
                              status.score >= 80
                                ? "text-green-400"
                                : status.score >= 60
                                  ? "text-amber-400"
                                  : "text-red-400"
                            }`}
                          >
                            {status.score}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-white/[0.06] rounded-full h-1.5 sm:h-2">
                          <div
                            className={`h-full rounded-full ${
                              status.score >= 80
                                ? "bg-green-500"
                                : status.score >= 60
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${status.score}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 dark:text-white/50 mt-1 sm:mt-2">
                          <span>Req: {status.requirements?.length ?? 0}</span>
                          <span>Gaps: {status.gaps?.length ?? 0}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1 sm:mt-2">
                          {status.requiredLicenses
                            ?.slice(0, 2)
                            .map((license) => (
                              <span
                                key={license}
                                className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-slate-100 dark:bg-white/[0.06] text-slate-300 rounded truncate max-w-[120px]"
                              >
                                {licenseTypeConfig[license]?.label}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {/* Agency-specific licenses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {requiredLicenses
                    .filter(
                      (l) => licenseTypeConfig[l].agency === activeAgencyTab,
                    )
                    .map((license) => {
                      const config = licenseTypeConfig[license];
                      const licenseScore = score?.byLicenseType[license] ?? 0;
                      return (
                        <div
                          key={license}
                          className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 rounded-lg"
                        >
                          <FileCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {config.label}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                              {config.cfrPart}
                            </div>
                          </div>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                              licenseScore >= 80
                                ? "bg-green-500/20 text-green-400"
                                : licenseScore >= 60
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {licenseScore}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FCC 5-Year Deorbit Rule Alert */}
      {selectedAssessment && deorbitResult?.isLeoSubject && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 sm:p-4">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-medium text-orange-400">
                FCC 5-Year Deorbit Rule
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                LEO satellite must deorbit within 5 years post-mission (47 CFR §
                25.114).
              </p>
              {deorbitResult.recommendations.length > 0 && (
                <ul className="text-xs sm:text-sm text-slate-600 dark:text-white/60 mt-2 space-y-1">
                  {deorbitResult.recommendations.slice(0, 2).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{rec}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => setShowDeorbitCalc(true)}
                className="mt-2 sm:mt-3 text-xs sm:text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
              >
                <Calculator className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                Deorbit Calculator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Steps */}
      {(selectedAssessment || showNewAssessment) && (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-2 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between overflow-x-auto scrollbar-hide">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => setActiveStep(index)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors ${
                    activeStep === index
                      ? "bg-emerald-500/20 text-emerald-400"
                      : activeStep > index
                        ? "text-green-400"
                        : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div
                    className={`w-5 sm:w-6 h-5 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium flex-shrink-0 ${
                      activeStep === index
                        ? "bg-emerald-500 text-white"
                        : activeStep > index
                          ? "bg-green-500 text-white"
                          : "bg-slate-200 dark:bg-white/[0.08] text-slate-400"
                    }`}
                  >
                    {activeStep > index ? (
                      <CheckCircle2 className="w-3 sm:w-4 h-3 sm:h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                      {step.label}
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500 dark:text-white/50 hidden lg:block">
                      {step.description}
                    </div>
                  </div>
                </button>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="w-4 sm:w-5 h-4 sm:h-5 text-slate-600 mx-0.5 sm:mx-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 0: Profile Setup */}
        {(activeStep === 0 || showNewAssessment) && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Assessment Name */}
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-3 sm:p-4">
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Assessment Name (optional)
              </label>
              <input
                type="text"
                value={assessmentName}
                onChange={(e) => setAssessmentName(e.target.value)}
                placeholder="e.g., LEO Constellation"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base"
              />
            </div>

            {/* Operator Types */}
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white mb-3 sm:mb-4">
                Space operations in the US
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {(
                  Object.entries(operatorTypeConfig) as [
                    UsOperatorType,
                    typeof operatorTypeConfig.satellite_operator,
                  ][]
                ).map(([type, config]) => {
                  const Icon = config.icon;
                  const isSelected = form.operatorTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleOperatorType(type)}
                      className={`flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500 text-white"
                          : "bg-slate-50 dark:bg-white/[0.02] border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/40 hover:border-slate-400 dark:border-white/30"
                      }`}
                    >
                      <Icon
                        className={`w-4 sm:w-5 h-4 sm:h-5 mt-0.5 flex-shrink-0 ${isSelected ? "text-emerald-400" : "text-slate-600 dark:text-white/60"}`}
                      />
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-medium">
                          {config.label}
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-500 dark:text-white/50 dark:text-white/50 mt-0.5 sm:mt-1 line-clamp-2">
                          {config.description}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5 sm:mt-2">
                          {config.agencies.map((agency) => (
                            <span
                              key={agency}
                              className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded ${
                                agency === "FCC"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : agency === "FAA"
                                    ? "bg-orange-500/20 text-orange-400"
                                    : "bg-green-500/20 text-green-400"
                              }`}
                            >
                              {agency}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Activity Types */}
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white mb-3 sm:mb-4">
                Select your activities
              </h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {(
                  Object.entries(activityTypeConfig) as [
                    UsActivityType,
                    { label: string },
                  ][]
                ).map(([type, config]) => {
                  const isSelected = form.activityTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleActivityType(type)}
                      className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors ${
                        isSelected
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-50 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/40 hover:border-slate-400 dark:border-white/30"
                      }`}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Orbit Configuration */}
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white mb-3 sm:mb-4">
                Orbit Configuration
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
                {["LEO", "MEO", "GEO", "HEO", "cislunar", "deep_space"].map(
                  (orbit) => (
                    <button
                      key={orbit}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          orbitRegime: orbit,
                          isNGSO: orbit !== "GEO",
                        }))
                      }
                      className={`px-2 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm transition-colors ${
                        form.orbitRegime === orbit
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-50 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/40 hover:border-slate-400 dark:border-white/30"
                      }`}
                    >
                      {orbit === "cislunar"
                        ? "Cislunar"
                        : orbit === "deep_space"
                          ? "Deep"
                          : orbit}
                      {orbit === "LEO" && (
                        <span className="block text-[10px] sm:text-xs text-slate-500 dark:text-white/50 dark:text-white/50 mt-0.5 sm:mt-1">
                          5yr rule
                        </span>
                      )}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Mission Details */}
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white mb-3 sm:mb-4">
                Mission Details
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-white/60 mb-1">
                    Satellites
                  </label>
                  <input
                    type="number"
                    value={form.satelliteCount || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        satelliteCount: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                        isConstellation: parseInt(e.target.value) > 1,
                      }))
                    }
                    placeholder="1"
                    className="w-full px-2 sm:px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 rounded-lg text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-white/60 mb-1">
                    Duration (yr)
                  </label>
                  <input
                    type="number"
                    value={form.missionDurationYears || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        missionDurationYears: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      }))
                    }
                    placeholder="5"
                    className="w-full px-2 sm:px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 rounded-lg text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-white/60 mb-1">
                    Altitude (km)
                  </label>
                  <input
                    type="number"
                    value={form.altitudeKm || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        altitudeKm: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      }))
                    }
                    placeholder="550"
                    className="w-full px-2 sm:px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-300 dark:border-white/20 rounded-lg text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3 sm:gap-4 mt-3 sm:mt-4">
                <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasPropulsion}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hasPropulsion: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded bg-slate-50 dark:bg-white/[0.02] border-slate-300 dark:border-white/20"
                  />
                  Has Propulsion
                </label>
                <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasManeuverability}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hasManeuverability: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded bg-slate-50 dark:bg-white/[0.02] border-slate-300 dark:border-white/20"
                  />
                  Maneuverable
                </label>
                <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.providesRemoteSensing}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        providesRemoteSensing: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded bg-slate-50 dark:bg-white/[0.02] border-slate-300 dark:border-white/20"
                  />
                  Remote Sensing (NOAA)
                </label>
              </div>
            </div>

            {/* Create Button */}
            <div className="flex justify-end">
              <button
                onClick={createAssessment}
                disabled={
                  form.operatorTypes.length === 0 ||
                  form.activityTypes.length === 0 ||
                  creating
                }
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors w-full sm:w-auto"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Create Assessment
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 1: Compliance Assessment */}
        {activeStep === 1 && selectedAssessment && (
          <motion.div
            key="checklist"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3 sm:space-y-4"
          >
            {/* Stats Bar */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
              {[
                { label: "Total", count: stats.total, color: "slate" },
                { label: "OK", count: stats.compliant, color: "green" },
                { label: "Part", count: stats.partial, color: "amber" },
                { label: "Fail", count: stats.nonCompliant, color: "red" },
                { label: "N/A", count: stats.notAssessed, color: "slate" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg p-2 sm:p-3 text-center"
                >
                  <div
                    className={`text-lg sm:text-2xl font-bold text-${stat.color}-400`}
                  >
                    {stat.count}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(
                    e.target.value as UsRequirementCategory | "all",
                  )
                }
                className="flex-1 sm:flex-none px-3 py-2.5 bg-white dark:bg-white/[0.04] border border-slate-300 dark:border-white/20 rounded-lg text-slate-900 dark:text-white text-sm"
              >
                <option value="all">All Categories</option>
                {Object.entries(categoryConfig).map(([cat, config]) => (
                  <option key={cat} value={cat}>
                    {config.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as UsComplianceStatus | "all")
                }
                className="flex-1 sm:flex-none px-3 py-2.5 bg-white dark:bg-white/[0.04] border border-slate-300 dark:border-white/20 rounded-lg text-slate-900 dark:text-white text-sm"
              >
                <option value="all">All Statuses</option>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <option key={status} value={status}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Requirements List */}
            <div className="space-y-2 sm:space-y-3">
              {filteredRequirements.map((req) => {
                const currentStatus = getRequirementStatus(req.id);
                const StatusIcon = statusConfig[currentStatus].icon;
                const CategoryIcon =
                  categoryConfig[req.category]?.icon || FileText;
                const AgencyConfig = agencyConfig[req.agency];

                return (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg p-3 sm:p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <span
                            className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded bg-${AgencyConfig.color}-500/20 text-${AgencyConfig.color}-400`}
                          >
                            {req.agency}
                          </span>
                          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-white/50 dark:text-white/50 truncate">
                            {req.cfrReference}
                          </span>
                          {req.severity === "critical" && (
                            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                              Critical
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                          {req.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 mt-1 line-clamp-2">
                          {req.complianceQuestion}
                        </p>
                        {req.penalties && (
                          <p className="text-[10px] sm:text-xs text-red-400 mt-1.5 sm:mt-2 line-clamp-1">
                            {req.penalties.maxFine
                              ? `Up to $${(req.penalties.maxFine / 1000000).toFixed(1)}M fine`
                              : req.penalties.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 self-start sm:self-auto flex-shrink-0">
                        {(
                          [
                            "compliant",
                            "partial",
                            "non_compliant",
                            "not_applicable",
                          ] as UsComplianceStatus[]
                        ).map((status) => {
                          const config = statusConfig[status];
                          const Icon = config.icon;
                          return (
                            <button
                              key={status}
                              onClick={() =>
                                updateRequirementStatus(req.id, status)
                              }
                              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                                currentStatus === status
                                  ? `bg-${config.color}-500/20 text-${config.color}-400`
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-100 dark:bg-white/[0.06]"
                              }`}
                              title={config.label}
                            >
                              <Icon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveStep(2)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg w-full sm:w-auto"
              >
                <span>Gap Analysis</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Gap Analysis */}
        {activeStep === 2 && selectedAssessment && (
          <motion.div
            key="gaps"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3 sm:space-y-4"
          >
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-red-400">
                  {gapAnalysis.filter((g) => g.priority === "high").length}
                </div>
                <div className="text-[10px] sm:text-sm text-slate-600 dark:text-white/60">
                  High Priority
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-amber-400">
                  {gapAnalysis.filter((g) => g.priority === "medium").length}
                </div>
                <div className="text-[10px] sm:text-sm text-slate-600 dark:text-white/60">
                  Medium
                </div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-emerald-400">
                  {gapAnalysis.filter((g) => g.priority === "low").length}
                </div>
                <div className="text-[10px] sm:text-sm text-slate-600 dark:text-white/60">
                  Low
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {gapAnalysis.slice(0, 20).map((gap, index) => (
                <div
                  key={gap.requirementId}
                  className={`bg-white dark:bg-white/[0.04] border rounded-lg p-3 sm:p-4 ${
                    gap.priority === "high"
                      ? "border-red-500/30"
                      : gap.priority === "medium"
                        ? "border-amber-500/30"
                        : "border-slate-200 dark:border-white/10"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <span
                          className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${
                            gap.priority === "high"
                              ? "bg-red-500/20 text-red-400"
                              : gap.priority === "medium"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {gap.priority.toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded bg-${agencyConfig[gap.agency].color}-500/20 text-${agencyConfig[gap.agency].color}-400`}
                        >
                          {gap.agency}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-500 dark:text-white/50 dark:text-white/50 truncate">
                          {gap.cfrReference}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-white line-clamp-2">
                        {gap.gap}
                      </p>
                      <div className="mt-2 p-2 bg-slate-50 dark:bg-white/[0.02] rounded-lg">
                        <p className="text-xs sm:text-sm text-emerald-400 line-clamp-2">
                          {gap.recommendation}
                        </p>
                      </div>
                      {gap.potentialPenalty && (
                        <p className="text-[10px] sm:text-xs text-red-400 mt-1.5 sm:mt-2 line-clamp-1">
                          Penalty: {gap.potentialPenalty}
                        </p>
                      )}
                      {gap.dependencies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 sm:mt-2">
                          {gap.dependencies.slice(0, 2).map((dep, i) => (
                            <span
                              key={i}
                              className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/60 rounded truncate max-w-[140px]"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded self-start flex-shrink-0 ${
                        gap.estimatedEffort === "high"
                          ? "bg-red-500/20 text-red-400"
                          : gap.estimatedEffort === "medium"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {gap.estimatedEffort}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveStep(3)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg w-full sm:w-auto"
              >
                <span>Report</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Report */}
        {activeStep === 3 && selectedAssessment && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4">
                Compliance Report
              </h2>

              <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
                <div className="text-center">
                  <div
                    className={`text-2xl sm:text-4xl font-bold ${
                      (score?.overall ?? 0) >= 80
                        ? "text-green-400"
                        : (score?.overall ?? 0) >= 60
                          ? "text-amber-400"
                          : "text-red-400"
                    }`}
                  >
                    {score?.overall ?? 0}%
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-white/60">
                    Overall
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-4xl font-bold text-emerald-400">
                    {score?.mandatory ?? 0}%
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-white/60">
                    Mandatory
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl sm:text-4xl font-bold ${
                      selectedAssessment.riskLevel === "low"
                        ? "text-green-400"
                        : selectedAssessment.riskLevel === "medium"
                          ? "text-amber-400"
                          : selectedAssessment.riskLevel === "high"
                            ? "text-orange-400"
                            : "text-red-400"
                    }`}
                  >
                    {(selectedAssessment.riskLevel ?? "N/A")
                      .slice(0, 3)
                      .toUpperCase()}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-white/60">
                    Risk
                  </div>
                </div>
              </div>

              {/* Agency Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {requiredAgencies.map((agency) => {
                  const config = agencyConfig[agency];
                  const agencyScore = score?.byAgency[agency] ?? 0;
                  return (
                    <div
                      key={agency}
                      className="bg-slate-50 dark:bg-white/[0.02] rounded-lg p-3 sm:p-4"
                    >
                      <div className="flex items-center justify-between sm:justify-start sm:gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <config.icon
                            className={`w-4 sm:w-5 h-4 sm:h-5 text-${config.color}-400`}
                          />
                          <span className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                            {config.label}
                          </span>
                        </div>
                        <span
                          className={`text-lg sm:text-2xl font-bold sm:hidden ${
                            agencyScore >= 80
                              ? "text-green-400"
                              : agencyScore >= 60
                                ? "text-amber-400"
                                : "text-red-400"
                          }`}
                        >
                          {agencyScore}%
                        </span>
                      </div>
                      <div
                        className={`hidden sm:block text-2xl font-bold ${
                          agencyScore >= 80
                            ? "text-green-400"
                            : agencyScore >= 60
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        {agencyScore}%
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-white/[0.06] rounded-full h-1.5 sm:h-2 mt-1 sm:mt-2">
                        <div
                          className={`h-full rounded-full ${
                            agencyScore >= 80
                              ? "bg-green-500"
                              : agencyScore >= 60
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${agencyScore}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Required Licenses Summary */}
              <div className="mb-4 sm:mb-6">
                <h3 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white mb-2 sm:mb-3">
                  Required Licenses
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {requiredLicenses.map((license) => {
                    const config = licenseTypeConfig[license];
                    const licenseScore = score?.byLicenseType[license] ?? 0;
                    return (
                      <div
                        key={license}
                        className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-50 dark:bg-white/[0.02] rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">
                            {config.label}
                          </div>
                          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                            {config.cfrPart}
                          </div>
                        </div>
                        <span
                          className={`text-xs sm:text-sm font-bold ml-2 flex-shrink-0 ${
                            licenseScore >= 80
                              ? "text-green-400"
                              : licenseScore >= 60
                                ? "text-amber-400"
                                : "text-red-400"
                          }`}
                        >
                          {licenseScore}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-center">
                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg transition-colors w-full sm:w-auto"
                >
                  {generatingReport ? (
                    <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" />
                  ) : (
                    <Download className="w-4 sm:w-5 h-4 sm:h-5" />
                  )}
                  <span>Export Report</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* No Assessment Selected State */}
        {!selectedAssessment &&
          !showNewAssessment &&
          assessments.length > 0 && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 sm:space-y-4"
            >
              <h2 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white">
                Your Assessments
              </h2>
              {assessments.map((assessment) => (
                <button
                  key={assessment.id}
                  onClick={() => selectAssessment(assessment)}
                  className="w-full flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg hover:border-slate-300 dark:border-white/20 transition-colors text-left gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-white truncate">
                      {assessment.assessmentName || "Untitled Assessment"}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-white/60 mt-0.5 sm:mt-1 truncate">
                      {JSON.parse(assessment.agencies).join(", ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div
                      className={`text-base sm:text-lg font-bold ${
                        (assessment.overallComplianceScore ?? 0) >= 80
                          ? "text-green-400"
                          : (assessment.overallComplianceScore ?? 0) >= 60
                            ? "text-amber-400"
                            : "text-red-400"
                      }`}
                    >
                      {assessment.overallComplianceScore ?? 0}%
                    </div>
                    <ChevronRight className="w-4 sm:w-5 h-4 sm:h-5 text-slate-400" />
                  </div>
                </button>
              ))}
            </motion.div>
          )}

        {/* Empty State */}
        {!selectedAssessment &&
          !showNewAssessment &&
          assessments.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6 sm:p-8 text-center"
            >
              <Globe2 className="w-10 sm:w-12 h-10 sm:h-12 text-slate-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                No US Regulatory Assessments
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-white/60 mb-4 sm:mb-6">
                Evaluate FCC, FAA, and NOAA compliance.
              </p>
              <button
                onClick={() => setShowNewAssessment(true)}
                className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
              >
                Create Assessment
              </button>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}

export default function UsRegulatoryPage() {
  return (
    <FeatureGate module="us-regulatory">
      <UsRegulatoryPageContent />
    </FeatureGate>
  );
}
