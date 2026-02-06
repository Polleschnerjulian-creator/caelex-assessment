"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Satellite, Rocket, Radio, Wrench } from "lucide-react";

const audiences = [
  {
    icon: Satellite,
    title: "Satellite Operators",
    description:
      "From single-satellite missions to mega-constellations. Whether you're in LEO, MEO, or GEO — understand your full authorization and operational obligations.",
    tag: "300+ EU operators affected",
  },
  {
    icon: Rocket,
    title: "Launch Service Providers",
    description:
      "Launch vehicle operators and spaceport operators navigating launch authorization, safety requirements, and third-party liability frameworks.",
    tag: "Launch & site operators",
  },
  {
    icon: Wrench,
    title: "In-Space Service Providers",
    description:
      "Active debris removal, on-orbit servicing, refueling, and inspection mission operators — a new category created by the EU Space Act.",
    tag: "New regulatory category",
  },
  {
    icon: Radio,
    title: "Space Data Providers",
    description:
      "Primary Earth observation data providers and space-based service operators offering services within the EU single market.",
    tag: "EU market access",
  },
];

export default function TargetAudience() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-24 md:py-32 bg-black">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 block mb-6">
            Who it&apos;s for
          </span>
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-light tracking-[-0.02em] text-white max-w-[550px]">
            Built for every operator
            <br />
            <span className="text-white/50">affected by the EU Space Act.</span>
          </h2>
        </motion.div>

        {/* Audience grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {audiences.map((audience, i) => {
            const Icon = audience.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
                className="group bg-white/[0.02] border border-white/[0.06] rounded-xl p-7 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500"
              >
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] flex items-center justify-center transition-colors">
                    <Icon size={20} className="text-white/50" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-[15px] font-medium text-white tracking-[-0.01em]">
                        {audience.title}
                      </h3>
                    </div>
                    <p className="text-[13px] text-white/45 leading-[1.7] mb-3">
                      {audience.description}
                    </p>
                    <span className="inline-block font-mono text-[10px] text-white/30 bg-white/[0.04] px-2.5 py-1 rounded-full">
                      {audience.tag}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
