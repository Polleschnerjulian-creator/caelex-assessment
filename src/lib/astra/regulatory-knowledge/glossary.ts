/**
 * ASTRA Regulatory Knowledge: Space Regulatory Glossary
 *
 * Comprehensive terminology for space regulatory compliance.
 */

import type { GlossaryTerm } from "../types";

// ─── Glossary Terms ───

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // Operator Types
  {
    abbreviation: "SCO",
    fullName: "Spacecraft Operator",
    definition:
      "Entity responsible for the operation, control, and decision-making authority over a spacecraft in orbit. The SCO has command authority over the space object and is responsible for its safe operation throughout its lifecycle.",
    regulatoryContext: ["EU Space Act Art. 5(12)", "National Space Laws"],
    relatedTerms: ["LO", "ISOS", "Space Object"],
    examples: [
      "Satellite operator",
      "Constellation operator",
      "Space station operator",
    ],
  },
  {
    abbreviation: "LO",
    fullName: "Launch Operator",
    definition:
      "Entity conducting launch operations, responsible for the launch vehicle and payload integration until successful orbit insertion or mission completion. Includes both launch service providers and operators of launch vehicles.",
    regulatoryContext: ["EU Space Act Art. 5(13)", "National Space Laws"],
    relatedTerms: ["LSO", "Launch Vehicle", "Payload"],
    examples: ["Arianespace", "SpaceX", "RocketLab"],
  },
  {
    abbreviation: "LSO",
    fullName: "Launch Site Operator",
    definition:
      "Entity operating a spaceport or launch facility, responsible for ground infrastructure, safety perimeters, and range services. May be distinct from the launch operator.",
    regulatoryContext: ["EU Space Act Art. 5(14)"],
    relatedTerms: ["LO", "Spaceport", "Range Safety"],
    examples: ["CSG (Kourou)", "SaxaVord", "Andøya Space"],
  },
  {
    abbreviation: "ISOS",
    fullName: "In-Space Operations & Services Provider",
    definition:
      "Entity providing services to other spacecraft in orbit, including on-orbit servicing, refueling, debris removal, inspection, or assembly operations.",
    regulatoryContext: ["EU Space Act Art. 5(15)", "Art. 18"],
    relatedTerms: ["ADR", "OOS", "RPO"],
    examples: [
      "Active debris removal operators",
      "On-orbit servicing providers",
      "Space tugs",
    ],
  },
  {
    abbreviation: "CAP",
    fullName: "Collision Avoidance Provider",
    definition:
      "Entity providing space situational awareness data, conjunction assessments, or collision avoidance services to spacecraft operators.",
    regulatoryContext: ["EU Space Act Art. 5(16)", "Art. 52-55"],
    relatedTerms: ["SSA", "STM", "Conjunction"],
    examples: ["LeoLabs", "ExoAnalytic", "18th Space Defense Squadron"],
  },
  {
    abbreviation: "PDP",
    fullName: "Primary Data Provider",
    definition:
      "Entity generating and distributing primary space-derived data or space-based services, responsible for data quality, integrity, and service continuity.",
    regulatoryContext: ["EU Space Act Art. 5(17)", "Art. 86-95"],
    relatedTerms: ["EO", "SATCOM", "GNSS"],
    examples: ["Copernicus Sentinels", "Planet Labs", "Maxar"],
  },
  {
    abbreviation: "TCO",
    fullName: "Third Country Operator",
    definition:
      "Space operator established outside the EU that provides services within the EU single market, subject to authorization or equivalence recognition requirements.",
    regulatoryContext: ["EU Space Act Art. 5(18)", "Art. 19-20"],
    relatedTerms: ["EU Nexus", "Equivalence", "Local Representative"],
    examples: ["Non-EU satellite operators serving EU customers"],
  },

  // Regulatory Bodies
  {
    abbreviation: "NCA",
    fullName: "National Competent Authority",
    definition:
      "Government body designated by each EU Member State to implement and enforce the EU Space Act, responsible for authorization, supervision, and enforcement within their jurisdiction.",
    regulatoryContext: ["EU Space Act Art. 96-101"],
    relatedTerms: ["CNES", "CAA Space", "DLR"],
    examples: ["CNES (France)", "CAA Space (UK)", "LSA (Luxembourg)"],
  },
  {
    abbreviation: "CSIRT",
    fullName: "Computer Security Incident Response Team",
    definition:
      "National team responsible for receiving and responding to cybersecurity incident reports from essential and important entities under NIS2.",
    regulatoryContext: ["NIS2 Art. 10-12", "EU Space Act Art. 83"],
    relatedTerms: ["CERT", "SOC", "Incident Reporting"],
  },
  {
    abbreviation: "ENISA",
    fullName: "European Union Agency for Cybersecurity",
    definition:
      "EU agency supporting cybersecurity policy and providing technical expertise, including space-specific threat landscape analysis and guidance.",
    regulatoryContext: ["NIS2", "Cybersecurity Act"],
    relatedTerms: ["NIS2", "Cybersecurity Framework"],
  },
  {
    abbreviation: "EUSPA",
    fullName: "European Union Agency for the Space Programme",
    definition:
      "EU agency managing Galileo, EGNOS, and Copernicus programmes, and contributing to space traffic management and SSA.",
    regulatoryContext: ["EU Space Programme Regulation"],
    relatedTerms: ["Galileo", "Copernicus", "EGNOS"],
  },

  // Technical Terms
  {
    abbreviation: "SSA",
    fullName: "Space Situational Awareness",
    definition:
      "Knowledge and characterization of space objects and events, including tracking, identification, and prediction of space debris, conjunction events, and re-entries.",
    regulatoryContext: ["EU Space Act Art. 46-55", "EU SST"],
    relatedTerms: ["STM", "Conjunction", "Tracking"],
    examples: [
      "EU Space Surveillance and Tracking (EU SST)",
      "US Space Surveillance Network",
    ],
  },
  {
    abbreviation: "STM",
    fullName: "Space Traffic Management",
    definition:
      "Technical and regulatory provisions for safe access to and operations in space, including coordination, collision avoidance, and sustainable use of orbital resources.",
    regulatoryContext: ["EU Space Act Title V"],
    relatedTerms: ["SSA", "Collision Avoidance", "Orbital Slots"],
  },
  {
    abbreviation: "TT&C",
    fullName: "Telemetry, Tracking, and Command",
    definition:
      "Systems and ground infrastructure for monitoring spacecraft health (telemetry), determining position (tracking), and sending instructions (command).",
    regulatoryContext: ["EU Space Act Art. 74-75"],
    relatedTerms: ["Ground Segment", "Uplink", "Downlink"],
  },
  {
    abbreviation: "URSO",
    fullName: "EU Registry of Space Objects",
    definition:
      "Central EU database for registration of all space objects authorized under the EU Space Act, aligned with UN registration conventions.",
    regulatoryContext: ["EU Space Act Art. 21-30"],
    relatedTerms: ["Registration", "UN Registry", "NORAD Catalog"],
  },
  {
    abbreviation: "EOL",
    fullName: "End-of-Life",
    definition:
      "Final phase of spacecraft operations including passivation and disposal (deorbit for LEO, graveyard orbit for GEO). Subject to specific regulatory requirements.",
    regulatoryContext: ["EU Space Act Art. 31-37"],
    relatedTerms: ["Deorbit", "Passivation", "Graveyard Orbit"],
  },
  {
    abbreviation: "ADR",
    fullName: "Active Debris Removal",
    definition:
      "Missions specifically designed to remove existing space debris from orbit using technologies such as nets, harpoons, robotic arms, or laser ablation.",
    regulatoryContext: ["EU Space Act Art. 18", "Art. 32-34"],
    relatedTerms: ["ISOS", "Debris Mitigation", "RPO"],
  },
  {
    abbreviation: "RPO",
    fullName: "Rendezvous and Proximity Operations",
    definition:
      "Maneuvers bringing two spacecraft into close proximity for inspection, servicing, or docking. Subject to enhanced authorization requirements.",
    regulatoryContext: ["EU Space Act Art. 18"],
    relatedTerms: ["ISOS", "OOS", "Docking"],
  },

  // Orbit Types
  {
    abbreviation: "LEO",
    fullName: "Low Earth Orbit",
    definition:
      "Orbital region from approximately 160 km to 2,000 km altitude. Most congested region with specific debris mitigation requirements (25-year rule).",
    regulatoryContext: ["EU Space Act Art. 31", "IADC Guidelines"],
    relatedTerms: ["MEO", "GEO", "Altitude"],
    examples: ["ISS (400 km)", "Starlink (~550 km)", "Sentinel-2 (786 km)"],
  },
  {
    abbreviation: "MEO",
    fullName: "Medium Earth Orbit",
    definition:
      "Orbital region from approximately 2,000 km to 35,786 km altitude. Primarily used for navigation constellations.",
    regulatoryContext: ["EU Space Act Art. 31"],
    relatedTerms: ["LEO", "GEO", "GNSS"],
    examples: ["Galileo (~23,222 km)", "GPS (~20,200 km)"],
  },
  {
    abbreviation: "GEO",
    fullName: "Geostationary Earth Orbit",
    definition:
      "Circular orbit at 35,786 km altitude with zero inclination, appearing stationary relative to Earth. Limited orbital slots; graveyard orbit disposal required.",
    regulatoryContext: ["EU Space Act Art. 31", "ITU Radio Regulations"],
    relatedTerms: ["GSO", "Orbital Slot", "Graveyard Orbit"],
    examples: ["Eutelsat satellites", "SES fleet", "Inmarsat"],
  },
  {
    abbreviation: "SSO",
    fullName: "Sun-Synchronous Orbit",
    definition:
      "Near-polar LEO orbit that maintains consistent sun angle, ideal for Earth observation. Typically 600-800 km altitude, 97-98° inclination.",
    regulatoryContext: ["EU Space Act Art. 31"],
    relatedTerms: ["LEO", "Polar Orbit", "EO"],
    examples: ["Sentinel-2", "Landsat", "WorldView"],
  },

  // Regulatory Frameworks
  {
    abbreviation: "NIS2",
    fullName: "Network and Information Security Directive 2",
    definition:
      "EU Directive 2022/2555 establishing cybersecurity requirements for essential and important entities across critical sectors, including space (Annex I, Sector 11).",
    regulatoryContext: ["Directive (EU) 2022/2555"],
    relatedTerms: ["Essential Entity", "Important Entity", "Art. 21"],
  },
  {
    abbreviation: "GDPR",
    fullName: "General Data Protection Regulation",
    definition:
      "EU Regulation 2016/679 on personal data protection, applicable to space operators processing personal data (e.g., EO imagery with identifiable individuals).",
    regulatoryContext: ["Regulation (EU) 2016/679"],
    relatedTerms: ["Data Protection", "Personal Data", "DPO"],
  },
  {
    abbreviation: "ITAR",
    fullName: "International Traffic in Arms Regulations",
    definition:
      "US export control regulations governing defense articles including many space components. Non-US operators must ensure ITAR-free supply chains or obtain licenses.",
    regulatoryContext: ["22 CFR 120-130"],
    relatedTerms: ["EAR", "Export Control", "USML"],
  },
  {
    abbreviation: "EAR",
    fullName: "Export Administration Regulations",
    definition:
      "US export control regulations for dual-use items, including commercial space components on the Commerce Control List.",
    regulatoryContext: ["15 CFR 730-774"],
    relatedTerms: ["ITAR", "CCL", "Export Control"],
  },

  // Standards
  {
    abbreviation: "IADC",
    fullName: "Inter-Agency Space Debris Coordination Committee",
    definition:
      "International forum of space agencies coordinating debris mitigation practices. IADC Guidelines form the basis for national and EU debris requirements.",
    regulatoryContext: ["EU Space Act Art. 31", "UN COPUOS"],
    relatedTerms: ["Debris Mitigation", "ISO 24113", "25-Year Rule"],
  },
  {
    abbreviation: "ECSS",
    fullName: "European Cooperation for Space Standardization",
    definition:
      "Initiative establishing standards for European space activities, including product assurance (ECSS-Q), engineering (ECSS-E), and management (ECSS-M).",
    regulatoryContext: ["EU Space Act Art. 74", "ESA Requirements"],
    relatedTerms: ["Product Assurance", "Space Qualification"],
    examples: [
      "ECSS-Q-ST-80C (Software Product Assurance)",
      "ECSS-E-ST-10C (System Engineering)",
    ],
  },
  {
    abbreviation: "CCSDS",
    fullName: "Consultative Committee for Space Data Systems",
    definition:
      "International organization developing standards for space data systems, including telemetry, telecommand, and security (CCSDS Blue/Magenta Books).",
    regulatoryContext: ["EU Space Act Art. 75"],
    relatedTerms: ["TT&C", "Encryption", "Data Protocols"],
  },

  // Insurance & Liability
  {
    abbreviation: "TPL",
    fullName: "Third-Party Liability",
    definition:
      "Legal liability for damage caused to third parties (persons or property) on Earth, in airspace, or in outer space. Subject to mandatory insurance requirements.",
    regulatoryContext: ["EU Space Act Art. 56-65", "Liability Convention"],
    relatedTerms: ["Insurance", "Indemnification", "Liability Cap"],
  },

  // Entity Classifications
  {
    abbreviation: "Essential Entity",
    fullName: "Essential Entity (NIS2)",
    definition:
      "Large entity in a sector of high criticality (Annex I), subject to stricter NIS2 requirements and higher penalties (EUR 10M or 2% turnover).",
    regulatoryContext: ["NIS2 Art. 3"],
    relatedTerms: ["Important Entity", "NIS2", "Critical Infrastructure"],
  },
  {
    abbreviation: "Important Entity",
    fullName: "Important Entity (NIS2)",
    definition:
      "Medium entity in a sector of high criticality or any size in other critical sectors (Annex II), subject to NIS2 requirements with lower penalties.",
    regulatoryContext: ["NIS2 Art. 3"],
    relatedTerms: ["Essential Entity", "NIS2"],
  },
];

// ─── Lookup Functions ───

export function getTermByAbbreviation(
  abbreviation: string,
): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find(
    (t) => t.abbreviation.toLowerCase() === abbreviation.toLowerCase(),
  );
}

export function searchTerms(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase();
  return GLOSSARY_TERMS.filter(
    (t) =>
      t.abbreviation.toLowerCase().includes(lowerQuery) ||
      t.fullName.toLowerCase().includes(lowerQuery) ||
      t.definition.toLowerCase().includes(lowerQuery),
  );
}

export function getTermsByContext(regulation: string): GlossaryTerm[] {
  return GLOSSARY_TERMS.filter((t) =>
    t.regulatoryContext.some((ctx) =>
      ctx.toLowerCase().includes(regulation.toLowerCase()),
    ),
  );
}

export function getRelatedTerms(abbreviation: string): GlossaryTerm[] {
  const term = getTermByAbbreviation(abbreviation);
  if (!term) return [];

  return term.relatedTerms
    .map((rt) => getTermByAbbreviation(rt))
    .filter((t): t is GlossaryTerm => t !== undefined);
}

// ─── Export Index ───

export const GLOSSARY_INDEX = GLOSSARY_TERMS.reduce(
  (acc, term) => {
    acc[term.abbreviation] = term;
    return acc;
  },
  {} as Record<string, GlossaryTerm>,
);
