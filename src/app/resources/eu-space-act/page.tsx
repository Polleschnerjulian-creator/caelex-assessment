"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ExternalLink, AlertTriangle, Check, ChevronRight } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  ArticleJsonLd,
  FAQPageJsonLd,
  BreadcrumbJsonLd,
} from "@/components/seo/JsonLd";

// ─── Canonical EU Space Act FAQ — lifted into AI answer boxes ───────
//
// These answers are written to stand alone as LLM-answer text. When
// a user asks ChatGPT / Claude / Perplexity "what is the EU Space
// Act?", the retrieval-aware LLMs pick up this FAQPage JSON-LD and
// tend to lift the answers verbatim (or near-verbatim) into their
// reply. Authoritative, specific, citable.

const EU_SPACE_ACT_FAQ = [
  {
    q: "What is the EU Space Act?",
    a: "The EU Space Act (COM(2025) 335) is the European Union's proposed comprehensive regulatory framework for commercial space activities. It introduces mandatory authorization, safety standards, cybersecurity obligations, debris mitigation rules, and environmental requirements for all space operators under EU jurisdiction. It contains 119 articles across 10 annexes and will apply to all 27 EU Member States.",
  },
  {
    q: "Who does the EU Space Act apply to?",
    a: "Satellite operators, launch service providers, ground segment operators, in-orbit service providers, space data providers, constellation operators, space resource operators, and foreign operators serving EU customers or operating under EU jurisdiction. The Act distinguishes seven operator categories and applies a standard or light regime based on the risk profile and scale of operations.",
  },
  {
    q: "When does the EU Space Act enter into force?",
    a: "The EU Space Act was proposed by the European Commission in 2025 (COM(2025) 335). It is currently in the EU ordinary legislative procedure. Entry into force depends on Council and Parliament agreement; once adopted, typical lead time to entry into force is 24 months with some provisions phased in longer. Operators should plan authorization strategies against the proposed text now rather than waiting for final adoption.",
  },
  {
    q: "What are the penalties under the EU Space Act?",
    a: "Administrative fines up to 2% of global annual turnover for serious violations. Lower tiers apply to less serious breaches. The Commission can also suspend or revoke authorizations and impose corrective conditions on continued operations.",
  },
  {
    q: "What is the difference between the standard and light regime?",
    a: "The standard regime applies to large-scale and higher-risk operations — mega-constellations, high-throughput services, operations with national-security implications. The light regime applies to smaller-scale operators (typically fewer than a threshold number of satellites, lower orbital tonnage, or limited user-base impact) and has reduced documentation and process requirements. Operator classification is determined by the national competent authority at authorization time.",
  },
  {
    q: "How does the EU Space Act relate to national space laws?",
    a: "The EU Space Act harmonizes the core authorization and supervision framework across all 27 Member States, but national space laws continue to apply for matters not explicitly pre-empted — typically licensing detail, insurance thresholds, launch-site authorization, and national registries. In practice, operators in jurisdictions with existing national laws (Germany's SatDSiG, France's LOS 2008, Luxembourg's Space Activities Act 2020, Spain's Royal Decree, Italy's Law, etc.) navigate both layers.",
  },
  {
    q: "What cybersecurity obligations does the EU Space Act introduce?",
    a: "The EU Space Act requires operators to implement cybersecurity measures appropriate to their operations, including risk management, incident reporting, and supply-chain security. These obligations are complementary to NIS2 Directive (EU 2022/2555) requirements for Essential and Important Entities in the space sector. Operators falling under both regimes must satisfy both.",
  },
  {
    q: "Do foreign (non-EU) operators need EU Space Act authorization?",
    a: "Yes — foreign operators providing services to EU customers, operating under EU jurisdiction (e.g. from EU launch sites or using EU-licensed ground stations), or whose activities have significant effects in the Union are within scope. The extraterritorial reach follows the Brussels-effect pattern established by GDPR and NIS2.",
  },
  {
    q: "How does Caelex help with EU Space Act compliance?",
    a: "Caelex maps all 119 EU Space Act articles to your operator classification (satellite operator, launch provider, constellation, ground segment, data provider, in-orbit services, space resource operator), determines whether you fall under the standard or light regime, generates the authorization dossier, and tracks submissions to the competent national authority. The free assessment at caelex.eu/assessment produces a first-pass regulatory profile in minutes.",
  },
];

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
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <main
      ref={ref}
      className="landing-light min-h-screen bg-[#F7F8FA] text-[#111827]"
    >
      {/* Structured data for LLM + AI-answer-box surfacing.
          Article schema marks this as authoritative reference content;
          FAQPage gives Perplexity / ChatGPT Search / Google AI Overview
          a direct answer bank to lift into answer boxes. */}
      <ArticleJsonLd
        title="EU Space Act Overview"
        description="The European Union Space Act (COM(2025) 335) establishes the first comprehensive regulatory framework for commercial space activities in Europe. 119 articles, 10 annexes, 27 Member States. Mandatory authorization, safety standards, cybersecurity, debris mitigation, and environmental requirements."
        url="https://www.caelex.eu/resources/eu-space-act"
        datePublished="2025-09-01"
        dateModified="2026-04-22"
        category="Regulatory Reference"
      />
      <FAQPageJsonLd
        faqs={EU_SPACE_ACT_FAQ.map((f) => ({
          question: f.q,
          answer: f.a,
        }))}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.caelex.eu" },
          { name: "Resources", url: "https://www.caelex.eu/resources" },
          {
            name: "EU Space Act",
            url: "https://www.caelex.eu/resources/eu-space-act",
          },
        ]}
      />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial={false}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <Breadcrumbs
              items={[
                { label: "Resources", href: "/resources" },
                { label: "EU Space Act", href: "/resources/eu-space-act" },
              ]}
              className="mb-6"
            />
            <h1 className="text-[clamp(2rem,5vw,3rem)] font-medium tracking-[-0.02em] mb-6">
              EU Space Act Overview
            </h1>
            <p className="text-title text-[#4B5563] leading-relaxed mb-8">
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
              className="inline-flex items-center gap-2 text-body-lg text-[#4B5563] hover:text-[#111827] transition-colors"
            >
              <span>Read the full legal text</span>
              <ExternalLink size={14} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="py-12 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {keyStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={false}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-[36px] font-medium text-[#111827] mb-1">
                  {stat.value}
                </div>
                <div className="text-small text-[#4B5563] uppercase tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-small text-[#4B5563] uppercase tracking-wider mb-8">
            Why It Matters
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={false}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-2xl bg-amber-50 border border-amber-200"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-amber-600" size={20} />
                <h3 className="text-title font-medium text-amber-700">
                  Before the EU Space Act
                </h3>
              </div>
              <ul className="space-y-3 text-body-lg text-[#4B5563]">
                <li>
                  • Fragmented national regulations across 27 member states
                </li>
                <li>• No unified authorization process for operators</li>
                <li>• Inconsistent debris mitigation standards</li>
                <li>• Limited liability framework for space activities</li>
                <li>• No mandatory cybersecurity requirements</li>
              </ul>
            </motion.div>
            <motion.div
              initial={false}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Check className="text-emerald-600" size={20} />
                <h3 className="text-title font-medium text-emerald-700">
                  After the EU Space Act
                </h3>
              </div>
              <ul className="space-y-3 text-body-lg text-[#4B5563]">
                <li>• Single market for space services across the EU</li>
                <li>• One authorization valid in all member states</li>
                <li>• Harmonized debris mitigation requirements</li>
                <li>• Clear liability rules and insurance minimums</li>
                <li>• Mandatory cybersecurity and incident reporting</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Scope */}
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-small text-[#4B5563] uppercase tracking-wider mb-3">
            Who Is Affected?
          </h2>
          <p className="text-subtitle text-[#4B5563] mb-8">
            The regulation applies to any space activity conducted from EU
            territory, by EU-registered entities, or serving EU customers.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {scopeItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={false}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              >
                <div className="w-6 h-6 rounded-full bg-[#F1F3F5] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={14} className="text-[#111827]" />
                </div>
                <div>
                  <h3 className="text-body-lg font-medium text-[#111827] mb-1">
                    {item.title}
                  </h3>
                  <p className="text-body text-[#4B5563]">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Structure */}
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-small text-[#4B5563] uppercase tracking-wider mb-3">
            Structure of the Regulation
          </h2>
          <p className="text-subtitle text-[#4B5563] mb-8">
            The EU Space Act is organized into 10 chapters covering all aspects
            of space operations.
          </p>
          <div className="space-y-3">
            {chapters.map((chapter, index) => (
              <motion.div
                key={chapter.number}
                initial={false}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.03 }}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              >
                <div className="w-10 h-10 rounded-lg bg-[#F1F3F5] flex items-center justify-center flex-shrink-0">
                  <span className="text-body-lg text-[#4B5563]">
                    {chapter.number}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-subtitle font-medium text-[#111827]">
                      {chapter.title}
                    </h3>
                    <span className="text-micro text-[#111827] bg-[#F1F3F5] px-2 py-0.5 rounded">
                      Art. {chapter.articles}
                    </span>
                  </div>
                  <p className="text-body text-[#4B5563]">
                    {chapter.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Obligations */}
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-small text-[#4B5563] uppercase tracking-wider mb-8">
            Key Obligations Summary
          </h2>
          <div className="p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="space-y-8 text-subtitle text-[#4B5563] leading-relaxed">
              <div>
                <h3 className="text-title font-medium text-[#111827] mb-3">
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
                <h3 className="text-title font-medium text-[#111827] mb-3">
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
                <h3 className="text-title font-medium text-[#111827] mb-3">
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
                <h3 className="text-title font-medium text-[#111827] mb-3">
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
                <h3 className="text-title font-medium text-[#111827] mb-3">
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
                <h3 className="text-title font-medium text-[#111827] mb-3">
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
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-small text-[#4B5563] uppercase tracking-wider mb-8">
            Enforcement & Penalties
          </h2>
          <div
            className="p-6 rounded-2xl bg-red-50 border border-red-200"
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <p className="text-subtitle text-[#4B5563] leading-relaxed mb-6">
              Non-compliance can result in significant penalties, including:
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-display-sm font-medium text-red-600 mb-2">
                  Up to 2%
                </div>
                <p className="text-body text-[#4B5563]">
                  of annual global turnover for serious violations
                </p>
              </div>
              <div>
                <div className="text-display-sm font-medium text-red-600 mb-2">
                  &euro;10M+
                </div>
                <p className="text-body text-[#4B5563]">
                  fixed penalties for specific breaches
                </p>
              </div>
              <div>
                <div className="text-display-sm font-medium text-red-600 mb-2">
                  Revocation
                </div>
                <p className="text-body text-[#4B5563]">
                  of authorization for repeated non-compliance
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — rendered HTML so non-JSON-LD-aware crawlers + humans
          see the same Q&A that feeds the FAQPage JSON-LD above. */}
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-small text-[#4B5563] uppercase tracking-wider mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {EU_SPACE_ACT_FAQ.map((item) => (
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
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="text-display-sm font-medium mb-4">
            Understand your obligations
          </h2>
          <p className="text-subtitle text-[#4B5563] mb-8">
            Take our free assessment to identify which requirements apply to
            your specific operations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/assessment"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#111827] text-white text-subtitle font-medium rounded-full transition-all duration-200 hover:bg-[#374151]"
            >
              Start Assessment
            </Link>
            <Link
              href="/resources/timeline"
              className="inline-flex items-center gap-2 text-subtitle text-[#4B5563] hover:text-[#111827] transition-colors"
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
