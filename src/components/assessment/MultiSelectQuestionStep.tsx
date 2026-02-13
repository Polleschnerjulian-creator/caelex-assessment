"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Question, QuestionOption } from "@/lib/questions";
import { getIcon } from "@/lib/icons";

interface MultiSelectQuestionStepProps {
  question: Question;
  questionNumber?: number;
  selectedValues: (string | boolean | number)[];
  onContinue: (values: (string | boolean | number)[]) => void;
  direction: number;
}

const FLAG_EMOJIS: Record<string, string> = {
  FR: "🇫🇷",
  UK: "🇬🇧",
  BE: "🇧🇪",
  NL: "🇳🇱",
  LU: "🇱🇺",
  AT: "🇦🇹",
  DK: "🇩🇰",
  DE: "🇩🇪",
  IT: "🇮🇹",
  NO: "🇳🇴",
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

export default function MultiSelectQuestionStep({
  question,
  questionNumber = 1,
  selectedValues,
  onContinue,
  direction,
}: MultiSelectQuestionStepProps) {
  const [localSelected, setLocalSelected] =
    useState<(string | boolean | number)[]>(selectedValues);

  const maxSelections = question.maxSelections || 3;

  function toggleOption(value: string | boolean | number) {
    setLocalSelected((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      if (prev.length >= maxSelections) {
        return prev;
      }
      return [...prev, value];
    });
  }

  function handleContinue() {
    if (localSelected.length > 0) {
      onContinue(localSelected);
    }
  }

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={question.id}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full"
      >
        {/* Question header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <span className="text-[11px] font-medium text-emerald-400/60 uppercase tracking-[0.2em] block mb-4">
            Question {String(questionNumber).padStart(2, "0")}
          </span>

          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-medium tracking-[-0.02em] text-white mb-4">
            {question.title}
          </h2>

          {question.subtitle && (
            <p className="text-[15px] text-white/50 leading-relaxed">
              {question.subtitle}
            </p>
          )}

          {/* Selection count */}
          <div
            className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08]"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
            }}
          >
            <span className="text-[12px] text-emerald-400/70">
              {localSelected.length} / {maxSelections} selected
            </span>
          </div>
        </div>

        {/* Options grid */}
        <div
          role="group"
          aria-label={question.title}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto"
        >
          {question.options.map((option: QuestionOption) => {
            const isSelected = localSelected.includes(option.value);
            const isDisabled =
              !isSelected && localSelected.length >= maxSelections;
            const IconComponent = option.icon ? getIcon(option.icon) : null;
            const flag =
              typeof option.value === "string"
                ? FLAG_EMOJIS[option.value]
                : undefined;

            return (
              <motion.button
                key={option.id}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => !isDisabled && toggleOption(option.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!isDisabled) toggleOption(option.value);
                  }
                }}
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
                  {/* Flag or Icon */}
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0
                      ${isSelected ? "bg-emerald-500/20" : "bg-white/[0.06]"}
                    `}
                  >
                    {flag ? (
                      <span className="text-xl">{flag}</span>
                    ) : IconComponent ? (
                      <IconComponent
                        size={18}
                        className={
                          isSelected ? "text-emerald-400" : "text-white/70"
                        }
                      />
                    ) : null}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-[14px] font-medium mb-0.5 ${
                        isSelected ? "text-emerald-400" : "text-white"
                      }`}
                    >
                      {option.label}
                    </h3>
                    <p className="text-[12px] text-white/50 leading-relaxed">
                      {option.description}
                    </p>
                  </div>

                  {/* Checkbox indicator */}
                  <div
                    className={`
                      w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-all
                      ${isSelected ? "bg-emerald-500" : "border border-white/[0.25]"}
                    `}
                  >
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
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
            onClick={handleContinue}
            disabled={localSelected.length === 0}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: localSelected.length > 0 ? 1 : 0.3,
              y: 0,
            }}
            className={`
              flex items-center gap-2 px-8 py-3.5 rounded-full text-[14px] font-medium transition-all
              ${
                localSelected.length > 0
                  ? "bg-emerald-500 text-white hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] cursor-pointer"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }
            `}
          >
            Continue
            <ArrowRight size={16} />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
