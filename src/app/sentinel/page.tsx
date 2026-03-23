import { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import {
  Bot,
  ShieldCheck,
  GitMerge,
  Map,
  BarChart3,
  Activity,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Sentinel — Caelex",
  description:
    "Deploy autonomous compliance agents on your ground infrastructure. Continuous monitoring. Cryptographic evidence. Zero manual intervention.",
};

const features = [
  {
    icon: Bot,
    title: "Autonomous Agents",
    description:
      "Deploy on ground stations, mission control, CI/CD pipelines. Monitors operational data 24/7 without human intervention.",
  },
  {
    icon: ShieldCheck,
    title: "Cryptographic Proof",
    description:
      "Every evidence packet is Ed25519 signed with SHA-256 hash chains. Tamper-evident by design — from collection to submission.",
  },
  {
    icon: GitMerge,
    title: "Cross-Verification",
    description:
      "Multi-agent verification for maximum trust scores. Independent validation across data sources eliminates single points of failure.",
  },
  {
    icon: Map,
    title: "Regulation Mapping",
    description:
      "Each data point automatically mapped to applicable regulations — EU Space Act, NIS2, IADC — with article-level citations.",
  },
  {
    icon: BarChart3,
    title: "Trust Scoring",
    description:
      "0.0–1.0 trust scores based on source quality, cross-verification depth, and data freshness. Every metric is auditable.",
  },
  {
    icon: Activity,
    title: "Live Dashboard",
    description:
      "Real-time evidence feed, chain integrity monitoring, and agent health status — all in one operational view.",
  },
];

export default function SentinelPage() {
  return (
    <div className="min-h-screen">
      <Navigation theme="light" />

      {/* Hero */}
      <section className="relative bg-[#050A18] pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#10B981 1px, transparent 1px), linear-gradient(90deg, #10B981 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="relative max-w-[1200px] mx-auto px-6 md:px-12">
          <p className="text-emerald-400 text-[13px] font-medium uppercase tracking-[0.2em] mb-4">
            Caelex Sentinel
          </p>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.03em] text-white leading-[1.1] max-w-3xl">
            Sentinel
          </h1>
          <p className="text-[17px] text-white/60 mt-5 max-w-2xl leading-relaxed">
            Deploy autonomous compliance agents on your ground infrastructure.
            Continuous monitoring. Cryptographic evidence. Zero manual
            intervention.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-8 md:gap-12 mt-10">
            <div>
              <p className="text-[22px] font-light text-white">
                Ed25519 Signed
              </p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                Evidence Packets
              </p>
            </div>
            <div className="w-px h-8 bg-white/10 hidden md:block" />
            <div>
              <p className="text-[22px] font-light text-white">
                Hash-Chain Verified
              </p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                SHA-256 Integrity
              </p>
            </div>
            <div className="w-px h-8 bg-white/10 hidden md:block" />
            <div>
              <p className="text-[22px] font-light text-white">
                Cross-Verified Trust
              </p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                Multi-Agent Consensus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-10">
            <Link
              href="/assessment"
              className="inline-flex items-center h-12 px-7 bg-emerald-500 text-white text-[14px] font-medium rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Start Assessment
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center h-12 px-7 border border-white/20 text-white text-[14px] font-medium rounded-lg hover:bg-white/5 transition-colors"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-[#0D1526] border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
            {[
              {
                step: "01",
                label: "Deploy",
                text: "Install the Sentinel agent binary on any Linux host — ground station, mission control, or CI/CD runner. Zero dependencies.",
              },
              {
                step: "02",
                label: "Monitor",
                text: "The agent collects telemetry, validates against regulatory thresholds, and signs each evidence packet with your Ed25519 key.",
              },
              {
                step: "03",
                label: "Attest",
                text: "Hash-chained evidence streams back to Caelex. Every packet verifiable offline. Every chain integrity-checked in real time.",
              },
            ].map((item) => (
              <div key={item.step} className="px-6 md:px-10 py-8">
                <p className="text-[11px] font-mono text-emerald-400/70 uppercase tracking-[0.2em] mb-3">
                  {item.step}
                </p>
                <p className="text-[16px] font-semibold text-white mb-2">
                  {item.label}
                </p>
                <p className="text-[13px] text-white/40 leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <p className="text-emerald-600 text-[12px] font-medium uppercase tracking-[0.2em] mb-3">
            Capabilities
          </p>
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-[-0.02em] text-[#111827] mb-3 max-w-xl">
            Everything you need for autonomous compliance evidence
          </h2>
          <p className="text-[15px] text-[#6B7280] mb-12 max-w-2xl">
            Sentinel agents run continuously on your infrastructure, generating
            cryptographically verifiable evidence without disrupting operations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-xl border border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">
                  {f.title}
                </h3>
                <p className="text-[14px] text-[#6B7280] leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust architecture callout */}
      <section className="py-16 md:py-20 bg-[#F9FAFB] border-t border-[#E5E7EB]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-emerald-600 text-[12px] font-medium uppercase tracking-[0.2em] mb-3">
                Trust Architecture
              </p>
              <h2 className="text-[clamp(1.25rem,2.5vw,1.875rem)] font-medium tracking-[-0.02em] text-[#111827] mb-4">
                Designed for regulatory scrutiny
              </h2>
              <p className="text-[15px] text-[#6B7280] leading-relaxed mb-6">
                Every Sentinel evidence packet carries a deterministic proof of
                origin. NCAs, auditors, and insurers can verify compliance
                claims offline — without accessing your operational systems.
              </p>
              <ul className="space-y-3">
                {[
                  "Ed25519 asymmetric signing — key stays on your infrastructure",
                  "SHA-256 hash chain links every packet to its predecessor",
                  "Blinding factors enable selective disclosure without data exposure",
                  "Verifiable offline with open-source verification tooling",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[14px] text-[#374151]"
                  >
                    <span className="mt-1 w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#050A18] rounded-2xl p-8 font-mono text-[12px] leading-relaxed">
              <p className="text-white/30 mb-4">{`// Evidence packet structure`}</p>
              <p className="text-white/50">{`{`}</p>
              <p className="text-white/50 pl-4">
                <span className="text-emerald-400">{`"packet_id"`}</span>
                {`: "ep_01HXYZ...",`}
              </p>
              <p className="text-white/50 pl-4">
                <span className="text-emerald-400">{`"agent_id"`}</span>
                {`: "sa_ground_01",`}
              </p>
              <p className="text-white/50 pl-4">
                <span className="text-emerald-400">{`"timestamp"`}</span>
                {`: 1740000000,`}
              </p>
              <p className="text-white/50 pl-4">
                <span className="text-emerald-400">{`"regulation"`}</span>
                {`: "EU_SPACE_ACT_ART70",`}
              </p>
              <p className="text-white/50 pl-4">
                <span className="text-emerald-400">{`"trust_score"`}</span>
                {`: 0.97,`}
              </p>
              <p className="text-white/50 pl-4">
                <span className="text-emerald-400">{`"prev_hash"`}</span>
                {`: "sha256:a3f9...",`}
              </p>
              <p className="text-white/50 pl-4">
                <span className="text-emerald-400">{`"signature"`}</span>
                {`: "ed25519:b1c2..."`}
              </p>
              <p className="text-white/50">{`}`}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#050A18]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 text-center">
          <h2 className="text-[24px] font-medium text-white mb-4">
            Start collecting compliance evidence today
          </h2>
          <p className="text-[15px] text-white/50 mb-8 max-w-md mx-auto">
            Deploy Sentinel in minutes. Your first cryptographic evidence chain
            within the hour.
          </p>
          <Link
            href="/assessment"
            className="inline-flex items-center h-12 px-8 bg-emerald-500 text-white text-[14px] font-medium rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Start Free Assessment
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#050A18] border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <p className="text-[12px] text-white/30">© 2026 Caelex</p>
          <div className="flex items-center gap-6">
            <Link
              href="/legal/privacy"
              className="text-[12px] text-white/30 hover:text-white/60 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/legal/terms"
              className="text-[12px] text-white/30 hover:text-white/60 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/legal/impressum"
              className="text-[12px] text-white/30 hover:text-white/60 transition-colors"
            >
              Impressum
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
