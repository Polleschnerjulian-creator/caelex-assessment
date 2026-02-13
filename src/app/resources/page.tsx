"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  FileText,
  BookOpen,
  Scale,
  ExternalLink,
  Clock,
  HelpCircle,
  Shield,
  Trash2,
  Leaf,
  Eye,
  FileCheck,
  ChevronRight,
  BookMarked,
} from "lucide-react";

const featuredResources = [
  {
    title: "EU Space Act Overview",
    description:
      "Comprehensive breakdown of COM(2025) 335 — scope, key obligations, and what it means for operators",
    href: "/resources/eu-space-act",
    icon: Scale,
    tag: "Essential",
  },
  {
    title: "Compliance Timeline",
    description:
      "Critical deadlines, transition periods, and implementation milestones you need to know",
    href: "/resources/timeline",
    icon: Clock,
    tag: "Updated",
  },
  {
    title: "FAQ",
    description:
      "Answers to the most common questions about EU Space Act compliance",
    href: "/resources/faq",
    icon: HelpCircle,
    tag: null,
  },
];

const complianceGuides = [
  {
    title: "Authorization Requirements",
    description:
      "Articles 4-18: Licensing process, application requirements, and approval criteria",
    href: "/resources/guides/authorization",
    icon: FileCheck,
    articles: "Art. 4-18",
  },
  {
    title: "Cybersecurity Obligations",
    description:
      "Articles 32-38: Security requirements, incident reporting, and risk management",
    href: "/resources/guides/cybersecurity",
    icon: Shield,
    articles: "Art. 32-38",
  },
  {
    title: "Space Debris Mitigation",
    description:
      "Articles 39-47: End-of-life requirements, collision avoidance, and debris tracking",
    href: "/resources/guides/debris",
    icon: Trash2,
    articles: "Art. 39-47",
  },
  {
    title: "Environmental Sustainability",
    description:
      "Articles 48-56: LCA requirements, reporting obligations, and sustainability metrics",
    href: "/resources/guides/environmental",
    icon: Leaf,
    articles: "Art. 48-56",
  },
  {
    title: "Insurance & Liability",
    description:
      "Articles 57-68: Coverage requirements, third-party liability, and financial security",
    href: "/resources/guides/insurance",
    icon: Scale,
    articles: "Art. 57-68",
  },
  {
    title: "Ongoing Supervision",
    description:
      "Articles 69-82: Reporting duties, inspections, audits, and compliance monitoring",
    href: "/resources/guides/supervision",
    icon: Eye,
    articles: "Art. 69-82",
  },
];

const externalResources = [
  {
    title: "COM(2025) 335 Final",
    description: "Official EU Space Act proposal — full legal text",
    href: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335:FIN",
  },
  {
    title: "EUSPA Official Website",
    description: "EU Agency for the Space Programme",
    href: "https://www.euspa.europa.eu/",
  },
  {
    title: "ESA Space Debris Office",
    description: "Technical resources on debris mitigation",
    href: "https://www.esa.int/Space_Safety/Space_Debris",
  },
  {
    title: "ISO Space Standards",
    description: "International standards for space operations",
    href: "https://www.iso.org/committee/46614.html",
  },
];

export default function ResourcesPage() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <main ref={ref} className="landing-page min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="pt-32 pb-16 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-[11px] font-medium text-emerald-400/70 uppercase tracking-[0.2em] mb-4">
              Resources
            </span>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.02em] mb-6">
              EU Space Act Knowledge Base
            </h1>
            <p className="text-[17px] text-white/50 max-w-[600px] leading-relaxed">
              Everything you need to understand and comply with the most
              comprehensive regulatory framework for commercial space operations
              in history.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Resources */}
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-8">
            Start Here
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {featuredResources.map((resource, index) => {
              const Icon = resource.icon;
              return (
                <motion.div
                  key={resource.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link href={resource.href} className="group block h-full">
                    <div
                      className="h-full p-6 rounded-2xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.15]"
                      style={{
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
                          <Icon size={24} className="text-white/60" />
                        </div>
                        {resource.tag && (
                          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/15 px-2 py-1 rounded uppercase tracking-wider">
                            {resource.tag}
                          </span>
                        )}
                      </div>
                      <h3 className="text-[17px] font-medium text-white mb-2 group-hover:text-white/90">
                        {resource.title}
                      </h3>
                      <p className="text-[14px] text-white/40 leading-relaxed">
                        {resource.description}
                      </p>
                      <div className="flex items-center gap-1 mt-4 text-[13px] text-white/30 group-hover:text-emerald-400/70 transition-colors">
                        <span>Read more</span>
                        <ChevronRight
                          size={14}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Compliance Guides */}
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <BookOpen size={20} className="text-white/40" />
            <h2 className="text-[12px] text-white/40 uppercase tracking-wider">
              Compliance Guides by Module
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {complianceGuides.map((guide, index) => {
              const Icon = guide.icon;
              return (
                <motion.div
                  key={guide.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
                >
                  <Link href={guide.href} className="group block">
                    <div
                      className="flex items-start gap-4 p-5 rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.15]"
                      style={{
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                      }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <Icon size={20} className="text-white/50" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-[15px] font-medium text-white group-hover:text-white/90">
                            {guide.title}
                          </h3>
                          <span className="text-[10px] font-mono text-white/30 bg-white/[0.06] px-2 py-0.5 rounded">
                            {guide.articles}
                          </span>
                        </div>
                        <p className="text-[13px] text-white/40">
                          {guide.description}
                        </p>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-white/20 group-hover:text-emerald-400/70 group-hover:translate-x-1 transition-all flex-shrink-0 mt-2"
                      />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Glossary Teaser */}
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          <Link href="/resources/glossary" className="group block">
            <div
              className="p-8 rounded-2xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.15]"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/[0.06] flex items-center justify-center">
                    <BookMarked size={28} className="text-white/50" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-medium text-white mb-1">
                      Space Law Glossary
                    </h3>
                    <p className="text-[14px] text-white/40">
                      50+ terms defined — from "space object" to "orbital slot"
                      to "de-orbit maneuver"
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={24}
                  className="text-white/20 group-hover:text-emerald-400/70 group-hover:translate-x-2 transition-all"
                />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* External Resources */}
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <ExternalLink size={18} className="text-white/40" />
            <h2 className="text-[12px] text-white/40 uppercase tracking-wider">
              Official Sources & Standards
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {externalResources.map((resource, index) => (
              <motion.a
                key={resource.title}
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.05 }}
                className="group block p-5 rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.15]"
                style={{
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-[14px] font-medium text-white group-hover:text-white/90">
                    {resource.title}
                  </h3>
                  <ExternalLink
                    size={14}
                    className="text-white/30 group-hover:text-emerald-400/70 transition-colors flex-shrink-0"
                  />
                </div>
                <p className="text-[12px] text-white/40">
                  {resource.description}
                </p>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="text-[24px] font-medium mb-4">
            Not sure where you stand?
          </h2>
          <p className="text-[15px] text-white/50 mb-8">
            Take our free assessment to understand which parts of the EU Space
            Act apply to your operations.
          </p>
          <Link
            href="/assessment"
            className="inline-flex items-center justify-center px-8 py-4 bg-emerald-500 text-white text-[15px] font-medium rounded-full transition-all duration-200 hover:bg-emerald-400 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          >
            Start Assessment
          </Link>
        </div>
      </section>
    </main>
  );
}
