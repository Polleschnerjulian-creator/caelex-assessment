"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

export default function FinalCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative min-h-[60vh] flex items-center justify-center px-6 md:px-12 py-32 bg-black"
    >
      {/* Section number */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="absolute top-12 right-6 md:right-12"
      >
        <span className="font-mono text-[11px] text-white/30">05 / 05</span>
      </motion.div>

      <div className="text-center max-w-[600px]">
        {/* Main headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-[clamp(1.75rem,4vw,3rem)] font-light tracking-[-0.02em] leading-[1.2] text-white mb-6"
        >
          Ready to understand
          <br />
          your compliance requirements?
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-[14px] text-white/50 mb-12"
        >
          Answer 8 questions. Get your personalized compliance profile.
        </motion.p>

        {/* CTA Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Link
            href="/assessment"
            className="group inline-flex items-center gap-3 text-[15px] text-white hover:text-white/80 transition-colors duration-300"
          >
            <span className="underline-animation">Start your assessment</span>
            <span className="inline-block w-8 h-[1px] bg-white/40 group-hover:w-12 transition-all duration-300" />
            <span className="transform group-hover:translate-x-1 transition-transform duration-300">
              →
            </span>
          </Link>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex items-center justify-center gap-6 mt-16"
        >
          <span className="text-[11px] text-white/30">No account required</span>
          <span className="w-[1px] h-3 bg-white/20" />
          <span className="text-[11px] text-white/30">Client-side only</span>
          <span className="w-[1px] h-3 bg-white/20" />
          <span className="text-[11px] text-white/30">Free forever</span>
        </motion.div>
      </div>
    </section>
  );
}
