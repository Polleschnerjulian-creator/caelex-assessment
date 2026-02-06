"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  Leaf,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Factory,
  Truck,
  Satellite,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  Mail,
  Plus,
  Loader2,
  Info,
  TrendingDown,
  BarChart3,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  launchVehicles,
  propellantProfiles,
  efdGradeThresholds,
  impactCategories,
  getPhaseLabel,
  formatEmissions,
  formatMass,
  getGradeColor,
  type LaunchVehicleId,
  type PropellantType,
  type EFDGrade,
} from "@/data/environmental-requirements";

type WizardStep = "mission_profile" | "calculator" | "suppliers" | "report";

interface Assessment {
  id: string;
  assessmentName: string | null;
  status: string;
  missionName: string | null;
  operatorType: string;
  missionType: string;
  spacecraftMassKg: number;
  spacecraftCount: number;
  orbitType: string;
  altitudeKm: number | null;
  missionDurationYears: number;
  launchVehicle: string;
  launchSharePercent: number;
  launchSiteCountry: string | null;
  spacecraftPropellant: string | null;
  propellantMassKg: number | null;
  groundStationCount: number;
  dailyContactHours: number;
  deorbitStrategy: string;
  isSmallEnterprise: boolean;
  isResearchEducation: boolean;
  totalGWP: number | null;
  totalODP: number | null;
  carbonIntensity: number | null;
  efdGrade: string | null;
  complianceScore: number | null;
  isSimplifiedAssessment: boolean;
  reportGenerated: boolean;
  impactResults: Array<{
    phase: string;
    gwpKgCO2eq: number;
    odpKgCFC11eq: number;
    percentOfTotal: number;
  }>;
  supplierRequests: Array<{
    id: string;
    status: string;
    componentType: string;
  }>;
}

interface CalculationResult {
  totalGWP: number;
  totalODP: number;
  carbonIntensity: number;
  grade: EFDGrade;
  gradeLabel: string;
  lifecycleBreakdown: Array<{
    phase: string;
    gwpKgCO2eq: number;
    odpKgCFC11eq: number;
    percentOfTotal: number;
  }>;
  hotspots: string[];
  recommendations: string[];
  isSimplifiedAssessment: boolean;
  regulatoryCompliance: {
    meetsDeadline: boolean;
    requiredActions: string[];
  };
  complianceScore: number;
}

interface SupplierRequest {
  id: string;
  supplierName: string;
  supplierEmail: string | null;
  componentType: string;
  dataRequired: string;
  status: string;
  sentAt: string | null;
  receivedAt: string | null;
  deadline: string | null;
  notes: string | null;
}

const stepInfo = {
  mission_profile: {
    number: 1,
    title: "Mission Profile",
    description: "Define your spacecraft and mission parameters",
  },
  calculator: {
    number: 2,
    title: "Footprint Calculator",
    description: "Calculate environmental impact across lifecycle phases",
  },
  suppliers: {
    number: 3,
    title: "Supplier Data Collection",
    description: "Request environmental data from your supply chain",
  },
  report: {
    number: 4,
    title: "EFD Report",
    description: "Generate your Environmental Footprint Declaration",
  },
};

const phaseIcons: Record<string, any> = {
  raw_material_extraction: Factory,
  manufacturing: Factory,
  transport_to_launch: Truck,
  launch: Rocket,
  operations: Satellite,
  end_of_life: Trash2,
};

function EnvironmentalPageContent() {
  const [currentStep, setCurrentStep] = useState<WizardStep>("mission_profile");
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] =
    useState<Assessment | null>(null);
  const [calculationResult, setCalculationResult] =
    useState<CalculationResult | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierRequest[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for new assessment
  const [formData, setFormData] = useState({
    assessmentName: "",
    missionName: "",
    operatorType: "spacecraft",
    missionType: "commercial",
    spacecraftMassKg: 500,
    spacecraftCount: 1,
    orbitType: "LEO",
    altitudeKm: 550,
    missionDurationYears: 5,
    launchVehicle: "falcon_9",
    launchSharePercent: 100,
    launchSiteCountry: "",
    spacecraftPropellant: "",
    propellantMassKg: 0,
    groundStationCount: 2,
    dailyContactHours: 4,
    deorbitStrategy: "controlled_deorbit",
    isSmallEnterprise: false,
    isResearchEducation: false,
  });

  useEffect(() => {
    fetchAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAssessments() {
    try {
      setLoading(true);
      const response = await fetch("/api/environmental");
      if (response.ok) {
        const data = await response.json();
        setAssessments(data.assessments);
        if (data.assessments.length > 0) {
          setSelectedAssessment(data.assessments[0]);
          populateFormFromAssessment(data.assessments[0]);
        }
      }
    } catch (err) {
      setError("Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }

  function populateFormFromAssessment(assessment: Assessment) {
    setFormData({
      assessmentName: assessment.assessmentName || "",
      missionName: assessment.missionName || "",
      operatorType: assessment.operatorType,
      missionType: assessment.missionType,
      spacecraftMassKg: assessment.spacecraftMassKg,
      spacecraftCount: assessment.spacecraftCount,
      orbitType: assessment.orbitType,
      altitudeKm: assessment.altitudeKm || 550,
      missionDurationYears: assessment.missionDurationYears,
      launchVehicle: assessment.launchVehicle,
      launchSharePercent: assessment.launchSharePercent,
      launchSiteCountry: assessment.launchSiteCountry || "",
      spacecraftPropellant: assessment.spacecraftPropellant || "",
      propellantMassKg: assessment.propellantMassKg || 0,
      groundStationCount: assessment.groundStationCount,
      dailyContactHours: assessment.dailyContactHours,
      deorbitStrategy: assessment.deorbitStrategy,
      isSmallEnterprise: assessment.isSmallEnterprise,
      isResearchEducation: assessment.isResearchEducation,
    });
  }

  async function createOrUpdateAssessment() {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...formData,
        propellantMassKg: formData.propellantMassKg || null,
        spacecraftPropellant: formData.spacecraftPropellant || null,
      };

      if (selectedAssessment) {
        // Update existing
        const response = await fetch(
          `/api/environmental/${selectedAssessment.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (response.ok) {
          const data = await response.json();
          setSelectedAssessment(data.assessment);
          await fetchAssessments();
          setCurrentStep("calculator");
        } else {
          const err = await response.json();
          setError(err.error || "Failed to update assessment");
        }
      } else {
        // Create new
        const response = await fetch("/api/environmental", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          setSelectedAssessment(data.assessment);
          await fetchAssessments();
          setCurrentStep("calculator");
        } else {
          const err = await response.json();
          setError(err.error || "Failed to create assessment");
        }
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function calculateFootprint() {
    if (!selectedAssessment) return;

    try {
      setCalculating(true);
      setError(null);

      const response = await fetch("/api/environmental/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: selectedAssessment.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedAssessment(data.assessment);
        setCalculationResult(data.result);
        await fetchAssessments();
      } else {
        const err = await response.json();
        setError(err.error || "Calculation failed");
      }
    } catch (err) {
      setError("Calculation failed");
    } finally {
      setCalculating(false);
    }
  }

  async function fetchSuppliers() {
    if (!selectedAssessment) return;

    try {
      const response = await fetch(
        `/api/environmental/suppliers?assessmentId=${selectedAssessment.id}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers);
      }
    } catch (err) {
      console.error("Failed to fetch suppliers");
    }
  }

  async function generateDefaultSuppliers() {
    if (!selectedAssessment) return;

    try {
      setLoading(true);
      const response = await fetch("/api/environmental/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: selectedAssessment.id,
          generateDefaults: true,
        }),
      });

      if (response.ok) {
        await fetchSuppliers();
      }
    } catch (err) {
      setError("Failed to generate supplier requests");
    } finally {
      setLoading(false);
    }
  }

  async function updateSupplierStatus(supplierId: string, status: string) {
    try {
      await fetch("/api/environmental/suppliers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, status }),
      });
      await fetchSuppliers();
    } catch (err) {
      console.error("Failed to update supplier");
    }
  }

  async function generateReport() {
    if (!selectedAssessment) return;

    try {
      setGeneratingReport(true);
      setError(null);

      const response = await fetch("/api/environmental/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: selectedAssessment.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setReport(data.report);
        await fetchAssessments();
      } else {
        const err = await response.json();
        setError(err.error || "Failed to generate report");
      }
    } catch (err) {
      setError("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  }

  const steps: WizardStep[] = [
    "mission_profile",
    "calculator",
    "suppliers",
    "report",
  ];
  const currentStepIndex = steps.indexOf(currentStep);

  function goToStep(step: WizardStep) {
    const targetIndex = steps.indexOf(step);
    if (
      targetIndex <= currentStepIndex ||
      (selectedAssessment && targetIndex <= currentStepIndex + 1)
    ) {
      setCurrentStep(step);
      if (step === "suppliers") {
        fetchSuppliers();
      }
    }
  }

  if (loading && assessments.length === 0) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500 dark:text-white/60" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1200px]">
        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-white/60 mb-3">
            MODULE 03
          </p>
          <h1 className="text-[24px] font-medium text-slate-900 dark:text-white mb-2">
            Environmental Footprint
          </h1>
          <p className="text-[14px] text-slate-600 dark:text-white/70">
            Calculate your mission&apos;s environmental impact and generate your
            EFD (Art. 96-100)
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => {
              const info = stepInfo[step];
              const isActive = step === currentStep;
              const isCompleted = index < currentStepIndex;
              const isClickable = index <= currentStepIndex + 1;

              return (
                <div key={step} className="flex items-center">
                  <button
                    onClick={() => isClickable && goToStep(step)}
                    disabled={!isClickable}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? "bg-emerald-500/20 border border-emerald-500/30"
                        : isCompleted
                          ? "bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                          : "bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.03] opacity-50"
                    } ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium ${
                        isActive
                          ? "bg-emerald-500 text-white"
                          : isCompleted
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        info.number
                      )}
                    </div>
                    <span
                      className={`text-[13px] ${isActive ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-white/70"}`}
                    >
                      {info.title}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/10 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-[13px] text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === "mission_profile" && (
              <MissionProfileStep
                formData={formData}
                setFormData={setFormData}
                onSubmit={createOrUpdateAssessment}
                loading={loading}
                isEdit={!!selectedAssessment}
              />
            )}

            {currentStep === "calculator" && selectedAssessment && (
              <CalculatorStep
                assessment={selectedAssessment}
                result={calculationResult}
                calculating={calculating}
                onCalculate={calculateFootprint}
                onNext={() => {
                  setCurrentStep("suppliers");
                  fetchSuppliers();
                }}
                onBack={() => setCurrentStep("mission_profile")}
              />
            )}

            {currentStep === "suppliers" && selectedAssessment && (
              <SuppliersStep
                suppliers={suppliers}
                onGenerateDefaults={generateDefaultSuppliers}
                onUpdateStatus={updateSupplierStatus}
                onNext={() => setCurrentStep("report")}
                onBack={() => setCurrentStep("calculator")}
                loading={loading}
              />
            )}

            {currentStep === "report" && selectedAssessment && (
              <ReportStep
                assessment={selectedAssessment}
                report={report}
                generating={generatingReport}
                onGenerate={generateReport}
                onBack={() => setCurrentStep("suppliers")}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Step Components ───

function MissionProfileStep({
  formData,
  setFormData,
  onSubmit,
  loading,
  isEdit,
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  loading: boolean;
  isEdit: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">
          Basic Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Assessment Name
            </label>
            <input
              type="text"
              value={formData.assessmentName}
              onChange={(e) =>
                setFormData({ ...formData, assessmentName: e.target.value })
              }
              placeholder="e.g., LEO Constellation EFD"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-white/60 focus:outline-none focus:border-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Mission Name
            </label>
            <input
              type="text"
              value={formData.missionName}
              onChange={(e) =>
                setFormData({ ...formData, missionName: e.target.value })
              }
              placeholder="e.g., Starlink Gen 2"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-white/60 focus:outline-none focus:border-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Operator Type
            </label>
            <select
              value={formData.operatorType}
              onChange={(e) =>
                setFormData({ ...formData, operatorType: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            >
              <option value="spacecraft">Spacecraft Operator</option>
              <option value="launch">Launch Provider</option>
              <option value="launch_site">Launch Site Operator</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Mission Type
            </label>
            <select
              value={formData.missionType}
              onChange={(e) =>
                setFormData({ ...formData, missionType: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            >
              <option value="commercial">Commercial</option>
              <option value="government">Government</option>
              <option value="research">Research</option>
              <option value="educational">Educational</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spacecraft Details */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">
          Spacecraft Details
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Spacecraft Mass (kg)
            </label>
            <input
              type="number"
              value={formData.spacecraftMassKg}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  spacecraftMassKg: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Number of Spacecraft
            </label>
            <input
              type="number"
              value={formData.spacecraftCount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  spacecraftCount: parseInt(e.target.value) || 1,
                })
              }
              min="1"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Mission Duration (years)
            </label>
            <input
              type="number"
              value={formData.missionDurationYears}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  missionDurationYears: parseInt(e.target.value) || 5,
                })
              }
              min="1"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Orbit Type
            </label>
            <select
              value={formData.orbitType}
              onChange={(e) =>
                setFormData({ ...formData, orbitType: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            >
              <option value="LEO">LEO (Low Earth Orbit)</option>
              <option value="MEO">MEO (Medium Earth Orbit)</option>
              <option value="GEO">GEO (Geostationary)</option>
              <option value="HEO">HEO (Highly Elliptical)</option>
              <option value="cislunar">Cislunar</option>
              <option value="deep_space">Deep Space</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Altitude (km)
            </label>
            <input
              type="number"
              value={formData.altitudeKm}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  altitudeKm: parseInt(e.target.value) || null,
                })
              }
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Deorbit Strategy
            </label>
            <select
              value={formData.deorbitStrategy}
              onChange={(e) =>
                setFormData({ ...formData, deorbitStrategy: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            >
              <option value="controlled_deorbit">Controlled Deorbit</option>
              <option value="passive_decay">Passive Decay</option>
              <option value="graveyard_orbit">Graveyard Orbit</option>
              <option value="retrieval">Active Retrieval/ADR</option>
            </select>
          </div>
        </div>
      </div>

      {/* Launch Configuration */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">
          Launch Configuration
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Launch Vehicle
            </label>
            <select
              value={formData.launchVehicle}
              onChange={(e) =>
                setFormData({ ...formData, launchVehicle: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            >
              {Object.entries(launchVehicles).map(([id, vehicle]) => (
                <option key={id} value={id}>
                  {vehicle.name} ({vehicle.provider})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Launch Share (%)
            </label>
            <input
              type="number"
              value={formData.launchSharePercent}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  launchSharePercent: parseFloat(e.target.value) || 100,
                })
              }
              min="1"
              max="100"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            />
            <p className="text-[11px] text-slate-600 dark:text-white/70 mt-1">
              100% for dedicated launch, lower for rideshare
            </p>
          </div>
        </div>

        {/* Launch vehicle info card */}
        {formData.launchVehicle &&
          launchVehicles[formData.launchVehicle as LaunchVehicleId] && (
            <div className="mt-4 p-4 bg-slate-100 dark:bg-white/[0.04] rounded-lg border border-slate-200 dark:border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] text-slate-900 dark:text-white font-medium">
                    {
                      launchVehicles[formData.launchVehicle as LaunchVehicleId]
                        .name
                    }
                  </p>
                  <p className="text-[12px] text-slate-500 dark:text-white/60">
                    {
                      launchVehicles[formData.launchVehicle as LaunchVehicleId]
                        .provider
                    }
                  </p>
                </div>
                <div
                  className={`px-2 py-1 rounded text-[11px] font-medium ${
                    launchVehicles[formData.launchVehicle as LaunchVehicleId]
                      .sustainabilityGrade === "A"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : launchVehicles[
                            formData.launchVehicle as LaunchVehicleId
                          ].sustainabilityGrade === "B"
                        ? "bg-lime-500/20 text-lime-400"
                        : launchVehicles[
                              formData.launchVehicle as LaunchVehicleId
                            ].sustainabilityGrade === "C"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-orange-500/20 text-orange-400"
                  }`}
                >
                  Grade{" "}
                  {
                    launchVehicles[formData.launchVehicle as LaunchVehicleId]
                      .sustainabilityGrade
                  }
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4 text-[12px]">
                <div>
                  <p className="text-slate-500 dark:text-white/60">
                    LEO Carbon Intensity
                  </p>
                  <p className="text-slate-900 dark:text-white">
                    {
                      launchVehicles[formData.launchVehicle as LaunchVehicleId]
                        .carbonIntensityKgCO2PerKgPayload.leo
                    }{" "}
                    kg CO2/kg
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-white/60">
                    Reusability
                  </p>
                  <p className="text-slate-900 dark:text-white capitalize">
                    {launchVehicles[
                      formData.launchVehicle as LaunchVehicleId
                    ].reusability.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-white/60">
                    LEO Capacity
                  </p>
                  <p className="text-slate-900 dark:text-white">
                    {formatMass(
                      launchVehicles[formData.launchVehicle as LaunchVehicleId]
                        .payloadCapacityLeoKg,
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Propulsion (optional) */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">
          Spacecraft Propulsion (Optional)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Propellant Type
            </label>
            <select
              value={formData.spacecraftPropellant}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  spacecraftPropellant: e.target.value,
                })
              }
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            >
              <option value="">No onboard propulsion</option>
              {Object.entries(propellantProfiles).map(([id, prop]) => (
                <option key={id} value={id}>
                  {prop.name} (Grade {prop.sustainabilityRating})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Propellant Mass (kg)
            </label>
            <input
              type="number"
              value={formData.propellantMassKg}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  propellantMassKg: parseFloat(e.target.value) || 0,
                })
              }
              disabled={!formData.spacecraftPropellant}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30 disabled:opacity-50"
            />
          </div>
        </div>

        {formData.spacecraftPropellant &&
          propellantProfiles[
            formData.spacecraftPropellant as PropellantType
          ] && (
            <div className="mt-4 p-3 bg-slate-100 dark:bg-white/[0.04] rounded-lg border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                {propellantProfiles[
                  formData.spacecraftPropellant as PropellantType
                ].toxicityClass === "very_high" && (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                )}
                <p className="text-[12px] text-slate-500 dark:text-white/60">
                  {
                    propellantProfiles[
                      formData.spacecraftPropellant as PropellantType
                    ].notes
                  }
                </p>
              </div>
            </div>
          )}
      </div>

      {/* Operations */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">
          Ground Operations
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Number of Ground Stations
            </label>
            <input
              type="number"
              value={formData.groundStationCount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  groundStationCount: parseInt(e.target.value) || 1,
                })
              }
              min="1"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-1.5">
              Daily Contact Hours
            </label>
            <input
              type="number"
              value={formData.dailyContactHours}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dailyContactHours: parseFloat(e.target.value) || 2,
                })
              }
              min="0"
              max="24"
              step="0.5"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/30"
            />
          </div>
        </div>
      </div>

      {/* Simplified Regime */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">
          Organization Type
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isSmallEnterprise}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isSmallEnterprise: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 text-emerald-500 focus:ring-emerald-500/20"
            />
            <span className="text-[13px] text-slate-600 dark:text-white/70">
              Small Enterprise (&lt;50 employees, &lt;€10M turnover)
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isResearchEducation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isResearchEducation: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 text-emerald-500 focus:ring-emerald-500/20"
            />
            <span className="text-[13px] text-slate-600 dark:text-white/70">
              Research or Educational Institution
            </span>
          </label>
        </div>
        {(formData.isSmallEnterprise || formData.isResearchEducation) && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
            <p className="text-[12px] text-emerald-300">
              You may qualify for the Simplified Regime: Screening LCA is
              sufficient until 2032.
            </p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {isEdit ? "Update & Calculate" : "Create Assessment"}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function CalculatorStep({
  assessment,
  result,
  calculating,
  onCalculate,
  onNext,
  onBack,
}: {
  assessment: Assessment;
  result: CalculationResult | null;
  calculating: boolean;
  onCalculate: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Calculate Button or Results */}
      {!result && !assessment.totalGWP ? (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-8 text-center">
          <Leaf className="w-12 h-12 text-emerald-400/30 mx-auto mb-4" />
          <h3 className="text-[16px] font-medium text-slate-900 dark:text-white mb-2">
            Ready to Calculate
          </h3>
          <p className="text-[13px] text-slate-500 dark:text-white/60 mb-6 max-w-md mx-auto">
            Based on your mission profile, we&apos;ll calculate the
            environmental footprint across all lifecycle phases.
          </p>
          <button
            onClick={onCalculate}
            disabled={calculating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[14px] font-medium transition-colors disabled:opacity-50"
          >
            {calculating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <BarChart3 className="w-5 h-5" />
                Calculate Environmental Footprint
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Grade Card */}
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[15px] font-medium text-slate-900 dark:text-white">
                Environmental Footprint Grade
              </h3>
              <button
                onClick={onCalculate}
                disabled={calculating}
                className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white/60"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${calculating ? "animate-spin" : ""}`}
                />
                Recalculate
              </button>
            </div>

            <div className="flex items-center gap-8">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-[36px] font-bold"
                style={{
                  backgroundColor: `${getGradeColor(assessment.efdGrade as EFDGrade)}20`,
                  color: getGradeColor(assessment.efdGrade as EFDGrade),
                }}
              >
                {assessment.efdGrade}
              </div>

              <div className="flex-1 grid grid-cols-3 gap-6">
                <div>
                  <p className="text-[12px] text-slate-500 dark:text-white/60 mb-1">
                    Total GWP
                  </p>
                  <p className="text-[20px] font-medium text-slate-900 dark:text-white">
                    {formatEmissions(assessment.totalGWP || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-slate-500 dark:text-white/60 mb-1">
                    Carbon Intensity
                  </p>
                  <p className="text-[20px] font-medium text-slate-900 dark:text-white">
                    {(assessment.carbonIntensity || 0).toFixed(0)}{" "}
                    <span className="text-[14px] text-slate-600 dark:text-white/70">
                      kg CO2/kg
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-slate-500 dark:text-white/60 mb-1">
                    Compliance Score
                  </p>
                  <p className="text-[20px] font-medium text-slate-900 dark:text-white">
                    {assessment.complianceScore || 0}
                    <span className="text-[14px] text-slate-600 dark:text-white/70">
                      /100
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {assessment.isSimplifiedAssessment && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                <p className="text-[12px] text-blue-300">
                  Screening LCA - Simplified assessment based on industry
                  averages
                </p>
              </div>
            )}
          </div>

          {/* Lifecycle Breakdown */}
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">
              Lifecycle Phase Breakdown
            </h3>

            <div className="space-y-3">
              {assessment.impactResults.map((phase) => {
                const Icon = phaseIcons[phase.phase] || Factory;
                const isHotspot = phase.percentOfTotal > 25;

                return (
                  <div key={phase.phase} className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isHotspot
                          ? "bg-orange-500/20"
                          : "bg-slate-100 dark:bg-white/[0.05]"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${isHotspot ? "text-orange-400" : "text-slate-600 dark:text-white/70"}`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] text-slate-900 dark:text-white">
                            {getPhaseLabel(phase.phase as any)}
                          </p>
                          {isHotspot && (
                            <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded">
                              HOTSPOT
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-slate-500 dark:text-white/60">
                          {formatEmissions(phase.gwpKgCO2eq)}
                        </p>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isHotspot ? "bg-orange-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${phase.percentOfTotal}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-[13px] text-slate-500 dark:text-white/60 w-16 text-right">
                      {phase.percentOfTotal.toFixed(1)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          {result?.recommendations && result.recommendations.length > 0 && (
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
              <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-emerald-400" />
                Improvement Recommendations
              </h3>
              <div className="space-y-3">
                {result.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-slate-100 dark:bg-white/[0.04] rounded-lg"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px] text-emerald-400 font-medium">
                      {index + 1}
                    </div>
                    <p className="text-[13px] text-slate-600 dark:text-white/70 flex-1">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white/60 text-[13px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!assessment.totalGWP}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
        >
          Continue to Supplier Data
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SuppliersStep({
  suppliers,
  onGenerateDefaults,
  onUpdateStatus,
  onNext,
  onBack,
  loading,
}: {
  suppliers: SupplierRequest[];
  onGenerateDefaults: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const statusColors: Record<string, string> = {
    pending: "bg-white/10 text-white/70",
    sent: "bg-blue-500/20 text-blue-400",
    received: "bg-emerald-500/20 text-emerald-400",
    overdue: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 mt-0.5" />
        <div>
          <p className="text-[13px] text-blue-300 font-medium mb-1">
            Article 99: Supply Chain Data Collection
          </p>
          <p className="text-[12px] text-blue-300/70">
            You may request environmental data from suppliers to improve LCA
            accuracy. Use the default templates or create custom requests.
          </p>
        </div>
      </div>

      {/* Suppliers List or Empty State */}
      {suppliers.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-8 text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-white/10 mx-auto mb-4" />
          <h3 className="text-[16px] font-medium text-slate-900 dark:text-white mb-2">
            No Supplier Requests Yet
          </h3>
          <p className="text-[13px] text-slate-500 dark:text-white/60 mb-6 max-w-md mx-auto">
            Generate default data requests based on your mission profile, or add
            custom suppliers.
          </p>
          <button
            onClick={onGenerateDefaults}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[14px] font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Generate Default Requests
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-medium text-slate-900 dark:text-white">
              Supplier Data Requests
            </h3>
            <button
              onClick={onGenerateDefaults}
              className="flex items-center gap-1.5 text-[12px] text-emerald-400 hover:text-emerald-300"
            >
              <Plus className="w-4 h-4" />
              Add More
            </button>
          </div>

          <div className="space-y-3">
            {suppliers.map((supplier) => {
              let dataRequired: string[] = [];
              try {
                dataRequired = JSON.parse(supplier.dataRequired);
              } catch {
                dataRequired = [];
              }

              return (
                <div
                  key={supplier.id}
                  className="p-4 bg-slate-100 dark:bg-white/[0.04] rounded-lg border border-slate-200 dark:border-white/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[14px] text-slate-900 dark:text-white font-medium">
                        {supplier.supplierName}
                      </p>
                      <p className="text-[12px] text-slate-500 dark:text-white/60">
                        {supplier.componentType}
                      </p>
                    </div>
                    <select
                      value={supplier.status}
                      onChange={(e) =>
                        onUpdateStatus(supplier.id, e.target.value)
                      }
                      className={`px-2 py-1 rounded text-[11px] font-medium border-0 cursor-pointer ${statusColors[supplier.status]}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="sent">Sent</option>
                      <option value="received">Received</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wide">
                      Data Required:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {dataRequired.slice(0, 3).map((item, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-200 dark:bg-white/[0.05] rounded text-[11px] text-slate-600 dark:text-white/70"
                        >
                          {item}
                        </span>
                      ))}
                      {dataRequired.length > 3 && (
                        <span className="px-2 py-0.5 bg-slate-200 dark:bg-white/[0.05] rounded text-[11px] text-slate-600 dark:text-white/70">
                          +{dataRequired.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {supplier.status === "pending" && (
                    <button className="mt-3 flex items-center gap-1.5 text-[12px] text-blue-400 hover:text-blue-300">
                      <Mail className="w-3.5 h-3.5" />
                      Send Request Email
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-6 text-[12px]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-white/10" />
                <span className="text-slate-500 dark:text-white/60">
                  Pending:{" "}
                  {suppliers.filter((s) => s.status === "pending").length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-slate-500 dark:text-white/60">
                  Sent: {suppliers.filter((s) => s.status === "sent").length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-500 dark:text-white/60">
                  Received:{" "}
                  {suppliers.filter((s) => s.status === "received").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white/60 text-[13px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[13px] font-medium transition-colors"
        >
          Continue to Report
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ReportStep({
  assessment,
  report,
  generating,
  onGenerate,
  onBack,
}: {
  assessment: Assessment;
  report: any;
  generating: boolean;
  onGenerate: () => void;
  onBack: () => void;
}) {
  if (!report) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 text-emerald-400/30 mx-auto mb-4" />
          <h3 className="text-[16px] font-medium text-slate-900 dark:text-white mb-2">
            Generate EFD Report
          </h3>
          <p className="text-[13px] text-slate-500 dark:text-white/60 mb-6 max-w-md mx-auto">
            Generate your Environmental Footprint Declaration report with
            lifecycle breakdown, recommendations, and regulatory compliance
            status.
          </p>
          <button
            onClick={onGenerate}
            disabled={generating || !assessment.totalGWP}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[14px] font-medium transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Generate EFD Report
              </>
            )}
          </button>
          {!assessment.totalGWP && (
            <p className="mt-4 text-[12px] text-orange-400">
              Please complete the environmental calculation first.
            </p>
          )}
        </div>

        <div className="flex justify-start">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white/60 text-[13px]"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[16px] font-medium text-slate-900 dark:text-white">
                Environmental Footprint Declaration
              </h3>
              <p className="text-[12px] text-slate-500 dark:text-white/60">
                Generated {new Date(report.generatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg text-[13px] text-slate-600 dark:text-white/70">
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>

        {/* Grade Summary */}
        <div className="flex items-center gap-6 p-4 bg-slate-100 dark:bg-white/[0.04] rounded-lg">
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center text-[32px] font-bold"
            style={{
              backgroundColor: `${report.environmentalFootprint.gradeColor}20`,
              color: report.environmentalFootprint.gradeColor,
            }}
          >
            {report.environmentalFootprint.grade}
          </div>
          <div className="flex-1">
            <p className="text-[14px] text-slate-900 dark:text-white font-medium mb-1">
              {report.environmentalFootprint.gradeLabel} Environmental
              Performance
            </p>
            <p className="text-[12px] text-slate-600 dark:text-white/70">
              {report.environmentalFootprint.gradeDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Mission Profile Summary */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">
          Mission Profile
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wide mb-1">
              Mission
            </p>
            <p className="text-[13px] text-slate-900 dark:text-white">
              {report.missionProfile.name || "Unnamed"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wide mb-1">
              Spacecraft Mass
            </p>
            <p className="text-[13px] text-slate-900 dark:text-white">
              {report.missionProfile.spacecraftMass}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wide mb-1">
              Orbit
            </p>
            <p className="text-[13px] text-slate-900 dark:text-white">
              {report.missionProfile.orbitType}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wide mb-1">
              Duration
            </p>
            <p className="text-[13px] text-slate-900 dark:text-white">
              {report.missionProfile.missionDuration}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wide mb-1">
              Launch Vehicle
            </p>
            <p className="text-[13px] text-slate-900 dark:text-white">
              {report.missionProfile.launchVehicle}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wide mb-1">
              Launch Share
            </p>
            <p className="text-[13px] text-slate-900 dark:text-white">
              {report.missionProfile.launchShare}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wide mb-1">
              Deorbit Strategy
            </p>
            <p className="text-[13px] text-slate-900 dark:text-white">
              {report.missionProfile.deorbitStrategy}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wide mb-1">
              Compliance Score
            </p>
            <p className="text-[13px] text-slate-900 dark:text-white">
              {report.complianceScore}/100
            </p>
          </div>
        </div>
      </div>

      {/* Environmental Metrics */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">
          Environmental Impact Metrics
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="p-4 bg-slate-100 dark:bg-white/[0.04] rounded-lg">
            <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wide mb-2">
              Total GWP
            </p>
            <p className="text-[24px] font-medium text-slate-900 dark:text-white">
              {report.environmentalFootprint.totalGWPFormatted}
            </p>
            <p className="text-[12px] text-slate-500 dark:text-white/60">
              Climate change impact
            </p>
          </div>
          <div className="p-4 bg-slate-100 dark:bg-white/[0.04] rounded-lg">
            <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wide mb-2">
              Carbon Intensity
            </p>
            <p className="text-[24px] font-medium text-slate-900 dark:text-white">
              {report.environmentalFootprint.carbonIntensity.toFixed(0)}
              <span className="text-[14px] text-slate-600 dark:text-white/70 ml-1">
                kg CO2/kg
              </span>
            </p>
            <p className="text-[12px] text-slate-500 dark:text-white/60">
              Per kg payload delivered
            </p>
          </div>
          <div className="p-4 bg-slate-100 dark:bg-white/[0.04] rounded-lg">
            <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wide mb-2">
              Ozone Depletion
            </p>
            <p className="text-[24px] font-medium text-slate-900 dark:text-white">
              {report.environmentalFootprint.totalODP.toFixed(2)}
              <span className="text-[14px] text-slate-600 dark:text-white/70 ml-1">
                kg CFC-11 eq
              </span>
            </p>
            <p className="text-[12px] text-slate-500 dark:text-white/60">
              Stratospheric impact
            </p>
          </div>
        </div>
      </div>

      {/* Lifecycle Breakdown */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">
          Lifecycle Phase Breakdown
        </h3>
        <div className="space-y-3">
          {report.lifecycleBreakdown.map((phase: any) => (
            <div key={phase.phase} className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  phase.isHotspot
                    ? "bg-orange-500/20"
                    : "bg-slate-100 dark:bg-white/[0.05]"
                }`}
              >
                {(() => {
                  const Icon = phaseIcons[phase.phase] || Factory;
                  return (
                    <Icon
                      className={`w-5 h-5 ${phase.isHotspot ? "text-orange-400" : "text-slate-600 dark:text-white/70"}`}
                    />
                  );
                })()}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] text-slate-900 dark:text-white">
                      {phase.phaseName}
                    </p>
                    {phase.isHotspot && (
                      <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded">
                        HOTSPOT
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-slate-500 dark:text-white/60">
                    {phase.gwpFormatted}
                  </p>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${phase.isHotspot ? "bg-orange-500" : "bg-emerald-500"}`}
                    style={{ width: `${phase.percentOfTotal}%` }}
                  />
                </div>
              </div>
              <p className="text-[13px] text-slate-500 dark:text-white/60 w-16 text-right">
                {phase.percentOfTotal.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-400" />
            Improvement Recommendations
          </h3>
          <div className="space-y-3">
            {report.recommendations.map((rec: string, index: number) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-slate-100 dark:bg-white/[0.04] rounded-lg"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px] text-emerald-400 font-medium shrink-0">
                  {index + 1}
                </div>
                <p className="text-[13px] text-slate-600 dark:text-white/70">
                  {rec}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regulatory Compliance */}
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">
          Regulatory Compliance Status
        </h3>

        {report.regulatoryCompliance.isSimplifiedAssessment && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            <p className="text-[12px] text-blue-300">
              Simplified Regime applies: Screening LCA is sufficient until 2032
            </p>
          </div>
        )}

        <div className="space-y-2">
          {report.regulatoryCompliance.applicableRequirements
            .filter((req: any) => req.applies)
            .map((req: any) => (
              <div
                key={req.article}
                className="flex items-center justify-between p-3 bg-slate-100 dark:bg-white/[0.04] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-slate-200 dark:bg-white/[0.05] rounded text-[11px] text-slate-500 dark:text-white/60 font-mono">
                    {req.article}
                  </span>
                  <span className="text-[13px] text-slate-600 dark:text-white/70">
                    {req.title}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-white/60">
                  Deadline: {req.deadline}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-white/10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white/60 text-[13px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white/60 text-[13px]"
          >
            <RefreshCw
              className={`w-4 h-4 ${generating ? "animate-spin" : ""}`}
            />
            Regenerate
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[13px] font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export EFD Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EnvironmentalPage() {
  return (
    <FeatureGate module="environmental">
      <EnvironmentalPageContent />
    </FeatureGate>
  );
}
