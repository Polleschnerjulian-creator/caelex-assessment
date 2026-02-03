"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Question, QuestionOption } from "@/lib/questions";
import OptionCard from "./OptionCard";

interface QuestionStepProps {
  question: Question;
  selectedValue: string | boolean | number | null;
  onSelect: (value: string | boolean | number) => void;
  direction: number;
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export default function QuestionStep({
  question,
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
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="w-full"
      >
        {/* Question header */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            {question.title}
          </h2>
          {question.subtitle && (
            <p className="text-slate-400 max-w-2xl mx-auto">
              {question.subtitle}
            </p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-4 max-w-2xl mx-auto">
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
