"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

const Entity = dynamic(() => import("./Entity"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="w-[600px] h-[600px] rounded-full animate-pulse"
        style={{
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)",
        }}
      />
    </div>
  ),
});

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-black overflow-hidden">
      {/* Entity as atmospheric background - centered and large */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="relative"
          style={{ transform: "translateY(-10%)" }}
        >
          <Entity />
        </motion.div>
      </div>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40 pointer-events-none" />

      {/* Main content container */}
      <div className="relative z-10 min-h-screen flex flex-col justify-end px-6 md:px-12 lg:px-16 pb-12 md:pb-16">
        {/* Bottom content area */}
        <div className="max-w-[1400px] mx-auto w-full">
          {/* Main grid: Headline left, Description right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-end mb-12">
            {/* Left: Headline */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-light tracking-[-0.03em] leading-[1.05] text-white">
                Caelex
                <br />
                <span className="text-white/50">Where Compliance Begins.</span>
              </h1>
            </motion.div>

            {/* Right: CTA and Description */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex flex-col gap-6"
            >
              {/* CTA Button */}
              <div>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white text-[14px] font-medium rounded-full border border-white/20 transition-all duration-300 hover:bg-white/20 hover:border-white/30"
                >
                  <span>Start Assessment</span>
                </Link>
              </div>

              {/* Description text */}
              <div className="max-w-[400px]">
                <p className="text-[13px] text-white/40 leading-[1.7] mb-4">
                  Compliance doesn&apos;t begin with paperwork — it starts with
                  understanding. Context that guides decisions forward.
                </p>
                <p className="text-[13px] text-white/40 leading-[1.7]">
                  Caelex is your platform for regulatory clarity. A calm
                  interface for navigating complex requirements and building
                  compliance. Less confusion. More certainty.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Bottom bar: Tagline left, Pills right */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8 border-t border-white/[0.06]"
          >
            {/* Left: Tagline */}
            <p className="text-[12px] text-white/30">
              Clarity begins with the right questions.
            </p>

            {/* Right: Regulation Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-[11px] font-medium text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/15 rounded-full">
                EU Space Act
              </span>
              <span className="px-3 py-1 text-[11px] font-medium text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/15 rounded-full">
                NIS2
              </span>
              <span className="px-3 py-1 text-[11px] font-medium text-purple-400/80 bg-purple-500/10 border border-purple-500/15 rounded-full">
                10 Jurisdictions
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Subtle vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </section>
  );
}
