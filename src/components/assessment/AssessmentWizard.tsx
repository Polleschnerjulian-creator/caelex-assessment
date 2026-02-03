"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { AssessmentState, AssessmentAnswers, SpaceActData } from "@/lib/types";
import {
  QUESTIONS,
  getCurrentQuestion,
  getTotalQuestions,
} from "@/lib/questions";
import { calculateCompliance, loadSpaceActData } from "@/lib/engine";
import ProgressBar from "./ProgressBar";
import QuestionStep from "./QuestionStep";
import OutOfScopeResult from "./OutOfScopeResult";
import Button from "@/components/ui/Button";
import ResultsDashboard from "@/components/results/ResultsDashboard";

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
  const [spaceActData, setSpaceActData] = useState<SpaceActData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load the JSON data on mount
  useEffect(() => {
    loadSpaceActData()
      .then(setSpaceActData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const currentQuestion = getCurrentQuestion(state.answers, state.currentStep);
  const totalSteps = getTotalQuestions(state.answers);

  const handleSelect = useCallback(
    (value: string | boolean | number) => {
      if (!currentQuestion) return;

      // Update the answer
      const newAnswers = {
        ...state.answers,
        [currentQuestion.id]: value,
      };

      // Check for out-of-scope conditions
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

      // Check if we've reached the end
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

      // Find the previous applicable step
      let prevStep = state.currentStep - 1;
      let prevQuestion = getCurrentQuestion(state.answers, prevStep);

      // If the previous question was skipped (conditional), go back further
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
    setState({
      currentStep: 1,
      answers: initialAnswers,
      isComplete: false,
      isOutOfScope: false,
      outOfScopeReason: null,
    });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading assessment...</p>
        </div>
      </div>
    );
  }

  // Results view
  if (state.isComplete && spaceActData) {
    const result = calculateCompliance(state.answers, spaceActData);
    return (
      <div className="min-h-screen bg-navy-950">
        <ResultsDashboard result={result} onRestart={handleRestart} />
      </div>
    );
  }

  // Out of scope view
  if (state.isOutOfScope && currentQuestion) {
    return (
      <div className="min-h-screen bg-navy-950 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
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
    <div className="min-h-screen bg-navy-950 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <AnimatePresence mode="wait">
            {state.currentStep > 1 ? (
              <motion.div
                key="back"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="home"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-sm text-slate-500 font-mono">
            EU Space Act Assessment
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-12">
          <ProgressBar
            currentStep={state.currentStep}
            totalSteps={totalSteps}
          />
        </div>

        {/* Question */}
        {currentQuestion && (
          <QuestionStep
            question={currentQuestion}
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
                className="mt-8 max-w-2xl mx-auto"
              >
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="w-3 h-3 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-green-400 font-medium text-sm">
                        You may qualify for the simplified Light Regime
                      </p>
                      <p className="text-green-500/70 text-xs mt-1">
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
