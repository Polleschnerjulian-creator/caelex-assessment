"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Question, QuestionOption } from "@/lib/questions";
import OptionCard from "./OptionCard";

interface QuestionStepProps {
  question: Question;
  questionNumber?: number;
  selectedValue: string | boolean | number | null;
  onSelect: (value: string | boolean | number) => void;
  direction: number;
}

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

export default function QuestionStep({
  question,
  questionNumber = 1,
  selectedValue,
  onSelect,
  direction,
}: QuestionStepProps) {
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
          {/* Question Number */}
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 block mb-4">
            Question {String(questionNumber).padStart(2, "0")}
          </span>

          {/* Title */}
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-light tracking-[-0.02em] text-white mb-4">
            {question.title}
          </h2>

          {/* Subtitle */}
          {question.subtitle && (
            <p className="text-[15px] text-white/70 leading-relaxed">
              {question.subtitle}
            </p>
          )}
        </div>

        {/* Options */}
        <div
          role="radiogroup"
          aria-label={question.title}
          className="space-y-3 max-w-2xl mx-auto"
        >
          {question.options.map((option: QuestionOption) => (
            <OptionCard
              key={option.id}
              label={option.label}
              description={option.description}
              icon={option.icon}
              isSelected={selectedValue === option.value}
              onClick={() => onSelect(option.value)}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
