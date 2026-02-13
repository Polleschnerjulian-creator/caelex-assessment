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
    <section className="relative min-h-screen bg-black overflow-hidden">
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

      {/* Dark overlay - lighter */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30 pointer-events-none" />

      {/* Main content container - aligned with nav (px-6 md:px-12) */}
      <div className="relative z-10 min-h-screen flex flex-col justify-end pb-12 md:pb-16">
        <div className="max-w-[1400px] mx-auto w-full px-6 md:px-12">
          {/* Main grid: Headline left, CTA right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-end mb-10">
            {/* Left: Headline */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-light tracking-[-0.03em] leading-[1.05] text-white">
                Caelex
                <br />
                <span className="text-white/60">
                  The Space Compliance Platform.
                </span>
              </h1>
            </motion.div>

            {/* Right: CTA and Summary */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col gap-6"
            >
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/assessment"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-black text-[14px] font-medium rounded-full transition-all duration-200 hover:bg-white/90"
                >
                  Start Assessment
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 text-white text-[14px] font-medium rounded-full border border-white/25 transition-all duration-200 hover:bg-white/5 hover:border-white/40"
                >
                  Request Demo
                </Link>
              </div>

              {/* Summary */}
              <p className="text-[13px] text-white/40 leading-[1.7] max-w-[400px]">
                12 modules. 10+ jurisdictions. Every regulation that governs
                space — in one place.
              </p>
            </motion.div>
          </div>

          {/* Bottom bar: Module ticker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="pt-8 border-t border-white/[0.08]"
          >
            <div className="flex flex-wrap gap-x-2 gap-y-2 md:gap-x-3">
              {MODULES.map((module, i) => (
                <span
                  key={module}
                  className="text-[12px] md:text-[13px] text-white/40 whitespace-nowrap"
                >
                  {module}
                  {i < MODULES.length - 1 && (
                    <span className="ml-2 md:ml-3 text-white/20">·</span>
                  )}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Subtle vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </section>
  );
}
