"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import {
  NIS2_QUESTIONS,
  getCurrentNIS2Question,
  getTotalNIS2Questions,
  getDefaultNIS2Answers,
} from "@/lib/nis2-questions";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";
import ProgressBar from "./ProgressBar";
import QuestionStep from "./QuestionStep";
import OutOfScopeResult from "./OutOfScopeResult";
import NIS2ResultsDashboard from "@/components/nis2/NIS2ResultsDashboard";
import DisclaimerBanner from "@/components/ui/disclaimer-banner";
import { csrfHeaders } from "@/lib/csrf-client";

interface NIS2AssessmentState {
  currentStep: number;
  answers: NIS2AssessmentAnswers;
  isComplete: boolean;
  isOutOfScope: boolean;
  outOfScopeReason: string | null;
  outOfScopeDetail: string | null;
}

export default function NIS2AssessmentWizard() {
  const [state, setState] = useState<NIS2AssessmentState>({
    currentStep: 1,
    answers: getDefaultNIS2Answers(),
    isComplete: false,
    isOutOfScope: false,
    outOfScopeReason: null,
    outOfScopeDetail: null,
  });

  const [direction, setDirection] = useState(0);
  const [complianceResult, setComplianceResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Track when the assessment started (for anti-bot timing)
  const startedAtRef = useRef<number>(Date.now());

  const currentQuestion = getCurrentNIS2Question(
    state.answers,
    state.currentStep,
  );
  const totalSteps = getTotalNIS2Questions(state.answers);

  // When assessment is complete, call the server API
  useEffect(() => {
    if (!state.isComplete || complianceResult) return;

    const calculateOnServer = async () => {
      setIsCalculating(true);
      setCalculationError(null);

      try {
        const response = await fetch("/api/nis2/calculate", {
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

        // Store in localStorage for dashboard import
        try {
          localStorage.setItem(
            "caelex-pending-nis2-assessment",
            JSON.stringify({
              entityClassification: data.result.entityClassification,
              sector: data.result.sector,
              subSector: data.result.subSector,
              organizationSize: data.result.organizationSize,
              applicableCount: data.result.applicableCount,
              completedAt: new Date().toISOString(),
            }),
          );
        } catch {
          // localStorage may be unavailable
        }
      } catch (error) {
        console.error("NIS2 assessment calculation error:", error);
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

      // Check for out-of-scope
      if (
        currentQuestion.outOfScopeValue !== undefined &&
        value === currentQuestion.outOfScopeValue
      ) {
        setState((prev) => ({
          ...prev,
          answers: newAnswers as NIS2AssessmentAnswers,
          isOutOfScope: true,
          outOfScopeReason: currentQuestion.outOfScopeMessage || "Out of scope",
          outOfScopeDetail: currentQuestion.outOfScopeDetail || "",
        }));
        return;
      }

      const nextQuestion = getCurrentNIS2Question(
        newAnswers as NIS2AssessmentAnswers,
        state.currentStep + 1,
      );
      const isLastQuestion =
        !nextQuestion || state.currentStep >= NIS2_QUESTIONS.length;

      setDirection(1);
      setState((prev) => ({
        ...prev,
        answers: newAnswers as NIS2AssessmentAnswers,
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
      let prevQuestion = getCurrentNIS2Question(state.answers, prevStep);

      while (prevStep > 0 && !prevQuestion) {
        prevStep--;
        prevQuestion = getCurrentNIS2Question(state.answers, prevStep);
      }

      setState((prev) => ({
        ...prev,
        currentStep: prevStep,
        isOutOfScope: false,
        outOfScopeReason: null,
        outOfScopeDetail: null,
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
      answers: getDefaultNIS2Answers(),
      isComplete: false,
      isOutOfScope: false,
      outOfScopeReason: null,
      outOfScopeDetail: null,
    });
  }, []);

  // Calculating state
  if (isCalculating) {
    return (
      <div className="landing-page min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] text-white/60">
            Calculating your NIS2 compliance profile...
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
          <p className="text-red-400 text-[14px] mb-6">{calculationError}</p>
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
    // The API returns a redacted NIS2 compliance result
    const typedResult = complianceResult as Parameters<
      typeof NIS2ResultsDashboard
    >[0]["result"];
    return (
      <div className="landing-page min-h-screen bg-black text-white">
        <NIS2ResultsDashboard result={typedResult} onRestart={handleRestart} />
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
              href="/assessment"
              className="flex items-center gap-2 text-[13px] text-white/50 hover:text-emerald-400 transition-colors"
            >
              <Home size={14} />
              <span>Assessments</span>
            </Link>
            <span className="text-[11px] font-medium text-emerald-400/60 uppercase tracking-[0.2em]">
              NIS2 Directive Assessment
            </span>
          </div>

          <OutOfScopeResult
            message={state.outOfScopeReason || "Out of scope"}
            detail={state.outOfScopeDetail || ""}
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
                <ArrowLeft size={14} />
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
                  href="/assessment"
                  className="flex items-center gap-2 text-[13px] text-white/50 hover:text-emerald-400 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>All assessments</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <span className="text-[11px] font-medium text-emerald-400/60 uppercase tracking-[0.2em]">
            NIS2 Directive Assessment
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
              state.answers[
                currentQuestion.id as keyof NIS2AssessmentAnswers
              ] as string | boolean | number | null
            }
            onSelect={handleSelect}
            direction={direction}
          />
        )}
      </div>
    </div>
  );
}
