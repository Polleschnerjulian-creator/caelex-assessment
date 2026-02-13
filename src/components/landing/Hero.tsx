"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

const Entity = dynamic(() => import("./Entity"), {
  ssr: false,
  loading: () => (
    <div className="w-[320px] h-[320px] md:w-[450px] md:h-[450px] lg:w-[600px] lg:h-[600px] flex items-center justify-center">
      <div
        className="w-40 h-40 rounded-full animate-pulse"
        style={{
          background:
            "radial-gradient(circle, rgba(139, 159, 255, 0.08) 0%, transparent 70%)",
        }}
      />
    </div>
  ),
});

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 md:px-12 py-24 bg-black overflow-hidden">
      {/* Corner Label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute top-24 right-6 md:right-12"
      >
        <span className="font-mono text-[11px] text-white/30">01 / 12</span>
      </motion.div>

      {/* Entity - Centered, larger */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, delay: 0.2 }}
        className="relative z-10"
      >
        <Entity />
      </motion.div>

      {/* Content below Entity */}
      <div className="relative z-20 text-center mt-4 md:mt-8">
        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-[clamp(2rem,5vw,4.5rem)] font-light tracking-[-0.03em] leading-[1.1] text-white mb-6"
        >
          Space Regulatory
          <br />
          <span className="text-white/60">Compliance Platform.</span>
        </motion.h1>

        {/* Regulation Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.95 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-6"
        >
          <span className="px-3 py-1 text-[12px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            EU Space Act
          </span>
          <span className="px-3 py-1 text-[12px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            NIS2 Directive
          </span>
          <span className="px-3 py-1 text-[12px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full">
            10 National Space Laws
          </span>
        </motion.div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="text-[14px] md:text-[16px] text-white/50 mb-10 max-w-[600px] mx-auto leading-[1.6]"
        >
          From initial assessment to ongoing compliance. Caelex automates
          authorization workflows, document management, and regulatory tracking
          across the EU Space Act, NIS2, and national laws in 10 jurisdictions.
        </motion.p>

        {/* Dual CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="flex flex-col items-center gap-5"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/assessment"
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black text-[15px] font-medium rounded-full transition-all duration-300 hover:bg-white/90 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
            >
              <span>Start Free Assessment</span>
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-3 px-8 py-4 text-white/80 text-[15px] font-medium rounded-full border border-white/20 transition-all duration-300 hover:border-white/40 hover:text-white hover:scale-[1.02]"
            >
              <span>Request a Demo</span>
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
          <span className="text-[11px] text-white/30">
            No credit card required · Free compliance assessment
          </span>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </section>
  );
}
