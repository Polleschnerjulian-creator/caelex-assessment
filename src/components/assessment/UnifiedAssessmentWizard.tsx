"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Building2 } from "lucide-react";
import Link from "next/link";
import {
  UnifiedAssessmentState,
  UnifiedAssessmentAnswers,
  getDefaultUnifiedAnswers,
  RedactedUnifiedResult,
  PHASE_NAMES,
} from "@/lib/unified-assessment-types";
import {
  UNIFIED_QUESTIONS,
  getCurrentQuestion,
  getTotalQuestions,
  getPhaseProgress,
  isQuestionAnswered,
  getVisibleQuestions,
} from "@/lib/unified-assessment-questions";
import DisclaimerBanner from "@/components/ui/disclaimer-banner";
import UnifiedResultsDashboard from "@/components/unified/UnifiedResultsDashboard";
import AssessmentResultsGate from "@/components/assessment/AssessmentResultsGate";
import { csrfHeaders } from "@/lib/csrf-client";
import { getIcon } from "@/lib/icons";

// Flag emojis for country selection
const FLAG_EMOJIS: Record<string, string> = {
  AT: "🇦🇹",
  BE: "🇧🇪",
  BG: "🇧🇬",
  HR: "🇭🇷",
  CY: "🇨🇾",
  CZ: "🇨🇿",
  DK: "🇩🇰",
  EE: "🇪🇪",
  FI: "🇫🇮",
  FR: "🇫🇷",
  DE: "🇩🇪",
  GR: "🇬🇷",
  HU: "🇭🇺",
  IE: "🇮🇪",
  IT: "🇮🇹",
  LV: "🇱🇻",
  LT: "🇱🇹",
  LU: "🇱🇺",
  MT: "🇲🇹",
  NL: "🇳🇱",
  PL: "🇵🇱",
  PT: "🇵🇹",
  RO: "🇷🇴",
  SK: "🇸🇰",
  SI: "🇸🇮",
  ES: "🇪🇸",
  SE: "🇸🇪",
  UK: "🇬🇧",
  NO: "🇳🇴",
  IS: "🇮🇸",
  LI: "🇱🇮",
  CH: "🇨🇭",
  US: "🇺🇸",
  JP: "🇯🇵",
  IN: "🇮🇳",
  CN: "🇨🇳",
};

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
};

export default function UnifiedAssessmentWizard() {
  const { data: session, status: authStatus } = useSession();

  const [state, setState] = useState<UnifiedAssessmentState>({
    currentPhase: 1,
    currentStep: 1,
    totalSteps: getTotalQuestions(getDefaultUnifiedAnswers()),
    answers: getDefaultUnifiedAnswers(),
    isComplete: false,
    startedAt: Date.now(),
  });

  const [direction, setDirection] = useState(0);
  const [complianceResult, setComplianceResult] =
    useState<RedactedUnifiedResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // For text input questions
  const [textInput, setTextInput] = useState("");

  // For multi-select questions
  const [multiSelect, setMultiSelect] = useState<(string | boolean | number)[]>(
    [],
  );

  const startedAtRef = useRef<number>(Date.now());

  const currentQuestion = getCurrentQuestion(state.answers, state.currentStep);
  const totalSteps = getTotalQuestions(state.answers);
  const progress = getPhaseProgress(state.answers, state.currentStep);

  // Sync multi-select with current answer
  useEffect(() => {
    if (currentQuestion?.type === "multi") {
      const currentValue = state.answers[currentQuestion.id];
      if (Array.isArray(currentValue)) {
        setMultiSelect(currentValue);
      } else {
        setMultiSelect([]);
      }
    }
  }, [currentQuestion, state.answers]);

  // Sync text input with current answer
  useEffect(() => {
    if (currentQuestion?.type === "text") {
      const currentValue = state.answers[currentQuestion.id];
      setTextInput(typeof currentValue === "string" ? currentValue : "");
    }
  }, [currentQuestion, state.answers]);

  // Calculate on server when complete
  useEffect(() => {
    if (!state.isComplete || complianceResult) return;

    const calculateOnServer = async () => {
      setIsCalculating(true);
      setCalculationError(null);

      try {
        const response = await fetch("/api/unified/calculate", {
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

        // Store in localStorage
        try {
          localStorage.setItem(
            "caelex-unified-assessment",
            JSON.stringify({
              ...data.result,
              completedAt: new Date().toISOString(),
            }),
          );
        } catch {
          // localStorage may be unavailable
        }
      } catch (error) {
        console.error("Unified assessment calculation error:", error);
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

  // Handle single select
  const handleSelect = useCallback(
    (value: string | boolean | number) => {
      if (!currentQuestion) return;

      const newAnswers = {
        ...state.answers,
        [currentQuestion.id]: value,
      };

      const visibleQuestions = getVisibleQuestions(newAnswers);
      const isLastQuestion = state.currentStep >= visibleQuestions.length;

      setDirection(1);
      setState((prev) => ({
        ...prev,
        answers: newAnswers as Partial<UnifiedAssessmentAnswers>,
        currentStep: isLastQuestion ? prev.currentStep : prev.currentStep + 1,
        totalSteps: visibleQuestions.length,
        isComplete: isLastQuestion,
      }));
    },
    [currentQuestion, state.answers, state.currentStep],
  );

  // Handle multi-select toggle
  const handleMultiToggle = useCallback(
    (value: string | boolean | number) => {
      setMultiSelect((prev) => {
        const maxSelections = currentQuestion?.maxSelections || 10;
        if (prev.includes(value)) {
          return prev.filter((v) => v !== value);
        }
        if (prev.length >= maxSelections) {
          return prev;
        }
        return [...prev, value];
      });
    },
    [currentQuestion],
  );

  // Handle multi-select continue
  const handleMultiContinue = useCallback(() => {
    if (!currentQuestion || multiSelect.length === 0) return;

    const newAnswers = {
      ...state.answers,
      [currentQuestion.id]: multiSelect,
    };

    const visibleQuestions = getVisibleQuestions(newAnswers);
    const isLastQuestion = state.currentStep >= visibleQuestions.length;

    setDirection(1);
    setState((prev) => ({
      ...prev,
      answers: newAnswers as Partial<UnifiedAssessmentAnswers>,
      currentStep: isLastQuestion ? prev.currentStep : prev.currentStep + 1,
      totalSteps: visibleQuestions.length,
      isComplete: isLastQuestion,
    }));
    setMultiSelect([]);
  }, [currentQuestion, multiSelect, state.answers, state.currentStep]);

  // Handle text input continue
  const handleTextContinue = useCallback(() => {
    if (!currentQuestion) return;

    const newAnswers = {
      ...state.answers,
      [currentQuestion.id]: textInput || null,
    };

    const visibleQuestions = getVisibleQuestions(newAnswers);
    const isLastQuestion = state.currentStep >= visibleQuestions.length;

    setDirection(1);
    setState((prev) => ({
      ...prev,
      answers: newAnswers as Partial<UnifiedAssessmentAnswers>,
      currentStep: isLastQuestion ? prev.currentStep : prev.currentStep + 1,
      totalSteps: visibleQuestions.length,
      isComplete: isLastQuestion,
    }));
    setTextInput("");
  }, [currentQuestion, textInput, state.answers, state.currentStep]);

  // Handle back
  const handleBack = useCallback(() => {
    if (state.currentStep > 1) {
      setDirection(-1);
      setState((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }));
    }
  }, [state.currentStep]);

  // Handle restart
  const handleRestart = useCallback(() => {
    setDirection(-1);
    setComplianceResult(null);
    setCalculationError(null);
    startedAtRef.current = Date.now();
    setTextInput("");
    setMultiSelect([]);
    setState({
      currentPhase: 1,
      currentStep: 1,
      totalSteps: getTotalQuestions(getDefaultUnifiedAnswers()),
      answers: getDefaultUnifiedAnswers(),
      isComplete: false,
      startedAt: Date.now(),
    });
  }, []);

  // Calculating state
  if (isCalculating) {
    return (
      <div className="landing-page min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-[15px] text-white/70 mb-2">
            Generating your compliance profile...
          </p>
          <p className="text-[13px] text-white/40">
            Analyzing EU Space Act, NIS2, and National Space Laws
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

  // Results view - show gate first if not authenticated
  if (complianceResult) {
    // Check if user is authenticated or has been authenticated during this session
    const showResults =
      isAuthenticated || (authStatus === "authenticated" && session?.user);

    if (!showResults) {
      return (
        <div className="landing-page min-h-screen bg-black text-white">
          <AssessmentResultsGate
            result={complianceResult}
            onAuthenticated={() => setIsAuthenticated(true)}
          />
        </div>
      );
    }

    return (
      <div className="landing-page min-h-screen bg-black text-white">
        <UnifiedResultsDashboard
          result={complianceResult}
          onRestart={handleRestart}
        />
      </div>
    );
  }

  // Wizard view
  return (
    <div className="landing-page min-h-screen bg-black text-white py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
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
            Unified Compliance Assessment
          </span>
        </div>

        {/* Phase indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium text-white/60">
              Phase {progress.phase} of 8: {progress.phaseName}
            </span>
            <span className="text-[12px] text-white/40">
              Question {state.currentStep} of {totalSteps}
            </span>
          </div>

          {/* Overall progress bar */}
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.overallProgress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* Phase dots */}
          <div className="flex justify-between mt-3 px-1">
            {PHASE_NAMES.map((name, index) => (
              <div
                key={name}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index + 1 < progress.phase
                    ? "bg-emerald-500"
                    : index + 1 === progress.phase
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-white/[0.15]"
                }`}
                title={name}
              />
            ))}
          </div>
        </div>

        {/* Legal disclaimer on first step */}
        {state.currentStep === 1 && (
          <div className="mb-6">
            <DisclaimerBanner variant="banner" />
          </div>
        )}

        {/* Question */}
        {currentQuestion && (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentQuestion.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full"
            >
              {/* Question header */}
              <div className="mb-8 text-center max-w-2xl mx-auto">
                <span className="text-[11px] font-medium text-emerald-400/60 uppercase tracking-[0.2em] block mb-4">
                  {currentQuestion.phaseName}
                </span>

                <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-medium tracking-[-0.02em] text-white mb-3">
                  {currentQuestion.title}
                </h2>

                {currentQuestion.subtitle && (
                  <p className="text-[14px] text-white/50 leading-relaxed">
                    {currentQuestion.subtitle}
                  </p>
                )}

                {currentQuestion.helpText && (
                  <p className="text-[12px] text-emerald-400/60 mt-3 leading-relaxed">
                    {currentQuestion.helpText}
                  </p>
                )}
              </div>

              {/* Text input */}
              {currentQuestion.type === "text" && (
                <div className="max-w-xl mx-auto">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Enter your answer..."
                    className="w-full px-5 py-4 rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    style={{
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                    }}
                  />
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={handleTextContinue}
                      className="flex items-center gap-2 px-8 py-3.5 rounded-full text-[14px] font-medium bg-emerald-500 text-white hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all"
                    >
                      {currentQuestion.required && !textInput
                        ? "Skip"
                        : "Continue"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Single select */}
              {currentQuestion.type === "single" && currentQuestion.options && (
                <div
                  className={`grid gap-3 max-w-3xl mx-auto ${
                    currentQuestion.options.length > 6
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      : currentQuestion.options.length > 4
                        ? "grid-cols-1 sm:grid-cols-2"
                        : "grid-cols-1"
                  }`}
                >
                  {currentQuestion.options.map((option) => {
                    const IconComponent = option.icon
                      ? getIcon(option.icon)
                      : null;
                    const flag = option.flag ? FLAG_EMOJIS[option.flag] : null;

                    return (
                      <motion.button
                        key={option.id}
                        onClick={() => handleSelect(option.value)}
                        whileTap={{ scale: 0.98 }}
                        className="p-4 rounded-xl text-left transition-all duration-300 group backdrop-blur-[10px] bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]"
                        style={{
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {(flag || IconComponent) && (
                            <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                              {flag ? (
                                <span className="text-xl">{flag}</span>
                              ) : IconComponent ? (
                                <IconComponent
                                  size={18}
                                  className="text-white/70 group-hover:text-emerald-400 transition-colors"
                                />
                              ) : null}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[14px] font-medium text-white group-hover:text-emerald-400 transition-colors">
                              {option.label}
                            </h3>
                            {option.description && (
                              <p className="text-[12px] text-white/50 mt-0.5 leading-relaxed">
                                {option.description}
                              </p>
                            )}
                          </div>
                          <ArrowRight
                            size={16}
                            className="text-white/20 group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-0.5"
                          />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Boolean select */}
              {currentQuestion.type === "boolean" &&
                currentQuestion.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {currentQuestion.options.map((option) => {
                      const IconComponent = option.icon
                        ? getIcon(option.icon)
                        : null;

                      return (
                        <motion.button
                          key={option.id}
                          onClick={() => handleSelect(option.value)}
                          whileTap={{ scale: 0.98 }}
                          className="p-5 rounded-xl text-left transition-all duration-300 group backdrop-blur-[10px] bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]"
                          style={{
                            boxShadow:
                              "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                          }}
                        >
                          <div className="flex items-center gap-4">
                            {IconComponent && (
                              <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                                <IconComponent
                                  size={22}
                                  className="text-white/70 group-hover:text-emerald-400 transition-colors"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[15px] font-medium text-white group-hover:text-emerald-400 transition-colors">
                                {option.label}
                              </h3>
                              {option.description && (
                                <p className="text-[13px] text-white/50 mt-1 leading-relaxed">
                                  {option.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

              {/* Multi select */}
              {currentQuestion.type === "multi" && currentQuestion.options && (
                <>
                  {/* Selection count */}
                  <div className="flex justify-center mb-6">
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08]"
                      style={{
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                      }}
                    >
                      <span className="text-[12px] text-emerald-400/70">
                        {multiSelect.length} /{" "}
                        {currentQuestion.maxSelections || 10} selected
                      </span>
                    </div>
                  </div>

                  <div
                    className={`grid gap-3 max-w-3xl mx-auto ${
                      currentQuestion.options.length > 6
                        ? "grid-cols-1 sm:grid-cols-2"
                        : "grid-cols-1 sm:grid-cols-2"
                    }`}
                  >
                    {currentQuestion.options.map((option) => {
                      const isSelected = multiSelect.includes(option.value);
                      const isDisabled =
                        !isSelected &&
                        multiSelect.length >=
                          (currentQuestion.maxSelections || 10);
                      const IconComponent = option.icon
                        ? getIcon(option.icon)
                        : null;
                      const flag = option.flag
                        ? FLAG_EMOJIS[option.flag]
                        : null;

                      return (
                        <motion.button
                          key={option.id}
                          onClick={() =>
                            !isDisabled && handleMultiToggle(option.value)
                          }
                          whileTap={!isDisabled ? { scale: 0.98 } : undefined}
                          className={`
                            p-4 rounded-xl text-left transition-all duration-300 group backdrop-blur-[10px]
                            ${
                              isSelected
                                ? "bg-emerald-500/[0.12] border border-emerald-500/30"
                                : isDisabled
                                  ? "bg-white/[0.02] border border-white/[0.04] opacity-40 cursor-not-allowed"
                                  : "bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] cursor-pointer"
                            }
                          `}
                          style={{
                            boxShadow: isSelected
                              ? "inset 0 1px 0 rgba(16,185,129,0.1), 0 4px 24px rgba(0,0,0,0.2)"
                              : "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {(flag || IconComponent) && (
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isSelected
                                    ? "bg-emerald-500/20"
                                    : "bg-white/[0.06]"
                                }`}
                              >
                                {flag ? (
                                  <span className="text-xl">{flag}</span>
                                ) : IconComponent ? (
                                  <IconComponent
                                    size={18}
                                    className={
                                      isSelected
                                        ? "text-emerald-400"
                                        : "text-white/70"
                                    }
                                  />
                                ) : null}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3
                                className={`text-[14px] font-medium ${
                                  isSelected ? "text-emerald-400" : "text-white"
                                }`}
                              >
                                {option.label}
                              </h3>
                              {option.description && (
                                <p className="text-[12px] text-white/50 mt-0.5 leading-relaxed">
                                  {option.description}
                                </p>
                              )}
                            </div>
                            <div
                              className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-emerald-500"
                                  : "border border-white/[0.25]"
                              }`}
                            >
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                >
                                  <Check size={12} className="text-white" />
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Continue button */}
                  <div className="mt-8 flex justify-center">
                    <motion.button
                      onClick={handleMultiContinue}
                      disabled={
                        multiSelect.length <
                        (currentQuestion.minSelections || 1)
                      }
                      initial={{ opacity: 0, y: 10 }}
                      animate={{
                        opacity:
                          multiSelect.length >=
                          (currentQuestion.minSelections || 1)
                            ? 1
                            : 0.3,
                        y: 0,
                      }}
                      className={`
                        flex items-center gap-2 px-8 py-3.5 rounded-full text-[14px] font-medium transition-all
                        ${
                          multiSelect.length >=
                          (currentQuestion.minSelections || 1)
                            ? "bg-emerald-500 text-white hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] cursor-pointer"
                            : "bg-white/10 text-white/40 cursor-not-allowed"
                        }
                      `}
                    >
                      Continue
                      <ArrowRight size={16} />
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
