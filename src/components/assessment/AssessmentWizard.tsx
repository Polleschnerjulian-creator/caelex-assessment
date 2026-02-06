"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home, Check } from "lucide-react";
import Link from "next/link";
import {
  AssessmentState,
  AssessmentAnswers,
  SpaceActData,
  ComplianceResult,
} from "@/lib/types";
import {
  QUESTIONS,
  getCurrentQuestion,
  getTotalQuestions,
} from "@/lib/questions";
import { calculateCompliance, loadSpaceActData } from "@/lib/engine";
import ProgressBar from "./ProgressBar";
import QuestionStep from "./QuestionStep";
import OutOfScopeResult from "./OutOfScopeResult";
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

  useEffect(() => {
    loadSpaceActData()
      .then(setSpaceActData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const currentQuestion = getCurrentQuestion(state.answers, state.currentStep);
  const totalSteps = getTotalQuestions(state.answers);

  // Compute compliance result when assessment is complete
  const complianceResult: ComplianceResult | null = useMemo(() => {
    if (state.isComplete && spaceActData) {
      return calculateCompliance(state.answers, spaceActData);
    }
    return null;
  }, [state.isComplete, state.answers, spaceActData]);

  // Store assessment results in localStorage for dashboard import
  useEffect(() => {
    if (!complianceResult) return;
    try {
      localStorage.setItem(
        "caelex-pending-assessment",
        JSON.stringify({
          operatorType: complianceResult.operatorType,
          regime: complianceResult.regime,
          entitySize: complianceResult.entitySize,
          constellationTier: complianceResult.constellationTier,
          orbit: complianceResult.orbit,
          isEU: complianceResult.isEU,
          isThirdCountry: complianceResult.isThirdCountry,
          applicableArticles: complianceResult.applicableArticles.map(
            (a) => a.number,
          ),
          moduleStatuses: complianceResult.moduleStatuses,
          completedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // localStorage may be unavailable
    }
  }, [complianceResult]);

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
      <div className="dark-section min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-[12px] text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Results view
  if (complianceResult) {
    return (
      <div className="dark-section min-h-screen bg-black text-white">
        <ResultsDashboard result={complianceResult} onRestart={handleRestart} />
      </div>
    );
  }

  // Out of scope view
  if (state.isOutOfScope && currentQuestion) {
    return (
      <div className="dark-section min-h-screen bg-black text-white py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <Link
              href="/"
              className="flex items-center gap-2 text-[13px] text-white/60 hover:text-white transition-colors"
            >
              <Home size={14} />
              <span>Home</span>
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
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
                  href="/"
                  className="flex items-center gap-2 text-[13px] text-white/60 hover:text-white transition-colors"
                >
                  <Home size={14} />
                  <span>Home</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
            EU Space Act Assessment
          </span>
        </div>

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
                <div className="bg-white/[0.05] border border-white/[0.15] rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[14px] text-white font-medium">
                        You may qualify for the simplified Light Regime
                      </p>
                      <p className="text-[13px] text-white/70 mt-1">
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
