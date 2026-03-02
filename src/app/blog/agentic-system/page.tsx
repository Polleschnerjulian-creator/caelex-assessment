"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Shield,
  Activity,
  Database,
  FileCheck,
  Radio,
  Satellite,
  Lock,
  Eye,
  Zap,
  GitBranch,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Server,
  Cpu,
  Network,
} from "lucide-react";

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

function AnimatedSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// DATA
// ============================================================================

const CAPABILITIES = [
  {
    icon: Activity,
    title: "Continuous Monitoring",
    description:
      "Real-time telemetry ingestion from satellite buses, ground stations, and mission control systems. No polling, no batching — continuous.",
    metric: "< 200ms",
    metricLabel: "ingestion latency",
  },
  {
    icon: Shield,
    title: "Regulatory Mapping",
    description:
      "Every data point is automatically mapped to the relevant articles of the EU Space Act, NIS2 Directive, and national space laws across 10 jurisdictions.",
    metric: "119",
    metricLabel: "articles covered",
  },
  {
    icon: FileCheck,
    title: "Evidence Generation",
    description:
      "Transforms raw operational data into structured, audit-ready compliance evidence with full traceability — from sensor to article.",
    metric: "100%",
    metricLabel: "audit trail",
  },
  {
    icon: Lock,
    title: "Zero-Trust Architecture",
    description:
      "The agent runs inside your perimeter. Data is encrypted at rest and in transit. Compliance evidence is cryptographically signed before transmission.",
    metric: "AES-256",
    metricLabel: "encryption",
  },
  {
    icon: Database,
    title: "Intelligent Classification",
    description:
      "Automatically classifies your entity type, determines applicable regime (standard vs. light), and identifies which of the 9 compliance modules apply.",
    metric: "7",
    metricLabel: "operator types",
  },
  {
    icon: Zap,
    title: "Autonomous Remediation",
    description:
      "When compliance gaps are detected, the agent generates remediation plans with prioritized actions, timelines, and documentation templates.",
    metric: "< 60s",
    metricLabel: "gap-to-plan",
  },
];

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "Deploy",
    subtitle: "Agent Installation",
    description:
      "A lightweight agent is deployed into your infrastructure — on-premise, private cloud, or air-gapped environments. Single binary, no dependencies.",
    icon: Server,
    detail: "Docker, Kubernetes, or bare metal",
  },
  {
    step: "02",
    title: "Ingest",
    subtitle: "Data Collection",
    description:
      "The agent connects to your operational systems — CCSDS telemetry streams, SNMP endpoints, log aggregators, access control systems, and configuration management databases.",
    icon: Network,
    detail: "50+ protocol adapters",
  },
  {
    step: "03",
    title: "Analyze",
    subtitle: "Compliance Engine",
    description:
      "Collected data is processed through our regulatory intelligence engine. Each data point is validated against applicable articles, cross-referenced across jurisdictions, and scored for compliance.",
    icon: Cpu,
    detail: "3 compliance engines, 10 jurisdictions",
  },
  {
    step: "04",
    title: "Report",
    subtitle: "Evidence Delivery",
    description:
      "Structured compliance evidence is cryptographically signed and transmitted to the Caelex platform. Dashboards update in real time. Audit-ready reports generate automatically.",
    icon: BarChart3,
    detail: "Real-time dashboards + PDF export",
  },
];

const USE_CASES = [
  {
    icon: Radio,
    title: "Ground Station Operators",
    regulation: "NIS2 · EU Space Act Art. 14",
    description:
      "Ground stations are classified as critical infrastructure under NIS2. The Caelex agent monitors uptime, access logs, RF interference patterns, and physical security systems — generating continuous evidence of compliance with Art. 21 security measures.",
    tags: [
      "NIS2 Art. 21",
      "Critical Infrastructure",
      "Access Control",
      "Incident Response",
    ],
  },
  {
    icon: Satellite,
    title: "Satellite Constellation Operators",
    regulation: "EU Space Act Art. 5-9 · Art. 10-13",
    description:
      "For operators managing satellite fleets, the agent ingests TLE data, propulsion telemetry, and collision avoidance maneuvers to validate debris mitigation compliance, end-of-life disposal planning, and passivation readiness across every asset.",
    tags: [
      "Authorization",
      "Debris Mitigation",
      "Disposal Planning",
      "Fleet Management",
    ],
  },
  {
    icon: Eye,
    title: "SSA & Tracking Providers",
    regulation: "EU Space Act Art. 18-20",
    description:
      "Positional data providers must meet accuracy and availability standards. The agent validates data quality metrics, tracks service uptime, and documents integration with the EUSST network — ensuring continuous compliance with data provider obligations.",
    tags: [
      "Data Quality",
      "EUSST Integration",
      "Service Availability",
      "PDP Obligations",
    ],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function AgenticSystemPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.96]);
  const heroY = useTransform(scrollYProgress, [0, 0.6], [0, 60]);

  return (
    <div className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]">
      {/* ================================================================ */}
      {/* HERO — Dark cinematic section */}
      {/* ================================================================ */}
      <section
        ref={heroRef}
        className="relative min-h-[85vh] flex items-end overflow-hidden bg-[#0A0F1E]"
      >
        {/* Background image */}
        <motion.div
          className="absolute inset-0"
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        >
          <Image
            src="/images/blog/agentic-system.png"
            alt="Caelex Agentic System visualization"
            fill
            className="object-cover opacity-40"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1E] via-[#0A0F1E]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F1E]/80 to-transparent" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 pb-20 pt-40 w-full">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Back link */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-body mb-10"
            >
              <ArrowLeft size={14} />
              Back
            </Link>

            {/* Label */}
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-caption font-medium uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Product
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.05] tracking-[-0.03em] text-white max-w-4xl mb-6">
              Autonomous Compliance.{" "}
              <span className="text-white/40">Zero Manual Effort.</span>
            </h1>

            <p className="text-[clamp(1rem,2vw,1.25rem)] text-white/50 leading-relaxed max-w-2xl mb-10">
              The Caelex Agentic System deploys an autonomous agent into your
              infrastructure that continuously monitors operational data,
              validates it against regulatory requirements, and sends
              evidence-based compliance reports — fully automated.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#0A0F1E] text-subtitle font-medium hover:bg-white/90 transition-colors"
              >
                Request Demo
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/20 text-white/70 text-subtitle font-medium hover:border-white/40 hover:text-white transition-all"
              >
                Start Assessment
              </Link>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px rounded-xl overflow-hidden border border-white/[0.08]"
          >
            {[
              { value: "119", label: "EU Space Act Articles" },
              { value: "10", label: "Jurisdictions" },
              { value: "< 200ms", label: "Ingestion Latency" },
              { value: "24/7", label: "Autonomous Operation" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/[0.04] backdrop-blur-sm px-6 py-5"
              >
                <div className="text-display-sm font-medium text-white tracking-tight">
                  {stat.value}
                </div>
                <div className="text-caption text-white/35 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* THE PROBLEM */}
      {/* ================================================================ */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <AnimatedSection>
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <motion.p
                  variants={fadeUp}
                  className="text-body font-medium uppercase tracking-wider text-emerald-600 mb-4"
                >
                  The Problem
                </motion.p>
                <motion.h2
                  variants={fadeUp}
                  className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-medium leading-[1.15] tracking-[-0.02em] text-[#111827] mb-6"
                >
                  Regulatory compliance in space is manual, fragmented, and
                  reactive.
                </motion.h2>
                <motion.p
                  variants={fadeUp}
                  className="text-body-lg text-[#4B5563] leading-relaxed mb-8"
                >
                  Operators spend hundreds of hours per year compiling
                  compliance evidence from spreadsheets, emails, and
                  disconnected systems. By the time auditors arrive,
                  documentation is already outdated. Every regulatory change
                  requires re-examination of every process.
                </motion.p>
                <motion.div variants={fadeUp} className="space-y-4">
                  {[
                    {
                      icon: AlertTriangle,
                      text: "EU Space Act introduces 119 articles across 9 compliance modules",
                      color: "text-amber-500",
                    },
                    {
                      icon: Clock,
                      text: "NIS2 requires 24h incident notification — impossible with manual processes",
                      color: "text-red-500",
                    },
                    {
                      icon: GitBranch,
                      text: "10 national jurisdictions, each with overlapping and conflicting requirements",
                      color: "text-orange-500",
                    },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-3">
                      <item.icon
                        size={18}
                        className={`flex-shrink-0 mt-0.5 ${item.color}`}
                      />
                      <span className="text-body-lg text-[#4B5563]">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Visual: Before/After comparison */}
              <motion.div variants={fadeUp} className="space-y-4">
                {/* Before */}
                <div className="p-6 rounded-2xl bg-[#FEF2F2] border border-red-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-caption font-medium uppercase tracking-wider text-red-400">
                      Without Caelex
                    </span>
                  </div>
                  <div className="space-y-3">
                    {[
                      "Manual evidence collection from 15+ systems",
                      "Quarterly compliance reviews, always behind",
                      "6-12 months to prepare for audit",
                      "No real-time visibility into compliance posture",
                      "Regulatory changes discovered weeks late",
                    ].map((text) => (
                      <div
                        key={text}
                        className="flex items-center gap-3 text-body text-red-800/70"
                      >
                        <span className="w-1 h-1 rounded-full bg-red-300 flex-shrink-0" />
                        {text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* After */}
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-caption font-medium uppercase tracking-wider text-emerald-600">
                      With Caelex Agent
                    </span>
                  </div>
                  <div className="space-y-3">
                    {[
                      "Continuous, automated evidence from every system",
                      "Real-time compliance scoring, always current",
                      "Audit-ready in minutes, not months",
                      "Live dashboard across all 9 compliance modules",
                      "Regulatory changes mapped automatically",
                    ].map((text) => (
                      <div
                        key={text}
                        className="flex items-center gap-3 text-body text-emerald-800/70"
                      >
                        <CheckCircle2
                          size={14}
                          className="text-emerald-500 flex-shrink-0"
                        />
                        {text}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HOW IT WORKS — Pipeline */}
      {/* ================================================================ */}
      <section className="py-24 md:py-32 bg-[#F7F8FA]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <AnimatedSection>
            <motion.p
              variants={fadeUp}
              className="text-body font-medium uppercase tracking-wider text-[#9CA3AF] mb-3"
            >
              How It Works
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-medium leading-[1.15] tracking-[-0.02em] text-[#111827] mb-4 max-w-2xl"
            >
              From deployment to audit-ready evidence in four steps.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-body-lg text-[#4B5563] leading-relaxed mb-16 max-w-2xl"
            >
              The Caelex agent operates autonomously inside your infrastructure
              perimeter. No data leaves your network until it has been
              processed, validated, and cryptographically signed.
            </motion.p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PIPELINE_STEPS.map((step, i) => (
              <AnimatedSection key={step.step}>
                <motion.div
                  variants={fadeUp}
                  className="relative h-full p-6 rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300 group"
                >
                  {/* Step number */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[40px] font-medium tracking-[-0.04em] text-[#E5E7EB] group-hover:text-emerald-200 transition-colors duration-300">
                      {step.step}
                    </span>
                    <step.icon
                      size={20}
                      className="text-[#9CA3AF] group-hover:text-emerald-500 transition-colors duration-300"
                    />
                  </div>

                  {/* Content */}
                  <h3 className="text-heading font-medium text-[#111827] mb-1">
                    {step.title}
                  </h3>
                  <p className="text-caption font-medium uppercase tracking-wider text-emerald-600 mb-4">
                    {step.subtitle}
                  </p>
                  <p className="text-body text-[#4B5563] leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Detail tag */}
                  <div className="mt-auto pt-4 border-t border-[#F1F3F5]">
                    <span className="text-caption text-[#9CA3AF] font-mono">
                      {step.detail}
                    </span>
                  </div>

                  {/* Connector line (not on last) */}
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-[#E5E7EB]" />
                  )}
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* CAPABILITIES — Feature grid */}
      {/* ================================================================ */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <AnimatedSection>
            <motion.p
              variants={fadeUp}
              className="text-body font-medium uppercase tracking-wider text-[#9CA3AF] mb-3"
            >
              Capabilities
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-medium leading-[1.15] tracking-[-0.02em] text-[#111827] mb-4 max-w-3xl"
            >
              Built for the complexity of space regulatory compliance.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-body-lg text-[#4B5563] leading-relaxed mb-16 max-w-2xl"
            >
              Every capability is purpose-built for space operations — not
              adapted from generic compliance tooling.
            </motion.p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAPABILITIES.map((cap) => (
              <AnimatedSection key={cap.title}>
                <motion.div
                  variants={fadeUp}
                  className="h-full p-6 rounded-2xl bg-[#F7F8FA] border border-[#E5E7EB] hover:bg-white hover:border-[#D1D5DB] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-colors duration-300">
                      <cap.icon
                        size={20}
                        className="text-[#4B5563] group-hover:text-emerald-600 transition-colors duration-300"
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-heading-lg font-medium text-[#111827] tracking-tight font-mono">
                        {cap.metric}
                      </div>
                      <div className="text-micro uppercase tracking-wider text-[#9CA3AF]">
                        {cap.metricLabel}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-title font-medium text-[#111827] mb-2">
                    {cap.title}
                  </h3>
                  <p className="text-body text-[#4B5563] leading-relaxed">
                    {cap.description}
                  </p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* ARCHITECTURE DIAGRAM — Dark section */}
      {/* ================================================================ */}
      <section className="py-24 md:py-32 bg-[#0A0F1E] dark-section">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <AnimatedSection>
            <motion.p
              variants={fadeUp}
              className="text-body font-medium uppercase tracking-wider text-emerald-400/60 mb-3"
            >
              Architecture
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-medium leading-[1.15] tracking-[-0.02em] text-white mb-4 max-w-3xl"
            >
              Your data never leaves your perimeter until it&apos;s compliance
              evidence.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-body-lg text-white/45 leading-relaxed mb-16 max-w-2xl"
            >
              The agent runs entirely inside your infrastructure. Raw
              operational data is processed locally. Only structured, signed
              compliance evidence is transmitted to the Caelex platform.
            </motion.p>
          </AnimatedSection>

          {/* Architecture visualization */}
          <AnimatedSection>
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-white/[0.08] overflow-hidden"
            >
              {/* Header bar */}
              <div className="flex items-center gap-2 px-5 py-3 bg-white/[0.03] border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <span className="text-caption text-white/25 font-mono ml-3">
                  system-architecture.svg
                </span>
              </div>

              <div className="p-8 md:p-12">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Your Infrastructure */}
                  <div className="md:col-span-2 p-6 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <div className="flex items-center gap-2 mb-6">
                      <Lock size={14} className="text-amber-400/60" />
                      <span className="text-caption font-medium uppercase tracking-wider text-amber-400/60">
                        Your Infrastructure Perimeter
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 mb-6">
                      {/* Data Sources */}
                      <div className="space-y-3">
                        <span className="text-micro uppercase tracking-wider text-white/25">
                          Data Sources
                        </span>
                        {[
                          { label: "Telemetry Streams", proto: "CCSDS / gRPC" },
                          {
                            label: "Ground Station Logs",
                            proto: "Syslog / SNMP",
                          },
                          { label: "Access Control", proto: "LDAP / SAML" },
                          { label: "Config Management", proto: "REST API" },
                          { label: "Incident Records", proto: "Webhook" },
                        ].map((src) => (
                          <div
                            key={src.label}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                          >
                            <span className="text-caption text-white/60">
                              {src.label}
                            </span>
                            <span className="text-micro text-white/20 font-mono">
                              {src.proto}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Agent */}
                      <div className="flex flex-col">
                        <span className="text-micro uppercase tracking-wider text-white/25 mb-3">
                          Caelex Agent
                        </span>
                        <div className="flex-1 p-5 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/[0.05]">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-caption font-medium text-emerald-400">
                              Active
                            </span>
                          </div>
                          <div className="space-y-2.5">
                            {[
                              "Data Ingestion",
                              "Normalization",
                              "Regulatory Mapping",
                              "Evidence Synthesis",
                              "Crypto Signing",
                            ].map((step) => (
                              <div
                                key={step}
                                className="flex items-center gap-2"
                              >
                                <CheckCircle2
                                  size={12}
                                  className="text-emerald-500/60"
                                />
                                <span className="text-caption text-white/50">
                                  {step}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow out */}
                    <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/[0.06]">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-emerald-500/30" />
                      <span className="text-micro text-emerald-400/50 font-mono px-3">
                        signed evidence → TLS 1.3
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-emerald-500/30" />
                    </div>
                  </div>

                  {/* Caelex Platform */}
                  <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03]">
                    <div className="flex items-center gap-2 mb-6">
                      <Shield size={14} className="text-emerald-400" />
                      <span className="text-caption font-medium uppercase tracking-wider text-emerald-400">
                        Caelex Platform
                      </span>
                    </div>

                    <div className="space-y-3">
                      {[
                        {
                          label: "Compliance Dashboard",
                          desc: "Real-time scoring across 9 modules",
                        },
                        {
                          label: "Evidence Vault",
                          desc: "Immutable, timestamped records",
                        },
                        {
                          label: "Regulatory Engine",
                          desc: "119 articles, 10 jurisdictions",
                        },
                        {
                          label: "Audit Reports",
                          desc: "NCA-ready documentation",
                        },
                        {
                          label: "Gap Analysis",
                          desc: "Prioritized remediation plans",
                        },
                        {
                          label: "Alert System",
                          desc: "Compliance drift detection",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                        >
                          <div className="text-caption font-medium text-white/70">
                            {item.label}
                          </div>
                          <div className="text-micro text-white/30">
                            {item.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ================================================================ */}
      {/* USE CASES */}
      {/* ================================================================ */}
      <section className="py-24 md:py-32 bg-[#F7F8FA]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <AnimatedSection>
            <motion.p
              variants={fadeUp}
              className="text-body font-medium uppercase tracking-wider text-[#9CA3AF] mb-3"
            >
              Use Cases
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-medium leading-[1.15] tracking-[-0.02em] text-[#111827] mb-4 max-w-3xl"
            >
              Purpose-built for every type of space operator.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-body-lg text-[#4B5563] leading-relaxed mb-16 max-w-2xl"
            >
              Whether you operate ground stations, satellite constellations, or
              space situational awareness services — the Caelex agent adapts to
              your specific regulatory obligations.
            </motion.p>
          </AnimatedSection>

          <div className="grid lg:grid-cols-3 gap-6">
            {USE_CASES.map((uc) => (
              <AnimatedSection key={uc.title}>
                <motion.div
                  variants={fadeUp}
                  className="h-full p-8 rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300 group"
                >
                  <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] w-fit mb-6 group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-colors duration-300">
                    <uc.icon
                      size={24}
                      className="text-[#4B5563] group-hover:text-emerald-600 transition-colors duration-300"
                    />
                  </div>

                  <h3 className="text-heading font-medium text-[#111827] mb-2">
                    {uc.title}
                  </h3>
                  <p className="text-caption font-medium text-emerald-600 mb-4 font-mono">
                    {uc.regulation}
                  </p>
                  <p className="text-body text-[#4B5563] leading-relaxed mb-6">
                    {uc.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {uc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full bg-[#F1F3F5] text-micro text-[#4B5563]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* GROUND STATION IMAGE — Full bleed */}
      {/* ================================================================ */}
      <section className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <Image
          src="/images/blog/ground-station.png"
          alt="Ground station satellite dish — critical infrastructure under NIS2"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1E] via-[#0A0F1E]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-[1400px] mx-auto">
            <p className="text-caption font-medium uppercase tracking-wider text-white/40 mb-2">
              NIS2 · Critical Infrastructure
            </p>
            <p className="text-heading md:text-display-sm font-medium text-white max-w-xl">
              Ground stations are the frontline of space compliance. The Caelex
              agent ensures they stay that way.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* CTA — Final conversion section */}
      {/* ================================================================ */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center">
              <motion.p
                variants={fadeUp}
                className="text-body font-medium uppercase tracking-wider text-emerald-600 mb-4"
              >
                Get Started
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.1] tracking-[-0.02em] text-[#111827] mb-6"
              >
                Deploy autonomous compliance infrastructure in days, not months.
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="text-body-lg text-[#4B5563] leading-relaxed mb-10"
              >
                Start with a free compliance assessment to identify your
                regulatory obligations across the EU Space Act, NIS2 Directive,
                and national space laws. Then deploy the Caelex agent to
                automate evidence collection and reporting.
              </motion.p>
              <motion.div
                variants={fadeUp}
                className="flex flex-wrap items-center justify-center gap-4"
              >
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#111827] text-white text-subtitle font-medium hover:bg-[#374151] transition-colors"
                >
                  Request Demo
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-[#D1D5DB] text-[#4B5563] text-subtitle font-medium hover:border-[#111827] hover:text-[#111827] transition-all"
                >
                  Start Free Assessment
                </Link>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
