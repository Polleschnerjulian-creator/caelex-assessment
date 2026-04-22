/**
 * Persona definitions for the /for/[slug] landing pages.
 *
 * Each persona is a self-contained declarative block that answers the
 * LLM query "does Caelex help [persona]?" in direct, citable terms.
 * Kept in a shared data file (not inlined in page.tsx) so additional
 * personas can be added without touching the rendering logic, and so
 * the same data can feed structured data (JSON-LD) + sitemap
 * generation from a single source of truth.
 */

export interface Persona {
  /** URL slug — the [slug] segment in /for/[slug]/ */
  slug: string;
  /** H1 and <title> subject. Use the plain-English phrase an LLM user
   *  would type, not an internal label. */
  label: string;
  /** Short LLM-digestible hero line. Should stand alone as a direct
   *  answer to "is Caelex for [persona]". */
  tagline: string;
  /** 2-3 sentence summary for <meta description> and FAQ lead-in. */
  summary: string;
  /** SEO keyword list — feeds generateMetadata + knowsAbout on schema. */
  keywords: string[];
  /** The compliance regimes this persona most often interacts with.
   *  Labels map onto Caelex module names. */
  coreRegimes: { name: string; href: string; blurb: string }[];
  /** Concrete product recommendations for this persona — Comply first,
   *  then any of Sentinel/Ephemeris/Verity/Atlas that fit. */
  products: { name: string; href: string; blurb: string }[];
  /** Typical workflow steps — the LLM-digestible "how it works". */
  workflow: { step: string; body: string }[];
  /** FAQs expressing the persona-specific versions of common queries. */
  faqs: { q: string; a: string }[];
}

export const PERSONAS: Persona[] = [
  {
    slug: "satellite-operators",
    label: "Satellite operators",
    tagline:
      "The compliance platform for GEO, LEO, EO, communications, navigation, and science-mission satellite operators across Europe.",
    summary:
      "Caelex is the regulatory workspace for satellite operators navigating the EU Space Act, NIS2, and national licensing regimes. One system of record across operator classification, authorization, registration, frequency coordination, insurance, and debris obligations — per satellite, per jurisdiction, per mission phase.",
    keywords: [
      "satellite operator compliance",
      "satellite regulatory software",
      "EU Space Act satellite operator",
      "satellite licensing Europe",
      "NIS2 satellite compliance",
      "satellite insurance compliance",
      "COPUOS debris compliance",
    ],
    coreRegimes: [
      {
        name: "EU Space Act",
        href: "/resources/eu-space-act",
        blurb:
          "119 articles, operator classification across seven types, standard vs light regime, and sector-specific authorization thresholds.",
      },
      {
        name: "NIS2 Directive",
        href: "/modules#nis2",
        blurb:
          "Essential vs Important classification, 51 security requirements, 24h/72h/1-month incident reporting to the national CSIRT.",
      },
      {
        name: "National authorization",
        href: "/jurisdictions",
        blurb:
          "Licensing under SatDSiG (DE), LOS (FR), Space Activities Act 2020 (LU), Space Industry Act 2018 (UK), or the equivalent in 10+ other jurisdictions.",
      },
      {
        name: "Spectrum / ITU",
        href: "/modules#spectrum",
        blurb:
          "Frequency coordination via the national regulator (BNetzA, ANFR, ILR, Ofcom) and ITU filings (API, CR/C, Notification, Recording).",
      },
      {
        name: "Debris mitigation",
        href: "/modules#debris",
        blurb:
          "COPUOS + IADC guidelines, ISO 24113, the 25-year rule, post-mission disposal plans, collision risk management.",
      },
      {
        name: "Insurance",
        href: "/modules#insurance",
        blurb:
          "Third-party liability insurance obligations, jurisdiction-specific caps and recourse limits, bank-guarantee alternatives.",
      },
    ],
    products: [
      {
        name: "Comply",
        href: "/platform",
        blurb:
          "Authorization workflow, evidence management, ITU coordination, continuous NIS2 posture, automated reporting to authorities.",
      },
      {
        name: "Ephemeris",
        href: "/systems/ephemeris",
        blurb:
          "Per-satellite digital twin modelling orbital decay, fuel depletion, and subsystem degradation against regulatory deadlines.",
      },
      {
        name: "Sentinel",
        href: "/sentinel",
        blurb:
          "On-premises evidence agents that hash-chain operational data for tamper-evident audit trails.",
      },
    ],
    workflow: [
      {
        step: "1. Profile your operation",
        body: "Enter operator type (LEO / GEO / EO / comms / navigation), jurisdiction(s), mission phase, constellation tier. Caelex derives the applicable article set deterministically.",
      },
      {
        step: "2. Close the gaps",
        body: "The platform flags every missing document, evidence item, and authorization step. Astra (AI copilot) drafts authorization dossiers against the latest article text.",
      },
      {
        step: "3. File and track",
        body: "Submit to the national competent authority via the NCA portal. Track correspondence, deadline cascades, and mission-phase reporting requirements in one timeline.",
      },
      {
        step: "4. Stay compliant",
        body: "Caelex monitors regulatory changes (Atlas sources), flags impacts, and updates your compliance posture. Ephemeris forecasts compliance futures 90 days out.",
      },
    ],
    faqs: [
      {
        q: "Does Caelex help with EU Space Act authorization?",
        a: "Yes. Caelex maps all 119 EU Space Act articles to your operator classification, determines whether you fall under the standard or light regime, generates the authorization dossier, and tracks the submission to the competent national authority.",
      },
      {
        q: "Can Caelex handle my NIS2 reporting?",
        a: "Yes. Caelex classifies your entity as Essential or Important, maps your controls against the 51 NIS2 requirements, and supports the 24h / 72h / 1-month incident-reporting workflow through the national CSIRT channel.",
      },
      {
        q: "Does Caelex support ITU filings?",
        a: "Caelex tracks the full ITU filing lifecycle (API, CR/C, Notification, Recording) and coordinates with the national regulator (BNetzA, ANFR, ILR, Ofcom, etc.) that acts as your notifying administration.",
      },
      {
        q: "How does Caelex handle multi-jurisdiction operations?",
        a: "Each satellite and each mission phase is evaluated per applicable jurisdiction. Cross-references between regimes (e.g. EU Space Act article ↔ German SatDSiG clause ↔ COPUOS guideline) are surfaced automatically so you see one consolidated view.",
      },
    ],
  },

  {
    slug: "launch-providers",
    label: "Launch providers",
    tagline:
      "Launch authorization, range safety, insurance, and debris obligations — in a single workspace that speaks to the regulator in your jurisdiction.",
    summary:
      "Caelex supports launch providers operating from European spaceports (CSG Kourou, Andøya, Esrange, SaxaVord, Azores) as well as launches originating from the US. The platform handles launch authorization, range safety documentation, flight termination approvals, environmental impact, insurance, and post-launch debris reporting.",
    keywords: [
      "launch provider compliance",
      "launch authorization Europe",
      "launch insurance compliance",
      "CSG launch regulation",
      "UK launch licensing",
      "FAA launch license",
      "spaceport compliance",
    ],
    coreRegimes: [
      {
        name: "National launch authorization",
        href: "/jurisdictions",
        blurb:
          "Licensing under LOS 2008 (FR, for CSG launches), Space Industry Act 2018 (UK, for SaxaVord + Sutherland), Norwegian space law (Andøya), Swedish law (Esrange), 14 CFR 400-450 (US, for FAA-licensed launches).",
      },
      {
        name: "Environmental & SEVESO",
        href: "/modules#environmental",
        blurb:
          "Launch sites are typically SEVESO upper-tier ICPE / equivalent. Environmental impact assessments (EIA), PPRT plans, emergency response procedures.",
      },
      {
        name: "Range safety & flight termination",
        href: "/modules#authorization",
        blurb:
          "Range safety documentation, flight termination system (FTS) qualification, nominal and failure-mode trajectory analyses accepted by the licensing authority.",
      },
      {
        name: "Insurance",
        href: "/modules#insurance",
        blurb:
          "Third-party liability insurance for launch operations — typically higher thresholds than satellite operations and with jurisdiction-specific caps.",
      },
      {
        name: "Debris, fairing recovery, upper-stage disposal",
        href: "/modules#debris",
        blurb:
          "Post-launch debris reporting, upper-stage disposal plan (passivation, deorbit), and the 25-year rule for any orbital body left behind.",
      },
    ],
    products: [
      {
        name: "Comply",
        href: "/platform",
        blurb:
          "Authorization dossier, range-safety evidence, insurance certificates, post-mission disposal plans — one workspace for the full launch lifecycle.",
      },
      {
        name: "Sentinel",
        href: "/sentinel",
        blurb:
          "On-premises evidence agents at the launch site — telemetry hash-chained, range-safety events cryptographically signed.",
      },
    ],
    workflow: [
      {
        step: "1. Define the launch campaign",
        body: "Vehicle, payload manifest, launch site, trajectory, and participating states. Caelex derives the applicable regulatory stack per participating state.",
      },
      {
        step: "2. Assemble the dossier",
        body: "Range safety, environmental, insurance, debris, and flight termination documentation — generated against the authority's dossier template and tracked to completion.",
      },
      {
        step: "3. Submit + coordinate",
        body: "NCA submission pipeline to the licensing authority. Correspondence, clarifying requests, and conditions tracked in a single audit trail.",
      },
      {
        step: "4. Post-launch reporting",
        body: "Orbital data capture, debris reporting, upper-stage passivation evidence, and any anomalies reported per the licensing conditions.",
      },
    ],
    faqs: [
      {
        q: "Does Caelex support CSG launches under French LOS?",
        a: "Yes. Caelex maps the LOS 2008 authorization procedure, its implementing décrets (2009-643, 2024-625), the Règlement d'Exploitation Intérieur at CSG, the SEVESO + ICPE regime, and the CNES technical regulation requirements.",
      },
      {
        q: "Can Caelex handle UK Space Industry Act 2018 licensing?",
        a: "Yes. The UK Space Industry Act 2018 and its implementing regulations (SI 2021/792 and following) are covered with the CAA submission workflow, range-safety evidence requirements, and environmental assessment.",
      },
      {
        q: "Does Caelex integrate with FAA for US launches?",
        a: "Caelex tracks FAA AST licensing under 14 CFR 400-450. Submissions are prepared in FAA format; the platform does not directly integrate with the FAA's RDV system.",
      },
      {
        q: "What about sub-orbital launches?",
        a: "Sub-orbital operations are covered where the national regime treats them as space activities (e.g. UK Space Industry Act 2018 explicitly includes sub-orbital). Where the regime treats sub-orbital as aviation, Caelex flags the applicable aviation-regulator pathway instead.",
      },
    ],
  },

  {
    slug: "law-firms",
    label: "Space-sector law firms",
    tagline:
      "Atlas is the searchable space-law database built for law firms — with deep-linked primary sources across 10+ jurisdictions, firm-wide shared annotations, and AI-assisted research.",
    summary:
      "Atlas is the Caelex product for law firms advising space-sector clients. Instant access to UN treaties, EU instruments, and national legislation across 10+ European jurisdictions; every article deep-linked to the authoritative national primary-source portal. Shared annotations, change alerts, and AI-assisted research inside the firm workspace.",
    keywords: [
      "space law database",
      "space law research",
      "space law firm software",
      "EU Space Act legal research",
      "legal research tool space industry",
      "space law annotations",
      "law firm space compliance",
    ],
    coreRegimes: [
      {
        name: "UN space treaties",
        href: "/resources/eu-space-act",
        blurb:
          "Outer Space Treaty 1967, Rescue Agreement 1968, Liability Convention 1972, Registration Convention 1975, Moon Agreement 1979 — with per-country ratification records.",
      },
      {
        name: "EU instruments",
        href: "/resources/eu-space-act",
        blurb:
          "EU Space Act, NIS2 Directive, CER Directive, EU Dual-Use Regulation, Galileo / Copernicus / IRIS² governance, GDPR applied to space data.",
      },
      {
        name: "National legislation (10+ jurisdictions)",
        href: "/jurisdictions",
        blurb:
          "Germany (SatDSiG, KRITIS-Dachgesetz 2026, BSIG, TKG, AWG+AWV+Ausfuhrliste), France (LOS 2008 + décrets, Code de la défense, PPST, IEF), Luxembourg (Space Resources Act 2017, Space Activities Act 2020), United Kingdom (Space Industry Act 2018), and more.",
      },
    ],
    products: [
      {
        name: "Atlas",
        href: "/atlas-access",
        blurb:
          "The primary product for law firms. Sales-assisted onboarding — book a free 30-minute intro call to request firm-wide access.",
      },
    ],
    workflow: [
      {
        step: "1. Book the intro call",
        body: "Atlas access is granted firm-by-firm. A 30-minute call covers your practice area focus (space, defence, export, cross-border) and which jurisdictions you need live from day one.",
      },
      {
        step: "2. Firm-wide workspace provisioning",
        body: "Your firm gets a dedicated workspace. Every lawyer at the firm uses the same database; annotations on articles are shared firm-wide so institutional knowledge compounds over time.",
      },
      {
        step: "3. Research with deep-linked sources",
        body: "Every article on every law is deep-linked to the authoritative national primary-source portal (gesetze-im-internet.de for DE, légifrance.gouv.fr for FR, legilux.public.lu for LU). No citation is ever a dead-end.",
      },
      {
        step: "4. Stay current automatically",
        body: "When any tracked source is amended, Atlas flags the change, highlights what moved, and notifies the annotation authors. Redline views show the exact diff between versions.",
      },
    ],
    faqs: [
      {
        q: "Is Atlas the same as Caelex?",
        a: "Atlas is a Caelex product, but it is a distinct product from Caelex Comply. Comply is a compliance workspace for space operators; Atlas is a legal-research database for law firms. Same company, same security and AI infrastructure, different user base.",
      },
      {
        q: "How do I get access?",
        a: "Book a 30-minute intro call at caelex.eu/atlas-access. Access is sales-assisted to keep the user base curated around actual space-sector law firms and in-house legal teams — we don't do public self-serve signup for Atlas.",
      },
      {
        q: "What does Atlas cover?",
        a: "UN space treaties, EU instruments (EU Space Act, NIS2, CER, Dual-Use Regulation, GDPR applied to space), and national legislation across 10+ European jurisdictions plus the United States and New Zealand. Every article is deep-linked to the authoritative primary-source portal for the jurisdiction.",
      },
      {
        q: "Can we add our own internal memos to Atlas?",
        a: "Yes. The annotation system is designed exactly for this — partners and senior associates add firm-internal interpretations or related memos to specific articles, and the annotations become visible to everyone else in the firm workspace.",
      },
      {
        q: "Is there a free tier?",
        a: "No free self-serve tier for Atlas — access is sales-assisted. The intro call is free and without commitment.",
      },
    ],
  },
];

export function getPersonaBySlug(slug: string): Persona | undefined {
  return PERSONAS.find((p) => p.slug === slug);
}
