"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Layers,
  Sparkles,
  Satellite,
  Shield,
  Globe,
} from "lucide-react";
import Link from "next/link";
import DisclaimerBanner from "@/components/ui/disclaimer-banner";

export default function RegulationPicker() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-white/50 hover:text-emerald-400 transition-colors duration-300 text-[13px] flex items-center gap-2"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            Back to home
          </Link>
          <div className="text-[11px] font-medium text-emerald-400/60 uppercase tracking-[0.2em]">
            Compliance Assessment
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        ref={ref}
        className="flex-1 flex items-center justify-center px-6 md:px-12 py-16 md:py-24"
      >
        <div className="max-w-[900px] w-full">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-block text-[11px] font-medium text-emerald-400/70 uppercase tracking-[0.2em] mb-6">
              Compliance Assessment
            </span>
            <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-medium tracking-[-0.02em] text-white leading-[1.2] mb-5">
              Your complete regulatory profile.
              <br />
              <span className="text-white/50">In one assessment.</span>
            </h1>
            <p className="text-[14px] md:text-[16px] text-white/40 max-w-2xl mx-auto leading-[1.6]">
              Get a comprehensive analysis across EU Space Act, NIS2 Directive,
              and National Space Laws — all in one go.
            </p>
          </motion.div>

          {/* Legal disclaimer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-10"
          >
            <DisclaimerBanner assessmentType="general" variant="inline" />
          </motion.div>

          {/* Unified Assessment Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link href="/assessment/unified" className="block group">
              <div
                className="relative p-8 md:p-10 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] to-blue-500/[0.08] backdrop-blur-[10px] border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 overflow-hidden"
                style={{
                  boxShadow:
                    "inset 0 1px 0 rgba(16,185,129,0.1), 0 4px 40px rgba(16,185,129,0.1)",
                }}
              >
                {/* Glow effect */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Layers className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-[22px] font-medium text-white tracking-[-0.01em]">
                        Unified Compliance Profile
                      </h3>
                      <p className="text-[13px] text-emerald-400/70 tracking-[0.05em] mt-1">
                        All-in-One Assessment
                      </p>
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-wider bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-white">
                      <Sparkles className="w-3.5 h-3.5" />
                      Complete Profile
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[15px] text-white/60 leading-[1.7] max-w-2xl mb-8">
                    Complete regulatory profile covering EU Space Act, NIS2
                    Directive, and National Space Laws in a single comprehensive
                    assessment. Get personalized recommendations across all
                    frameworks.
                  </p>

                  {/* Framework icons */}
                  <div className="flex flex-wrap gap-3 mb-8">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                      <Satellite className="w-4 h-4 text-amber-400" />
                      <span className="text-[12px] text-white/70">
                        EU Space Act
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-[12px] text-white/70">
                        NIS2 Directive
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span className="text-[12px] text-white/70">
                        10 Jurisdictions
                      </span>
                    </div>
                  </div>

                  {/* Features grid */}
                  <div className="grid sm:grid-cols-2 gap-4 mb-10">
                    {[
                      "Complete company profile",
                      "Cross-framework analysis",
                      "Jurisdiction comparison",
                      "Priority action roadmap",
                      "Compliance readiness score",
                      "Export your results",
                    ].map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-3 text-[13px] text-white/50"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-4 mb-10">
                    <div className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-5 py-3 text-center">
                      <div className="font-mono text-[28px] font-medium text-white">
                        3
                      </div>
                      <div className="text-[10px] text-white/40 uppercase tracking-[0.1em]">
                        Frameworks
                      </div>
                    </div>
                    <div className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-5 py-3 text-center">
                      <div className="font-mono text-[28px] font-medium text-white">
                        ~35
                      </div>
                      <div className="text-[10px] text-white/40 uppercase tracking-[0.1em]">
                        Questions
                      </div>
                    </div>
                    <div className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-5 py-3 text-center">
                      <div className="font-mono text-[28px] font-medium text-white">
                        8-10
                      </div>
                      <div className="text-[10px] text-white/40 uppercase tracking-[0.1em]">
                        Minutes
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-emerald-500 text-white text-[15px] font-medium group-hover:bg-emerald-400 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300">
                      Start Assessment
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                    <span className="text-[13px] text-white/40">
                      Free · No account required
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Bottom note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.5 }}
            className="text-center text-white/25 text-[11px] tracking-[0.05em] mt-10"
          >
            No data stored · 100% client-side processing · Results exportable
          </motion.p>
        </div>
      </div>
    </div>
  );
}
