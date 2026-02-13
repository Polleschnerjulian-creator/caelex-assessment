import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FileText,
  Scale,
  Shield,
  Banknote,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { generateJurisdictionBreadcrumbs } from "@/lib/breadcrumbs";
import { ArticleJsonLd } from "@/components/seo/JsonLd";
import {
  jurisdictionMetadata,
  getJurisdictionMetadata,
  generateJurisdictionPageMetadata,
  siteConfig,
} from "@/lib/seo";

// ============================================================================
// STATIC PARAMS
// ============================================================================

export async function generateStaticParams() {
  return jurisdictionMetadata.map((j) => ({
    slug: j.slug,
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
  return generateJurisdictionPageMetadata(slug);
}

// ============================================================================
// JURISDICTION CONTENT DATA
// ============================================================================

const jurisdictionContent: Record<
  string,
  {
    overview: string;
    keyProvisions: string[];
    authorizationRequirements: string[];
    insuranceRequirements: string;
    euSpaceActRelation: string;
    caelexModules: string[];
  }
> = {
  germany: {
    overview:
      "Germany regulates space activities primarily through the Satellite Data Security Act (SatDSiG), which focuses on high-resolution Earth observation satellites. For broader space activities, operators must work with the German Aerospace Center (DLR) and relevant federal ministries.",
    keyProvisions: [
      "Licensing required for Earth observation satellites with resolution < 2.5m",
      "Data security requirements for sensitive imagery",
      "Export restrictions on high-resolution data",
      "Registration with UN space object registry via DLR",
    ],
    authorizationRequirements: [
      "Application to Federal Ministry for Economic Affairs",
      "Technical dossier including satellite specifications",
      "Data security concept",
      "Proof of financial capacity",
      "Third-party liability insurance",
    ],
    insuranceRequirements:
      "Minimum EUR 60 million third-party liability coverage required. Higher amounts may be required based on mission risk assessment.",
    euSpaceActRelation:
      "The EU Space Act will complement SatDSiG by providing a broader framework for all space activities. German operators will need to comply with both frameworks, with the EU Space Act taking precedence for matters within its scope.",
    caelexModules: [
      "authorization",
      "cybersecurity",
      "insurance",
      "supervision",
    ],
  },
  france: {
    overview:
      "France has one of the most comprehensive national space laws in Europe — the Loi relative aux opérations spatiales (LOS) of 2008. CNES acts as the technical authority, while authorization decisions rest with the relevant ministry.",
    keyProvisions: [
      "Authorization required for all launch and orbital operations",
      "Strict liability regime for space operators",
      "Mandatory third-party liability insurance",
      "Technical standards set by CNES",
      "End-of-life disposal requirements",
    ],
    authorizationRequirements: [
      "Application submitted to Ministry of Higher Education and Research",
      "Technical assessment by CNES",
      "Proof of financial guarantees",
      "Third-party liability insurance",
      "Debris mitigation plan",
      "Ground segment security assessment",
    ],
    insuranceRequirements:
      "Minimum EUR 60 million for launch phase, EUR 20 million for in-orbit operations. State provides additional coverage through guarantee mechanism.",
    euSpaceActRelation:
      "France's LOS is often cited as a model for the EU Space Act. French operators are already well-prepared for EU-level requirements, though some adjustments may be needed for NIS2 cybersecurity obligations.",
    caelexModules: [
      "authorization",
      "debris-mitigation",
      "insurance",
      "supervision",
      "cybersecurity",
    ],
  },
  "united-kingdom": {
    overview:
      "The UK Space Industry Act 2018 created a modern, comprehensive framework for space activities. Post-Brexit, the UK has emerged as an attractive jurisdiction for satellite operators, with competitive licensing processes and established spaceports.",
    keyProvisions: [
      "Licenses required for spaceflight activities from UK territory",
      "Orbital operator licenses for in-orbit operations",
      "Range control licenses for spaceport operators",
      "Liability provisions with government indemnification options",
    ],
    authorizationRequirements: [
      "Application to UK Space Agency (UKSA)",
      "Mission safety assessment",
      "Environmental assessment",
      "Insurance or financial guarantee",
      "Orbital debris mitigation plan",
      "Range safety analysis (for launches)",
    ],
    insuranceRequirements:
      "Amount determined by UKSA based on risk assessment. Government may provide indemnification for claims exceeding insurance coverage under certain conditions.",
    euSpaceActRelation:
      "Post-Brexit, UK operators are not subject to EU Space Act. However, for operations involving EU customers or EU spectrum, understanding EU requirements remains important. Mutual recognition may be negotiated.",
    caelexModules: [
      "uk-space-act",
      "authorization",
      "insurance",
      "debris-mitigation",
    ],
  },
  luxembourg: {
    overview:
      "Luxembourg has positioned itself as a space-friendly jurisdiction, particularly for space resources and NewSpace companies. The 2020 Space Activities Law provides a modern, flexible framework for authorization.",
    keyProvisions: [
      "Authorization required for space activities by Luxembourg entities",
      "Explicit legal framework for space resources activities",
      "Flexible supervision adapted to operator size",
      "Government equity participation programs available",
    ],
    authorizationRequirements: [
      "Application to Luxembourg Space Agency (LSA)",
      "Technical documentation",
      "Financial capacity demonstration",
      "Insurance coverage",
      "Headquarters requirement in Luxembourg",
    ],
    insuranceRequirements:
      "Amount determined case-by-case based on mission profile. Luxembourg offers competitive insurance requirements compared to other jurisdictions.",
    euSpaceActRelation:
      "Luxembourg's space law is well-aligned with emerging EU requirements. The country is active in EU space policy discussions and positions itself as a gateway to the European space market.",
    caelexModules: ["authorization", "insurance", "supervision"],
  },
  netherlands: {
    overview:
      "The Netherlands Space Activities Act (Wet ruimtevaartactiviteiten) of 2007 regulates space activities conducted by Dutch entities or from Dutch territory. The Netherlands Space Office (NSO) serves as the licensing authority.",
    keyProvisions: [
      "License required for launch and operation of space objects",
      "Registration requirements for space objects",
      "Third-party liability provisions",
      "State guarantee mechanism for excess liability",
    ],
    authorizationRequirements: [
      "Application to Netherlands Space Office",
      "Technical specifications",
      "Financial capability proof",
      "Third-party liability insurance",
      "End-of-life disposal plan",
    ],
    insuranceRequirements:
      "EUR 65 million minimum for most operations. State provides guarantee for claims exceeding insurance coverage up to defined limits.",
    euSpaceActRelation:
      "Dutch space law provides solid foundation for EU Space Act compliance. Netherlands is home to ESA/ESTEC and actively involved in EU space policy.",
    caelexModules: [
      "authorization",
      "insurance",
      "debris-mitigation",
      "supervision",
    ],
  },
  belgium: {
    overview:
      "Belgium's 2005 space law was among the first national space laws in Europe. BELSPO (Belgian Science Policy Office) manages space activities authorization and registration.",
    keyProvisions: [
      "Authorization for launch, orbital operations, and ground control",
      "Mandatory registration of space objects",
      "Third-party liability requirements",
      "Supervision and inspection provisions",
    ],
    authorizationRequirements: [
      "Application to BELSPO",
      "Technical dossier",
      "Financial guarantees",
      "Insurance certification",
      "Operational procedures",
    ],
    insuranceRequirements:
      "Determined based on mission risk assessment. Minimum amounts apply with state guarantee provisions for excess liability.",
    euSpaceActRelation:
      "Belgium's space law predates EU efforts and may require updates to fully align with EU Space Act requirements, particularly regarding cybersecurity and debris mitigation.",
    caelexModules: ["authorization", "insurance", "supervision"],
  },
  austria: {
    overview:
      "Austria's Outer Space Act (Weltraumgesetz) of 2011 establishes authorization requirements for space activities. The Austrian Research Promotion Agency (FFG) handles space-related matters.",
    keyProvisions: [
      "Authorization for space activities by Austrian entities",
      "Registration with UN registry",
      "Third-party liability provisions",
      "Environmental protection requirements",
    ],
    authorizationRequirements: [
      "Application to competent federal ministry",
      "Technical documentation",
      "Financial responsibility proof",
      "Insurance coverage",
      "Debris mitigation measures",
    ],
    insuranceRequirements:
      "Insurance amount determined case-by-case. Austria has relatively flexible requirements adapted to mission profile.",
    euSpaceActRelation:
      "Austrian space law is compatible with EU frameworks. Updates may be needed for specific EU Space Act provisions regarding cybersecurity and supervision.",
    caelexModules: ["authorization", "insurance", "environmental"],
  },
  denmark: {
    overview:
      "Denmark's Outer Space Act of 2016 establishes a modern framework for space activities. The Danish Agency for Science and Higher Education handles space licensing.",
    keyProvisions: [
      "License required for space activities from Danish territory",
      "Registration and tracking requirements",
      "Liability and insurance provisions",
      "Environmental considerations",
    ],
    authorizationRequirements: [
      "Application to Danish Agency for Science",
      "Mission specifications",
      "Insurance documentation",
      "Debris mitigation plan",
      "Security assessment",
    ],
    insuranceRequirements:
      "Amount based on mission risk profile. Denmark applies reasonable insurance thresholds appropriate for different activity types.",
    euSpaceActRelation:
      "Denmark's 2016 law is relatively modern and well-positioned for EU Space Act compliance. Minor adjustments may be needed for specific EU requirements.",
    caelexModules: ["authorization", "debris-mitigation", "insurance"],
  },
  italy: {
    overview:
      "Italy enacted comprehensive space legislation in 2018, with ASI (Italian Space Agency) playing a central role in authorization and supervision of space activities.",
    keyProvisions: [
      "Authorization for launch and orbital operations",
      "ASI technical oversight",
      "Third-party liability framework",
      "Space situational awareness participation",
    ],
    authorizationRequirements: [
      "Application to designated ministry with ASI assessment",
      "Technical documentation",
      "Insurance certificate",
      "Financial guarantees",
      "Compliance with debris guidelines",
    ],
    insuranceRequirements:
      "Insurance requirements aligned with other major EU spacefaring nations. Specific amounts determined through risk assessment.",
    euSpaceActRelation:
      "Italy's 2018 law is relatively recent and designed with EU harmonization in mind. Italy is a major EU space player and actively shapes EU space policy.",
    caelexModules: [
      "authorization",
      "insurance",
      "supervision",
      "debris-mitigation",
    ],
  },
  norway: {
    overview:
      "Norway's space activities are governed by the 1969 Act on Launching Objects from Norwegian Territory. While dated, it provides basic authorization framework. NOSA (Norwegian Space Agency) handles space matters.",
    keyProvisions: [
      "Royal decree required for space launches from Norway",
      "State responsibility for space objects",
      "Emerging spaceport development (Andøya)",
      "Active ESA participation",
    ],
    authorizationRequirements: [
      "Government authorization required",
      "Technical assessment",
      "Insurance provisions",
      "Environmental clearance",
      "Safety analysis",
    ],
    insuranceRequirements:
      "Determined case-by-case. Norway may modernize insurance requirements as Andøya spaceport becomes operational.",
    euSpaceActRelation:
      "As an EEA member, Norway will be affected by EU Space Act provisions that become EEA-relevant. Norway participates in EU space programs and aligns with EU regulations where applicable.",
    caelexModules: ["authorization", "insurance", "environmental"],
  },
  "european-union": {
    overview:
      "The EU is developing a comprehensive space regulatory framework through the proposed EU Space Act and the already-applicable NIS2 Directive. This EU-level approach complements national space laws and establishes common standards across member states.",
    keyProvisions: [
      "Common authorization framework for EU operators",
      "Cybersecurity requirements under NIS2",
      "Space debris mitigation standards",
      "Space traffic management coordination",
      "EU Space Programme integration (Galileo, Copernicus, GOVSATCOM)",
    ],
    authorizationRequirements: [
      "Authorization from National Competent Authority (NCA)",
      "Compliance with EU Space Act standards",
      "NIS2 cybersecurity measures for essential entities",
      "Debris mitigation per EU standards",
      "Insurance per national requirements",
    ],
    insuranceRequirements:
      "The EU Space Act will establish minimum insurance standards. National requirements continue to apply, with EU providing floor levels.",
    euSpaceActRelation:
      "The EU Space Act is the central framework. It establishes common standards while allowing member states to maintain stricter national requirements in certain areas.",
    caelexModules: [
      "authorization",
      "cybersecurity",
      "nis2",
      "debris-mitigation",
      "supervision",
      "insurance",
    ],
  },
};

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default async function JurisdictionPage({ params }: PageProps) {
  const { slug } = await params;
  const jurisdiction = getJurisdictionMetadata(slug);

  if (!jurisdiction) {
    notFound();
  }

  const content = jurisdictionContent[slug] || {
    overview: jurisdiction.description,
    keyProvisions: [],
    authorizationRequirements: [],
    insuranceRequirements: "",
    euSpaceActRelation: "",
    caelexModules: [],
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      {/* JSON-LD */}
      <ArticleJsonLd
        title={jurisdiction.h1}
        description={jurisdiction.description}
        url={`${siteConfig.url}/jurisdictions/${jurisdiction.slug}`}
        datePublished="2025-01-15"
        category="Jurisdictions"
      />

      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={generateJurisdictionBreadcrumbs(
              jurisdiction.country,
              jurisdiction.slug,
            )}
            className="mb-8"
          />

          {/* Header */}
          <div className="max-w-3xl mb-16">
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-white mb-6">
              {jurisdiction.h1}
            </h1>
            <p className="text-[17px] text-white/50 leading-relaxed">
              {content.overview}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* National Space Law */}
              <section>
                <h2 className="text-[24px] font-medium text-white mb-6 flex items-center gap-3">
                  <Scale size={24} className="text-emerald-400" />
                  National Space Law
                </h2>
                <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <p className="text-[16px] text-white/70 font-medium mb-4">
                    {jurisdiction.spaceLaw}
                  </p>
                  {content.keyProvisions.length > 0 && (
                    <ul className="space-y-2">
                      {content.keyProvisions.map((provision, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-[14px] text-white/50"
                        >
                          <span className="text-emerald-400 mt-1">•</span>
                          {provision}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {/* NCA */}
              <section>
                <h2 className="text-[24px] font-medium text-white mb-6 flex items-center gap-3">
                  <Building2 size={24} className="text-emerald-400" />
                  National Competent Authority (NCA)
                </h2>
                <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <p className="text-[18px] text-white font-medium mb-2">
                    {jurisdiction.nca}
                  </p>
                  <p className="text-[14px] text-white/50">
                    {jurisdiction.ncaFull}
                  </p>
                </div>
              </section>

              {/* Authorization Requirements */}
              {content.authorizationRequirements.length > 0 && (
                <section>
                  <h2 className="text-[24px] font-medium text-white mb-6 flex items-center gap-3">
                    <FileText size={24} className="text-emerald-400" />
                    Authorization Requirements
                  </h2>
                  <ul className="space-y-3">
                    {content.authorizationRequirements.map((req, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-[15px] text-white/60"
                      >
                        <Shield
                          size={18}
                          className="text-emerald-400 mt-0.5 flex-shrink-0"
                        />
                        {req}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Insurance */}
              {content.insuranceRequirements && (
                <section>
                  <h2 className="text-[24px] font-medium text-white mb-6 flex items-center gap-3">
                    <Banknote size={24} className="text-emerald-400" />
                    Insurance & Liability
                  </h2>
                  <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <p className="text-[15px] text-white/60 leading-relaxed">
                      {content.insuranceRequirements}
                    </p>
                  </div>
                </section>
              )}

              {/* EU Space Act Relation */}
              {content.euSpaceActRelation && (
                <section>
                  <h2 className="text-[24px] font-medium text-white mb-6">
                    Key Differences from EU Space Act
                  </h2>
                  <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-[15px] text-white/60 leading-relaxed">
                      {content.euSpaceActRelation}
                    </p>
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* CTA Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                <h3 className="text-[18px] font-medium text-white mb-3">
                  Assess Your Compliance in {jurisdiction.country}
                </h3>
                <p className="text-[14px] text-white/50 mb-6">
                  Get a personalized compliance profile for{" "}
                  {jurisdiction.country} regulations in minutes.
                </p>
                <Link
                  href="/assessment"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-emerald-500 text-white text-[14px] font-medium hover:bg-emerald-400 transition-colors"
                >
                  Start Assessment
                  <ArrowRight size={16} />
                </Link>
              </div>

              {/* Caelex Coverage */}
              {content.caelexModules.length > 0 && (
                <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <h3 className="text-[16px] font-medium text-white mb-4">
                    Caelex Coverage
                  </h3>
                  <p className="text-[13px] text-white/40 mb-4">
                    Relevant compliance modules for {jurisdiction.country}:
                  </p>
                  <div className="space-y-2">
                    {content.caelexModules.map((moduleSlug) => (
                      <Link
                        key={moduleSlug}
                        href={`/modules/${moduleSlug}`}
                        className="block text-[14px] text-white/60 hover:text-emerald-400 transition-colors capitalize"
                      >
                        {moduleSlug.replace(/-/g, " ")}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Jurisdictions */}
              <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <h3 className="text-[16px] font-medium text-white mb-4">
                  Other Jurisdictions
                </h3>
                <div className="space-y-2">
                  {jurisdictionMetadata
                    .filter((j) => j.slug !== slug)
                    .slice(0, 5)
                    .map((j) => (
                      <Link
                        key={j.slug}
                        href={`/jurisdictions/${j.slug}`}
                        className="block text-[14px] text-white/60 hover:text-emerald-400 transition-colors"
                      >
                        {j.country}
                      </Link>
                    ))}
                  <Link
                    href="/jurisdictions"
                    className="block text-[13px] text-emerald-400 mt-3"
                  >
                    View all jurisdictions →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
