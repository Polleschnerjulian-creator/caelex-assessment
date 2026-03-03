"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import HorizonBadge from "./horizon-badge";

export default function EphemerisHero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center bg-[#030712] overflow-hidden">
      {/* Radial emerald glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: "800px",
          height: "800px",
          background:
            "radial-gradient(ellipse at center, rgba(16,185,129,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 w-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#4B5563] hover:text-[#9CA3AF] transition-colors text-body mb-16"
          >
            <ArrowLeft size={14} />
            Back
          </Link>

          {/* System badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8"
          >
            <span
              className="inline-block font-mono text-[11px] font-semibold uppercase tracking-[0.15em] px-4 py-1.5 rounded-full"
              style={{
                color: "#10B981",
                border: "1px solid rgba(16,185,129,0.3)",
                background: "rgba(16,185,129,0.06)",
              }}
            >
              Ephemeris /0.4
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="font-bold leading-[1.0] tracking-[-0.03em] mb-8"
            style={{ fontSize: "clamp(40px, 7vw, 80px)" }}
          >
            <span className="text-[#F9FAFB]">See the future</span>
            <br />
            <span className="text-[#10B981]">before it satisfies.</span>
          </motion.h1>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-[#9CA3AF] leading-relaxed max-w-2xl mb-16"
            style={{ fontSize: "clamp(15px, 1.8vw, 18px)" }}
          >
            Predictive compliance intelligence for every satellite in your
            fleet.
            <br />
            Not where you are — where you will be.
          </motion.p>

          {/* Horizon badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <HorizonBadge days={847} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
