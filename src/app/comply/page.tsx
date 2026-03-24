import { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import {
  Scale,
  Users,
  Globe,
  FileText,
  Share2,
  Star,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Comply — Caelex",
  description:
    "119 articles. 7 operator classifications. 10 European jurisdictions. One deterministic engine that maps your operation to every applicable regulation.",
};

const features = [
  {
    icon: Scale,
    title: "Multi-Regulation Assessment",
    description:
      "EU Space Act, NIS2 Directive, and national space laws assessed simultaneously in a single workflow — no duplication, no gaps.",
  },
  {
    icon: Users,
    title: "Operator Classification",
    description:
      "SCO, LO, LSO, ISOS, CAP, PDP, TCO — automatic regime detection determines which obligations apply before you answer a single question.",
  },
  {
    icon: Globe,
    title: "Jurisdiction Mapping",
    description:
      "France, Germany, UK, Italy, Belgium, Netherlands, Luxembourg, Austria, Denmark, Norway — full favorability matrix computed in under 200ms.",
  },
  {
    icon: FileText,
    title: "Document Generation",
    description:
      "AI-powered compliance documents with NCA-specific formatting. Operator statements, authorization applications, and NIS2 registers — ready to submit.",
  },
  {
    icon: Share2,
    title: "Regulatory Ontology",
    description:
      "390 nodes, 1,700+ edges knowledge graph for deterministic regulatory queries. No hallucinations — every answer traces to a specific article.",
  },
  {
    icon: Star,
    title: "Compliance Scoring",
    description:
      "Enacted-law-first scoring engine with 28 factors across 7 modules. Understand your exposure down to the article level.",
  },
];

const jurisdictions = [
  "France",
  "Germany",
  "United Kingdom",
  "Italy",
  "Belgium",
  "Netherlands",
  "Luxembourg",
  "Austria",
  "Denmark",
  "Norway",
];

const regulations = [
  "EU Space Act (COM 2025/335)",
  "NIS2 Directive (EU 2022/2555)",
  "French Space Operations Act",
  "German SpaceSiG",
  "UK Space Industry Act 2018",
  "Italian D.Lgs 108/2022",
  "Belgian Space Activities Act",
  "Dutch Space Activities Act",
  "Luxembourg Space Resources Law",
  "Austrian Outer Space Act",
  "Danish Space Act",
  "Norwegian Space Activities Act",
];

export default function ComplyPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <Navigation theme="light" />

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Gradient mesh environment */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(14, 165, 233, 0.06) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 80%, rgba(14, 165, 233, 0.03) 0%, transparent 50%)
            `,
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative max-w-[1280px] mx-auto px-6 md:px-12">
          <p className="font-display text-[11px] font-medium uppercase tracking-[0.15em] text-sky-400 mb-4">
            Caelex Comply
          </p>
          <h1 className="font-display text-[clamp(2.5rem,5vw,3rem)] font-bold tracking-[-0.015em] text-zinc-50 leading-[1.1] max-w-3xl">
            The regulatory intelligence engine
          </h1>
          <p className="font-body text-[16px] text-zinc-400 mt-5 max-w-2xl leading-relaxed">
            119 articles. 7 operator classifications. 10 European jurisdictions.
            One deterministic engine that maps your operation to every
            applicable regulation.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-8 md:gap-12 mt-10">
            {[
              { value: "119", label: "EU Space Act Articles" },
              { value: "10", label: "Jurisdictions" },
              { value: "<200ms", label: "Assessment Runtime" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex items-center gap-8 md:gap-12"
              >
                {i > 0 && (
                  <div className="w-px h-8 bg-white/10 hidden md:block mr-0" />
                )}
                <div>
                  <p className="font-mono text-[22px] font-medium text-zinc-50 tracking-tight">
                    {stat.value}
                  </p>
                  <p className="font-body text-[11px] text-zinc-500 uppercase tracking-wider mt-0.5">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-10">
            <Link
              href="/assessment"
              className="inline-flex items-center h-[40px] px-5 bg-sky-500 text-white text-[14px] font-body font-medium rounded-[6px] hover:bg-sky-600 transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_8px_rgba(14,165,233,0.25)] hover:-translate-y-px"
            >
              Start Assessment
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center h-[40px] px-5 bg-white/[0.06] backdrop-blur-sm text-white text-[14px] font-body font-medium rounded-[6px] border border-white/[0.1] hover:bg-white/[0.1] hover:border-white/[0.18] transition-all duration-150"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Regulations strip */}
      <section className="py-8 bg-[#18181B]/50 border-y border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <p className="font-body text-[11px] text-zinc-500 uppercase tracking-[0.15em] font-semibold mb-5">
            Regulations Covered
          </p>
          <div className="flex flex-wrap gap-2.5">
            {regulations.map((reg) => (
              <span
                key={reg}
                className="px-3 py-1.5 rounded-[4px] border border-white/[0.06] text-[12px] font-body text-zinc-500 bg-white/[0.03]"
              >
                {reg}
              </span>
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
            The regulatory intelligence engine for space operators
          </h2>
          <p className="font-body text-[14px] text-zinc-400 mb-12 max-w-2xl leading-relaxed">
            Comply is not a checklist — it is a deterministic reasoning engine
            that constructs your exact compliance obligation set from first
            principles.
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

      {/* Jurisdiction grid */}
      <section className="py-16 md:py-20 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="font-display text-[11px] font-medium uppercase tracking-[0.15em] text-sky-400 mb-3">
                10 Jurisdictions
              </p>
              <h2 className="font-display text-[clamp(1.25rem,2.5vw,1.5rem)] font-medium tracking-[-0.01em] text-zinc-50 mb-4">
                Every European space law in one engine
              </h2>
              <p className="font-body text-[14px] text-zinc-400 leading-relaxed mb-6">
                Comply computes a multi-jurisdiction favorability matrix —
                ranking each jurisdiction by authorization burden, fee
                structure, timeline, and regulatory certainty — so you can make
                an informed licensing decision.
              </p>
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 h-[40px] px-5 bg-zinc-50 text-zinc-900 text-[14px] font-body font-medium rounded-[6px] hover:bg-white transition-colors duration-150"
              >
                Run Jurisdiction Analysis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {jurisdictions.map((j) => (
                <div
                  key={j}
                  className="flex items-center gap-3 p-4 rounded-[10px] border border-white/[0.08] bg-white/[0.03]"
                >
                  <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0 shadow-[0_0_6px_rgba(14,165,233,0.4)]" />
                  <span className="font-body text-[14px] text-zinc-300">
                    {j}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ontology stats */}
      <section className="py-12 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "390", label: "Ontology Nodes" },
              { value: "1,700+", label: "Ontology Edges" },
              { value: "28", label: "Scoring Factors" },
              { value: "7", label: "Compliance Modules" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-mono text-[clamp(1.5rem,3vw,2.25rem)] font-medium text-zinc-100 tracking-tight">
                  {stat.value}
                </p>
                <p className="font-body text-[12px] text-zinc-500 uppercase tracking-wider mt-1 font-medium">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 text-center">
          <h2 className="font-display text-[24px] font-medium text-zinc-50 mb-4 tracking-[-0.01em]">
            Map your operation to every applicable regulation
          </h2>
          <p className="font-body text-[14px] text-zinc-500 mb-8 max-w-md mx-auto leading-relaxed">
            8 questions. 119 articles analyzed. Full jurisdiction matrix
            computed. Under 200ms.
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
