"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  Shield,
  Target,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import {
  calculateIRSPreview,
  type IRSPreviewInput,
  type IRSPreviewResult,
} from "@/lib/assure/irs-preview-calculator";

import LiveScoreWidget from "./LiveScoreWidget";
import AstraCoPilot from "./AstraCoPilot";
import ScoreReveal from "./ScoreReveal";
import CompanyIdentityStep from "./steps/CompanyIdentityStep";
import MarketTechStep from "./steps/MarketTechStep";
import TeamStep from "./steps/TeamStep";
import FinancialsStep from "./steps/FinancialsStep";
import ComplyIntegrationStep from "./steps/ComplyIntegrationStep";
import FundraisingStep from "./steps/FundraisingStep";

// ─── Types ───

// Extended input to support additional UI-only fields not in IRSPreviewInput
interface WizardData extends IRSPreviewInput {
  foundedYear?: number;
  headquarters?: string;
  revenueModel?: string;
  currentlyRaising?: boolean;
  timelineToClose?: string;
}

// ─── Constants ───

const STEPS = [
  { label: "Company Identity", icon: Building2 },
  { label: "Market & Tech", icon: TrendingUp },
  { label: "Team", icon: Users },
  { label: "Financials", icon: DollarSign },
  { label: "Comply Link", icon: Shield },
  { label: "Fundraising", icon: Target },
];

const INITIAL_SCORE: IRSPreviewResult = {
  overallScore: 0,
  grade: "C-",
  gradeLabel: "Getting Started",
  components: [],
  delta: 0,
};

// ─── Component ───

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({});
  const [currentField, setCurrentField] = useState<string | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scoreResult, setScoreResult] =
    useState<IRSPreviewResult>(INITIAL_SCORE);

  // Load pre-fill data on mount
  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await fetch("/api/assure/onboarding/progress");
        if (res.ok) {
          const json = await res.json();
          const preFill = json.preFill;
          const currentStep = json.currentStep || 0;

          setStep(currentStep);

          if (preFill) {
            setData((prev) => ({
              ...prev,
              companyName: preFill.company || prev.companyName,
              stage: preFill.fundingStage || prev.stage,
              operatorType: preFill.operatorType || prev.operatorType,
              currentlyRaising: preFill.isRaising ?? prev.currentlyRaising,
              targetRaise: preFill.targetRaise || prev.targetRaise,
            }));
          }
        }
      } catch {
        // Silently fail — user can fill in manually
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, []);

  // Recalculate score when data changes
  useEffect(() => {
    const result = calculateIRSPreview(data);
    setScoreResult(result);
  }, [data]);

  // Handle field change
  const handleFieldChange = useCallback(
    (field: string, value: string | number | boolean) => {
      setData((prev) => ({
        ...prev,
        [field]: value === "" ? undefined : value,
      }));
      setCurrentField(field);
    },
    [],
  );

  // Handle next step
  const handleNext = async () => {
    if (step < 5) {
      setSaving(true);
      try {
        await fetch("/api/assure/onboarding/progress", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...csrfHeaders(),
          },
          body: JSON.stringify({ step: step + 1 }),
        });
      } catch {
        // Continue anyway — progress saving is best-effort
      } finally {
        setSaving(false);
      }
      setStep(step + 1);
      setCurrentField(null);
    } else {
      // Final step — show score reveal
      setSaving(true);
      try {
        await fetch("/api/assure/onboarding/progress", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...csrfHeaders(),
          },
          body: JSON.stringify({ step: 6 }),
        });
      } catch {
        // Continue anyway
      } finally {
        setSaving(false);
      }
      setShowReveal(true);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setCurrentField(null);
    }
  };

  const handleRevealComplete = () => {
    router.push("/assure/dashboard");
  };

  // Memoize field vars for AstraCoPilot
  const fieldVars = useMemo(() => data as Record<string, unknown>, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-navy-950 flex">
        {/* Left: Step sidebar */}
        <div className="w-[220px] border-r border-white/10 p-6 hidden lg:flex flex-col">
          <div className="mb-8">
            <h2 className="text-body font-semibold text-white/80">
              Setup Wizard
            </h2>
            <p className="text-micro text-white/30 mt-1">
              Step {step + 1} of {STEPS.length}
            </p>
          </div>

          <nav className="space-y-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isComplete = i < step;

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (i <= step) {
                      setStep(i);
                      setCurrentField(null);
                    }
                  }}
                  disabled={i > step}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-small ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400"
                      : isComplete
                        ? "text-emerald-500 hover:bg-white/[0.03]"
                        : "text-white/30 cursor-not-allowed"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Icon className="w-4 h-4 flex-shrink-0" />
                  )}
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Center: Form content */}
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <div className="max-w-[640px] mx-auto">
            {/* Mobile step indicator */}
            <div className="lg:hidden mb-6">
              <div className="flex items-center gap-2">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      i <= step ? "bg-emerald-500" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <p className="text-micro text-white/30 mt-2">
                Step {step + 1} of {STEPS.length} &mdash; {STEPS[step].label}
              </p>
            </div>

            {/* Step content with transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`step-${step}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {step === 0 && (
                  <CompanyIdentityStep
                    data={data}
                    onChange={handleFieldChange}
                  />
                )}
                {step === 1 && (
                  <MarketTechStep data={data} onChange={handleFieldChange} />
                )}
                {step === 2 && (
                  <TeamStep data={data} onChange={handleFieldChange} />
                )}
                {step === 3 && (
                  <FinancialsStep data={data} onChange={handleFieldChange} />
                )}
                {step === 4 && (
                  <ComplyIntegrationStep
                    data={data}
                    onChange={handleFieldChange}
                  />
                )}
                {step === 5 && (
                  <FundraisingStep data={data} onChange={handleFieldChange} />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/5">
              {step > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-body text-white/40 hover:text-white/60 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={handleNext}
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body rounded-lg px-6 py-2.5 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : step === 5 ? (
                  <>
                    Complete Setup
                    <CheckCircle className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Score + ASTRA */}
        <div className="w-[320px] border-l border-white/10 p-6 hidden xl:flex flex-col gap-6 sticky top-0 h-screen overflow-y-auto">
          <LiveScoreWidget score={scoreResult} />
          <AstraCoPilot
            step={step + 1}
            field={currentField}
            fieldVars={fieldVars}
          />
        </div>
      </div>

      {/* Score Reveal Overlay */}
      {showReveal && (
        <ScoreReveal score={scoreResult} onComplete={handleRevealComplete} />
      )}
    </>
  );
}
