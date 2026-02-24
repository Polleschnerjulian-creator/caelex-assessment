"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  FileText,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Shield,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface OnboardingData {
  companyName: string;
  stage: string;
  operatorType: string;
  oneLiner: string;
  problem: string;
  solution: string;
  isRaising: boolean;
  targetRaise: string;
  roundType: string;
}

// ─── Constants ───

const STAGES = [
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Growth",
  "Pre-Revenue",
  "Revenue",
];

const OPERATOR_TYPES = [
  { value: "SCO", label: "Satellite Constellation Operator" },
  { value: "LO", label: "Launch Operator" },
  { value: "LSO", label: "Launch Service Operator" },
  { value: "ISOS", label: "In-Space Operations & Services" },
  { value: "PDP", label: "Payload / Data Provider" },
  { value: "TCO", label: "Telecommunications Operator" },
  { value: "CAP", label: "Capacity Provider" },
  { value: "OTHER", label: "Other Space Company" },
];

const ROUND_TYPES = [
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Bridge",
  "Convertible Note",
  "SAFE",
  "Grant",
  "Other",
];

// ─── Steps Config ───

const STEPS = [
  { icon: Building2, label: "Company Basics" },
  { icon: FileText, label: "Pitch" },
  { icon: DollarSign, label: "Fundraise" },
];

// ─── Component ───

export default function AssureOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    companyName: "",
    stage: "",
    operatorType: "",
    oneLiner: "",
    problem: "",
    solution: "",
    isRaising: false,
    targetRaise: "",
    roundType: "",
  });

  const updateField = (
    field: keyof OnboardingData,
    value: string | boolean,
  ) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return data.companyName.trim() && data.stage && data.operatorType;
      case 1:
        return data.oneLiner.trim();
      case 2:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/assure/profile/overview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          companyName: data.companyName,
          stage: data.stage,
          operatorType: data.operatorType,
          oneLiner: data.oneLiner,
          problem: data.problem,
          solution: data.solution,
          isRaising: data.isRaising,
          targetRaise: data.targetRaise ? Number(data.targetRaise) : null,
          roundType: data.roundType || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create profile");
      }

      router.push("/assure/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const inputClasses =
    "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all";

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-emerald-400" />
          </div>
          <h1 className="text-display font-bold text-white mb-2">
            Set Up Assure
          </h1>
          <p className="text-body-lg text-white/40">
            Tell us about your company to get started.
          </p>
        </motion.div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isComplete = i < step;

            return (
              <div key={i} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isComplete
                      ? "bg-emerald-500"
                      : isActive
                        ? "bg-emerald-500/20 border border-emerald-500/30"
                        : "bg-white/5 border border-white/10"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle size={14} className="text-white" />
                  ) : (
                    <Icon
                      size={14}
                      className={
                        isActive ? "text-emerald-400" : "text-white/30"
                      }
                    />
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
                      isComplete ? "bg-emerald-500" : "bg-white/10"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <GlassCard hover={false} className="p-8">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-heading font-semibold text-white mb-1">
                    Company Basics
                  </h2>
                  <p className="text-small text-white/40">
                    Start with the essentials about your company.
                  </p>
                </div>

                <div>
                  <label className="block text-body font-medium text-white/60 mb-1.5">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    placeholder="e.g., Orbital Dynamics"
                    className={inputClasses}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-body font-medium text-white/60 mb-1.5">
                    Company Stage <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={data.stage}
                    onChange={(e) => updateField("stage", e.target.value)}
                    className={inputClasses}
                  >
                    <option value="">Select stage...</option>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-body font-medium text-white/60 mb-1.5">
                    Operator Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={data.operatorType}
                    onChange={(e) =>
                      updateField("operatorType", e.target.value)
                    }
                    className={inputClasses}
                  >
                    <option value="">Select type...</option>
                    {OPERATOR_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-heading font-semibold text-white mb-1">
                    Your Pitch
                  </h2>
                  <p className="text-small text-white/40">
                    Describe your company in investor terms.
                  </p>
                </div>

                <div>
                  <label className="block text-body font-medium text-white/60 mb-1.5">
                    One-Liner <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.oneLiner}
                    onChange={(e) => updateField("oneLiner", e.target.value)}
                    placeholder="e.g., We build next-gen orbital debris removal systems"
                    className={inputClasses}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-body font-medium text-white/60 mb-1.5">
                    Problem Statement
                  </label>
                  <textarea
                    value={data.problem}
                    onChange={(e) => updateField("problem", e.target.value)}
                    placeholder="What problem does your company solve?"
                    rows={3}
                    className={`${inputClasses} resize-none`}
                  />
                </div>

                <div>
                  <label className="block text-body font-medium text-white/60 mb-1.5">
                    Solution
                  </label>
                  <textarea
                    value={data.solution}
                    onChange={(e) => updateField("solution", e.target.value)}
                    placeholder="How does your product or service solve it?"
                    rows={3}
                    className={`${inputClasses} resize-none`}
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-heading font-semibold text-white mb-1">
                    Fundraising Status
                  </h2>
                  <p className="text-small text-white/40">
                    Tell us about your current raise.
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/[0.03] transition-colors">
                    <input
                      type="checkbox"
                      checked={data.isRaising}
                      onChange={(e) =>
                        updateField("isRaising", e.target.checked)
                      }
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30"
                    />
                    <span className="text-body-lg text-white/70">
                      Currently raising or planning to raise
                    </span>
                  </label>
                </div>

                {data.isRaising && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-5"
                  >
                    <div>
                      <label className="block text-body font-medium text-white/60 mb-1.5">
                        Target Raise Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                          $
                        </span>
                        <input
                          type="number"
                          value={data.targetRaise}
                          onChange={(e) =>
                            updateField("targetRaise", e.target.value)
                          }
                          placeholder="e.g., 5000000"
                          className={`${inputClasses} pl-8`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-body font-medium text-white/60 mb-1.5">
                        Round Type
                      </label>
                      <select
                        value={data.roundType}
                        onChange={(e) =>
                          updateField("roundType", e.target.value)
                        }
                        className={inputClasses}
                      >
                        <option value="">Select round type...</option>
                        {ROUND_TYPES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-small text-red-400 mt-4"
            >
              {error}
            </motion.p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="flex items-center gap-2 text-body text-white/40 hover:text-white/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div className="flex items-center gap-2">
              <span className="text-micro text-white/25">
                Step {step + 1} of 3
              </span>
            </div>

            <button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-6 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : step === 2 ? (
                <>
                  Complete Setup
                  <CheckCircle size={16} />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
