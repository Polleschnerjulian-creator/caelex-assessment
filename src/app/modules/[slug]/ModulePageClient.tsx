"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { ModuleDetail } from "@/data/module-details";

interface ModulePageClientProps {
  module: ModuleDetail;
  prevModule: ModuleDetail | null;
  nextModule: ModuleDetail | null;
}

export default function ModulePageClient({
  module,
  prevModule,
  nextModule,
}: ModulePageClientProps) {
  return (
    <div className="dark-section min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 text-[12px] text-white/40 mb-12"
          >
            <Link href="/" className="hover:text-white/60 transition-colors">
              Home
            </Link>
            <ChevronRight size={12} />
            <Link
              href="/#modules"
              className="hover:text-white/60 transition-colors"
            >
              Platform
            </Link>
            <ChevronRight size={12} />
            <span className="text-white/60">{module.name}</span>
          </motion.div>

          {/* Module number + name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-400/50 block mb-4">
              Module {module.id} of 08
            </span>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-light tracking-[-0.03em] leading-[1.1] text-white mb-6">
              {module.name}
            </h1>
          </motion.div>

          {/* Headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[18px] md:text-[20px] text-white/60 font-light leading-[1.5] max-w-[650px] mb-8"
          >
            {module.headline}
          </motion.p>

          {/* Article range badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <span className="inline-block font-mono text-[11px] text-white/30 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full">
              {module.articleRange}
            </span>
          </motion.div>
        </div>
      </section>

      {/* Description */}
      <section className="px-6 md:px-12 pb-20">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <div className="w-16 h-[1px] bg-white/[0.1] mb-8" />
            <p className="text-[15px] text-white/50 leading-[1.8] max-w-[700px]">
              {module.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Key Capabilities */}
      <section className="px-6 md:px-12 py-20 border-t border-white/[0.04]">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/35 block mb-4">
              Key Capabilities
            </span>
            <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-light text-white tracking-[-0.01em]">
              What this module does
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {module.keyCapabilities.map((cap, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500"
              >
                <h3 className="text-[15px] font-medium text-white mb-3">
                  {cap.title}
                </h3>
                <p className="text-[13px] text-white/40 leading-[1.7]">
                  {cap.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Automations */}
      <section className="px-6 md:px-12 py-20 border-t border-white/[0.04]">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <Sparkles size={14} className="text-blue-400/50" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/35">
                Automation
              </span>
            </div>
            <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-light text-white tracking-[-0.01em]">
              What we automate for you
            </h2>
          </motion.div>

          <div className="space-y-4">
            {module.automations.map((automation, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.06 }}
                className="flex items-start gap-4 py-3"
              >
                <CheckCircle2
                  size={16}
                  className="text-blue-400/40 mt-0.5 flex-shrink-0"
                />
                <p className="text-[14px] text-white/55 leading-[1.6]">
                  {automation}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-20 border-t border-white/[0.04]">
        <div className="max-w-[900px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-[clamp(1.25rem,3vw,1.75rem)] font-light text-white tracking-[-0.01em] mb-4">
              See if this module applies to you
            </h2>
            <p className="text-[14px] text-white/40 mb-8 max-w-[450px] mx-auto">
              Take the free compliance assessment to find out which modules are
              relevant to your operation.
            </p>
            <Link
              href="/assessment"
              className="group inline-flex items-center gap-3 px-7 py-3.5 bg-white text-black text-[14px] font-medium rounded-full hover:bg-white/90 transition-all duration-300 hover:scale-[1.02]"
            >
              <span>Start assessment</span>
              <ArrowRight
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Prev/Next navigation */}
      <section className="px-6 md:px-12 py-12 border-t border-white/[0.04]">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          {prevModule ? (
            <Link
              href={`/modules/${prevModule.slug}`}
              className="group flex items-center gap-3 text-[13px] text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft
                size={14}
                className="transition-transform group-hover:-translate-x-1"
              />
              <div>
                <span className="font-mono text-[10px] text-white/25 block">
                  Module {prevModule.id}
                </span>
                <span>{prevModule.name}</span>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {nextModule ? (
            <Link
              href={`/modules/${nextModule.slug}`}
              className="group flex items-center gap-3 text-[13px] text-white/40 hover:text-white/70 transition-colors text-right"
            >
              <div>
                <span className="font-mono text-[10px] text-white/25 block">
                  Module {nextModule.id}
                </span>
                <span>{nextModule.name}</span>
              </div>
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </section>
    </div>
  );
}
