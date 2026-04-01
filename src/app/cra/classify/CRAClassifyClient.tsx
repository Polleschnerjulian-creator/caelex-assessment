"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Satellite,
  Radio,
  MonitorDot,
  Globe,
  HelpCircle,
  ListChecks,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  ExternalLink,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { SPACE_PRODUCT_TAXONOMY } from "@/data/cra-taxonomy";
import type {
  CRASpaceProductType,
  CRAProductClass,
  CRAConformityRoute,
  ClassificationStep,
  ClassificationConflict,
} from "@/lib/cra-types";

// ─── Types ───

interface ClassifyResult {
  productClassification: CRAProductClass;
  classificationReasoning: ClassificationStep[];
  conformityRoute: CRAConformityRoute;
  conflict: ClassificationConflict | null;
  isOutOfScope: boolean;
  outOfScopeReason: string | null;
}

interface RuleEngineAnswers {
  hasNetworkFunction: boolean | null;
  processesAuthData: boolean | null;
  usedInCriticalInfra: boolean | null;
  performsCryptoOps: boolean | null;
  controlsPhysicalSystem: boolean | null;
  hasMicrocontroller: boolean | null;
}

type PathMode = null | "taxonomy" | "rules";

// ─── Constants ───

const SEGMENT_CONFIG: Record<
  string,
  { label: string; icon: typeof Satellite; color: string }
> = {
  space: { label: "Space Segment", icon: Satellite, color: "text-blue-400" },
  ground: {
    label: "Ground Segment",
    icon: MonitorDot,
    color: "text-emerald-400",
  },
  link: { label: "Link Segment", icon: Radio, color: "text-purple-400" },
  user: { label: "User Segment", icon: Globe, color: "text-amber-400" },
};

const CLASS_BADGE_STYLES: Record<
  CRAProductClass,
  { bg: string; text: string; border: string; label: string }
> = {
  class_II: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/30",
    label: "Class II",
  },
  class_I: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
    label: "Class I",
  },
  default: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/30",
    label: "Default",
  },
};

const CONFORMITY_LABELS: Record<CRAConformityRoute, string> = {
  self_assessment: "Self-Assessment (Internal Conformity)",
  harmonised_standard: "Harmonised Standard or Third-Party Audit",
  third_party_type_exam: "Third-Party Type Examination (Notified Body)",
  full_quality_assurance: "Full Quality Assurance System",
};

const RULE_QUESTIONS: {
  key: keyof RuleEngineAnswers;
  label: string;
  description: string;
}[] = [
  {
    key: "hasNetworkFunction",
    label: "Network Function",
    description:
      "Has the product an independent network interface or routing function (e.g. SpaceWire, Ethernet, RF link)?",
  },
  {
    key: "processesAuthData",
    label: "Authentication Data",
    description:
      "Does the product process authentication credentials, authorization tokens, or access control data?",
  },
  {
    key: "usedInCriticalInfra",
    label: "Critical Infrastructure",
    description:
      "Is the product deployed in critical infrastructure (NIS2 Annex I/II sectors, including space)?",
  },
  {
    key: "performsCryptoOps",
    label: "Cryptographic Operations",
    description:
      "Does the product perform encryption, decryption, key management, or digital signature operations?",
  },
  {
    key: "controlsPhysicalSystem",
    label: "Physical System Control",
    description:
      "Does the product control physical actuators, propulsion, attitude, thermal, or power systems?",
  },
  {
    key: "hasMicrocontroller",
    label: "Microcontroller / Embedded CPU",
    description:
      "Does the product contain a microcontroller, microprocessor, or embedded computing unit?",
  },
];

const KEY_DATES = [
  {
    date: "Dec 2024",
    label: "CRA entered into force",
    description: "Regulation (EU) 2024/2847 published in Official Journal",
    past: true,
  },
  {
    date: "Sep 2026",
    label: "Reporting obligations apply",
    description: "Vulnerability & incident reporting to ENISA mandatory",
    past: false,
  },
  {
    date: "Dec 2027",
    label: "Full compliance required",
    description: "All product obligations, conformity assessment, CE marking",
    past: false,
  },
];

// ─── Helpers ───

function groupProductsBySegment(products: CRASpaceProductType[]) {
  const grouped: Record<string, CRASpaceProductType[]> = {
    space: [],
    ground: [],
    link: [],
    user: [],
  };

  for (const product of products) {
    const primary = product.segments[0];
    if (grouped[primary]) {
      grouped[primary].push(product);
    }
  }

  return Object.entries(grouped).filter(([, items]) => items.length > 0);
}

// ─── Sub-Components ───

function ClassificationBadge({
  classification,
  size = "md",
}: {
  classification: CRAProductClass;
  size?: "sm" | "md" | "lg";
}) {
  const style = CLASS_BADGE_STYLES[classification];
  const sizeClasses = {
    sm: "text-caption px-2 py-0.5",
    md: "text-body px-3 py-1",
    lg: "text-title px-4 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClasses[size]}`}
    >
      {style.label}
    </span>
  );
}

function SegmentIcon({
  segment,
  className = "",
}: {
  segment: string;
  className?: string;
}) {
  const config = SEGMENT_CONFIG[segment];
  if (!config) return null;
  const Icon = config.icon;
  return <Icon size={16} className={`${config.color} ${className}`} />;
}

function ProductCard({
  product,
  onSelect,
  isSelected,
}: {
  product: CRASpaceProductType;
  onSelect: (product: CRASpaceProductType) => void;
  isSelected: boolean;
}) {
  return (
    <motion.button
      onClick={() => onSelect(product)}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
        isSelected
          ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
          : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14]"
      }`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <SegmentIcon segment={product.segments[0]} />
          <h4 className="text-body-lg font-medium text-slate-100 truncate">
            {product.name}
          </h4>
        </div>
        <ClassificationBadge
          classification={product.classification}
          size="sm"
        />
      </div>
      <p className="text-caption text-slate-400 line-clamp-2 leading-relaxed">
        {product.description}
      </p>
    </motion.button>
  );
}

function RuleToggle({
  question,
  value,
  onChange,
}: {
  question: (typeof RULE_QUESTIONS)[0];
  value: boolean | null;
  onChange: (key: keyof RuleEngineAnswers, value: boolean | null) => void;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-body-lg font-medium text-slate-200 mb-1">
            {question.label}
          </p>
          <p className="text-caption text-slate-400 leading-relaxed">
            {question.description}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onChange(question.key, value === true ? null : true)}
            className={`flex items-center justify-center w-9 h-9 rounded-lg border text-small font-medium transition-all ${
              value === true
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : "bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/[0.15]"
            }`}
            aria-label={`${question.label}: Yes`}
          >
            <Check size={14} />
          </button>
          <button
            onClick={() =>
              onChange(question.key, value === false ? null : false)
            }
            className={`flex items-center justify-center w-9 h-9 rounded-lg border text-small font-medium transition-all ${
              value === false
                ? "bg-red-500/20 border-red-500/40 text-red-400"
                : "bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/[0.15]"
            }`}
            aria-label={`${question.label}: No`}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ReasoningChain({ steps }: { steps: ClassificationStep[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-white/[0.08] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-body-lg font-medium text-slate-200">
          Legal Reasoning Chain ({steps.length} criteria)
        </span>
        {expanded ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="px-4 pb-4 space-y-3">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${
                    step.satisfied
                      ? "bg-emerald-500/[0.05] border-emerald-500/20"
                      : "bg-white/[0.02] border-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <span
                        className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                          step.satisfied
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-700/50 text-slate-500"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-body font-medium text-slate-200">
                          {step.criterion}
                        </span>
                        {step.satisfied ? (
                          <Check
                            size={12}
                            className="text-emerald-400 flex-shrink-0"
                          />
                        ) : (
                          <X
                            size={12}
                            className="text-slate-500 flex-shrink-0"
                          />
                        )}
                      </div>
                      <p className="text-caption text-slate-400 mb-1.5 leading-relaxed">
                        {step.reasoning}
                      </p>
                      <code className="text-[10px] font-mono text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded">
                        {step.legalBasis}
                        {step.annexRef !== "N/A" && ` | ${step.annexRef}`}
                        {step.annexCategory && ` Kat. ${step.annexCategory}`}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KeyDatesTimeline() {
  return (
    <div className="rounded-xl border border-white/[0.08] p-6 bg-white/[0.03]">
      <h3 className="text-heading font-semibold text-slate-100 mb-6">
        CRA Key Dates
      </h3>
      <div className="relative">
        {/* Timeline bar */}
        <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gradient-to-b from-emerald-500/60 via-white/[0.12] to-white/[0.12]" />

        <div className="space-y-6">
          {KEY_DATES.map((item, i) => (
            <div key={i} className="flex gap-4 relative">
              <div className="flex-shrink-0 mt-1.5">
                <div
                  className={`w-[15px] h-[15px] rounded-full border-2 ${
                    item.past
                      ? "bg-emerald-500 border-emerald-400"
                      : i === 1
                        ? "bg-amber-500/30 border-amber-500 animate-pulse"
                        : "bg-white/[0.06] border-white/[0.2]"
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-body font-semibold text-slate-100">
                    {item.date}
                  </span>
                  {item.past && (
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                      Done
                    </span>
                  )}
                  {!item.past && i === 1 && (
                    <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                      Next
                    </span>
                  )}
                </div>
                <p className="text-body font-medium text-slate-300">
                  {item.label}
                </p>
                <p className="text-caption text-slate-500">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function CRAClassifyClient() {
  const [pathMode, setPathMode] = useState<PathMode>(null);
  const [selectedProduct, setSelectedProduct] =
    useState<CRASpaceProductType | null>(null);
  const [ruleAnswers, setRuleAnswers] = useState<RuleEngineAnswers>({
    hasNetworkFunction: null,
    processesAuthData: null,
    usedInCriticalInfra: null,
    performsCryptoOps: null,
    controlsPhysicalSystem: null,
    hasMicrocontroller: null,
  });
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupedProducts = groupProductsBySegment(SPACE_PRODUCT_TAXONOMY);

  // ── Taxonomy path: select product → show stored classification ──
  const handleProductSelect = useCallback((product: CRASpaceProductType) => {
    setSelectedProduct(product);
    setResult({
      productClassification: product.classification,
      classificationReasoning: product.classificationReasoning,
      conformityRoute: product.conformityRoute,
      conflict: null,
      isOutOfScope: false,
      outOfScopeReason: null,
    });
    setError(null);
  }, []);

  // ── Rule engine path: call the public API ──
  const handleRuleClassify = useCallback(async () => {
    const answeredCount = Object.values(ruleAnswers).filter(
      (v) => v !== null,
    ).length;
    if (answeredCount < 3) {
      setError("Please answer at least 3 questions for a classification.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/compliance/cra/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: "Custom Product",
          segments: ["space"],
          ...ruleAnswers,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Classification failed. Please try again.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setResult({
        productClassification: data.data.productClassification,
        classificationReasoning: data.data.classificationReasoning,
        conformityRoute: data.data.conformityRoute,
        conflict: data.data.conflict,
        isOutOfScope: data.data.isOutOfScope,
        outOfScopeReason: data.data.outOfScopeReason,
      });
      setSelectedProduct(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [ruleAnswers]);

  const handleRuleAnswerChange = useCallback(
    (key: keyof RuleEngineAnswers, value: boolean | null) => {
      setRuleAnswers((prev) => ({ ...prev, [key]: value }));
      setResult(null);
      setError(null);
    },
    [],
  );

  const handleReset = useCallback(() => {
    setPathMode(null);
    setSelectedProduct(null);
    setResult(null);
    setError(null);
    setRuleAnswers({
      hasNetworkFunction: null,
      processesAuthData: null,
      usedInCriticalInfra: null,
      performsCryptoOps: null,
      controlsPhysicalSystem: null,
      hasMicrocontroller: null,
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-200">
      {/* ─── Hero Section ─── */}
      <section className="pt-32 md:pt-44 pb-12 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] text-caption text-slate-400 uppercase tracking-[0.15em] mb-6"
          >
            <Shield size={12} className="text-emerald-400" />
            EU Cyber Resilience Act
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[clamp(1.75rem,4.5vw,3rem)] font-semibold tracking-[-0.03em] text-white leading-[1.1] mb-5"
          >
            CRA Product Classification
            <br />
            <span className="text-emerald-400">for Space</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-body-lg md:text-heading text-slate-400 max-w-2xl mx-auto leading-relaxed mb-3"
          >
            Find out in 30 seconds which CRA class your space product falls into
            — free, no registration required.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="text-body text-slate-500 max-w-xl mx-auto leading-relaxed"
          >
            Finden Sie in 30 Sekunden heraus, welche CRA-Klasse Ihr
            Space-Produkt hat — kostenlos, ohne Registrierung.
          </motion.p>
        </div>
      </section>

      {/* ─── Path Selector ─── */}
      <section className="px-6 md:px-12 pb-8">
        <div className="max-w-[1100px] mx-auto">
          <AnimatePresence mode="wait">
            {pathMode === null && (
              <motion.div
                key="selector"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="grid md:grid-cols-2 gap-4"
              >
                <button
                  onClick={() => setPathMode("taxonomy")}
                  className="group p-6 md:p-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-200 text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <ListChecks size={18} className="text-emerald-400" />
                    </div>
                    <h3 className="text-title font-semibold text-white">
                      Ich kenne meinen Produkttyp
                    </h3>
                  </div>
                  <p className="text-body text-slate-400 mb-4 leading-relaxed">
                    Select from 19 curated space product types grouped by
                    segment. Instant classification with full legal reasoning.
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-small font-medium text-emerald-400 group-hover:gap-2 transition-all">
                    Browse products
                    <ArrowRight size={13} />
                  </span>
                </button>

                <button
                  onClick={() => setPathMode("rules")}
                  className="group p-6 md:p-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-200 text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <HelpCircle size={18} className="text-blue-400" />
                    </div>
                    <h3 className="text-title font-semibold text-white">
                      Ich bin mir nicht sicher
                    </h3>
                  </div>
                  <p className="text-body text-slate-400 mb-4 leading-relaxed">
                    Answer 6 yes/no questions about your product. The rule
                    engine determines the CRA class automatically.
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-small font-medium text-blue-400 group-hover:gap-2 transition-all">
                    Start questionnaire
                    <ArrowRight size={13} />
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back button when path is chosen */}
          {pathMode !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-small text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ArrowRight size={12} className="rotate-180" />
                Back to selection
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* ─── Path A: Taxonomy Cards ─── */}
      <AnimatePresence>
        {pathMode === "taxonomy" && (
          <motion.section
            key="taxonomy"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="px-6 md:px-12 pb-12"
          >
            <div className="max-w-[1100px] mx-auto">
              {groupedProducts.map(([segment, products]) => {
                const config = SEGMENT_CONFIG[segment];
                if (!config) return null;
                const Icon = config.icon;

                return (
                  <div key={segment} className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon size={16} className={config.color} />
                      <h3 className="text-body-lg font-semibold text-slate-300 uppercase tracking-[0.1em]">
                        {config.label}
                      </h3>
                      <span className="text-caption text-slate-600">
                        {products.length} products
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {products.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onSelect={handleProductSelect}
                          isSelected={selectedProduct?.id === product.id}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Path B: Rule Engine Questions ─── */}
      <AnimatePresence>
        {pathMode === "rules" && (
          <motion.section
            key="rules"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="px-6 md:px-12 pb-12"
          >
            <div className="max-w-[700px] mx-auto">
              <div className="space-y-3 mb-6">
                {RULE_QUESTIONS.map((q) => (
                  <RuleToggle
                    key={q.key}
                    question={q}
                    value={ruleAnswers[q.key]}
                    onChange={handleRuleAnswerChange}
                  />
                ))}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-body text-red-400"
                >
                  {error}
                </motion.div>
              )}

              <button
                onClick={handleRuleClassify}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium text-body-lg py-3.5 rounded-xl transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Classifying...
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    Classify Product
                  </>
                )}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Classification Result ─── */}
      <AnimatePresence>
        {result && (
          <motion.section
            key="result"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="px-6 md:px-12 pb-16"
          >
            <div className="max-w-[800px] mx-auto">
              {/* Result Header Card */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 md:p-8 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <p className="text-caption text-slate-500 uppercase tracking-[0.15em] mb-2">
                      Classification Result
                    </p>
                    <div className="flex items-center gap-3">
                      <ClassificationBadge
                        classification={result.productClassification}
                        size="lg"
                      />
                      {selectedProduct && (
                        <span className="text-body-lg text-slate-300">
                          {selectedProduct.name}
                        </span>
                      )}
                    </div>
                  </div>
                  {result.productClassification === "class_II" && (
                    <ShieldAlert size={32} className="text-red-400/60" />
                  )}
                  {result.productClassification === "class_I" && (
                    <AlertTriangle size={32} className="text-amber-400/60" />
                  )}
                  {result.productClassification === "default" && (
                    <ShieldCheck size={32} className="text-green-400/60" />
                  )}
                </div>

                {/* Conformity Route */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-5">
                  <p className="text-caption text-slate-500 uppercase tracking-[0.1em] mb-1">
                    Conformity Assessment Route
                  </p>
                  <p className="text-body-lg text-slate-200 font-medium">
                    {CONFORMITY_LABELS[result.conformityRoute]}
                  </p>
                  <p className="text-caption text-slate-500 mt-1">
                    {result.conformityRoute === "third_party_type_exam" &&
                      "A Notified Body must perform EU type examination (Module B + C/D). Plan 6-12 months lead time."}
                    {result.conformityRoute === "harmonised_standard" &&
                      "Self-assessment against harmonised standards (EN 18031-x) or opt for voluntary third-party audit."}
                    {result.conformityRoute === "self_assessment" &&
                      "Internal conformity assessment (Module A, Annex VIII). Manufacturer declares conformity via technical documentation."}
                    {result.conformityRoute === "full_quality_assurance" &&
                      "Comprehensive quality assurance system covering design, production, and post-market obligations."}
                  </p>
                </div>

                {/* NIS2 Hint */}
                {selectedProduct &&
                  selectedProduct.nis2SubSectors.length > 0 && (
                    <div className="p-3 rounded-lg bg-blue-500/[0.06] border border-blue-500/20 flex items-start gap-3">
                      <Shield
                        size={16}
                        className="text-blue-400 flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="text-body font-medium text-blue-300">
                          Dieses Produkt ist wahrscheinlich auch NIS2-relevant
                        </p>
                        <p className="text-caption text-blue-400/70 mt-0.5">
                          NIS2 sub-sectors:{" "}
                          {selectedProduct.nis2SubSectors
                            .map((s) => s.replace(/_/g, " "))
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  )}

                {/* NIS2 hint for rule engine path */}
                {!selectedProduct &&
                  result.productClassification !== "default" && (
                    <div className="p-3 rounded-lg bg-blue-500/[0.06] border border-blue-500/20 flex items-start gap-3">
                      <Shield
                        size={16}
                        className="text-blue-400 flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="text-body font-medium text-blue-300">
                          Dieses Produkt ist wahrscheinlich auch NIS2-relevant
                        </p>
                        <p className="text-caption text-blue-400/70 mt-0.5">
                          Products in Class I or Class II typically operate
                          within NIS2 Annex I critical infrastructure sectors.
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              {/* Reasoning Chain */}
              <div className="mb-6">
                <ReasoningChain steps={result.classificationReasoning} />
              </div>

              {/* Out of scope warning */}
              {result.isOutOfScope && result.outOfScopeReason && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={16}
                      className="text-amber-400 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-body font-medium text-amber-300 mb-1">
                        Potentially Out of Scope
                      </p>
                      <p className="text-caption text-amber-400/70">
                        {result.outOfScopeReason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dashboard/modules/cra"
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body-lg py-3.5 rounded-xl transition-colors"
                >
                  Vollständiges CRA-Assessment starten
                  <ArrowRight size={16} />
                </Link>
                <button
                  disabled
                  className="flex-1 flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.08] text-slate-500 font-medium text-body-lg py-3.5 rounded-xl cursor-not-allowed"
                  title="Coming soon"
                >
                  <FileText size={16} />
                  Ergebnis als PDF exportieren
                  <span className="text-[10px] uppercase tracking-wider bg-white/[0.06] px-1.5 py-0.5 rounded-full">
                    Soon
                  </span>
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Key Dates Section ─── */}
      <section className="px-6 md:px-12 pb-16">
        <div className="max-w-[800px] mx-auto">
          <KeyDatesTimeline />
        </div>
      </section>

      {/* ─── Footer CTA ─── */}
      <section className="px-6 md:px-12 pb-24 md:pb-32">
        <div className="max-w-[800px] mx-auto text-center">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 md:p-12">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-body-lg md:text-heading text-slate-300 mb-6 leading-relaxed max-w-xl mx-auto"
            >
              Caelex ist die einzige Compliance-Plattform mit Space-spezifischer
              CRA-Klassifizierung.
            </motion.p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body-lg px-8 py-3.5 rounded-xl transition-colors"
              >
                Demo anfragen
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/platform"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 font-medium text-body-lg px-6 py-3.5 transition-colors"
              >
                Learn more
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
