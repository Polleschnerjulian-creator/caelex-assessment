"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

const Entity = dynamic(() => import("./Entity"), {
  ssr: false,
  loading: () => (
    <div className="w-[280px] h-[280px] md:w-[380px] md:h-[380px] lg:w-[500px] lg:h-[500px] flex items-center justify-center">
      <div
        className="w-32 h-32 rounded-full animate-pulse"
        style={{
          background:
            "radial-gradient(circle, rgba(139, 159, 255, 0.1) 0%, transparent 70%)",
        }}
      />
    </div>
  ),
});

const staggerDelay = {
  label: 0.2,
  headline: 0.4,
  entity: 0.6,
  subtext: 1.0,
  cta: 1.2,
  trust: 1.4,
};

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 md:px-8 bg-black">
      {/* Label */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: staggerDelay.label }}
        className="text-[11px] uppercase tracking-[0.3em] text-white/60 mb-6"
      >
        EU Space Act Compliance
      </motion.p>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: staggerDelay.headline }}
        className="text-[clamp(2.5rem,6vw,5.5rem)] font-normal tracking-[-0.04em] leading-[1.05] text-white max-w-[900px] mb-16"
      >
        Is your space mission
        <br />
        affected by the <span className="font-medium">EU Space Act</span>?
      </motion.h1>

      {/* Entity */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: staggerDelay.entity }}
        className="mb-16"
      >
        <Entity />
      </motion.div>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: staggerDelay.subtext }}
        className="text-[15px] text-white/60 text-center mb-8 max-w-[480px]"
      >
        119 articles. 10 annexes. Up to 2% of global turnover in penalties.
      </motion.p>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: staggerDelay.cta }}
        className="mb-4"
      >
        <Link href="/assessment">
          <button className="bg-white text-black text-[15px] font-medium px-8 py-3.5 rounded-full hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all duration-500">
            Start Assessment →
          </button>
        </Link>
      </motion.div>

      {/* Trust line */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: staggerDelay.trust }}
        className="text-[12px] text-white/60"
      >
        3 minutes · No signup · Client-side only
      </motion.p>
    </section>
  );
}
