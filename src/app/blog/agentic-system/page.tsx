"use client";

import { useRef, Fragment } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";

// ============================================================================
// ANIMATION
// ============================================================================

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
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

const PROBLEMS = [
  {
    number: "01",
    title: "Manual",
    body: "A human copies numbers from Mission Control into a spreadsheet, emails it to a compliance officer, who manually enters it into whatever tool they use. This happens quarterly if they're diligent. Annually if they're not.",
  },
  {
    number: "02",
    title: "Unverifiable",
    body: 'A regulator asks "What was your orbital altitude on March 15?" — the operator provides a number. Was it real? Was it current? Did anyone modify it? There is no chain of custody, no cryptographic proof, no independent verification.',
  },
  {
    number: "03",
    title: "A Snapshot",
    body: "Annual audits capture one moment in time. What happened the other 364 days? An operator could be non-compliant for months — a decaying orbit, a failed thruster, an unreported cyber incident — and nobody would know until the next audit cycle.",
  },
];

const COLLECTORS = [
  {
    id: "orbit",
    number: "/01",
    name: "Orbit & Debris",
    sources: "Mission Control System, Flight Dynamics, Conjunction Assessment",
    protocols: "CCSDS MO · REST API · PostgreSQL · TDM",
    frequency: "Every 15 minutes",
    dataPoints: [
      { point: "Orbital altitude", ref: "Art. 68", freq: "15 min" },
      { point: "Remaining fuel mass", ref: "Art. 70", freq: "1 hour" },
      { point: "Thruster status", ref: "Art. 66", freq: "15 min" },
      { point: "CA events (Pc > 1e-4)", ref: "Art. 102", freq: "Real-time" },
      { point: "Estimated orbital lifetime", ref: "Art. 68", freq: "Daily" },
      { point: "Deorbit capability", ref: "Art. 72", freq: "Daily" },
    ],
    compression: {
      raw: "800 MB/day",
      extracted: "4 KB/day",
      ratio: "1 : 200,000",
    },
  },
  {
    id: "cyber",
    number: "/02",
    name: "Cybersecurity",
    sources:
      "SIEM (Splunk, Sentinel, QRadar), EDR, Vulnerability Scanner, Patch Management",
    protocols: "REST API · Syslog · STIX/TAXII · SNMP",
    frequency: "Real-time for incidents, hourly for posture",
    dataPoints: [
      {
        point: "Security incidents (30d)",
        ref: "NIS2 Art. 21",
        freq: "Real-time",
      },
      { point: "MTTD / MTTR", ref: "NIS2 Art. 23", freq: "Daily" },
      {
        point: "Critical vulns (unpatched)",
        ref: "NIS2 Art. 21(2)(e)",
        freq: "Hourly",
      },
      { point: "MFA adoption rate", ref: "NIS2 Art. 21(2)(j)", freq: "Daily" },
      {
        point: "Backup verification",
        ref: "NIS2 Art. 21(2)(c)",
        freq: "Daily",
      },
      { point: "Encryption status", ref: "NIS2 Art. 21(2)(h)", freq: "Daily" },
    ],
    compression: {
      raw: "1.2 TB/day",
      extracted: "6 KB/day",
      ratio: "1 : 200,000,000",
    },
  },
  {
    id: "ground",
    number: "/03",
    name: "Ground Station",
    sources:
      "Ground Station Management (ATOS, Kongsberg), Antenna Control, Network Management",
    protocols: "REST API · SNMP · Syslog · DB Read",
    frequency: "Per-pass and daily aggregates",
    dataPoints: [
      { point: "Contact success rate", ref: "Art. 64", freq: "Per pass" },
      { point: "Ground station availability", ref: "Art. 64", freq: "Daily" },
      { point: "Command uplink success", ref: "Art. 66", freq: "Daily" },
      { point: "Time since last contact", ref: "Art. 64", freq: "Real-time" },
      { point: "Signal margin (dB)", ref: "ITU RR", freq: "Per pass" },
      { point: "Frequency coordination", ref: "Art. 70", freq: "Monthly" },
    ],
    compression: {
      raw: "50 GB/day",
      extracted: "1.5 KB/day",
      ratio: "1 : 33,000,000",
    },
  },
  {
    id: "documents",
    number: "/04",
    name: "Document Watch",
    sources: "Network Drives, SharePoint, Confluence, Certificate Stores",
    protocols: "inotify · SharePoint API · REST API",
    frequency: "Real-time (file system events)",
    dataPoints: [
      { point: "Certificate expiry dates", ref: "Art. 7", freq: "Event" },
      { point: "Insurance policy renewal", ref: "Art. 8", freq: "Event" },
      { point: "Export license status", ref: "ITAR/EAR", freq: "Event" },
      {
        point: "Training certifications",
        ref: "NIS2 Art. 21(2)(g)",
        freq: "Event",
      },
      { point: "Audit report metadata", ref: "Art. 29", freq: "Event" },
      { point: "Policy document hashes", ref: "NIS2 Art. 21", freq: "Event" },
    ],
    compression: {
      raw: "Variable",
      extracted: "0.5 KB/event",
      ratio: "Docs never leave",
    },
  },
];

const TRUST_LEVELS = [
  {
    level: 6,
    score: "0.98",
    label: "Agent + Cross-Verification",
    desc: "Sentinel says 548km, Space-Track confirms 548km",
  },
  {
    level: 5,
    score: "0.92",
    label: "Agent-Collected",
    desc: "Extracted from Mission Control — no human intervention",
  },
  {
    level: 4,
    score: "0.90",
    label: "Platform-Generated",
    desc: "Caelex generated from assessment data — reproducible",
  },
  {
    level: 3,
    score: "0.88",
    label: "Public API Only",
    desc: "Space-Track TLE data — independent but limited",
  },
  {
    level: 2,
    score: "0.75",
    label: "Operator Push",
    desc: "CI/CD pipeline — automated but source unverified",
  },
  {
    level: 1,
    score: "0.65",
    label: "Manual Upload",
    desc: "Compliance officer uploaded PDF — content unverified",
  },
  {
    level: 0,
    score: "0.50",
    label: "Self-Assessment",
    desc: "Operator clicked 'Yes' in checklist — just a claim",
  },
];

const EVIDENCE_PACKET = `{
  "packet_id": "sp_2026031514320744_58421_orbit",
  "sentinel_id": "snt_a7f3d09e-4b21-4c89-9e67",
  "data": {
    "altitude_km": 548.317,
    "remaining_fuel_pct": 57.66,
    "thruster_status": "NOMINAL",
    "estimated_lifetime_yr": 4.2
  },
  "regulation_mapping": [
    { "ref": "art_68", "status": "COMPLIANT" },
    { "ref": "art_70", "status": "COMPLIANT" },
    { "ref": "art_72", "status": "COMPLIANT" }
  ],
  "integrity": {
    "content_hash": "sha256:a7f3d09e...",
    "previous_hash": "sha256:059669e4...",
    "chain_position": 147832,
    "signature": "ed25519:MGUCMQCxN8T7..."
  }
}`;

// ============================================================================
// COMPONENT
// ============================================================================

export default function SentinelPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div className="min-h-screen bg-white text-[#111]">
      {/* ============================================================== */}
      {/* HERO */}
      {/* ============================================================== */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col justify-end bg-[#0A0A0A] overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 opacity-[0.03]"
          style={{ y: heroY }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.15) 59px, rgba(255,255,255,0.15) 60px),
                              repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.15) 59px, rgba(255,255,255,0.15) 60px)`,
            }}
          />
        </motion.div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 pb-16 md:pb-24 pt-32 w-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/25 hover:text-white/50 transition-colors text-body mb-16"
            >
              <ArrowLeft size={14} />
              Back
            </Link>

            <div className="mb-8">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-[13px] font-mono uppercase tracking-[0.3em] text-white/30 mb-6"
              >
                Caelex Sentinel
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-[clamp(2.5rem,7vw,6rem)] font-medium leading-[1.0] tracking-[-0.04em] text-white"
              >
                Autonomous compliance
                <br />
                evidence collection.
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-[clamp(0.95rem,1.8vw,1.15rem)] text-white/40 leading-relaxed max-w-3xl mb-16"
            >
              A lightweight, cryptographically-sealed compliance data extraction
              layer that transforms raw operational telemetry into verified,
              regulation-mapped evidence — without ever exposing sensitive data
              to the outside world.
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="flex flex-wrap gap-12 md:gap-20"
            >
              {[
                { value: "2 TB", label: "raw data per day" },
                { value: "12 KB", label: "evidence transmitted" },
                { value: "147,832", label: "sealed packets" },
                { value: "0", label: "inbound ports" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[clamp(1.5rem,3vw,2.25rem)] font-medium text-white tracking-tight font-mono">
                    {s.value}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/20 mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.06]" />
      </section>

      {/* ============================================================== */}
      {/* THE PROBLEM */}
      {/* ============================================================== */}
      <section className="py-28 md:py-40 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <Section>
            <motion.p
              variants={fadeUp}
              className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#999] mb-4"
            >
              The Problem
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.1] tracking-[-0.03em] text-[#111] mb-6 max-w-4xl"
            >
              Compliance in space is manual, unverifiable,{" "}
              <span className="text-[#C0C0C0]">
                and a snapshot of one day per year.
              </span>
            </motion.h2>
          </Section>

          <div className="grid md:grid-cols-3 gap-px mt-16 bg-[#E5E5E5] rounded-2xl overflow-hidden">
            {PROBLEMS.map((p) => (
              <Section key={p.number}>
                <motion.div
                  variants={fadeUp}
                  className="bg-white p-8 md:p-10 h-full"
                >
                  <span className="text-[11px] font-mono text-[#CCC] tracking-wider">
                    {p.number}
                  </span>
                  <h3 className="text-[clamp(1.25rem,2vw,1.5rem)] font-medium text-[#111] mt-3 mb-4 tracking-[-0.02em]">
                    {p.title}
                  </h3>
                  <p className="text-[14px] text-[#666] leading-relaxed">
                    {p.body}
                  </p>
                </motion.div>
              </Section>
            ))}
          </div>

          <Section className="mt-16">
            <motion.p
              variants={fadeUp}
              className="text-[clamp(1.1rem,2vw,1.35rem)] font-medium text-[#111] tracking-[-0.01em]"
            >
              Sentinel eliminates all three problems simultaneously.
            </motion.p>
          </Section>
        </div>
      </section>

      {/* ============================================================== */}
      {/* THE COMPRESSION — Hero stat */}
      {/* ============================================================== */}
      <section className="py-28 md:py-40 bg-[#FAFAFA] border-y border-[#E5E5E5]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <Section className="text-center">
            <motion.p
              variants={fadeUp}
              className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#999] mb-8"
            >
              Compliance Extraction
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8"
            >
              <span className="text-[clamp(3rem,8vw,7rem)] font-medium tracking-[-0.04em] text-[#111] font-mono">
                2 TB
              </span>
              <span className="text-[clamp(1.5rem,3vw,2.5rem)] text-[#CCC]">
                →
              </span>
              <span className="text-[clamp(3rem,8vw,7rem)] font-medium tracking-[-0.04em] text-[#111] font-mono">
                12 KB
              </span>
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="text-[14px] text-[#999] mt-6 max-w-xl mx-auto leading-relaxed"
            >
              99.9999994% of operational data stays inside your network. Only
              structured, signed compliance evidence is transmitted.
            </motion.p>
          </Section>
        </div>
      </section>

      {/* ============================================================== */}
      {/* ARCHITECTURE — Simplified visual */}
      {/* ============================================================== */}
      <section className="py-28 md:py-40 bg-[#0A0A0A]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <Section>
            <motion.p
              variants={fadeUp}
              className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/25 mb-4"
            >
              Architecture
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.1] tracking-[-0.03em] text-white mb-16 max-w-3xl"
            >
              Your data never leaves your perimeter{" "}
              <span className="text-white/25">
                until it&apos;s compliance evidence.
              </span>
            </motion.h2>
          </Section>

          <Section>
            <motion.div
              variants={fadeUp}
              className="rounded-xl border border-white/[0.08] overflow-hidden font-mono text-[12px]"
            >
              {/* Terminal chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white/[0.08]" />
                  <div className="w-2 h-2 rounded-full bg-white/[0.08]" />
                  <div className="w-2 h-2 rounded-full bg-white/[0.08]" />
                </div>
                <span className="text-white/15 ml-2 text-[11px]">
                  sentinel-topology.txt
                </span>
              </div>

              <div className="p-6 md:p-10 space-y-8">
                {/* Row 1: Sources */}
                <div>
                  <div className="text-white/20 text-[10px] uppercase tracking-[0.2em] mb-3">
                    Source Systems
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      "Mission Control",
                      "SIEM / SOC",
                      "Ground Station",
                      "Document Store",
                    ].map((s) => (
                      <div
                        key={s}
                        className="px-3 py-2 rounded border border-white/[0.06] bg-white/[0.02] text-white/40 text-center"
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center text-white/10">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-px h-6 bg-white/10" />
                    <span className="text-[10px] text-white/15">READ-ONLY</span>
                    <div className="w-px h-6 bg-white/10" />
                  </div>
                </div>

                {/* Row 2: Sentinel */}
                <div className="border border-white/[0.12] rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
                    <span className="text-white/60 text-[11px] uppercase tracking-[0.15em]">
                      Caelex Sentinel
                    </span>
                  </div>
                  <div className="grid md:grid-cols-4 gap-3">
                    {[
                      { step: "Collect", desc: "4 collector modules" },
                      { step: "Extract", desc: "Regulatory rule engine" },
                      { step: "Seal", desc: "SHA-256 + Ed25519" },
                      { step: "Transmit", desc: "mTLS 1.3 → HTTPS" },
                    ].map((s, i) => (
                      <div key={s.step} className="flex items-center gap-3">
                        <div className="px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08] flex-1">
                          <div className="text-white/50">{s.step}</div>
                          <div className="text-white/20 text-[10px] mt-0.5">
                            {s.desc}
                          </div>
                        </div>
                        {i < 3 && (
                          <span className="text-white/10 hidden md:block">
                            →
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-px h-6 bg-white/10" />
                    <span className="text-[10px] text-white/15 px-3 py-1 rounded border border-white/[0.06]">
                      outbound only · HTTPS 443 · no inbound · no SSH · no
                      tunnels
                    </span>
                    <div className="w-px h-6 bg-white/10" />
                  </div>
                </div>

                {/* Row 3: Caelex Platform */}
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    {
                      name: "Ingest API",
                      desc: "Verify signature, validate hash chain, store",
                    },
                    {
                      name: "Cross-Verification",
                      desc: "Space-Track · ESA DISCOS · LeoLabs · CelesTrak",
                    },
                    {
                      name: "Evidence Engine",
                      desc: "119 articles · 51 NIS2 req · 10 jurisdictions",
                    },
                  ].map((p) => (
                    <div
                      key={p.name}
                      className="px-3 py-2 rounded border border-white/[0.06] bg-white/[0.02]"
                    >
                      <div className="text-white/50">{p.name}</div>
                      <div className="text-white/20 text-[10px] mt-0.5">
                        {p.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </Section>
        </div>
      </section>

      {/* ============================================================== */}
      {/* COLLECTORS */}
      {/* ============================================================== */}
      <section className="py-28 md:py-40 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <Section>
            <motion.p
              variants={fadeUp}
              className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#999] mb-4"
            >
              Collector Modules
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.1] tracking-[-0.03em] text-[#111] mb-4 max-w-3xl"
            >
              Four specialized collectors.{" "}
              <span className="text-[#C0C0C0]">
                Each reads everything. Transmits almost nothing.
              </span>
            </motion.h2>
          </Section>

          <div className="mt-16 space-y-0">
            {COLLECTORS.map((col) => (
              <Section key={col.id}>
                <motion.div
                  variants={fadeUp}
                  className="border-t border-[#E5E5E5] py-10 md:py-14"
                >
                  <div className="grid lg:grid-cols-[240px_1fr] gap-8 lg:gap-16">
                    {/* Left: Name */}
                    <div>
                      <span className="text-[11px] font-mono text-[#CCC] tracking-wider">
                        {col.number}
                      </span>
                      <h3 className="text-[clamp(1.25rem,2vw,1.5rem)] font-medium text-[#111] mt-2 tracking-[-0.02em]">
                        {col.name}
                      </h3>
                      <p className="text-[12px] text-[#999] mt-2 leading-relaxed">
                        {col.sources}
                      </p>
                      <p className="text-[11px] font-mono text-[#CCC] mt-3">
                        {col.protocols}
                      </p>
                    </div>

                    {/* Right: Data + Compression */}
                    <div>
                      {/* Data points table */}
                      <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
                        <div className="grid grid-cols-[1fr_120px_100px] gap-px bg-[#E5E5E5]">
                          <div className="bg-[#FAFAFA] px-4 py-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#999]">
                            Data Point
                          </div>
                          <div className="bg-[#FAFAFA] px-4 py-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#999]">
                            Regulation
                          </div>
                          <div className="bg-[#FAFAFA] px-4 py-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#999]">
                            Frequency
                          </div>
                          {col.dataPoints.map((dp) => (
                            <Fragment key={dp.point}>
                              <div className="bg-white px-4 py-2.5 text-[13px] text-[#333]">
                                {dp.point}
                              </div>
                              <div className="bg-white px-4 py-2.5 text-[12px] font-mono text-[#999]">
                                {dp.ref}
                              </div>
                              <div className="bg-white px-4 py-2.5 text-[12px] font-mono text-[#999]">
                                {dp.freq}
                              </div>
                            </Fragment>
                          ))}
                        </div>
                      </div>

                      {/* Compression */}
                      <div className="flex items-center gap-6 mt-5 text-[12px] font-mono">
                        <span className="text-[#999]">
                          {col.compression.raw}
                        </span>
                        <span className="text-[#DDD]">→</span>
                        <span className="text-[#111] font-medium">
                          {col.compression.extracted}
                        </span>
                        <span className="text-[#CCC] ml-auto">
                          {col.compression.ratio}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Section>
            ))}
            <div className="border-t border-[#E5E5E5]" />
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* EVIDENCE PACKET */}
      {/* ============================================================== */}
      <section className="py-28 md:py-40 bg-[#FAFAFA] border-y border-[#E5E5E5]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <Section>
              <motion.p
                variants={fadeUp}
                className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#999] mb-4"
              >
                Cryptographic Integrity
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.03em] text-[#111] mb-6"
              >
                Every packet is sealed.{" "}
                <span className="text-[#C0C0C0]">
                  Tampering is mathematically impossible.
                </span>
              </motion.h2>
              <motion.div
                variants={fadeUp}
                className="space-y-5 text-[14px] text-[#666] leading-relaxed"
              >
                <p>
                  Every evidence packet contains a SHA-256 content hash, an
                  Ed25519 signature from the agent&apos;s private key, and a
                  reference to the previous packet&apos;s hash — creating an
                  unbroken, tamper-evident chain.
                </p>
                <p>
                  Modify any packet — the chain breaks. Delete any packet — the
                  gap is detected. Insert a fake — the signature fails. The
                  regulator can verify the entire history is authentic,
                  unmodified, and complete.
                </p>
              </motion.div>

              {/* Hash chain visual */}
              <motion.div
                variants={fadeUp}
                className="mt-10 flex items-center gap-2 overflow-hidden"
              >
                {[147830, 147831, 147832, 147833].map((n, i) => (
                  <div key={n} className="flex items-center gap-2">
                    <div className="px-3 py-2 rounded border border-[#E5E5E5] bg-white text-[11px] font-mono">
                      <div className="text-[#999]">#{n}</div>
                      <div className="text-[#111] mt-0.5">
                        hash: {["a1b2", "c3d4", "e5f6", "g7h8"][i]}
                      </div>
                    </div>
                    {i < 3 && (
                      <span className="text-[#DDD] text-[10px] font-mono flex-shrink-0">
                        ←
                      </span>
                    )}
                  </div>
                ))}
              </motion.div>
            </Section>

            {/* Code block */}
            <Section>
              <motion.div
                variants={fadeUp}
                className="rounded-xl border border-[#E5E5E5] overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F5F5F5] border-b border-[#E5E5E5]">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#DDD]" />
                    <div className="w-2 h-2 rounded-full bg-[#DDD]" />
                    <div className="w-2 h-2 rounded-full bg-[#DDD]" />
                  </div>
                  <span className="text-[#BBB] ml-2 text-[11px] font-mono">
                    evidence_packet.json
                  </span>
                </div>
                <pre className="p-5 text-[12px] font-mono leading-relaxed text-[#555] bg-white overflow-x-auto">
                  <code>{EVIDENCE_PACKET}</code>
                </pre>
              </motion.div>
            </Section>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* TRUST HIERARCHY */}
      {/* ============================================================== */}
      <section className="py-28 md:py-40 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <Section>
            <motion.p
              variants={fadeUp}
              className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#999] mb-4"
            >
              Trust Score
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.1] tracking-[-0.03em] text-[#111] mb-4 max-w-3xl"
            >
              Not all evidence is equal.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-[14px] text-[#666] leading-relaxed max-w-2xl mb-16"
            >
              A Verified Score of 61% built from Level 5–6 evidence is vastly
              more meaningful than a Declared Score of 82% built from Level 0
              self-assessment. Sentinel creates Level 5 and 6 evidence — the
              highest achievable trust.
            </motion.p>
          </Section>

          <div className="space-y-0">
            {TRUST_LEVELS.map((t) => (
              <Section key={t.level}>
                <motion.div
                  variants={fadeUp}
                  className={`grid grid-cols-[50px_80px_200px_1fr] md:grid-cols-[60px_80px_240px_1fr] gap-4 md:gap-8 items-baseline py-4 border-t border-[#E5E5E5] ${
                    t.level >= 5
                      ? "bg-[#FAFAFA] -mx-4 px-4 md:-mx-6 md:px-6 rounded"
                      : ""
                  }`}
                >
                  <span className="text-[24px] font-mono font-medium text-[#111] tracking-tight">
                    {t.level}
                  </span>
                  <span className="text-[14px] font-mono text-[#999]">
                    {t.score}
                  </span>
                  <span className="text-[14px] font-medium text-[#111]">
                    {t.label}
                  </span>
                  <span className="text-[13px] text-[#999] hidden md:block">
                    {t.desc}
                  </span>
                </motion.div>
              </Section>
            ))}
            <div className="border-t border-[#E5E5E5]" />
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* DEPLOYMENT */}
      {/* ============================================================== */}
      <section className="py-28 md:py-40 bg-[#0A0A0A]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <Section>
            <motion.p
              variants={fadeUp}
              className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/25 mb-4"
            >
              Deployment
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.1] tracking-[-0.03em] text-white mb-16 max-w-2xl"
            >
              One command.{" "}
              <span className="text-white/25">512 MB. Zero inbound ports.</span>
            </motion.h2>
          </Section>

          <Section>
            <motion.div
              variants={fadeUp}
              className="rounded-xl border border-white/[0.08] overflow-hidden font-mono text-[13px]"
            >
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
                <span className="text-white/15 text-[11px]">terminal</span>
              </div>
              <div className="p-6 text-white/50 leading-loose">
                <span className="text-white/20">$</span>{" "}
                <span className="text-white/70">docker run</span>{" "}
                <span className="text-white/30">-d \</span>
                <br />
                <span className="text-white/30">{"  "}--name</span>{" "}
                <span className="text-white/50">caelex-sentinel</span>{" "}
                <span className="text-white/30">\</span>
                <br />
                <span className="text-white/30">{"  "}--restart</span>{" "}
                <span className="text-white/50">unless-stopped</span>{" "}
                <span className="text-white/30">\</span>
                <br />
                <span className="text-white/30">{"  "}--memory</span>{" "}
                <span className="text-white/50">512m</span>{" "}
                <span className="text-white/30">--cpus 0.5 \</span>
                <br />
                <span className="text-white/30">{"  "}-e</span>{" "}
                <span className="text-white/50">
                  SENTINEL_TOKEN=snt_xxxxxxxxxxxx
                </span>{" "}
                <span className="text-white/30">\</span>
                <br />
                <span className="text-white/30">{"  "}-e</span>{" "}
                <span className="text-white/50">
                  COLLECTORS=orbit,cyber,ground,documents
                </span>{" "}
                <span className="text-white/30">\</span>
                <br />
                <span className="text-white/30">{"  "}</span>
                <span className="text-white/50">
                  registry.caelex.eu/sentinel:1.4.2
                </span>
              </div>
            </motion.div>
          </Section>

          {/* Requirements */}
          <Section className="mt-12">
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-xl overflow-hidden bg-white/[0.06]"
            >
              {[
                { label: "CPU", value: "0.5 cores" },
                { label: "RAM", value: "512 MB" },
                { label: "Disk", value: "1 GB + 10 GB buffer" },
                { label: "Network", value: "Outbound 443 only" },
              ].map((r) => (
                <div key={r.label} className="bg-[#0A0A0A] px-5 py-4">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">
                    {r.label}
                  </div>
                  <div className="text-[14px] text-white/60 mt-1 font-mono">
                    {r.value}
                  </div>
                </div>
              ))}
            </motion.div>
          </Section>

          {/* Security principles */}
          <Section className="mt-16 grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Read-only access",
                desc: "Never writes to source systems. Never modifies operational data. Read-only database connections and API calls only.",
              },
              {
                title: "No inbound ports",
                desc: "Zero attack surface from the internet. No SSH, no reverse shells, no tunnels. Outbound HTTPS only, certificate-pinned.",
              },
              {
                title: "Rootless container",
                desc: "Runs as unprivileged user. Immutable filesystem. Container isolation prevents lateral movement. Build from source if you want.",
              },
            ].map((s) => (
              <motion.div key={s.title} variants={fadeUp}>
                <h3 className="text-[15px] font-medium text-white/70 mb-2">
                  {s.title}
                </h3>
                <p className="text-[13px] text-white/30 leading-relaxed">
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </Section>
        </div>
      </section>

      {/* ============================================================== */}
      {/* CTA */}
      {/* ============================================================== */}
      <section className="py-28 md:py-40 bg-white border-t border-[#E5E5E5]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <Section className="max-w-3xl">
            <motion.h2
              variants={fadeUp}
              className="text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.1] tracking-[-0.03em] text-[#111] mb-6"
            >
              Deploy autonomous compliance infrastructure.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-[14px] text-[#666] leading-relaxed mb-10"
            >
              Start with a free compliance assessment. Then deploy Sentinel to
              automate evidence collection across the EU Space Act, NIS2, and 10
              national space laws.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center gap-4"
            >
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#111] text-white text-[15px] font-medium hover:bg-[#333] transition-colors"
              >
                Request Demo
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-[#DDD] text-[#666] text-[15px] font-medium hover:border-[#111] hover:text-[#111] transition-all"
              >
                Start Free Assessment
              </Link>
            </motion.div>
          </Section>
        </div>
      </section>
    </div>
  );
}
