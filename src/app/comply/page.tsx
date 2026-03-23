import { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import { Scale, Users, Globe, FileText, Share2, Star } from "lucide-react";

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

export default function ComplyPage() {
  return (
    <div className="min-h-screen">
      <Navigation theme="light" />

      {/* Hero */}
      <section className="relative bg-[#050A18] pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #10B981 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative max-w-[1200px] mx-auto px-6 md:px-12">
          <p className="text-emerald-400 text-[13px] font-medium uppercase tracking-[0.2em] mb-4">
            Caelex Comply
          </p>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.03em] text-white leading-[1.1] max-w-3xl">
            Comply
          </h1>
          <p className="text-[17px] text-white/60 mt-5 max-w-2xl leading-relaxed">
            119 articles. 7 operator classifications. 10 European jurisdictions.
            One deterministic engine that maps your operation to every
            applicable regulation.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-8 md:gap-12 mt-10">
            <div>
              <p className="text-[22px] font-light text-white">119 Articles</p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                EU Space Act Coverage
              </p>
            </div>
            <div className="w-px h-8 bg-white/10 hidden md:block" />
            <div>
              <p className="text-[22px] font-light text-white">
                10 Jurisdictions
              </p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                National Space Laws
              </p>
            </div>
            <div className="w-px h-8 bg-white/10 hidden md:block" />
            <div>
              <p className="text-[22px] font-light text-white">&lt; 200ms</p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                Full Assessment Runtime
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

      {/* Regulation logos strip */}
      <section className="py-8 bg-[#0D1526] border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] mb-5">
            Regulations covered
          </p>
          <div className="flex flex-wrap gap-3">
            {[
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
            ].map((reg) => (
              <span
                key={reg}
                className="px-3 py-1.5 rounded-full border border-white/[0.08] text-[12px] text-white/40"
              >
                {reg}
              </span>
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
            The regulatory intelligence engine for space operators
          </h2>
          <p className="text-[15px] text-[#6B7280] mb-12 max-w-2xl">
            Comply is not a checklist — it is a deterministic reasoning engine
            that constructs your exact compliance obligation set from first
            principles.
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

      {/* Jurisdiction grid */}
      <section className="py-16 md:py-20 bg-[#F9FAFB] border-t border-[#E5E7EB]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-emerald-600 text-[12px] font-medium uppercase tracking-[0.2em] mb-3">
                10 Jurisdictions
              </p>
              <h2 className="text-[clamp(1.25rem,2.5vw,1.875rem)] font-medium tracking-[-0.02em] text-[#111827] mb-4">
                Every European space law in one engine
              </h2>
              <p className="text-[15px] text-[#6B7280] leading-relaxed mb-6">
                Comply computes a multi-jurisdiction favorability matrix —
                ranking each jurisdiction by authorization burden, fee
                structure, timeline, and regulatory certainty — so you can make
                an informed licensing decision.
              </p>
              <Link
                href="/assessment"
                className="inline-flex items-center h-10 px-6 bg-[#111827] text-white text-[13px] font-medium rounded-lg hover:bg-[#1F2937] transition-colors"
              >
                Run jurisdiction analysis
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {jurisdictions.map((j) => (
                <div
                  key={j}
                  className="flex items-center gap-3 p-4 rounded-lg bg-white border border-[#E5E7EB]"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-[14px] text-[#374151]">{j}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ontology stats */}
      <section className="py-12 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "390", label: "Ontology Nodes" },
              { value: "1,700+", label: "Ontology Edges" },
              { value: "28", label: "Scoring Factors" },
              { value: "7", label: "Compliance Modules" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-[clamp(1.5rem,3vw,2.25rem)] font-light text-[#111827] tracking-[-0.02em]">
                  {stat.value}
                </p>
                <p className="text-[12px] text-[#9CA3AF] uppercase tracking-wider mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#050A18]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 text-center">
          <h2 className="text-[24px] font-medium text-white mb-4">
            Map your operation to every applicable regulation
          </h2>
          <p className="text-[15px] text-white/50 mb-8 max-w-md mx-auto">
            8 questions. 119 articles analyzed. Full jurisdiction matrix
            computed. Under 200ms.
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
