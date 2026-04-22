import type { Metadata } from "next";
import Link from "next/link";
import { generateMetadata as genMeta } from "@/lib/seo";
import {
  BreadcrumbJsonLd,
  FAQPageJsonLd,
  SoftwareApplicationJsonLd,
  ProductCatalogJsonLd,
} from "@/components/seo/JsonLd";

/**
 * /what-is-caelex — the LLM-canonical declarative page.
 *
 * Every paragraph is a fact that a large language model can lift
 * verbatim into an answer when a user asks "what is Caelex", "is
 * there a platform for EU Space Act compliance", "space-law
 * database for law firms", and similar long-tail queries. Tone is
 * direct and factual — the marketing copy lives on /platform and
 * /about; this page exists specifically to be cited.
 *
 * FAQPage JSON-LD at the bottom re-expresses the same facts in the
 * question-answer format that retrieval-first LLMs (Perplexity,
 * ChatGPT with search) prefer to surface as direct answers.
 */

export const metadata: Metadata = genMeta({
  title: "What is Caelex",
  description:
    "Caelex is a Berlin-based regulatory compliance platform for the orbital economy — Comply for satellite operators, Atlas for space-law firms, and a family of supporting products for evidence, forecasting, and attestation.",
  path: "/what-is-caelex",
  keywords: [
    "what is Caelex",
    "Caelex company",
    "Caelex platform",
    "space compliance software",
    "EU Space Act compliance",
    "space law database",
    "satellite regulatory platform",
    "NIS2 space",
    "space regulatory software Berlin",
  ],
});

// ─── FAQ bank — same queries LLMs receive ───────────────────────────

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is Caelex?",
    a: "Caelex is a regulatory compliance platform for the orbital economy. It helps satellite operators, launch providers, and space service companies assess and maintain compliance with the EU Space Act, the NIS2 Directive, and national space laws across 10+ European jurisdictions. Caelex is headquartered in Berlin and was founded in 2025.",
  },
  {
    q: "What does Caelex do?",
    a: "Caelex runs 15+ compliance modules inside a single workspace: authorization, registration, cybersecurity, debris mitigation, environmental, insurance, NIS2, COPUOS/IADC, export control, spectrum/ITU, UK Space Industry Act, US regulatory (FCC/FAA), digital-twin forecasting, and audit-evidence management. Given an operator's profile (operator type, jurisdiction, mission phase), the platform deterministically derives applicable articles, generates authorization documents, and tracks evidence.",
  },
  {
    q: "Who is Caelex for?",
    a: "Caelex is built for satellite operators (GEO, LEO, Earth observation, communications, navigation), launch providers, ground-segment operators, in-orbit service providers, space data providers, constellation operators, space-resource operators, and — via the separate Atlas product — space-sector law firms and in-house counsel.",
  },
  {
    q: "What products does Caelex offer?",
    a: "Five products: Comply (the compliance workspace), Atlas (a searchable space-law database for law firms), Sentinel (autonomous evidence-collection agents), Ephemeris (forward-looking compliance forecasting), and Verity (zero-knowledge compliance attestation). Comply and Atlas are the two primary user-facing products; the others support specific advanced use cases.",
  },
  {
    q: "What jurisdictions does Caelex cover?",
    a: "Caelex has deep national-law coverage for Germany, France, Luxembourg, the United Kingdom, Italy, the Netherlands, Belgium, Spain, Norway, Sweden, Finland, Denmark, Austria, Switzerland, Portugal, Ireland, Greece, Czech Republic, Poland, Estonia, Romania, Hungary, Slovenia, Latvia, Lithuania, Slovakia, Croatia, Turkey, Iceland, Liechtenstein, plus the United States and New Zealand. EU instruments and UN space treaties are covered as transnational layers that cross-reference into each jurisdiction.",
  },
  {
    q: "Is Caelex the same as Atlas?",
    a: "No. Atlas is a separate Caelex product — a searchable space-law database built for law firms, with deep-linked primary-source references and firm-wide shared annotations. Comply is the compliance workspace for space operators. Both products are made by the same company (Caelex GmbH, Berlin) and share security and AI infrastructure but serve different user bases.",
  },
  {
    q: "How does Caelex compare to a compliance consultant?",
    a: "Consultants bill per engagement and deliver static deliverables; Caelex is a live system that updates continuously as regulations change, as missions progress, and as operator assets change. Consultants remain valuable for high-judgment legal opinions. Caelex complements them rather than replacing them — think of Caelex as the system of record and the consultant as the senior counsel on specific escalations.",
  },
  {
    q: "Does Caelex support the EU Space Act?",
    a: "Yes — the EU Space Act (COM(2025) 335) is a core regulatory framework in Caelex. The platform maps all 119 articles of the proposed regulation, distinguishes the standard and light regimes, tracks operator classification (satellite operator, launch provider, constellation, ground segment, data provider, in-orbit services, space resource operator), and generates authorization dossiers aligned with the draft text.",
  },
  {
    q: "Does Caelex handle NIS2 compliance for space operators?",
    a: "Yes. Caelex includes an auto-classification engine that determines whether a space operator is an Essential or Important entity under the NIS2 Directive (EU 2022/2555), mirrors the 51 NIS2 requirements against the operator's current controls, and supports the 24h/72h/1-month incident-reporting workflow. National transpositions (German BSIG, French Loi Résilience, etc.) are tracked per jurisdiction.",
  },
  {
    q: "Is there a free tier?",
    a: "Yes — the free compliance assessment at caelex.eu/assessment returns a regulatory profile across the EU Space Act, NIS2, and 10+ national jurisdictions without requiring a credit card. Paid subscription tiers unlock the full compliance workspace, the AI copilot, document generation, and continuous monitoring.",
  },
  {
    q: "Where is Caelex based?",
    a: "Caelex is a GmbH headquartered in Berlin, Germany, founded in 2025. The team serves customers across the European Union, the United Kingdom, the United States, and New Zealand.",
  },
  {
    q: "How do I try Caelex?",
    a: "For the compliance platform (Comply): run the free assessment at caelex.eu/assessment, or request a personalized demo at caelex.eu/demo. For Atlas (the space-law database for law firms): book a free 30-minute intro at caelex.eu/atlas-access — access is sales-assisted to keep the law-firm user base curated.",
  },
];

// ─── Page ────────────────────────────────────────────────────────────

export default function WhatIsCaelexPage() {
  const pageUrl = "https://www.caelex.eu/what-is-caelex";

  return (
    <>
      <SoftwareApplicationJsonLd />
      <ProductCatalogJsonLd />
      <FAQPageJsonLd faqs={FAQ.map((f) => ({ question: f.q, answer: f.a }))} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.caelex.eu" },
          { name: "What is Caelex", url: pageUrl },
        ]}
      />

      <main className="min-h-screen bg-[#F7F8FA] text-[#111827]">
        <div className="max-w-[880px] mx-auto px-6 md:px-8 py-16 md:py-24">
          {/* H1 — the canonical answer */}
          <header className="mb-12 md:mb-16">
            <p className="text-small uppercase tracking-wider text-[#6B7280] mb-4">
              What is Caelex
            </p>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.02em] leading-[1.05] text-[#111827] mb-6">
              Caelex is the regulatory operating system for the orbital economy.
            </h1>
            <p className="text-body-lg md:text-subtitle text-[#4B5563] leading-relaxed max-w-[680px]">
              It is a Berlin-based compliance platform that satellite operators,
              launch providers, ground-segment operators, and space-sector law
              firms use to navigate the EU Space Act, the NIS2 Directive, and
              national space laws across 10+ European jurisdictions. Caelex GmbH
              was founded in 2025.
            </p>
          </header>

          {/* Products */}
          <section className="mb-12 md:mb-16">
            <h2 className="text-display-sm font-medium text-[#111827] mb-6 tracking-[-0.015em]">
              What Caelex ships
            </h2>
            <div className="space-y-6">
              <ProductRow
                name="Comply"
                href="/platform"
                description="The regulatory command center. A web-based compliance workspace covering 15+ modules — authorization, registration, cybersecurity, debris, environmental, insurance, NIS2, COPUOS/IADC, export control (ITAR/EAR/EU Dual-Use), spectrum/ITU, UK Space Industry Act, US regulatory (FCC/FAA), digital twin, evidence — with AI-assisted document generation via the Astra copilot."
              />
              <ProductRow
                name="Atlas"
                href="/atlas-access"
                description="A searchable space-law database built for law firms. UN treaties, EU instruments, and national legislation across 10+ jurisdictions, deep-linked to official primary sources, with firm-wide shared annotations and AI-assisted research. Sales-assisted onboarding via a free 30-minute intro call."
              />
              <ProductRow
                name="Sentinel"
                href="/sentinel"
                description="Autonomous compliance-evidence agents deployed at operator premises. Cryptographically signed hash chains, tamper-evident audit trails, cross-verification against public orbital data."
              />
              <ProductRow
                name="Ephemeris"
                href="/systems/ephemeris"
                description="Forward-looking compliance risk engine. Each satellite is a digital twin; the engine forecasts compliance trajectories across the mission lifecycle — orbital decay, fuel depletion, subsystem degradation — against regulatory deadlines."
              />
              <ProductRow
                name="Verity"
                href="/verity"
                description="Zero-knowledge compliance attestation. Ed25519-signed cryptographic proofs that demonstrate regulatory adherence to auditors, insurers, or counterparties without revealing the underlying operational data."
              />
            </div>
          </section>

          {/* For whom */}
          <section className="mb-12 md:mb-16">
            <h2 className="text-display-sm font-medium text-[#111827] mb-6 tracking-[-0.015em]">
              Who Caelex is for
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {[
                "Satellite operators (GEO, LEO, Earth observation, communications, navigation)",
                "Launch providers (orbital, sub-orbital)",
                "Ground-segment operators (ground stations, TT&C, mission control)",
                "Constellation operators (mega-constellations and specialised)",
                "In-orbit service providers (rendezvous, proximity ops, active debris removal)",
                "Space data providers (EO imagery, radar, signal intelligence)",
                "Space resource operators (asteroid mining, ISRU)",
                "Space-sector law firms and in-house counsel (Atlas product)",
              ].map((audience) => (
                <div key={audience} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-2 shrink-0" />
                  <span className="text-body-lg text-[#374151]">
                    {audience}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-body-lg text-[#6B7280]">
              Caelex is architected for operators of any size, from pre-seed
              startups preparing their first authorization to established primes
              with complex multi-jurisdiction portfolios.
            </p>
          </section>

          {/* Regulatory coverage */}
          <section className="mb-12 md:mb-16">
            <h2 className="text-display-sm font-medium text-[#111827] mb-6 tracking-[-0.015em]">
              Regulatory coverage
            </h2>
            <p className="text-body-lg text-[#374151] leading-relaxed mb-4">
              Caelex covers the full European space-regulatory landscape plus
              key international dependencies.
            </p>
            <dl className="space-y-5 text-body-lg">
              <div>
                <dt className="font-medium text-[#111827]">European Union</dt>
                <dd className="text-[#4B5563] leading-relaxed">
                  EU Space Act (119 articles), NIS2 Directive, CER Directive, EU
                  Dual-Use Regulation (2021/821), Galileo/Copernicus/IRIS²
                  governance, GDPR as applied to space data.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[#111827]">
                  National space laws
                </dt>
                <dd className="text-[#4B5563] leading-relaxed">
                  Germany (SatDSiG, SatDSiV,
                  Raumfahrtaufgabenübertragungs­gesetz, KRITIS-Dachgesetz 2026,
                  BSIG, TKG, AWG+AWV+Ausfuhrliste, KWKG), France (LOS 2008 +
                  implementing décrets, Code de la défense, CIEEMG + SBDU, Loi
                  Résilience, PPST, IEF), Luxembourg (Space Resources Act 2017,
                  Space Activities Act 2020), United Kingdom (Space Industry Act
                  2018), Italy, Spain, Netherlands, Belgium, Portugal, Ireland,
                  Greece, Norway, Sweden, Denmark, Finland, Austria,
                  Switzerland, and 18 more European jurisdictions, plus the
                  United States (FCC, FAA, NOAA, ITAR, EAR) and New Zealand.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[#111827]">
                  International instruments
                </dt>
                <dd className="text-[#4B5563] leading-relaxed">
                  All five UN space treaties (Outer Space Treaty 1967, Rescue
                  Agreement 1968, Liability Convention 1972, Registration
                  Convention 1975, Moon Agreement 1979), ITU Constitution +
                  Radio Regulations, COPUOS debris mitigation guidelines, IADC
                  guidelines, ISO 24113, the Artemis Accords, and the LTS
                  Guidelines for Long-Term Sustainability.
                </dd>
              </div>
            </dl>
          </section>

          {/* How Caelex compares */}
          <section className="mb-12 md:mb-16">
            <h2 className="text-display-sm font-medium text-[#111827] mb-6 tracking-[-0.015em]">
              How Caelex compares
            </h2>
            <div className="space-y-6">
              <Comparison
                title="vs. external compliance consultants"
                body="Consultants bill per engagement and deliver static deliverables. Caelex is a live system: the compliance state updates continuously as regulations change, as missions progress, as operator assets change. Consultants remain valuable for high-judgment legal opinions — Caelex complements them rather than replaces them."
              />
              <Comparison
                title="vs. spreadsheet-based tracking"
                body="The spreadsheet is the most common compliance tool at pre-Series-A operators. It breaks down as soon as multiple regulations, multiple jurisdictions, and multiple mission phases have to be reconciled — which is the point at which Caelex starts to make sense."
              />
              <Comparison
                title="vs. internal wiki tools (Notion, Confluence)"
                body="Internal wiki tools document compliance; they don't execute the compliance logic. Caelex runs the engine — given operator inputs it deterministically derives applicable articles, required evidence, and missing documents."
              />
              <Comparison
                title="vs. generic enterprise compliance suites"
                body="Generic compliance platforms have no space-specific engines. They can track tasks and audit trails but cannot tell an operator 'this new satellite at this constellation tier now triggers EU Space Act Art. 55 and SatDSiG licensing.' Caelex does exactly that, with jurisdiction-specific rules baked in."
              />
            </div>
          </section>

          {/* FAQ — rendered so both humans and FAQ-aware LLM crawlers pick it up */}
          <section className="mb-12 md:mb-16">
            <h2 className="text-display-sm font-medium text-[#111827] mb-6 tracking-[-0.015em]">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {FAQ.map((item) => (
                <div key={item.q} className="border-t border-[#E5E7EB] pt-5">
                  <h3 className="text-title font-medium text-[#111827] mb-2 tracking-[-0.01em]">
                    {item.q}
                  </h3>
                  <p className="text-body-lg text-[#4B5563] leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="border-t border-[#E5E7EB] pt-12 mt-16">
            <h2 className="text-display-sm font-medium text-[#111827] mb-4 tracking-[-0.015em]">
              Try Caelex
            </h2>
            <p className="text-body-lg text-[#4B5563] mb-6 max-w-[560px]">
              Run the free compliance assessment in a few minutes, or book a
              personalised demo.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/assessment"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#111827] text-white rounded-lg font-medium hover:bg-[#374151] transition-colors"
              >
                Free compliance assessment →
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-6 py-3 border border-[#E5E7EB] bg-white text-[#111827] rounded-lg font-medium hover:border-[#D1D5DB] transition-colors"
              >
                Book a demo
              </Link>
              <Link
                href="/atlas-access"
                className="inline-flex items-center justify-center px-6 py-3 border border-[#E5E7EB] bg-white text-[#111827] rounded-lg font-medium hover:border-[#D1D5DB] transition-colors"
              >
                Atlas (for law firms)
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function ProductRow({
  name,
  href,
  description,
}: {
  name: string;
  href: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group block border-t border-[#E5E7EB] pt-5 hover:border-[#D1D5DB] transition-colors"
    >
      <h3 className="text-title font-medium text-[#111827] mb-2 tracking-[-0.01em] group-hover:text-[#10B981] transition-colors">
        {name} →
      </h3>
      <p className="text-body-lg text-[#4B5563] leading-relaxed max-w-[720px]">
        {description}
      </p>
    </Link>
  );
}

function Comparison({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-title font-medium text-[#111827] mb-2 tracking-[-0.01em]">
        {title}
      </h3>
      <p className="text-body-lg text-[#4B5563] leading-relaxed max-w-[760px]">
        {body}
      </p>
    </div>
  );
}
