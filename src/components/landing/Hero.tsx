"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

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

      {/* Dark overlay to darken the image */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/50 pointer-events-none" />

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
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-light tracking-[-0.03em] leading-[1.05] text-white">
                Space Compliance
                <br />
                <span className="text-white/60">Platform.</span>
              </h1>
            </motion.div>

            {/* Right: CTA and Description */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col gap-6"
            >
              {/* CTA Button */}
              <div>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white text-[14px] font-medium rounded-full border border-white/20 transition-all duration-300 hover:bg-white/20 hover:border-white/30"
                >
                  <span>Start Free Assessment</span>
                </Link>
              </div>

              {/* Description text */}
              <div className="max-w-[420px]">
                <p className="text-[13px] text-white/60 leading-[1.7] mb-4">
                  <span className="text-emerald-400 font-medium">ASTRA</span>,
                  unser KI-Assistent, automatisiert Ihre gesamte Compliance —
                  von der Erstbewertung bis zur laufenden Überwachung.
                </p>
                <p className="text-[13px] text-white/45 leading-[1.7]">
                  170+ Anforderungen. 3 Frameworks. 10 Jurisdiktionen. Eine
                  Plattform, die mitdenkt.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Bottom bar: Tagline left, Pills right */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8 border-t border-white/[0.08]"
          >
            {/* Left: Tagline */}
            <p className="text-[12px] text-white/40">
              Von Satellitenbetreibern bis Launch Provider — compliant in
              Minuten, nicht Monaten.
            </p>

            {/* Right: Regulation Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-[11px] font-medium text-emerald-400/90 bg-emerald-500/15 border border-emerald-500/20 rounded-full backdrop-blur-sm">
                EU Space Act
              </span>
              <span className="px-3 py-1 text-[11px] font-medium text-cyan-400/90 bg-cyan-500/15 border border-cyan-500/20 rounded-full backdrop-blur-sm">
                NIS2
              </span>
              <span className="px-3 py-1 text-[11px] font-medium text-purple-400/90 bg-purple-500/15 border border-purple-500/20 rounded-full backdrop-blur-sm">
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
            "radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </section>
  );
}
