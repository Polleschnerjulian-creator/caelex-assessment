"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  ShieldCheck,
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Shield,
  ShieldAlert,
  ShieldOff,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import { getIcon } from "@/lib/icons";
import type { Question, QuestionOption } from "@/lib/questions";

// ─── Types ───

interface NIS2Assessment {
  id: string;
  assessmentName: string | null;
  entityClassification: string | null;
  classificationReason: string | null;
  sector: string | null;
  subSector: string | null;
  organizationSize: string | null;
  memberStateCount: number;
  complianceScore: number | null;
  maturityScore: number | null;
  riskLevel: string | null;
  euSpaceActOverlapCount: number | null;
  hasISO27001: boolean;
  hasExistingCSIRT: boolean;
  requirements: {
    id: string;
    requirementId: string;
    status: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// ─── NIS2 Scoping Questions (inline to avoid server-only import issues) ───

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
      "NIS2 primarily applies to entities established in EU member states. Non-EU entities may also be in scope if they provide services within the EU.",
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
      "The NIS2 Directive primarily applies to entities established in the EU. However, if you provide services within the EU, you may need to designate an EU representative under Art. 26. Additionally, the forthcoming EU Space Act will apply to third-country operators serving the EU market. Consider re-assessing your NIS2 obligations if you expand into the EU.",
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

// ─── Wizard Answer Type ───

interface WizardAnswers {
  spaceSubSector: string | null;
  isEUEstablished: boolean | null;
  entitySize: string | null;
  memberStateCount: number | null;
  operatesGroundInfra: boolean | null;
  hasISO27001: boolean | null;
  hasExistingCSIRT: boolean | null;
  [key: string]: string | boolean | number | null;
}

const defaultWizardAnswers: WizardAnswers = {
  spaceSubSector: null,
  isEUEstablished: null,
  entitySize: null,
  memberStateCount: null,
  operatesGroundInfra: null,
  hasISO27001: null,
  hasExistingCSIRT: null,
};

// ─── Classification Config ───

const classificationConfig: Record<
  string,
  { icon: typeof Shield; label: string; color: string; bgColor: string }
> = {
  essential: {
    icon: ShieldAlert,
    label: "Essential Entity",
    color: "text-[var(--accent-danger)]",
    bgColor: "bg-[var(--accent-danger)]/10",
  },
  important: {
    icon: Shield,
    label: "Important Entity",
    color: "text-[var(--accent-warning)]",
    bgColor: "bg-[var(--accent-warning-soft)]",
  },
  out_of_scope: {
    icon: ShieldOff,
    label: "Out of Scope",
    color: "text-[var(--text-tertiary)]",
    bgColor: "bg-[var(--surface-sunken)]0/10",
  },
};

// ─── Dashboard Option Card ───

function DashboardOptionCard({
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
            ? "bg-[var(--accent-success-soft)] border-2 border-[var(--accent-primary)]"
            : "bg-[var(--surface-raised)] border border-[var(--border-default)] hover:border-[var(--border-default)] hover:bg-[var(--surface-sunken)]"
        }
      `}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        {IconComponent && (
          <div
            className={`
              p-2.5 rounded-lg transition-colors flex-shrink-0
              ${
                isSelected
                  ? "bg-[var(--accent-success-soft)]"
                  : "bg-[var(--surface-sunken)] group-hover:bg-[var(--surface-sunken)]:bg-[var(--surface-sunken)]"
              }
            `}
          >
            <IconComponent
              size={20}
              className={
                isSelected
                  ? "text-[var(--accent-success)]"
                  : "text-[var(--text-secondary)]"
              }
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-body-lg font-medium ${
              isSelected
                ? "text-[var(--accent-success)]"
                : "text-[var(--text-primary)]"
            }`}
          >
            {label}
          </h3>
          <p className="text-body text-[var(--text-secondary)] leading-relaxed">
            {description}
          </p>
        </div>

        {/* Selection Indicator */}
        <div
          className={`
            w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all
            ${
              isSelected
                ? "bg-[var(--accent-primary)]"
                : "border-2 border-[var(--border-default)]"
            }
          `}
        >
          {isSelected && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Check size={12} className="text-white" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ─── Out of Scope Result ───

function OutOfScopeCard({
  message,
  detail,
  onBack,
  onClose,
}: {
  message: string;
  detail: string;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      <div className="w-16 h-16 rounded-xl bg-[var(--accent-warning-soft)] flex items-center justify-center mx-auto mb-6">
        <AlertTriangle
          className="w-8 h-8 text-[var(--accent-warning)]"
          aria-hidden="true"
        />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        {message}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-8 leading-relaxed">
        {detail}
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]:text-white border border-[var(--border-default)] rounded-lg transition-colors"
        >
          Change Answer
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm bg-[var(--surface-sunken)] hover:bg-[var(--surface-sunken)] text-[var(--text-secondary)] rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}

// ─── Wizard Component ───

function NIS2Wizard({
  onComplete,
  onCancel,
}: {
  onComplete: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<WizardAnswers>({
    ...defaultWizardAnswers,
  });
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfScope, setOutOfScope] = useState<{
    message: string;
    detail: string;
  } | null>(null);
  const [assessmentName, setAssessmentName] = useState(
    `NIS2 Assessment ${new Date().toLocaleDateString()}`,
  );

  const totalSteps = NIS2_WIZARD_QUESTIONS.length;
  const currentQuestion = NIS2_WIZARD_QUESTIONS.find(
    (q) => q.step === currentStep,
  );
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  const handleSelect = (value: string | boolean | number) => {
    if (!currentQuestion) return;

    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));

    // Check if this triggers out-of-scope
    if (
      currentQuestion.outOfScopeValue !== undefined &&
      value === currentQuestion.outOfScopeValue
    ) {
      setOutOfScope({
        message: currentQuestion.outOfScopeMessage || "Out of scope",
        detail:
          currentQuestion.outOfScopeDetail ||
          "Based on your answer, your organization may not fall under NIS2.",
      });
      return;
    }

    // Auto-advance to next step after a short delay
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
      // Map wizard answers to API body
      const subSector = answers.spaceSubSector;
      const body = {
        assessmentName,
        sector: "space",
        subSector,
        entitySize: answers.entitySize || "medium",
        memberStateCount:
          typeof answers.memberStateCount === "number"
            ? answers.memberStateCount
            : 1,
        isEUEstablished: answers.isEUEstablished ?? true,
        operatesGroundInfra: answers.operatesGroundInfra ?? false,
        // Derive activity booleans from sub-sector
        operatesSatComms: subSector === "satellite_communications",
        manufacturesSpacecraft: subSector === "spacecraft_manufacturing",
        providesLaunchServices: subSector === "launch_services",
        providesEOData: subSector === "earth_observation",
        hasISO27001: answers.hasISO27001 ?? false,
        hasExistingCSIRT: answers.hasExistingCSIRT ?? false,
      };

      const res = await fetch("/api/nis2", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to create assessment (${res.status})`,
        );
      }

      const data = await res.json();

      // Navigate to the new assessment detail page
      if (data.assessment?.id) {
        router.push(`/dashboard/modules/nis2/${data.assessment.id}`);
      } else {
        onComplete();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create assessment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = currentStep === totalSteps;
  const allAnswered = NIS2_WIZARD_QUESTIONS.every(
    (q) => answers[q.id] !== null && answers[q.id] !== undefined,
  );

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 80 : -80,
      opacity: 0,
    }),
  };

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-[var(--surface-raised)][0.02] border border-[var(--border-default)] rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-cyan-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              NIS2 Scoping Assessment
            </h2>
            <p className="text-caption text-[var(--text-tertiary)]">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-[var(--surface-sunken)] rounded-lg transition-colors"
          aria-label="Close wizard"
        >
          <X size={16} className="text-[var(--text-tertiary)]" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--surface-sunken)]">
        <motion.div
          className="h-full bg-[var(--accent-success-soft)]0"
          initial={{ width: 0 }}
          animate={{
            width: `${(currentStep / totalSteps) * 100}%`,
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          role="progressbar"
          aria-valuenow={Math.round((currentStep / totalSteps) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Assessment progress"
        />
      </div>

      {/* Body */}
      <div className="px-6 py-8">
        {outOfScope ? (
          <OutOfScopeCard
            message={outOfScope.message}
            detail={outOfScope.detail}
            onBack={handleBack}
            onClose={onCancel}
          />
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
              {/* Question header */}
              <div className="mb-6 text-center max-w-xl mx-auto">
                <span className="text-micro uppercase tracking-[0.2em] text-[var(--text-tertiary)] block mb-3">
                  Question {String(currentStep).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                  {currentQuestion.title}
                </h3>
                {currentQuestion.subtitle && (
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {currentQuestion.subtitle}
                  </p>
                )}
              </div>

              {/* Options */}
              <div
                role="radiogroup"
                aria-label={currentQuestion.title}
                className="space-y-2.5 max-w-xl mx-auto"
              >
                {currentQuestion.options.map((option: QuestionOption) => (
                  <DashboardOptionCard
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

        {/* Assessment Name (shown on last step after answering) */}
        {isLastStep && currentAnswer !== null && !outOfScope && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 max-w-xl mx-auto"
          >
            <div className="border-t border-[var(--border-subtle)] pt-6">
              <label className="block text-xs uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-2">
                Assessment Name
              </label>
              <input
                type="text"
                value={assessmentName}
                onChange={(e) => setAssessmentName(e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-body-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]:border-[var(--accent-primary)]/50 transition-colors"
                placeholder="e.g. Q1 2026 NIS2 Audit"
              />
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mt-4 bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 rounded-lg p-3 flex items-center gap-3 max-w-xl mx-auto"
          >
            <AlertCircle
              className="w-4 h-4 text-[var(--accent-danger)] flex-shrink-0"
              aria-hidden="true"
            />
            <p className="text-xs text-[var(--accent-danger)]">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {!outOfScope && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50[0.01]">
          <button
            onClick={currentStep === 1 ? onCancel : handleBack}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft size={14} />
            {currentStep === 1 ? "Cancel" : "Back"}
          </button>

          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="flex items-center gap-1.5 mr-4" aria-hidden="true">
              {NIS2_WIZARD_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i + 1 === currentStep
                      ? "bg-[var(--accent-success-soft)]0"
                      : i + 1 < currentStep
                        ? "bg-[var(--accent-primary)]"
                        : "bg-[var(--surface-sunken)]"
                  }`}
                />
              ))}
            </div>

            {isLastStep && allAnswered ? (
              <button
                onClick={handleSubmit}
                disabled={submitting || !assessmentName.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Create Assessment
              </button>
            ) : (
              currentAnswer !== null && (
                <button
                  onClick={() => {
                    setDirection(1);
                    setCurrentStep((prev) => prev + 1);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
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

// ─── Main Page ───

export default function NIS2ModulePage() {
  const [assessments, setAssessments] = useState<NIS2Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const fetchAssessments = useCallback(async () => {
    try {
      const res = await fetch("/api/nis2");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || `Failed to fetch assessments (${res.status})`,
        );
      }
      const data = await res.json();
      setAssessments(data.assessments || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load assessments",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  if (loading) {
    return (
      <FeatureGate module="nis2">
        <div
          className="flex items-center justify-center min-h-[400px]"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="w-6 h-6 animate-spin text-[var(--text-tertiary)]"
            aria-hidden="true"
          />
          <span className="sr-only">Loading NIS2 assessments...</span>
        </div>
      </FeatureGate>
    );
  }

  return (
    <FeatureGate module="nis2">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <ShieldCheck
                  className="w-5 h-5 text-cyan-400"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                  NIS2 Directive
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  (EU) 2022/2555 — Space sector cybersecurity compliance
                </p>
              </div>
            </div>
          </div>
          {!showWizard && (
            <div className="flex items-center gap-3">
              <a
                href="/assessment/nis2"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]:text-white border border-[var(--border-default)] rounded-lg transition-colors"
              >
                Public Assessment
                <ExternalLink size={14} />
              </a>
              <button
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={14} />
                New Assessment
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertCircle
              className="w-5 h-5 text-[var(--accent-danger)] flex-shrink-0"
              aria-hidden="true"
            />
            <p className="text-sm text-[var(--accent-danger)]">{error}</p>
          </div>
        )}

        {/* Wizard */}
        <AnimatePresence>
          {showWizard && (
            <NIS2Wizard
              onComplete={() => {
                setShowWizard(false);
                fetchAssessments();
              }}
              onCancel={() => setShowWizard(false)}
            />
          )}
        </AnimatePresence>

        {/* Empty state */}
        {assessments.length === 0 && !error && !showWizard && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--surface-raised)][0.02] border border-[var(--border-default)] rounded-xl p-12 text-center"
          >
            <ShieldCheck
              className="w-12 h-12 text-cyan-400/40 mx-auto mb-4"
              aria-hidden="true"
            />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              No NIS2 assessments yet
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6">
              Start a NIS2 scoping assessment to determine your entity
              classification and applicable cybersecurity requirements under the
              NIS2 Directive for the space sector.
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={14} />
              Start Assessment
            </button>
          </motion.div>
        )}

        {/* Assessments list */}
        {assessments.length > 0 && (
          <div className="space-y-4">
            {assessments.map((assessment, index) => {
              const config =
                classificationConfig[
                  assessment.entityClassification || "out_of_scope"
                ] || classificationConfig.out_of_scope;
              const ClassIcon = config.icon;

              const totalReqs = assessment.requirements.length;
              const compliantReqs = assessment.requirements.filter(
                (r) => r.status === "compliant",
              ).length;
              const progress =
                totalReqs > 0
                  ? Math.round((compliantReqs / totalReqs) * 100)
                  : 0;

              return (
                <motion.a
                  key={assessment.id}
                  href={`/dashboard/modules/nis2/${assessment.id}`}
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="block bg-[var(--surface-raised)][0.02] border border-[var(--border-default)] rounded-xl p-5 hover:border-[var(--border-default)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}
                      >
                        <ClassIcon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-primary)]">
                          {assessment.assessmentName || "Untitled Assessment"}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={`text-xs font-medium ${config.color}`}
                          >
                            {config.label}
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {assessment.subSector?.replace(/_/g, " ") ||
                              assessment.sector?.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {new Date(
                              assessment.createdAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Requirements progress */}
                      <div className="text-right">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {compliantReqs}/{totalReqs}
                        </div>
                        <div className="text-micro text-[var(--text-tertiary)] uppercase">
                          Requirements
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-24">
                        <div className="h-1.5 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-micro text-[var(--text-tertiary)] text-right mt-1">
                          {progress}%
                        </div>
                      </div>

                      {/* EU Space Act overlap */}
                      {assessment.euSpaceActOverlapCount != null &&
                        assessment.euSpaceActOverlapCount > 0 && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-[var(--accent-success)]">
                              {assessment.euSpaceActOverlapCount}
                            </div>
                            <div className="text-micro text-[var(--accent-success)]/60 uppercase">
                              Overlaps
                            </div>
                          </div>
                        )}

                      <ChevronRight
                        className="w-4 h-4 text-[var(--text-tertiary)]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}

        {/* Info card */}
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-5">
          <h4 className="text-sm font-medium text-cyan-400 mb-2">
            About NIS2 for Space Operators
          </h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            The NIS2 Directive (EU) 2022/2555 lists Space as a sector of high
            criticality in Annex I (Sector 11). Space operators must comply with
            Art. 21 cybersecurity risk-management measures and Art. 23 incident
            reporting obligations. The upcoming EU Space Act will act as{" "}
            <em>lex specialis</em>, superseding NIS2 for space-specific
            requirements from 2030.
          </p>
        </div>
      </div>
    </FeatureGate>
  );
}
