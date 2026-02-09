"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Infinity,
  Send,
  Eye,
  Minus,
  XCircle,
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

interface Assessment {
  id: string;
  assessmentName: string | null;
  primaryJurisdiction: string;
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
  });

  const fetchAssessments = useCallback(async () => {
    try {
      const res = await fetch("/api/insurance");
      if (res.ok) {
        const data = await res.json();
        setAssessments(data.assessments || []);
        if (data.assessments?.length > 0 && !selectedAssessment) {
          setSelectedAssessment(data.assessments[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAssessment]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const createAssessment = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedAssessment(data.assessment);
        setShowNewAssessment(false);
        fetchAssessments();
      }
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
        headers: { "Content-Type": "application/json" },
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
    if (!confirm("Delete this insurance assessment?")) return;
    try {
      const res = await fetch(`/api/insurance/${id}`, { method: "DELETE" });
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
    try {
      const res = await fetch("/api/insurance/policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: selectedAssessment.id,
          insuranceType,
          ...updates,
        }),
      });
      if (res.ok) {
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
      }
    } catch (error) {
      console.error("Error updating policy:", error);
    }
  };

  const generateReport = async () => {
    if (!selectedAssessment) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/insurance/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // Get national requirements for selected jurisdiction
  const nationalReqs = selectedAssessment
    ? nationalRequirementsLookup[
        selectedAssessment.primaryJurisdiction as JurisdictionCode
      ]
    : null;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
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
          MODULE 06
        </p>
        <h1 className="text-[24px] font-medium text-slate-900 dark:text-white mb-1">
          Insurance Navigator
        </h1>
        <p className="text-[14px] text-slate-600 dark:text-white/70">
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
              className="bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
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
          className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-lg font-medium text-[13px] hover:bg-slate-800 dark:hover:bg-white/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Assessment
        </button>
      </div>

      {/* Step Navigation */}
      {selectedAssessment && (
        <div className="mb-8">
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1]"
                        : "hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono ${
                        isActive
                          ? "bg-slate-900 dark:bg-white text-white dark:text-black"
                          : isCompleted
                            ? "bg-green-500/20 text-green-400"
                            : "bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/70"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 size={12} /> : step.id}
                    </div>
                    <div className="text-left hidden lg:block">
                      <p
                        className={`text-[13px] font-medium ${isActive ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-white/60"}`}
                      >
                        {step.name}
                      </p>
                    </div>
                  </button>
                  {index < STEPS.length - 1 && (
                    <ChevronRight
                      size={16}
                      className="text-slate-300 dark:text-white/10 mx-1"
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-12 text-center"
          >
            <Shield className="w-16 h-16 text-slate-400 dark:text-white/60 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              No Insurance Assessments
            </h2>
            <p className="text-slate-600 dark:text-white/70 mb-6">
              Create your first insurance assessment to get started
            </p>
            <button
              onClick={() => setShowNewAssessment(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-white/90 rounded-lg font-medium text-[13px] transition-all"
            >
              <Plus className="w-5 h-5" />
              Create Assessment
            </button>
          </motion.div>
        ) : (
          <>
            {/* Step 1: Risk Profile */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    Organization & Mission Profile
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
                        Primary Jurisdiction
                      </label>
                      <select
                        value={selectedAssessment.primaryJurisdiction}
                        onChange={(e) =>
                          updateAssessment({
                            primaryJurisdiction: e.target.value,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
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
                      <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
                        Operator Type
                      </label>
                      <select
                        value={selectedAssessment.operatorType}
                        onChange={(e) =>
                          updateAssessment({ operatorType: e.target.value })
                        }
                        className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
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
                      <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
                        Company Size
                      </label>
                      <select
                        value={selectedAssessment.companySize}
                        onChange={(e) =>
                          updateAssessment({ companySize: e.target.value })
                        }
                        className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
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
                      <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
                        Orbit Regime
                      </label>
                      <select
                        value={selectedAssessment.orbitRegime}
                        onChange={(e) =>
                          updateAssessment({ orbitRegime: e.target.value })
                        }
                        className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
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
                      <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
                        Number of Satellites
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={selectedAssessment.satelliteCount}
                        onChange={(e) =>
                          updateAssessment({
                            satelliteCount: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
                        Mission Duration (years)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={selectedAssessment.missionDurationYears}
                        onChange={(e) =>
                          updateAssessment({
                            missionDurationYears: parseInt(e.target.value) || 5,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
                        Satellite Value (EUR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={selectedAssessment.satelliteValueEur || 0}
                        onChange={(e) =>
                          updateAssessment({
                            satelliteValueEur: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
                        Total Mission Value (EUR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={selectedAssessment.totalMissionValueEur || 0}
                        onChange={(e) =>
                          updateAssessment({
                            totalMissionValueEur:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
                        Launch Provider
                      </label>
                      <select
                        value={selectedAssessment.launchProvider || ""}
                        onChange={(e) =>
                          updateAssessment({
                            launchProvider: e.target.value || null,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                      >
                        <option value="">Select provider</option>
                        {commonLaunchProviders.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
                    <h3 className="text-sm font-medium text-slate-600 dark:text-white/70 mb-4">
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
                            className="w-4 h-4 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded"
                          />
                          <span className="text-sm text-slate-600 dark:text-white/70">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {nationalReqs && (
                  <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-amber-400" />
                      {nationalReqs.flag} {nationalReqs.country} Insurance
                      Requirements
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-slate-600 dark:text-white/70 mb-2">
                          Legal Framework
                        </h3>
                        <p className="text-slate-900 dark:text-white">
                          {nationalReqs.hasSpaceLaw
                            ? nationalReqs.lawName
                            : "No dedicated space law"}
                        </p>
                        {nationalReqs.lawYear && (
                          <p className="text-slate-600 dark:text-white/70 text-sm">
                            Enacted: {nationalReqs.lawYear}
                          </p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-slate-600 dark:text-white/70 mb-2">
                          TPL Requirements
                        </h3>
                        <p className="text-slate-900 dark:text-white">
                          {nationalReqs.minimumTPL > 0
                            ? formatCurrency(nationalReqs.minimumTPL)
                            : nationalReqs.tplFormula ||
                              "Determined case-by-case"}
                        </p>
                        {nationalReqs.governmentGuarantee && (
                          <p className="text-green-400 text-sm mt-1">
                            State indemnification available
                          </p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-slate-600 dark:text-white/70 mb-2">
                          Registration Authority
                        </h3>
                        <p className="text-slate-900 dark:text-white">
                          {nationalReqs.registrationAuthority ||
                            "Not specified"}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-slate-600 dark:text-white/70 mb-2">
                          Financial Guarantee
                        </h3>
                        <p className="text-slate-900 dark:text-white">
                          {nationalReqs.financialGuaranteeAccepted
                            ? "Accepted"
                            : "Not accepted"}
                        </p>
                      </div>
                    </div>

                    {nationalReqs.notes && nationalReqs.notes.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                        <h3 className="text-sm font-medium text-slate-600 dark:text-white/70 mb-2">
                          Notes
                        </h3>
                        <ul className="space-y-1">
                          {nationalReqs.notes.map((note, i) => (
                            <li
                              key={i}
                              className="text-sm text-slate-600 dark:text-white/70 flex items-start gap-2"
                            >
                              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
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
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-white/90 rounded-lg font-medium text-[13px] transition-all"
                  >
                    Continue to Coverage Calculator
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Coverage Calculator */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {tplRequirement && (
                  <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-400" />
                      Third-Party Liability Requirement
                    </h2>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(tplRequirement.amount)}
                        </p>
                        <p className="text-slate-600 dark:text-white/70">
                          {tplRequirement.explanation}
                        </p>
                      </div>
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          riskLevel === "low"
                            ? "bg-green-500/20 text-green-400"
                            : riskLevel === "medium"
                              ? "bg-blue-500/20 text-blue-400"
                              : riskLevel === "high"
                                ? "bg-orange-500/20 text-orange-400"
                                : "bg-red-500/20 text-red-400"
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
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                        <ul className="space-y-1">
                          {tplRequirement.notes.map((note, i) => (
                            <li
                              key={i}
                              className="text-sm text-slate-600 dark:text-white/70 flex items-start gap-2"
                            >
                              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
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
                                ? "bg-blue-500/10 border-blue-500/30"
                                : "bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              {insuranceTypeIcons[type as InsuranceType]}
                              <h3 className="font-medium">{def.name}</h3>
                              {isRequired && (
                                <span className="ml-auto text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                  Required
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-white/70">
                              {def.description}
                            </p>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {premiumEstimate && (
                  <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      Premium Estimate
                    </h2>

                    <div className="mb-4">
                      <p className="text-sm text-slate-600 dark:text-white/70">
                        Estimated Annual Premium
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(premiumEstimate.total.min)} -{" "}
                        {formatCurrency(premiumEstimate.total.max)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(premiumEstimate.breakdown).map(
                        ([type, range]) => (
                          <div
                            key={type}
                            className="bg-slate-50 dark:bg-white/[0.04] rounded-lg p-3"
                          >
                            <p className="text-xs text-slate-600 dark:text-white/70 mb-1">
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
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-white/90 rounded-lg font-medium text-[13px] transition-all"
                  >
                    Continue to Policy Tracker
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Policy Tracker */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      Insurance Compliance Score
                    </h2>
                    <div className="text-3xl font-bold">
                      {selectedAssessment.complianceScore || 0}%
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/[0.05] rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        (selectedAssessment.complianceScore || 0) >= 80
                          ? "bg-green-500"
                          : (selectedAssessment.complianceScore || 0) >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
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
                        className={`bg-white dark:bg-white/[0.04] border rounded-xl p-6 ${
                          isRequired
                            ? "border-blue-500/30"
                            : "border-slate-200 dark:border-white/10"
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
                              <p className="text-sm text-slate-600 dark:text-white/70">
                                {typeDef?.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {isRequired && (
                              <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
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
                              className={`bg-white dark:bg-white/[0.04] border rounded-lg px-3 py-1.5 text-sm ${
                                statusConfig?.color === "green"
                                  ? "border-green-500/30 text-green-400"
                                  : statusConfig?.color === "blue"
                                    ? "border-blue-500/30 text-blue-400"
                                    : statusConfig?.color === "yellow"
                                      ? "border-yellow-500/30 text-yellow-400"
                                      : statusConfig?.color === "orange"
                                        ? "border-orange-500/30 text-orange-400"
                                        : statusConfig?.color === "red"
                                          ? "border-red-500/30 text-red-400"
                                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70"
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
                            articleRef={`Art. 44-51`}
                            title={typeDef?.name || policy.insuranceType}
                            severity={isRequired ? "critical" : "major"}
                            regulationType="INSURANCE"
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-600 dark:text-white/70">
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
                              className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-[13px] text-slate-900 dark:text-white mt-1 focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                            />
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-white/70">
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
                              className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-[13px] text-slate-900 dark:text-white mt-1 focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                            />
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-white/70">
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
                              className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-[13px] text-slate-900 dark:text-white mt-1 focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                            />
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-white/70">
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
                              className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-[13px] text-slate-900 dark:text-white mt-1 focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
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
                    className="flex items-center gap-2 px-4 py-2 text-[13px] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                  </button>
                  <button
                    onClick={generateReport}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-white/90 disabled:opacity-50 rounded-lg font-medium text-[13px] transition-all"
                  >
                    {isSaving ? "Generating..." : "Generate Report"}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Compliance Report */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {report ? (
                  <>
                    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-6">
                      <h2 className="text-xl font-bold mb-2">
                        Insurance Compliance Report
                      </h2>
                      <p className="text-slate-600 dark:text-white/70">
                        Generated on{" "}
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Organization Profile
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600 dark:text-white/70">
                            Jurisdiction
                          </p>
                          <p className="font-medium">
                            {report.organizationProfile.jurisdictionName}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-600 dark:text-white/70">
                            Operator Type
                          </p>
                          <p className="font-medium">
                            {report.organizationProfile.operatorType}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-600 dark:text-white/70">
                            Risk Level
                          </p>
                          <p className="font-medium">
                            {report.organizationProfile.riskLevel}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        TPL Requirement
                      </h3>
                      <div className="text-3xl font-bold text-blue-400 mb-2">
                        {formatCurrency(report.tplRequirement.amount)}
                      </div>
                      <p className="text-slate-600 dark:text-white/70">
                        {report.tplRequirement.explanation}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Compliance Status
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold">
                            {report.complianceStatus.score}%
                          </p>
                          <p className="text-sm text-slate-600 dark:text-white/70">
                            Overall Score
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-400">
                            {report.complianceStatus.requiredPolicies}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-white/70">
                            Required
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-400">
                            {report.complianceStatus.activePolicies}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-white/70">
                            Active
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-400">
                            {report.complianceStatus.pendingPolicies}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-white/70">
                            Pending
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-400">
                            {report.complianceStatus.missingPolicies}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-white/70">
                            Missing
                          </p>
                        </div>
                      </div>
                    </div>

                    {report.recommendations.length > 0 && (
                      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">
                          Recommendations
                        </h3>
                        <ul className="space-y-3">
                          {report.recommendations.map(
                            (rec: string, i: number) => (
                              <li
                                key={i}
                                className="flex items-start gap-3 text-slate-600 dark:text-white/70"
                              >
                                <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                {rec}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-12 text-center">
                    <FileText className="w-16 h-16 text-slate-400 dark:text-white/60 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">
                      No Report Generated
                    </h2>
                    <p className="text-slate-600 dark:text-white/70 mb-6">
                      Complete the policy tracker to generate your compliance
                      report
                    </p>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-white/90 rounded-lg font-medium text-[13px] transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Go to Policy Tracker
                    </button>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                  </button>
                  {selectedAssessment && (
                    <button
                      onClick={() => deleteAssessment(selectedAssessment.id)}
                      className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 font-medium transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                      Delete Assessment
                    </button>
                  )}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewAssessment(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  New Insurance Assessment
                </h2>
                <button
                  onClick={() => setShowNewAssessment(false)}
                  className="text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
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
                    className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-3 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
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
                    className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-3 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
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
                  <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
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
                    className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-3 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                  >
                    {Object.entries(operatorTypeConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
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
                    className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-3 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                  >
                    {Object.entries(companySizeConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 dark:text-white/70 mb-2">
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
                    className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-3 text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                  >
                    {Object.entries(orbitRegimeConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNewAssessment(false)}
                  className="px-4 py-2 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createAssessment}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-white/90 disabled:opacity-50 rounded-lg font-medium text-[13px] transition-all"
                >
                  {isSaving ? "Creating..." : "Create Assessment"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
