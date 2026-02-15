"use client";

import { motion } from "framer-motion";
import { Lightbulb, ArrowRight } from "lucide-react";
import Link from "next/link";

interface SpaceLawRecommendationsProps {
  recommendations: string[];
}

export default function SpaceLawRecommendations({
  recommendations,
}: SpaceLawRecommendationsProps) {
  if (recommendations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-2">
        <Lightbulb className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
          Recommendations
        </span>
      </div>
      <p className="text-sm text-white/40 mb-6">
        Actionable next steps based on your assessment
      </p>

      {/* Recommendations container */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
        <div className="space-y-0">
          {recommendations.map((recommendation, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + index * 0.08 }}
            >
              <div className="flex items-start gap-4 py-4 border-l-2 border-blue-500/20 pl-5">
                <span className="text-2xl font-mono font-bold text-blue-400/30 leading-none flex-shrink-0 select-none">
                  {index + 1}
                </span>
                <p className="text-sm text-white/80 leading-relaxed pt-0.5">
                  {recommendation}
                </p>
              </div>
              {index < recommendations.length - 1 && (
                <div className="h-px bg-white/[0.06] ml-5" aria-hidden="true" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.4,
            delay: 0.15 + recommendations.length * 0.08 + 0.1,
          }}
          className="mt-6 pt-5 border-t border-white/[0.08] text-center"
        >
          <p className="text-[12px] text-white/40 mb-2">
            Need expert guidance on national space law compliance?
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 text-[13px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>Explore Caelex Platform</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
