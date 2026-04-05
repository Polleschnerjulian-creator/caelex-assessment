"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { csrfHeaders } from "@/lib/csrf-client";
import Link from "next/link";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  Shield,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Building2,
  Rocket,
  Calculator,
  FileText,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  MapPin,
  Satellite,
  X,
  Info,
  Package,
  Link2,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Infinity,
  Send,
  Eye,
  Minus,
  XCircle,
  Zap,
  Loader2,
} from "lucide-react";

import {
  nationalInsuranceRequirements,
  nationalRequirementsLookup,
  insuranceTypeDefinitions,
  policyStatusConfig,
  riskLevelConfig,
  companySizeConfig,
  orbitRegimeConfig,
  operatorTypeConfig,
  commonLaunchProviders,
  calculateTPLRequirement,
  calculateMultiJurisdictionTPL,
  getRequiredInsuranceTypes,
  calculateMissionRiskLevel,
  estimatePremiumRange,
  type InsuranceRiskProfile,
  type JurisdictionCode,
  type OperatorType,
  type CompanySize,
  type OrbitRegime,
  type InsuranceType,
  type PolicyStatus,
  type MissionRiskLevel,
} from "@/data/insurance-requirements";
import AstraButton from "@/components/astra/AstraButton";

// Icon mapping for insurance types
const insuranceTypeIcons: Record<InsuranceType, React.ReactNode> = {
  pre_launch: <Package className="w-4 h-4" />,
  launch: <Rocket className="w-4 h-4" />,
  in_orbit: <Satellite className="w-4 h-4" />,
  third_party_liability: <Shield className="w-4 h-4" />,
  contingent_liability: <Link2 className="w-4 h-4" />,
  loss_of_revenue: <TrendingDown className="w-4 h-4" />,
  launch_plus_life: <Infinity className="w-4 h-4" />,
};

// Policy status icons (for reference, not all used)
const _policyStatusIcons: Record<PolicyStatus, React.ReactNode> = {
  not_started: <Minus className="w-4 h-4" />,
  quote_requested: <Send className="w-4 h-4" />,
  quote_received: <FileText className="w-4 h-4" />,
  under_review: <Eye className="w-4 h-4" />,
  bound: <CheckCircle2 className="w-4 h-4" />,
  active: <Shield className="w-4 h-4" />,
  expiring_soon: <AlertTriangle className="w-4 h-4" />,
  expired: <XCircle className="w-4 h-4" />,
  not_required: <Minus className="w-4 h-4" />,
};

const JURISDICTIONS = [
  { code: "DE", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "FR", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "IT", flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "ES", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "NL", flag: "\u{1F1F3}\u{1F1F1}" },
  { code: "BE", flag: "\u{1F1E7}\u{1F1EA}" },
  { code: "LU", flag: "\u{1F1F1}\u{1F1FA}" },
  { code: "AT", flag: "\u{1F1E6}\u{1F1F9}" },
  { code: "SE", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "UK", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "PL", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "NO", flag: "\u{1F1F3}\u{1F1F4}" },
  { code: "DK", flag: "\u{1F1E9}\u{1F1F0}" },
  { code: "FI", flag: "\u{1F1EB}\u{1F1EE}" },
  { code: "PT", flag: "\u{1F1F5}\u{1F1F9}" },
  { code: "IE", flag: "\u{1F1EE}\u{1F1EA}" },
  { code: "CZ", flag: "\u{1F1E8}\u{1F1FF}" },
  { code: "CH", flag: "\u{1F1E8}\u{1F1ED}" },
];

interface Assessment {
  id: string;
  assessmentName: string | null;
  primaryJurisdiction: string;
  secondaryJurisdictions: string[];
  operatorType: string;
  companySize: string;
  orbitRegime: string;
  satelliteCount: number;
  satelliteValueEur: number | null;
  totalMissionValueEur: number | null;
  isConstellationOperator: boolean;
  hasManeuverability: boolean;
  missionDurationYears: number;
  hasFlightHeritage: boolean;
  launchVehicle: string | null;
  launchProvider: string | null;
  hasADR: boolean;
  hasPropulsion: boolean;
  hasHazardousMaterials: boolean;
  crossBorderOps: boolean;
  annualRevenueEur: number | null;
  turnoversShareSpace: number | null;
  calculatedTPL: number | null;
  riskLevel: string | null;
  complianceScore: number | null;
  reportGenerated: boolean;
  policies: Policy[];
  createdAt: string;
  updatedAt: string;
}

interface Policy {
  id: string;
  insuranceType: string;
  status: string;
  isRequired: boolean;
  policyNumber: string | null;
  insurer: string | null;
  broker: string | null;
  coverageAmount: number | null;
  premium: number | null;
  deductible: number | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  notes: string | null;
}

interface Report {
  organizationProfile: {
    name: string | null;
    jurisdiction: string;
    jurisdictionName: string;
    operatorType: string;
    companySize: string;
    orbitRegime: string;
    satelliteCount: number;
    missionValue: number | null;
    missionDurationYears: number;
    riskLevel: string;
  };
  tplRequirement: {
    amount: number;
    currency: string;
    basis: string;
    explanation: string;
    notes: string[];
  };
  complianceStatus: {
    score: number;
    requiredPolicies: number;
    activePolicies: number;
    pendingPolicies: number;
    missingPolicies: number;
    expiringWithin90Days: number;
  };
  premiumEstimate: {
    annualTotal: { min: number; max: number };
    breakdown: Record<string, { min: number; max: number }>;
  };
  recommendations: string[];
  generatedAt: string;
}

// ─── IRPE Types ─────────────────────────────────────────────────────────────

interface IRPEComponentScore {
  score: number;
  grade: string;
  factors: string[];
}

interface IRPEScoreData {
  overallRiskScore: number;
  riskGrade: string;
  premiumImpact: string;
  components: {
    missionRisk: IRPEComponentScore;
    compliancePosture: IRPEComponentScore;
    operationalMaturity: IRPEComponentScore;
    cybersecurityReadiness: IRPEComponentScore;
    incidentHistory: IRPEComponentScore;
  };
  premiumAdjustment: {
    baselinePercent: number;
    adjustedPercent: number;
    savingsPercent: number;
    annualSavingsEstimate: {
      min: number;
      max: number;
      currency: string;
    };
  };
  improvements: Array<{
    action: string;
    currentImpact: string;
    projectedImpact: string;
    estimatedPremiumReduction: string;
  }>;
  calculatedAt: string;
  dataCompleteness: number;
}

const STEPS = [
  { id: 1, name: "Risk Profile", icon: Building2 },
  { id: 2, name: "Coverage Calculator", icon: Calculator },
  { id: 3, name: "Policy Tracker", icon: FileText },
  { id: 4, name: "Compliance Report", icon: Shield },
];

function InsurancePageContent() {
  const [currentStep, setCurrentStep] = useState(1);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] =
    useState<Assessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [policySaving, setPolicySaving] = useState<string | null>(null); // policyId being saved
  // Removed PDF download in favor of AI Document Studio
  const [irpeScore, setIrpeScore] = useState<IRPEScoreData | null>(null);
  const [irpeLoading, setIrpeLoading] = useState(false);

  // Ref for initial auto-select to avoid re-fetch loop
  const hasAutoSelected = useRef(false);

  // Form state for new assessment
  const [formData, setFormData] = useState({
    assessmentName: "",
    primaryJurisdiction: "DE" as JurisdictionCode,
    operatorType: "spacecraft" as OperatorType,
    companySize: "small" as CompanySize,
    orbitRegime: "LEO" as OrbitRegime,
    satelliteCount: 1,
    satelliteValueEur: 0,
    totalMissionValueEur: 0,
    isConstellationOperator: false,
    hasManeuverability: true,
    missionDurationYears: 5,
    hasFlightHeritage: false,
    launchProvider: "",
    hasADR: false,
    hasPropulsion: true,
    hasHazardousMaterials: false,
    crossBorderOps: false,
    annualRevenueEur: 0,
    turnoversShareSpace: 0,
  });

  // UX-01: Debounce ref for text/number input API calls
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // UX-04: Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const debouncedUpdate = (field: string, value: unknown) => {
    // Update local state immediately
    setSelectedAssessment((prev) =>
      prev ? { ...prev, [field]: value } : prev,
    );

    // Debounce the API call
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
      updateAssessment({ [field]: value });
    }, 500);
  };

  const fetchAssessments = useCallback(async () => {
    try {
      const res = await fetch("/api/insurance");
      if (res.ok) {
        const data = await res.json();
        setAssessments(data.assessments || []);
        if (data.assessments?.length > 0 && !hasAutoSelected.current) {
          hasAutoSelected.current = true;
          setSelectedAssessment(data.assessments[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const createAssessment = async () => {
    setIsSaving(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setCreateError(errData?.error || `Request failed (${res.status})`);
        return;
      }
      const data = await res.json();
      setSelectedAssessment(data.assessment);
      setShowNewAssessment(false);
      fetchAssessments();
    } catch (error) {
      console.error("Error creating assessment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateAssessment = async (updates: Partial<Assessment>) => {
    if (!selectedAssessment) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/insurance/${selectedAssessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedAssessment(data.assessment);
        fetchAssessments();
      }
    } catch (error) {
      console.error("Error updating assessment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAssessment = async (id: string) => {
    try {
      const res = await fetch(`/api/insurance/${id}`, {
        method: "DELETE",
        headers: { ...csrfHeaders() },
      });
      if (res.ok) {
        if (selectedAssessment?.id === id) {
          setSelectedAssessment(null);
        }
        fetchAssessments();
      }
    } catch (error) {
      console.error("Error deleting assessment:", error);
    }
  };

  const updatePolicyStatus = async (
    insuranceType: string,
    updates: Partial<Policy>,
  ) => {
    if (!selectedAssessment) return;
    const policyId = selectedAssessment.policies.find(
      (p) => p.insuranceType === insuranceType,
    )?.id;
    if (policyId) setPolicySaving(policyId);
    try {
      const res = await fetch("/api/insurance/policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          assessmentId: selectedAssessment.id,
          insuranceType,
          ...updates,
        }),
      });
      if (!res.ok) throw new Error("Failed to update policy");
      const data = await res.json();
      setSelectedAssessment((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          complianceScore: data.complianceScore,
          policies: prev.policies.map((p) =>
            p.insuranceType === insuranceType ? data.policy : p,
          ),
        };
      });
    } catch (error) {
      console.error("Error updating policy:", error);
    } finally {
      setPolicySaving(null);
    }
  };

  const generateReport = async () => {
    if (!selectedAssessment) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/insurance/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ assessmentId: selectedAssessment.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
        setCurrentStep(4);
        fetchAssessments();
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // PDF download removed — use AI Document Studio instead

  const toggleSecondaryJurisdiction = (code: string) => {
    const current = selectedAssessment?.secondaryJurisdictions || [];
    const updated = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    updateAssessment({ secondaryJurisdictions: updated });
  };

  // Build profile for calculations
  const buildProfile = (): InsuranceRiskProfile | null => {
    if (!selectedAssessment) return null;
    return {
      primaryJurisdiction:
        selectedAssessment.primaryJurisdiction as JurisdictionCode,
      operatorType: selectedAssessment.operatorType as OperatorType,
      companySize: selectedAssessment.companySize as CompanySize,
      orbitRegime: selectedAssessment.orbitRegime as OrbitRegime,
      satelliteCount: selectedAssessment.satelliteCount,
      satelliteValueEur: selectedAssessment.satelliteValueEur || 0,
      totalMissionValueEur: selectedAssessment.totalMissionValueEur || 0,
      isConstellationOperator: selectedAssessment.isConstellationOperator,
      hasManeuverability: selectedAssessment.hasManeuverability,
      missionDurationYears: selectedAssessment.missionDurationYears,
      hasFlightHeritage: selectedAssessment.hasFlightHeritage,
      launchProvider: selectedAssessment.launchProvider || undefined,
      hasADR: selectedAssessment.hasADR,
      hasPropulsion: selectedAssessment.hasPropulsion,
      hasHazardousMaterials: selectedAssessment.hasHazardousMaterials,
      crossBorderOps: selectedAssessment.crossBorderOps,
      annualRevenueEur: selectedAssessment.annualRevenueEur || undefined,
      turnoversShareSpace: selectedAssessment.turnoversShareSpace || undefined,
    };
  };

  const profile = buildProfile();
  const tplRequirement = profile ? calculateTPLRequirement(profile) : null;
  const requiredTypes = profile ? getRequiredInsuranceTypes(profile) : [];
  const riskLevel = profile ? calculateMissionRiskLevel(profile) : null;
  const premiumEstimate =
    profile && requiredTypes.length > 0
      ? estimatePremiumRange(profile, requiredTypes)
      : null;

  // Multi-jurisdiction TPL analysis
  const multiJurisdictionTPL =
    profile && (selectedAssessment?.secondaryJurisdictions?.length ?? 0) > 0
      ? calculateMultiJurisdictionTPL(
          profile,
          selectedAssessment!.secondaryJurisdictions,
        )
      : null;

  // Get national requirements for selected jurisdiction
  const nationalReqs = selectedAssessment
    ? nationalRequirementsLookup[
        selectedAssessment.primaryJurisdiction as JurisdictionCode
      ]
    : null;

  // ─── IRPE Score Fetch ───────────────────────────────────────────────────────

  const fetchIRPEScore = useCallback(async () => {
    if (!selectedAssessment) return;
    setIrpeLoading(true);
    try {
      const res = await fetch(`/api/insurance/${selectedAssessment.id}/irpe`, {
        headers: csrfHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setIrpeScore(data);
      } else {
        setIrpeScore(null);
      }
    } catch {
      setIrpeScore(null);
    } finally {
      setIrpeLoading(false);
    }
  }, [selectedAssessment]);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
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
        <span className="sr-only">Loading insurance assessment...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px]">
      {/* Header */}
      <div className="mb-8">
        <p className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-3">
          MODULE 06
        </p>
        <h1 className="text-display-sm font-medium text-[var(--text-primary)] mb-1">
          Insurance Navigator
        </h1>
        <p className="text-body-lg text-[var(--text-secondary)]">
          Navigate EU national insurance requirements for space operations
        </p>
      </div>

      {/* Assessment selector and new button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {assessments.length > 0 && (
            <select
              value={selectedAssessment?.id || ""}
              onChange={(e) => {
                const assessment = assessments.find(
                  (a) => a.id === e.target.value,
                );
                setSelectedAssessment(assessment || null);
                setReport(null);
              }}
              aria-label="Select insurance assessment"
              className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-default)]"
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assessmentName || `Assessment ${a.id.slice(-6)}`}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={() => setShowNewAssessment(true)}
          className="flex items-center gap-2 bg-[var(--text-primary)] text-white px-5 py-2.5 rounded-lg font-medium text-body hover:bg-[var(--text-primary)] transition-all"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Assessment
        </button>
      </div>

      {/* Step Navigation */}
      {selectedAssessment && (
        <div className="mb-8">
          <div
            className="flex items-center gap-2"
            role="tablist"
            aria-label="Insurance assessment steps"
          >
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-step-${step.id}`}
                    id={`tab-step-${step.id}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-[var(--surface-sunken)] border border-[var(--border-default)]"
                        : "hover:bg-[var(--surface-sunken)]"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-caption ${
                        isActive
                          ? "bg-[var(--text-primary)] text-white"
                          : isCompleted
                            ? "bg-[var(--accent-success-soft)] text-[var(--accent-success)]"
                            : "bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={12} aria-hidden="true" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="text-left hidden lg:block">
                      <p
                        className={`text-body font-medium ${isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                      >
                        {step.name}
                      </p>
                    </div>
                  </button>
                  {index < STEPS.length - 1 && (
                    <ChevronRight
                      size={16}
                      className="text-[var(--text-tertiary)] mx-1"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {!selectedAssessment ? (
          <motion.div
            key="empty"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-12 text-center"
          >
            <Shield
              className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4"
              aria-hidden="true"
            />
            <h2 className="text-xl font-semibold mb-2">
              No Insurance Assessments
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Create your first insurance assessment to get started
            </p>
            <button
              onClick={() => setShowNewAssessment(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--text-primary)] text-white hover:bg-[var(--text-primary)] rounded-lg font-medium text-body transition-all"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
              Create Assessment
            </button>
          </motion.div>
        ) : (
          <>
            {/* Step 1: Risk Profile */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building2
                      className="w-5 h-5 text-[var(--accent-primary)]"
                      aria-hidden="true"
                    />
                    Organization & Mission Profile
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-2">
                        Primary Jurisdiction
                      </label>
                      <select
                        value={selectedAssessment.primaryJurisdiction}
                        onChange={(e) =>
                          updateAssessment({
                            primaryJurisdiction: e.target.value,
                          })
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      >
                        {nationalInsuranceRequirements.map((req) => (
                          <option
                            key={req.jurisdictionCode}
                            value={req.jurisdictionCode}
                          >
                            {req.flag} {req.country}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                      <label className="block text-sm text-[var(--text-secondary)] mb-1">
                        Weitere Jurisdiktionen (optional)
                      </label>
                      <p className="text-small text-[var(--text-tertiary)] mb-2">
                        F&uuml;r Cross-Border-Operationen: z.B. Launch von
                        Kourou (Frankreich) mit deutscher Registrierung
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {JURISDICTIONS.filter(
                          (j) =>
                            j.code !== selectedAssessment?.primaryJurisdiction,
                        ).map((j) => {
                          const isSelected = (
                            selectedAssessment?.secondaryJurisdictions || []
                          ).includes(j.code);
                          return (
                            <button
                              key={j.code}
                              onClick={() =>
                                toggleSecondaryJurisdiction(j.code)
                              }
                              className={`px-3 py-1.5 rounded-lg text-small border transition-colors ${
                                isSelected
                                  ? "bg-[var(--surface-sunken)] border-[var(--border-default)] text-[var(--text-primary)] font-medium"
                                  : "bg-transparent border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                              }`}
                            >
                              {j.flag} {j.code}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-2">
                        Operator Type
                      </label>
                      <select
                        value={selectedAssessment.operatorType}
                        onChange={(e) =>
                          updateAssessment({ operatorType: e.target.value })
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      >
                        {Object.entries(operatorTypeConfig).map(
                          ([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-2">
                        Company Size
                      </label>
                      <select
                        value={selectedAssessment.companySize}
                        onChange={(e) =>
                          updateAssessment({ companySize: e.target.value })
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      >
                        {Object.entries(companySizeConfig).map(
                          ([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-2">
                        Orbit Regime
                      </label>
                      <select
                        value={selectedAssessment.orbitRegime}
                        onChange={(e) =>
                          updateAssessment({ orbitRegime: e.target.value })
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      >
                        {Object.entries(orbitRegimeConfig).map(
                          ([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-2">
                        Number of Satellites
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={selectedAssessment.satelliteCount}
                        onChange={(e) =>
                          debouncedUpdate(
                            "satelliteCount",
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-2">
                        Mission Duration (years)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={selectedAssessment.missionDurationYears}
                        onChange={(e) =>
                          debouncedUpdate(
                            "missionDurationYears",
                            parseInt(e.target.value) || 5,
                          )
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-2">
                        Satellite Value (EUR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={selectedAssessment.satelliteValueEur || 0}
                        onChange={(e) =>
                          debouncedUpdate(
                            "satelliteValueEur",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-2">
                        Total Mission Value (EUR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={selectedAssessment.totalMissionValueEur || 0}
                        onChange={(e) =>
                          debouncedUpdate(
                            "totalMissionValueEur",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-2">
                        Launch Provider
                      </label>
                      <select
                        value={selectedAssessment.launchProvider || ""}
                        onChange={(e) =>
                          updateAssessment({
                            launchProvider: e.target.value || null,
                          })
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      >
                        <option value="">Select provider</option>
                        {commonLaunchProviders.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-2">
                        Annual Revenue (EUR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={selectedAssessment.annualRevenueEur || 0}
                        onChange={(e) =>
                          debouncedUpdate(
                            "annualRevenueEur",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-2">
                        Space Turnover Share (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={selectedAssessment.turnoversShareSpace || 0}
                        onChange={(e) =>
                          debouncedUpdate(
                            "turnoversShareSpace",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-[var(--border-default)]">
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
                      Risk Factors
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        {
                          key: "hasFlightHeritage",
                          label: "Flight Heritage",
                        },
                        {
                          key: "hasManeuverability",
                          label: "Has Maneuverability",
                        },
                        { key: "hasPropulsion", label: "Has Propulsion" },
                        {
                          key: "isConstellationOperator",
                          label: "Constellation Operator",
                        },
                        {
                          key: "hasHazardousMaterials",
                          label: "Hazardous Materials",
                        },
                        { key: "hasADR", label: "Active Debris Removal" },
                        {
                          key: "crossBorderOps",
                          label: "Cross-Border Operations",
                        },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={
                              selectedAssessment[
                                key as keyof Assessment
                              ] as boolean
                            }
                            onChange={(e) =>
                              updateAssessment({ [key]: e.target.checked })
                            }
                            className="w-4 h-4 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded"
                          />
                          <span className="text-sm text-[var(--text-secondary)]">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {nationalReqs && (
                  <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MapPin
                        className="w-5 h-5 text-[var(--accent-warning)]"
                        aria-hidden="true"
                      />
                      {nationalReqs.flag} {nationalReqs.country} Insurance
                      Requirements
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Legal Framework
                        </h3>
                        <p className="text-[var(--text-primary)]">
                          {nationalReqs.hasSpaceLaw
                            ? nationalReqs.lawName
                            : "No dedicated space law"}
                        </p>
                        {nationalReqs.lawYear && (
                          <p className="text-[var(--text-secondary)] text-sm">
                            Enacted: {nationalReqs.lawYear}
                          </p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                          TPL Requirements
                        </h3>
                        <p className="text-[var(--text-primary)]">
                          {nationalReqs.minimumTPL > 0
                            ? formatCurrency(nationalReqs.minimumTPL)
                            : nationalReqs.tplFormula ||
                              "Determined case-by-case"}
                        </p>
                        {nationalReqs.governmentGuarantee && (
                          <p className="text-[var(--accent-success)] text-sm mt-1">
                            State indemnification available
                          </p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Registration Authority
                        </h3>
                        <p className="text-[var(--text-primary)]">
                          {nationalReqs.registrationAuthority ||
                            "Not specified"}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Financial Guarantee
                        </h3>
                        <p className="text-[var(--text-primary)]">
                          {nationalReqs.financialGuaranteeAccepted
                            ? "Accepted"
                            : "Not accepted"}
                        </p>
                      </div>
                    </div>

                    {nationalReqs.notes && nationalReqs.notes.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Notes
                        </h3>
                        <ul className="space-y-1">
                          {nationalReqs.notes.map((note, i) => (
                            <li
                              key={i}
                              className="text-sm text-[var(--text-secondary)] flex items-start gap-2"
                            >
                              <Info
                                className="w-4 h-4 text-[var(--accent-primary)] mt-0.5 flex-shrink-0"
                                aria-hidden="true"
                              />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--text-primary)] text-white hover:bg-[var(--text-primary)] rounded-lg font-medium text-body transition-all"
                  >
                    Continue to Coverage Calculator
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Coverage Calculator */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {tplRequirement && (
                  <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield
                        className="w-5 h-5 text-[var(--accent-danger)]"
                        aria-hidden="true"
                      />
                      Third-Party Liability Requirement
                    </h2>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-bold text-[var(--text-primary)]">
                          {formatCurrency(tplRequirement.amount)}
                        </p>
                        <p className="text-[var(--text-secondary)]">
                          {tplRequirement.explanation}
                        </p>
                      </div>
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          riskLevel === "low"
                            ? "bg-[var(--accent-success-soft)] text-[var(--accent-success)]"
                            : riskLevel === "medium"
                              ? "bg-[var(--accent-success-soft)] text-[var(--accent-primary)]"
                              : riskLevel === "high"
                                ? "bg-orange-500/20 text-orange-400"
                                : "bg-[var(--accent-danger-soft)] text-[var(--accent-danger)]"
                        }`}
                      >
                        <p className="text-sm font-medium">
                          {riskLevelConfig[riskLevel as MissionRiskLevel]
                            ?.label || "Unknown"}
                        </p>
                        <p className="text-xs opacity-70">Risk Level</p>
                      </div>
                    </div>

                    {tplRequirement.notes.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                        <ul className="space-y-1">
                          {tplRequirement.notes.map((note, i) => (
                            <li
                              key={i}
                              className="text-sm text-[var(--text-secondary)] flex items-start gap-2"
                            >
                              <Info
                                className="w-4 h-4 text-[var(--accent-primary)] mt-0.5 flex-shrink-0"
                                aria-hidden="true"
                              />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {multiJurisdictionTPL && (
                  <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MapPin
                        className="w-5 h-5 text-[var(--accent-warning)]"
                        aria-hidden="true"
                      />
                      Multi-Jurisdiktion TPL-Vergleich
                    </h2>
                    <div className="space-y-2">
                      <div className="flex justify-between text-body">
                        <span className="text-[var(--text-secondary)]">
                          {multiJurisdictionTPL.primary.jurisdiction}{" "}
                          (Prim&auml;r)
                        </span>
                        <span className="text-[var(--text-primary)] font-medium">
                          {formatCurrency(multiJurisdictionTPL.primary.amount)}
                        </span>
                      </div>
                      {multiJurisdictionTPL.secondary.map((s) => (
                        <div
                          key={s.jurisdiction}
                          className="flex justify-between text-body"
                        >
                          <span className="text-[var(--text-tertiary)]">
                            {s.jurisdiction}
                          </span>
                          <span className="text-[var(--text-secondary)]">
                            {formatCurrency(s.amount)}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 mt-2 border-t border-[var(--border-default)] flex justify-between text-body font-medium">
                        <span className="text-[var(--text-primary)]">
                          Effektive TPL (
                          {multiJurisdictionTPL.effectiveJurisdiction})
                        </span>
                        <span className="text-[var(--text-primary)]">
                          {formatCurrency(multiJurisdictionTPL.effectiveTPL)}
                        </span>
                      </div>
                      <p className="text-small text-[var(--text-tertiary)] mt-1">
                        Die h&ouml;chste Anforderung aller anwendbaren
                        Jurisdiktionen gilt.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText
                      className="w-5 h-5 text-[var(--accent-primary)]"
                      aria-hidden="true"
                    />
                    Required Insurance Coverage
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(insuranceTypeDefinitions).map(
                      ([type, def]) => {
                        const isRequired = requiredTypes.includes(
                          type as InsuranceType,
                        );
                        return (
                          <div
                            key={type}
                            className={`p-4 rounded-lg border ${
                              isRequired
                                ? "bg-[var(--accent-primary-soft)] border-[var(--accent-success)/30]"
                                : "bg-[var(--surface-sunken)] border-[var(--border-default)]"
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              {insuranceTypeIcons[type as InsuranceType]}
                              <h3 className="font-medium">{def.name}</h3>
                              {isRequired && (
                                <span className="ml-auto text-xs px-2 py-1 bg-[var(--accent-success-soft)] text-[var(--accent-primary)] rounded">
                                  Required
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {def.description}
                            </p>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {premiumEstimate && (
                  <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <DollarSign
                        className="w-5 h-5 text-[var(--accent-success)]"
                        aria-hidden="true"
                      />
                      Premium Estimate
                    </h2>

                    <div className="mb-4">
                      <p className="text-sm text-[var(--text-secondary)]">
                        Estimated Annual Premium
                      </p>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {formatCurrency(premiumEstimate.total.min)} -{" "}
                        {formatCurrency(premiumEstimate.total.max)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(premiumEstimate.breakdown).map(
                        ([type, range]) => (
                          <div
                            key={type}
                            className="bg-[var(--surface-sunken)] rounded-lg p-3"
                          >
                            <p className="text-xs text-[var(--text-secondary)] mb-1">
                              {
                                insuranceTypeDefinitions[type as InsuranceType]
                                  ?.name
                              }
                            </p>
                            <p className="text-sm font-medium">
                              {formatCurrency(range.min)} -{" "}
                              {formatCurrency(range.max)}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                    <p className="text-small text-[var(--text-tertiary)] mt-2 italic">
                      Indikative Marktschätzung für Planungszwecke. Tatsächliche
                      Prämien werden von Versicherern basierend auf
                      vollständigen Missionsdaten festgelegt.
                    </p>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="flex items-center gap-2 px-4 py-2 text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--text-primary)] text-white hover:bg-[var(--text-primary)] rounded-lg font-medium text-body transition-all"
                  >
                    Continue to Policy Tracker
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Policy Tracker */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <CheckCircle2
                        className="w-5 h-5 text-[var(--accent-success)]"
                        aria-hidden="true"
                      />
                      Insurance Compliance Score
                    </h2>
                    <div className="text-3xl font-bold">
                      {selectedAssessment.complianceScore || 0}%
                    </div>
                  </div>
                  <div
                    className="w-full bg-[var(--surface-sunken)] rounded-full h-3"
                    role="progressbar"
                    aria-valuenow={selectedAssessment.complianceScore || 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Insurance compliance score"
                  >
                    <div
                      className={`h-3 rounded-full transition-all ${
                        (selectedAssessment.complianceScore || 0) >= 80
                          ? "bg-[var(--accent-success)]"
                          : (selectedAssessment.complianceScore || 0) >= 50
                            ? "bg-yellow-500"
                            : "bg-[var(--accent-danger)]"
                      }`}
                      style={{
                        width: `${selectedAssessment.complianceScore || 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedAssessment.policies.map((policy) => {
                    const typeDef =
                      insuranceTypeDefinitions[
                        policy.insuranceType as InsuranceType
                      ];
                    const statusConfig =
                      policyStatusConfig[policy.status as PolicyStatus];
                    const isRequired = requiredTypes.includes(
                      policy.insuranceType as InsuranceType,
                    );

                    return (
                      <div
                        key={policy.id}
                        className={`bg-[var(--surface-raised)] border rounded-xl p-6 ${
                          isRequired
                            ? "border-[var(--accent-success)/30]"
                            : "border-[var(--border-default)]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {
                              insuranceTypeIcons[
                                policy.insuranceType as InsuranceType
                              ]
                            }
                            <div>
                              <h3 className="font-medium">
                                {typeDef?.name || policy.insuranceType}
                              </h3>
                              <p className="text-sm text-[var(--text-secondary)]">
                                {typeDef?.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {policySaving === policy.id && (
                              <Loader2
                                className="animate-spin text-[var(--text-secondary)]"
                                size={14}
                              />
                            )}
                            {isRequired && (
                              <span className="text-xs px-2 py-1 bg-[var(--accent-success-soft)] text-[var(--accent-primary)] rounded">
                                Required
                              </span>
                            )}
                            <select
                              value={policy.status}
                              onChange={(e) =>
                                updatePolicyStatus(policy.insuranceType, {
                                  status: e.target.value,
                                })
                              }
                              aria-label={`Policy status for ${typeDef?.name || policy.insuranceType}`}
                              className={`bg-[var(--surface-raised)] border rounded-lg px-3 py-1.5 text-sm ${
                                statusConfig?.color === "green"
                                  ? "border-[var(--accent-success)/30] text-[var(--accent-success)]"
                                  : statusConfig?.color === "blue"
                                    ? "border-[var(--accent-success)/30] text-[var(--accent-primary)]"
                                    : statusConfig?.color === "yellow"
                                      ? "border-yellow-500/30 text-yellow-400"
                                      : statusConfig?.color === "orange"
                                        ? "border-orange-500/30 text-orange-400"
                                        : statusConfig?.color === "red"
                                          ? "border-[var(--accent-danger)/30] text-[var(--accent-danger)]"
                                          : "border-[var(--border-default)] text-[var(--text-secondary)]"
                              }`}
                            >
                              {Object.entries(policyStatusConfig).map(
                                ([key, config]) => (
                                  <option key={key} value={key}>
                                    {config.label}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        </div>

                        {/* ASTRA AI Agent */}
                        <div className="mb-4">
                          <AstraButton
                            articleId={policy.id}
                            articleRef={`Insurance — ${selectedAssessment?.primaryJurisdiction || "EU"} national law`}
                            title={typeDef?.name || policy.insuranceType}
                            severity={isRequired ? "critical" : "major"}
                            regulationType="INSURANCE"
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-[var(--text-secondary)]">
                              Coverage Amount
                            </p>
                            <input
                              type="number"
                              placeholder="Enter amount"
                              value={policy.coverageAmount || ""}
                              onChange={(e) =>
                                updatePolicyStatus(policy.insuranceType, {
                                  coverageAmount:
                                    parseFloat(e.target.value) || null,
                                })
                              }
                              className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-body text-[var(--text-primary)] mt-1 focus:outline-none focus:border-[var(--border-default)]"
                            />
                          </div>
                          <div>
                            <p className="text-[var(--text-secondary)]">
                              Premium
                            </p>
                            <input
                              type="number"
                              placeholder="Annual premium"
                              value={policy.premium || ""}
                              onChange={(e) =>
                                updatePolicyStatus(policy.insuranceType, {
                                  premium: parseFloat(e.target.value) || null,
                                })
                              }
                              className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-body text-[var(--text-primary)] mt-1 focus:outline-none focus:border-[var(--border-default)]"
                            />
                          </div>
                          <div>
                            <p className="text-[var(--text-secondary)]">
                              Insurer
                            </p>
                            <input
                              type="text"
                              placeholder="Insurer name"
                              value={policy.insurer || ""}
                              onChange={(e) =>
                                updatePolicyStatus(policy.insuranceType, {
                                  insurer: e.target.value || null,
                                })
                              }
                              className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-body text-[var(--text-primary)] mt-1 focus:outline-none focus:border-[var(--border-default)]"
                            />
                          </div>
                          <div>
                            <p className="text-[var(--text-secondary)]">
                              Expiration Date
                            </p>
                            <input
                              type="date"
                              value={policy.expirationDate?.split("T")[0] || ""}
                              onChange={(e) =>
                                updatePolicyStatus(policy.insuranceType, {
                                  expirationDate: e.target.value || null,
                                })
                              }
                              className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-body text-[var(--text-primary)] mt-1 focus:outline-none focus:border-[var(--border-default)]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center gap-2 px-4 py-2 text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                    Back
                  </button>
                  <button
                    onClick={generateReport}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--text-primary)] text-white hover:bg-[var(--text-primary)] disabled:opacity-50 rounded-lg font-medium text-body transition-all"
                  >
                    {isSaving ? "Generating..." : "Generate Report"}
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Compliance Report */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {report ? (
                  <>
                    <div className="bg-gradient-to-r from-[var(--accent-primary-soft)] to-[var(--accent-info-soft)] border border-[var(--accent-success)/30] rounded-xl p-6">
                      <h2 className="text-xl font-medium mb-2">
                        Insurance Compliance Report
                      </h2>
                      <p className="text-[var(--text-secondary)]">
                        Generated on{" "}
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Organization Profile
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-[var(--text-secondary)]">
                            Jurisdiction
                          </p>
                          <p className="font-medium">
                            {report.organizationProfile.jurisdictionName}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--text-secondary)]">
                            Operator Type
                          </p>
                          <p className="font-medium">
                            {report.organizationProfile.operatorType}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--text-secondary)]">
                            Risk Level
                          </p>
                          <p className="font-medium">
                            {report.organizationProfile.riskLevel}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        TPL Requirement
                      </h3>
                      <div className="text-3xl font-bold text-[var(--accent-primary)] mb-2">
                        {formatCurrency(report.tplRequirement.amount)}
                      </div>
                      <p className="text-[var(--text-secondary)]">
                        {report.tplRequirement.explanation}
                      </p>
                    </div>

                    <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Compliance Status
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold">
                            {report.complianceStatus.score}%
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Overall Score
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-[var(--accent-primary)]">
                            {report.complianceStatus.requiredPolicies}
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Required
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-[var(--accent-success)]">
                            {report.complianceStatus.activePolicies}
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Active
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-400">
                            {report.complianceStatus.pendingPolicies}
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Pending
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-[var(--accent-danger)]">
                            {report.complianceStatus.missingPolicies}
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Missing
                          </p>
                        </div>
                      </div>
                    </div>

                    {report.recommendations.length > 0 && (
                      <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">
                          Recommendations
                        </h3>
                        <ul className="space-y-3">
                          {report.recommendations.map(
                            (rec: string, i: number) => (
                              <li
                                key={i}
                                className="flex items-start gap-3 text-[var(--text-secondary)]"
                              >
                                <CheckCircle2
                                  className="w-5 h-5 text-[var(--accent-primary)] mt-0.5 flex-shrink-0"
                                  aria-hidden="true"
                                />
                                {rec}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {/* ─── IRPE: Insurance Risk Pricing Engine ─── */}
                    <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <BarChart3
                            className="w-5 h-5 text-[var(--text-primary)]"
                            aria-hidden="true"
                          />
                          <h3 className="text-lg font-semibold">
                            Risk Pricing Score (IRPE)
                          </h3>
                        </div>
                        <button
                          onClick={fetchIRPEScore}
                          disabled={irpeLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-sunken)] hover:bg-[var(--border-default)] border border-[var(--border-default)] rounded-lg text-body font-medium transition-all disabled:opacity-50"
                        >
                          {irpeLoading ? (
                            <Loader2
                              className="w-4 h-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <TrendingUp
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                          )}
                          {irpeLoading
                            ? "Berechnung..."
                            : irpeScore
                              ? "Aktualisieren"
                              : "IRPE Report generieren"}
                        </button>
                      </div>

                      {irpeScore ? (
                        <div className="space-y-5">
                          {/* Overall Grade */}
                          <div className="flex items-center gap-6">
                            <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] flex items-center justify-center">
                              <span className="text-3xl font-bold text-[var(--text-primary)]">
                                {irpeScore.riskGrade}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-body-lg font-medium text-[var(--text-primary)]">
                                Risiko-Score: {irpeScore.overallRiskScore}/100
                              </p>
                              <p className="text-body text-[var(--text-secondary)] mt-1">
                                {irpeScore.premiumImpact}
                              </p>
                              <p className="text-caption text-[var(--text-tertiary)] mt-1">
                                Datenvollständigkeit:{" "}
                                {irpeScore.dataCompleteness}% — Berechnet am{" "}
                                {new Date(
                                  irpeScore.calculatedAt,
                                ).toLocaleDateString("de-DE")}
                              </p>
                            </div>
                          </div>

                          {/* Component Breakdown */}
                          <div className="space-y-2.5">
                            <p className="text-small font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                              Komponenten
                            </p>
                            {(
                              [
                                {
                                  label: "Missionsrisiko",
                                  data: irpeScore.components.missionRisk,
                                  weight: "30%",
                                },
                                {
                                  label: "Compliance-Status",
                                  data: irpeScore.components.compliancePosture,
                                  weight: "25%",
                                },
                                {
                                  label: "Betriebliche Reife",
                                  data: irpeScore.components
                                    .operationalMaturity,
                                  weight: "20%",
                                },
                                {
                                  label: "Cybersicherheit",
                                  data: irpeScore.components
                                    .cybersecurityReadiness,
                                  weight: "15%",
                                },
                                {
                                  label: "Vorfallhistorie",
                                  data: irpeScore.components.incidentHistory,
                                  weight: "10%",
                                },
                              ] as const
                            ).map((comp) => (
                              <div
                                key={comp.label}
                                className="flex items-center gap-3"
                              >
                                <span className="text-body text-[var(--text-secondary)] w-40 flex-shrink-0">
                                  {comp.label}{" "}
                                  <span className="text-caption text-[var(--text-tertiary)]">
                                    ({comp.weight})
                                  </span>
                                </span>
                                <div className="flex-1 h-2 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all bg-[var(--text-tertiary)]"
                                    style={{
                                      width: `${100 - comp.data.score}%`,
                                      opacity: comp.data.score <= 30 ? 1 : 0.5,
                                    }}
                                  />
                                </div>
                                <span className="text-body font-medium text-[var(--text-primary)] w-8 text-right">
                                  {comp.data.grade}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Premium Impact */}
                          {irpeScore.premiumAdjustment.savingsPercent !== 0 && (
                            <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg p-4">
                              <p className="text-body font-medium text-[var(--text-primary)]">
                                Geschätzte Prämienauswirkung
                              </p>
                              <p className="text-body-lg font-semibold text-[var(--text-primary)] mt-1">
                                {irpeScore.premiumAdjustment.savingsPercent > 0
                                  ? `+${irpeScore.premiumAdjustment.savingsPercent}%`
                                  : `${irpeScore.premiumAdjustment.savingsPercent}%`}{" "}
                                gegenüber Marktdurchschnitt
                              </p>
                              {irpeScore.premiumAdjustment.annualSavingsEstimate
                                .max > 0 && (
                                <p className="text-small text-[var(--text-secondary)] mt-1">
                                  Geschätzte jährliche Einsparung:{" "}
                                  {formatCurrency(
                                    irpeScore.premiumAdjustment
                                      .annualSavingsEstimate.min,
                                  )}{" "}
                                  bis{" "}
                                  {formatCurrency(
                                    irpeScore.premiumAdjustment
                                      .annualSavingsEstimate.max,
                                  )}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Improvement Recommendations */}
                          {irpeScore.improvements.length > 0 && (
                            <div>
                              <p className="text-small font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">
                                Verbesserungsempfehlungen
                              </p>
                              <div className="space-y-2">
                                {irpeScore.improvements
                                  .slice(0, 3)
                                  .map((imp, i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-3 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg p-3"
                                    >
                                      <TrendingUp
                                        className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0"
                                        aria-hidden="true"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-body font-medium text-[var(--text-primary)]">
                                          {imp.action}
                                        </p>
                                        <p className="text-small text-[var(--text-secondary)] mt-0.5">
                                          {imp.projectedImpact}
                                        </p>
                                      </div>
                                      <span className="text-caption font-medium text-[var(--text-tertiary)] flex-shrink-0 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded px-2 py-0.5">
                                        -{imp.estimatedPremiumReduction}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <BarChart3
                            className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3"
                            aria-hidden="true"
                          />
                          <p className="text-body text-[var(--text-secondary)]">
                            Der IRPE-Report aggregiert Compliance-Daten aus
                            allen Modulen und berechnet einen Risiko-Score für
                            Versicherer.
                          </p>
                          <p className="text-small text-[var(--text-tertiary)] mt-1">
                            Je besser der Score, desto günstiger die Prämien.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-12 text-center">
                    <FileText
                      className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4"
                      aria-hidden="true"
                    />
                    <h2 className="text-xl font-semibold mb-2">
                      No Report Generated
                    </h2>
                    <p className="text-[var(--text-secondary)] mb-6">
                      Complete the policy tracker to generate your compliance
                      report
                    </p>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--text-primary)] text-white hover:bg-[var(--text-primary)] rounded-lg font-medium text-body transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                      Go to Policy Tracker
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-2 px-4 py-2 text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                    Back
                  </button>
                  <div className="flex items-center gap-3">
                    {selectedAssessment && report && (
                      <Link
                        href="/dashboard/documents/generate?type=INSURANCE_COMPLIANCE"
                        className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-success-soft)] border border-[var(--accent-success)/30] rounded-lg text-[var(--accent-primary)] font-medium text-body transition-all"
                      >
                        <Zap className="w-4 h-4" aria-hidden="true" />
                        Generate with ASTRA
                      </Link>
                    )}
                    {selectedAssessment && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-danger)]/10 hover:bg-[var(--accent-danger-soft)] border border-[var(--accent-danger)/30] rounded-lg text-[var(--accent-danger)] font-medium transition-colors"
                      >
                        <Trash2 className="w-5 h-5" aria-hidden="true" />
                        Delete Assessment
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* New Assessment Modal */}
      <AnimatePresence>
        {showNewAssessment && (
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowNewAssessment(false);
              setCreateError(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="New Insurance Assessment"
              aria-modal="true"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  New Insurance Assessment
                </h2>
                <button
                  onClick={() => {
                    setShowNewAssessment(false);
                    setCreateError(null);
                  }}
                  aria-label="Close dialog"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">
                    Assessment Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Mission Alpha Insurance"
                    value={formData.assessmentName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assessmentName: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">
                    Primary Jurisdiction
                  </label>
                  <select
                    value={formData.primaryJurisdiction}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryJurisdiction: e.target.value as JurisdictionCode,
                      })
                    }
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                  >
                    {nationalInsuranceRequirements.map((req) => (
                      <option
                        key={req.jurisdictionCode}
                        value={req.jurisdictionCode}
                      >
                        {req.flag} {req.country}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">
                    Operator Type
                  </label>
                  <select
                    value={formData.operatorType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatorType: e.target.value as OperatorType,
                      })
                    }
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                  >
                    {Object.entries(operatorTypeConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">
                    Company Size
                  </label>
                  <select
                    value={formData.companySize}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companySize: e.target.value as CompanySize,
                      })
                    }
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                  >
                    {Object.entries(companySizeConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">
                    Orbit Regime
                  </label>
                  <select
                    value={formData.orbitRegime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        orbitRegime: e.target.value as OrbitRegime,
                      })
                    }
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)] text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                  >
                    {Object.entries(orbitRegimeConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {createError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 text-[var(--accent-danger)] text-body mt-6">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowNewAssessment(false);
                    setCreateError(null);
                  }}
                  className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createAssessment}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[var(--text-primary)] text-white hover:bg-[var(--text-primary)] disabled:opacity-50 rounded-lg font-medium text-body transition-all"
                >
                  {isSaving ? "Creating..." : "Create Assessment"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal (UX-04) */}
      {showDeleteConfirm && selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6 max-w-md">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Assessment löschen?
            </h3>
            <p className="text-body text-[var(--text-secondary)]">
              Alle zugehörigen Policen und Berichte werden unwiderruflich
              gelöscht.
            </p>
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  deleteAssessment(selectedAssessment.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-[var(--accent-danger)] text-white rounded-lg font-medium transition-colors hover:opacity-90"
              >
                Endgültig löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InsurancePage() {
  return (
    <FeatureGate module="insurance">
      <InsurancePageContent />
    </FeatureGate>
  );
}
