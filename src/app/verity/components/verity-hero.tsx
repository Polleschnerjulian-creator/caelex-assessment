"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function VerityHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <Image
        src="/images/verity-hero.png"
        alt=""
        fill
        className="object-cover"
        priority
        quality={90}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#0A0F1E]/70" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 mb-6"
        >
          Caelex Verity
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-semibold text-white leading-[1.05] mb-6"
          style={{ fontSize: "clamp(40px, 7vw, 80px)" }}
        >
          Prove compliance.
          <br />
          Reveal nothing.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-body-lg md:text-subtitle text-white/60 max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Privacy-preserving compliance attestations for satellite operators.
          Cryptographically signed proof that regulatory thresholds are met —
          without exposing the underlying telemetry.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Link
            href="/demo"
            className="inline-flex items-center px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
          >
            Request Demo
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
