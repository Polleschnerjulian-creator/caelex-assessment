"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  AlertCircle,
  PlayCircle,
  CheckCircle,
  RotateCcw,
  User,
  Target,
  BarChart3,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface DecisionOption {
  id: string;
  label: string;
  description: string;
}

interface DecisionStep {
  id: string;
  title: string;
  context: string;
  options: DecisionOption[];
}

interface ScenarioDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  operatorProfile: {
    type: string;
    name: string;
    description: string;
  };
  steps: DecisionStep[];
}

interface SimulationResult {
  overallScore: number;
  feedback: string;
  moduleBreakdown: Array<{
    module: string;
    score: number;
    feedback: string;
  }>;
  decisionFeedback: Array<{
    stepId: string;
    selectedOption: string;
    isOptimal: boolean;
    explanation: string;
  }>;
}

type Phase = "intro" | "deciding" | "calculating" | "results";

// ─── Main Page ───

export default function SimulationRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.scenarioId as string;

  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentStep, setCurrentStep] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    fetch(`/api/academy/simulations/${encodeURIComponent(scenarioId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load scenario");
        return r.json();
      })
      .then((data) => setScenario(data.scenario ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [scenarioId]);

  const handleSelectOption = (stepId: string, optionId: string) => {
    setDecisions((prev) => ({ ...prev, [stepId]: optionId }));
  };

  const handleCalculate = async () => {
    if (!scenario) return;
    setPhase("calculating");

    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await fetch("/api/academy/simulations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          decisions,
          timeSpent,
        }),
      });
      if (!res.ok) throw new Error("Calculation failed");
      const data = await res.json();
      setResult(data.result ?? data);
      setPhase("results");
    } catch (e) {
      console.error("Simulation error:", e);
      setError("Failed to calculate results. Please try again.");
      setPhase("deciding");
    }
  };

  const handleReset = () => {
    setPhase("intro");
    setCurrentStep(0);
    setDecisions({});
    setResult(null);
    startTimeRef.current = Date.now();
  };

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-body-lg text-white/70">
          {error ?? "Scenario not found"}
        </p>
        <Link
          href="/academy/simulations"
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-body px-5 py-2 rounded-lg transition-all"
        >
          Back to Simulations
        </Link>
      </div>
    );
  }

  const steps = scenario.steps ?? [];
  const step = steps[currentStep];
  const allDecisionsMade =
    steps.length > 0 && steps.every((s) => decisions[s.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-small text-white/40">
        <Link
          href="/academy/simulations"
          className="hover:text-white/60 transition-colors"
        >
          Simulations
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white/60">{scenario.title}</span>
      </div>

      {/* Intro Phase */}
      {phase === "intro" && (
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
          <GlassCard hover={false} className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Cpu className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-display-sm font-semibold text-white">
                  {scenario.title}
                </h1>
                <p className="text-body text-white/45">
                  {scenario.category.replace(/_/g, " ")}
                </p>
              </div>
            </div>

            <p className="text-body-lg text-white/60 mb-6 leading-relaxed">
              {scenario.description}
            </p>

            {/* Operator Profile */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-emerald-400" />
                <span className="text-small font-medium text-white/70">
                  Your Operator Profile
                </span>
              </div>
              <h3 className="text-title font-medium text-white mb-1">
                {scenario.operatorProfile.name} ({scenario.operatorProfile.type}
                )
              </h3>
              <p className="text-body text-white/45">
                {scenario.operatorProfile.description}
              </p>
            </div>

            <div className="flex items-center gap-6 mb-6 text-small text-white/40">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Estimated {scenario.estimatedMinutes} minutes
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                {steps.length} decisions to make
              </div>
            </div>

            <button
              onClick={() => {
                setPhase("deciding");
                startTimeRef.current = Date.now();
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-subtitle px-8 py-3 rounded-xl transition-all flex items-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Start Simulation
            </button>
          </GlassCard>
        </motion.div>
      )}

      {/* Decision Phase */}
      {phase === "deciding" && step && (
        <motion.div
          key={step.id}
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {/* Progress */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-small text-white/45">
              Step {currentStep + 1} of {steps.length}
            </span>
            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <GlassCard hover={false} className="p-6">
            <h2 className="text-heading font-medium text-white mb-3">
              {step.title}
            </h2>
            <p className="text-body-lg text-white/60 mb-6 leading-relaxed">
              {step.context}
            </p>

            <div className="space-y-3">
              {step.options.map((option) => {
                const isSelected = decisions[step.id] === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(step.id, option.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <p className="text-body-lg font-medium mb-1">
                      {option.label}
                    </p>
                    <p className="text-body text-white/45">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="flex items-center gap-2 text-body text-white/45 hover:text-white/70 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {currentStep < steps.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!decisions[step.id]}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCalculate}
                  disabled={!allDecisionsMade}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-6 py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  <BarChart3 className="w-4 h-4" />
                  Calculate Compliance
                </button>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Calculating Phase */}
      {phase === "calculating" && (
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          className="py-20 text-center"
        >
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-body-lg text-white/70">
            Running compliance calculation...
          </p>
          <p className="text-body text-white/40 mt-1">
            Analyzing your decisions against the regulatory framework
          </p>
        </motion.div>
      )}

      {/* Results Phase */}
      {phase === "results" && result && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Score Card */}
          <GlassCard hover={false} className="p-8 text-center">
            <div
              className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center border-2 ${
                result.overallScore >= 80
                  ? "bg-emerald-500/20 border-emerald-500/30"
                  : result.overallScore >= 60
                    ? "bg-amber-500/20 border-amber-500/30"
                    : "bg-red-500/20 border-red-500/30"
              }`}
            >
              <span
                className={`text-display font-bold ${
                  result.overallScore >= 80
                    ? "text-emerald-400"
                    : result.overallScore >= 60
                      ? "text-amber-400"
                      : "text-red-400"
                }`}
              >
                {result.overallScore}
              </span>
            </div>
            <h2 className="text-heading font-medium text-white mb-2">
              Compliance Score
            </h2>
            <p className="text-body text-white/45 max-w-lg mx-auto">
              {result.feedback}
            </p>
          </GlassCard>

          {/* Module Breakdown */}
          {result.moduleBreakdown && result.moduleBreakdown.length > 0 && (
            <div>
              <h3 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
                Module Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.moduleBreakdown.map((mod, i) => (
                  <GlassCard key={i} hover={false} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-body-lg font-medium text-white">
                        {mod.module}
                      </h4>
                      <span
                        className={`text-body font-semibold ${
                          mod.score >= 80
                            ? "text-emerald-400"
                            : mod.score >= 60
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        {mod.score}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all ${
                          mod.score >= 80
                            ? "bg-emerald-500"
                            : mod.score >= 60
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${mod.score}%` }}
                      />
                    </div>
                    <p className="text-small text-white/45">{mod.feedback}</p>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {/* Decision Feedback */}
          {result.decisionFeedback && result.decisionFeedback.length > 0 && (
            <div>
              <h3 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
                Decision Feedback
              </h3>
              <div className="space-y-3">
                {result.decisionFeedback.map((df, i) => (
                  <GlassCard key={i} hover={false} className="p-5">
                    <div className="flex items-start gap-3">
                      {df.isOptimal ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-body font-medium text-white mb-1">
                          Step {i + 1}: {df.selectedOption}
                        </p>
                        <p className="text-small text-white/45">
                          {df.explanation}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 bg-white/5 border border-white/10 text-white/70 font-medium text-body px-6 py-3 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              href="/academy/simulations"
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-6 py-3 rounded-xl transition-all"
            >
              Back to Simulations
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
