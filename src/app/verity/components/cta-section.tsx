"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, motion, fadeUp } from "./animation-utils";

export default function CtaSection() {
  return (
    <section className="py-24 md:py-36 border-t border-white/[0.06]">
      <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
        <Section>
          <motion.h2
            variants={fadeUp}
            className="font-semibold text-white mb-6 leading-tight"
            style={{ fontSize: "clamp(28px, 5vw, 48px)" }}
          >
            Ready to prove compliance
            <br />
            without exposure?
          </motion.h2>

          <motion.div variants={fadeUp} className="mb-6">
            <Link
              href="/demo"
              className="inline-flex items-center px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
            >
              Request Demo
            </Link>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-body text-white/40 hover:text-white/70 transition-colors"
            >
              Or explore the platform
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </Section>
      </div>
    </section>
  );
}
