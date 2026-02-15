"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home, Check } from "lucide-react";
import Link from "next/link";
import {
  AssessmentState,
  AssessmentAnswers,
  ComplianceResult,
} from "@/lib/types";
import {
  QUESTIONS,
  getCurrentQuestion,
  getTotalQuestions,
} from "@/lib/questions";
import ProgressBar from "./ProgressBar";
import QuestionStep from "./QuestionStep";
import OutOfScopeResult from "./OutOfScopeResult";
import ResultsDashboard from "@/components/results/ResultsDashboard";
import DisclaimerBanner from "@/components/ui/disclaimer-banner";
import { csrfHeaders } from "@/lib/csrf-client";
import { analytics } from "@/lib/analytics";

const initialAnswers: AssessmentAnswers = {
  activityType: null,
  isDefenseOnly: null,
  hasPostLaunchAssets: null,
  establishment: null,
  entitySize: null,
  operatesConstellation: null,
  constellationSize: null,
  primaryOrbit: null,
  offersEUServices: null,
};

export default function AssessmentWizard() {
  const [state, setState] = useState<AssessmentState>({
    currentStep: 1,
    answers: initialAnswers,
    isComplete: false,
    isOutOfScope: false,
    outOfScopeReason: null,
  });

  const [direction, setDirection] = useState(0);
  const [complianceResult, setComplianceResult] =
    useState<ComplianceResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Track when the assessment started (for anti-bot timing)
  const startedAtRef = useRef<number>(Date.now());

  const currentQuestion = getCurrentQuestion(state.answers, state.currentStep);
  const totalSteps = getTotalQuestions(state.answers);

  // When assessment is complete, call the server API
  useEffect(() => {
    if (!state.isComplete || complianceResult) return;

    const calculateOnServer = async () => {
      setIsCalculating(true);
      setCalculationError(null);

      try {
        const response = await fetch("/api/assessment/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            answers: state.answers,
            startedAt: startedAtRef.current,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const data = await response.json();
        setComplianceResult(data.result);

        // Track assessment completion
        analytics.feature("eu_space_act", "assessment_completed", {
          category: "conversion",
        });

        // Store in localStorage for dashboard import
        try {
          localStorage.setItem(
            "caelex-pending-assessment",
            JSON.stringify({
              operatorType: data.result.operatorType,
              regime: data.result.regime,
              entitySize: data.result.entitySize,
              constellationTier: data.result.constellationTier,
              orbit: data.result.orbit,
              isEU: data.result.isEU,
              isThirdCountry: data.result.isThirdCountry,
              applicableArticles: data.result.applicableArticles.map(
                (a: { number: number | string }) => a.number,
              ),
              moduleStatuses: data.result.moduleStatuses,
              completedAt: new Date().toISOString(),
            }),
          );
        } catch {
          // localStorage may be unavailable
        }
      } catch (error) {
        console.error("Assessment calculation error:", error);
        setCalculationError(
          error instanceof Error
            ? error.message
            : "Failed to calculate compliance. Please try again.",
        );
      } finally {
        setIsCalculating(false);
      }
    };

    calculateOnServer();
  }, [state.isComplete, state.answers, complianceResult]);

  const handleSelect = useCallback(
    (value: string | boolean | number) => {
      if (!currentQuestion) return;

      const newAnswers = {
        ...state.answers,
        [currentQuestion.id]: value,
      };

      if (
        currentQuestion.outOfScopeValue !== undefined &&
        value === currentQuestion.outOfScopeValue
      ) {
        setState((prev) => ({
          ...prev,
          answers: newAnswers,
          isOutOfScope: true,
          outOfScopeReason: currentQuestion.outOfScopeMessage || "Out of scope",
        }));
        return;
      }

      const nextQuestion = getCurrentQuestion(
        newAnswers,
        state.currentStep + 1,
      );
      const isLastQuestion =
        !nextQuestion || state.currentStep >= QUESTIONS.length;

      setDirection(1);
      setState((prev) => ({
        ...prev,
        answers: newAnswers,
        currentStep: isLastQuestion ? prev.currentStep : prev.currentStep + 1,
        isComplete: isLastQuestion,
      }));
    },
    [currentQuestion, state.answers, state.currentStep],
  );

  const handleBack = useCallback(() => {
    if (state.currentStep > 1) {
      setDirection(-1);

      let prevStep = state.currentStep - 1;
      let prevQuestion = getCurrentQuestion(state.answers, prevStep);

      while (prevStep > 0 && !prevQuestion) {
        prevStep--;
        prevQuestion = getCurrentQuestion(state.answers, prevStep);
      }

      setState((prev) => ({
        ...prev,
        currentStep: prevStep,
        isOutOfScope: false,
        outOfScopeReason: null,
      }));
    }
  }, [state.currentStep, state.answers]);

  const handleRestart = useCallback(() => {
    setDirection(-1);
    setComplianceResult(null);
    setCalculationError(null);
    startedAtRef.current = Date.now();
    setState({
      currentStep: 1,
      answers: initialAnswers,
      isComplete: false,
      isOutOfScope: false,
      outOfScopeReason: null,
    });
  }, []);

  // Calculating state (server API call in progress)
  if (isCalculating) {
    return (
      <div
        className="landing-page min-h-screen bg-black text-white flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="text-[13px] text-white/60">
            Calculating your compliance profile...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (calculationError) {
    return (
      <div className="landing-page min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-[14px] mb-6" role="alert">
            {calculationError}
          </p>
          <button
            onClick={handleRestart}
            className="px-6 py-3 rounded-full bg-white/[0.06] border border-white/[0.10] text-[13px] text-white/70 hover:bg-white/[0.10] hover:text-white transition-all duration-300"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // Results view
  if (complianceResult) {
    return (
      <div className="landing-page min-h-screen bg-black text-white">
        <ResultsDashboard result={complianceResult} onRestart={handleRestart} />
      </div>
    );
  }

  // Out of scope view
  if (state.isOutOfScope && currentQuestion) {
    return (
      <div className="landing-page min-h-screen bg-black text-white py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <Link
              href="/"
              className="flex items-center gap-2 text-[13px] text-white/50 hover:text-emerald-400 transition-colors"
            >
              <Home size={14} />
              <span>Home</span>
            </Link>
            <span className="text-[11px] font-medium text-emerald-400/60 uppercase tracking-[0.2em]">
              EU Space Act Assessment
            </span>
          </div>

          <OutOfScopeResult
            message={state.outOfScopeReason || "Out of scope"}
            detail={currentQuestion.outOfScopeDetail || ""}
            onRestart={handleRestart}
          />
        </div>
      </div>
    );
  }

  // Assessment wizard view
  return (
    <div className="landing-page min-h-screen bg-black text-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <AnimatePresence mode="wait">
            {state.currentStep > 1 ? (
              <motion.button
                key="back"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={handleBack}
                className="flex items-center gap-2 text-[13px] text-white/50 hover:text-emerald-400 transition-colors"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                <span>Back</span>
              </motion.button>
            ) : (
              <motion.div
                key="home"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <Link
                  href="/"
                  className="flex items-center gap-2 text-[13px] text-white/50 hover:text-emerald-400 transition-colors"
                >
                  <Home size={14} aria-hidden="true" />
                  <span>Home</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <span className="text-[11px] font-medium text-emerald-400/60 uppercase tracking-[0.2em]">
            EU Space Act Assessment
          </span>
        </div>

        {/* Legal disclaimer on first step */}
        {state.currentStep === 1 && (
          <div className="mb-6">
            <DisclaimerBanner variant="banner" />
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-16">
          <ProgressBar
            currentStep={state.currentStep}
            totalSteps={totalSteps}
          />
        </div>

        {/* Question */}
        {currentQuestion && (
          <QuestionStep
            question={currentQuestion}
            questionNumber={state.currentStep}
            selectedValue={
              state.answers[currentQuestion.id as keyof AssessmentAnswers] as
                | string
                | boolean
                | number
                | null
            }
            onSelect={handleSelect}
            direction={direction}
          />
        )}

        {/* Light regime indicator */}
        <AnimatePresence>
          {(state.answers.entitySize === "small" ||
            state.answers.entitySize === "research") &&
            state.currentStep > 5 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-10 max-w-2xl mx-auto"
              >
                <div
                  className="rounded-xl bg-emerald-500/[0.08] backdrop-blur-[10px] border border-emerald-500/20 p-5"
                  style={{
                    boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check
                        size={14}
                        className="text-emerald-400"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <p className="text-[14px] text-emerald-400 font-medium">
                        You may qualify for the simplified Light Regime
                      </p>
                      <p className="text-[13px] text-white/50 mt-1">
                        Reduced obligations for resilience and a delayed EFD
                        deadline (2032)
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}
