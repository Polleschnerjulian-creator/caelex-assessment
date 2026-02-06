"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  X,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { type OnboardingStep } from "@/hooks/useOnboarding";

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  currentStepIndex: number;
  progress: number;
  isComplete: boolean;
  onCompleteStep: (stepId: string) => void;
  onDismiss: () => void;
  onSkip: () => void;
  title?: string;
  subtitle?: string;
}

export default function OnboardingChecklist({
  steps,
  currentStepIndex,
  progress,
  isComplete,
  onCompleteStep,
  onDismiss,
  onSkip,
  title = "Getting Started",
  subtitle = "Complete these steps to set up your account",
}: OnboardingChecklistProps) {
  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-6 text-center"
      >
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Setup Complete!
        </h3>
        <p className="text-sm text-white/60 mb-4">
          You&apos;ve completed all the onboarding steps. You&apos;re ready to
          start using Caelex.
        </p>
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm"
        >
          Dismiss
        </button>
      </motion.div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-white/50">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 text-white/30 hover:text-white/60 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
            <span>Progress</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-white/5">
        <AnimatePresence mode="popLayout">
          {steps.map((step, index) => (
            <OnboardingStepItem
              key={step.id}
              step={step}
              index={index}
              isCurrent={index === currentStepIndex}
              onComplete={() => onCompleteStep(step.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-white/40">
          {steps.filter((s) => s.completed).length} of {steps.length} complete
        </span>
        <button
          onClick={onSkip}
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// Individual step item
interface OnboardingStepItemProps {
  step: OnboardingStep;
  index: number;
  isCurrent: boolean;
  onComplete: () => void;
}

function OnboardingStepItem({
  step,
  index,
  isCurrent,
  onComplete,
}: OnboardingStepItemProps) {
  const content = (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`p-4 flex items-start gap-3 transition-colors ${
        isCurrent ? "bg-white/[0.03]" : step.completed ? "bg-white/[0.01]" : ""
      } ${step.href || step.action ? "hover:bg-white/[0.04] cursor-pointer" : ""}`}
      onClick={() => {
        if (step.action) {
          step.action();
        }
      }}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!step.completed) {
            onComplete();
          }
        }}
        className={`mt-0.5 flex-shrink-0 transition-colors ${
          step.completed
            ? "text-emerald-400"
            : isCurrent
              ? "text-white/60 hover:text-emerald-400"
              : "text-white/30 hover:text-white/50"
        }`}
      >
        {step.completed ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              step.completed
                ? "text-white/50 line-through"
                : isCurrent
                  ? "text-white"
                  : "text-white/70"
            }`}
          >
            {step.title}
          </span>
          {isCurrent && !step.completed && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded">
              CURRENT
            </span>
          )}
        </div>
        <p
          className={`text-xs mt-0.5 ${
            step.completed ? "text-white/30" : "text-white/50"
          }`}
        >
          {step.description}
        </p>
      </div>

      {/* Arrow */}
      {(step.href || step.action) && !step.completed && (
        <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0" />
      )}
    </motion.div>
  );

  if (step.href && !step.completed) {
    return (
      <Link href={step.href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

// Compact version for sidebar
export function OnboardingCompact({
  progress,
  completedCount,
  totalCount,
  onClick,
}: {
  progress: number;
  completedCount: number;
  totalCount: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full p-3 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-lg hover:border-emerald-500/30 transition-colors text-left"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-white/70">
          Getting Started
        </span>
        <span className="text-xs text-emerald-400">
          {completedCount}/{totalCount}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}
