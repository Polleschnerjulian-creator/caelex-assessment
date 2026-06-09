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
  const ink = dark ? "#FFFFFF" : "#1E1F2B";
  return (
    <Link
      href={href}
      // Palantir's CTA card: tall (~210px) box, heading + arrow on one line at the
      // TOP, big empty space below. bg + height + ink are inline because the dev
      // Tailwind workspace quirk drops arbitrary classes (min-h-[…], text-[#…]).
      style={{
        backgroundColor: dark ? "#1E1F2B" : "#DBDBDB",
        minHeight: "210px",
      }}
      className="group relative flex flex-col overflow-hidden rounded-none px-10 pt-10 transition-opacity duration-300 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 md:px-14 md:pt-12"
    >
      {/* Heading + arrow share one line at the top; heading flies in from the left */}
      <div className="flex items-center justify-between gap-6">
        <motion.h3
          style={{
            fontFamily: GEIST,
            fontSize: "clamp(2rem, 5vw, 48px)",
            fontWeight: 400,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: ink,
          }}
          initial={{ opacity: 0, x: -60 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -60 }}
          transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
        >
          {label}
        </motion.h3>

        <ArrowRight
          className="h-9 w-9 shrink-0 transition-transform duration-300 group-hover:translate-x-2"
          style={{ color: ink }}
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
