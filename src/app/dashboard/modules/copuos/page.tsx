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
  const [createError, setCreateError] = useState<string | null>(null);

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

    setCreateError(null);
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

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setCreateError(errData?.error || `Request failed (${res.status})`);
        return;
      }

      const data = await res.json();
      setAssessments((prev) => [data.assessment, ...prev]);
      await selectAssessment(data.assessment);
      setShowNewAssessment(false);
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
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-[var(--text-primary)]">
            COPUOS/IADC Compliance
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Assess compliance with international space debris guidelines and
            standards
          </p>
        </div>
        <button
          onClick={() => setShowNewAssessment(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors"
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
            className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${config.color}-500/20`}>
                <BookOpen className={`w-5 h-5 text-${config.color}-400`} />
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">
                  {config.label}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {config.description}
                </p>
              </div>
            </div>
            {score && (
              <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">
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
        <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  activeStep === index
                    ? "bg-[var(--accent-success-soft)] text-[var(--accent-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]:text-white"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    activeStep === index
                      ? "bg-[var(--accent-primary)] text-white"
                      : activeStep > index
                        ? "bg-[var(--accent-success)] text-white"
                        : "bg-[var(--surface-sunken)] text-[var(--text-tertiary)]"
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
                  <div className="text-xs text-[var(--text-secondary)]">
                    {step.description}
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-[var(--text-secondary)] ml-4" />
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
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {assessments.length > 0 ? (
              <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                  Your Assessments
                </h2>
                <div className="space-y-3">
                  {assessments.map((assessment) => (
                    <button
                      key={assessment.id}
                      onClick={() => selectAssessment(assessment)}
                      className="w-full flex items-center justify-between p-4 bg-[var(--surface-sunken)][0.02] rounded-lg hover:bg-[var(--surface-sunken)] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-[var(--accent-success-soft)]">
                          <Satellite className="w-5 h-5 text-[var(--accent-primary)]" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-[var(--text-primary)]">
                            {assessment.missionName ||
                              assessment.assessmentName ||
                              "Untitled"}
                          </div>
                          <div className="text-sm text-[var(--text-secondary)]">
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
                            <div className="text-lg font-bold text-[var(--text-primary)]">
                              {assessment.complianceScore}%
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              Compliance
                            </div>
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)]" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-12 text-center">
                <Globe2 className="w-16 h-16 text-[var(--text-secondary)] mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  No Assessments Yet
                </h2>
                <p className="text-[var(--text-tertiary)] mb-6 max-w-md mx-auto">
                  Start your COPUOS/IADC/ISO compliance assessment by defining
                  your mission profile.
                </p>
                <button
                  onClick={() => setShowNewAssessment(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors"
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
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
              Mission Profile
            </h2>

            <div className="grid grid-cols-2 gap-6">
              {/* Mission Name */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-2">
                  Mission Name
                </label>
                <input
                  type="text"
                  value={missionName}
                  onChange={(e) => setMissionName(e.target.value)}
                  placeholder="e.g., SatCom-1 Mission"
                  className="w-full px-4 py-2 bg-[var(--surface-sunken)][0.02] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
                />
              </div>

              {/* Orbit Regime */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-2">
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
                          ? "bg-[var(--accent-success-soft)] border-[var(--accent-primary)] text-white"
                          : "bg-[var(--surface-sunken)][0.02] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-default)]"
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
                <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-2">
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
                            ? "bg-[var(--accent-success-soft)] border-[var(--accent-primary)] text-white"
                            : "bg-[var(--surface-sunken)][0.02] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-default)]"
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
                <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-2">
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
                  className="w-full px-4 py-2 bg-[var(--surface-sunken)][0.02] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
                />
              </div>

              {/* Altitude */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-2">
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
                  className="w-full px-4 py-2 bg-[var(--surface-sunken)][0.02] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
                />
              </div>

              {/* Planned Lifetime */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-2">
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
                  className="w-full px-4 py-2 bg-[var(--surface-sunken)][0.02] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
                />
              </div>

              {/* Capabilities */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-2">
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
                      className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--surface-sunken)][0.02] text-[var(--accent-primary)] focus:ring-[var(--border-focus)]"
                    />
                    <span className="text-[var(--text-tertiary)]">
                      Has Propulsion
                    </span>
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
                      className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--surface-sunken)][0.02] text-[var(--accent-primary)] focus:ring-[var(--border-focus)]"
                    />
                    <span className="text-[var(--text-tertiary)]">
                      Has Maneuverability
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isConstellation}
                      onChange={(e) =>
                        setForm({ ...form, isConstellation: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--surface-sunken)][0.02] text-[var(--accent-primary)] focus:ring-[var(--border-focus)]"
                    />
                    <span className="text-[var(--text-tertiary)]">
                      Constellation
                    </span>
                  </label>
                </div>
              </div>

              {/* Constellation Size */}
              {form.isConstellation && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-2">
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
                    className="w-full px-4 py-2 bg-[var(--surface-sunken)][0.02] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            {createError && (
              <div className="flex items-center gap-2 px-4 py-3 mt-6 rounded-lg bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 text-[var(--accent-danger)] text-body">
                <AlertTriangle size={14} className="flex-shrink-0" />
                {createError}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-[var(--border-default)]">
              <button
                onClick={() => setShowNewAssessment(false)}
                className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createAssessment}
                disabled={!form.orbitRegime || !form.missionType || creating}
                className="flex items-center gap-2 px-6 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--text-primary)] disabled:text-[var(--text-secondary)] text-white rounded-lg transition-colors"
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
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4">
                <div className="text-2xl font-bold text-[var(--text-primary)]">
                  {stats.total}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  Applicable Guidelines
                </div>
              </div>
              <div className="bg-[var(--accent-success)]/10 border border-[var(--accent-success)/30] rounded-xl p-4">
                <div className="text-2xl font-bold text-[var(--accent-success)]">
                  {stats.compliant}
                </div>
                <div className="text-sm text-[var(--accent-success)]/70">
                  Compliant
                </div>
              </div>
              <div className="bg-[var(--accent-warning-soft)] border border-amber-500/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-[var(--accent-warning)]">
                  {stats.partial}
                </div>
                <div className="text-sm text-[var(--accent-warning)]/70">
                  Partial
                </div>
              </div>
              <div className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)/30] rounded-xl p-4">
                <div className="text-2xl font-bold text-[var(--accent-danger)]">
                  {stats.nonCompliant}
                </div>
                <div className="text-sm text-[var(--accent-danger)]/70">
                  Non-Compliant
                </div>
              </div>
              <div className="bg-[var(--surface-sunken)]0/10 border border-[var(--border-default)]/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-[var(--text-tertiary)]">
                  {stats.notAssessed}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  Not Assessed
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[var(--text-tertiary)]" />
                <select
                  value={sourceFilter}
                  onChange={(e) =>
                    setSourceFilter(e.target.value as GuidelineSource | "all")
                  }
                  className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
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
                className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
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
                    className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium bg-${sourceConfig[guideline.source].color}-500/20 text-${sourceConfig[guideline.source].color}-400`}
                          >
                            {guideline.source}
                          </span>
                          <span className="text-sm text-[var(--text-secondary)]">
                            {guideline.referenceNumber}
                          </span>
                          {guideline.bindingLevel === "mandatory" && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--accent-danger-soft)] text-[var(--accent-danger)]">
                              Mandatory
                            </span>
                          )}
                          {guideline.severity === "critical" && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400">
                              Critical
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-[var(--text-primary)] mb-1">
                          {guideline.title}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-3">
                          {guideline.complianceQuestion}
                        </p>

                        {guideline.euSpaceActCrossRef &&
                          guideline.euSpaceActCrossRef.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
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
                                  : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]:text-white"
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
                className="flex items-center gap-2 px-6 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors"
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
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Gap Analysis
                </h2>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <AlertCircle className="w-4 h-4" />
                  {gapAnalysis.length} gaps identified
                </div>
              </div>

              {gapAnalysis.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-[var(--accent-success)] mx-auto mb-3" />
                  <p className="text-[var(--text-primary)] font-medium">
                    No gaps identified
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
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
                            ? "bg-[var(--accent-danger)]/10 border-[var(--accent-danger)/30]"
                            : gap.priority === "medium"
                              ? "bg-[var(--accent-warning-soft)] border-amber-500/30"
                              : "bg-[var(--surface-sunken)]0/10 border-[var(--border-default)]/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  gap.priority === "high"
                                    ? "bg-[var(--accent-danger-soft)] text-[var(--accent-danger)]"
                                    : gap.priority === "medium"
                                      ? "bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]"
                                      : "bg-[var(--surface-sunken)]0/20 text-[var(--text-tertiary)]"
                                }`}
                              >
                                {gap.priority.toUpperCase()} PRIORITY
                              </span>
                              <span className="text-xs text-[var(--text-secondary)]">
                                Effort: {gap.estimatedEffort}
                              </span>
                            </div>
                            <p className="text-[var(--text-primary)] font-medium mb-1">
                              {gap.gap}
                            </p>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {gap.recommendation}
                            </p>
                            {gap.dependencies.length > 0 && (
                              <div className="mt-2 text-xs text-[var(--text-secondary)]">
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
                            className="px-3 py-1.5 bg-[var(--surface-sunken)] hover:bg-[var(--surface-sunken)] text-[var(--text-primary)] text-sm rounded-lg transition-colors"
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
                className="flex items-center gap-2 px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to Assessment
              </button>
              <button
                onClick={() => setActiveStep(3)}
                className="flex items-center gap-2 px-6 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors"
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
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-[var(--accent-primary)] mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  Compliance Report Ready
                </h2>
                <p className="text-[var(--text-tertiary)] mb-6 max-w-md mx-auto">
                  Generate a comprehensive compliance report covering all
                  COPUOS, IADC, and ISO 24113 guidelines.
                </p>

                {score && (
                  <div className="flex items-center justify-center gap-8 mb-8">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-[var(--text-primary)]">
                        {score.overall}%
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        Overall Score
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-[var(--accent-warning)]">
                        {score.mandatory}%
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        Mandatory
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-4xl font-bold ${
                          selectedAssessment.riskLevel === "low"
                            ? "text-[var(--accent-success)]"
                            : selectedAssessment.riskLevel === "medium"
                              ? "text-[var(--accent-warning)]"
                              : selectedAssessment.riskLevel === "high"
                                ? "text-orange-400"
                                : "text-[var(--accent-danger)]"
                        }`}
                      >
                        {selectedAssessment.riskLevel?.toUpperCase() || "N/A"}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        Risk Level
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--text-primary)] text-white rounded-lg transition-colors"
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
                className="flex items-center gap-2 px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]:text-white transition-colors"
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
