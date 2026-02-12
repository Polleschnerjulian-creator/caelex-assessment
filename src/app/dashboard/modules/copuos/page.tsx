"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { csrfHeaders } from "@/lib/csrf-client";
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
  Info,
  FileText,
  Clock,
  Loader2,
  Download,
  Plus,
  Satellite,
  Shield,
  Target,
  BookOpen,
  Building2,
  FlaskConical,
  Landmark,
  GraduationCap,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Filter,
  BarChart3,
} from "lucide-react";

// Types
type OrbitRegime =
  | "LEO"
  | "MEO"
  | "GEO"
  | "HEO"
  | "GTO"
  | "cislunar"
  | "deep_space";
type MissionType =
  | "commercial"
  | "scientific"
  | "governmental"
  | "educational"
  | "military";
type SatelliteCategory = "cubesat" | "smallsat" | "medium" | "large" | "mega";
type ComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_assessed"
  | "not_applicable";
type GuidelineSource = "COPUOS" | "IADC" | "ISO";

interface Assessment {
  id: string;
  assessmentName: string | null;
  status: string;
  missionName: string | null;
  orbitRegime: string;
  altitudeKm: number | null;
  inclinationDeg: number | null;
  missionType: string;
  satelliteCategory: string;
  satelliteMassKg: number;
  hasManeuverability: boolean;
  hasPropulsion: boolean;
  plannedLifetimeYears: number;
  isConstellation: boolean;
  constellationSize: number | null;
  launchDate: string | null;
  countryOfRegistry: string | null;
  deorbitStrategy: string | null;
  deorbitTimelineYears: number | null;
  caServiceProvider: string | null;
  complianceScore: number | null;
  mandatoryScore: number | null;
  riskLevel: string | null;
  criticalGaps: number | null;
  majorGaps: number | null;
  guidelineStatuses: GuidelineStatusRecord[];
}

interface GuidelineStatusRecord {
  id: string;
  guidelineId: string;
  status: string;
  notes: string | null;
  evidenceNotes: string | null;
}

interface Guideline {
  id: string;
  source: GuidelineSource;
  referenceNumber: string;
  title: string;
  description: string;
  category: string;
  bindingLevel: string;
  severity: string;
  complianceQuestion: string;
  evidenceRequired: string[];
  implementationGuidance: string[];
  euSpaceActCrossRef?: string[];
  isoReference?: string;
  iadcReference?: string;
}

interface GapAnalysisItem {
  guidelineId: string;
  status: ComplianceStatus;
  priority: "high" | "medium" | "low";
  gap: string;
  recommendation: string;
  estimatedEffort: "low" | "medium" | "high";
  dependencies: string[];
}

// Configuration
const orbitRegimeConfig: Record<
  OrbitRegime,
  { label: string; description: string; color: string }
> = {
  LEO: { label: "Low Earth Orbit", description: "< 2,000 km", color: "blue" },
  MEO: {
    label: "Medium Earth Orbit",
    description: "2,000 - 35,786 km",
    color: "purple",
  },
  GEO: { label: "Geostationary", description: "~35,786 km", color: "amber" },
  HEO: {
    label: "Highly Elliptical",
    description: "Variable apogee",
    color: "orange",
  },
  GTO: { label: "GEO Transfer", description: "Transitional", color: "yellow" },
  cislunar: {
    label: "Cislunar",
    description: "Earth-Moon system",
    color: "cyan",
  },
  deep_space: {
    label: "Deep Space",
    description: "Beyond Moon",
    color: "slate",
  },
};

const missionTypeConfig: Record<
  MissionType,
  { label: string; icon: typeof Building2 }
> = {
  commercial: { label: "Commercial", icon: Building2 },
  scientific: { label: "Scientific", icon: FlaskConical },
  governmental: { label: "Governmental", icon: Landmark },
  educational: { label: "Educational", icon: GraduationCap },
  military: { label: "Defense", icon: Shield },
};

const statusConfig: Record<
  ComplianceStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  compliant: { label: "Compliant", color: "green", icon: CheckCircle2 },
  partial: { label: "Partial", color: "amber", icon: AlertTriangle },
  non_compliant: { label: "Non-Compliant", color: "red", icon: XCircle },
  not_assessed: { label: "Not Assessed", color: "slate", icon: HelpCircle },
  not_applicable: { label: "N/A", color: "gray", icon: MinusCircle },
};

const sourceConfig: Record<
  GuidelineSource,
  { label: string; color: string; description: string }
> = {
  COPUOS: {
    label: "COPUOS LTS",
    color: "blue",
    description: "Long-Term Sustainability Guidelines",
  },
  IADC: {
    label: "IADC",
    color: "purple",
    description: "Debris Mitigation Guidelines",
  },
  ISO: {
    label: "ISO 24113",
    color: "green",
    description: "Space Debris Standard",
  },
};

// Wizard Steps
const STEPS = [
  {
    id: "profile",
    label: "Mission Profile",
    description: "Define mission parameters",
  },
  {
    id: "checklist",
    label: "Compliance Assessment",
    description: "Assess guidelines",
  },
  { id: "gaps", label: "Gap Analysis", description: "Review gaps & actions" },
  { id: "report", label: "Report", description: "Generate compliance report" },
];

function CopuosPageContent() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] =
    useState<Assessment | null>(null);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [score, setScore] = useState<{
    overall: number;
    mandatory: number;
    bySource: Record<string, number>;
  } | null>(null);

  // Form state
  const [form, setForm] = useState<{
    orbitRegime?: OrbitRegime;
    altitudeKm?: number;
    inclinationDeg?: number;
    missionType?: MissionType;
    satelliteMassKg: number;
    hasManeuverability: boolean;
    hasPropulsion: boolean;
    plannedLifetimeYears: number;
    isConstellation: boolean;
    constellationSize?: number;
    launchDate?: string;
    countryOfRegistry?: string;
    deorbitStrategy?: string;
    deorbitTimelineYears?: number;
    caServiceProvider?: string;
  }>({
    satelliteMassKg: 100,
    hasManeuverability: false,
    hasPropulsion: false,
    plannedLifetimeYears: 5,
    isConstellation: false,
  });
  const [missionName, setMissionName] = useState("");
  const [creating, setCreating] = useState(false);

  // Filter state
  const [sourceFilter, setSourceFilter] = useState<GuidelineSource | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | "all">(
    "all",
  );

  // Report state
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await fetch("/api/copuos");
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
      const res = await fetch(`/api/copuos/${assessment.id}`);
      if (res.ok) {
        const data = await res.json();
        setGuidelines(data.applicableGuidelines);
        setGapAnalysis(data.gapAnalysis);
        setScore(data.score);
      }
    } catch (error) {
      console.error("Error fetching assessment details:", error);
    }
  };

  const createAssessment = async () => {
    if (!form.orbitRegime || !form.missionType) return;

    setCreating(true);
    try {
      const res = await fetch("/api/copuos", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          missionName: missionName || null,
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

  const updateGuidelineStatus = async (
    guidelineId: string,
    status: ComplianceStatus,
    notes?: string,
  ) => {
    if (!selectedAssessment) return;

    try {
      const res = await fetch(`/api/copuos/${selectedAssessment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          guidelineStatuses: [{ guidelineId, status, notes }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedAssessment(data.assessment);
        setScore(data.score);
        setGapAnalysis(data.gapAnalysis);
      }
    } catch (error) {
      console.error("Error updating guideline status:", error);
    }
  };

  const generateReport = async () => {
    if (!selectedAssessment) return;

    setGeneratingReport(true);
    try {
      const res = await fetch(`/api/copuos/report/${selectedAssessment.id}`);
      if (res.ok) {
        const data = await res.json();
        // Download as JSON for now (could integrate PDF generation)
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `copuos-compliance-report-${selectedAssessment.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const getGuidelineStatus = (guidelineId: string): ComplianceStatus => {
    const status = selectedAssessment?.guidelineStatuses.find(
      (gs) => gs.guidelineId === guidelineId,
    );
    return (status?.status as ComplianceStatus) || "not_assessed";
  };

  const filteredGuidelines = guidelines.filter((g) => {
    if (sourceFilter !== "all" && g.source !== sourceFilter) return false;
    if (statusFilter !== "all" && getGuidelineStatus(g.id) !== statusFilter)
      return false;
    return true;
  });

  // Calculate summary stats
  const stats = {
    total: guidelines.length,
    compliant: guidelines.filter(
      (g) => getGuidelineStatus(g.id) === "compliant",
    ).length,
    partial: guidelines.filter((g) => getGuidelineStatus(g.id) === "partial")
      .length,
    nonCompliant: guidelines.filter(
      (g) => getGuidelineStatus(g.id) === "non_compliant",
    ).length,
    notAssessed: guidelines.filter(
      (g) => getGuidelineStatus(g.id) === "not_assessed",
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            COPUOS/IADC Compliance
          </h1>
          <p className="text-slate-600 dark:text-white/70 mt-1">
            Assess compliance with international space debris guidelines and
            standards
          </p>
        </div>
        <button
          onClick={() => setShowNewAssessment(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Assessment
        </button>
      </div>

      {/* Standards Overview */}
      <div className="grid grid-cols-3 gap-4">
        {(
          Object.entries(sourceConfig) as [
            GuidelineSource,
            typeof sourceConfig.COPUOS,
          ][]
        ).map(([source, config]) => (
          <div
            key={source}
            className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${config.color}-500/20`}>
                <BookOpen className={`w-5 h-5 text-${config.color}-400`} />
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">
                  {config.label}
                </h3>
                <p className="text-sm text-slate-600 dark:text-white/60">
                  {config.description}
                </p>
              </div>
            </div>
            {score && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-white/60">
                    Compliance
                  </span>
                  <span
                    className={`text-sm font-medium text-${config.color}-400`}
                  >
                    {score.bySource[source] ?? 0}%
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress Steps */}
      {selectedAssessment && (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  activeStep === index
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    activeStep === index
                      ? "bg-emerald-500 text-white"
                      : activeStep > index
                        ? "bg-green-500 text-white"
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-400"
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
                  <div className="text-xs text-slate-500 dark:text-white/50">
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
              <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Your Assessments
                </h2>
                <div className="space-y-3">
                  {assessments.map((assessment) => (
                    <button
                      key={assessment.id}
                      onClick={() => selectAssessment(assessment)}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.02] rounded-lg hover:bg-slate-100 dark:bg-white/[0.06] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-emerald-500/20">
                          <Satellite className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {assessment.missionName ||
                              assessment.assessmentName ||
                              "Untitled"}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-white/60">
                            {
                              orbitRegimeConfig[
                                assessment.orbitRegime as OrbitRegime
                              ]?.label
                            }{" "}
                            • {assessment.satelliteMassKg} kg
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {assessment.complianceScore !== null && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900 dark:text-white">
                              {assessment.complianceScore}%
                            </div>
                            <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                              Compliance
                            </div>
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-12 text-center">
                <Globe2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  No Assessments Yet
                </h2>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Start your COPUOS/IADC/ISO compliance assessment by defining
                  your mission profile.
                </p>
                <button
                  onClick={() => setShowNewAssessment(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
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
            className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
              Mission Profile
            </h2>

            <div className="grid grid-cols-2 gap-6">
              {/* Mission Name */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mission Name
                </label>
                <input
                  type="text"
                  value={missionName}
                  onChange={(e) => setMissionName(e.target.value)}
                  placeholder="e.g., SatCom-1 Mission"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Orbit Regime */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Orbit Regime *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    Object.entries(orbitRegimeConfig) as [
                      OrbitRegime,
                      typeof orbitRegimeConfig.LEO,
                    ][]
                  ).map(([regime, config]) => (
                    <button
                      key={regime}
                      onClick={() => setForm({ ...form, orbitRegime: regime })}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        form.orbitRegime === regime
                          ? "bg-emerald-500/20 border-emerald-500 text-white"
                          : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:border-slate-600"
                      }`}
                    >
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs opacity-75">
                        {config.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mission Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mission Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    Object.entries(missionTypeConfig) as [
                      MissionType,
                      typeof missionTypeConfig.commercial,
                    ][]
                  ).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setForm({ ...form, missionType: type })}
                        className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${
                          form.missionType === type
                            ? "bg-emerald-500/20 border-emerald-500 text-white"
                            : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:border-slate-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Satellite Mass */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Satellite Mass (kg) *
                </label>
                <input
                  type="number"
                  value={form.satelliteMassKg}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      satelliteMassKg: parseFloat(e.target.value) || 0,
                    })
                  }
                  min={0.1}
                  step={0.1}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Altitude */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Altitude (km)
                </label>
                <input
                  type="number"
                  value={form.altitudeKm || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      altitudeKm: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="e.g., 550"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Planned Lifetime */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Planned Lifetime (years)
                </label>
                <input
                  type="number"
                  value={form.plannedLifetimeYears}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      plannedLifetimeYears: parseInt(e.target.value) || 5,
                    })
                  }
                  min={1}
                  max={30}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Capabilities */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Capabilities
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.hasPropulsion}
                      onChange={(e) =>
                        setForm({ ...form, hasPropulsion: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-slate-300">Has Propulsion</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.hasManeuverability}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          hasManeuverability: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-slate-300">Has Maneuverability</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isConstellation}
                      onChange={(e) =>
                        setForm({ ...form, isConstellation: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-slate-300">Constellation</span>
                  </label>
                </div>
              </div>

              {/* Constellation Size */}
              {form.isConstellation && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Constellation Size
                  </label>
                  <input
                    type="number"
                    value={form.constellationSize || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        constellationSize:
                          parseInt(e.target.value) || undefined,
                      })
                    }
                    min={2}
                    placeholder="Number of satellites"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => setShowNewAssessment(false)}
                className="px-4 py-2 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createAssessment}
                disabled={!form.orbitRegime || !form.missionType || creating}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
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
              <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.total}
                </div>
                <div className="text-sm text-slate-600 dark:text-white/60">
                  Applicable Guidelines
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
                <div className="text-sm text-slate-500 dark:text-white/60">
                  Not Assessed
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={sourceFilter}
                  onChange={(e) =>
                    setSourceFilter(e.target.value as GuidelineSource | "all")
                  }
                  className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Sources</option>
                  <option value="COPUOS">COPUOS LTS</option>
                  <option value="IADC">IADC</option>
                  <option value="ISO">ISO 24113</option>
                </select>
              </div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ComplianceStatus | "all")
                }
                className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="compliant">Compliant</option>
                <option value="partial">Partial</option>
                <option value="non_compliant">Non-Compliant</option>
                <option value="not_assessed">Not Assessed</option>
              </select>
            </div>

            {/* Guidelines List */}
            <div className="space-y-3">
              {filteredGuidelines.map((guideline) => {
                const status = getGuidelineStatus(guideline.id);
                const StatusIcon = statusConfig[status].icon;

                return (
                  <div
                    key={guideline.id}
                    className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium bg-${sourceConfig[guideline.source].color}-500/20 text-${sourceConfig[guideline.source].color}-400`}
                          >
                            {guideline.source}
                          </span>
                          <span className="text-sm text-slate-600 dark:text-white/60">
                            {guideline.referenceNumber}
                          </span>
                          {guideline.bindingLevel === "mandatory" && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                              Mandatory
                            </span>
                          )}
                          {guideline.severity === "critical" && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400">
                              Critical
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-slate-900 dark:text-white mb-1">
                          {guideline.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-white/60 mb-3">
                          {guideline.complianceQuestion}
                        </p>

                        {guideline.euSpaceActCrossRef &&
                          guideline.euSpaceActCrossRef.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/50">
                              <ExternalLink className="w-3 h-3" />
                              EU Space Act:{" "}
                              {guideline.euSpaceActCrossRef.join(", ")}
                            </div>
                          )}
                      </div>

                      <div className="flex items-center gap-2">
                        {(
                          [
                            "compliant",
                            "partial",
                            "non_compliant",
                            "not_applicable",
                          ] as ComplianceStatus[]
                        ).map((s) => {
                          const config = statusConfig[s];
                          const Icon = config.icon;
                          return (
                            <button
                              key={s}
                              onClick={() =>
                                updateGuidelineStatus(guideline.id, s)
                              }
                              className={`p-2 rounded-lg transition-colors ${
                                status === s
                                  ? `bg-${config.color}-500/20 text-${config.color}-400`
                                  : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
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
                className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
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
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Gap Analysis
                </h2>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/60">
                  <AlertCircle className="w-4 h-4" />
                  {gapAnalysis.length} gaps identified
                </div>
              </div>

              {gapAnalysis.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-slate-900 dark:text-white font-medium">
                    No gaps identified
                  </p>
                  <p className="text-sm text-slate-600 dark:text-white/60">
                    All assessed guidelines are compliant
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gapAnalysis.slice(0, 15).map((gap) => {
                    const guideline = guidelines.find(
                      (g) => g.id === gap.guidelineId,
                    );
                    return (
                      <div
                        key={gap.guidelineId}
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
                              <span className="text-xs text-slate-500 dark:text-white/50">
                                Effort: {gap.estimatedEffort}
                              </span>
                            </div>
                            <p className="text-slate-900 dark:text-white font-medium mb-1">
                              {gap.gap}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-white/60">
                              {gap.recommendation}
                            </p>
                            {gap.dependencies.length > 0 && (
                              <div className="mt-2 text-xs text-slate-500 dark:text-white/50">
                                Dependencies: {gap.dependencies.join(", ")}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSourceFilter("all");
                              setStatusFilter("all");
                              setActiveStep(1);
                            }}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-900 dark:text-white text-sm rounded-lg transition-colors"
                          >
                            Address
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Continue Button */}
            <div className="flex justify-between">
              <button
                onClick={() => setActiveStep(1)}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to Assessment
              </button>
              <button
                onClick={() => setActiveStep(3)}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
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
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  Compliance Report Ready
                </h2>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Generate a comprehensive compliance report covering all
                  COPUOS, IADC, and ISO 24113 guidelines.
                </p>

                {score && (
                  <div className="flex items-center justify-center gap-8 mb-8">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-slate-900 dark:text-white">
                        {score.overall}%
                      </div>
                      <div className="text-sm text-slate-600 dark:text-white/60">
                        Overall Score
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-amber-400">
                        {score.mandatory}%
                      </div>
                      <div className="text-sm text-slate-600 dark:text-white/60">
                        Mandatory
                      </div>
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
                      <div className="text-sm text-slate-600 dark:text-white/60">
                        Risk Level
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white rounded-lg transition-colors"
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
                className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
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

export default function CopuosPage() {
  return (
    <FeatureGate module="copuos">
      <CopuosPageContent />
    </FeatureGate>
  );
}
