"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({
  currentStep,
  totalSteps,
}: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="text-small text-black/55">
          {String(currentStep).padStart(2, "0")} /{" "}
          {String(totalSteps).padStart(2, "0")}
        </span>
        <span className="text-small text-black/45">
          {Math.round(progress)}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        aria-label={`Step ${currentStep} of ${totalSteps}`}
        className="h-[3px] bg-black/[0.06] rounded-full overflow-hidden"
      >
        <motion.div
          className="h-full bg-[#1d1d1f] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
