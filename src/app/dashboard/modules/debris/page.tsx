"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Info,
  FileText,
  Clock,
  Loader2,
  Download,
  Plus,
  Satellite,
  Globe,
  Shield,
  Zap,
  Target,
} from "lucide-react";
import {
  debrisRequirements,
  getApplicableRequirements,
  getConstellationTier,
  getAvailableDeorbitStrategies,
  requirementStatusConfig,
  severityConfig,
  orbitTypeConfig,
  type OrbitType,
  type ConstellationTier,
  type ManeuverabilityLevel,
  type DeorbitStrategy,
  type RequirementStatus,
  type DebrisMissionProfile,
  type DebrisRequirement,
} from "@/data/debris-requirements";

interface Assessment {
  id: string;
  missionName: string | null;
  orbitType: string;
  altitudeKm: number | null;
  satelliteCount: number;
  constellationTier: string;
  hasManeuverability: string;
  hasPropulsion: boolean;
  hasPassivationCap: boolean;
  plannedDurationYears: number;
  launchDate: string | null;
  deorbitStrategy: string;
  deorbitTimelineYears: number | null;
  caServiceProvider: string | null;
  complianceScore: number | null;
  planGenerated: boolean;
  requirements: RequirementStatusRecord[];
}

interface RequirementStatusRecord {
  id: string;
  requirementId: string;
  status: string;
  notes: string | null;
  evidenceNotes: string | null;
}

interface RequirementWithStatus extends DebrisRequirement {
  status: RequirementStatus;
  notes: string | null;
  evidenceNotes: string | null;
  statusId: string | null;
}

// Wizard steps
const STEPS = [
  {
    id: "profile",
    label: "Mission Profile",
    description: "Define your mission parameters",
  },
  {
    id: "checklist",
    label: "Compliance Checklist",
    description: "Assess requirements",
  },
  {
    id: "plan",
    label: "Plan Generator",
    description: "Generate mitigation plan",
  },
];

export default function DebrisPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] =
    useState<Assessment | null>(null);
  const [requirements, setRequirements] = useState<RequirementWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [showNewAssessment, setShowNewAssessment] = useState(false);

  // Form state for new assessment
  const [form, setForm] = useState<Partial<DebrisMissionProfile>>({
    orbitType: undefined,
    altitudeKm: undefined,
    satelliteCount: 1,
    hasManeuverability: undefined,
    hasPropulsion: false,
    hasPassivationCapability: false,
    plannedMissionDurationYears: 5,
    deorbitStrategy: undefined,
    deorbitTimelineYears: undefined,
  });
  const [missionName, setMissionName] = useState("");
  const [caServiceProvider, setCaServiceProvider] = useState("");
  const [creating, setCreating] = useState(false);

  // Generated plan state
  const [generatedPlan, setGeneratedPlan] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await fetch("/api/debris");
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

  const fetchRequirements = useCallback(async (assessmentId: string) => {
    try {
      const res = await fetch(
        `/api/debris/requirements?assessmentId=${assessmentId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setRequirements(data.requirements);
      }
    } catch (error) {
      console.error("Error fetching requirements:", error);
    }
  }, []);

  const createAssessment = async () => {
    if (!form.orbitType || !form.hasManeuverability || !form.deorbitStrategy)
      return;

    setCreating(true);
    try {
      const res = await fetch("/api/debris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missionName: missionName || null,
          orbitType: form.orbitType,
          altitudeKm: form.altitudeKm,
          satelliteCount: form.satelliteCount,
          hasManeuverability: form.hasManeuverability,
          hasPropulsion: form.hasPropulsion,
          hasPassivationCapability: form.hasPassivationCapability,
          plannedMissionDurationYears: form.plannedMissionDurationYears,
          launchDate: form.launchDate,
          deorbitStrategy: form.deorbitStrategy,
          deorbitTimelineYears: form.deorbitTimelineYears,
          caServiceProvider: caServiceProvider || null,
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
      const res = await fetch("/api/debris/requirements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: selectedAssessment.id,
          requirementId,
          status,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update compliance score
        setSelectedAssessment((prev) =>
          prev ? { ...prev, complianceScore: data.complianceScore } : prev,
        );
      }
    } catch (error) {
      console.error("Error updating requirement:", error);
      // Revert on error
      fetchRequirements(selectedAssessment.id);
    }
  };

  const generatePlan = async () => {
    if (!selectedAssessment) return;

    setGeneratingPlan(true);
    try {
      const res = await fetch("/api/debris/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: selectedAssessment.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedPlan(data.plan);
        setSelectedAssessment((prev) =>
          prev ? { ...prev, planGenerated: true } : prev,
        );
      }
    } catch (error) {
      console.error("Error generating plan:", error);
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Calculate metrics
  const getMetrics = () => {
    const total = requirements.length;
    const compliant = requirements.filter(
      (r) => r.status === "compliant",
    ).length;
    const nonCompliant = requirements.filter(
      (r) => r.status === "non_compliant",
    ).length;
    const notAssessed = requirements.filter(
      (r) => r.status === "not_assessed",
    ).length;

    return { total, compliant, nonCompliant, notAssessed };
  };

  const metrics = getMetrics();

  // Get available deorbit strategies based on orbit
  const availableDeorbitStrategies = form.orbitType
    ? getAvailableDeorbitStrategies(form.orbitType as OrbitType)
    : [];

  // Preview applicable requirements based on form
  const previewRequirements =
    form.orbitType && form.hasManeuverability
      ? getApplicableRequirements({
          orbitType: form.orbitType as OrbitType,
          satelliteCount: form.satelliteCount || 1,
          constellationTier: getConstellationTier(form.satelliteCount || 1),
          hasManeuverability: form.hasManeuverability as ManeuverabilityLevel,
          hasPropulsion: form.hasPropulsion || false,
          hasPassivationCapability: form.hasPassivationCapability || false,
          plannedMissionDurationYears: form.plannedMissionDurationYears || 5,
          deorbitStrategy: (form.deorbitStrategy ||
            "active_deorbit") as DeorbitStrategy,
        })
      : [];

  // Warnings based on form
  const warnings: string[] = [];
  if (form.hasManeuverability === "none" && form.orbitType === "LEO") {
    warnings.push(
      "Non-maneuverable satellites in LEO may face restrictions under Art. 66",
    );
  }
  if ((form.satelliteCount || 1) >= 100) {
    warnings.push(
      "Large constellation (100+ satellites) triggers enhanced requirements under Art. 69-70",
    );
  }
  if (
    form.orbitType === "GEO" &&
    form.deorbitStrategy &&
    form.deorbitStrategy !== "graveyard_orbit"
  ) {
    warnings.push("GEO satellites must use graveyard orbit disposal");
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-100 dark:bg-white/[0.05] rounded w-1/3" />
          <div className="h-4 bg-slate-100 dark:bg-white/[0.05] rounded w-1/2" />
          <div className="grid grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-white dark:bg-white/[0.04] rounded-xl"
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
          MODULE 05
        </p>
        <h1 className="text-[24px] font-medium text-slate-900 dark:text-white mb-1">
          Debris Mitigation Assessment
        </h1>
        <p className="text-[14px] text-slate-600 dark:text-white/70">
          Assess compliance with EU Space Act debris requirements (Art. 58-73)
        </p>
      </div>

      {/* Compliance Metrics (when assessment selected) */}
      {selectedAssessment && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-5">
            <p className="text-[32px] font-mono font-semibold text-slate-900 dark:text-white">
              {metrics.compliant}/{metrics.total}
            </p>
            <p className="font-mono text-[11px] text-slate-500 dark:text-white/60 mt-1">
              requirements compliant
            </p>
          </div>
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-5">
            <p className="text-[32px] font-mono font-semibold text-slate-900 dark:text-white">
              {selectedAssessment.complianceScore || 0}%
            </p>
            <p className="font-mono text-[11px] text-slate-500 dark:text-white/60 mt-1">
              compliance score
            </p>
          </div>
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-5">
            <p className="text-[32px] font-mono font-semibold text-green-400">
              {selectedAssessment.deorbitTimelineYears || "—"}
            </p>
            <p className="font-mono text-[11px] text-slate-500 dark:text-white/60 mt-1">
              years to deorbit
            </p>
          </div>
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-5">
            <p className="text-[32px] font-mono font-semibold text-slate-900 dark:text-white">
              {selectedAssessment.caServiceProvider || "—"}
            </p>
            <p className="font-mono text-[11px] text-slate-500 dark:text-white/60 mt-1">
              CA service
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
                    ? "bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1]"
                    : index > 0 && !selectedAssessment
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono ${
                    activeStep === index
                      ? "bg-slate-900 dark:bg-white text-white dark:text-black"
                      : activeStep > index
                        ? "bg-green-500/20 text-green-400"
                        : "bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/70"
                  }`}
                >
                  {activeStep > index ? <CheckCircle2 size={12} /> : index + 1}
                </div>
                <div className="text-left hidden lg:block">
                  <p
                    className={`text-[13px] font-medium ${activeStep === index ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-white/60"}`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-white/60">
                    {step.description}
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
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Mission Profile */}
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
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-white/30">
                    Your Debris Assessments
                  </p>
                  <button
                    onClick={() => setShowNewAssessment(true)}
                    className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
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
                    className={`w-full bg-white dark:bg-white/[0.04] border rounded-xl p-5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all ${
                      selectedAssessment?.id === assessment.id
                        ? "border-slate-300 dark:border-white/[0.15]"
                        : "border-slate-200 dark:border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Satellite
                            size={18}
                            className="text-slate-500 dark:text-white/60"
                          />
                          <span className="text-[15px] font-medium text-slate-900 dark:text-white">
                            {assessment.missionName || "Unnamed Mission"}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-white/60">
                            {assessment.constellationTier}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[12px] text-slate-600 dark:text-white/70">
                          <span className="flex items-center gap-1.5">
                            <Globe size={12} />
                            {orbitTypeConfig[assessment.orbitType as OrbitType]
                              ?.label || assessment.orbitType}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Target size={12} />
                            {assessment.complianceScore || 0}% compliant
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-slate-500 dark:text-white/60"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* New assessment form */}
            {(assessments.length === 0 || showNewAssessment) && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                  <h2 className="text-[16px] font-medium text-slate-900 dark:text-white mb-4">
                    Mission Profile
                  </h2>
                  <p className="text-[13px] text-slate-500 dark:text-white/60 mb-6">
                    Define your mission parameters to determine applicable
                    debris requirements.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mission Name */}
                    <div>
                      <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-2">
                        Mission Name (optional)
                      </label>
                      <input
                        type="text"
                        value={missionName}
                        onChange={(e) => setMissionName(e.target.value)}
                        placeholder="e.g., Constellation Alpha"
                        className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                      />
                    </div>

                    {/* Orbit Type */}
                    <div>
                      <label className="block text-[12px] text-slate-500 dark:text-white/60 mb-2">
                        Orbit Type *
                      </label>
                      <select
                        value={form.orbitType || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            orbitType: e.target.value as OrbitType,
                            deorbitStrategy: undefined, // Reset deorbit when orbit changes
                          }))
                        }
                        className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15]"
                      >
                        <option value="">Select orbit...</option>
                        {Object.entries(orbitTypeConfig).map(
                          ([key, config]) => (
                            <option key={key} value={key}>
                              {config.label} ({config.altitudeRange})
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {/* Altitude */}
                    {form.orbitType && form.orbitType !== "GEO" && (
                      <div>
                        <label className="block text-[12px] text-white/60 mb-2">
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
                          placeholder="e.g., 550"
                          className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
                        />
                      </div>
                    )}

                    {/* Satellite Count */}
                    <div>
                      <label className="block text-[12px] text-white/60 mb-2">
                        Number of Satellites
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.satelliteCount || 1}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            satelliteCount: parseInt(e.target.value) || 1,
                          }))
                        }
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
                      />
                      {form.satelliteCount && form.satelliteCount > 1 && (
                        <p className="text-[11px] text-white/70 mt-1">
                          Tier: {getConstellationTier(form.satelliteCount)}
                        </p>
                      )}
                    </div>

                    {/* Maneuverability */}
                    <div>
                      <label className="block text-[12px] text-white/60 mb-2">
                        Maneuverability *
                      </label>
                      <select
                        value={form.hasManeuverability || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            hasManeuverability: e.target
                              .value as ManeuverabilityLevel,
                            hasPropulsion: e.target.value !== "none",
                          }))
                        }
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
                      >
                        <option value="">Select capability...</option>
                        <option value="full">
                          Full (propulsion for CA + EOL)
                        </option>
                        <option value="limited">
                          Limited (propulsion for EOL only)
                        </option>
                        <option value="none">None (no propulsion)</option>
                      </select>
                    </div>

                    {/* Mission Duration */}
                    <div>
                      <label className="block text-[12px] text-white/60 mb-2">
                        Mission Duration (years)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.plannedMissionDurationYears || 5}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plannedMissionDurationYears:
                              parseInt(e.target.value) || 5,
                          }))
                        }
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
                      />
                    </div>

                    {/* Deorbit Strategy */}
                    <div>
                      <label className="block text-[12px] text-white/60 mb-2">
                        Deorbit Strategy *
                      </label>
                      <select
                        value={form.deorbitStrategy || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            deorbitStrategy: e.target.value as DeorbitStrategy,
                          }))
                        }
                        disabled={!form.orbitType}
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15] disabled:opacity-50"
                      >
                        <option value="">Select strategy...</option>
                        {availableDeorbitStrategies.map((strategy) => (
                          <option key={strategy} value={strategy}>
                            {strategy === "active_deorbit" &&
                              "Active Deorbit (propulsion)"}
                            {strategy === "passive_decay" &&
                              "Passive Decay (natural)"}
                            {strategy === "graveyard_orbit" &&
                              "Graveyard Orbit Transfer"}
                            {strategy === "adr_contracted" &&
                              "ADR Service (contracted)"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Deorbit Timeline */}
                    {form.deorbitStrategy &&
                      form.deorbitStrategy !== "passive_decay" && (
                        <div>
                          <label className="block text-[12px] text-white/60 mb-2">
                            Deorbit Timeline (years post-mission)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={25}
                            value={form.deorbitTimelineYears || ""}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                deorbitTimelineYears: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              }))
                            }
                            placeholder="e.g., 5"
                            className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
                          />
                        </div>
                      )}

                    {/* CA Service Provider */}
                    <div>
                      <label className="block text-[12px] text-white/60 mb-2">
                        CA Service Provider
                      </label>
                      <select
                        value={caServiceProvider}
                        onChange={(e) => setCaServiceProvider(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
                      >
                        <option value="">Select or enter...</option>
                        <option value="EUSST">
                          EUSST (EU Space Surveillance)
                        </option>
                        <option value="LeoLabs">LeoLabs</option>
                        <option value="ExoAnalytic">
                          ExoAnalytic Solutions
                        </option>
                        <option value="Slingshot">Slingshot Aerospace</option>
                        <option value="18SDS">
                          18th Space Defense Squadron
                        </option>
                        <option value="Other">Other (specify in notes)</option>
                      </select>
                    </div>

                    {/* Passivation Capability */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="passivation"
                        checked={form.hasPassivationCapability || false}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            hasPassivationCapability: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 bg-white/[0.05] border border-white/[0.08] rounded"
                      />
                      <label
                        htmlFor="passivation"
                        className="text-[13px] text-white/60"
                      >
                        Has passivation capability (can deplete energy sources
                        at EOL)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="space-y-2">
                    {warnings.map((warning, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg"
                      >
                        <AlertTriangle
                          size={16}
                          className="text-amber-400 mt-0.5"
                        />
                        <p className="text-[13px] text-amber-400/80">
                          {warning}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview of applicable requirements */}
                {previewRequirements.length > 0 && (
                  <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                    <h3 className="text-[14px] font-medium text-slate-900 dark:text-white mb-4">
                      Applicable Requirements Preview
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {previewRequirements.map((req) => (
                        <span
                          key={req.id}
                          className={`text-[11px] px-2 py-1 rounded-full ${
                            severityConfig[req.severity].bgColor
                          } ${severityConfig[req.severity].color}`}
                        >
                          {req.articleRef}
                        </span>
                      ))}
                    </div>
                    <p className="text-[12px] text-slate-600 dark:text-white/70 mt-3">
                      {previewRequirements.length} requirements will apply to
                      this mission
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
                      !form.orbitType ||
                      !form.hasManeuverability ||
                      !form.deorbitStrategy
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

        {/* Step 2: Compliance Checklist */}
        {activeStep === 1 && (
          <motion.div
            key="checklist"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!selectedAssessment ? (
              <div className="bg-white dark:bg-white/[0.04] border border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl p-12 text-center">
                <AlertCircle
                  size={32}
                  className="mx-auto text-slate-500 dark:text-white/60 mb-3"
                />
                <p className="text-[14px] text-slate-500 dark:text-white/60 mb-4">
                  No assessment selected. Create a mission profile first.
                </p>
                <button
                  onClick={() => setActiveStep(0)}
                  className="text-[13px] text-blue-400 hover:text-blue-300"
                >
                  ← Go to Mission Profile
                </button>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-[16px] font-medium text-slate-900 dark:text-white mb-1">
                        Compliance Checklist
                      </h2>
                      <p className="text-[13px] text-slate-500 dark:text-white/60">
                        {metrics.compliant} of {metrics.total} requirements
                        assessed as compliant
                      </p>
                    </div>
                    <p className="text-[28px] font-mono font-semibold text-slate-900 dark:text-white">
                      {selectedAssessment.complianceScore || 0}%
                    </p>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${selectedAssessment.complianceScore || 0}%`,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Requirements list */}
                <div className="space-y-3">
                  {requirements.map((req) => {
                    const statusInfo = requirementStatusConfig[req.status];
                    const sevInfo = severityConfig[req.severity];

                    return (
                      <div
                        key={req.id}
                        className="bg-white dark:bg-white/[0.015] border border-slate-200 dark:border-white/10 rounded-xl p-5 hover:border-slate-300 dark:hover:border-white/[0.08] transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-2.5 rounded-lg ${sevInfo.bgColor}`}
                          >
                            {req.severity === "critical" ? (
                              <Shield size={18} className={sevInfo.color} />
                            ) : req.severity === "major" ? (
                              <Zap size={18} className={sevInfo.color} />
                            ) : (
                              <Info size={18} className={sevInfo.color} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] text-slate-600 dark:text-white/70">
                                    {req.articleRef}
                                  </span>
                                  <h3 className="text-[14px] font-medium text-slate-900 dark:text-white">
                                    {req.title}
                                  </h3>
                                  <span
                                    className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${sevInfo.bgColor} ${sevInfo.color}`}
                                  >
                                    {req.severity}
                                  </span>
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
                                className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] focus:outline-none ${statusInfo.color}`}
                              >
                                <option value="not_assessed">
                                  Not Assessed
                                </option>
                                <option value="compliant">Compliant</option>
                                <option value="non_compliant">
                                  Non-Compliant
                                </option>
                                <option value="not_applicable">N/A</option>
                              </select>
                            </div>

                            {/* Question */}
                            <p className="text-[13px] text-slate-600 dark:text-white/70 mb-3">
                              {req.complianceQuestion}
                            </p>

                            {/* Tips (collapsed) */}
                            {req.status !== "compliant" &&
                              req.tips.length > 0 && (
                                <div className="mt-3 p-3 bg-slate-100 dark:bg-white/[0.04] rounded-lg">
                                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/60 mb-2">
                                    Tips
                                  </p>
                                  <ul className="space-y-1">
                                    {req.tips.slice(0, 2).map((tip, i) => (
                                      <li
                                        key={i}
                                        className="text-[11px] text-slate-600 dark:text-white/70 flex items-start gap-2"
                                      >
                                        <span className="text-slate-300 dark:text-white/10">
                                          •
                                        </span>
                                        {tip}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                            {/* Evidence required */}
                            {req.status === "compliant" &&
                              req.evidenceRequired.length > 0 && (
                                <div className="mt-3 p-3 bg-green-500/5 rounded-lg border border-green-500/10">
                                  <p className="text-[10px] uppercase tracking-wider text-green-400/40 mb-2">
                                    Evidence Required
                                  </p>
                                  <ul className="space-y-1">
                                    {req.evidenceRequired.map((ev, i) => (
                                      <li
                                        key={i}
                                        className="text-[11px] text-green-400/60 flex items-start gap-2"
                                      >
                                        <CheckCircle2
                                          size={10}
                                          className="mt-0.5"
                                        />
                                        {ev}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 3: Plan Generator */}
        {activeStep === 2 && (
          <motion.div
            key="plan"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!selectedAssessment ? (
              <div className="bg-white dark:bg-white/[0.04] border border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl p-12 text-center">
                <AlertCircle
                  size={32}
                  className="mx-auto text-slate-500 dark:text-white/60 mb-3"
                />
                <p className="text-[14px] text-slate-500 dark:text-white/60 mb-4">
                  No assessment selected. Create a mission profile first.
                </p>
                <button
                  onClick={() => setActiveStep(0)}
                  className="text-[13px] text-blue-400 hover:text-blue-300"
                >
                  ← Go to Mission Profile
                </button>
              </div>
            ) : !generatedPlan ? (
              <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-8 text-center">
                <FileText
                  size={48}
                  className="mx-auto text-slate-300 dark:text-white/10 mb-4"
                />
                <h2 className="text-[18px] font-medium text-slate-900 dark:text-white mb-2">
                  Generate Debris Mitigation Plan
                </h2>
                <p className="text-[13px] text-slate-500 dark:text-white/60 mb-6 max-w-md mx-auto">
                  Based on your mission profile and compliance checklist,
                  generate a structured Debris Mitigation Plan document.
                </p>

                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={generatePlan}
                    disabled={generatingPlan}
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-medium text-[14px] hover:bg-white/90 transition-all disabled:opacity-50"
                  >
                    {generatingPlan ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Rocket size={16} />
                    )}
                    Generate Plan
                  </button>

                  <p className="text-[11px] text-slate-500 dark:text-white/60">
                    Compliance Score: {selectedAssessment.complianceScore || 0}%
                    • {requirements.length} requirements assessed
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Generated Plan Display */}
                <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-[18px] font-medium text-slate-900 dark:text-white mb-1">
                        Debris Mitigation Plan
                      </h2>
                      <p className="text-[12px] text-slate-600 dark:text-white/70">
                        Generated{" "}
                        {new Date(
                          (generatedPlan as Record<string, string>).generatedAt,
                        ).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const blob = new Blob(
                          [JSON.stringify(generatedPlan, null, 2)],
                          { type: "application/json" },
                        );
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `debris-mitigation-plan-${selectedAssessment.id}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
                    >
                      <Download size={14} />
                      Export JSON
                    </button>
                  </div>

                  {/* Mission Overview */}
                  <div className="mb-6 p-4 bg-slate-100 dark:bg-white/[0.04] rounded-lg">
                    <h3 className="text-[13px] font-medium text-slate-900 dark:text-white mb-3">
                      Mission Overview
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[12px]">
                      {Object.entries(
                        (
                          generatedPlan as Record<
                            string,
                            Record<string, unknown>
                          >
                        ).missionOverview,
                      ).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-slate-600 dark:text-white/70 capitalize">
                            {key.replace(/([A-Z])/g, " $1")}
                          </p>
                          <p className="text-slate-600 dark:text-white/70">
                            {String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sections */}
                  {Object.entries(
                    (
                      generatedPlan as Record<
                        string,
                        Record<string, Record<string, unknown>>
                      >
                    ).sections,
                  ).map(([sectionKey, section]) => (
                    <div
                      key={sectionKey}
                      className="mb-6 p-4 bg-slate-100 dark:bg-white/[0.04] rounded-lg"
                    >
                      <h3 className="text-[13px] font-medium text-slate-900 dark:text-white mb-3 capitalize">
                        {sectionKey.replace(/([A-Z])/g, " $1")}
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(section).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-[11px] text-slate-600 dark:text-white/70 uppercase tracking-wider mb-1">
                              {key.replace(/([A-Z])/g, " $1")}
                            </p>
                            {Array.isArray(value) ? (
                              <ul className="space-y-1">
                                {(value as string[]).map((item, i) => (
                                  <li
                                    key={i}
                                    className="text-[12px] text-slate-500 dark:text-white/60 flex items-start gap-2"
                                  >
                                    <span className="text-slate-500 dark:text-white/60">
                                      •
                                    </span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            ) : typeof value === "boolean" ? (
                              <p
                                className={`text-[12px] ${value ? "text-green-400" : "text-red-400"}`}
                              >
                                {value ? "✓ Yes" : "✗ No"}
                              </p>
                            ) : (
                              <p className="text-[12px] text-slate-500 dark:text-white/60">
                                {String(value)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Requirements Matrix */}
                  <div className="p-4 bg-slate-100 dark:bg-white/[0.04] rounded-lg">
                    <h3 className="text-[13px] font-medium text-slate-900 dark:text-white mb-3">
                      Requirements Matrix
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="text-left text-slate-600 dark:text-white/70 border-b border-slate-200 dark:border-white/10">
                            <th className="pb-2">Article</th>
                            <th className="pb-2">Requirement</th>
                            <th className="pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(
                            (
                              generatedPlan as Record<
                                string,
                                Array<Record<string, string>>
                              >
                            ).requirementsMatrix || []
                          ).map((req) => (
                            <tr
                              key={req.id}
                              className="border-b border-slate-100 dark:border-white/[0.02]"
                            >
                              <td className="py-2 font-mono text-slate-500 dark:text-white/60">
                                {req.articleRef}
                              </td>
                              <td className="py-2 text-slate-500 dark:text-white/60">
                                {req.title}
                              </td>
                              <td className="py-2">
                                <span
                                  className={`text-[10px] uppercase px-2 py-0.5 rounded ${
                                    requirementStatusConfig[
                                      req.status as RequirementStatus
                                    ]?.bgColor || ""
                                  } ${requirementStatusConfig[req.status as RequirementStatus]?.color || ""}`}
                                >
                                  {req.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Regenerate button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setGeneratedPlan(null)}
                    className="text-[12px] text-slate-600 dark:text-white/70 hover:text-slate-800 dark:hover:text-white/70 transition-colors"
                  >
                    Regenerate Plan
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
