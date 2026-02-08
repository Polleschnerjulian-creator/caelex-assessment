"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import {
  SPACE_LAW_QUESTIONS,
  getCurrentSpaceLawQuestion,
  getTotalSpaceLawQuestions,
  getDefaultSpaceLawAnswers,
} from "@/lib/space-law-questions";
import type {
  SpaceLawAssessmentAnswers,
  RedactedSpaceLawResult,
} from "@/lib/space-law-types";
import ProgressBar from "./ProgressBar";
import QuestionStep from "./QuestionStep";
import MultiSelectQuestionStep from "./MultiSelectQuestionStep";
import SpaceLawResultsDashboard from "@/components/space-law/SpaceLawResultsDashboard";
import DisclaimerBanner from "@/components/ui/disclaimer-banner";

interface SpaceLawAssessmentState {
  currentStep: number;
  answers: SpaceLawAssessmentAnswers;
  isComplete: boolean;
}

export default function SpaceLawAssessmentWizard() {
  const [state, setState] = useState<SpaceLawAssessmentState>({
    currentStep: 1,
    answers: getDefaultSpaceLawAnswers(),
    isComplete: false,
  });

  const [direction, setDirection] = useState(0);
  const [complianceResult, setComplianceResult] =
    useState<RedactedSpaceLawResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const startedAtRef = useRef<number>(Date.now());

  const currentQuestion = getCurrentSpaceLawQuestion(
    state.answers,
    state.currentStep,
  );
  const totalSteps = getTotalSpaceLawQuestions();

  // Calculate on server when complete
  useEffect(() => {
    if (!state.isComplete || complianceResult) return;

    const calculateOnServer = async () => {
      setIsCalculating(true);
      setCalculationError(null);

      try {
        const response = await fetch("/api/space-law/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      } catch (error) {
        console.error("Space law assessment calculation error:", error);
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

  // Handle multi-select continuation (Q1)
  const handleMultiSelectContinue = useCallback(
    (values: (string | boolean | number)[]) => {
      if (!currentQuestion) return;

      const newAnswers = {
        ...state.answers,
        [currentQuestion.id]: values,
      };

      setDirection(1);
      setState((prev) => ({
        ...prev,
        answers: newAnswers as SpaceLawAssessmentAnswers,
        currentStep: prev.currentStep + 1,
      }));
    },
    [currentQuestion, state.answers],
  );

  // Handle single-select
  const handleSelect = useCallback(
    (value: string | boolean | number) => {
      if (!currentQuestion) return;

      const newAnswers = {
        ...state.answers,
        [currentQuestion.id]: value,
      };

      const nextQuestion = getCurrentSpaceLawQuestion(
        newAnswers as SpaceLawAssessmentAnswers,
        state.currentStep + 1,
      );
      const isLastQuestion =
        !nextQuestion || state.currentStep >= SPACE_LAW_QUESTIONS.length;

      setDirection(1);
      setState((prev) => ({
        ...prev,
        answers: newAnswers as SpaceLawAssessmentAnswers,
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
      let prevQuestion = getCurrentSpaceLawQuestion(state.answers, prevStep);

      while (prevStep > 0 && !prevQuestion) {
        prevStep--;
        prevQuestion = getCurrentSpaceLawQuestion(state.answers, prevStep);
      }

      setState((prev) => ({
        ...prev,
        currentStep: prevStep,
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
      answers: getDefaultSpaceLawAnswers(),
      isComplete: false,
    });
  }, []);

  // Calculating state
  if (isCalculating) {
    return (
      <div className="dark-section min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-[12px] text-white/70">
            Analyzing national space law requirements...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (calculationError) {
    return (
      <div className="dark-section min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-[14px] mb-4">{calculationError}</p>
          <button
            onClick={handleRestart}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-[13px] text-white transition-colors"
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
      <div className="dark-section min-h-screen bg-black text-white">
        <SpaceLawResultsDashboard
          result={complianceResult}
          onRestart={handleRestart}
        />
      </div>
    );
  }

  // Wizard view
  return (
    <div className="dark-section min-h-screen bg-black text-white py-12 px-6">
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
                className="flex items-center gap-2 text-[13px] text-white/60 hover:text-white transition-colors"
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
                  className="flex items-center gap-2 text-[13px] text-white/60 hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>All assessments</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
            National Space Laws
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
          <>
            {currentQuestion.isMultiSelect ? (
              <MultiSelectQuestionStep
                question={currentQuestion}
                questionNumber={state.currentStep}
                selectedValues={
                  (state.answers[
                    currentQuestion.id as keyof SpaceLawAssessmentAnswers
                  ] as (string | boolean | number)[]) || []
                }
                onContinue={handleMultiSelectContinue}
                direction={direction}
              />
            ) : (
              <QuestionStep
                question={currentQuestion}
                questionNumber={state.currentStep}
                selectedValue={
                  state.answers[
                    currentQuestion.id as keyof SpaceLawAssessmentAnswers
                  ] as string | boolean | number | null
                }
                onSelect={handleSelect}
                direction={direction}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
