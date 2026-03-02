"use client";

import { motion } from "framer-motion";
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
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#E5E7EB]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-[#4B5563] hover:text-[#111827] transition-colors duration-300 text-body flex items-center gap-2"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" aria-hidden="true" />
            Back to home
          </Link>
          <div className="text-caption font-medium text-[#4B5563] uppercase tracking-[0.2em]">
            Compliance Assessment
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-[900px] w-full">
          {/* Title */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-block text-caption font-medium text-[#4B5563] uppercase tracking-[0.2em] mb-6">
              Compliance Assessment
            </span>
            <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-medium tracking-[-0.02em] text-[#111827] leading-[1.2] mb-5">
              Your complete regulatory profile.
              <br />
              <span className="text-[#4B5563]">In one assessment.</span>
            </h1>
            <p className="text-body-lg md:text-title text-[#4B5563] max-w-2xl mx-auto leading-[1.6]">
              Get a comprehensive analysis across EU Space Act, NIS2 Directive,
              and National Space Laws — all in one go.
            </p>
          </motion.div>

          {/* Legal disclaimer */}
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-10"
          >
            <DisclaimerBanner assessmentType="general" variant="inline" />
          </motion.div>

          {/* Unified Assessment Card */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link href="/assessment/unified" className="block group">
              <div className="relative p-8 md:p-10 rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all duration-300 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                {/* Subtle accent */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#F1F3F5] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB] flex items-center justify-center text-[#111827]">
                      <Layers className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-heading-lg font-medium text-[#111827] tracking-[-0.01em]">
                        Unified Compliance Profile
                      </h3>
                      <p className="text-body text-[#4B5563] tracking-[0.05em] mt-1">
                        All-in-One Assessment
                      </p>
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium uppercase tracking-wider bg-[#F1F3F5] text-[#111827]">
                      <Sparkles className="w-3.5 h-3.5" />
                      Complete Profile
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-subtitle text-[#4B5563] leading-[1.7] max-w-2xl mb-8">
                    Complete regulatory profile covering EU Space Act, NIS2
                    Directive, and National Space Laws in a single comprehensive
                    assessment. Get personalized recommendations across all
                    frameworks.
                  </p>

                  {/* Framework icons */}
                  <div className="flex flex-wrap gap-3 mb-8">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB]">
                      <Satellite className="w-4 h-4 text-amber-500" />
                      <span className="text-small text-[#4B5563]">
                        EU Space Act
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB]">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <span className="text-small text-[#4B5563]">
                        NIS2 Directive
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB]">
                      <Globe className="w-4 h-4 text-blue-500" />
                      <span className="text-small text-[#4B5563]">
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
                        className="flex items-center gap-3 text-body text-[#4B5563]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#111827] flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-4 mb-10">
                    <div className="bg-[#F1F3F5] border border-[#E5E7EB] rounded-xl px-5 py-3 text-center">
                      <div className="text-[28px] font-medium text-[#111827]">
                        3
                      </div>
                      <div className="text-caption sm:text-micro text-[#4B5563] uppercase tracking-[0.1em]">
                        Frameworks
                      </div>
                    </div>
                    <div className="bg-[#F1F3F5] border border-[#E5E7EB] rounded-xl px-5 py-3 text-center">
                      <div className="text-[28px] font-medium text-[#111827]">
                        ~35
                      </div>
                      <div className="text-caption sm:text-micro text-[#4B5563] uppercase tracking-[0.1em]">
                        Questions
                      </div>
                    </div>
                    <div className="bg-[#F1F3F5] border border-[#E5E7EB] rounded-xl px-5 py-3 text-center">
                      <div className="text-[28px] font-medium text-[#111827]">
                        8-10
                      </div>
                      <div className="text-caption sm:text-micro text-[#4B5563] uppercase tracking-[0.1em]">
                        Minutes
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#111827] text-white text-subtitle font-medium group-hover:bg-[#374151] transition-all duration-300">
                      Start Assessment
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                    <span className="text-body text-[#4B5563]">
                      Free · No account required
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Bottom note */}
          <motion.p
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-[#9CA3AF] text-small sm:text-caption tracking-[0.05em] mt-10"
          >
            No data stored · 100% client-side processing · Results exportable
          </motion.p>
        </div>
      </div>
    </div>
  );
}
