"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import {
  MapPin,
  Clock,
  Euro,
  FileCheck,
  Globe,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const jurisdictions = [
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    law: "LOS (2008)",
    processingTime: "6-12 months",
    minInsurance: "€60M",
    language: "French",
    favorability: 85,
    highlight: "Largest space industry in EU",
  },
  {
    code: "LU",
    name: "Luxembourg",
    flag: "🇱🇺",
    law: "Space Law (2020)",
    processingTime: "3-6 months",
    minInsurance: "€20M",
    language: "EN/FR/DE",
    favorability: 92,
    highlight: "Space resources friendly",
  },
  {
    code: "UK",
    name: "United Kingdom",
    flag: "🇬🇧",
    law: "Space Industry Act (2018)",
    processingTime: "6-9 months",
    minInsurance: "€60M",
    language: "English",
    favorability: 88,
    highlight: "Growing spaceport network",
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    law: "SatDSiG (2007)",
    processingTime: "4-8 months",
    minInsurance: "€50M",
    language: "German",
    favorability: 78,
    highlight: "Strong technical expertise",
  },
  {
    code: "NL",
    name: "Netherlands",
    flag: "🇳🇱",
    law: "Space Activities Act (2007)",
    processingTime: "3-6 months",
    minInsurance: "€25M",
    language: "Dutch/English",
    favorability: 82,
    highlight: "ESA host country",
  },
];

export default function JurisdictionCompare() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section
      ref={ref}
      className="relative bg-black py-24 md:py-32"
      aria-label="Jurisdiction comparison"
    >
      {/* Section Label */}
      <div className="absolute top-8 right-6 md:right-12" aria-hidden="true">
        <span className="font-mono text-[11px] text-white/30">03 / 14</span>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block font-mono text-[11px] text-white/40 tracking-widest uppercase mb-4">
            Jurisdiction Comparison
          </span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-light text-white tracking-[-0.02em] mb-4">
            Where should you{" "}
            <span className="text-white/50">apply for authorization?</span>
          </h2>
          <p className="text-[15px] text-white/40 max-w-[600px] mx-auto">
            Compare processing times, insurance requirements, and favorability
            scores across 10 European jurisdictions.
          </p>
        </motion.div>

        {/* Jurisdiction Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
          {jurisdictions.map((jurisdiction, i) => (
            <motion.div
              key={jurisdiction.code}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`relative p-5 rounded-xl border transition-all duration-300 cursor-pointer ${
                hoveredIndex === i
                  ? "bg-white/[0.06] border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                  : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04]"
              }`}
            >
              {/* Flag & Name */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl" aria-hidden="true">
                  {jurisdiction.flag}
                </span>
                <div>
                  <div className="text-[15px] font-medium text-white">
                    {jurisdiction.name}
                  </div>
                  <div className="font-mono text-[10px] text-white/40">
                    {jurisdiction.law}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/40 flex items-center gap-1.5">
                    <Clock size={12} aria-hidden="true" />
                    Processing
                  </span>
                  <span className="text-white/70">
                    {jurisdiction.processingTime}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40 flex items-center gap-1.5">
                    <Euro size={12} aria-hidden="true" />
                    Min Insurance
                  </span>
                  <span className="text-white/70">
                    {jurisdiction.minInsurance}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40 flex items-center gap-1.5">
                    <Globe size={12} aria-hidden="true" />
                    Language
                  </span>
                  <span className="text-white/70">{jurisdiction.language}</span>
                </div>
              </div>

              {/* Favorability Score */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">
                    Favorability
                  </span>
                  <span className="text-[13px] font-medium text-emerald-400">
                    {jurisdiction.favorability}%
                  </span>
                </div>
                <div
                  className="h-1 bg-white/10 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-label={`${jurisdiction.name} favorability`}
                  aria-valuenow={jurisdiction.favorability}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={
                      isInView ? { width: `${jurisdiction.favorability}%` } : {}
                    }
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>

              {/* Highlight on hover */}
              {hoveredIndex === i && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-[11px] text-emerald-400/80"
                >
                  {jurisdiction.highlight}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Additional Countries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <p className="text-[13px] text-white/40 mb-4">
            Also covering: Belgium, Austria, Denmark, Italy, Norway
          </p>
          <Link
            href="/assessment/space-law"
            className="inline-flex items-center gap-2 text-[13px] text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>Compare all 10 jurisdictions</span>
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
