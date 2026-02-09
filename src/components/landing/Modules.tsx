"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import {
  FileCheck,
  Database,
  Leaf,
  Shield,
  Orbit,
  ShieldCheck,
  Eye,
  Bell,
} from "lucide-react";

const MODULES = [
  {
    id: "01",
    slug: "authorization",
    name: "Authorization & Licensing",
    description:
      "Multi-jurisdictional authorization workflow from national to EU-level approval. NCA determination, document checklists, and application tracking.",
    articleRange: "Art. 6–16, 32–39, 105–108",
    icon: FileCheck,
    features: [
      "NCA determination engine",
      "Document workflow tracking",
      "Multi-authority coordination",
      "Timeline management",
    ],
  },
  {
    id: "02",
    slug: "registration",
    name: "Registration & Registry",
    description:
      "URSO registration and Union Register of Space Objects compliance. Automated data validation and submission preparation.",
    articleRange: "Art. 24",
    icon: Database,
    features: [
      "URSO data templates",
      "Registry submission prep",
      "Object tracking integration",
      "Status monitoring",
    ],
  },
  {
    id: "03",
    slug: "environmental",
    name: "Environmental Footprint",
    description:
      "Environmental Footprint Declaration per Annex III methodology. Lifecycle assessment tools and impact calculation.",
    articleRange: "Art. 96–100",
    icon: Leaf,
    features: [
      "Annex III calculator",
      "Lifecycle assessment",
      "Emission tracking",
      "Declaration generator",
    ],
  },
  {
    id: "04",
    slug: "cybersecurity",
    name: "Cybersecurity & Resilience",
    description:
      "NIS2-aligned security framework with risk analysis, maturity scoring, and incident reporting workflows.",
    articleRange: "Art. 74–95",
    icon: Shield,
    features: [
      "Security profile builder",
      "Maturity assessment",
      "Gap analysis",
      "Framework generator",
    ],
  },
  {
    id: "05",
    slug: "debris",
    name: "Debris Mitigation & Safety",
    description:
      "Space debris mitigation planning, collision avoidance procedures, and end-of-life disposal compliance.",
    articleRange: "Art. 58–72, 101–103",
    icon: Orbit,
    features: [
      "Disposal planning",
      "Collision assessment",
      "De-orbit calculations",
      "Safety documentation",
    ],
  },
  {
    id: "06",
    slug: "insurance",
    name: "Insurance & Liability",
    description:
      "Third-party liability coverage management and state-backed insurance requirement tracking.",
    articleRange: "Art. 44–51",
    icon: ShieldCheck,
    features: [
      "Coverage calculator",
      "Policy tracking",
      "Claim documentation",
      "Compliance verification",
    ],
  },
  {
    id: "07",
    slug: "supervision",
    name: "Supervision & Reporting",
    description:
      "Ongoing supervisory obligations, incident reporting, and regulatory communication management.",
    articleRange: "Art. 26–31, 40–57, 73",
    icon: Eye,
    features: [
      "Incident reporting",
      "Audit trail",
      "Regulatory comms",
      "Status dashboards",
    ],
  },
  {
    id: "08",
    slug: "regulatory-intelligence",
    name: "Regulatory Intelligence",
    description:
      "Real-time monitoring of delegated acts, implementing decisions, and evolving compliance requirements.",
    articleRange: "Art. 104, 114–119",
    icon: Bell,
    features: [
      "Change tracking",
      "Impact analysis",
      "Alert system",
      "Update timeline",
    ],
  },
];

export default function Modules() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section
      ref={ref}
      id="modules"
      className="relative py-32 bg-black overflow-hidden"
    >
      {/* Section header */}
      <div className="px-6 md:px-12 mb-16">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between"
          >
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/30 block mb-4">
                07 / 12 — Platform
              </span>
              <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-light tracking-[-0.02em] text-white">
                Eight modules.
                <br />
                <span className="text-white/50">One compliance platform.</span>
              </h2>
            </div>
            <div className="hidden md:block">
              <p className="font-mono text-[11px] text-white/30">
                119 articles · 10 annexes
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Module grid */}
      <div className="px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULES.map((module, index) => {
              const Icon = module.icon;
              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
                  className="group"
                >
                  <Link
                    href={`/modules/${module.slug}`}
                    className="block h-full bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-500"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="p-2.5 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors">
                        <Icon size={18} className="text-white/60" />
                      </div>
                      <span className="font-mono text-[11px] text-white/20">
                        {module.id}
                      </span>
                    </div>

                    {/* Module name */}
                    <h3 className="text-[15px] font-medium text-white mb-2 tracking-[-0.01em]">
                      {module.name}
                    </h3>

                    {/* Article range */}
                    <p className="font-mono text-[10px] text-white/40 mb-4">
                      {module.articleRange}
                    </p>

                    {/* Description */}
                    <p className="text-[13px] text-white/50 leading-[1.6] mb-5">
                      {module.description}
                    </p>

                    {/* Features */}
                    <div className="pt-4 border-t border-white/[0.06]">
                      <div className="grid grid-cols-2 gap-2">
                        {module.features.map((feature, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-[11px] text-white/30"
                          >
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hover indicator */}
                    <div className="mt-5 overflow-hidden h-4">
                      <span className="block text-[12px] text-white/30 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-1.5">
                        <span>Explore module</span>
                        <span>→</span>
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="px-6 md:px-12 mt-16"
      >
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 py-8 border-t border-white/[0.06]">
            <div className="text-center">
              <p className="font-mono text-[24px] font-light text-white">8</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1">
                Modules
              </p>
            </div>
            <div className="text-center">
              <p className="font-mono text-[24px] font-light text-white">119</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1">
                Articles
              </p>
            </div>
            <div className="text-center">
              <p className="font-mono text-[24px] font-light text-white">27</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1">
                NCAs
              </p>
            </div>
            <div className="text-center">
              <p className="font-mono text-[24px] font-light text-white">
                2030
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1">
                Enforcement
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
