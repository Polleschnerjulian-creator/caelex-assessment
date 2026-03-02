"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  FileCheck,
  Database,
  Shield,
  Orbit,
  Leaf,
  ShieldCheck,
  Eye,
  Bell,
  Scale,
} from "lucide-react";

// ============================================================================
// DATA
// ============================================================================

const MODULES = [
  {
    id: "authorization",
    number: "/01",
    name: "Authorization",
    headline: "Multi-jurisdictional licensing, automated.",
    description:
      "Map your operations to NCA requirements across 10 European jurisdictions. Generate pre-authorization checklists, track application status, and manage ongoing obligations — from first filing to renewal.",
    articles: "Art. 6–16, 32–39, 105–108",
    icon: FileCheck,
    href: "/dashboard/modules/authorization",
  },
  {
    id: "cybersecurity",
    number: "/02",
    name: "Cybersecurity & NIS2",
    headline: "24h incident response. Zero blind spots.",
    description:
      "Classify your entity under NIS2. Map 51 security requirements to your ground and space segments. Automate the 24h early warning, 72h notification, and 30-day final report pipeline.",
    articles: "Art. 74–95 · NIS2 Art. 21, 23",
    icon: Shield,
    href: "/dashboard/modules/cybersecurity",
    featured: true,
  },
  {
    id: "debris",
    number: "/03",
    name: "Debris Mitigation",
    headline: "Disposal planning meets real-time tracking.",
    description:
      "IADC and ISO 24113 compliance scoring. End-of-life disposal timelines, passivation checklists, collision probability assessments, and 5-year deorbit planning for every asset in your constellation.",
    articles: "Art. 58–72, 101–103",
    icon: Orbit,
    href: "/dashboard/modules/debris",
  },
  {
    id: "insurance",
    number: "/04",
    name: "Insurance & Liability",
    headline: "Coverage that matches your risk profile.",
    description:
      "Calculate minimum TPL requirements per jurisdiction. Track policy status across launch, in-orbit, and re-entry phases. Monitor state guarantee mechanisms and coverage gaps in real time.",
    articles: "Art. 44–51",
    icon: Scale,
    href: "/dashboard/modules/insurance",
  },
  {
    id: "environmental",
    number: "/05",
    name: "Environmental",
    headline: "Lifecycle impact, quantified.",
    description:
      "Annex III environmental footprint calculator. Assess launch emissions, orbital debris contribution, and re-entry casualty risk. Generate EU-compliant environmental impact documentation.",
    articles: "Art. 96–100",
    icon: Leaf,
    href: "/dashboard/modules/environmental",
  },
  {
    id: "registration",
    number: "/06",
    name: "Registration",
    headline: "URSO registry compliance, automated.",
    description:
      "Automated data validation against UN Registry requirements. Track registration status, manage notifications of change, and ensure continuous compliance with Art. 24 obligations.",
    articles: "Art. 24",
    icon: Database,
    href: "/dashboard/modules/registration",
  },
  {
    id: "supervision",
    number: "/07",
    name: "Supervision & Reporting",
    headline: "Audit trail from day one.",
    description:
      "Incident reporting workflows, NCA submission tracking, and full audit trail with cryptographic integrity. Every compliance action timestamped, attributed, and export-ready.",
    articles: "Art. 26–31, 40–43, 52–57",
    icon: Eye,
    href: "/dashboard/modules/supervision",
  },
  {
    id: "nis2",
    number: "/08",
    name: "NIS2 Directive",
    headline: "Space-sector NIS2, purpose-built.",
    description:
      "Essential vs. important entity classification. SATCOM, ground infrastructure, and launch service scoping. Penalties up to EUR 10M or 2% of turnover — we map every obligation so you don't miss one.",
    articles: "NIS2 Art. 2–3, 20–21, 23, 27, 29",
    icon: ShieldCheck,
    href: "/dashboard/modules/nis2",
  },
  {
    id: "regulatory",
    number: "/09",
    name: "Regulatory Intelligence",
    headline: "Every change. Every jurisdiction. Real time.",
    description:
      "Continuous monitoring of regulatory developments across the EU Space Act, NIS2, and 10 national space laws. Impact analysis, alert system, and automatic re-scoring when regulations change.",
    articles: "Art. 104, 114–119",
    icon: Bell,
    href: "/dashboard/modules/regulatory",
  },
];

// ============================================================================
// ANIMATION
// ============================================================================

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

function AnimatedDiv({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        ...fadeUp,
        visible: {
          ...fadeUp.visible,
          transition: { ...fadeUp.visible.transition, delay },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ModulesShowcase() {
  return (
    <section className="bg-white pt-4 pb-32 md:pb-44">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Section header — Palantir "Our Software" style */}
        <AnimatedDiv className="mb-20">
          <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium tracking-[-0.02em] text-[#111827]">
            Our Modules
          </h2>
        </AnimatedDiv>

        {/* Module list */}
        <div className="space-y-0">
          {MODULES.map((mod, i) => (
            <AnimatedDiv key={mod.id} delay={i * 0.04}>
              <Link href={mod.href} className="group block">
                <div className="grid md:grid-cols-[80px_1fr_1fr] lg:grid-cols-[80px_280px_1fr_44px] gap-4 md:gap-8 items-start py-8 md:py-10 border-t border-[#E5E7EB] group-hover:border-[#D1D5DB] transition-colors">
                  {/* Number */}
                  <span className="text-body text-[#C0C5CF] font-mono hidden md:block pt-1">
                    {mod.number}
                  </span>

                  {/* Title + icon */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB] group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-colors duration-300 flex-shrink-0 mt-0.5">
                      <mod.icon
                        size={18}
                        className="text-[#9CA3AF] group-hover:text-emerald-600 transition-colors duration-300"
                      />
                    </div>
                    <div>
                      <h3 className="text-heading md:text-display-sm font-medium text-[#111827] group-hover:text-emerald-700 transition-colors duration-300 leading-tight">
                        {mod.name}
                      </h3>
                      <p className="text-caption text-[#9CA3AF] font-mono mt-1.5">
                        {mod.articles}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="md:pl-0">
                    <p className="text-subtitle font-medium text-[#111827] mb-1.5 leading-snug">
                      {mod.headline}
                    </p>
                    <p className="text-body text-[#4B5563] leading-relaxed max-w-xl">
                      {mod.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="hidden lg:flex items-center justify-end pt-1">
                    <ArrowRight
                      size={20}
                      className="text-[#D1D5DB] group-hover:text-[#111827] group-hover:translate-x-1 transition-all duration-300"
                    />
                  </div>
                </div>
              </Link>
            </AnimatedDiv>
          ))}

          {/* Bottom border */}
          <div className="border-t border-[#E5E7EB]" />
        </div>

        {/* CTA */}
        <AnimatedDiv className="mt-16 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Link
            href="/assessment"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#111827] text-white text-subtitle font-medium hover:bg-[#374151] transition-colors"
          >
            Start Free Assessment
            <ArrowRight size={16} />
          </Link>
          <p className="text-body text-[#9CA3AF] max-w-md">
            Identify which modules apply to your organization in under 5
            minutes. No account required.
          </p>
        </AnimatedDiv>
      </div>
    </section>
  );
}
