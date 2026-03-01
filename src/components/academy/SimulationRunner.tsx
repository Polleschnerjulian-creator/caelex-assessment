"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Globe,
  Users,
  Target,
  BarChart3,
} from "lucide-react";

// ─── Types ───

interface OperatorProfile {
  name: string;
  type: string;
  jurisdiction: string;
  employees: number;
  revenue: number;
  [key: string]: unknown;
}

interface DecisionOption {
  id: string;
  label: string;
  description?: string;
}

interface Decision {
  id: string;
  title: string;
  description?: string;
  options: DecisionOption[];
}

interface SimulationScenario {
  id?: string;
  title: string;
  description: string;
  operatorProfile: OperatorProfile;
  decisions: Decision[];
  passingScore: number;
  perfectScore: number;
}

interface FeedbackItem {
  category: string;
  correct: boolean;
  weight: number;
  earned: number;
  expected?: unknown;
  received?: unknown;
  note?: string;
}

interface SimulationResult {
  decisions: Record<string, string>;
  score: number;
  feedback?: FeedbackItem[];
  engineResult?: {
    spaceAct?: Record<string, unknown>;
    nis2?: Record<string, unknown>;
  };
}

interface SimulationRunnerProps {
  scenario: SimulationScenario;
  onComplete: (result: SimulationResult) => void;
}

// ─── Helpers ───

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000)
    return `EUR ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `EUR ${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `EUR ${(value / 1_000).toFixed(0)}K`;
  return `EUR ${value}`;
}

// ─── Component ───

export default function SimulationRunner({
  scenario,
  onComplete,
}: SimulationRunnerProps) {
  // step 0 = briefing, 1..N = decisions, N+1 = calculating, N+2 = results
  const [step, setStep] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalDecisions = scenario.decisions.length;
  const isOnDecision = step >= 1 && step <= totalDecisions;
  const currentDecision = isOnDecision ? scenario.decisions[step - 1] : null;

  const handleSelectOption = useCallback(
    (decisionId: string, optionId: string) => {
      setSelectedOptions((prev) => ({ ...prev, [decisionId]: optionId }));
    },
    [],
  );

  const handleStartSimulation = useCallback(() => {
    setStep(1);
  }, []);

  const handleNext = useCallback(() => {
    if (step < totalDecisions) {
      setStep((prev) => prev + 1);
    }
  }, [step, totalDecisions]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  }, [step]);

  const handleCalculate = useCallback(async () => {
    setIsCalculating(true);
    setError(null);

    try {
      const response = await fetch("/api/academy/simulations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id ?? scenario.title,
          decisions: selectedOptions,
          answers: selectedOptions,
          operatorProfile: scenario.operatorProfile,
          timeSpent: 0,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error ?? "Simulation execution failed");
      }

      const data = await response.json();

      const simulationResult: SimulationResult = {
        decisions: selectedOptions,
        score: data.score ?? 0,
        feedback: data.feedback ?? [],
        engineResult: data.engineResult,
      };

      setResult(simulationResult);
      setStep(totalDecisions + 2);
      onComplete(simulationResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsCalculating(false);
    }
  }, [scenario, selectedOptions, totalDecisions, onComplete]);

  const canAdvance =
    isOnDecision &&
    currentDecision &&
    selectedOptions[currentDecision.id] !== undefined;

  const allDecisionsMade = scenario.decisions.every(
    (d) => selectedOptions[d.id] !== undefined,
  );

  // ─── Step 0: Briefing ───

  if (step === 0) {
    return (
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Scenario Title */}
        <div className="mb-6">
          <span className="text-micro text-emerald-400/70 uppercase tracking-wider">
            Simulation Scenario
          </span>
          <h2 className="text-display-sm font-medium text-white mt-1">
            {scenario.title}
          </h2>
          <p className="text-body-lg text-white/55 mt-2 leading-relaxed">
            {scenario.description}
          </p>
        </div>

        {/* Operator Profile Card */}
        <div
          className="
            bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl
            p-6 mb-6
          "
        >
          <h3 className="text-subtitle font-medium text-white mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Operator Profile
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-small text-white/40 mb-0.5">Organization</p>
              <p className="text-body-lg text-white font-medium">
                {scenario.operatorProfile.name}
              </p>
            </div>
            <div>
              <p className="text-small text-white/40 mb-0.5">Type</p>
              <p className="text-body-lg text-white/80">
                {scenario.operatorProfile.type}
              </p>
            </div>
            <div>
              <p className="text-small text-white/40 mb-0.5 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Jurisdiction
              </p>
              <p className="text-body-lg text-white/80">
                {scenario.operatorProfile.jurisdiction}
              </p>
            </div>
            <div>
              <p className="text-small text-white/40 mb-0.5 flex items-center gap-1">
                <Users className="w-3 h-3" /> Employees
              </p>
              <p className="text-body-lg text-white/80">
                {scenario.operatorProfile.employees.toLocaleString()}
              </p>
            </div>
            {scenario.operatorProfile.revenue > 0 && (
              <div className="col-span-2">
                <p className="text-small text-white/40 mb-0.5">
                  Annual Revenue
                </p>
                <p className="text-body-lg text-white/80">
                  {formatCurrency(scenario.operatorProfile.revenue)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Scoring Info */}
        <div className="flex items-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-small text-white/40">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            Passing: {scenario.passingScore}%
          </div>
          <div className="flex items-center gap-2 text-small text-white/40">
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            Perfect: {scenario.perfectScore}%
          </div>
          <div className="flex items-center gap-2 text-small text-white/40">
            {totalDecisions} decisions to make
          </div>
        </div>

        <button
          onClick={handleStartSimulation}
          className="
            flex items-center gap-2 px-6 py-3 rounded-lg
            bg-emerald-500 hover:bg-emerald-600 text-white
            text-subtitle font-medium transition-all
          "
        >
          <Play className="w-4 h-4" />
          Begin Simulation
        </button>
      </motion.div>
    );
  }

  // ─── Results Screen ───

  if (result && step > totalDecisions) {
    const passed = result.score >= scenario.passingScore;
    const isPerfect = result.score >= scenario.perfectScore;

    return (
      <motion.div
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto"
      >
        {/* Score Header */}
        <div className="text-center mb-8">
          <div
            className={`
              w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center
              ${isPerfect ? "bg-amber-500/15 border border-amber-500/25" : passed ? "bg-emerald-500/15 border border-emerald-500/25" : "bg-red-500/15 border border-red-500/25"}
            `}
          >
            <span
              className={`text-display font-bold tabular-nums ${isPerfect ? "text-amber-400" : passed ? "text-emerald-400" : "text-red-400"}`}
            >
              {result.score}
            </span>
          </div>
          <h2 className="text-display-sm font-medium text-white mb-1">
            {isPerfect
              ? "Perfect Score!"
              : passed
                ? "Simulation Passed"
                : "Simulation Failed"}
          </h2>
          <p className="text-body-lg text-white/50">
            {isPerfect
              ? "Outstanding work. You demonstrated expert-level compliance knowledge."
              : passed
                ? "Good job. You demonstrated solid compliance understanding."
                : `You need ${scenario.passingScore}% to pass. Review the feedback below.`}
          </p>
        </div>

        {/* Feedback Breakdown */}
        {result.feedback && result.feedback.length > 0 && (
          <div className="space-y-3 mb-8">
            <h3 className="text-subtitle font-medium text-white mb-3">
              Score Breakdown
            </h3>
            {result.feedback.map((item, idx) => (
              <motion.div
                key={idx}
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`
                  flex items-center gap-3 p-4 rounded-xl border
                  ${item.correct ? "bg-emerald-500/5 border-emerald-500/15" : "bg-red-500/5 border-red-500/15"}
                `}
              >
                {item.correct ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-body-lg text-white font-medium">
                    {item.category}
                  </p>
                  {item.note && (
                    <p className="text-small text-white/40 mt-0.5">
                      {item.note}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className={`text-body-lg font-medium tabular-nums ${item.correct ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {item.earned}
                  </span>
                  <span className="text-small text-white/30">
                    /{item.weight}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // ─── Decision Steps ───

  if (isOnDecision && currentDecision) {
    const stepProgress = (step / (totalDecisions + 1)) * 100;
    const isLastDecision = step === totalDecisions;

    return (
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-small text-white/45">
              Decision {step} of {totalDecisions}
            </span>
            <span className="text-small text-emerald-400 tabular-nums">
              {Math.round(stepProgress)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={false}
              animate={{ width: `${stepProgress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* Decision Title */}
            <h3 className="text-heading font-medium text-white mb-2">
              {currentDecision.title}
            </h3>
            {currentDecision.description && (
              <p className="text-body-lg text-white/55 mb-6 leading-relaxed">
                {currentDecision.description}
              </p>
            )}

            {/* Decision Options */}
            <div className="space-y-3">
              {currentDecision.options.map((option) => {
                const isSelected =
                  selectedOptions[currentDecision.id] === option.id;

                return (
                  <motion.button
                    key={option.id}
                    onClick={() =>
                      handleSelectOption(currentDecision.id, option.id)
                    }
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`
                      w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer
                      ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20"
                          : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20"
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`
                          w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors
                          ${isSelected ? "border-emerald-500 bg-emerald-500" : "border-white/20"}
                        `}
                      >
                        {isSelected && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-body-lg font-medium ${isSelected ? "text-white" : "text-white/70"}`}
                        >
                          {option.label}
                        </p>
                        {option.description && (
                          <p className="text-body text-white/40 mt-1">
                            {option.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-body text-red-300">{error}</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={handleBack}
                disabled={step <= 1}
                className={`
                  flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-body-lg transition-all
                  ${
                    step <= 1
                      ? "text-white/20 cursor-not-allowed"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              {isLastDecision && allDecisionsMade ? (
                <button
                  onClick={handleCalculate}
                  disabled={isCalculating}
                  className="
                    flex items-center gap-2 px-6 py-2.5 rounded-lg text-subtitle font-medium
                    bg-emerald-500 hover:bg-emerald-600 text-white transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {isCalculating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Calculating Compliance...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4" />
                      Calculate Compliance
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canAdvance}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-lg text-subtitle font-medium transition-all
                    ${
                      canAdvance
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : "bg-white/5 text-white/25 cursor-not-allowed"
                    }
                  `}
                >
                  Next Decision
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ─── Calculating State (fallback) ───

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
      <p className="text-body-lg text-white/50">Processing simulation...</p>
    </div>
  );
}
