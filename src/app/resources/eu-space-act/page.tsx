"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import {
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  Check,
  ChevronRight,
} from "lucide-react";

const keyStats = [
  { value: "119", label: "Articles" },
  { value: "10", label: "Annexes" },
  { value: "2%", label: "Max Penalty (of global turnover)" },
  { value: "27", label: "EU Member States" },
];

const scopeItems = [
  {
    title: "Satellite Operators",
    description:
      "Any entity operating spacecraft from EU territory or under EU jurisdiction",
    included: true,
  },
  {
    title: "Launch Service Providers",
    description: "Companies providing launch services from EU launch sites",
    included: true,
  },
  {
    title: "Ground Segment Operators",
    description:
      "Operators of mission control, TT&C stations, and data processing facilities",
    included: true,
  },
  {
    title: "In-Orbit Servicing",
    description:
      "Spacecraft performing proximity operations, refueling, or debris removal",
    included: true,
  },
  {
    title: "Space Tourism",
    description: "Suborbital and orbital human spaceflight operations",
    included: true,
  },
  {
    title: "Foreign Operators",
    description:
      "Non-EU entities operating in EU airspace or serving EU customers",
    included: true,
  },
];

const chapters = [
  {
    number: "I",
    title: "General Provisions",
    articles: "1-3",
    description: "Scope, definitions, and objectives of the regulation",
  },
  {
    number: "II",
    title: "Authorization Regime",
    articles: "4-18",
    description:
      "Licensing requirements, application process, conditions, and transfer procedures",
  },
  {
    number: "III",
    title: "Registry & Tracking",
    articles: "19-31",
    description:
      "EU Space Object Registry, orbital data sharing, and tracking obligations",
  },
  {
    number: "IV",
    title: "Cybersecurity",
    articles: "32-38",
    description:
      "Security requirements, incident reporting, and vulnerability management",
  },
  {
    number: "V",
    title: "Space Debris Mitigation",
    articles: "39-47",
    description:
      "Design requirements, collision avoidance, and end-of-life disposal",
  },
  {
    number: "VI",
    title: "Environmental Sustainability",
    articles: "48-56",
    description:
      "Life-cycle assessment, emissions reporting, and sustainability standards",
  },
  {
    number: "VII",
    title: "Insurance & Liability",
    articles: "57-68",
    description:
      "Mandatory coverage, third-party liability, and financial security requirements",
  },
  {
    number: "VIII",
    title: "Supervision & Enforcement",
    articles: "69-82",
    description:
      "National competent authorities, inspections, audits, and penalties",
  },
  {
    number: "IX",
    title: "International Cooperation",
    articles: "83-95",
    description:
      "Coordination with UN COPUOS, bilateral agreements, and mutual recognition",
  },
  {
    number: "X",
    title: "Final Provisions",
    articles: "96-119",
    description: "Transitional measures, delegated acts, and entry into force",
  },
];

export default function EUSpaceActPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="transition-opacity duration-300 hover:opacity-70"
            >
              <Logo size={24} className="text-white" />
            </Link>
            <Link
              href="/resources"
              className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Resources</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 md:px-12 border-b border-white/[0.06]">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href="/resources"
              className="inline-flex items-center gap-2 text-[12px] text-white/40 hover:text-white/60 transition-colors mb-6"
            >
              <span>Resources</span>
              <ChevronRight size={12} />
              <span>EU Space Act</span>
            </Link>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-light tracking-[-0.02em] mb-6">
              EU Space Act Overview
            </h1>
            <p className="text-[17px] text-white/50 leading-relaxed mb-8">
              The European Union Space Act (COM(2025) 335) establishes the first
              comprehensive regulatory framework for commercial space activities
              in Europe. It introduces mandatory authorization, safety
              standards, and environmental requirements for all space operators
              under EU jurisdiction.
            </p>
            <a
              href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335:FIN"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[14px] text-white/70 hover:text-white transition-colors"
            >
              <span>Read the full legal text</span>
              <ExternalLink size={14} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="py-12 px-6 md:px-12 border-b border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-[900px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {keyStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-[36px] font-light text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-[12px] text-white/40 uppercase tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="py-16 px-6 md:px-12 border-b border-white/[0.06]">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-8">
            Why It Matters
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-amber-400" size={20} />
                <h3 className="text-[16px] font-medium text-amber-400">
                  Before the EU Space Act
                </h3>
              </div>
              <ul className="space-y-3 text-[14px] text-white/60">
                <li>
                  • Fragmented national regulations across 27 member states
                </li>
                <li>• No unified authorization process for operators</li>
                <li>• Inconsistent debris mitigation standards</li>
                <li>• Limited liability framework for space activities</li>
                <li>• No mandatory cybersecurity requirements</li>
              </ul>
            </div>
            <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Check className="text-emerald-400" size={20} />
                <h3 className="text-[16px] font-medium text-emerald-400">
                  After the EU Space Act
                </h3>
              </div>
              <ul className="space-y-3 text-[14px] text-white/60">
                <li>• Single market for space services across the EU</li>
                <li>• One authorization valid in all member states</li>
                <li>• Harmonized debris mitigation requirements</li>
                <li>• Clear liability rules and insurance minimums</li>
                <li>• Mandatory cybersecurity and incident reporting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Scope */}
      <section className="py-16 px-6 md:px-12 border-b border-white/[0.06]">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-3">
            Who Is Affected?
          </h2>
          <p className="text-[15px] text-white/50 mb-8">
            The regulation applies to any space activity conducted from EU
            territory, by EU-registered entities, or serving EU customers.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {scopeItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={14} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-[14px] font-medium text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[13px] text-white/40">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Structure */}
      <section className="py-16 px-6 md:px-12 border-b border-white/[0.06]">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-3">
            Structure of the Regulation
          </h2>
          <p className="text-[15px] text-white/50 mb-8">
            The EU Space Act is organized into 10 chapters covering all aspects
            of space operations.
          </p>
          <div className="space-y-3">
            {chapters.map((chapter, index) => (
              <motion.div
                key={chapter.number}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.03 }}
                className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg hover:bg-white/[0.03] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <span className="text-[14px] font-mono text-white/60">
                    {chapter.number}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-[15px] font-medium text-white">
                      {chapter.title}
                    </h3>
                    <span className="text-[10px] font-mono text-white/30 bg-white/[0.05] px-2 py-0.5 rounded">
                      Art. {chapter.articles}
                    </span>
                  </div>
                  <p className="text-[13px] text-white/40">
                    {chapter.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Obligations */}
      <section className="py-16 px-6 md:px-12 border-b border-white/[0.06]">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-8">
            Key Obligations Summary
          </h2>
          <div className="prose prose-invert max-w-none">
            <div className="space-y-8 text-[15px] text-white/70 leading-relaxed">
              <div>
                <h3 className="text-[17px] font-medium text-white mb-3">
                  1. Mandatory Authorization
                </h3>
                <p>
                  All space activities require prior authorization from a
                  National Competent Authority (NCA). Applications must include
                  technical specifications, financial viability assessment,
                  debris mitigation plan, and third-party liability insurance.
                  Authorizations are valid across all EU member states under the
                  mutual recognition principle.
                </p>
              </div>
              <div>
                <h3 className="text-[17px] font-medium text-white mb-3">
                  2. Registration Requirements
                </h3>
                <p>
                  All space objects must be registered in the EU Space Object
                  Registry within 30 days of launch. Operators must provide
                  orbital parameters, mission purpose, and contact information.
                  This data feeds into the EU Space Surveillance and Tracking
                  (SST) system.
                </p>
              </div>
              <div>
                <h3 className="text-[17px] font-medium text-white mb-3">
                  3. Debris Mitigation
                </h3>
                <p>
                  Spacecraft must be designed with end-of-life disposal
                  capability. LEO satellites must deorbit within 5 years of
                  mission end (stricter than the 25-year guideline). Operators
                  must demonstrate collision avoidance capability and
                  participate in conjunction assessment processes.
                </p>
              </div>
              <div>
                <h3 className="text-[17px] font-medium text-white mb-3">
                  4. Cybersecurity
                </h3>
                <p>
                  Space systems must implement security-by-design principles.
                  Operators must conduct regular vulnerability assessments,
                  maintain incident response plans, and report security
                  incidents to the EU Agency for Cybersecurity (ENISA) within 24
                  hours.
                </p>
              </div>
              <div>
                <h3 className="text-[17px] font-medium text-white mb-3">
                  5. Environmental Reporting
                </h3>
                <p>
                  Operators must conduct Life Cycle Assessments (LCA) for
                  spacecraft and launch vehicles. Annual sustainability reports
                  are required, covering emissions, resource consumption, and
                  debris generation. This aligns with the EU Taxonomy for
                  sustainable activities.
                </p>
              </div>
              <div>
                <h3 className="text-[17px] font-medium text-white mb-3">
                  6. Insurance & Liability
                </h3>
                <p>
                  Mandatory third-party liability insurance with minimum
                  coverage amounts based on mission risk profile. The regulation
                  clarifies liability for in-orbit collisions and establishes a
                  compensation framework for damage caused by space objects.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Penalties */}
      <section className="py-16 px-6 md:px-12 border-b border-white/[0.06]">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-8">
            Enforcement & Penalties
          </h2>
          <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl">
            <p className="text-[15px] text-white/70 leading-relaxed mb-6">
              Non-compliance can result in significant penalties, including:
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-[24px] font-light text-red-400 mb-2">
                  Up to 2%
                </div>
                <p className="text-[13px] text-white/50">
                  of annual global turnover for serious violations
                </p>
              </div>
              <div>
                <div className="text-[24px] font-light text-red-400 mb-2">
                  €10M+
                </div>
                <p className="text-[13px] text-white/50">
                  fixed penalties for specific breaches
                </p>
              </div>
              <div>
                <div className="text-[24px] font-light text-red-400 mb-2">
                  Revocation
                </div>
                <p className="text-[13px] text-white/50">
                  of authorization for repeated non-compliance
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="text-[24px] font-light mb-4">
            Understand your obligations
          </h2>
          <p className="text-[15px] text-white/50 mb-8">
            Take our free assessment to identify which requirements apply to
            your specific operations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-black bg-white px-8 py-4 rounded-full hover:bg-white/90 transition-all duration-300"
            >
              Start Assessment
              <span>→</span>
            </Link>
            <Link
              href="/resources/timeline"
              className="inline-flex items-center gap-2 text-[15px] text-white/60 hover:text-white transition-colors"
            >
              View Timeline
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
