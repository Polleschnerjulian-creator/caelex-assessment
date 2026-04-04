"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  ShieldCheck,
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  AlertTriangle,
  Cpu,
  Satellite,
  Radio,
  Link2,
  User,
  Info,
  BarChart2,
  TrendingUp,
  Users,
} from "lucide-react";
import type { CRABenchmark } from "@/lib/cra-benchmark-service.server";
import { csrfHeaders } from "@/lib/csrf-client";
import { SPACE_PRODUCT_TAXONOMY } from "@/data/cra-taxonomy";
import type { CRASpaceProductType, ClassificationStep } from "@/lib/cra-types";

// ─── Types ───

interface SpacecraftSuggestion {
  spacecraft: {
    id: string;
    name: string;
    missionType: string;
    status: string;
  };
  suggestedProducts: Array<{
    productTypeId: string;
    productName: string;
    classification: string;
    hasAssessment: boolean;
    assessmentId?: string;
  }>;
  completionRate: number;
}

interface CRAAssessment {
  id: string;
  productName: string;
  productVersion: string | null;
  spaceProductTypeId: string | null;
  economicOperatorRole: string;
  productClassification: string;
  conformityRoute: string;
  classificationReasoning: ClassificationStep[];
  isOutOfScope: boolean;
  outOfScopeReason: string | null;
  segments: string;
  complianceScore: number | null;
  maturityScore: number | null;
  riskLevel: string | null;
  nis2OverlapCount: number | null;
  nis2AssessmentId: string | null;
  requirements: {
    id: string;
    requirementId: string;
    status: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// ─── Wizard State ───

interface WizardState {
  // Step 1: Product identification
  productName: string;
  productVersion: string;
  // Step 2: Space Product Type
  spaceProductTypeId: string | null;
  notListed: boolean;
  // Step 3: Product Properties (rule-engine path)
  hasNetworkFunction: boolean | null;
  processesAuthData: boolean | null;
  usedInCriticalInfra: boolean | null;
  performsCryptoOps: boolean | null;
  controlsPhysicalSystem: boolean | null;
  hasMicrocontroller: boolean | null;
  isOSSComponent: boolean | null;
  // Step 4: Deployment Context
  segments: string[];
  isEUEstablished: boolean | null;
  isCommerciallySupplied: boolean | null;
  // Step 5: Existing Certifications
  hasIEC62443: boolean | null;
  hasCommonCriteria: boolean | null;
  hasETSIEN303645: boolean | null;
  hasISO27001: boolean | null;
}

const defaultWizardState: WizardState = {
  productName: "",
  productVersion: "",
  spaceProductTypeId: null,
  notListed: false,
  hasNetworkFunction: null,
  processesAuthData: null,
  usedInCriticalInfra: null,
  performsCryptoOps: null,
  controlsPhysicalSystem: null,
  hasMicrocontroller: null,
  isOSSComponent: null,
  segments: [],
  isEUEstablished: null,
  isCommerciallySupplied: null,
  hasIEC62443: null,
  hasCommonCriteria: null,
  hasETSIEN303645: null,
  hasISO27001: null,
};

// ─── Classification Badge Config ───

const classificationConfig: Record<
  string,
  { icon: typeof Shield; label: string; color: string; bgColor: string }
> = {
  class_II: {
    icon: ShieldAlert,
    label: "Class II",
    color: "text-[var(--accent-danger)]",
    bgColor: "bg-[var(--accent-danger)]/10",
  },
  class_I: {
    icon: Shield,
    label: "Class I",
    color: "text-[var(--accent-warning)]",
    bgColor: "bg-[var(--accent-warning-soft)]",
  },
  default: {
    icon: ShieldCheck,
    label: "Default",
    color: "text-[var(--accent-success)]",
    bgColor: "bg-[var(--accent-success)]/10",
  },
};

const conformityRouteLabels: Record<string, string> = {
  self_assessment: "Self-Assessment (Module A)",
  harmonised_standard: "Harmonised Standard / Third-Party (Module B+C or H)",
  third_party_type_exam: "Third-Party Type Examination (Module B+C)",
  full_quality_assurance: "Full Quality Assurance (Module H)",
};

const segmentIcons: Record<string, typeof Satellite> = {
  space: Satellite,
  ground: Radio,
  link: Link2,
  user: User,
};

// ─── Product Type Card ───

function ProductTypeCard({
  product,
  isSelected,
  onClick,
}: {
  product: CRASpaceProductType;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config =
    classificationConfig[product.classification] ||
    classificationConfig.default;

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
        <div
          className={`
            p-2.5 rounded-lg transition-colors flex-shrink-0
            ${
              isSelected
                ? "bg-[var(--accent-success-soft)]"
                : "bg-[var(--surface-sunken)]"
            }
          `}
        >
          <Cpu
            size={20}
            className={
              isSelected
                ? "text-[var(--accent-success)]"
                : "text-[var(--text-secondary)]"
            }
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3
              className={`text-body-lg font-medium ${
                isSelected
                  ? "text-[var(--accent-success)]"
                  : "text-[var(--text-primary)]"
              }`}
            >
              {product.name}
            </h3>
            <span
              className={`text-micro font-medium px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}
            >
              {config.label}
            </span>
          </div>
          <p className="text-body text-[var(--text-secondary)] leading-relaxed line-clamp-2">
            {product.description}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {product.segments.map((seg) => {
              const SegIcon = segmentIcons[seg] || Satellite;
              return (
                <span
                  key={seg}
                  className="text-micro text-[var(--text-tertiary)] flex items-center gap-0.5"
                >
                  <SegIcon size={10} />
                  {seg}
                </span>
              );
            })}
          </div>
        </div>
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

// ─── Boolean Toggle ───

function BooleanToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean | null;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-default)]">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onChange(true)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            value === true
              ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)] ring-1 ring-[var(--accent-success)]/30"
              : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Yes
        </button>
        <button
          onClick={() => onChange(false)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            value === false
              ? "bg-[var(--accent-danger)]/10 text-[var(--accent-danger)] ring-1 ring-[var(--accent-danger)]/30"
              : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

// ─── Classification Preview ───

function ClassificationPreview({
  product,
}: {
  product: CRASpaceProductType | null;
}) {
  if (!product) return null;

  const config =
    classificationConfig[product.classification] ||
    classificationConfig.default;
  const ClassIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)]"
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}
        >
          <ClassIcon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div>
          <div className="text-micro uppercase tracking-wider text-[var(--text-tertiary)]">
            Classification Preview
          </div>
          <div className={`text-sm font-medium ${config.color}`}>
            {config.label} &mdash;{" "}
            {conformityRouteLabels[product.conformityRoute] ||
              product.conformityRoute}
          </div>
        </div>
      </div>
      {product.nis2SubSectors.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-micro text-[var(--text-tertiary)]">
            NIS2 overlap:
          </span>
          {product.nis2SubSectors.map((s) => (
            <span
              key={s}
              className="text-micro bg-cyan-500/10 text-cyan-400 rounded px-1.5 py-0.5"
            >
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Wizard Component ───

function CRAWizard({
  onComplete,
  onCancel,
  prefill,
}: {
  onComplete: () => void;
  onCancel: () => void;
  prefill?: Partial<WizardState>;
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>({ ...defaultWizardState });
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track which fields were auto-filled so we can show the indicator
  const [prefillFields, setPrefillFields] = useState<Set<string>>(new Set());

  // Apply prefill data once on mount — only fills null fields
  useEffect(() => {
    if (!prefill) return;
    const filled = new Set<string>();
    setState((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(prefill) as (keyof WizardState)[]) {
        const val = prefill[key];
        if (val !== undefined && val !== null && prev[key] === null) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (next as any)[key] = val;
          filled.add(key);
        } else if (
          key === "segments" &&
          Array.isArray(val) &&
          (val as string[]).length > 0 &&
          (prev.segments as string[]).length === 0
        ) {
          next.segments = val as string[];
          filled.add(key);
        }
      }
      return next;
    });
    if (filled.size > 0) setPrefillFields(filled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [expandedReasoning, setExpandedReasoning] = useState(false);

  // Step 3 is only shown when notListed=true
  const steps = state.notListed ? [1, 2, 3, 4, 5, 6] : [1, 2, 4, 5, 6];
  const totalSteps = steps.length;
  const stepIndex = steps.indexOf(currentStep);

  const selectedProduct = state.spaceProductTypeId
    ? SPACE_PRODUCT_TAXONOMY.find((p) => p.id === state.spaceProductTypeId) ||
      null
    : null;

  // Derive classification for result step
  const derivedClassification = selectedProduct
    ? selectedProduct.classification
    : state.notListed
      ? deriveClassificationFromProperties(state)
      : "default";

  const derivedConformityRoute = selectedProduct
    ? selectedProduct.conformityRoute
    : deriveConformityRoute(derivedClassification);

  const derivedReasoning = selectedProduct
    ? selectedProduct.classificationReasoning
    : buildRuleEngineReasoning(state);

  const derivedNis2Overlap = selectedProduct
    ? selectedProduct.nis2SubSectors
    : [];

  function handleNext() {
    const nextStepIdx = stepIndex + 1;
    if (nextStepIdx < steps.length) {
      setDirection(1);
      setCurrentStep(steps[nextStepIdx]);
    }
  }

  function handleBack() {
    if (stepIndex > 0) {
      setDirection(-1);
      setCurrentStep(steps[stepIndex - 1]);
    }
  }

  function canAdvance(): boolean {
    switch (currentStep) {
      case 1:
        return state.productName.trim().length > 0;
      case 2:
        return state.spaceProductTypeId !== null || state.notListed;
      case 3:
        return true; // properties are optional
      case 4:
        return state.segments.length > 0 && state.isEUEstablished !== null;
      case 5:
        return true; // certifications are optional
      case 6:
        return true;
      default:
        return false;
    }
  }

  const isLastStep = currentStep === 6;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const body = {
        productName: state.productName.trim(),
        productVersion: state.productVersion.trim() || undefined,
        spaceProductTypeId: state.spaceProductTypeId,
        economicOperatorRole: "manufacturer",
        segments: state.segments.length > 0 ? state.segments : ["space"],
        isEUEstablished: state.isEUEstablished,
        // Rule-engine properties
        hasNetworkFunction: state.hasNetworkFunction,
        processesAuthData: state.processesAuthData,
        usedInCriticalInfra: state.usedInCriticalInfra,
        performsCryptoOps: state.performsCryptoOps,
        controlsPhysicalSystem: state.controlsPhysicalSystem,
        hasMicrocontroller: state.hasMicrocontroller,
        isOSSComponent: state.isOSSComponent,
        isCommerciallySupplied: state.isCommerciallySupplied,
        // Certifications
        hasIEC62443: state.hasIEC62443,
        hasCommonCriteria: state.hasCommonCriteria,
        hasETSIEN303645: state.hasETSIEN303645,
        hasISO27001: state.hasISO27001,
      };

      const res = await fetch("/api/cra", {
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

      const json = await res.json();
      const assessment = json.data?.assessment ?? json.assessment;

      if (assessment?.id) {
        router.push(`/dashboard/modules/cra/${assessment.id}`);
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

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 80 : -80, opacity: 0 }),
  };

  // Group products by segment
  const productsBySegment: Record<string, CRASpaceProductType[]> = {};
  for (const product of SPACE_PRODUCT_TAXONOMY) {
    const primarySegment = product.segments[0];
    if (!productsBySegment[primarySegment]) {
      productsBySegment[primarySegment] = [];
    }
    productsBySegment[primarySegment].push(product);
  }

  const segmentOrder = ["space", "ground", "link", "user"];
  const segmentLabels: Record<string, string> = {
    space: "Space Segment",
    ground: "Ground Segment",
    link: "Link Segment",
    user: "User Segment",
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
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-orange-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              CRA Product Assessment
            </h2>
            <p className="text-caption text-[var(--text-tertiary)]">
              Step {stepIndex + 1} of {totalSteps}
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
          className="h-full bg-orange-500"
          initial={{ width: 0 }}
          animate={{
            width: `${((stepIndex + 1) / totalSteps) * 100}%`,
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          role="progressbar"
          aria-valuenow={Math.round(((stepIndex + 1) / totalSteps) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Assessment progress"
        />
      </div>

      {/* Body */}
      <div className="px-6 py-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* ─── Step 1: Product Identification ─── */}
            {currentStep === 1 && (
              <div className="max-w-xl mx-auto">
                <div className="mb-6 text-center">
                  <span className="text-micro uppercase tracking-[0.2em] text-[var(--text-tertiary)] block mb-3">
                    Step 01
                  </span>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    Product Identification
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Enter the name and version of the product with digital
                    elements you want to assess under CRA (EU) 2024/2847.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={state.productName}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          productName: e.target.value,
                        }))
                      }
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-body-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                      placeholder="e.g. OBC Flight Software v3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-2">
                      Product Version (optional)
                    </label>
                    <input
                      type="text"
                      value={state.productVersion}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          productVersion: e.target.value,
                        }))
                      }
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-body-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                      placeholder="e.g. 3.2.1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 2: Space Product Type ─── */}
            {currentStep === 2 && (
              <div className="max-w-2xl mx-auto">
                <div className="mb-6 text-center">
                  <span className="text-micro uppercase tracking-[0.2em] text-[var(--text-tertiary)] block mb-3">
                    Step 02
                  </span>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    Space Product Type
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Select your product from the curated space product taxonomy.
                    Classification is automatically derived from CRA Annex
                    III/IV criteria.
                  </p>
                </div>

                {/* Product groups by segment */}
                <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
                  {segmentOrder.map((segment) => {
                    const products = productsBySegment[segment];
                    if (!products || products.length === 0) return null;
                    const SegIcon = segmentIcons[segment] || Satellite;

                    return (
                      <div key={segment}>
                        <div className="flex items-center gap-2 mb-2">
                          <SegIcon
                            size={14}
                            className="text-[var(--text-tertiary)]"
                          />
                          <span className="text-micro uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
                            {segmentLabels[segment] || segment}
                          </span>
                        </div>
                        <div
                          className="space-y-2"
                          role="radiogroup"
                          aria-label={segmentLabels[segment]}
                        >
                          {products.map((product) => (
                            <ProductTypeCard
                              key={product.id}
                              product={product}
                              isSelected={
                                state.spaceProductTypeId === product.id
                              }
                              onClick={() =>
                                setState((prev) => ({
                                  ...prev,
                                  spaceProductTypeId: product.id,
                                  notListed: false,
                                }))
                              }
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Not listed option */}
                  <motion.button
                    role="radio"
                    aria-checked={state.notListed}
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        spaceProductTypeId: null,
                        notListed: true,
                      }))
                    }
                    whileTap={{ scale: 0.995 }}
                    className={`
                      w-full p-4 rounded-xl text-left transition-all duration-200
                      ${
                        state.notListed
                          ? "bg-[var(--accent-warning-soft)] border-2 border-[var(--accent-warning)]"
                          : "bg-[var(--surface-raised)] border border-[var(--border-default)] border-dashed hover:bg-[var(--surface-sunken)]"
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2.5 rounded-lg ${state.notListed ? "bg-[var(--accent-warning-soft)]" : "bg-[var(--surface-sunken)]"}`}
                      >
                        <AlertTriangle
                          size={20}
                          className={
                            state.notListed
                              ? "text-[var(--accent-warning)]"
                              : "text-[var(--text-secondary)]"
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <h3
                          className={`text-body-lg font-medium ${state.notListed ? "text-[var(--accent-warning)]" : "text-[var(--text-primary)]"}`}
                        >
                          My product is not listed
                        </h3>
                        <p className="text-body text-[var(--text-secondary)]">
                          Use the rule-engine path to classify your product
                          based on its properties
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                          state.notListed
                            ? "bg-[var(--accent-warning)]"
                            : "border-2 border-[var(--border-default)]"
                        }`}
                      >
                        {state.notListed && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <Check size={12} className="text-white" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                </div>

                {/* Classification preview */}
                {selectedProduct && (
                  <ClassificationPreview product={selectedProduct} />
                )}
              </div>
            )}

            {/* ─── Step 3: Product Properties (rule-engine path) ─── */}
            {currentStep === 3 && (
              <div className="max-w-xl mx-auto">
                <div className="mb-6 text-center">
                  <span className="text-micro uppercase tracking-[0.2em] text-[var(--text-tertiary)] block mb-3">
                    Step 03
                  </span>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    Product Properties
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    These properties determine the CRA classification via the
                    rule engine (Annex III/IV criteria).
                  </p>
                </div>
                <div className="space-y-2.5">
                  <BooleanToggle
                    label="Has network function?"
                    description="Product can connect to networks or other devices"
                    value={state.hasNetworkFunction}
                    onChange={(val) =>
                      setState((prev) => ({ ...prev, hasNetworkFunction: val }))
                    }
                  />
                  <BooleanToggle
                    label="Processes authentication data?"
                    description="Handles credentials, tokens, certificates, or authorization data"
                    value={state.processesAuthData}
                    onChange={(val) =>
                      setState((prev) => ({ ...prev, processesAuthData: val }))
                    }
                  />
                  <BooleanToggle
                    label="Used in critical infrastructure?"
                    description="Deployed in NIS2 Annex I / Annex II critical sectors"
                    value={state.usedInCriticalInfra}
                    onChange={(val) =>
                      setState((prev) => ({
                        ...prev,
                        usedInCriticalInfra: val,
                      }))
                    }
                  />
                  <BooleanToggle
                    label="Performs cryptographic operations?"
                    description="Encryption, decryption, key management, or digital signatures"
                    value={state.performsCryptoOps}
                    onChange={(val) =>
                      setState((prev) => ({ ...prev, performsCryptoOps: val }))
                    }
                  />
                  <BooleanToggle
                    label="Controls a physical system?"
                    description="Actuates, steers, or manages physical equipment (e.g. AOCS, thrusters)"
                    value={state.controlsPhysicalSystem}
                    onChange={(val) =>
                      setState((prev) => ({
                        ...prev,
                        controlsPhysicalSystem: val,
                      }))
                    }
                  />
                  <BooleanToggle
                    label="Has a microcontroller?"
                    description="Contains an embedded microcontroller or SoC"
                    value={state.hasMicrocontroller}
                    onChange={(val) =>
                      setState((prev) => ({ ...prev, hasMicrocontroller: val }))
                    }
                  />
                  <BooleanToggle
                    label="Is an open-source component?"
                    description="Product is distributed as open-source software"
                    value={state.isOSSComponent}
                    onChange={(val) =>
                      setState((prev) => ({ ...prev, isOSSComponent: val }))
                    }
                  />
                </div>
              </div>
            )}

            {/* ─── Step 4: Deployment Context ─── */}
            {currentStep === 4 && (
              <div className="max-w-xl mx-auto">
                <div className="mb-6 text-center">
                  <span className="text-micro uppercase tracking-[0.2em] text-[var(--text-tertiary)] block mb-3">
                    Step {state.notListed ? "04" : "03"}
                  </span>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    Deployment Context
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Where and how is your product deployed?
                  </p>
                </div>
                <div className="space-y-5">
                  {/* Segment selection */}
                  <div>
                    <label className="block text-xs uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-2">
                      Deployment Segments
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["space", "ground", "link", "user"] as const).map(
                        (seg) => {
                          const SegIcon = segmentIcons[seg];
                          const isChecked = state.segments.includes(seg);
                          return (
                            <button
                              key={seg}
                              onClick={() =>
                                setState((prev) => ({
                                  ...prev,
                                  segments: isChecked
                                    ? prev.segments.filter((s) => s !== seg)
                                    : [...prev.segments, seg],
                                }))
                              }
                              className={`flex items-center gap-2 p-3 rounded-lg text-sm transition-all ${
                                isChecked
                                  ? "bg-[var(--accent-success)]/10 border-2 border-[var(--accent-primary)] text-[var(--accent-success)]"
                                  : "bg-[var(--surface-raised)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
                              }`}
                            >
                              <SegIcon size={16} />
                              <span className="capitalize font-medium">
                                {seg}
                              </span>
                              {isChecked && (
                                <Check size={14} className="ml-auto" />
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* EU establishment */}
                  <BooleanToggle
                    label="EU Establishment"
                    description="Is the manufacturer established in the EU?"
                    value={state.isEUEstablished}
                    onChange={(val) =>
                      setState((prev) => ({ ...prev, isEUEstablished: val }))
                    }
                  />

                  {/* OSS commercially supplied (conditional) */}
                  {state.isOSSComponent === true && (
                    <BooleanToggle
                      label="Commercially supplied OSS?"
                      description="Is this open-source component commercially supplied on the EU market?"
                      value={state.isCommerciallySupplied}
                      onChange={(val) =>
                        setState((prev) => ({
                          ...prev,
                          isCommerciallySupplied: val,
                        }))
                      }
                    />
                  )}
                </div>
              </div>
            )}

            {/* ─── Step 5: Existing Certifications ─── */}
            {currentStep === 5 && (
              <div className="max-w-xl mx-auto">
                <div className="mb-6 text-center">
                  <span className="text-micro uppercase tracking-[0.2em] text-[var(--text-tertiary)] block mb-3">
                    Step {state.notListed ? "05" : "04"}
                  </span>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    Existing Certifications
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Existing certifications can reduce the conformity assessment
                    effort and pre-assess certain requirements.
                  </p>
                </div>
                <div className="space-y-2.5">
                  <BooleanToggle
                    label="IEC 62443"
                    description="Industrial cybersecurity standard — maps to CRA security-by-design requirements"
                    value={state.hasIEC62443}
                    onChange={(val) =>
                      setState((prev) => ({ ...prev, hasIEC62443: val }))
                    }
                  />
                  <BooleanToggle
                    label="Common Criteria (ISO 15408)"
                    description="IT security evaluation — recognized under CRA Art. 27(8)"
                    value={state.hasCommonCriteria}
                    onChange={(val) =>
                      setState((prev) => ({ ...prev, hasCommonCriteria: val }))
                    }
                  />
                  <BooleanToggle
                    label="ETSI EN 303 645"
                    description="Consumer IoT security standard — partial CRA Annex I coverage"
                    value={state.hasETSIEN303645}
                    onChange={(val) =>
                      setState((prev) => ({ ...prev, hasETSIEN303645: val }))
                    }
                  />
                  <BooleanToggle
                    label="ISO 27001"
                    description="Information security management system — supports CRA organizational measures"
                    value={state.hasISO27001}
                    onChange={(val) =>
                      setState((prev) => ({ ...prev, hasISO27001: val }))
                    }
                  />
                  {prefillFields.has("hasISO27001") && (
                    <p className="text-caption text-emerald-400 pl-1">
                      (aus Ihrem Profil)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ─── Step 6: Result ─── */}
            {currentStep === 6 && (
              <div className="max-w-xl mx-auto">
                <div className="mb-6 text-center">
                  <span className="text-micro uppercase tracking-[0.2em] text-[var(--text-tertiary)] block mb-3">
                    Result
                  </span>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    Classification Result
                  </h3>
                </div>

                {/* Classification badge */}
                {(() => {
                  const config =
                    classificationConfig[derivedClassification] ||
                    classificationConfig.default;
                  const ClassIcon = config.icon;
                  return (
                    <div className="text-center mb-6">
                      <div
                        className={`w-16 h-16 rounded-xl ${config.bgColor} flex items-center justify-center mx-auto mb-3`}
                      >
                        <ClassIcon className={`w-8 h-8 ${config.color}`} />
                      </div>
                      <div className={`text-xl font-bold ${config.color} mb-1`}>
                        {config.label}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {conformityRouteLabels[derivedConformityRoute] ||
                          derivedConformityRoute}
                      </div>
                    </div>
                  );
                })()}

                {/* Reasoning chain (collapsible) */}
                {derivedReasoning.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => setExpandedReasoning(!expandedReasoning)}
                      className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {expandedReasoning ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                      Classification Reasoning ({derivedReasoning.length}{" "}
                      criteria)
                    </button>
                    <AnimatePresence>
                      {expandedReasoning && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 mt-3">
                            {derivedReasoning.map((step, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg border ${
                                  step.satisfied
                                    ? "bg-[var(--accent-success)]/5 border-[var(--accent-success)]/20"
                                    : "bg-[var(--surface-sunken)] border-[var(--border-subtle)]"
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  {step.satisfied ? (
                                    <Check
                                      size={14}
                                      className="text-[var(--accent-success)] mt-0.5 flex-shrink-0"
                                    />
                                  ) : (
                                    <X
                                      size={14}
                                      className="text-[var(--text-tertiary)] mt-0.5 flex-shrink-0"
                                    />
                                  )}
                                  <div>
                                    <div className="text-xs font-medium text-[var(--text-primary)]">
                                      {step.criterion}
                                    </div>
                                    <div className="text-micro text-[var(--text-tertiary)] mt-0.5">
                                      {step.legalBasis}
                                      {step.annexRef !== "N/A" &&
                                        ` (${step.annexRef})`}
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                                      {step.reasoning}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* NIS2 overlap summary */}
                {derivedNis2Overlap.length > 0 && (
                  <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck size={16} className="text-cyan-400" />
                      <span className="text-sm font-medium text-cyan-400">
                        NIS2 Overlap
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {derivedNis2Overlap.map((s) => (
                        <span
                          key={s}
                          className="text-micro bg-cyan-500/10 text-cyan-400 rounded px-2 py-0.5"
                        >
                          {s.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      Requirements overlapping with NIS2 will be flagged in the
                      tracking view.
                    </p>
                  </div>
                )}

                {/* Product summary */}
                <div className="p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[var(--text-tertiary)]">
                        Product
                      </span>
                      <div className="text-[var(--text-secondary)] font-medium">
                        {state.productName}
                      </div>
                    </div>
                    {state.productVersion && (
                      <div>
                        <span className="text-[var(--text-tertiary)]">
                          Version
                        </span>
                        <div className="text-[var(--text-secondary)] font-medium">
                          {state.productVersion}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-[var(--text-tertiary)]">
                        Source
                      </span>
                      <div className="text-[var(--text-secondary)] font-medium">
                        {selectedProduct ? "Taxonomy" : "Rule Engine"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--text-tertiary)]">
                        Segments
                      </span>
                      <div className="text-[var(--text-secondary)] font-medium">
                        {state.segments.length > 0
                          ? state.segments.join(", ")
                          : selectedProduct?.segments.join(", ") || "space"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

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
      <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50[0.01]">
        <button
          onClick={stepIndex === 0 ? onCancel : handleBack}
          className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <ArrowLeft size={14} />
          {stepIndex === 0 ? "Cancel" : "Back"}
        </button>

        <div className="flex items-center gap-2">
          {/* Step dots */}
          <div className="flex items-center gap-1.5 mr-4" aria-hidden="true">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === stepIndex
                    ? "bg-orange-500"
                    : i < stepIndex
                      ? "bg-[var(--accent-primary)]"
                      : "bg-[var(--surface-sunken)]"
                }`}
              />
            ))}
          </div>

          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
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
            canAdvance() && (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Next
                <ArrowRight size={14} />
              </button>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Rule-engine classification helpers ───

function deriveClassificationFromProperties(state: WizardState): string {
  // Class II: critical infrastructure + controls physical system OR processes auth data + crypto
  if (
    state.usedInCriticalInfra === true &&
    (state.controlsPhysicalSystem === true ||
      state.processesAuthData === true) &&
    state.performsCryptoOps === true
  ) {
    return "class_II";
  }
  // Class I: has network function OR has microcontroller OR processes auth data
  if (
    state.hasNetworkFunction === true ||
    state.hasMicrocontroller === true ||
    state.processesAuthData === true ||
    state.performsCryptoOps === true
  ) {
    return "class_I";
  }
  return "default";
}

function deriveConformityRoute(classification: string): string {
  switch (classification) {
    case "class_II":
      return "third_party_type_exam";
    case "class_I":
      return "harmonised_standard";
    default:
      return "self_assessment";
  }
}

function buildRuleEngineReasoning(state: WizardState): ClassificationStep[] {
  const steps: ClassificationStep[] = [];

  steps.push({
    criterion: "Product with digital elements",
    legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
    annexRef: "N/A",
    satisfied: true,
    reasoning:
      "Product is being assessed under the CRA, confirming it contains digital elements with a data connection.",
  });

  if (state.hasNetworkFunction !== null) {
    steps.push({
      criterion: "Network-capable product",
      legalBasis: "Annex III Kategorie 2.1",
      annexRef: "Annex III",
      annexCategory: "2.1",
      satisfied: state.hasNetworkFunction === true,
      reasoning: state.hasNetworkFunction
        ? "Product has network function, meeting Annex III Category 2.1 criteria."
        : "Product does not have an independent network function.",
    });
  }

  if (state.processesAuthData !== null) {
    steps.push({
      criterion: "Product processing authentication data",
      legalBasis: "Annex IV Kategorie 2",
      annexRef: "Annex IV",
      annexCategory: "2",
      satisfied: state.processesAuthData === true,
      reasoning: state.processesAuthData
        ? "Product processes authentication credentials, authorization tokens, or similar security-relevant data."
        : "Product does not process authentication or authorization data.",
    });
  }

  if (state.usedInCriticalInfra !== null) {
    steps.push({
      criterion: "Product in critical infrastructure with control function",
      legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
      annexRef: "Annex IV",
      annexCategory: "1",
      satisfied:
        state.usedInCriticalInfra === true &&
        state.controlsPhysicalSystem === true,
      reasoning:
        state.usedInCriticalInfra && state.controlsPhysicalSystem
          ? "Product is deployed in critical infrastructure and controls physical systems — Annex IV Category 1."
          : "Product does not meet the combined criteria for Annex IV Category 1.",
    });
  }

  if (state.performsCryptoOps !== null) {
    steps.push({
      criterion: "Product performing cryptographic operations",
      legalBasis: "Annex III Kategorie 2.3 / Annex IV Kategorie 3",
      annexRef: state.usedInCriticalInfra ? "Annex IV" : "Annex III",
      annexCategory: state.usedInCriticalInfra ? "3" : "2.3",
      satisfied: state.performsCryptoOps === true,
      reasoning: state.performsCryptoOps
        ? "Product performs cryptographic operations (encryption, key management, digital signatures)."
        : "Product does not perform cryptographic operations.",
    });
  }

  return steps;
}

// ─── Main Page ───

export default function CRAModulePage() {
  const [assessments, setAssessments] = useState<CRAAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardPrefill, setWizardPrefill] = useState<
    Partial<WizardState> | undefined
  >(undefined);

  // Fetch org profile data for pre-fill when the wizard opens
  useEffect(() => {
    if (!showWizard) return;

    (async () => {
      try {
        const prefill: Partial<WizardState> = {};

        // Try NIS2 assessment — it has isEUEstablished, hasISO27001,
        // operatesGroundInfra, operatesSatComms, etc.
        const nis2Res = await fetch("/api/nis2");
        if (nis2Res.ok) {
          const json = await nis2Res.json();
          const assessmentsList =
            json.data?.assessments ?? json.assessments ?? [];
          if (assessmentsList.length > 0) {
            const latest = assessmentsList[0]; // already sorted by createdAt desc
            if (latest.isEUEstablished != null) {
              prefill.isEUEstablished = latest.isEUEstablished;
            }
            if (latest.hasISO27001 != null) {
              prefill.hasISO27001 = latest.hasISO27001;
            }
            // Infer segments from NIS2 sub-sector flags
            const segs: string[] = [];
            if (latest.operatesGroundInfra) segs.push("ground");
            if (latest.operatesSatComms || latest.manufacturesSpacecraft) {
              if (!segs.includes("space")) segs.push("space");
            }
            if (segs.length > 0) prefill.segments = segs;
          }
        }

        if (Object.keys(prefill).length > 0) {
          setWizardPrefill(prefill);
        }
      } catch {
        // Silent fail — pre-fill is best-effort
      }
    })();
  }, [showWizard]);

  const fetchAssessments = useCallback(async () => {
    try {
      const res = await fetch("/api/cra");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || `Failed to fetch assessments (${res.status})`,
        );
      }
      const json = await res.json();
      setAssessments(json.data?.assessments ?? json.assessments ?? []);
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

  const [benchmark, setBenchmark] = useState<CRABenchmark | null>(null);

  useEffect(() => {
    fetch("/api/cra/benchmark")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const data = json?.data ?? json;
        if (data?.benchmark) {
          setBenchmark(data.benchmark);
        }
      })
      .catch(() => {}); // Silent fail — benchmark is best-effort
  }, []);

  const [suggestions, setSuggestions] = useState<SpacecraftSuggestion[] | null>(
    null,
  );
  const [expandedSpacecraft, setExpandedSpacecraft] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    fetch("/api/cra/suggestions")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const data = json?.data ?? json;
        if (data?.suggestions?.length > 0) {
          setSuggestions(data.suggestions);
        }
      })
      .catch(() => {}); // Silent fail
  }, []);

  if (loading) {
    return (
      <FeatureGate module="cra">
        <div
          className="flex items-center justify-center min-h-[400px]"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="w-6 h-6 animate-spin text-[var(--text-tertiary)]"
            aria-hidden="true"
          />
          <span className="sr-only">Loading CRA assessments...</span>
        </div>
      </FeatureGate>
    );
  }

  return (
    <FeatureGate module="cra">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-orange-400" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                  Cyber Resilience Act
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  (EU) 2024/2847 — Product cybersecurity compliance
                </p>
              </div>
            </div>
          </div>
          {!showWizard && (
            <div className="flex items-center gap-3">
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
            <CRAWizard
              prefill={wizardPrefill}
              onComplete={() => {
                setShowWizard(false);
                setWizardPrefill(undefined);
                fetchAssessments();
              }}
              onCancel={() => {
                setShowWizard(false);
                setWizardPrefill(undefined);
              }}
            />
          )}
        </AnimatePresence>

        {/* Spacecraft Suggestions */}
        {suggestions && suggestions.length > 0 && !showWizard && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-amber-500/30 bg-amber-500/5 rounded-xl overflow-hidden"
          >
            {/* Banner */}
            <div className="flex items-start gap-3 px-5 py-4 border-b border-amber-500/20">
              <AlertTriangle
                size={16}
                className="text-amber-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-400">
                  Basierend auf deinen {suggestions.length} registrierten
                  Spacecraft empfehlen wir CRA-Assessments für{" "}
                  {suggestions.reduce(
                    (acc, s) =>
                      acc +
                      s.suggestedProducts.filter((p) => !p.hasAssessment)
                        .length,
                    0,
                  )}{" "}
                  Komponenten
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Wähle eine Komponente und starte das Assessment mit
                  vorausgefülltem Produkttyp.
                </p>
              </div>
              {/* Overall completion bar */}
              <div className="flex-shrink-0 text-right min-w-[80px]">
                <div className="text-xs font-medium text-amber-400 mb-1">
                  {Math.round(
                    (suggestions.reduce(
                      (acc, s) =>
                        acc +
                        s.suggestedProducts.filter((p) => p.hasAssessment)
                          .length,
                      0,
                    ) /
                      Math.max(
                        suggestions.reduce(
                          (acc, s) => acc + s.suggestedProducts.length,
                          0,
                        ),
                        1,
                      )) *
                      100,
                  )}
                  % abgeschlossen
                </div>
                <div className="h-1.5 w-20 bg-amber-500/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{
                      width: `${Math.round(
                        (suggestions.reduce(
                          (acc, s) =>
                            acc +
                            s.suggestedProducts.filter((p) => p.hasAssessment)
                              .length,
                          0,
                        ) /
                          Math.max(
                            suggestions.reduce(
                              (acc, s) => acc + s.suggestedProducts.length,
                              0,
                            ),
                            1,
                          )) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Per-spacecraft collapsible rows */}
            <div className="divide-y divide-amber-500/10">
              {suggestions.map((suggestion) => {
                const isExpanded = expandedSpacecraft.has(
                  suggestion.spacecraft.id,
                );
                const done = suggestion.suggestedProducts.filter(
                  (p) => p.hasAssessment,
                );

                return (
                  <div key={suggestion.spacecraft.id}>
                    {/* Spacecraft header row */}
                    <button
                      onClick={() =>
                        setExpandedSpacecraft((prev) => {
                          const next = new Set(prev);
                          if (next.has(suggestion.spacecraft.id)) {
                            next.delete(suggestion.spacecraft.id);
                          } else {
                            next.add(suggestion.spacecraft.id);
                          }
                          return next;
                        })
                      }
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-amber-500/5 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Satellite
                          size={14}
                          className="text-amber-400 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <div>
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {suggestion.spacecraft.name}
                          </span>
                          <span className="ml-2 text-xs text-[var(--text-tertiary)]">
                            {suggestion.spacecraft.missionType.replace(
                              /_/g,
                              " ",
                            )}
                            {" · "}
                            {suggestion.spacecraft.status
                              .toLowerCase()
                              .replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {done.length}/{suggestion.suggestedProducts.length}{" "}
                          abgeschlossen
                        </span>
                        <div className="w-16 h-1.5 bg-amber-500/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{ width: `${suggestion.completionRate}%` }}
                          />
                        </div>
                        {isExpanded ? (
                          <ChevronUp
                            size={14}
                            className="text-[var(--text-tertiary)]"
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronDown
                            size={14}
                            className="text-[var(--text-tertiary)]"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </button>

                    {/* Expanded product grid */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {suggestion.suggestedProducts.map((product) => {
                              const classConf =
                                classificationConfig[product.classification] ||
                                classificationConfig.default;
                              const ClassIcon = classConf.icon;

                              return (
                                <div
                                  key={product.productTypeId}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                    product.hasAssessment
                                      ? "border-[var(--accent-success)]/20 bg-[var(--accent-success)]/5"
                                      : "border-amber-500/20 bg-[var(--surface-sunken)]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {product.hasAssessment ? (
                                      <Check
                                        size={14}
                                        className="text-[var(--accent-success)] flex-shrink-0"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <AlertTriangle
                                        size={14}
                                        className="text-amber-400 flex-shrink-0"
                                        aria-hidden="true"
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                                        {product.productName}
                                      </p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <ClassIcon
                                          size={10}
                                          className={classConf.color}
                                          aria-hidden="true"
                                        />
                                        <span
                                          className={`text-micro font-medium ${classConf.color}`}
                                        >
                                          {classConf.label}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  {product.hasAssessment ? (
                                    <Link
                                      href={`/dashboard/modules/cra/${product.assessmentId}`}
                                      className="text-micro text-[var(--accent-success)] hover:underline flex-shrink-0 ml-2"
                                    >
                                      Ansehen
                                    </Link>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setWizardPrefill({
                                          spaceProductTypeId:
                                            product.productTypeId,
                                        });
                                        setShowWizard(true);
                                      }}
                                      className="text-micro text-amber-400 hover:text-amber-300 flex-shrink-0 ml-2 whitespace-nowrap transition-colors"
                                    >
                                      Assessment starten →
                                    </button>
                                  )}
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
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {assessments.length === 0 && !error && !showWizard && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--surface-raised)][0.02] border border-[var(--border-default)] rounded-xl p-12 text-center"
          >
            <Cpu
              className="w-12 h-12 text-orange-400/40 mx-auto mb-4"
              aria-hidden="true"
            />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              No CRA assessments yet
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6">
              Start a CRA product assessment to classify your product with
              digital elements and track compliance with the Cyber Resilience
              Act requirements.
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
                  assessment.productClassification || "default"
                ] || classificationConfig.default;
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
                  href={`/dashboard/modules/cra/${assessment.id}`}
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
                          {assessment.productName || "Untitled Product"}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={`text-xs font-medium ${config.color}`}
                          >
                            {config.label}
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {conformityRouteLabels[
                              assessment.conformityRoute
                            ] || assessment.conformityRoute}
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
                      {/* Maturity score */}
                      {assessment.maturityScore !== null && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            {assessment.maturityScore}%
                          </div>
                          <div className="text-micro text-[var(--text-tertiary)] uppercase">
                            Maturity
                          </div>
                        </div>
                      )}

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

                      {/* NIS2 overlap */}
                      {assessment.nis2OverlapCount !== null &&
                        assessment.nis2OverlapCount > 0 && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-cyan-400">
                              {assessment.nis2OverlapCount}
                            </div>
                            <div className="text-micro text-cyan-400/60 uppercase">
                              NIS2 Overlap
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

        {/* CRA Compliance Benchmark */}
        {benchmark && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="border border-[var(--border-default)] rounded-xl overflow-hidden bg-[var(--surface-raised)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <BarChart2
                    size={15}
                    className="text-emerald-400"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    CRA Compliance Benchmark
                  </h2>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Anonymisierter Branchenvergleich
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                <Users size={12} aria-hidden="true" />
                {benchmark.totalOrganizations} Unternehmen
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Percentile hero */}
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0">
                  <div className="text-4xl font-bold text-emerald-400 tabular-nums leading-none">
                    {benchmark.percentile}%
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-1 leading-tight">
                    besser als andere
                    <br />
                    Unternehmen
                  </div>
                </div>

                {/* Score comparison bars */}
                <div className="flex-1 space-y-2.5 min-w-0">
                  {[
                    {
                      label: "Ihr Score",
                      value: Math.round(
                        assessments.reduce(
                          (sum, a) => sum + (a.maturityScore ?? 0),
                          0,
                        ) / Math.max(assessments.length, 1),
                      ),
                      colorClass: "bg-emerald-500",
                      textClass: "text-emerald-400",
                    },
                    {
                      label: "Durchschnitt",
                      value: benchmark.averageMaturityScore,
                      colorClass: "bg-slate-500",
                      textClass: "text-[var(--text-secondary)]",
                    },
                    {
                      label: "Median",
                      value: benchmark.medianMaturityScore,
                      colorClass: "bg-slate-600",
                      textClass: "text-[var(--text-tertiary)]",
                    },
                  ].map(({ label, value, colorClass, textClass }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span
                        className={`text-xs w-20 flex-shrink-0 ${textClass}`}
                      >
                        {label}
                      </span>
                      <div className="flex-1 h-2 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colorClass} rounded-full transition-all duration-700`}
                          style={{ width: `${Math.min(value, 100)}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs tabular-nums w-8 text-right ${textClass}`}
                      >
                        {value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category breakdown */}
              {benchmark.byCategory.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2.5">
                    Nach Kategorie
                  </h3>
                  <div className="space-y-2">
                    {benchmark.byCategory.map(
                      ({ category, avgComplianceRate, orgComplianceRate }) => {
                        const categoryLabel = category
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase());
                        const delta = orgComplianceRate - avgComplianceRate;
                        return (
                          <div
                            key={category}
                            className="flex items-center gap-2"
                          >
                            <span
                              className="text-xs text-[var(--text-tertiary)] w-36 flex-shrink-0 truncate"
                              title={categoryLabel}
                            >
                              {categoryLabel}
                            </span>
                            <div className="flex-1 relative h-3">
                              {/* Average bar (background) */}
                              <div className="absolute inset-0 h-2 top-0.5 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-slate-600 rounded-full"
                                  style={{
                                    width: `${Math.min(avgComplianceRate, 100)}%`,
                                  }}
                                />
                              </div>
                              {/* Org bar (overlay) */}
                              <div
                                className="absolute inset-0 h-2 top-0.5 rounded-full overflow-hidden"
                                style={{
                                  width: `${Math.min(orgComplianceRate, 100)}%`,
                                }}
                              >
                                <div
                                  className={`h-full rounded-full ${orgComplianceRate >= avgComplianceRate ? "bg-emerald-500" : "bg-amber-500"}`}
                                  style={{ width: "100%" }}
                                />
                              </div>
                            </div>
                            <span
                              className={`text-xs tabular-nums w-10 text-right flex-shrink-0 ${
                                delta >= 0
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {delta >= 0 ? "+" : ""}
                              {Math.round(delta)}%
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

              {/* Top gaps */}
              {benchmark.topGaps.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                    <TrendingUp size={11} aria-hidden="true" />
                    Top Gaps in der Branche
                  </h3>
                  <div className="space-y-1.5">
                    {benchmark.topGaps.map((gap) => (
                      <div
                        key={gap.requirementId}
                        className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-lg bg-[var(--surface-sunken)]"
                      >
                        <span className="text-xs text-[var(--text-secondary)] truncate flex-1 min-w-0">
                          {gap.title}
                        </span>
                        <span className="text-xs font-medium text-amber-400 tabular-nums flex-shrink-0">
                          {gap.nonCompliantPercent}% non-compliant
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-micro text-[var(--text-tertiary)] leading-relaxed">
                Basierend auf anonymisierten Daten von{" "}
                {benchmark.totalOrganizations} Unternehmen. Keine
                personenbezogenen oder unternehmensbezogenen Daten werden
                weitergegeben.
              </p>
            </div>
          </motion.div>
        )}

        {/* NIS2 callout */}
        {assessments.length > 0 &&
          assessments.every((a) => !a.nis2AssessmentId) && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Info
                  size={18}
                  className="text-cyan-400 flex-shrink-0 mt-0.5"
                />
                <div>
                  <h4 className="text-sm font-medium text-cyan-400 mb-1">
                    NIS2-Assessment empfohlen
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                    Du hast noch kein NIS2-Assessment. Basierend auf deinem
                    Produktprofil als Hersteller in der Space-Branche w&auml;rst
                    du wahrscheinlich NIS2-pflichtig (Annex I, Sektor 11).
                    Starte ein NIS2-Assessment um Requirements automatisch
                    vorzubelegen.
                  </p>
                  <Link
                    href="/dashboard/modules/nis2"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    <ShieldCheck size={14} />
                    NIS2-Assessment starten
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          )}

        {/* Info card */}
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
          <h4 className="text-sm font-medium text-orange-400 mb-2">
            About the Cyber Resilience Act for Space Products
          </h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            The Cyber Resilience Act (EU) 2024/2847 establishes cybersecurity
            requirements for products with digital elements placed on the EU
            market. Space products are classified into Default, Class I (Annex
            III), or Class II (Annex IV) categories, each with different
            conformity assessment obligations. Class II products such as
            on-board computers, AOCS flight software, and TT&amp;C systems
            require third-party assessment by a Notified Body.
          </p>
        </div>

        <div className="flex justify-end">
          <a
            href="/legal-network"
            className="inline-flex items-center gap-1.5 text-small text-[#9ca3af] hover:text-[#111827] transition-colors"
          >
            Rechtliche Beratung benötigt? Anwalt finden →
          </a>
        </div>
      </div>
    </FeatureGate>
  );
}
