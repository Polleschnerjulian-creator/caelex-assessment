"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Satellite,
  Rocket,
  Radio,
  Wrench,
  MapPin,
  Navigation,
  Globe,
} from "lucide-react";

const audiences = [
  {
    code: "SCO",
    icon: Satellite,
    title: "Spacecraft Operators",
    description:
      "From single-satellite missions to mega-constellations. LEO, MEO, or GEO — full authorization and operational obligations.",
    tag: "300+ EU operators",
  },
  {
    code: "LO",
    icon: Rocket,
    title: "Launch Operators",
    description:
      "Launch vehicle operators navigating authorization, safety requirements, and third-party liability frameworks.",
    tag: "Launch providers",
  },
  {
    code: "LSO",
    icon: MapPin,
    title: "Launch Site Operators",
    description:
      "Spaceport operators managing ground infrastructure, safety zones, and launch facility compliance.",
    tag: "Spaceports",
  },
  {
    code: "ISOS",
    icon: Wrench,
    title: "In-Space Service Operators",
    description:
      "Active debris removal, on-orbit servicing, refueling, and inspection missions — new EU Space Act category.",
    tag: "New category",
  },
  {
    code: "CAP",
    icon: Navigation,
    title: "Collision Avoidance Providers",
    description:
      "Space situational awareness and collision avoidance service providers supporting safe space operations.",
    tag: "SSA services",
  },
  {
    code: "PDP",
    icon: Radio,
    title: "Positional Data Providers",
    description:
      "Tracking and positioning data services enabling space traffic management and object identification.",
    tag: "Data services",
  },
  {
    code: "TCO",
    icon: Globe,
    title: "Third Country Operators",
    description:
      "Non-EU operators seeking market access and authorization for services within the European single market.",
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
          className="text-center mb-16"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 block mb-6">
            Who it&apos;s for
          </span>
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-light tracking-[-0.02em] text-white">
            All 7 operator types.{" "}
            <span className="text-white/50">One platform.</span>
          </h2>
          <p className="text-[15px] text-white/40 max-w-[600px] mx-auto mt-4">
            Every category defined under the EU Space Act — from traditional
            satellite operators to the new service provider classifications.
          </p>
        </motion.div>

        {/* Audience grid - 7 items in responsive layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {audiences.map((audience, i) => {
            const Icon = audience.icon;
            return (
              <motion.div
                key={audience.code}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
                className="group bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.04] hover:border-emerald-500/20 transition-all duration-500"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Icon size={18} className="text-emerald-400" />
                  </div>
                  <span className="font-mono text-[11px] text-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {audience.code}
                  </span>
                </div>
                <h3 className="text-[14px] font-medium text-white tracking-[-0.01em] mb-2">
                  {audience.title}
                </h3>
                <p className="text-[12px] text-white/45 leading-[1.6] mb-3">
                  {audience.description}
                </p>
                <span className="inline-block font-mono text-[9px] text-white/30 uppercase tracking-wider">
                  {audience.tag}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center text-[13px] text-white/30 mt-8"
        >
          Plus support for multi-type operators and joint ventures
        </motion.p>
      </div>
    </section>
  );
}
