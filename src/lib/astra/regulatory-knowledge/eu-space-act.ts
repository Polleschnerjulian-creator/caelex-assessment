/**
 * ASTRA Regulatory Knowledge: EU Space Act
 *
 * Structured knowledge base for EU Space Act (COM(2025) 335) articles.
 * Provides summaries, key requirements, and cross-references for AI consumption.
 */

import type { EUSpaceActArticle } from "../types";

// ─── Chapter Structure ───

export const EU_SPACE_ACT_CHAPTERS = {
  "Title I": {
    name: "General Provisions",
    articles: ["1", "2", "3", "4", "5"],
    description:
      "Establishes scope, definitions, and fundamental principles of the EU Space Act.",
  },
  "Title II": {
    name: "Authorization Regime",
    articles: [
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
    ],
    description:
      "Comprehensive authorization framework for space operations in the EU.",
  },
  "Title III": {
    name: "Registration",
    articles: ["21", "22", "23", "24", "25", "26", "27", "28", "29", "30"],
    description:
      "EU Registry of Space Objects (URSO) requirements and processes.",
  },
  "Title IV": {
    name: "Safety and Sustainability",
    articles: [
      "31",
      "32",
      "33",
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
      "40",
      "41",
      "42",
      "43",
      "44",
      "45",
    ],
    description:
      "Space debris mitigation, collision avoidance, and environmental protection.",
  },
  "Title V": {
    name: "Space Traffic Management",
    articles: ["46", "47", "48", "49", "50", "51", "52", "53", "54", "55"],
    description:
      "Space Situational Awareness (SSA) and traffic coordination requirements.",
  },
  "Title VI": {
    name: "Liability and Insurance",
    articles: ["56", "57", "58", "59", "60", "61", "62", "63", "64", "65"],
    description:
      "Third-party liability, insurance requirements, and state indemnification.",
  },
  "Title VII": {
    name: "Cybersecurity",
    articles: [
      "66",
      "67",
      "68",
      "69",
      "70",
      "71",
      "72",
      "73",
      "74",
      "75",
      "76",
      "77",
      "78",
      "79",
      "80",
      "81",
      "82",
      "83",
      "84",
      "85",
    ],
    description:
      "Cybersecurity requirements for space systems, aligned with NIS2.",
  },
  "Title VIII": {
    name: "Data and Services",
    articles: ["86", "87", "88", "89", "90", "91", "92", "93", "94", "95"],
    description:
      "Space data governance, primary data provider obligations, and service quality.",
  },
  "Title IX": {
    name: "Supervision and Enforcement",
    articles: [
      "96",
      "97",
      "98",
      "99",
      "100",
      "101",
      "102",
      "103",
      "104",
      "105",
      "106",
      "107",
      "108",
      "109",
      "110",
    ],
    description:
      "NCA powers, inspections, sanctions, and administrative penalties.",
  },
  "Title X": {
    name: "Final Provisions",
    articles: ["111", "112", "113", "114", "115", "116", "117", "118", "119"],
    description:
      "Entry into force, transitional provisions, and implementing acts.",
  },
} as const;

// ─── Operator Type Definitions ───

export const OPERATOR_TYPES = {
  SCO: {
    code: "SCO",
    name: "Spacecraft Operator",
    definition:
      "Entity responsible for the operation and control of a spacecraft in orbit.",
    keyObligations: [
      "Authorization under Art. 6-10",
      "Registration in URSO (Art. 21-30)",
      "Debris mitigation plan (Art. 31-45)",
      "Insurance coverage (Art. 56-65)",
      "Cybersecurity measures (Art. 66-85)",
    ],
    applicableChapters: [
      "Title II",
      "Title III",
      "Title IV",
      "Title VI",
      "Title VII",
    ],
  },
  LO: {
    code: "LO",
    name: "Launch Operator",
    definition:
      "Entity conducting launch operations from an EU launch site or with EU nexus.",
    keyObligations: [
      "Launch authorization (Art. 11-14)",
      "Safety assessment (Art. 35-38)",
      "Third-party liability insurance (Art. 58)",
      "Launch site coordination (Art. 46-50)",
    ],
    applicableChapters: ["Title II", "Title IV", "Title V", "Title VI"],
  },
  LSO: {
    code: "LSO",
    name: "Launch Site Operator",
    definition:
      "Entity operating a spaceport or launch facility within EU territory.",
    keyObligations: [
      "Site authorization (Art. 15-17)",
      "Safety perimeter management (Art. 39-42)",
      "Emergency response procedures (Art. 43-44)",
      "Environmental protection (Art. 45)",
    ],
    applicableChapters: ["Title II", "Title IV", "Title VI"],
  },
  ISOS: {
    code: "ISOS",
    name: "In-Space Operations & Services",
    definition:
      "Entity providing in-orbit services such as servicing, refueling, ADR, or assembly.",
    keyObligations: [
      "Special authorization for proximity operations (Art. 18)",
      "Enhanced debris mitigation (Art. 32-34)",
      "Coordination with target operators (Art. 51-54)",
      "Extended liability coverage (Art. 59-61)",
    ],
    applicableChapters: ["Title II", "Title IV", "Title V", "Title VI"],
  },
  CAP: {
    code: "CAP",
    name: "Collision Avoidance Provider",
    definition:
      "Entity providing SSA data or collision avoidance services to operators.",
    keyObligations: [
      "Service quality standards (Art. 52-55)",
      "Data accuracy requirements (Art. 86-90)",
      "Notification obligations (Art. 83-85)",
    ],
    applicableChapters: ["Title V", "Title VIII"],
  },
  PDP: {
    code: "PDP",
    name: "Primary Data Provider",
    definition:
      "Entity generating and distributing primary space-derived data or services.",
    keyObligations: [
      "Data quality standards (Art. 86-90)",
      "Cybersecurity for data systems (Art. 74-78)",
      "Continuity of service (Art. 91-95)",
    ],
    applicableChapters: ["Title VII", "Title VIII"],
  },
  TCO: {
    code: "TCO",
    name: "Third Country Operator",
    definition: "Non-EU operator providing services in the EU single market.",
    keyObligations: [
      "EU authorization or equivalence recognition (Art. 19-20)",
      "Local representative requirement (Art. 20)",
      "Insurance valid in EU jurisdiction (Art. 62-65)",
    ],
    applicableChapters: ["Title II", "Title VI"],
  },
} as const;

// ─── Key Articles Summaries ───

export const KEY_ARTICLES: EUSpaceActArticle[] = [
  // Title I - General Provisions
  {
    id: "art-2",
    number: "2",
    title: "Scope",
    chapter: "Title I",
    section: "General Provisions",
    summary:
      "Defines entities covered by the EU Space Act: spacecraft operators, launch operators, launch site operators, in-space service providers, collision avoidance providers, and primary data providers. Excludes defense/national security operations and pre-2030 legacy assets (with conditions).",
    keyRequirements: [
      "Applies to operations with EU nexus (establishment, launch site, or EU market access)",
      "Defense and national security activities explicitly excluded",
      "Pre-2030 assets exempt unless modified significantly",
      "Beyond-GEO operations have simplified requirements",
    ],
    applicableOperatorTypes: ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"],
    relatedArticles: ["1", "3", "4", "5", "19", "20"],
    complianceCriteria: [
      "Determine if activities fall within geographic scope",
      "Assess EU nexus for authorization requirements",
      "Document any exemption claims with evidence",
    ],
  },
  {
    id: "art-5",
    number: "5",
    title: "Definitions",
    chapter: "Title I",
    section: "General Provisions",
    summary:
      "Provides legal definitions for 47 key terms including spacecraft, operator, constellation, space debris, space object, orbital slot, deorbit, passivation, and more.",
    keyRequirements: [
      "'Spacecraft' includes satellites, space stations, and transfer vehicles",
      "'Operator' is the entity exercising control and decision-making authority",
      "'Space debris' is any non-functional man-made object in space",
      "'Constellation' is 3+ spacecraft operating as coordinated system",
    ],
    applicableOperatorTypes: ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"],
    relatedArticles: ["2", "31", "46", "86"],
    complianceCriteria: [
      "Use consistent terminology in all regulatory filings",
      "Ensure contracts reference EU Space Act definitions",
    ],
  },

  // Title II - Authorization
  {
    id: "art-6",
    number: "6",
    title: "Authorization Requirement",
    chapter: "Title II",
    section: "Authorization Regime",
    summary:
      "No space operation may be conducted without prior authorization from the competent National Competent Authority (NCA). Authorization is required before launch, operation commencement, or market access.",
    keyRequirements: [
      "Authorization must be obtained BEFORE commencing operations",
      "Single authorization valid across all EU Member States (mutual recognition)",
      "Authorization tied to specific space object and mission profile",
      "Modifications require authorization amendment",
    ],
    applicableOperatorTypes: ["SCO", "LO", "LSO", "ISOS"],
    relatedArticles: ["7", "8", "9", "10", "11"],
    complianceCriteria: [
      "Submit application minimum 12 months before planned launch",
      "Include all technical documentation per Art. 8",
      "Demonstrate financial and technical capability",
    ],
    deadlines: [
      "Application 12 months before launch",
      "NCA decision within 6 months",
    ],
  },
  {
    id: "art-8",
    number: "8",
    title: "Authorization Application Contents",
    chapter: "Title II",
    section: "Authorization Regime",
    summary:
      "Specifies mandatory contents for authorization applications including operator identification, mission description, technical specifications, safety assessments, insurance proof, and cybersecurity documentation.",
    keyRequirements: [
      "Legal entity identification and ownership structure",
      "Detailed mission description and orbital parameters",
      "Debris mitigation plan per Art. 31-34",
      "Insurance certificate meeting Art. 58 minimums",
      "Cybersecurity assessment per Art. 74-78",
      "End-of-life disposal plan",
    ],
    applicableOperatorTypes: ["SCO", "LO", "LSO", "ISOS"],
    relatedArticles: ["6", "7", "9", "31", "58", "74"],
    complianceCriteria: [
      "Complete all mandatory fields in NCA application form",
      "Provide certified translations if required by NCA",
      "Include third-party verification where specified",
    ],
  },
  {
    id: "art-10",
    number: "10",
    title: "Light Regime Authorization",
    chapter: "Title II",
    section: "Authorization Regime",
    summary:
      "Simplified authorization process for small operators, research missions, and educational satellites meeting specific criteria (mass <100kg, limited mission duration, standard orbits).",
    keyRequirements: [
      "Spacecraft mass under 100kg",
      "Mission duration under 5 years",
      "LEO orbit below 600km (natural decay <25 years)",
      "No hazardous materials or propulsion requiring special handling",
      "Simplified application form and reduced documentation",
    ],
    applicableOperatorTypes: ["SCO"],
    relatedArticles: ["6", "7", "8", "9"],
    complianceCriteria: [
      "Verify eligibility against all light regime criteria",
      "Use simplified application process",
      "Maintain compliance despite reduced documentation",
    ],
    lightRegimeApplicable: true,
  },

  // Title III - Registration
  {
    id: "art-21",
    number: "21",
    title: "EU Registry of Space Objects (URSO)",
    chapter: "Title III",
    section: "Registration",
    summary:
      "Establishes the EU Registry of Space Objects as the central database for all EU-authorized space objects. Registration is mandatory and must occur within 30 days of launch.",
    keyRequirements: [
      "Registration within 30 days of successful orbit insertion",
      "Include international designator and NORAD catalog number",
      "Update registry for any status changes (maneuvers, anomalies, EOL)",
      "De-registration upon confirmed deorbit or disposal",
    ],
    applicableOperatorTypes: ["SCO", "LO", "ISOS"],
    relatedArticles: ["22", "23", "24", "25", "26"],
    complianceCriteria: [
      "Submit registration form within 30-day window",
      "Maintain accurate orbital elements in registry",
      "Report status changes within 72 hours",
    ],
    deadlines: [
      "30 days post-launch for initial registration",
      "72 hours for status updates",
    ],
  },

  // Title IV - Safety and Sustainability
  {
    id: "art-31",
    number: "31",
    title: "Debris Mitigation Requirements",
    chapter: "Title IV",
    section: "Safety and Sustainability",
    summary:
      "Mandatory debris mitigation measures based on IADC guidelines and ISO 24113. Applies to all spacecraft operators with specific requirements varying by orbit regime.",
    keyRequirements: [
      "Limit debris release during normal operations",
      "Design for passivation at end of life",
      "25-year post-mission disposal rule for LEO",
      "Graveyard orbit disposal for GEO spacecraft",
      "Collision avoidance capability required",
    ],
    applicableOperatorTypes: ["SCO", "LO", "ISOS"],
    relatedArticles: ["32", "33", "34", "35", "36", "37"],
    complianceCriteria: [
      "Submit debris mitigation plan with authorization application",
      "Demonstrate 90% probability of successful disposal",
      "Implement trackability measures",
    ],
  },
  {
    id: "art-35",
    number: "35",
    title: "Collision Avoidance",
    chapter: "Title IV",
    section: "Safety and Sustainability",
    summary:
      "Operators must have collision avoidance procedures and respond to conjunction warnings. Maneuver capability or alternative mitigation required for LEO spacecraft above 400km.",
    keyRequirements: [
      "Subscribe to SSA data services (EU SST or equivalent)",
      "Respond to conjunction alerts within 48 hours",
      "Execute avoidance maneuvers when probability exceeds threshold",
      "Report all collision avoidance actions to NCA",
    ],
    applicableOperatorTypes: ["SCO", "ISOS"],
    relatedArticles: ["31", "46", "47", "48", "83"],
    complianceCriteria: [
      "Documented collision avoidance procedures",
      "24/7 operations capability for conjunction response",
      "Annual reporting of all CA actions",
    ],
  },

  // Title VI - Insurance
  {
    id: "art-58",
    number: "58",
    title: "Mandatory Third-Party Liability Insurance",
    chapter: "Title VI",
    section: "Liability and Insurance",
    summary:
      "All authorized operators must maintain third-party liability insurance with minimum coverage levels based on mission risk profile. Insurance must be valid throughout the operational lifetime.",
    keyRequirements: [
      "Minimum coverage: EUR 60M for standard missions",
      "Higher coverage for high-risk missions (nuclear, large constellations)",
      "Insurance must cover damage on Earth, in airspace, and in space",
      "Policy must name EU Member State as additional insured",
      "Annual proof of coverage to NCA",
    ],
    applicableOperatorTypes: ["SCO", "LO", "LSO", "ISOS"],
    relatedArticles: ["56", "57", "59", "60", "61"],
    complianceCriteria: [
      "Obtain insurance from EU-approved provider",
      "Coverage amount meets or exceeds minimums for mission profile",
      "Submit certificate with authorization application",
      "Maintain continuous coverage - no gaps",
    ],
  },

  // Title VII - Cybersecurity
  {
    id: "art-74",
    number: "74",
    title: "Cybersecurity Baseline Requirements",
    chapter: "Title VII",
    section: "Cybersecurity",
    summary:
      "Establishes mandatory cybersecurity measures for all space operators, aligned with NIS2 Directive requirements. Covers ground segment, space segment, and communication links.",
    keyRequirements: [
      "Implement security-by-design principles",
      "Protect command and control links (encryption, authentication)",
      "Secure ground station infrastructure",
      "Establish incident response procedures",
      "Regular security assessments and penetration testing",
    ],
    applicableOperatorTypes: ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP"],
    relatedArticles: [
      "75",
      "76",
      "77",
      "78",
      "79",
      "80",
      "81",
      "82",
      "83",
      "84",
      "85",
    ],
    complianceCriteria: [
      "Complete cybersecurity self-assessment",
      "Document security architecture for all segments",
      "Implement NIS2-aligned controls",
      "Submit cybersecurity annex with authorization",
    ],
  },
  {
    id: "art-83",
    number: "83",
    title: "Cybersecurity Incident Reporting",
    chapter: "Title VII",
    section: "Cybersecurity",
    summary:
      "Mandatory reporting of cybersecurity incidents affecting space operations. Aligns with NIS2 incident notification timeline (24h/72h/1 month).",
    keyRequirements: [
      "Early warning within 24 hours of significant incident detection",
      "Initial notification within 72 hours with preliminary assessment",
      "Final report within 1 month of incident resolution",
      "Report to both NCA and relevant CSIRT",
    ],
    applicableOperatorTypes: ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP"],
    relatedArticles: ["74", "75", "84", "85"],
    complianceCriteria: [
      "Establish 24/7 incident detection capability",
      "Documented escalation procedures",
      "Pre-registered with national CSIRT",
    ],
    deadlines: [
      "24h early warning",
      "72h initial notification",
      "1 month final report",
    ],
  },

  // Title IX - Supervision
  {
    id: "art-96",
    number: "96",
    title: "National Competent Authority (NCA) Designation",
    chapter: "Title IX",
    section: "Supervision and Enforcement",
    summary:
      "Each Member State must designate an NCA responsible for authorization, supervision, and enforcement of the EU Space Act within their jurisdiction.",
    keyRequirements: [
      "NCA must be independent and adequately resourced",
      "Powers to grant, modify, suspend, and revoke authorizations",
      "Inspection authority for facilities and operations",
      "Information sharing with other NCAs and Commission",
    ],
    applicableOperatorTypes: ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"],
    relatedArticles: ["97", "98", "99", "100", "101"],
    complianceCriteria: [
      "Identify correct NCA for your jurisdiction",
      "Establish communication channel with NCA",
      "Respond to NCA requests within specified timeframes",
    ],
  },
  {
    id: "art-106",
    number: "106",
    title: "Administrative Penalties",
    chapter: "Title IX",
    section: "Supervision and Enforcement",
    summary:
      "NCAs may impose administrative penalties for violations of the EU Space Act. Maximum fines up to EUR 10M or 2% of global annual turnover.",
    keyRequirements: [
      "Fines proportionate to violation severity and operator size",
      "Maximum EUR 10M or 2% turnover for serious violations",
      "Aggravating factors: repeat offenses, concealment, harm caused",
      "Mitigating factors: cooperation, remediation, first offense",
    ],
    applicableOperatorTypes: ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"],
    relatedArticles: ["105", "107", "108", "109", "110"],
    complianceCriteria: [
      "Maintain compliance to avoid penalties",
      "Self-report violations to benefit from mitigation",
      "Implement corrective actions promptly",
    ],
    penalties: "Up to EUR 10M or 2% of global annual turnover",
  },
];

// ─── Article Lookup Functions ───

export function getArticleById(id: string): EUSpaceActArticle | undefined {
  return KEY_ARTICLES.find((a) => a.id === id);
}

export function getArticleByNumber(
  number: string,
): EUSpaceActArticle | undefined {
  return KEY_ARTICLES.find((a) => a.number === number);
}

export function getArticlesForOperatorType(
  operatorType: string,
): EUSpaceActArticle[] {
  return KEY_ARTICLES.filter(
    (a) =>
      a.applicableOperatorTypes.includes(operatorType) ||
      a.applicableOperatorTypes.includes("ALL"),
  );
}

export function getArticlesForChapter(chapter: string): EUSpaceActArticle[] {
  return KEY_ARTICLES.filter((a) => a.chapter === chapter);
}

export function searchArticles(query: string): EUSpaceActArticle[] {
  const lowerQuery = query.toLowerCase();
  return KEY_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(lowerQuery) ||
      a.summary.toLowerCase().includes(lowerQuery) ||
      a.keyRequirements.some((r) => r.toLowerCase().includes(lowerQuery)),
  );
}

// ─── Summary for ASTRA Context ───

export const EU_SPACE_ACT_SUMMARY = `
The EU Space Act (COM(2025) 335) establishes a comprehensive regulatory framework for space activities in the European Union. Key aspects:

**Scope**: Applies to spacecraft operators (SCO), launch operators (LO), launch site operators (LSO), in-space service providers (ISOS), collision avoidance providers (CAP), and primary data providers (PDP) with EU nexus.

**Authorization**: Single authorization valid across all EU Member States. Must be obtained before commencing operations. Applications require technical documentation, debris mitigation plans, insurance proof, and cybersecurity assessments.

**Light Regime**: Simplified authorization for small spacecraft (<100kg), short missions (<5 years), and low orbits (<600km).

**Registration**: All space objects must be registered in the EU Registry of Space Objects (URSO) within 30 days of launch.

**Debris Mitigation**: Mandatory compliance with IADC guidelines and ISO 24113. 25-year disposal rule for LEO, graveyard orbit for GEO.

**Insurance**: Minimum EUR 60M third-party liability coverage required. Higher for high-risk missions.

**Cybersecurity**: NIS2-aligned requirements covering ground segment, space segment, and communication links. 24h/72h/1 month incident reporting timeline.

**Supervision**: National Competent Authorities (NCAs) designated in each Member State. Penalties up to EUR 10M or 2% of global turnover for violations.

**Entry into Force**: Regulation enters into force 2026, with full compliance required by 2030.
`.trim();
