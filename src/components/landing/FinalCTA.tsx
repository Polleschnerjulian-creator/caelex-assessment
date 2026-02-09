"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const benefits = [
  "Real-time compliance dashboard across 8 modules",
  "Document vault with expiry tracking and alerts",
  "Automated deadline management and reminders",
  "Free assessment to map your regulatory profile",
];

export default function FinalCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative min-h-[70vh] flex items-center justify-center px-6 md:px-12 py-32 bg-black"
    >
      {/* Section number */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="absolute top-12 right-6 md:right-12"
      >
        <span className="font-mono text-[11px] text-white/30">12 / 12</span>
      </motion.div>

      <div className="max-w-[700px] text-center">
        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-[clamp(1.75rem,4vw,3rem)] font-light tracking-[-0.02em] leading-[1.2] text-white mb-4"
        >
          Ready to simplify
          <br />
          <span className="text-white/50">EU Space Act compliance?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-[15px] text-white/50 mb-10 max-w-[520px] mx-auto leading-[1.6]"
        >
          Join satellite operators across Europe who are using Caelex to
          navigate the most comprehensive space regulation in history.
        </motion.p>

        {/* Benefits checklist */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-12"
        >
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-[13px] text-white/40"
            >
              <CheckCircle2 size={14} className="text-white/25" />
              <span>{benefit}</span>
            </div>
          ))}
        </motion.div>

        {/* Dual CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col items-center gap-5"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/assessment"
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black text-[15px] font-medium rounded-full transition-all duration-300 hover:bg-white/90 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
            >
              <span>Start Free Assessment</span>
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-3 px-8 py-4 text-white/80 text-[15px] font-medium rounded-full border border-white/20 transition-all duration-300 hover:border-white/40 hover:text-white hover:scale-[1.02]"
            >
              <span>Schedule a Demo</span>
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </div>
          <span className="text-[11px] text-white/25">
            No credit card required. Free compliance assessment.
          </span>
        </motion.div>

        {/* Enterprise contact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 pt-10 border-t border-white/[0.06]"
        >
          <p className="text-[13px] text-white/35 mb-4">
            Need a custom deployment or have compliance questions?
          </p>
          <a
            href="mailto:cs@caelex.eu"
            className="inline-flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors"
          >
            <span>Talk to our team</span>
            <span className="text-white/30">cs@caelex.eu</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
