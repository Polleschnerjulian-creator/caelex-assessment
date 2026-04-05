"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  Rocket,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  Info,
  FileText,
  Clock,
  Loader2,
  Plus,
  Satellite,
  Globe,
  Shield,
  Zap,
  Target,
  Sparkles,
  Calculator,
  Download,
  Trash2,
  X,
} from "lucide-react";
import EvidencePanel from "@/components/audit/EvidencePanel";
import AstraButton from "@/components/astra/AstraButton";
import AssessmentFieldForm from "@/components/debris/AssessmentFieldForm";
import { suggestComplianceStatus } from "@/lib/compliance/debris-auto-assess";
import { csrfHeaders } from "@/lib/csrf-client";
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
  responses: Record<string, unknown> | null;
}

interface RequirementWithStatus extends DebrisRequirement {
  status: RequirementStatus;
  notes: string | null;
  evidenceNotes: string | null;
  responses: Record<string, unknown> | null;
  statusId: string | null;
}

interface ManeuverEntry {
  id: string;
  tcaDate: string;
  conjunctionId: string;
  pcBefore: number;
  pcAfter: number;
  deltaVUsed: number;
  burnDurationSeconds: number;
  outcome: "successful" | "not_required" | "failed";
  notes: string;
  createdAt: string;
}

interface OrbitalLifetimeEstimate {
  estimatedLifetimeYears: number;
  estimatedDecayDate: string;
  confidenceLevel: "high" | "medium" | "low";
  assumptions: string[];
  isWithin25Years: boolean;
  isWithin5Years: boolean;
  solarActivityAssumption: string;
}

// Static cross-reference mapping: requirement ID -> IADC guideline section
const IADC_CROSS_REF: Record<string, string> = {
  trackability: "IADC-02-01 Rev. 7.1, \u00a75.1",
  collision_avoidance_service: "IADC-02-01 Rev. 7.1, \u00a75.2",
  maneuverability: "IADC-02-01 Rev. 7.1, \u00a75.2.2",
  debris_mitigation_plan: "IADC-02-01 Rev. 7.1, \u00a74",
  fragmentation_avoidance: "IADC-02-01 Rev. 7.1, \u00a75.3",
  light_pollution: "IADC-02-01 Rev. 7.1, \u00a75.4",
  large_constellation_management: "IADC-02-01 Rev. 7.1, \u00a75.3.3",
  large_constellation_disposal: "IADC-02-01 Rev. 7.1, \u00a76.3",
  end_of_life_leo: "IADC-02-01 Rev. 7.1, \u00a76.1",
  end_of_life_geo: "IADC-02-01 Rev. 7.1, \u00a76.2",
  end_of_life_meo: "IADC-02-01 Rev. 7.1, \u00a76.3",
  passivation_eol: "IADC-02-01 Rev. 7.1, \u00a75.3.1",
};

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

const PLAN_SECTION_LABELS: Record<string, string> = {
  missionOverview: "Missionsübersicht",
  collisionAvoidance: "Kollisionsvermeidung",
  passivation: "Passivierung",
  endOfLifeDisposal: "End-of-Life Entsorgung",
  twentyFiveYearCompliance: "25-Jahres-Regel Compliance",
  trackability: "Verfolgbarkeit",
  fragmentationAvoidance: "Fragmentierungsvermeidung",
  maneuverCapability: "Manövrierfähigkeit",
  constellationManagement: "Konstellationsmanagement",
  complianceVerification: "Compliance-Verifizierung",
};

const PLAN_FIELD_LABELS: Record<string, string> = {
  missionName: "Missionsname",
  operator: "Betreiber",
  orbitParameters: "Orbitparameter",
  missionDuration: "Missionsdauer",
  satelliteCount: "Satellitenanzahl",
  constellationTier: "Konstellationsklasse",
  strategy: "Strategie",
  serviceProvider: "Dienstleister",
  maneuverCapability: "Manövrierfähigkeit",
  procedures: "Verfahren",
  method: "Methode",
  timeline: "Zeitplan",
  propellantBudget: "Treibstoffbudget",
  backupStrategy: "Backup-Strategie",
  designMeasures: "Designmaßnahmen",
  operationalProcedures: "Betriebsverfahren",
  energySources: "Energiequellen",
  twentyFiveYearCompliance: "25-Jahres-Compliance",
  calculationMethod: "Berechnungsmethode",
  uncertaintyMargin: "Unsicherheitsmarge",
};

function DebrisPageContent() {
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
  const [createError, setCreateError] = useState<string | null>(null);

  // Expandable card state
  const [expandedRequirement, setExpandedRequirement] = useState<string | null>(
    null,
  );
  const [requirementResponses, setRequirementResponses] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Generated plan state
  const [generatedPlan, setGeneratedPlan] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  // Removed PDF download in favor of AI Document Studio

  // Casualty Risk Calculator state
  const [craOpen, setCraOpen] = useState(false);
  const [craCalculating, setCraCalculating] = useState(false);
  const [craError, setCraError] = useState<string | null>(null);
  const [craResult, setCraResult] = useState<{
    expectedCasualties: number;
    isCompliant: boolean;
    casualtyAreaM2: number;
    impactProbability: number;
    populationDensity: number;
    complianceThreshold: number;
    margin: number;
    breakdown: { label: string; value: string }[];
    recommendation: string;
  } | null>(null);
  const [craForm, setCraForm] = useState({
    spacecraftDryMassKg: 200,
    numberOfSurvivingComponents: 5,
    averageSurvivingAreaM2: 0.05,
    reentryInclinationDeg: 51.6,
    isControlledReentry: false,
    targetLatitudeDeg: undefined as number | undefined,
    targetLongitudeDeg: undefined as number | undefined,
  });

  // ─── Maneuver Log state ──────────────────────────────────────────────
  const [maneuvers, setManeuvers] = useState<ManeuverEntry[]>([]);
  const [maneuversLoading, setManeuversLoading] = useState(false);
  const [showManeuverForm, setShowManeuverForm] = useState(false);
  const [maneuverSaving, setManeuverSaving] = useState(false);
  const [maneuverForm, setManeuverForm] = useState({
    tcaDate: "",
    conjunctionId: "",
    pcBefore: 0,
    pcAfter: 0,
    deltaVUsed: 0,
    burnDurationSeconds: 0,
    outcome: "successful" as "successful" | "not_required" | "failed",
    notes: "",
  });

  // ─── Orbital Lifetime Estimator state ────────────────────────────────
  const [lifetimeEstimate, setLifetimeEstimate] =
    useState<OrbitalLifetimeEstimate | null>(null);
  const [lifetimeLoading, setLifetimeLoading] = useState(false);
  const [lifetimeForm, setLifetimeForm] = useState({
    altitudeKm: 0,
    inclinationDeg: 51.6,
    ballisticCoefficientKgPerM2: 50,
    solarFluxF107: 120,
  });

  useEffect(() => {
    fetchAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // C-3: Load cached plan from localStorage when assessment changes
  useEffect(() => {
    if (selectedAssessment?.id && !generatedPlan) {
      try {
        const cached = localStorage.getItem(
          `debris-plan-${selectedAssessment.id}`,
        );
        if (cached) setGeneratedPlan(JSON.parse(cached));
      } catch {
        // Ignore parse errors from corrupted cache
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssessment?.id]);

  // Load maneuver log + pre-fill orbital lifetime form when assessment changes
  useEffect(() => {
    if (selectedAssessment?.id) {
      fetchManeuvers(selectedAssessment.id);
      // Pre-fill altitude from assessment
      if (selectedAssessment.altitudeKm) {
        setLifetimeForm((prev) => ({
          ...prev,
          altitudeKm: selectedAssessment.altitudeKm!,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssessment?.id]);

  const fetchManeuvers = async (assessmentId: string) => {
    setManeuversLoading(true);
    try {
      const res = await fetch(`/api/debris/${assessmentId}/maneuvers`);
      if (res.ok) {
        const data = await res.json();
        setManeuvers(data.maneuvers);
      }
    } catch (error) {
      console.error("Error fetching maneuvers:", error);
    } finally {
      setManeuversLoading(false);
    }
  };

  const addManeuver = async () => {
    if (!selectedAssessment) return;
    setManeuverSaving(true);
    try {
      const res = await fetch(
        `/api/debris/${selectedAssessment.id}/maneuvers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify(maneuverForm),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setManeuvers((prev) => [data.maneuver, ...prev]);
        setShowManeuverForm(false);
        setManeuverForm({
          tcaDate: "",
          conjunctionId: "",
          pcBefore: 0,
          pcAfter: 0,
          deltaVUsed: 0,
          burnDurationSeconds: 0,
          outcome: "successful",
          notes: "",
        });
      }
    } catch (error) {
      console.error("Error adding maneuver:", error);
    } finally {
      setManeuverSaving(false);
    }
  };

  const deleteManeuver = async (maneuverIds: string[]) => {
    if (!selectedAssessment) return;
    try {
      const res = await fetch(
        `/api/debris/${selectedAssessment.id}/maneuvers`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ maneuverIds }),
        },
      );
      if (res.ok) {
        setManeuvers((prev) => prev.filter((m) => !maneuverIds.includes(m.id)));
      }
    } catch (error) {
      console.error("Error deleting maneuver:", error);
    }
  };

  const exportManeuversCSV = () => {
    if (maneuvers.length === 0) return;
    const headers = [
      "Date",
      "Conjunction ID",
      "Pc Before",
      "Pc After",
      "Delta-V (m/s)",
      "Burn Duration (s)",
      "Outcome",
      "Notes",
    ];
    const rows = maneuvers.map((m) => [
      m.tcaDate,
      m.conjunctionId,
      String(m.pcBefore),
      String(m.pcAfter),
      String(m.deltaVUsed),
      String(m.burnDurationSeconds),
      m.outcome,
      `"${(m.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maneuver-log-${selectedAssessment?.id || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const estimateOrbitalLifetime = async () => {
    setLifetimeLoading(true);
    setLifetimeEstimate(null);
    try {
      const res = await fetch("/api/debris/orbital-lifetime", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(lifetimeForm),
      });
      if (res.ok) {
        const data = await res.json();
        setLifetimeEstimate(data.estimate);
      }
    } catch (error) {
      console.error("Error estimating orbital lifetime:", error);
    } finally {
      setLifetimeLoading(false);
    }
  };

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
        // Initialize local responses from persisted data
        const initial: Record<string, Record<string, unknown>> = {};
        for (const req of data.requirements) {
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

  const createAssessment = async () => {
    if (!form.orbitType || !form.hasManeuverability || !form.deorbitStrategy)
      return;

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/debris", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
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

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setCreateError(errData?.error || `Request failed (${res.status})`);
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
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
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

  const saveResponses = useCallback(
    async (requirementId: string, responses: Record<string, unknown>) => {
      if (!selectedAssessment) return;
      try {
        await fetch("/api/debris/requirements", {
          method: "PUT",
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
        if (saveTimersRef.current[requirementId]) {
          clearTimeout(saveTimersRef.current[requirementId]);
        }
        const timer = setTimeout(() => {
          saveResponses(requirementId, updated);
        }, 500);
        saveTimersRef.current[requirementId] = timer;

        return next;
      });
    },
    [saveResponses],
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

  const generatePlan = async () => {
    if (!selectedAssessment) return;

    setGeneratingPlan(true);
    setPlanError(null);
    try {
      const res = await fetch("/api/debris/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ assessmentId: selectedAssessment.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedPlan(data.plan);
        // C-3: Persist generated plan in localStorage
        localStorage.setItem(
          `debris-plan-${selectedAssessment.id}`,
          JSON.stringify(data.plan),
        );
        setSelectedAssessment((prev) =>
          prev ? { ...prev, planGenerated: true } : prev,
        );
      } else {
        const errData = await res.json().catch(() => null);
        setPlanError(
          errData?.error || `Plan-Generierung fehlgeschlagen (${res.status})`,
        );
      }
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : "Plan-Generierung fehlgeschlagen",
      );
    } finally {
      setGeneratingPlan(false);
    }
  };

  const calculateCasualtyRisk = async () => {
    setCraCalculating(true);
    setCraError(null);
    setCraResult(null);
    try {
      const res = await fetch("/api/debris/casualty-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(craForm),
      });

      if (res.ok) {
        const data = await res.json();
        setCraResult(data.result);
      } else {
        const errData = await res.json().catch(() => null);
        setCraError(errData?.error || `Calculation failed (${res.status})`);
      }
    } catch (err) {
      setCraError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setCraCalculating(false);
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
      <div className="" role="status" aria-live="polite">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--surface-sunken)] rounded w-1/3" />
          <div className="h-4 bg-[var(--surface-sunken)] rounded w-1/2" />
          <div className="grid grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-[var(--surface-raised)] rounded-xl"
              />
            ))}
          </div>
        </div>
        <span className="sr-only">Loading debris assessment...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px]">
      {/* Header */}
      <div className="mb-8">
        <p className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-3">
          MODULE 05
        </p>
        <h1 className="text-display-sm font-medium text-[var(--text-primary)] mb-1">
          Debris Mitigation Assessment
        </h1>
        <p className="text-body-lg text-[var(--text-secondary)]">
          Assess compliance with EU Space Act debris requirements (Art. 58-73)
        </p>
      </div>

      {/* Compliance Metrics (when assessment selected) */}
      {selectedAssessment && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5">
            <p className="text-display font-semibold text-[var(--text-primary)]">
              {metrics.compliant}/{metrics.total}
            </p>
            <p className="text-caption text-[var(--text-secondary)] mt-1">
              requirements compliant
            </p>
          </div>
          <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5">
            <p className="text-display font-semibold text-[var(--text-primary)]">
              {selectedAssessment.complianceScore || 0}%
            </p>
            <p className="text-caption text-[var(--text-secondary)] mt-1">
              compliance score
            </p>
          </div>
          <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5">
            <p
              className={`text-display font-semibold ${(() => {
                const years = selectedAssessment?.deorbitTimelineYears;
                if (!years) return "text-[var(--text-tertiary)]";
                if (years <= 5) return "text-[var(--accent-success)]";
                if (years <= 25) return "text-[var(--accent-warning)]";
                return "text-[var(--accent-error)]";
              })()}`}
            >
              {selectedAssessment.deorbitTimelineYears || "\u2014"}
            </p>
            <p className="text-caption text-[var(--text-secondary)] mt-1">
              years to deorbit
            </p>
          </div>
          <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5">
            <p className="text-display font-semibold text-[var(--text-primary)]">
              {selectedAssessment.caServiceProvider || "\u2014"}
            </p>
            <p className="text-caption text-[var(--text-secondary)] mt-1">
              CA service
            </p>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="mb-8">
        <div
          className="flex items-center gap-2"
          role="tablist"
          aria-label="Debris assessment steps"
        >
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                role="tab"
                aria-selected={activeStep === index}
                aria-controls={`tabpanel-${step.id}`}
                id={`tab-${step.id}`}
                onClick={() => setActiveStep(index)}
                disabled={index > 0 && !selectedAssessment}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeStep === index
                    ? "bg-[var(--surface-sunken)] border border-[var(--border-default)][0.1]"
                    : index > 0 && !selectedAssessment
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-[var(--surface-sunken)]:bg-[var(--surface-sunken)]"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-caption ${
                    activeStep === index
                      ? "bg-[var(--text-primary)] text-white"
                      : activeStep > index
                        ? "bg-[var(--accent-success-soft)] text-[var(--accent-success)]"
                        : "bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
                  }`}
                >
                  {activeStep > index ? (
                    <CheckCircle2 size={12} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="text-left hidden lg:block">
                  <p
                    className={`text-body font-medium ${activeStep === index ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                  >
                    {step.label}
                  </p>
                  <p className="text-caption text-[var(--text-secondary)]">
                    {step.description}
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
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Mission Profile */}
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
                    Your Debris Assessments
                  </p>
                  <button
                    onClick={() => setShowNewAssessment(true)}
                    className="flex items-center gap-2 text-small text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
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
                    className={`w-full bg-[var(--surface-raised)] border rounded-xl p-5 text-left hover:bg-[var(--surface-sunken)] transition-all ${
                      selectedAssessment?.id === assessment.id
                        ? "border-[var(--border-default)][0.15]"
                        : "border-[var(--border-default)]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Satellite
                            size={18}
                            className="text-[var(--text-secondary)]"
                          />
                          <span className="text-subtitle font-medium text-[var(--text-primary)]">
                            {assessment.missionName || "Unnamed Mission"}
                          </span>
                          <span className="text-micro uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-sunken)] text-[var(--text-secondary)]">
                            {assessment.constellationTier}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-small text-[var(--text-secondary)]">
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
                        className="text-[var(--text-secondary)]"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* New assessment form */}
            {(assessments.length === 0 || showNewAssessment) && (
              <div className="space-y-6">
                <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                  <h2 className="text-title font-medium text-[var(--text-primary)] mb-4">
                    Mission Profile
                  </h2>
                  <p className="text-body text-[var(--text-secondary)] mb-6">
                    Define your mission parameters to determine applicable
                    debris requirements.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mission Name */}
                    <div>
                      <label className="block text-small text-[var(--text-secondary)] mb-2">
                        Mission Name (optional)
                      </label>
                      <input
                        type="text"
                        value={missionName}
                        onChange={(e) => setMissionName(e.target.value)}
                        placeholder="e.g., Constellation Alpha"
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]:border-[var(--border-default)]"
                      />
                    </div>

                    {/* Orbit Type */}
                    <div>
                      <label className="block text-small text-[var(--text-secondary)] mb-2">
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
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]:border-[var(--border-default)]"
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
                        <label className="block text-small text-[var(--text-secondary)] mb-2">
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
                          className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]:border-[var(--border-default)]"
                        />
                      </div>
                    )}

                    {/* Satellite Count */}
                    <div>
                      <label className="block text-small text-[var(--text-secondary)] mb-2">
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
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]:border-[var(--border-default)]"
                      />
                      {form.satelliteCount && form.satelliteCount > 1 && (
                        <p className="text-caption text-[var(--text-secondary)] mt-1">
                          Tier: {getConstellationTier(form.satelliteCount)}
                        </p>
                      )}
                    </div>

                    {/* Maneuverability */}
                    <div>
                      <label className="block text-small text-[var(--text-secondary)] mb-2">
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
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]:border-[var(--border-default)]"
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
                      <label className="block text-small text-[var(--text-secondary)] mb-2">
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
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]:border-[var(--border-default)]"
                      />
                    </div>

                    {/* Deorbit Strategy */}
                    <div>
                      <label className="block text-small text-[var(--text-secondary)] mb-2">
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
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]:border-[var(--border-default)] disabled:opacity-50"
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
                          <label className="block text-small text-[var(--text-secondary)] mb-2">
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
                            className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]:border-[var(--border-default)]"
                          />
                        </div>
                      )}

                    {/* CA Service Provider */}
                    <div>
                      <label className="block text-small text-[var(--text-secondary)] mb-2">
                        CA Service Provider
                      </label>
                      <select
                        value={caServiceProvider}
                        onChange={(e) => setCaServiceProvider(e.target.value)}
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]:border-[var(--border-default)]"
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
                        className="w-4 h-4 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded"
                      />
                      <label
                        htmlFor="passivation"
                        className="text-body text-[var(--text-secondary)]"
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
                        className="flex items-start gap-3 p-4 bg-[var(--accent-warning-soft)] border border-[var(--accent-warning)/20] rounded-lg"
                      >
                        <AlertTriangle
                          size={16}
                          className="text-[var(--accent-warning)] mt-0.5"
                          aria-hidden="true"
                        />
                        <p className="text-body text-[var(--accent-warning)]/80">
                          {warning}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview of applicable requirements */}
                {previewRequirements.length > 0 && (
                  <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                    <h3 className="text-body-lg font-medium text-[var(--text-primary)] mb-4">
                      Applicable Requirements Preview
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {previewRequirements.map((req) => (
                        <span
                          key={req.id}
                          className={`text-caption px-2 py-1 rounded-full ${
                            severityConfig[req.severity].bgColor
                          } ${severityConfig[req.severity].color}`}
                        >
                          {req.articleRef}
                        </span>
                      ))}
                    </div>
                    <p className="text-small text-[var(--text-secondary)] mt-3">
                      {previewRequirements.length} requirements will apply to
                      this mission
                    </p>
                  </div>
                )}

                {/* Actions */}
                {createError && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 text-[var(--accent-danger)] text-body">
                    <AlertTriangle size={14} className="flex-shrink-0" />
                    {createError}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  {assessments.length > 0 && (
                    <button
                      onClick={() => setShowNewAssessment(false)}
                      className="px-4 py-2 text-body text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
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
                    className="flex items-center gap-2 bg-[var(--text-primary)] text-white px-5 py-2.5 rounded-lg font-medium text-body hover:bg-[var(--text-primary)] transition-all disabled:opacity-50"
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
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!selectedAssessment ? (
              <div className="bg-[var(--surface-raised)] border border-dashed border-[var(--border-default)] rounded-xl p-12 text-center">
                <AlertCircle
                  size={32}
                  className="mx-auto text-[var(--text-secondary)] mb-3"
                />
                <p className="text-body-lg text-[var(--text-secondary)] mb-4">
                  No assessment selected. Create a mission profile first.
                </p>
                <button
                  onClick={() => setActiveStep(0)}
                  className="text-body text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                >
                  ← Go to Mission Profile
                </button>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-title font-medium text-[var(--text-primary)] mb-1">
                        Compliance Checklist
                      </h2>
                      <p className="text-body text-[var(--text-secondary)]">
                        {metrics.compliant} of {metrics.total} requirements
                        assessed as compliant
                      </p>
                    </div>
                    <p className="text-[28px] font-semibold text-[var(--text-primary)]">
                      {selectedAssessment.complianceScore || 0}%
                    </p>
                  </div>
                  <div className="h-2 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${selectedAssessment.complianceScore || 0}%`,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[var(--accent-success)] to-[var(--accent-primary)] rounded-full"
                      role="progressbar"
                      aria-valuenow={selectedAssessment.complianceScore || 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Compliance score"
                    />
                  </div>
                </div>

                {/* Requirements list */}
                <div className="space-y-3">
                  {requirements.map((req) => {
                    const statusInfo = requirementStatusConfig[req.status];
                    const sevInfo = severityConfig[req.severity];
                    const isExpanded = expandedRequirement === req.id;
                    const fields = req.assessmentFields || [];
                    const responses = requirementResponses[req.id] || {};
                    const completedFields = getFieldCompletionCount(
                      req.id,
                      fields.length,
                    );
                    const suggested = suggestComplianceStatus(
                      req.complianceRule,
                      responses,
                    );

                    return (
                      <div
                        key={req.id}
                        className={`bg-[var(--surface-raised)][0.015] border rounded-xl transition-all ${
                          isExpanded
                            ? "border-[var(--border-default)][0.12]"
                            : "border-[var(--border-default)] hover:border-[var(--border-default)]:border-[var(--border-default)]"
                        }`}
                      >
                        {/* Card header — clickable */}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRequirement(isExpanded ? null : req.id)
                          }
                          className="w-full p-5 text-left"
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
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-caption text-[var(--text-secondary)]">
                                      {req.articleRef}
                                    </span>
                                    <h3 className="text-body-lg font-medium text-[var(--text-primary)]">
                                      {req.title}
                                    </h3>
                                    <span
                                      className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${sevInfo.bgColor} ${sevInfo.color}`}
                                    >
                                      {req.severity}
                                    </span>
                                  </div>
                                  {/* Collapsed summary */}
                                  {!isExpanded && fields.length > 0 && (
                                    <p className="text-caption text-[var(--text-secondary)] mt-1">
                                      {completedFields}/{fields.length} fields
                                      completed
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span
                                    className={`text-micro uppercase tracking-wider px-2.5 py-1 rounded-lg ${statusInfo.bgColor} ${statusInfo.color}`}
                                  >
                                    {statusInfo.label}
                                  </span>
                                  <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronDown
                                      size={16}
                                      className="text-[var(--text-tertiary)]"
                                    />
                                  </motion.div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Expanded content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 space-y-4">
                                {/* Divider */}
                                <div className="border-t border-[var(--border-subtle)][0.05]" />

                                {/* Question */}
                                <p className="text-body text-[var(--text-secondary)]">
                                  {req.complianceQuestion}
                                </p>

                                {/* COPUOS / IADC Cross-Reference */}
                                {(req.isoReference ||
                                  IADC_CROSS_REF[req.id]) && (
                                  <p className="text-small text-[var(--text-tertiary)] mt-1">
                                    {req.isoReference
                                      ? `ISO 24113: ${req.isoReference}`
                                      : ""}
                                    {req.isoReference && IADC_CROSS_REF[req.id]
                                      ? " | "
                                      : ""}
                                    {IADC_CROSS_REF[req.id]
                                      ? `IADC Guideline: ${IADC_CROSS_REF[req.id]}`
                                      : ""}
                                  </p>
                                )}

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
                                        {requirementStatusConfig[suggested]
                                          ?.label || suggested}
                                      </span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateRequirementStatus(
                                          req.id,
                                          suggested,
                                        )
                                      }
                                      className="ml-auto text-caption bg-[var(--accent-info-soft)]0/10 text-[var(--accent-primary)] px-3 py-1 rounded-lg hover:bg-[var(--accent-info-soft)]0/20 transition-colors"
                                    >
                                      Accept
                                    </button>
                                  </div>
                                )}

                                {/* Contradiction warning */}
                                {suggested &&
                                  suggested !== req.status &&
                                  req.status !== "not_assessed" && (
                                    <div className="text-small text-red-500 mt-1">
                                      Gespeicherter Status (
                                      {requirementStatusConfig[req.status]
                                        ?.label || req.status}
                                      ) widerspricht den Antworten (
                                      {requirementStatusConfig[suggested]
                                        ?.label || suggested}
                                      )
                                    </div>
                                  )}

                                {/* Manual override */}
                                <div className="flex items-center gap-3">
                                  <label className="text-caption text-[var(--text-secondary)]">
                                    Status:
                                  </label>
                                  <select
                                    value={req.status}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateRequirementStatus(
                                        req.id,
                                        e.target.value as RequirementStatus,
                                      );
                                    }}
                                    aria-label={`Compliance status for ${req.title}`}
                                    className={`text-caption uppercase tracking-wider px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] focus:outline-none ${statusInfo.color}`}
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

                                {/* Tips */}
                                {req.status !== "compliant" &&
                                  req.tips.length > 0 && (
                                    <div className="p-3 bg-[var(--surface-sunken)] rounded-lg">
                                      <p className="text-micro uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                                        Tips
                                      </p>
                                      <ul className="space-y-1">
                                        {req.tips.map((tip, i) => (
                                          <li
                                            key={i}
                                            className="text-caption text-[var(--text-secondary)] flex items-start gap-2"
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

                                {/* Evidence required */}
                                {req.evidenceRequired.length > 0 && (
                                  <div className="p-3 bg-[var(--accent-success)]/5 rounded-lg border border-[var(--accent-success)]/10">
                                    <p className="text-micro uppercase tracking-wider text-[var(--accent-success)]/40 mb-2">
                                      Evidence Required
                                    </p>
                                    <ul className="space-y-1">
                                      {req.evidenceRequired.map((ev, i) => (
                                        <li
                                          key={i}
                                          className="text-caption text-[var(--accent-success)]/60 flex items-start gap-2"
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

                                {/* Compliance Evidence */}
                                <EvidencePanel
                                  regulationType="DEBRIS"
                                  requirementId={req.id}
                                />

                                {/* ASTRA AI Agent */}
                                <AstraButton
                                  articleId={req.id}
                                  articleRef={req.articleRef}
                                  title={req.title}
                                  severity={req.severity}
                                  regulationType="DEBRIS"
                                />
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

        {/* Step 3: Plan Generator */}
        {activeStep === 2 && (
          <motion.div
            key="plan"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!selectedAssessment ? (
              <div className="bg-[var(--surface-raised)] border border-dashed border-[var(--border-default)] rounded-xl p-12 text-center">
                <AlertCircle
                  size={32}
                  className="mx-auto text-[var(--text-secondary)] mb-3"
                />
                <p className="text-body-lg text-[var(--text-secondary)] mb-4">
                  No assessment selected. Create a mission profile first.
                </p>
                <button
                  onClick={() => setActiveStep(0)}
                  className="text-body text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                >
                  ← Go to Mission Profile
                </button>
              </div>
            ) : !generatedPlan ? (
              <>
                {/* Casualty Risk Calculator */}
                <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCraOpen(!craOpen)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[var(--accent-warning-soft)]">
                        <Calculator
                          size={18}
                          className="text-[var(--accent-warning)]"
                        />
                      </div>
                      <div>
                        <h3 className="text-body-lg font-medium text-[var(--text-primary)]">
                          Casualty Risk Calculator
                        </h3>
                        <p className="text-caption text-[var(--text-secondary)]">
                          Verify E[c] {"<"} 1{"\u00D7"}10{"\u207B\u2074"}{" "}
                          compliance (NASA DAS simplified method)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {craResult && (
                        <span
                          className={`text-micro uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                            craResult.isCompliant
                              ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
                              : "bg-[var(--accent-error)]/10 text-[var(--accent-error)]"
                          }`}
                        >
                          {craResult.isCompliant
                            ? "Compliant"
                            : "Non-Compliant"}
                        </span>
                      )}
                      <motion.div
                        animate={{ rotate: craOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown
                          size={16}
                          className="text-[var(--text-tertiary)]"
                        />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {craOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 space-y-4">
                          <div className="border-t border-[var(--border-subtle)]" />

                          {/* Input Form */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-small text-[var(--text-secondary)] mb-1.5">
                                Spacecraft Dry Mass (kg)
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={craForm.spacecraftDryMassKg}
                                onChange={(e) =>
                                  setCraForm((prev) => ({
                                    ...prev,
                                    spacecraftDryMassKg:
                                      parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-body focus:outline-none focus:border-[var(--border-default)]"
                              />
                            </div>
                            <div>
                              <label className="block text-small text-[var(--text-secondary)] mb-1.5">
                                Surviving Components
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={craForm.numberOfSurvivingComponents}
                                onChange={(e) =>
                                  setCraForm((prev) => ({
                                    ...prev,
                                    numberOfSurvivingComponents:
                                      parseInt(e.target.value) || 1,
                                  }))
                                }
                                className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-body focus:outline-none focus:border-[var(--border-default)]"
                              />
                            </div>
                            <div>
                              <label className="block text-small text-[var(--text-secondary)] mb-1.5">
                                Avg. Surviving Area (m{"\u00B2"})
                              </label>
                              <input
                                type="number"
                                min={0.001}
                                step={0.01}
                                value={craForm.averageSurvivingAreaM2}
                                onChange={(e) =>
                                  setCraForm((prev) => ({
                                    ...prev,
                                    averageSurvivingAreaM2:
                                      parseFloat(e.target.value) || 0.01,
                                  }))
                                }
                                className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-body focus:outline-none focus:border-[var(--border-default)]"
                              />
                            </div>
                            <div>
                              <label className="block text-small text-[var(--text-secondary)] mb-1.5">
                                Reentry Inclination ({"\u00B0"})
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={180}
                                step={0.1}
                                value={craForm.reentryInclinationDeg}
                                onChange={(e) =>
                                  setCraForm((prev) => ({
                                    ...prev,
                                    reentryInclinationDeg:
                                      parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-body focus:outline-none focus:border-[var(--border-default)]"
                              />
                            </div>

                            {/* Controlled Reentry Toggle */}
                            <div className="md:col-span-2">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id="cra-controlled"
                                  checked={craForm.isControlledReentry}
                                  onChange={(e) =>
                                    setCraForm((prev) => ({
                                      ...prev,
                                      isControlledReentry: e.target.checked,
                                      targetLatitudeDeg: e.target.checked
                                        ? (prev.targetLatitudeDeg ?? -40)
                                        : undefined,
                                      targetLongitudeDeg: e.target.checked
                                        ? (prev.targetLongitudeDeg ?? -160)
                                        : undefined,
                                    }))
                                  }
                                  className="w-4 h-4 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded"
                                />
                                <label
                                  htmlFor="cra-controlled"
                                  className="text-body text-[var(--text-secondary)]"
                                >
                                  Controlled reentry (targeted)
                                </label>
                              </div>
                            </div>

                            {/* Target coordinates for controlled reentry */}
                            {craForm.isControlledReentry && (
                              <>
                                <div>
                                  <label className="block text-small text-[var(--text-secondary)] mb-1.5">
                                    Target Latitude ({"\u00B0"})
                                  </label>
                                  <input
                                    type="number"
                                    min={-90}
                                    max={90}
                                    step={0.1}
                                    value={craForm.targetLatitudeDeg ?? -40}
                                    onChange={(e) =>
                                      setCraForm((prev) => ({
                                        ...prev,
                                        targetLatitudeDeg:
                                          parseFloat(e.target.value) || 0,
                                      }))
                                    }
                                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-body focus:outline-none focus:border-[var(--border-default)]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-small text-[var(--text-secondary)] mb-1.5">
                                    Target Longitude ({"\u00B0"})
                                  </label>
                                  <input
                                    type="number"
                                    min={-180}
                                    max={180}
                                    step={0.1}
                                    value={craForm.targetLongitudeDeg ?? -160}
                                    onChange={(e) =>
                                      setCraForm((prev) => ({
                                        ...prev,
                                        targetLongitudeDeg:
                                          parseFloat(e.target.value) || 0,
                                      }))
                                    }
                                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-body focus:outline-none focus:border-[var(--border-default)]"
                                  />
                                  <p className="text-caption text-[var(--text-tertiary)] mt-1">
                                    SPOUA: ~(-40{"\u00B0"}, -160{"\u00B0"})
                                  </p>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Calculate Button */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={calculateCasualtyRisk}
                              disabled={craCalculating}
                              className="flex items-center gap-2 bg-[var(--text-primary)] text-white px-5 py-2.5 rounded-lg font-medium text-body hover:bg-[var(--text-primary)] transition-all disabled:opacity-50"
                            >
                              {craCalculating ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Calculator size={14} />
                              )}
                              Calculate E[c]
                            </button>
                            {craError && (
                              <p className="text-small text-[var(--accent-error)]">
                                {craError}
                              </p>
                            )}
                          </div>

                          {/* Results */}
                          {craResult && (
                            <div className="space-y-4">
                              {/* Headline result */}
                              <div
                                className={`p-4 rounded-lg border ${
                                  craResult.isCompliant
                                    ? "bg-[var(--accent-success)]/5 border-[var(--accent-success)]/20"
                                    : "bg-[var(--accent-error)]/5 border-[var(--accent-error)]/20"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {craResult.isCompliant ? (
                                      <CheckCircle2
                                        size={16}
                                        className="text-[var(--accent-success)]"
                                      />
                                    ) : (
                                      <AlertTriangle
                                        size={16}
                                        className="text-[var(--accent-error)]"
                                      />
                                    )}
                                    <span
                                      className={`text-subtitle font-medium ${
                                        craResult.isCompliant
                                          ? "text-[var(--accent-success)]"
                                          : "text-[var(--accent-error)]"
                                      }`}
                                    >
                                      E[c] ={" "}
                                      {craResult.expectedCasualties.toExponential(
                                        3,
                                      )}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-micro uppercase tracking-wider px-2.5 py-1 rounded-lg font-medium ${
                                      craResult.isCompliant
                                        ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
                                        : "bg-[var(--accent-error)]/10 text-[var(--accent-error)]"
                                    }`}
                                  >
                                    {craResult.isCompliant
                                      ? "COMPLIANT"
                                      : "NON-COMPLIANT"}
                                  </span>
                                </div>
                                <p
                                  className={`text-small ${
                                    craResult.isCompliant
                                      ? "text-[var(--accent-success)]/70"
                                      : "text-[var(--accent-error)]/70"
                                  }`}
                                >
                                  {craResult.recommendation}
                                </p>
                              </div>

                              {/* Breakdown table */}
                              <div className="p-4 bg-[var(--surface-sunken)] rounded-lg">
                                <p className="text-micro uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                                  Calculation Breakdown
                                </p>
                                <div className="space-y-2">
                                  {craResult.breakdown.map((row, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]/5 last:border-0"
                                    >
                                      <span className="text-small text-[var(--text-secondary)]">
                                        {row.label}
                                      </span>
                                      <span className="text-small font-mono text-[var(--text-primary)]">
                                        {row.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Plan Generation Card */}
                <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-8 text-center">
                  <FileText
                    size={48}
                    className="mx-auto text-[var(--text-tertiary)] mb-4"
                  />
                  <h2 className="text-heading font-medium text-[var(--text-primary)] mb-2">
                    Generate Debris Mitigation Plan
                  </h2>
                  <p className="text-body text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                    Based on your mission profile and compliance checklist,
                    generate a structured Debris Mitigation Plan document.
                  </p>

                  <div className="flex flex-col items-center gap-4">
                    <button
                      onClick={generatePlan}
                      disabled={generatingPlan}
                      className="flex items-center gap-2 bg-[var(--text-primary)] text-white px-6 py-3 rounded-lg font-medium text-body-lg hover:bg-[var(--text-primary)] transition-all disabled:opacity-50"
                    >
                      {generatingPlan ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Rocket size={16} />
                      )}
                      Generate Plan
                    </button>

                    {planError && (
                      <p className="text-small text-red-500 mt-2">
                        {planError}
                      </p>
                    )}

                    <p className="text-caption text-[var(--text-secondary)]">
                      Compliance Score:{" "}
                      {selectedAssessment.complianceScore || 0}% •{" "}
                      {requirements.length} requirements assessed
                    </p>
                  </div>

                  {selectedAssessment?.deorbitStrategy === "passive_decay" && (
                    <div className="p-3 rounded-lg bg-[var(--fill-light)] border border-[var(--separator)] mt-3">
                      <p className="text-small text-[var(--text-secondary)]">
                        ⚠ Passive Decay Hinweis: Die orbitale Lebensdauer bei
                        passivem Abbau ist stark abhängig von der
                        Sonnenaktivität. Bei Sonnenminimum (niedriger F10.7
                        Fluss) sind die Abbauzeiten deutlich länger. Stellen Sie
                        sicher, dass Ihre Analyse konservative
                        Sonnenaktivitätsannahmen verwendet.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Generated Plan Display */}
                <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-heading font-medium text-[var(--text-primary)] mb-1">
                        Debris Mitigation Plan
                      </h2>
                      <p className="text-small text-[var(--text-secondary)]">
                        Generated{" "}
                        {new Date(
                          (generatedPlan as Record<string, string>).generatedAt,
                        ).toLocaleString()}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/documents/generate?type=DEBRIS_MITIGATION_PLAN"
                      className="flex items-center gap-2 bg-[var(--accent-primary)] text-white px-4 py-2 rounded-lg text-small font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
                    >
                      <Zap size={14} />
                      Generate with ASTRA
                    </Link>
                  </div>

                  {/* Mission Overview */}
                  <div className="mb-6 p-4 bg-[var(--surface-sunken)] rounded-lg">
                    <h3 className="text-body font-medium text-[var(--text-primary)] mb-3">
                      Missionsübersicht
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-small">
                      {Object.entries(
                        (
                          generatedPlan as Record<
                            string,
                            Record<string, unknown>
                          >
                        ).missionOverview,
                      ).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-[var(--text-secondary)] capitalize">
                            {PLAN_FIELD_LABELS[key] ||
                              key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (s) => s.toUpperCase())}
                          </p>
                          <p className="text-[var(--text-secondary)]">
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
                      className="mb-6 p-4 bg-[var(--surface-sunken)] rounded-lg"
                    >
                      <h3 className="text-body font-medium text-[var(--text-primary)] mb-3">
                        {PLAN_SECTION_LABELS[sectionKey] ||
                          sectionKey
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (s) => s.toUpperCase())}
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(section).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-caption text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                              {PLAN_FIELD_LABELS[key] ||
                                key
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/^./, (s) => s.toUpperCase())}
                            </p>
                            {Array.isArray(value) ? (
                              <ul className="space-y-1">
                                {(value as string[]).map((item, i) => (
                                  <li
                                    key={i}
                                    className="text-small text-[var(--text-secondary)] flex items-start gap-2"
                                  >
                                    <span className="text-[var(--text-secondary)]">
                                      •
                                    </span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            ) : typeof value === "boolean" ? (
                              <p
                                className={`text-small ${value ? "text-[var(--accent-success)]" : "text-[var(--accent-danger)]"}`}
                              >
                                {value ? "✓ Yes" : "✗ No"}
                              </p>
                            ) : (
                              <p className="text-small text-[var(--text-secondary)]">
                                {String(value)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Requirements Matrix */}
                  <div className="p-4 bg-[var(--surface-sunken)] rounded-lg">
                    <h3 className="text-body font-medium text-[var(--text-primary)] mb-3">
                      Requirements Matrix
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-small">
                        <thead>
                          <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border-default)]">
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
                              className="border-b border-[var(--border-subtle)][0.02]"
                            >
                              <td className="py-2 font-mono text-[var(--text-secondary)]">
                                {req.articleRef}
                              </td>
                              <td className="py-2 text-[var(--text-secondary)]">
                                {req.title}
                              </td>
                              <td className="py-2">
                                <span
                                  className={`text-micro uppercase px-2 py-0.5 rounded ${
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
                    className="text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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

export default function DebrisPage() {
  return (
    <FeatureGate module="debris">
      <DebrisPageContent />
    </FeatureGate>
  );
}
