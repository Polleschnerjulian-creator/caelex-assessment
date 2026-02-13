import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  FileText,
  Globe,
  Scale,
  Shield,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { generateModuleBreadcrumbs } from "@/lib/breadcrumbs";
import { ProductJsonLd } from "@/components/seo/JsonLd";
import {
  moduleMetadata,
  getModuleMetadata,
  generateModulePageMetadata,
  siteConfig,
} from "@/lib/seo";

// ============================================================================
// STATIC PARAMS
// ============================================================================

export async function generateStaticParams() {
  return moduleMetadata.map((m) => ({
    slug: m.slug,
  }));
}

// ============================================================================
// METADATA
// ============================================================================

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateModulePageMetadata(slug);
}

// ============================================================================
// MODULE CONTENT DATA
// ============================================================================

const moduleContent: Record<
  string,
  {
    overview: string;
    assessmentIncludes: string[];
    documentsGenerated: string[];
    relatedModules: string[];
    relatedArticles: { title: string; slug: string }[];
  }
> = {
  authorization: {
    overview:
      "Space authorization is the foundational requirement for all space activities. Under the EU Space Act and national laws, operators must obtain authorization before launching, operating, or controlling spacecraft. This module guides you through the complete authorization process, from initial application to ongoing compliance.",
    assessmentIncludes: [
      "Determination of applicable authorization requirements",
      "Identification of relevant National Competent Authority (NCA)",
      "Pre-authorization checklist generation",
      "Document requirements mapping",
      "Timeline and milestone planning",
    ],
    documentsGenerated: [
      "Authorization Application Template",
      "Mission Profile Summary",
      "Operator Capability Statement",
      "Safety Assessment Framework",
      "NCA Correspondence Templates",
    ],
    relatedModules: ["supervision", "insurance", "debris-mitigation"],
    relatedArticles: [
      {
        title: "EU Space Act Article 5: Authorization Explained",
        slug: "eu-space-act-article-5-authorization",
      },
      { title: "How to Get a Satellite License", slug: "satellite-licensing" },
    ],
  },
  cybersecurity: {
    overview:
      "Space systems are increasingly targeted by cyber threats. The NIS2 Directive classifies space operators as essential entities, requiring robust cybersecurity measures. This module helps you implement security controls aligned with NIS2, NIST CSF, and ISO 27001.",
    assessmentIncludes: [
      "NIS2 essential/important entity classification",
      "Gap analysis against Art. 21(2) security measures",
      "Incident response capability assessment",
      "Supply chain security evaluation",
      "Governance and risk management review",
    ],
    documentsGenerated: [
      "Cybersecurity Policy Template",
      "Incident Response Plan",
      "Risk Assessment Report",
      "Security Measures Checklist",
      "NIS2 Compliance Report",
    ],
    relatedModules: ["nis2", "supervision", "authorization"],
    relatedArticles: [
      {
        title: "How NIS2 Affects Space Operators",
        slug: "nis2-space-operators",
      },
      {
        title: "Cybersecurity for Space: NIST Framework",
        slug: "space-cybersecurity-nist-framework",
      },
    ],
  },
  "debris-mitigation": {
    overview:
      "Space debris mitigation is critical for the long-term sustainability of space activities. Operators must comply with IADC guidelines, ISO 24113, and EU Space Act requirements for debris avoidance, passivation, and end-of-life disposal.",
    assessmentIncludes: [
      "Debris mitigation plan evaluation",
      "Deorbit/re-entry compliance check",
      "Passivation requirements assessment",
      "Collision avoidance capability review",
      "End-of-life disposal planning",
    ],
    documentsGenerated: [
      "Debris Mitigation Plan",
      "End-of-Life Disposal Plan",
      "Passivation Procedure",
      "Re-entry Safety Assessment",
      "IADC Compliance Checklist",
    ],
    relatedModules: ["environmental", "authorization", "copuos-iadc"],
    relatedArticles: [
      {
        title: "IADC vs ISO 24113: Standards Compared",
        slug: "space-debris-iadc-vs-iso",
      },
      {
        title: "Space Debris Mitigation Requirements",
        slug: "space-debris-mitigation",
      },
    ],
  },
  environmental: {
    overview:
      "Environmental compliance covers the impact of space activities on Earth and space environments. This includes launch emissions, protected areas, and increasingly, in-orbit environmental considerations.",
    assessmentIncludes: [
      "Environmental impact assessment requirements",
      "Launch site environmental compliance",
      "Emissions and sustainability evaluation",
      "Protected area considerations",
      "Environmental reporting obligations",
    ],
    documentsGenerated: [
      "Environmental Impact Statement",
      "Sustainability Assessment",
      "Emissions Report Template",
      "Environmental Compliance Checklist",
    ],
    relatedModules: ["debris-mitigation", "authorization", "copuos-iadc"],
    relatedArticles: [
      {
        title: "Space Sustainability Rating",
        slug: "space-sustainability-rating",
      },
    ],
  },
  insurance: {
    overview:
      "Third-party liability insurance is mandatory for space operators across most jurisdictions. Insurance requirements vary significantly by country, activity type, and risk profile. This module helps you navigate insurance obligations and coverage requirements.",
    assessmentIncludes: [
      "Insurance requirement determination by jurisdiction",
      "Coverage amount calculation",
      "Policy type recommendations",
      "Liability cap analysis",
      "Insurance documentation requirements",
    ],
    documentsGenerated: [
      "Insurance Requirements Summary",
      "Coverage Analysis Report",
      "Insurance Certificate Template",
      "Liability Assessment",
    ],
    relatedModules: ["authorization", "supervision"],
    relatedArticles: [
      {
        title: "Satellite Insurance Requirements in Europe",
        slug: "satellite-insurance-requirements-europe",
      },
      { title: "Space Insurance Requirements Guide", slug: "space-insurance" },
    ],
  },
  supervision: {
    overview:
      "Ongoing regulatory supervision ensures continued compliance throughout mission lifecycle. This includes reporting obligations, inspections, and maintaining authorization conditions.",
    assessmentIncludes: [
      "Ongoing reporting requirements mapping",
      "Inspection preparedness assessment",
      "Compliance monitoring framework",
      "Change notification procedures",
      "Record-keeping requirements",
    ],
    documentsGenerated: [
      "Compliance Monitoring Plan",
      "Reporting Calendar",
      "Inspection Checklist",
      "Change Notification Templates",
    ],
    relatedModules: ["authorization", "cybersecurity", "insurance"],
    relatedArticles: [],
  },
  "export-control": {
    overview:
      "Space technology often falls under export control regimes including ITAR (US), EAR (US), and EU dual-use regulations. Understanding which regime applies and obtaining necessary licenses is critical for international operations.",
    assessmentIncludes: [
      "Export control jurisdiction determination",
      "ITAR vs EAR classification",
      "EU dual-use screening",
      "License requirement analysis",
      "Technology control plan assessment",
    ],
    documentsGenerated: [
      "Export Classification Report",
      "Technology Control Plan",
      "License Application Guidance",
      "Export Compliance Manual",
    ],
    relatedModules: ["authorization", "us-regulatory"],
    relatedArticles: [
      {
        title: "ITAR vs EAR: Which Applies to Your Satellite?",
        slug: "itar-vs-ear-space",
      },
      { title: "Space Export Control Guide", slug: "space-export-control" },
    ],
  },
  spectrum: {
    overview:
      "Radio frequency spectrum is a limited resource governed by ITU Radio Regulations. Satellite operators must coordinate frequencies, file with the ITU, and comply with national spectrum authorities.",
    assessmentIncludes: [
      "Frequency coordination requirements",
      "ITU filing status review",
      "National spectrum license needs",
      "Interference mitigation planning",
      "Spectrum sharing assessment",
    ],
    documentsGenerated: [
      "Frequency Coordination Plan",
      "ITU Filing Checklist",
      "Spectrum License Application",
      "Interference Analysis Report",
    ],
    relatedModules: ["authorization", "us-regulatory"],
    relatedArticles: [
      {
        title: "ITU Frequency Coordination Guide",
        slug: "itu-frequency-coordination",
      },
    ],
  },
  nis2: {
    overview:
      "The NIS2 Directive (EU 2022/2555) establishes cybersecurity requirements for essential and important entities, including space operators. This module provides comprehensive NIS2 compliance guidance specific to the space sector.",
    assessmentIncludes: [
      "Entity classification (essential vs important)",
      "Security measures gap analysis",
      "Incident reporting requirements",
      "Supply chain security assessment",
      "Management liability review",
    ],
    documentsGenerated: [
      "NIS2 Compliance Assessment",
      "Security Measures Implementation Plan",
      "Incident Reporting Procedures",
      "Supply Chain Security Policy",
    ],
    relatedModules: ["cybersecurity", "supervision"],
    relatedArticles: [
      {
        title: "How NIS2 Affects Space Operators",
        slug: "nis2-space-operators",
      },
      { title: "NIS2 Compliance Guide for Space", slug: "nis2-space" },
    ],
  },
  "copuos-iadc": {
    overview:
      "UN COPUOS Long-Term Sustainability Guidelines and IADC Space Debris Mitigation Guidelines represent international best practices for responsible space operations. Many national laws reference these guidelines.",
    assessmentIncludes: [
      "COPUOS LTS guideline mapping",
      "IADC guideline compliance check",
      "Best practice gap analysis",
      "International obligation review",
      "Voluntary commitment tracking",
    ],
    documentsGenerated: [
      "COPUOS LTS Compliance Report",
      "IADC Guidelines Checklist",
      "Best Practice Assessment",
      "International Obligations Summary",
    ],
    relatedModules: ["debris-mitigation", "environmental", "authorization"],
    relatedArticles: [
      {
        title: "COPUOS Guidelines Compliance",
        slug: "copuos-guidelines-compliance",
      },
    ],
  },
  "uk-space-act": {
    overview:
      "The UK Space Industry Act 2018 established a comprehensive regulatory framework for space activities in the UK. The UK Space Agency (UKSA) is the licensing authority for launches and orbital operations.",
    assessmentIncludes: [
      "UK licensing requirement determination",
      "UKSA application process guidance",
      "Insurance requirement analysis",
      "Range safety assessment",
      "Ongoing compliance obligations",
    ],
    documentsGenerated: [
      "UK License Application Checklist",
      "Mission Safety Assessment",
      "UK Insurance Requirements Summary",
      "UKSA Compliance Report",
    ],
    relatedModules: ["authorization", "insurance", "supervision"],
    relatedArticles: [
      {
        title: "UK Space Industry Act Guide",
        slug: "uk-space-industry-act-guide",
      },
    ],
  },
  "us-regulatory": {
    overview:
      "US space regulation involves multiple agencies: FAA for launches, FCC for spectrum, and NOAA for remote sensing. Understanding the US regulatory landscape is essential for market access and partnerships.",
    assessmentIncludes: [
      "FAA launch license requirements",
      "FCC spectrum licensing needs",
      "NOAA remote sensing requirements",
      "Export control implications",
      "US market access strategy",
    ],
    documentsGenerated: [
      "US Regulatory Requirements Summary",
      "FAA License Guidance",
      "FCC Filing Checklist",
      "NOAA License Assessment",
    ],
    relatedModules: ["export-control", "spectrum", "authorization"],
    relatedArticles: [],
  },
};

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default async function ModulePage({ params }: PageProps) {
  const { slug } = await params;
  const moduleInfo = getModuleMetadata(slug);

  if (!moduleInfo) {
    notFound();
  }

  const content = moduleContent[slug] || {
    overview: moduleInfo.description,
    assessmentIncludes: [],
    documentsGenerated: [],
    relatedModules: [],
    relatedArticles: [],
  };

  const relatedModuleData = content.relatedModules
    .map((s) => getModuleMetadata(s))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      {/* JSON-LD */}
      <ProductJsonLd
        name={moduleInfo.title}
        description={moduleInfo.description}
        url={`${siteConfig.url}/modules/${moduleInfo.slug}`}
        category="Space Compliance Module"
      />

      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={generateModuleBreadcrumbs(moduleInfo.title, moduleInfo.slug)}
            className="mb-8"
          />

          {/* Header */}
          <div className="max-w-3xl mb-16">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-white mb-6">
              {moduleInfo.h1}
            </h1>
            <p className="text-[17px] text-white/50 leading-relaxed">
              {content.overview}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Regulations Covered */}
              <section>
                <h2 className="text-[24px] font-medium text-white mb-6 flex items-center gap-3">
                  <Scale size={24} className="text-emerald-400" />
                  What regulations does this cover?
                </h2>
                <div className="flex flex-wrap gap-2">
                  {moduleInfo.regulations.map((reg) => (
                    <span
                      key={reg}
                      className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-[14px] text-white/70"
                    >
                      {reg}
                    </span>
                  ))}
                </div>
              </section>

              {/* Jurisdictions */}
              <section>
                <h2 className="text-[24px] font-medium text-white mb-6 flex items-center gap-3">
                  <Globe size={24} className="text-emerald-400" />
                  Which jurisdictions?
                </h2>
                <div className="flex flex-wrap gap-2">
                  {moduleInfo.jurisdictions.map((j) => (
                    <span
                      key={j}
                      className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[14px] text-emerald-400/80"
                    >
                      {j}
                    </span>
                  ))}
                </div>
              </section>

              {/* Assessment Includes */}
              {content.assessmentIncludes.length > 0 && (
                <section>
                  <h2 className="text-[24px] font-medium text-white mb-6 flex items-center gap-3">
                    <Shield size={24} className="text-emerald-400" />
                    What does the assessment include?
                  </h2>
                  <ul className="space-y-3">
                    {content.assessmentIncludes.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-[15px] text-white/60"
                      >
                        <CheckCircle
                          size={18}
                          className="text-emerald-400 mt-0.5 flex-shrink-0"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Documents Generated */}
              {content.documentsGenerated.length > 0 && (
                <section>
                  <h2 className="text-[24px] font-medium text-white mb-6 flex items-center gap-3">
                    <FileText size={24} className="text-emerald-400" />
                    What documents are generated?
                  </h2>
                  <ul className="space-y-3">
                    {content.documentsGenerated.map((doc, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-[15px] text-white/60"
                      >
                        <FileText
                          size={18}
                          className="text-white/30 mt-0.5 flex-shrink-0"
                        />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* CTA Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                <h3 className="text-[18px] font-medium text-white mb-3">
                  Start Your Assessment
                </h3>
                <p className="text-[14px] text-white/50 mb-6">
                  Get your personalized {moduleInfo.title.toLowerCase()}{" "}
                  compliance profile in minutes.
                </p>
                <Link
                  href="/assessment"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-emerald-500 text-white text-[14px] font-medium hover:bg-emerald-400 transition-colors"
                >
                  Start Assessment
                  <ArrowRight size={16} />
                </Link>
              </div>

              {/* Related Modules */}
              {relatedModuleData.length > 0 && (
                <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <h3 className="text-[16px] font-medium text-white mb-4">
                    Related Modules
                  </h3>
                  <div className="space-y-3">
                    {relatedModuleData.map((m) => (
                      <Link
                        key={m!.slug}
                        href={`/modules/${m!.slug}`}
                        className="block text-[14px] text-white/60 hover:text-emerald-400 transition-colors"
                      >
                        {m!.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Articles */}
              {content.relatedArticles.length > 0 && (
                <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <h3 className="text-[16px] font-medium text-white mb-4">
                    Related Articles
                  </h3>
                  <div className="space-y-3">
                    {content.relatedArticles.map((article) => (
                      <Link
                        key={article.slug}
                        href={`/blog/${article.slug}`}
                        className="block text-[14px] text-white/60 hover:text-emerald-400 transition-colors"
                      >
                        {article.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
