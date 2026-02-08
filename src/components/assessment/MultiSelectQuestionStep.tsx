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
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 block mb-4">
            Question {String(questionNumber).padStart(2, "0")}
          </span>

          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-light tracking-[-0.02em] text-white mb-4">
            {question.title}
          </h2>

          {question.subtitle && (
            <p className="text-[15px] text-white/70 leading-relaxed">
              {question.subtitle}
            </p>
          )}

          {/* Selection count */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1]">
            <span className="font-mono text-[12px] text-white/70">
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
                  p-4 rounded-xl text-left transition-all duration-200 group
                  ${
                    isSelected
                      ? "bg-white/[0.08] border border-white/[0.25]"
                      : isDisabled
                        ? "bg-white/[0.02] border border-white/[0.06] opacity-40 cursor-not-allowed"
                        : "bg-white/[0.04] border border-white/[0.12] hover:bg-white/[0.06] hover:border-white/[0.18] cursor-pointer"
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Flag or Icon */}
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0
                      ${isSelected ? "bg-white/[0.15]" : "bg-white/[0.08]"}
                    `}
                  >
                    {flag ? (
                      <span className="text-xl">{flag}</span>
                    ) : IconComponent ? (
                      <IconComponent
                        size={18}
                        className={isSelected ? "text-white" : "text-white/70"}
                      />
                    ) : null}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-medium text-white mb-0.5">
                      {option.label}
                    </h3>
                    <p className="text-[12px] text-white/60 leading-relaxed">
                      {option.description}
                    </p>
                  </div>

                  {/* Checkbox indicator */}
                  <div
                    className={`
                      w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-all
                      ${isSelected ? "bg-white" : "border border-white/[0.30]"}
                    `}
                  >
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Check size={12} className="text-black" />
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
              flex items-center gap-2 px-8 py-3.5 rounded-xl text-[14px] font-medium transition-all
              ${
                localSelected.length > 0
                  ? "bg-white text-black hover:bg-white/90 cursor-pointer"
                  : "bg-white/20 text-white/40 cursor-not-allowed"
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
