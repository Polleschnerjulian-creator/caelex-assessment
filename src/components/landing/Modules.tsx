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
    articleRange: "EU Space Act Art. 6–16",
    icon: FileCheck,
    regulation: "eu-space-act",
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
    articleRange: "EU Space Act Art. 24",
    icon: Database,
    regulation: "eu-space-act",
    features: [
      "URSO data templates",
      "Registry submission prep",
      "Object tracking integration",
      "Status monitoring",
    ],
  },
  {
    id: "03",
    slug: "nis2",
    name: "NIS2 Cybersecurity",
    description:
      "Full NIS2 Directive compliance for space operators. Essential/important entity classification, 51 security requirements, incident reporting.",
    articleRange: "NIS2 Art. 21, 23, 27, 29",
    icon: Shield,
    regulation: "nis2",
    highlight: true,
    features: [
      "Entity classification",
      "51 requirements mapped",
      "24h incident reporting",
      "Maturity assessment",
    ],
  },
  {
    id: "04",
    slug: "debris",
    name: "Debris Mitigation & Safety",
    description:
      "Space debris mitigation planning, collision avoidance procedures, and end-of-life disposal compliance.",
    articleRange: "EU Space Act Art. 58–72",
    icon: Orbit,
    regulation: "eu-space-act",
    features: [
      "Disposal planning",
      "Collision assessment",
      "De-orbit calculations",
      "Safety documentation",
    ],
  },
  {
    id: "05",
    slug: "environmental",
    name: "Environmental Footprint",
    description:
      "Environmental Footprint Declaration per Annex III methodology. Lifecycle assessment tools and impact calculation.",
    articleRange: "EU Space Act Art. 96–100",
    icon: Leaf,
    regulation: "eu-space-act",
    features: [
      "Annex III calculator",
      "Lifecycle assessment",
      "Emission tracking",
      "Declaration generator",
    ],
  },
  {
    id: "06",
    slug: "insurance",
    name: "Insurance & Liability",
    description:
      "Third-party liability coverage management and state-backed insurance requirement tracking.",
    articleRange: "EU Space Act Art. 44–51",
    icon: ShieldCheck,
    regulation: "eu-space-act",
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
    articleRange: "EU Space Act Art. 26–31",
    icon: Eye,
    regulation: "eu-space-act",
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
      "Real-time monitoring of EU Space Act delegated acts, NIS2 updates, and national law changes across 10 jurisdictions.",
    articleRange: "Multi-regulation",
    icon: Bell,
    regulation: "all",
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
                07 / 14 — Platform
              </span>
              <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-light tracking-[-0.02em] text-white">
                Eight modules.
                <br />
                <span className="text-white/50">
                  Complete regulatory coverage.
                </span>
              </h2>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <span className="font-mono text-[10px] text-emerald-400/60 bg-emerald-500/10 px-2 py-1 rounded">
                EU Space Act
              </span>
              <span className="font-mono text-[10px] text-cyan-400/60 bg-cyan-500/10 px-2 py-1 rounded">
                NIS2
              </span>
              <span className="font-mono text-[10px] text-purple-400/60 bg-purple-500/10 px-2 py-1 rounded">
                10 National Laws
              </span>
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
              const isNIS2 = module.regulation === "nis2";
              const isMulti = module.regulation === "all";
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
                    className={`block h-full rounded-xl p-6 transition-all duration-500 ${
                      isNIS2
                        ? "bg-cyan-500/5 border border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500/30"
                        : "bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div
                        className={`p-2.5 rounded-lg transition-colors ${
                          isNIS2
                            ? "bg-cyan-500/10 group-hover:bg-cyan-500/20"
                            : "bg-white/[0.04] group-hover:bg-white/[0.06]"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={isNIS2 ? "text-cyan-400" : "text-white/60"}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {isNIS2 && (
                          <span className="font-mono text-[9px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                            NIS2
                          </span>
                        )}
                        {isMulti && (
                          <span className="font-mono text-[9px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                            ALL
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-white/20">
                          {module.id}
                        </span>
                      </div>
                    </div>

                    {/* Module name */}
                    <h3
                      className={`text-[15px] font-medium mb-2 tracking-[-0.01em] ${
                        isNIS2 ? "text-cyan-50" : "text-white"
                      }`}
                    >
                      {module.name}
                    </h3>

                    {/* Article range */}
                    <p
                      className={`font-mono text-[10px] mb-4 ${
                        isNIS2 ? "text-cyan-400/60" : "text-white/40"
                      }`}
                    >
                      {module.articleRange}
                    </p>

                    {/* Description */}
                    <p
                      className={`text-[13px] leading-[1.6] mb-5 ${
                        isNIS2 ? "text-cyan-100/50" : "text-white/50"
                      }`}
                    >
                      {module.description}
                    </p>

                    {/* Features */}
                    <div
                      className={`pt-4 border-t ${isNIS2 ? "border-cyan-500/10" : "border-white/[0.06]"}`}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {module.features.map((feature, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 text-[11px] ${
                              isNIS2 ? "text-cyan-200/30" : "text-white/30"
                            }`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${
                                isNIS2 ? "bg-cyan-400/40" : "bg-white/20"
                              }`}
                            />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hover indicator */}
                    <div className="mt-5 overflow-hidden h-4">
                      <span
                        className={`block text-[12px] transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-1.5 ${
                          isNIS2 ? "text-cyan-400/50" : "text-white/30"
                        }`}
                      >
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
              <p className="font-mono text-[24px] font-light text-white">
                170+
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1">
                Requirements
              </p>
            </div>
            <div className="text-center">
              <p className="font-mono text-[24px] font-light text-white">3</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1">
                Frameworks
              </p>
            </div>
            <div className="text-center">
              <p className="font-mono text-[24px] font-light text-white">10</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1">
                Jurisdictions
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
