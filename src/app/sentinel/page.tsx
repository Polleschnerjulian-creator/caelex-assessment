import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import SentinelHeroText from "@/components/landing/SentinelHeroText";
import {
  Bot,
  ShieldCheck,
  GitMerge,
  Map,
  BarChart3,
  Activity,
  ArrowRight,
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
    <div className="min-h-screen bg-[#09090B]">
      <Navigation theme="dark" />

      {/* Hero */}
      <section className="relative h-screen min-h-[600px] max-h-[1000px] flex items-end overflow-hidden">
        {/* Background image */}
        <Image
          src="/sentinel-hero.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
        />
        {/* Lighter dark overlay */}
        <div className="absolute inset-0 bg-black/25" />
        {/* Bottom gradient fade into page background */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#09090B] to-transparent" />

        <div className="relative z-10 px-6 md:px-12 pb-12 md:pb-16 max-w-[1280px] mx-auto w-full">
          <SentinelHeroText />
        </div>
      </section>

      {/* How it works strip */}
      <section className="py-8 bg-[#18181B]/50 border-y border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
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
                <p className="font-mono text-[11px] text-sky-400 uppercase tracking-[0.15em] mb-3">
                  {item.step}
                </p>
                <p className="font-display text-[16px] font-medium text-zinc-100 mb-2">
                  {item.label}
                </p>
                <p className="font-body text-[13px] text-zinc-400 leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Glass environment */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at 70% 30%, rgba(14, 165, 233, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse at 30% 70%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)
            `,
          }}
        />

        <div className="relative max-w-[1280px] mx-auto px-6 md:px-12">
          <p className="font-display text-[11px] font-medium uppercase tracking-[0.15em] text-sky-400 mb-3">
            Capabilities
          </p>
          <h2 className="font-display text-[clamp(1.5rem,3vw,1.875rem)] font-medium tracking-[-0.01em] text-zinc-50 mb-3 max-w-xl">
            Everything you need for autonomous compliance evidence
          </h2>
          <p className="font-body text-[14px] text-zinc-400 mb-12 max-w-2xl leading-relaxed">
            Sentinel agents run continuously on your infrastructure, generating
            cryptographically verifiable evidence without disrupting operations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative p-6 rounded-[14px] border border-white/[0.08] transition-all duration-200 hover:-translate-y-px hover:border-sky-500/20"
                style={{
                  background: "rgba(39, 39, 42, 0.55)",
                  backdropFilter: "blur(20px) saturate(1.2)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.2)",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                <div className="w-10 h-10 rounded-[10px] bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="font-display text-[16px] font-medium text-zinc-100 mb-2">
                  {f.title}
                </h3>
                <p className="font-body text-[14px] text-zinc-400 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Architecture */}
      <section className="py-16 md:py-20 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="font-display text-[11px] font-medium uppercase tracking-[0.15em] text-sky-400 mb-3">
                Trust Architecture
              </p>
              <h2 className="font-display text-[clamp(1.25rem,2.5vw,1.5rem)] font-medium tracking-[-0.01em] text-zinc-50 mb-4">
                Designed for regulatory scrutiny
              </h2>
              <p className="font-body text-[14px] text-zinc-400 leading-relaxed mb-6">
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
                    className="flex items-start gap-3 font-body text-[14px] text-zinc-300"
                  >
                    <span className="mt-1 w-4 h-4 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 h-[40px] px-5 bg-zinc-50 text-zinc-900 text-[14px] font-body font-medium rounded-[6px] hover:bg-white transition-colors duration-150 mt-8"
              >
                Explore Trust Architecture
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-[#18181B] rounded-[14px] p-8 font-mono text-[12px] leading-relaxed border border-white/[0.06]">
              <p className="text-zinc-600 mb-4">{`// Evidence packet structure`}</p>
              <p className="text-zinc-500">{`{`}</p>
              <p className="text-zinc-500 pl-4">
                <span className="text-sky-400">{`"packet_id"`}</span>
                {`: "ep_01HXYZ...",`}
              </p>
              <p className="text-zinc-500 pl-4">
                <span className="text-sky-400">{`"agent_id"`}</span>
                {`: "sa_ground_01",`}
              </p>
              <p className="text-zinc-500 pl-4">
                <span className="text-sky-400">{`"timestamp"`}</span>
                {`: 1740000000,`}
              </p>
              <p className="text-zinc-500 pl-4">
                <span className="text-sky-400">{`"regulation"`}</span>
                {`: "EU_SPACE_ACT_ART70",`}
              </p>
              <p className="text-zinc-500 pl-4">
                <span className="text-sky-400">{`"trust_score"`}</span>
                {`: 0.97,`}
              </p>
              <p className="text-zinc-500 pl-4">
                <span className="text-sky-400">{`"prev_hash"`}</span>
                {`: "sha256:a3f9...",`}
              </p>
              <p className="text-zinc-500 pl-4">
                <span className="text-sky-400">{`"signature"`}</span>
                {`: "ed25519:b1c2..."`}
              </p>
              <p className="text-zinc-500">{`}`}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 text-center">
          <h2 className="font-display text-[24px] font-medium text-zinc-50 mb-4 tracking-[-0.01em]">
            Start collecting compliance evidence today
          </h2>
          <p className="font-body text-[14px] text-zinc-500 mb-8 max-w-md mx-auto leading-relaxed">
            Deploy Sentinel in minutes. Your first cryptographic evidence chain
            within the hour.
          </p>
          <Link
            href="/assessment"
            className="inline-flex items-center h-[40px] px-6 bg-sky-500 text-white text-[14px] font-body font-medium rounded-[6px] hover:bg-sky-600 transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_8px_rgba(14,165,233,0.25)]"
          >
            Start Free Assessment
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <p className="font-body text-[12px] text-zinc-600">© 2026 Caelex</p>
          <div className="flex items-center gap-6">
            {[
              { href: "/legal/privacy", label: "Privacy" },
              { href: "/legal/terms", label: "Terms" },
              { href: "/legal/impressum", label: "Impressum" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
