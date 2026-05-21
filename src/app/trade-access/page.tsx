import { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import {
  Package,
  Users,
  FileCheck,
  Calculator,
  Workflow,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Trade — Caelex",
  description:
    "Export-compliance engine for the space economy. Classify items across US, EU and MTCR. Screen counterparties against five sanctions lists. Determine licenses across BIS, DDTC, BAFA and EU.",
};

const features = [
  {
    icon: Package,
    title: "Item Classification",
    description:
      "Multi-jurisdiction ECCN, USML, EU Annex I, MTCR Annex and DE Anlage AL lookup with cross-reference traversal. One item, every list, deterministic answer.",
  },
  {
    icon: Users,
    title: "Counterparty Screening",
    description:
      "OFAC SDN, BIS Entity List, BIS Unverified List, DDTC Debarred, EU Consolidated FSF and UK OFSI — all checked in a single pass with full match-trace and false-positive suppression.",
  },
  {
    icon: FileCheck,
    title: "License Determination",
    description:
      "Automated license-needs analysis across BIS (EAR), DDTC (ITAR), BAFA (AWG) and EU competent authorities — including license-exception applicability (TMP, RPL, GOV, TSR, STA).",
  },
  {
    icon: Calculator,
    title: "De Minimis Calculator",
    description:
      "EAR US-origin content threshold computation under 15 CFR § 734.4 — 10% / 25% triggers, with full origin breakdown and re-export licensing implications.",
  },
  {
    icon: Workflow,
    title: "Operations Pipeline",
    description:
      "Transaction lifecycle from quote → classification → screening → license filing → shipment → recordkeeping. Every step audited, every change hash-chained.",
  },
  {
    icon: ShieldCheck,
    title: "50% Ownership Cascade",
    description:
      "Sanctions screening that traverses beneficial-owner relationships. If a sanctioned party owns 50% or more of a counterparty, the counterparty inherits the restriction.",
  },
];

const regulations = [
  "ITAR (22 CFR 120–130)",
  "EAR (15 CFR 730–774)",
  "EU 2021/821 Dual-Use",
  "Wassenaar Arrangement",
  "MTCR Annex",
  "DE Anlage AL",
  "UK Export Control Act 2002",
];

const sanctionsLists = [
  "OFAC SDN",
  "BIS Entity List",
  "BIS Unverified List",
  "DDTC Debarred",
  "EU Consolidated FSF",
  "UK OFSI Consolidated",
];

export default function TradeAccessPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <Navigation theme="light" />

      {/* Hero */}
      <section className="relative overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40">
        {/* Indigo gradient mesh — replaces Comply's sky-blue with the Trade brand hue */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, rgba(129, 140, 248, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 80%, rgba(99, 102, 241, 0.04) 0%, transparent 50%)
            `,
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative mx-auto max-w-[1280px] px-6 md:px-12">
          <p className="mb-4 font-display text-[11px] font-medium uppercase tracking-[0.15em] text-indigo-400">
            Caelex Trade
          </p>
          <h1 className="max-w-3xl font-display text-[clamp(2.5rem,5vw,3rem)] font-bold leading-[1.1] tracking-[-0.015em] text-zinc-50">
            Export-Compliance Engine for the Space Economy
          </h1>
          <p className="mt-5 max-w-2xl font-body text-[16px] leading-relaxed text-zinc-400">
            Classify items across US, EU and MTCR. Screen counterparties against
            five sanctions lists. Determine licenses across BIS, DDTC, BAFA and
            EU competent authorities — in one workspace, with full audit trail.
          </p>

          {/* Hero stats */}
          <div className="mt-10 flex flex-wrap items-center gap-8 md:gap-12">
            {[
              { value: "5", label: "Jurisdictions" },
              { value: "6", label: "Sanctions Lists" },
              { value: "<300ms", label: "Screening Latency" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex items-center gap-8 md:gap-12"
              >
                {i > 0 && (
                  <div className="mr-0 hidden h-8 w-px bg-white/10 md:block" />
                )}
                <div>
                  <p className="font-mono text-[22px] font-medium tracking-tight text-zinc-50">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 font-body text-[11px] uppercase tracking-wider text-zinc-500">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-4">
            <a
              href="mailto:sales@caelex.eu?subject=Caelex%20Trade"
              className="inline-flex h-[40px] items-center rounded-[6px] bg-indigo-500 px-5 font-body text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-150 hover:-translate-y-px hover:bg-indigo-600 hover:shadow-[0_2px_8px_rgba(99,102,241,0.25)]"
            >
              Talk to Sales
            </a>
            <Link
              href="/demo?product=trade"
              className="inline-flex h-[40px] items-center rounded-[6px] border border-white/[0.1] bg-white/[0.06] px-5 font-body text-[14px] font-medium text-white backdrop-blur-sm transition-all duration-150 hover:border-white/[0.18] hover:bg-white/[0.1]"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Regulations strip */}
      <section className="border-y border-white/[0.06] bg-[#18181B]/50 py-8">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12">
          <p className="mb-5 font-body text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
            Regulations Covered
          </p>
          <div className="flex flex-wrap gap-2.5">
            {regulations.map((reg) => (
              <span
                key={reg}
                className="rounded-[4px] border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 font-body text-[12px] text-zinc-500"
              >
                {reg}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section
        id="features"
        className="relative overflow-hidden py-20 md:py-28"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 70% 30%, rgba(99, 102, 241, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse at 30% 70%, rgba(129, 140, 248, 0.04) 0%, transparent 50%)
            `,
          }}
        />
        <div className="relative mx-auto max-w-[1280px] px-6 md:px-12">
          <p className="mb-3 font-display text-[11px] font-medium uppercase tracking-[0.15em] text-indigo-400">
            Capabilities
          </p>
          <h2 className="mb-3 max-w-xl font-display text-[clamp(1.5rem,3vw,1.875rem)] font-medium tracking-[-0.01em] text-zinc-50">
            From export desk to shipment, every check in one engine
          </h2>
          <p className="mb-12 max-w-2xl font-body text-[14px] leading-relaxed text-zinc-400">
            Trade is not a checklist — it is a deterministic classification,
            screening and license-determination engine. Every output is
            traceable to a specific list, paragraph, or regulation.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-[14px] border border-white/[0.08] p-6 transition-all duration-200 hover:-translate-y-px hover:border-indigo-500/20"
                style={{
                  background: "rgba(39, 39, 42, 0.55)",
                  backdropFilter: "blur(20px) saturate(1.2)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.2)",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] border border-indigo-500/20 bg-indigo-500/10">
                  <f.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="mb-2 font-display text-[16px] font-medium text-zinc-100">
                  {f.title}
                </h3>
                <p className="font-body text-[14px] leading-relaxed text-zinc-400">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sanctions lists strip */}
      <section className="border-t border-white/[0.06] py-16 md:py-20">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12">
          <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-2">
            <div>
              <p className="mb-3 font-display text-[11px] font-medium uppercase tracking-[0.15em] text-indigo-400">
                6 Sanctions Lists
              </p>
              <h2 className="mb-4 font-display text-[clamp(1.25rem,2.5vw,1.5rem)] font-medium tracking-[-0.01em] text-zinc-50">
                Every sanctions surface, every transaction
              </h2>
              <p className="mb-6 font-body text-[14px] leading-relaxed text-zinc-400">
                Trade screens counterparties against the full US, EU and UK
                sanctions stack — with 50% ownership cascade, name-variant
                matching, and false-positive suppression tuned for the space
                supply chain.
              </p>
              <a
                href="mailto:sales@caelex.eu?subject=Caelex%20Trade%20Screening"
                className="inline-flex h-[40px] items-center gap-2 rounded-[6px] bg-zinc-50 px-5 font-body text-[14px] font-medium text-zinc-900 transition-colors duration-150 hover:bg-white"
              >
                Talk to Sales
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {sanctionsLists.map((list) => (
                <div
                  key={list}
                  className="flex items-center gap-3 rounded-[10px] border border-white/[0.08] bg-white/[0.03] p-4"
                >
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
                  <span className="font-body text-[14px] text-zinc-300">
                    {list}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Capability stats */}
      <section className="border-t border-white/[0.06] py-12">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { value: "5", label: "Jurisdictions" },
              { value: "6", label: "Sanctions Lists" },
              { value: "4", label: "License Authorities" },
              { value: "<300ms", label: "Per-Screening Latency" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-mono text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-tight text-zinc-100">
                  {stat.value}
                </p>
                <p className="mt-1 font-body text-[12px] font-medium uppercase tracking-wider text-zinc-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.06] py-16">
        <div className="mx-auto max-w-[1280px] px-6 text-center md:px-12">
          <h2 className="mb-4 font-display text-[24px] font-medium tracking-[-0.01em] text-zinc-50">
            Stop reading EAR § 734.4 at 11pm — let Caelex Trade do it.
          </h2>
          <p className="mx-auto mb-8 max-w-md font-body text-[14px] leading-relaxed text-zinc-500">
            Classify, screen and license-determine across five jurisdictions —
            in seconds, not days.
          </p>
          <a
            href="mailto:sales@caelex.eu?subject=Caelex%20Trade"
            className="inline-flex h-[40px] items-center rounded-[6px] bg-indigo-500 px-6 font-body text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-150 hover:bg-indigo-600 hover:shadow-[0_2px_8px_rgba(99,102,241,0.25)]"
          >
            Talk to Sales
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 md:px-12">
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
                className="font-body text-[12px] text-zinc-600 transition-colors hover:text-zinc-400"
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
