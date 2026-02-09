"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  ShieldCheck,
  Shield,
  ShieldAlert,
  ShieldOff,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Building2,
  Globe,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  HelpCircle,
  Play,
  Sparkles,
  Lightbulb,
  TrendingUp,
  Zap,
  Target,
  Layers,
  Info,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import EvidencePanel from "@/components/audit/EvidencePanel";
import AstraButton from "@/components/astra/AstraButton";
import { getIcon } from "@/lib/icons";
import type { Question, QuestionOption } from "@/lib/questions";

// ─── Types ───

interface RequirementStatus {
  id: string;
  requirementId: string;
  status: string;
  notes: string | null;
  evidenceNotes: string | null;
  targetDate: string | null;
}

interface RequirementMeta {
  title: string;
  articleRef: string;
  category: string;
  severity: string;
  complianceQuestion: string;
  description: string;
  spaceSpecificGuidance: string;
  tips: string[];
  evidenceRequired: string[];
  euSpaceActRef?: string;
  iso27001Ref?: string;
  canBeSimplified?: boolean;
  implementationTimeWeeks?: number;
}

interface ImplementationPhaseReq {
  id: string;
  title: string;
  articleRef: string;
  severity: string;
  category: string;
  estimatedWeeks: number;
  rationale: string;
}

interface ImplementationPhase {
  phase: number;
  name: string;
  description: string;
  totalWeeks: number;
  requirements: ImplementationPhaseReq[];
}

interface SmartRecommendations {
  iso27001Coverage: { count: number; total: number; percentage: number };
  criticalGaps: Array<{
    id: string;
    title: string;
    articleRef: string;
    implementationWeeks: number;
  }>;
  euSpaceActOverlap: { count: number; articles: string[] };
  totalImplementationWeeks: number;
  recommendations: string[];
  implementationPhases: ImplementationPhase[];
  autoAssessedCount: number;
}

interface NIS2Assessment {
  id: string;
  assessmentName: string | null;
  entityClassification: string | null;
  classificationReason: string | null;
  sector: string | null;
  subSector: string | null;
  organizationSize: string | null;
  employeeCount: number | null;
  annualRevenue: number | null;
  memberStateCount: number;
  complianceScore: number | null;
  maturityScore: number | null;
  riskLevel: string | null;
  euSpaceActOverlapCount: number | null;
  operatesGroundInfra: boolean;
  operatesSatComms: boolean;
  manufacturesSpacecraft: boolean;
  providesLaunchServices: boolean;
  providesEOData: boolean;
  hasISO27001: boolean;
  hasExistingCSIRT: boolean;
  hasRiskManagement: boolean;
  requirements: RequirementStatus[];
  createdAt: string;
  updatedAt: string;
}

type ReqStatusValue =
  | "not_assessed"
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_applicable";

// ─── NIS2 Scoping Questions ───

const NIS2_WIZARD_QUESTIONS: Question[] = [
  {
    id: "spaceSubSector",
    step: 1,
    title: "What is your primary space activity?",
    subtitle:
      "Space is listed as a sector of high criticality in NIS2 Annex I, Sector 11. Select your primary area of operations.",
    options: [
      {
        id: "ground_infrastructure",
        label: "Ground Infrastructure",
        description:
          "Ground stations, TT&C facilities, mission control centres",
        icon: "Radio",
        value: "ground_infrastructure",
      },
      {
        id: "satellite_communications",
        label: "Satellite Communications",
        description: "SATCOM services, broadband, broadcasting, relay services",
        icon: "Wifi",
        value: "satellite_communications",
      },
      {
        id: "spacecraft_manufacturing",
        label: "Spacecraft Manufacturing",
        description:
          "Satellite design, manufacturing, integration, and testing",
        icon: "Wrench",
        value: "spacecraft_manufacturing",
      },
      {
        id: "launch_services",
        label: "Launch Services",
        description:
          "Launch vehicle operations, launch site management, rideshare services",
        icon: "Rocket",
        value: "launch_services",
      },
      {
        id: "earth_observation",
        label: "Earth Observation",
        description: "Remote sensing data acquisition and processing",
        icon: "Eye",
        value: "earth_observation",
      },
      {
        id: "navigation",
        label: "Navigation & PNT",
        description:
          "GNSS augmentation services, positioning, navigation, and timing",
        icon: "Navigation",
        value: "navigation",
      },
      {
        id: "space_situational_awareness",
        label: "Space Situational Awareness",
        description:
          "SSA/STM services, space debris tracking, conjunction assessment",
        icon: "Radar",
        value: "space_situational_awareness",
      },
    ],
  },
  {
    id: "isEUEstablished",
    step: 2,
    title: "Is your organization established in the EU?",
    subtitle:
      "NIS2 primarily applies to entities established in EU member states.",
    isYesNo: true,
    options: [
      {
        id: "yes",
        label: "Yes, EU-established",
        description:
          "Headquartered or with a significant establishment in an EU member state",
        value: true,
      },
      {
        id: "no",
        label: "No, outside the EU",
        description: "Not established in any EU member state",
        value: false,
      },
    ],
    outOfScopeValue: false,
    outOfScopeMessage: "NIS2 primarily applies to EU-established entities",
    outOfScopeDetail:
      "The NIS2 Directive primarily applies to entities established in the EU. However, if you provide services within the EU, you may need to designate an EU representative under Art. 26.",
  },
  {
    id: "entitySize",
    step: 3,
    title: "What best describes your organization's size?",
    subtitle:
      "NIS2 generally applies to medium and large entities, but some space sector operators are captured regardless of size",
    options: [
      {
        id: "micro",
        label: "Micro Enterprise",
        description: "< 10 employees and < €2M annual turnover",
        icon: "User",
        value: "micro",
      },
      {
        id: "small",
        label: "Small Enterprise",
        description: "< 50 employees and < €10M annual turnover",
        icon: "Users",
        value: "small",
      },
      {
        id: "medium",
        label: "Medium Enterprise",
        description: "50-250 employees or €10-50M turnover",
        icon: "Building",
        value: "medium",
      },
      {
        id: "large",
        label: "Large Enterprise",
        description: "> 250 employees or > €50M turnover",
        icon: "Landmark",
        value: "large",
      },
    ],
  },
  {
    id: "memberStateCount",
    step: 4,
    title: "In how many EU member states does your organization operate?",
    subtitle:
      "Cross-border operators may be subject to supervision by multiple authorities",
    options: [
      {
        id: "one",
        label: "1 member state",
        description: "Operations in a single EU country",
        icon: "MapPin",
        value: 1,
      },
      {
        id: "few",
        label: "2-5 member states",
        description: "Ground stations or offices in multiple EU countries",
        icon: "Map",
        value: 3,
      },
      {
        id: "many",
        label: "6+ member states",
        description: "Extensive pan-European operations or infrastructure",
        icon: "Globe",
        value: 8,
      },
    ],
  },
  {
    id: "operatesGroundInfra",
    step: 5,
    title: "Do you operate ground-based space infrastructure?",
    subtitle:
      "Ground stations, TT&C facilities, data centres for space data processing, or mission control centres",
    isYesNo: true,
    options: [
      {
        id: "yes",
        label: "Yes",
        description:
          "We operate ground stations, mission control, or related infrastructure",
        value: true,
      },
      {
        id: "no",
        label: "No",
        description: "We do not operate ground-based space infrastructure",
        value: false,
      },
    ],
  },
  {
    id: "hasISO27001",
    step: 6,
    title: "Does your organization hold ISO 27001 certification?",
    subtitle:
      "Existing certifications can significantly reduce your NIS2 compliance effort",
    isYesNo: true,
    options: [
      {
        id: "yes",
        label: "Yes, ISO 27001 certified",
        description:
          "We hold a current ISO 27001 certificate covering our space operations",
        value: true,
      },
      {
        id: "no",
        label: "No certification",
        description:
          "We do not currently hold ISO 27001 or equivalent certification",
        value: false,
      },
    ],
  },
  {
    id: "hasExistingCSIRT",
    step: 7,
    title:
      "Does your organization have an established incident response capability?",
    subtitle:
      "NIS2 Art. 23 requires reporting significant incidents within strict timelines",
    isYesNo: true,
    options: [
      {
        id: "yes",
        label: "Yes, we have incident response",
        description:
          "Established CSIRT, SOC, or incident response team covering space operations",
        value: true,
      },
      {
        id: "no",
        label: "No formal capability",
        description:
          "No dedicated incident response team or documented procedures",
        value: false,
      },
    ],
  },
];

interface WizardAnswers {
  [key: string]: string | boolean | number | null;
}

// ─── Dashboard Option Card ───

function WizardOptionCard({
  label,
  description,
  icon,
  isSelected,
  onClick,
}: {
  label: string;
  description: string;
  icon?: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const IconComponent = icon ? getIcon(icon) : null;

  return (
    <motion.button
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      whileTap={{ scale: 0.995 }}
      className={`
        w-full p-4 rounded-xl text-left transition-all duration-200 group
        ${
          isSelected
            ? "bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-500 dark:border-blue-400/50"
            : "bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] hover:bg-slate-50 dark:hover:bg-white/[0.05]"
        }
      `}
    >
      <div className="flex items-center gap-4">
        {IconComponent && (
          <div
            className={`p-2.5 rounded-lg transition-colors flex-shrink-0 ${isSelected ? "bg-blue-100 dark:bg-blue-500/20" : "bg-slate-100 dark:bg-white/[0.06]"}`}
          >
            <IconComponent
              size={20}
              className={
                isSelected
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 dark:text-white/50"
              }
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-[14px] font-medium ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-900 dark:text-white"}`}
          >
            {label}
          </h3>
          <p className="text-[13px] text-slate-500 dark:text-white/50 leading-relaxed">
            {description}
          </p>
        </div>
        <div
          className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? "bg-blue-500 dark:bg-blue-400" : "border-2 border-slate-300 dark:border-white/20"}`}
        >
          {isSelected && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Check size={12} className="text-white dark:text-black" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ─── Inline Assessment Wizard ───

function InlineAssessmentWizard({
  assessmentId,
  onComplete,
  onCancel,
}: {
  assessmentId: string;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfScope, setOutOfScope] = useState<{
    message: string;
    detail: string;
  } | null>(null);

  const totalSteps = NIS2_WIZARD_QUESTIONS.length;
  const currentQuestion = NIS2_WIZARD_QUESTIONS.find(
    (q) => q.step === currentStep,
  );
  const currentAnswer = currentQuestion
    ? (answers[currentQuestion.id] ?? null)
    : null;

  const handleSelect = (value: string | boolean | number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));

    if (
      currentQuestion.outOfScopeValue !== undefined &&
      value === currentQuestion.outOfScopeValue
    ) {
      setOutOfScope({
        message: currentQuestion.outOfScopeMessage || "Out of scope",
        detail:
          currentQuestion.outOfScopeDetail ||
          "Based on your answer, NIS2 may not apply.",
      });
      return;
    }

    setTimeout(() => {
      if (currentStep < totalSteps) {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      }
    }, 300);
  };

  const handleBack = () => {
    if (outOfScope) {
      setOutOfScope(null);
      return;
    }
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const subSector = answers.spaceSubSector as string;
      const body = {
        sector: "space",
        subSector,
        organizationSize: answers.entitySize || "medium",
        memberStateCount:
          typeof answers.memberStateCount === "number"
            ? answers.memberStateCount
            : 1,
        isEUEstablished: answers.isEUEstablished ?? true,
        operatesGroundInfra: answers.operatesGroundInfra ?? false,
        operatesSatComms: subSector === "satellite_communications",
        manufacturesSpacecraft: subSector === "spacecraft_manufacturing",
        providesLaunchServices: subSector === "launch_services",
        providesEOData: subSector === "earth_observation",
        hasISO27001: answers.hasISO27001 ?? false,
        hasExistingCSIRT: answers.hasExistingCSIRT ?? false,
      };

      const res = await fetch(`/api/nis2/${assessmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to update assessment (${res.status})`,
        );
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = currentStep === totalSteps;
  const allAnswered = NIS2_WIZARD_QUESTIONS.every(
    (q) => answers[q.id] !== null && answers[q.id] !== undefined,
  );

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 80 : -80, opacity: 0 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              NIS2 Scoping Assessment
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-white/30">
              Step {currentStep} of {totalSteps} — Determine your entity
              classification
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
          aria-label="Close wizard"
        >
          <X size={16} className="text-slate-400 dark:text-white/40" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100 dark:bg-white/[0.04]">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Body */}
      <div className="px-6 py-8">
        {outOfScope ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {outOfScope.message}
            </h3>
            <p className="text-sm text-slate-500 dark:text-white/50 max-w-md mx-auto mb-8 leading-relaxed">
              {outOfScope.detail}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm text-slate-600 dark:text-white/60 border border-slate-200 dark:border-white/10 rounded-lg transition-colors"
              >
                Change Answer
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/70 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        ) : currentQuestion ? (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentQuestion.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="mb-6 text-center max-w-xl mx-auto">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 block mb-3">
                  Question {String(currentStep).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  {currentQuestion.title}
                </h3>
                {currentQuestion.subtitle && (
                  <p className="text-sm text-slate-500 dark:text-white/40 leading-relaxed">
                    {currentQuestion.subtitle}
                  </p>
                )}
              </div>
              <div
                role="radiogroup"
                aria-label={currentQuestion.title}
                className="space-y-2.5 max-w-xl mx-auto"
              >
                {currentQuestion.options.map((option: QuestionOption) => (
                  <WizardOptionCard
                    key={option.id}
                    label={option.label}
                    description={option.description}
                    icon={option.icon}
                    isSelected={currentAnswer === option.value}
                    onClick={() => handleSelect(option.value)}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3 max-w-xl mx-auto">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {!outOfScope && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01]">
          <button
            onClick={currentStep === 1 ? onCancel : handleBack}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70 transition-colors"
          >
            <ArrowLeft size={14} />
            {currentStep === 1 ? "Cancel" : "Back"}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-4">
              {NIS2_WIZARD_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i + 1 === currentStep ? "bg-blue-500" : i + 1 < currentStep ? "bg-blue-300 dark:bg-blue-500/50" : "bg-slate-200 dark:bg-white/10"}`}
                />
              ))}
            </div>
            {isLastStep && allAnswered ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Save & Classify
              </button>
            ) : (
              currentAnswer !== null &&
              !isLastStep && (
                <button
                  onClick={() => {
                    setDirection(1);
                    setCurrentStep((prev) => prev + 1);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Next
                  <ArrowRight size={14} />
                </button>
              )
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Config ───

const classificationConfig: Record<
  string,
  { icon: typeof Shield; label: string; color: string; bgColor: string }
> = {
  essential: {
    icon: ShieldAlert,
    label: "Essential Entity",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  important: {
    icon: Shield,
    label: "Important Entity",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  out_of_scope: {
    icon: ShieldOff,
    label: "Out of Scope",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
  },
};

const statusConfig: Record<
  ReqStatusValue,
  { label: string; icon: typeof Check; color: string; bgColor: string }
> = {
  compliant: {
    label: "Compliant",
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  partial: {
    label: "Partial",
    icon: Clock,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  non_compliant: {
    label: "Non-Compliant",
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  not_applicable: {
    label: "N/A",
    icon: Ban,
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
  },
  not_assessed: {
    label: "Not Assessed",
    icon: HelpCircle,
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
  },
};

const riskLevelConfig: Record<string, { label: string; color: string }> = {
  high: { label: "High", color: "text-red-400" },
  medium: { label: "Medium", color: "text-amber-400" },
  low: { label: "Low", color: "text-green-400" },
  critical: { label: "Critical", color: "text-red-500" },
};

// ─── Page ───

export default function NIS2AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<NIS2Assessment | null>(null);
  const [reqMeta, setReqMeta] = useState<Record<string, RequirementMeta>>({});
  const [recommendations, setRecommendations] =
    useState<SmartRecommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Wizard
  const [showWizard, setShowWizard] = useState(false);

  // Requirements expand
  const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());
  const [updatingReq, setUpdatingReq] = useState<string | null>(null);

  // Implementation phases expand
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  // Fetch assessment
  const fetchAssessment = useCallback(async () => {
    try {
      const res = await fetch(`/api/nis2/${assessmentId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to load assessment (${res.status})`,
        );
      }
      const data = await res.json();
      setAssessment(data.assessment);
      if (data.requirementMeta) {
        setReqMeta(data.requirementMeta);
      }
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  // Update assessment name
  const handleSaveName = async () => {
    if (!nameInput.trim() || !assessment) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/nis2/${assessmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ assessmentName: nameInput.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update name");
      const data = await res.json();
      setAssessment(data.assessment);
      setEditingName(false);
    } catch {
      setError("Failed to update assessment name");
    } finally {
      setSavingName(false);
    }
  };

  // Delete assessment
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/nis2/${assessmentId}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/dashboard/modules/nis2");
    } catch {
      setError("Failed to delete assessment");
      setDeleting(false);
    }
  };

  // Update requirement status
  const handleUpdateRequirement = async (
    requirementId: string,
    status: ReqStatusValue,
  ) => {
    setUpdatingReq(requirementId);
    try {
      const res = await fetch("/api/nis2/requirements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          assessmentId,
          requirementId,
          status,
        }),
      });
      if (!res.ok) throw new Error("Failed to update requirement");
      // Refresh assessment to get updated scores
      await fetchAssessment();
    } catch {
      setError("Failed to update requirement status");
    } finally {
      setUpdatingReq(null);
    }
  };

  // Toggle requirement expand
  const toggleReqExpand = (reqId: string) => {
    setExpandedReqs((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) next.delete(reqId);
      else next.add(reqId);
      return next;
    });
  };

  // Toggle phase expand
  const togglePhaseExpand = (phase: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  };

  if (loading) {
    return (
      <FeatureGate module="nis2">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-white/40" />
        </div>
      </FeatureGate>
    );
  }

  if (error && !assessment) {
    return (
      <FeatureGate module="nis2">
        <div className="space-y-4">
          <button
            onClick={() => router.push("/dashboard/modules/nis2")}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to NIS2
          </button>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      </FeatureGate>
    );
  }

  if (!assessment) return null;

  const config =
    classificationConfig[assessment.entityClassification || "out_of_scope"] ||
    classificationConfig.out_of_scope;
  const ClassIcon = config.icon;

  const totalReqs = assessment.requirements.length;
  const compliantReqs = assessment.requirements.filter(
    (r) => r.status === "compliant",
  ).length;
  const partialReqs = assessment.requirements.filter(
    (r) => r.status === "partial",
  ).length;
  const nonCompliantReqs = assessment.requirements.filter(
    (r) => r.status === "non_compliant",
  ).length;
  const notAssessedReqs = assessment.requirements.filter(
    (r) => r.status === "not_assessed",
  ).length;
  const progress =
    totalReqs > 0 ? Math.round((compliantReqs / totalReqs) * 100) : 0;
  const risk =
    riskLevelConfig[assessment.riskLevel || "low"] || riskLevelConfig.low;

  return (
    <FeatureGate module="nis2">
      <div className="space-y-6">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/modules/nis2")}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to NIS2
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Delete confirm modal */}
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-5"
          >
            <h3 className="text-sm font-medium text-red-400 mb-2">
              Delete this assessment?
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40 mb-4">
              This will permanently delete &ldquo;
              {assessment.assessmentName || "Untitled"}&rdquo; and all its
              requirement tracking data. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Run Assessment CTA / Wizard */}
        <AnimatePresence>
          {showWizard ? (
            <InlineAssessmentWizard
              assessmentId={assessmentId}
              onComplete={() => {
                setShowWizard(false);
                fetchAssessment();
              }}
              onCancel={() => setShowWizard(false)}
            />
          ) : (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowWizard(true)}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 rounded-2xl p-6 text-left transition-all duration-300 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
            >
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
              </div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-0.5">
                      Run Scoping Assessment
                    </h3>
                    <p className="text-sm text-white/70">
                      Answer 7 questions to determine your NIS2 entity
                      classification and applicable requirements
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ─── Smart Recommendations Panel ─── */}
        {recommendations && recommendations.recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden"
          >
            {/* Gradient top accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-green-500" />

            <div className="p-6 pt-7">
              {/* Section header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
                  <Lightbulb className="w-4.5 h-4.5 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Smart Recommendations
                  </h2>
                  <p className="text-[11px] text-slate-400 dark:text-white/30">
                    AI-generated insights based on your assessment profile
                  </p>
                </div>
                {recommendations.autoAssessedCount > 0 && (
                  <span className="ml-auto text-[11px] bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-full px-2.5 py-1 font-medium">
                    {recommendations.autoAssessedCount} auto-assessed
                  </span>
                )}
              </div>

              {/* 3-column insight cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {/* ISO 27001 Coverage */}
                <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 border border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30">
                      ISO 27001 Coverage
                    </span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                    {recommendations.iso27001Coverage.percentage}%
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-white/30 mt-0.5">
                    {recommendations.iso27001Coverage.count} of{" "}
                    {recommendations.iso27001Coverage.total} requirements
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${recommendations.iso27001Coverage.percentage}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Critical Gaps */}
                <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 border border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30">
                      Critical Gaps
                    </span>
                  </div>
                  <div
                    className={`text-2xl font-mono font-bold ${recommendations.criticalGaps.length > 0 ? "text-red-400" : "text-green-400"}`}
                  >
                    {recommendations.criticalGaps.length}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-white/30 mt-0.5">
                    {recommendations.criticalGaps.length > 0
                      ? "Require immediate attention"
                      : "No critical gaps remaining"}
                  </div>
                </div>

                {/* EU Space Act Overlap */}
                <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 border border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-green-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30">
                      EU Space Act Overlap
                    </span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-green-400">
                    {recommendations.euSpaceActOverlap.count}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-white/30 mt-0.5">
                    {recommendations.euSpaceActOverlap.count > 0
                      ? "Dual-compliance synergies"
                      : "No overlapping requirements"}
                  </div>
                </div>
              </div>

              {/* Recommendation list */}
              <div className="space-y-2.5">
                {recommendations.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 bg-slate-50/60 dark:bg-white/[0.015] rounded-lg px-4 py-3 border border-slate-100/80 dark:border-white/[0.04]"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center text-[10px] font-mono font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>

              {/* Estimated total implementation time */}
              {recommendations.totalImplementationWeeks > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400 dark:text-white/30" />
                  <span className="text-xs text-slate-500 dark:text-white/40">
                    Estimated total implementation time:{" "}
                    <span className="font-semibold text-slate-700 dark:text-white/70">
                      {recommendations.totalImplementationWeeks} weeks
                    </span>{" "}
                    for all outstanding requirements
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Gap Analysis & Implementation Plan ─── */}
        {recommendations && recommendations.implementationPhases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/10 to-red-500/10 flex items-center justify-center">
                <Target className="w-4.5 h-4.5 text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Implementation Roadmap
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-white/30">
                  {recommendations.implementationPhases.length} phases &middot;{" "}
                  {recommendations.implementationPhases.reduce(
                    (sum, p) => sum + p.requirements.length,
                    0,
                  )}{" "}
                  requirements to address
                </p>
              </div>
            </div>

            {/* Severity summary row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Critical",
                  count: assessment.requirements.filter((r) => {
                    const m = reqMeta[r.requirementId];
                    return (
                      m?.severity === "critical" &&
                      r.status !== "compliant" &&
                      r.status !== "not_applicable"
                    );
                  }).length,
                  color: "text-red-400",
                  bg: "bg-red-500/10",
                  border: "border-red-500/20",
                },
                {
                  label: "Major",
                  count: assessment.requirements.filter((r) => {
                    const m = reqMeta[r.requirementId];
                    return (
                      m?.severity === "major" &&
                      r.status !== "compliant" &&
                      r.status !== "not_applicable"
                    );
                  }).length,
                  color: "text-amber-400",
                  bg: "bg-amber-500/10",
                  border: "border-amber-500/20",
                },
                {
                  label: "Minor",
                  count: assessment.requirements.filter((r) => {
                    const m = reqMeta[r.requirementId];
                    return (
                      m?.severity === "minor" &&
                      r.status !== "compliant" &&
                      r.status !== "not_applicable"
                    );
                  }).length,
                  color: "text-slate-400",
                  bg: "bg-slate-500/10",
                  border: "border-slate-500/20",
                },
              ].map((sev) => (
                <div
                  key={sev.label}
                  className={`${sev.bg} border ${sev.border} rounded-xl p-3 text-center`}
                >
                  <div className={`text-lg font-mono font-bold ${sev.color}`}>
                    {sev.count}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-white/40">
                    {sev.label} outstanding
                  </div>
                </div>
              ))}
            </div>

            {/* Phase cards */}
            {recommendations.implementationPhases.map((phase) => {
              const isPhaseExpanded = expandedPhases.has(phase.phase);
              const phaseColors: Record<
                number,
                {
                  accent: string;
                  bg: string;
                  border: string;
                  iconBg: string;
                  icon: typeof Zap;
                }
              > = {
                1: {
                  accent: "text-green-500 dark:text-green-400",
                  bg: "bg-green-500/5",
                  border: "border-green-500/20",
                  iconBg:
                    "bg-gradient-to-br from-green-500/10 to-emerald-500/10",
                  icon: Zap,
                },
                2: {
                  accent: "text-red-400",
                  bg: "bg-red-500/5",
                  border: "border-red-500/20",
                  iconBg: "bg-gradient-to-br from-red-500/10 to-orange-500/10",
                  icon: AlertTriangle,
                },
                3: {
                  accent: "text-amber-400",
                  bg: "bg-amber-500/5",
                  border: "border-amber-500/20",
                  iconBg:
                    "bg-gradient-to-br from-amber-500/10 to-yellow-500/10",
                  icon: TrendingUp,
                },
                4: {
                  accent: "text-slate-400",
                  bg: "bg-slate-500/5",
                  border: "border-slate-500/20",
                  iconBg: "bg-gradient-to-br from-slate-500/10 to-slate-400/10",
                  icon: FileText,
                },
              };
              const pc = phaseColors[phase.phase] || phaseColors[4];
              const PhaseIcon = pc.icon;

              return (
                <div
                  key={phase.phase}
                  className={`bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden`}
                >
                  {/* Phase header */}
                  <button
                    onClick={() => togglePhaseExpand(phase.phase)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg ${pc.iconBg} flex items-center justify-center`}
                      >
                        <PhaseIcon className={`w-4 h-4 ${pc.accent}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30">
                            Phase {phase.phase}
                          </span>
                          <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                            {phase.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-white/30 mt-0.5">
                          {phase.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-mono text-slate-500 dark:text-white/40">
                          {phase.requirements.length} req
                          {phase.requirements.length !== 1 ? "s" : ""}
                        </div>
                        {phase.totalWeeks > 0 && (
                          <div className="text-[10px] text-slate-400 dark:text-white/25">
                            ~{phase.totalWeeks} weeks
                          </div>
                        )}
                      </div>
                      {isPhaseExpanded ? (
                        <ChevronUp
                          size={16}
                          className="text-slate-400 dark:text-white/30"
                        />
                      ) : (
                        <ChevronDown
                          size={16}
                          className="text-slate-400 dark:text-white/30"
                        />
                      )}
                    </div>
                  </button>

                  {/* Phase requirements list */}
                  <AnimatePresence>
                    {isPhaseExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100 dark:border-white/[0.06]"
                      >
                        <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                          {phase.requirements.map((pr) => {
                            const sevColors: Record<string, string> = {
                              critical: "text-red-400 bg-red-500/10",
                              major: "text-amber-400 bg-amber-500/10",
                              minor: "text-slate-400 bg-slate-500/10",
                            };
                            return (
                              <div
                                key={pr.id}
                                className="px-5 py-3 flex items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <span className="text-[10px] font-mono text-slate-400 dark:text-white/25 flex-shrink-0 w-[70px]">
                                    {pr.articleRef}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs text-slate-700 dark:text-white/70 truncate">
                                      {pr.title}
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-white/25 mt-0.5">
                                      {pr.rationale}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-[10px] text-slate-400 dark:text-white/25 hidden sm:inline">
                                    {pr.category}
                                  </span>
                                  <span
                                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sevColors[pr.severity] || ""}`}
                                  >
                                    {pr.severity}
                                  </span>
                                  {pr.estimatedWeeks > 0 && (
                                    <span className="text-[10px] font-mono text-slate-400 dark:text-white/25">
                                      {pr.estimatedWeeks}w
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Header Card */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6">
          {/* Name */}
          <div className="flex items-start justify-between mb-4">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1 mr-4">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  autoFocus
                  className="flex-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-lg font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="p-2 text-green-400 hover:text-green-300"
                >
                  {savingName ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="p-2 text-slate-400 hover:text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}
                >
                  <ClassIcon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {assessment.assessmentName || "Untitled Assessment"}
                    </h1>
                    <button
                      onClick={() => {
                        setNameInput(assessment.assessmentName || "");
                        setEditingName(true);
                      }}
                      className="p-1 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  <span className={`text-sm font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Classification Reason */}
          {assessment.classificationReason && (
            <p className="text-xs text-slate-500 dark:text-white/40 leading-relaxed mb-5 border-l-2 border-slate-200 dark:border-white/10 pl-3">
              {assessment.classificationReason}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Compliance Progress */}
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-1">
                Compliance
              </div>
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                {progress}%
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-1">
                Requirements
              </div>
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                {compliantReqs}/{totalReqs}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-white/30 mt-1">
                {notAssessedReqs > 0 && `${notAssessedReqs} pending`}
              </div>
            </div>

            {/* Risk Level */}
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-1">
                Risk Level
              </div>
              <div className={`text-2xl font-mono font-bold ${risk.color}`}>
                {risk.label}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-white/30 mt-1">
                {assessment.organizationSize || "unknown"} entity
              </div>
            </div>

            {/* EU Space Act Overlaps */}
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-1">
                Overlaps
              </div>
              <div className="text-2xl font-mono font-bold text-green-400">
                {assessment.euSpaceActOverlapCount || 0}
              </div>
              <div className="text-[11px] text-green-400/60 mt-1">
                EU Space Act
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 dark:text-white/30 block mb-0.5">
                Sector
              </span>
              <span className="text-slate-700 dark:text-white/70">
                {assessment.sector?.replace(/_/g, " ") || "Space"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-white/30 block mb-0.5">
                Member States
              </span>
              <span className="text-slate-700 dark:text-white/70">
                {assessment.memberStateCount}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-white/30 block mb-0.5">
                Created
              </span>
              <span className="text-slate-700 dark:text-white/70">
                {new Date(assessment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-white/30 block mb-0.5">
                Maturity Score
              </span>
              <span className="text-slate-700 dark:text-white/70">
                {assessment.maturityScore ?? 0}%
              </span>
            </div>
          </div>

          {/* Space Activities */}
          <div className="mt-4 flex flex-wrap gap-2">
            {assessment.operatesGroundInfra && (
              <span className="text-[11px] bg-cyan-500/10 text-cyan-400 rounded-md px-2 py-1">
                Ground Infra
              </span>
            )}
            {assessment.operatesSatComms && (
              <span className="text-[11px] bg-cyan-500/10 text-cyan-400 rounded-md px-2 py-1">
                SatCom
              </span>
            )}
            {assessment.manufacturesSpacecraft && (
              <span className="text-[11px] bg-cyan-500/10 text-cyan-400 rounded-md px-2 py-1">
                Spacecraft Mfg
              </span>
            )}
            {assessment.providesLaunchServices && (
              <span className="text-[11px] bg-cyan-500/10 text-cyan-400 rounded-md px-2 py-1">
                Launch Services
              </span>
            )}
            {assessment.providesEOData && (
              <span className="text-[11px] bg-cyan-500/10 text-cyan-400 rounded-md px-2 py-1">
                Earth Observation
              </span>
            )}
            {assessment.hasISO27001 && (
              <span className="text-[11px] bg-blue-500/10 text-blue-400 rounded-md px-2 py-1">
                ISO 27001
              </span>
            )}
            {assessment.hasExistingCSIRT && (
              <span className="text-[11px] bg-blue-500/10 text-blue-400 rounded-md px-2 py-1">
                CSIRT
              </span>
            )}
            {assessment.hasRiskManagement && (
              <span className="text-[11px] bg-blue-500/10 text-blue-400 rounded-md px-2 py-1">
                Risk Mgmt
              </span>
            )}
          </div>
        </div>

        {/* Requirements Status Summary */}
        {totalReqs > 0 && (
          <div className="grid grid-cols-5 gap-3">
            {(
              [
                "compliant",
                "partial",
                "non_compliant",
                "not_applicable",
                "not_assessed",
              ] as ReqStatusValue[]
            ).map((s) => {
              const sc = statusConfig[s];
              const StatusIcon = sc.icon;
              const count = assessment.requirements.filter(
                (r) => r.status === s,
              ).length;
              return (
                <div
                  key={s}
                  className={`${sc.bgColor} border border-transparent rounded-xl p-3 text-center`}
                >
                  <StatusIcon className={`w-4 h-4 ${sc.color} mx-auto mb-1`} />
                  <div className={`text-lg font-mono font-bold ${sc.color}`}>
                    {count}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-white/40">
                    {sc.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Requirements List */}
        {totalReqs > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <FileText
                size={16}
                className="text-slate-400 dark:text-white/40"
              />
              Requirements ({totalReqs})
            </h2>
            {assessment.requirements
              .sort((a, b) => a.requirementId.localeCompare(b.requirementId))
              .map((req) => {
                const sc =
                  statusConfig[req.status as ReqStatusValue] ||
                  statusConfig.not_assessed;
                const StatusIcon = sc.icon;
                const isExpanded = expandedReqs.has(req.requirementId);
                const isUpdating = updatingReq === req.requirementId;
                const meta = reqMeta[req.requirementId];
                const severityColors: Record<string, string> = {
                  critical: "text-red-400 bg-red-500/10",
                  major: "text-amber-400 bg-amber-500/10",
                  minor: "text-slate-400 bg-slate-500/10",
                };

                return (
                  <motion.div
                    key={req.id}
                    layout
                    className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleReqExpand(req.requirementId)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <StatusIcon
                          className={`w-4 h-4 ${sc.color} flex-shrink-0`}
                        />
                        <span className="text-[11px] font-mono text-slate-400 dark:text-white/30 flex-shrink-0">
                          {meta?.articleRef || req.requirementId}
                        </span>
                        <span className="text-sm text-slate-900 dark:text-white/80 truncate">
                          {meta?.title || req.requirementId}
                        </span>
                        {meta?.severity && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${severityColors[meta.severity] || ""} flex-shrink-0`}
                          >
                            {meta.severity}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span
                          className={`text-[11px] font-medium ${sc.color} hidden sm:inline`}
                        >
                          {sc.label}
                        </span>
                        {isUpdating && (
                          <Loader2
                            size={14}
                            className="animate-spin text-blue-400"
                          />
                        )}
                        {isExpanded ? (
                          <ChevronUp
                            size={14}
                            className="text-slate-400 dark:text-white/30"
                          />
                        ) : (
                          <ChevronDown
                            size={14}
                            className="text-slate-400 dark:text-white/30"
                          />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-200 dark:border-white/[0.06] px-4 py-4 space-y-4"
                      >
                        {/* Compliance Question */}
                        {meta?.complianceQuestion && (
                          <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400/60 mb-1">
                              Compliance Question
                            </div>
                            <p className="text-sm text-slate-700 dark:text-white/70">
                              {meta.complianceQuestion}
                            </p>
                          </div>
                        )}

                        {/* Description */}
                        {meta?.description && (
                          <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed">
                            {meta.description}
                          </p>
                        )}

                        {/* Space-Specific Guidance */}
                        {meta?.spaceSpecificGuidance && (
                          <div className="border-l-2 border-cyan-500/30 pl-3">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60 mb-1">
                              Space Sector Guidance
                            </div>
                            <p className="text-xs text-slate-500 dark:text-white/45 leading-relaxed">
                              {meta.spaceSpecificGuidance}
                            </p>
                          </div>
                        )}

                        {/* Cross-references */}
                        {(meta?.euSpaceActRef || meta?.iso27001Ref) && (
                          <div className="flex flex-wrap gap-2">
                            {meta.euSpaceActRef && (
                              <span className="text-[10px] bg-green-500/10 text-green-400 rounded-md px-2 py-1">
                                EU Space Act {meta.euSpaceActRef}
                              </span>
                            )}
                            {meta.iso27001Ref && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-400 rounded-md px-2 py-1">
                                ISO 27001 {meta.iso27001Ref}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Tips */}
                        {meta?.tips && meta.tips.length > 0 && (
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-1.5">
                              Implementation Tips
                            </div>
                            <ul className="space-y-1">
                              {meta.tips.map((tip, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-slate-500 dark:text-white/40 flex items-start gap-2"
                                >
                                  <span className="text-blue-400 mt-0.5">
                                    &bull;
                                  </span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Evidence Required */}
                        {meta?.evidenceRequired &&
                          meta.evidenceRequired.length > 0 && (
                            <div>
                              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-1.5">
                                Evidence Required
                              </div>
                              <ul className="space-y-1">
                                {meta.evidenceRequired.map((ev, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-slate-500 dark:text-white/40 flex items-start gap-2"
                                  >
                                    <CheckCircle2
                                      size={12}
                                      className="text-slate-400/50 mt-0.5 flex-shrink-0"
                                    />
                                    {ev}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* Compliance Evidence */}
                        <EvidencePanel
                          regulationType="NIS2"
                          requirementId={req.requirementId}
                        />

                        {/* ASTRA AI Agent */}
                        <AstraButton
                          articleId={req.requirementId}
                          articleRef={meta?.articleRef || req.requirementId}
                          title={meta?.title || req.requirementId}
                          severity={meta?.severity || "major"}
                          regulationType="NIS2"
                        />

                        {/* Status buttons */}
                        <div className="pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 mb-2">
                            Set Status
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                "compliant",
                                "partial",
                                "non_compliant",
                                "not_applicable",
                                "not_assessed",
                              ] as ReqStatusValue[]
                            ).map((s) => {
                              const btnSc = statusConfig[s];
                              const isActive = req.status === s;
                              return (
                                <button
                                  key={s}
                                  onClick={() =>
                                    handleUpdateRequirement(
                                      req.requirementId,
                                      s,
                                    )
                                  }
                                  disabled={isUpdating}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    isActive
                                      ? `${btnSc.bgColor} ${btnSc.color} ring-1 ring-current`
                                      : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60"
                                  } disabled:opacity-50`}
                                >
                                  {btnSc.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* User notes */}
                        {req.notes && (
                          <p className="text-xs text-slate-500 dark:text-white/40 border-l-2 border-slate-200 dark:border-white/10 pl-2 italic">
                            {req.notes}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
          </div>
        )}

        {/* Empty requirements */}
        {totalReqs === 0 && (
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-8 text-center">
            <ShieldOff className="w-10 h-10 text-slate-400/40 dark:text-white/20 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-700 dark:text-white/70 mb-1">
              No requirements applicable
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              This entity classification does not have applicable NIS2
              requirements.
            </p>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
