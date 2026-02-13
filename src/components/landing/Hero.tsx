"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const MODULES = [
  "Authorization",
  "Cybersecurity",
  "Debris Mitigation",
  "Export Control",
  "Insurance",
  "Environmental",
  "Supervision",
  "Spectrum & ITU",
  "NIS2",
  "COPUOS/IADC",
  "UK Space Act",
  "US Regulatory",
];

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-black overflow-hidden flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-planet.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          quality={90}
        />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70 pointer-events-none" />

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-16 pt-32 pb-24">
        <div className="max-w-[1200px] mx-auto w-full">
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-semibold tracking-[-0.025em] leading-[1.1] text-white mb-10 md:mb-12"
          >
            The World&apos;s Space
            <br />
            Compliance Platform.
          </motion.h1>

          {/* Module Ticker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 md:mb-10 overflow-hidden"
          >
            <div className="flex flex-wrap gap-x-2 gap-y-2 md:gap-x-3">
              {MODULES.map((module, i) => (
                <span
                  key={module}
                  className="text-[13px] md:text-[14px] text-white/50 whitespace-nowrap"
                >
                  {module}
                  {i < MODULES.length - 1 && (
                    <span className="ml-2 md:ml-3 text-white/20">·</span>
                  )}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Summary Line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-[14px] md:text-[15px] text-white/40 mb-10 md:mb-12 max-w-[600px]"
          >
            12 modules. 10+ jurisdictions. Every regulation that governs space —
            in one place.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4"
          >
            <Link
              href="/assessment"
              className="inline-flex items-center justify-center px-7 py-3.5 bg-white text-black text-[14px] font-medium rounded transition-all duration-200 hover:bg-white/90"
            >
              Start Assessment
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-7 py-3.5 text-white text-[14px] font-medium rounded border border-white/25 transition-all duration-200 hover:bg-white/5 hover:border-white/40"
            >
              Request Demo
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 70% 50%, transparent 0%, transparent 30%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </section>
  );
}
