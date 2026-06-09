"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const GEIST = "var(--font-geist), system-ui, sans-serif";

function CtaCard({
  href,
  label,
  dark,
  inView,
  delay,
}: {
  href: string;
  label: string;
  dark: boolean;
  inView: boolean;
  delay: number;
}) {
  return (
    <Link
      href={href}
      style={dark ? { backgroundColor: "#1E1F2B" } : undefined}
      className={`group relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-none p-10 transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 md:min-h-[400px] md:p-14 ${
        dark
          ? "dark-section hover:opacity-90"
          : "bg-[#F0F1F3] hover:bg-[#E5E7EB]"
      }`}
    >
      {/* Heading flies in from the left + fades (Palantir-style reveal) */}
      <motion.h3
        style={{
          fontFamily: GEIST,
          fontSize: "clamp(2rem, 4.5vw, 46px)",
          fontWeight: 400,
          letterSpacing: "-0.025em",
          lineHeight: 1.05,
        }}
        className={dark ? "!text-white" : "text-[#1E1F2B]"}
        initial={{ opacity: 0, x: -60 }}
        animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -60 }}
        transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {label}
      </motion.h3>

      <div className="mt-8 flex justify-end">
        <ArrowRight
          className={`h-7 w-7 transition-transform duration-300 group-hover:translate-x-2 ${
            dark ? "text-white" : "text-[#1E1F2B]"
          }`}
          strokeWidth={1.5}
        />
      </div>
    </Link>
  );
}

export default function CtaBanner() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-[1500px] mx-auto px-6 md:px-12">
        <div ref={ref} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CtaCard
            href="/contact"
            label="Request a Demo"
            dark={false}
            inView={inView}
            delay={0}
          />
          <CtaCard
            href="/assessment"
            label="Start Assessment"
            dark
            inView={inView}
            delay={0.12}
          />
        </div>
      </div>
    </section>
  );
}
