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
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Question header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <span className="text-caption font-medium text-black/40 uppercase tracking-[0.2em] block mb-4">
            Question {String(questionNumber).padStart(2, "0")}
          </span>

          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-medium tracking-[-0.02em] text-[#1d1d1f] mb-4">
            {question.title}
          </h2>

          {question.subtitle && (
            <p className="text-subtitle text-black/45 leading-relaxed">
              {question.subtitle}
            </p>
          )}

          {/* Selection count */}
          <div
            className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white backdrop-blur-[10px] border border-black/[0.08]"
            style={{
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <span className="text-small text-black/55">
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
                aria-disabled={isDisabled}
                aria-label={`${option.label}${option.description ? `: ${option.description}` : ""}`}
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
                      ? "bg-black/[0.05] border border-black"
                      : isDisabled
                        ? "bg-white border border-black/[0.04] opacity-40 cursor-not-allowed"
                        : "bg-white border border-black/[0.08] hover:bg-black/[0.04] hover:border-black/[0.15] cursor-pointer"
                  }
                `}
                style={{
                  boxShadow: isSelected
                    ? "0 4px 16px rgba(0,0,0,0.10)"
                    : "0 2px 12px rgba(0,0,0,0.05)",
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Flag or Icon */}
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0
                      ${isSelected ? "bg-black/[0.08]" : "bg-black/[0.04]"}
                    `}
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
                          isSelected ? "text-[#1d1d1f]" : "text-black/70"
                        }
                      />
                    ) : null}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-body-lg font-medium mb-0.5 ${
                        isSelected ? "text-[#1d1d1f]" : "text-[#1d1d1f]"
                      }`}
                    >
                      {option.label}
                    </h3>
                    <p className="text-small text-black/45 leading-relaxed">
                      {option.description}
                    </p>
                  </div>

                  {/* Checkbox indicator */}
                  <div
                    className={`
                      w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-all
                      ${isSelected ? "bg-[#1d1d1f]" : "border border-black/[0.30]"}
                    `}
                  >
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
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
            onClick={handleContinue}
            disabled={localSelected.length === 0}
            initial={false}
            animate={{
              opacity: localSelected.length > 0 ? 1 : 0.3,
              y: 0,
            }}
            className={`
              flex items-center gap-2 px-8 py-3.5 rounded-full text-body-lg font-medium transition-all
              ${
                localSelected.length > 0
                  ? "bg-[#1d1d1f] text-white hover:bg-black hover:shadow-[0_4px_14px_rgba(0,0,0,0.18)] cursor-pointer"
                  : "bg-black/[0.06] text-black/40 cursor-not-allowed"
              }
            `}
          >
            Continue
            <ArrowRight size={16} aria-hidden="true" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
