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
import { InfoTooltip } from "@/components/ui/InfoTooltip";

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
  const [savingToDashboard, setSavingToDashboard] = useState(false);

  // For text input questions
  const [textInput, setTextInput] = useState("");

  // For multi-select questions
  const [multiSelect, setMultiSelect] = useState<(string | boolean | number)[]>(
    [],
  );

  const startedAtRef = useRef<number>(Date.now());
  const savedViaOAuthRef = useRef(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedTimestamp, setSavedTimestamp] = useState<number | null>(null);

  const STORAGE_KEY = "caelex-unified-assessment-v2";
  const STORAGE_VERSION = 2;
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Resume detection on mount + Google OAuth return handling
  useEffect(() => {
    // Handle Google OAuth return with completed assessment
    const params = new URLSearchParams(window.location.search);
    if (params.get("complete") === "true") {
      const resultStr =
        localStorage.getItem("caelex-pending-unified-assessment") ||
        localStorage.getItem("caelex-unified-assessment");
      if (resultStr) {
        try {
          setComplianceResult(JSON.parse(resultStr));
          setState((prev) => ({ ...prev, isComplete: true }));
          return; // Skip resume modal
        } catch {
          // Fall through to normal flow
        }
      }
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (parsed.version !== STORAGE_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      setSavedTimestamp(parsed.savedAt);
      setShowResumeModal(true);
    } catch {
      // Ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save assessment to dashboard after Google OAuth return
  useEffect(() => {
    if (!complianceResult) return;
    if (authStatus !== "authenticated" || !session?.user) return;
    if (savedViaOAuthRef.current) return;

    let needsSave: string | null = null;
    try {
      needsSave = localStorage.getItem("caelex-save-assessment-after-auth");
    } catch {
      return;
    }
    if (!needsSave) return;

    savedViaOAuthRef.current = true;
    setSavingToDashboard(true);

    fetch("/api/unified/save-to-dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ result: complianceResult }),
    })
      .then((res) => {
        if (res.ok) {
          try {
            localStorage.removeItem("caelex-save-assessment-after-auth");
            localStorage.removeItem("caelex-pending-unified-assessment");
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        // Still show results even if save fails
      })
      .finally(() => {
        setIsAuthenticated(true);
        setSavingToDashboard(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complianceResult, authStatus, session]);

  const handleResume = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      setState((prev) => ({
        ...prev,
        answers: { ...getDefaultUnifiedAnswers(), ...parsed.answers },
        currentPhase: parsed.currentPhase || 1,
        currentStep: parsed.currentStep || 1,
        totalSteps: getTotalQuestions({
          ...getDefaultUnifiedAnswers(),
          ...parsed.answers,
        }),
      }));
    } catch {
      // Ignore
    }
    setShowResumeModal(false);
  }, []);

  const handleStartFresh = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    setShowResumeModal(false);
  }, []);

  // Auto-save on every answer change
  useEffect(() => {
    if (state.isComplete || showResumeModal) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: STORAGE_VERSION,
          answers: state.answers,
          currentPhase: state.currentPhase,
          currentStep: state.currentStep,
          savedAt: Date.now(),
        }),
      );
    } catch {
      // localStorage may be unavailable
    }
  }, [
    state.answers,
    state.currentPhase,
    state.currentStep,
    state.isComplete,
    showResumeModal,
  ]);

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

        const json = await response.json();
        // The API wraps with createSuccessResponse which produces { data: { result } }.
        // Accept both shapes defensively in case the helper is ever changed.
        const result = json?.data?.result ?? json?.result;
        if (!result) {
          throw new Error(
            "Received an empty compliance result from the server.",
          );
        }
        setComplianceResult(result);

        // Store result in localStorage + clear auto-save
        try {
          localStorage.setItem(
            "caelex-unified-assessment",
            JSON.stringify({
              ...result,
              completedAt: new Date().toISOString(),
            }),
          );
          // Clear auto-save on completion
          localStorage.removeItem(STORAGE_KEY);
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

      // Dependent field resets
      const key = currentQuestion.id;
      if (key === "operatesConstellation" && value === false) {
        newAnswers.constellationSize = null;
      }
      if (key === "isInternationalOrg" && value === false) {
        newAnswers.internationalOrgType = null;
      }
      if (key === "usesRadioFrequencies" && value === false) {
        newAnswers.frequencyBands = [];
      }
      if (key === "hasInsurance" && value === false) {
        newAnswers.insuranceCoverage = null;
        newAnswers.insuranceAmount = null;
      }

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

  // Resume modal
  if (showResumeModal) {
    const savedAgo = savedTimestamp
      ? Math.round((Date.now() - savedTimestamp) / 60000)
      : 0;
    const savedLabel =
      savedAgo < 60
        ? `${savedAgo} minutes ago`
        : savedAgo < 1440
          ? `${Math.round(savedAgo / 60)} hours ago`
          : `${Math.round(savedAgo / 1440)} days ago`;

    return (
      <div className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB] flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-7 h-7 text-[#111827]" />
          </div>
          <h2 className="text-heading font-medium text-[#111827] mb-3">
            Unfinished Assessment
          </h2>
          <p className="text-body text-[#4B5563] mb-8">
            You have an unfinished assessment from {savedLabel}. Resume where
            you left off?
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleResume}
              className="px-6 py-3 rounded-full bg-[#111827] text-white text-body-lg font-medium hover:bg-[#374151] transition-all"
            >
              Resume
            </button>
            <button
              onClick={handleStartFresh}
              className="px-6 py-3 rounded-full bg-white border border-[#D1D5DB] text-body text-[#4B5563] hover:border-[#111827] hover:text-[#111827] transition-all"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculating state
  if (isCalculating) {
    return (
      <div
        className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827] flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="w-12 h-12 border-2 border-[#E5E7EB] border-t-[#111827] rounded-full animate-spin mx-auto mb-6"
            aria-hidden="true"
          />
          <p className="text-subtitle text-[#111827] mb-2">
            Generating your compliance profile...
          </p>
          <p className="text-body text-[#4B5563]">
            Analyzing EU Space Act, NIS2, and National Space Laws
          </p>
        </div>
      </div>
    );
  }

  // Saving to dashboard after OAuth
  if (savingToDashboard) {
    return (
      <div
        className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827] flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="w-12 h-12 border-2 border-[#E5E7EB] border-t-[#111827] rounded-full animate-spin mx-auto mb-6"
            aria-hidden="true"
          />
          <p className="text-subtitle text-[#111827] mb-2">
            Setting up your dashboard...
          </p>
          <p className="text-body text-[#4B5563]">
            Saving your compliance profile
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (calculationError) {
    return (
      <div className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827] flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 text-body-lg mb-6" role="alert">
            {calculationError}
          </p>
          <button
            onClick={handleRestart}
            className="px-6 py-3 rounded-full bg-white border border-[#D1D5DB] text-body text-[#4B5563] hover:border-[#111827] hover:text-[#111827] transition-all duration-300"
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
        <div className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
          <AssessmentResultsGate
            result={complianceResult}
            onAuthenticated={() => setIsAuthenticated(true)}
          />
        </div>
      );
    }

    return (
      <div className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
        <UnifiedResultsDashboard
          result={complianceResult}
          onRestart={handleRestart}
        />
      </div>
    );
  }

  // Wizard view
  return (
    <div className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827] py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <AnimatePresence mode="wait">
            {state.currentStep > 1 ? (
              <motion.button
                key="back"
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={handleBack}
                className="flex items-center gap-2 text-body text-[#4B5563] hover:text-[#111827] transition-colors"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                <span>Back</span>
              </motion.button>
            ) : (
              <motion.div
                key="home"
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <Link
                  href="/assessment"
                  className="flex items-center gap-2 text-body text-[#4B5563] hover:text-[#111827] transition-colors"
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  <span>All assessments</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <span className="text-caption font-medium text-[#4B5563] uppercase tracking-[0.2em]">
            Unified Compliance Assessment
          </span>
        </div>

        {/* Phase indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-small font-medium text-[#4B5563]">
              Phase {progress.phase} of 8: {progress.phaseName}
            </span>
            <span className="text-small text-[#4B5563]">
              Question {state.currentStep} of {totalSteps}
            </span>
          </div>

          {/* Overall progress bar */}
          <div
            className="h-1 bg-[#E9ECEF] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={state.currentStep}
            aria-valuemin={0}
            aria-valuemax={totalSteps}
            aria-label={`Assessment progress: Step ${state.currentStep} of ${totalSteps}`}
          >
            <motion.div
              className="h-full bg-[#111827] rounded-full"
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
                    ? "bg-[#111827]"
                    : index + 1 === progress.phase
                      ? "bg-[#111827] animate-pulse"
                      : "bg-[#D1D5DB]"
                }`}
                title={name}
              />
            ))}
          </div>
        </div>

        {/* Legal disclaimer on first step */}
        {state.currentStep === 1 && (
          <div className="mb-6">
            <DisclaimerBanner variant="banner" theme="light" />
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
              aria-live="polite"
              aria-atomic="true"
            >
              {/* Question header */}
              <div className="mb-8 text-center max-w-2xl mx-auto">
                <span className="text-caption font-medium text-[#111827] uppercase tracking-[0.2em] block mb-4">
                  {currentQuestion.phaseName}
                </span>

                <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-medium tracking-[-0.02em] text-[#111827] mb-3">
                  {currentQuestion.title}
                  {currentQuestion.helpText && (
                    <InfoTooltip text={currentQuestion.helpText} />
                  )}
                </h2>

                {currentQuestion.subtitle && (
                  <p className="text-body-lg text-[#4B5563] leading-relaxed">
                    {currentQuestion.subtitle}
                  </p>
                )}
              </div>

              {/* Text input */}
              {currentQuestion.type === "text" && (
                <div className="max-w-xl mx-auto">
                  <label
                    htmlFor={`question-${currentQuestion.id}`}
                    className="sr-only"
                  >
                    {currentQuestion.title}
                  </label>
                  <input
                    type="text"
                    id={`question-${currentQuestion.id}`}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Enter your answer..."
                    aria-required={
                      currentQuestion.required ? "true" : undefined
                    }
                    className="w-full px-5 py-4 rounded-xl bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#111827] transition-colors"
                    style={{
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  />
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={handleTextContinue}
                      className="flex items-center gap-2 px-8 py-3.5 rounded-full text-body-lg font-medium bg-[#111827] text-white hover:bg-[#374151] transition-all"
                    >
                      {currentQuestion.required && !textInput
                        ? "Skip"
                        : "Continue"}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {/* Single select */}
              {currentQuestion.type === "single" && currentQuestion.options && (
                <div
                  role="radiogroup"
                  aria-label={currentQuestion.title}
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
                        role="radio"
                        aria-checked={false}
                        onClick={() => handleSelect(option.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelect(option.value);
                          }
                        }}
                        whileTap={{ scale: 0.98 }}
                        className="p-4 rounded-xl text-left transition-all duration-300 group bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                        style={{
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {(flag || IconComponent) && (
                            <div className="w-10 h-10 rounded-lg bg-[#F1F3F5] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                              {flag ? (
                                <span className="text-xl" aria-hidden="true">
                                  {flag}
                                </span>
                              ) : IconComponent ? (
                                <IconComponent
                                  size={18}
                                  aria-hidden="true"
                                  className="text-[#4B5563] group-hover:text-[#111827] transition-colors"
                                />
                              ) : null}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-body-lg font-medium text-[#111827] group-hover:text-[#111827] transition-colors">
                              {option.label}
                            </h3>
                            {option.description && (
                              <p className="text-small text-[#4B5563] mt-0.5 leading-relaxed">
                                {option.description}
                              </p>
                            )}
                          </div>
                          <ArrowRight
                            size={16}
                            aria-hidden="true"
                            className="text-[#D1D5DB] group-hover:text-[#111827] transition-colors flex-shrink-0 mt-0.5"
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
                  <div
                    role="radiogroup"
                    aria-label={currentQuestion.title}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
                  >
                    {currentQuestion.options.map((option) => {
                      const IconComponent = option.icon
                        ? getIcon(option.icon)
                        : null;

                      return (
                        <motion.button
                          key={option.id}
                          role="radio"
                          aria-checked={false}
                          onClick={() => handleSelect(option.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSelect(option.value);
                            }
                          }}
                          whileTap={{ scale: 0.98 }}
                          className="p-5 rounded-xl text-left transition-all duration-300 group bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                          style={{
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                          }}
                        >
                          <div className="flex items-center gap-4">
                            {IconComponent && (
                              <div className="w-12 h-12 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                                <IconComponent
                                  size={22}
                                  aria-hidden="true"
                                  className="text-[#4B5563] group-hover:text-[#111827] transition-colors"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-subtitle font-medium text-[#111827] group-hover:text-[#111827] transition-colors">
                                {option.label}
                              </h3>
                              {option.description && (
                                <p className="text-body text-[#4B5563] mt-1 leading-relaxed">
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
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E5E7EB]"
                      aria-live="polite"
                      style={{
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      <span className="text-small text-[#111827]">
                        {multiSelect.length} /{" "}
                        {currentQuestion.maxSelections || 10} selected
                      </span>
                    </div>
                  </div>

                  <div
                    role="group"
                    aria-label={currentQuestion.title}
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
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-disabled={isDisabled}
                          aria-label={`${option.label}${option.description ? `: ${option.description}` : ""}`}
                          onClick={() =>
                            !isDisabled && handleMultiToggle(option.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (!isDisabled) handleMultiToggle(option.value);
                            }
                          }}
                          whileTap={!isDisabled ? { scale: 0.98 } : undefined}
                          className={`
                            p-4 rounded-xl text-left transition-all duration-300 group
                            ${
                              isSelected
                                ? "bg-[#F1F3F5] border border-[#111827]"
                                : isDisabled
                                  ? "bg-[#F7F8FA] border border-[#E9ECEF] opacity-50 cursor-not-allowed"
                                  : "bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] cursor-pointer"
                            }
                          `}
                          style={{
                            boxShadow: isSelected
                              ? "0 1px 3px rgba(0,0,0,0.06)"
                              : "0 1px 3px rgba(0,0,0,0.04)",
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {(flag || IconComponent) && (
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isSelected
                                    ? "bg-[#E5E7EB]"
                                    : "bg-[#F1F3F5] border border-[#E5E7EB]"
                                }`}
                              >
                                {flag ? (
                                  <span className="text-xl" aria-hidden="true">
                                    {flag}
                                  </span>
                                ) : IconComponent ? (
                                  <IconComponent
                                    size={18}
                                    aria-hidden="true"
                                    className={
                                      isSelected
                                        ? "text-[#111827]"
                                        : "text-[#4B5563]"
                                    }
                                  />
                                ) : null}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3
                                className={`text-body-lg font-medium ${
                                  isSelected
                                    ? "text-[#111827]"
                                    : "text-[#111827]"
                                }`}
                              >
                                {option.label}
                              </h3>
                              {option.description && (
                                <p className="text-small text-[#4B5563] mt-0.5 leading-relaxed">
                                  {option.description}
                                </p>
                              )}
                            </div>
                            <div
                              className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-[#111827]"
                                  : "border border-[#D1D5DB] bg-white"
                              }`}
                            >
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                >
                                  <Check
                                    size={12}
                                    className="text-white"
                                    aria-hidden="true"
                                  />
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
                      initial={false}
                      animate={{
                        opacity:
                          multiSelect.length >=
                          (currentQuestion.minSelections || 1)
                            ? 1
                            : 0.3,
                        y: 0,
                      }}
                      className={`
                        flex items-center gap-2 px-8 py-3.5 rounded-full text-body-lg font-medium transition-all
                        ${
                          multiSelect.length >=
                          (currentQuestion.minSelections || 1)
                            ? "bg-[#111827] text-white hover:bg-[#374151] cursor-pointer"
                            : "bg-[#F1F3F5] text-[#9CA3AF] border border-[#E5E7EB] cursor-not-allowed"
                        }
                      `}
                    >
                      Continue
                      <ArrowRight size={16} aria-hidden="true" />
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
