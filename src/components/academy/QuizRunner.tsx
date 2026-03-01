"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  Lightbulb,
  Trophy,
  RotateCcw,
  HelpCircle,
} from "lucide-react";

// ─── Types ───

type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "MULTIPLE_SELECT"
  | "ARTICLE_LOOKUP"
  | "OPERATOR_CLASSIFY"
  | "SCENARIO_DECISION"
  | "JURISDICTION_COMPARE";

interface QuizQuestion {
  id?: string;
  questionText: string;
  questionType: QuestionType;
  options: QuizOption[];
  explanation: string;
  hint?: string | null;
}

interface QuizOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

interface QuizRunnerProps {
  questions: QuizQuestion[];
  onComplete: (score: number, answers: Record<string, string>) => void;
}

// ─── Constants ───

const PASS_THRESHOLD = 70;

// ─── Component ───

export default function QuizRunner({ questions, onComplete }: QuizRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const total = questions.length;
  const current = questions[currentIndex];
  const progress = ((currentIndex + (isRevealed ? 1 : 0)) / total) * 100;

  const handleSelect = useCallback(
    (optionId: string) => {
      if (isRevealed) return;
      setSelectedOptionId(optionId);
    },
    [isRevealed],
  );

  const handleConfirm = useCallback(() => {
    if (!selectedOptionId || isRevealed) return;

    const selectedOption = current.options.find(
      (o) => o.id === selectedOptionId,
    );
    const isCorrect = selectedOption?.isCorrect ?? false;

    setIsRevealed(true);
    setShowHint(false);

    const questionKey = current.id ?? `q-${currentIndex}`;
    setAnswers((prev) => ({ ...prev, [questionKey]: selectedOptionId }));

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    }
  }, [selectedOptionId, isRevealed, current, currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= total) {
      // Quiz complete
      const finalCorrect = correctCount;
      const score = Math.round((finalCorrect / total) * 100);
      setIsFinished(true);
      onComplete(score, answers);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setIsRevealed(false);
      setShowHint(false);
    }
  }, [currentIndex, total, correctCount, answers, onComplete]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setIsRevealed(false);
    setShowHint(false);
    setAnswers({});
    setCorrectCount(0);
    setIsFinished(false);
  }, []);

  // ─── Results Screen ───

  if (isFinished) {
    const score = Math.round((correctCount / total) * 100);
    const passed = score >= PASS_THRESHOLD;

    return (
      <motion.div
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center py-8"
      >
        <div
          className={`
            w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center
            ${passed ? "bg-emerald-500/15 border border-emerald-500/25" : "bg-red-500/15 border border-red-500/25"}
          `}
        >
          <Trophy
            className={`w-10 h-10 ${passed ? "text-emerald-400" : "text-red-400"}`}
          />
        </div>

        <h2 className="text-display-sm font-medium text-white mb-2">
          {passed ? "Congratulations!" : "Keep Practicing"}
        </h2>
        <p className="text-body-lg text-white/50 mb-6">
          {passed
            ? "You've passed the quiz. Great work!"
            : `You need ${PASS_THRESHOLD}% to pass. Review the material and try again.`}
        </p>

        {/* Score Display */}
        <div
          className={`
            inline-flex items-center gap-3 px-6 py-4 rounded-xl mb-8
            ${passed ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}
          `}
        >
          <span className="text-display font-semibold tabular-nums text-white">
            {score}%
          </span>
          <div className="text-left">
            <p className="text-small text-white/40">Score</p>
            <p className="text-body text-white/70">
              {correctCount} of {total} correct
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleRestart}
            className="
              flex items-center gap-2
              bg-white/5 border border-white/10 rounded-lg
              px-5 py-2.5 text-body-lg text-white/70
              hover:bg-white/10 hover:border-white/20 transition-all
            "
          >
            <RotateCcw className="w-4 h-4" />
            Retry Quiz
          </button>
        </div>
      </motion.div>
    );
  }

  // ─── Question Screen ───

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-small text-white/45">
            Question {currentIndex + 1} of {total}
          </span>
          <span className="text-small text-emerald-400 tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {/* Question Text */}
          <h3 className="text-heading font-medium text-white mb-6 leading-relaxed">
            {current.questionText}
          </h3>

          {/* Hint Button */}
          {current.hint && !isRevealed && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center gap-1.5 text-small text-amber-400/70 hover:text-amber-400 transition-colors mb-4"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showHint ? "Hide Hint" : "Show Hint"}
            </button>
          )}

          {/* Hint Content */}
          <AnimatePresence>
            {showHint && current.hint && (
              <motion.div
                initial={false}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 mb-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-body text-amber-300/80">
                      {current.hint}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Options */}
          <div className="space-y-3">
            {current.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const isCorrectOption = option.isCorrect;

              let optionStyles =
                "bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20";

              if (isSelected && !isRevealed) {
                optionStyles =
                  "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20";
              }

              if (isRevealed) {
                if (isCorrectOption) {
                  optionStyles = "bg-emerald-500/15 border-emerald-500/40";
                } else if (isSelected && !isCorrectOption) {
                  optionStyles = "bg-red-500/15 border-red-500/40";
                } else {
                  optionStyles = "bg-white/[0.02] border-white/5 opacity-50";
                }
              }

              return (
                <motion.button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  disabled={isRevealed}
                  whileHover={!isRevealed ? { scale: 1.01 } : undefined}
                  whileTap={!isRevealed ? { scale: 0.99 } : undefined}
                  className={`
                    w-full text-left p-4 rounded-xl border transition-all duration-200
                    ${optionStyles}
                    ${!isRevealed ? "cursor-pointer" : "cursor-default"}
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {isRevealed && isCorrectOption && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      )}
                      {isRevealed && isSelected && !isCorrectOption && (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      {!isRevealed && (
                        <div
                          className={`
                            w-5 h-5 rounded-full border-2 transition-colors
                            ${isSelected ? "border-emerald-500 bg-emerald-500" : "border-white/20"}
                          `}
                        >
                          {isSelected && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white" />
                            </div>
                          )}
                        </div>
                      )}
                      {isRevealed && !isCorrectOption && !isSelected && (
                        <div className="w-5 h-5 rounded-full border-2 border-white/10" />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`
                        text-body-lg
                        ${isRevealed && isCorrectOption ? "text-emerald-300" : ""}
                        ${isRevealed && isSelected && !isCorrectOption ? "text-red-300" : ""}
                        ${!isRevealed && isSelected ? "text-white" : ""}
                        ${!isRevealed && !isSelected ? "text-white/70" : ""}
                        ${isRevealed && !isCorrectOption && !isSelected ? "text-white/40" : ""}
                      `}
                    >
                      {option.label}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Explanation (after reveal) */}
          <AnimatePresence>
            {isRevealed && current.explanation && (
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 bg-white/[0.04] border border-white/10 rounded-xl p-4"
              >
                <p className="text-small text-white/40 uppercase tracking-wide mb-1.5">
                  Explanation
                </p>
                <p className="text-body-lg text-white/70 leading-relaxed">
                  {current.explanation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex justify-end mt-6 gap-3">
            {!isRevealed ? (
              <button
                onClick={handleConfirm}
                disabled={!selectedOptionId}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-lg text-subtitle font-medium transition-all
                  ${
                    selectedOptionId
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "bg-white/5 text-white/25 cursor-not-allowed"
                  }
                `}
              >
                Confirm Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="
                  flex items-center gap-2 px-6 py-2.5 rounded-lg text-subtitle font-medium
                  bg-emerald-500 hover:bg-emerald-600 text-white transition-all
                "
              >
                {currentIndex + 1 >= total ? "See Results" : "Next Question"}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
