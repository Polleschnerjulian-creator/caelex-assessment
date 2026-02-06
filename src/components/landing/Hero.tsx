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
        <span className="font-mono text-[11px] text-white/30">01 / 05</span>
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
          Navigate the regulatory
          <br />
          <span className="text-white/60">frontier of space.</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="text-[14px] md:text-[15px] text-white/50 mb-10 max-w-[420px] mx-auto"
        >
          119 articles. 10 annexes. Penalties up to 2% of global turnover.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="flex flex-col items-center gap-4"
        >
          <Link
            href="/assessment"
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black text-[15px] font-medium rounded-full transition-all duration-300 hover:bg-white/90 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
          >
            <span>Start your assessment</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
          <span className="text-[11px] text-white/30">
            3 min · No signup · Client-side only
          </span>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </section>
  );
}
