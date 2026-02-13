/**
 * ASTRA Regulatory Knowledge: Jurisdiction Profiles
 *
 * Detailed profiles for 10 European jurisdictions with national space laws.
 */

import type { JurisdictionProfile } from "../types";

// ─── Jurisdiction Profiles ───

export const JURISDICTION_PROFILES: JurisdictionProfile[] = [
  {
    countryCode: "FR",
    countryName: "France",
    ncaName: "Centre National d'Études Spatiales",
    ncaAbbreviation: "CNES",
    processingTimeDays: {
      standard: 180,
      expedited: 90,
    },
    insuranceMinimums: {
      tplMinimum: 60_000_000,
      currency: "EUR",
      notes: "State provides unlimited indemnification above insured amount",
    },
    liabilityRegime:
      "Absolute liability with state indemnification cap at EUR 60M",
    specialRequirements: [
      "Technical conformity assessment by CNES",
      "Debris mitigation plan per Arrêté technique 2011",
      "French language documentation required",
      "Annual reporting to CNES",
    ],
    favorabilityScore: 85,
    languageRequirements: [
      "French (mandatory)",
      "English (accepted for technical docs)",
    ],
    fees: {
      application: 0,
      annual: 0,
      currency: "EUR",
    },
    contacts: {
      website: "https://cnes.fr",
      email: "reglementationspatiale@cnes.fr",
    },
  },
  {
    countryCode: "UK",
    countryName: "United Kingdom",
    ncaName: "Civil Aviation Authority (Space)",
    ncaAbbreviation: "CAA Space",
    processingTimeDays: {
      standard: 180,
      expedited: 120,
    },
    insuranceMinimums: {
      tplMinimum: 60_000_000,
      currency: "GBP",
      notes: "Risk-based; may be higher for large constellations",
    },
    liabilityRegime: "Fault-based with state indemnification provisions",
    specialRequirements: [
      "Orbital Safety Case required",
      "Mission-specific insurance assessment",
      "Post-Brexit: separate from EU regime",
      "Launch operator license separate from satellite license",
    ],
    favorabilityScore: 80,
    languageRequirements: ["English"],
    fees: {
      application: 6500,
      annual: 3500,
      currency: "GBP",
    },
    contacts: {
      website: "https://www.caa.co.uk/space",
      email: "space@caa.co.uk",
    },
  },
  {
    countryCode: "DE",
    countryName: "Germany",
    ncaName: "German Aerospace Center / Federal Aviation Office",
    ncaAbbreviation: "DLR/LBA",
    processingTimeDays: {
      standard: 240,
      expedited: undefined,
    },
    insuranceMinimums: {
      tplMinimum: 50_000_000,
      currency: "EUR",
      notes: "Based on SatDSiG; may increase per EU Space Act",
    },
    liabilityRegime: "Fault-based liability per national law",
    specialRequirements: [
      "Technical assessment by DLR",
      "Data protection assessment (GDPR emphasis)",
      "German-language application with certified translation",
      "No dedicated space law until 2024; uses SatDSiG for EO",
    ],
    favorabilityScore: 70,
    languageRequirements: ["German (mandatory)", "English (technical annexes)"],
    fees: {
      application: 25000,
      annual: 10000,
      currency: "EUR",
    },
    contacts: {
      website: "https://www.dlr.de",
      email: "raumfahrtrecht@dlr.de",
    },
  },
  {
    countryCode: "LU",
    countryName: "Luxembourg",
    ncaName: "Luxembourg Space Agency",
    ncaAbbreviation: "LSA",
    processingTimeDays: {
      standard: 120,
      expedited: 60,
    },
    insuranceMinimums: {
      tplMinimum: 100_000_000,
      currency: "EUR",
      notes: "Higher minimums but competitive environment",
    },
    liabilityRegime:
      "Absolute liability with operator indemnification of state",
    specialRequirements: [
      "Space resources law (2017) enables asteroid mining",
      "Fast-track for innovative missions",
      "English accepted throughout process",
      "Strong financial sector for insurance/financing",
    ],
    favorabilityScore: 90,
    languageRequirements: ["English", "French", "German (all accepted)"],
    fees: {
      application: 5000,
      annual: 2500,
      currency: "EUR",
    },
    contacts: {
      website: "https://space-agency.lu",
      email: "info@space-agency.lu",
    },
  },
  {
    countryCode: "NL",
    countryName: "Netherlands",
    ncaName: "Netherlands Space Office",
    ncaAbbreviation: "NSO",
    processingTimeDays: {
      standard: 150,
      expedited: undefined,
    },
    insuranceMinimums: {
      tplMinimum: 50_000_000,
      currency: "EUR",
      notes: "Liability capped per Space Activities Act",
    },
    liabilityRegime: "Limited liability with EUR 1B state indemnification cap",
    specialRequirements: [
      "Space Activities Act 2007 (amended 2021)",
      "Risk assessment per NOAA methodology",
      "Strong NewSpace ecosystem",
      "ESA ESTEC located in Netherlands",
    ],
    favorabilityScore: 85,
    languageRequirements: ["English", "Dutch"],
    fees: {
      application: 15000,
      annual: 5000,
      currency: "EUR",
    },
    contacts: {
      website: "https://www.spaceoffice.nl",
      email: "info@spaceoffice.nl",
    },
  },
  {
    countryCode: "BE",
    countryName: "Belgium",
    ncaName: "Belgian Federal Science Policy Office",
    ncaAbbreviation: "BELSPO",
    processingTimeDays: {
      standard: 180,
      expedited: undefined,
    },
    insuranceMinimums: {
      tplMinimum: 40_000_000,
      currency: "EUR",
      notes: "Lower minimum but comprehensive coverage required",
    },
    liabilityRegime: "Fault-based with limited operator indemnification",
    specialRequirements: [
      "Belgian Space Law 2005 (amended 2013)",
      "ESA headquarters presence",
      "Strong academic-industry cooperation",
      "Trilingual administration (FR/NL/DE)",
    ],
    favorabilityScore: 75,
    languageRequirements: ["French", "Dutch", "English (technical)"],
    fees: {
      application: 10000,
      annual: 5000,
      currency: "EUR",
    },
    contacts: {
      website: "https://www.belspo.be",
      email: "space@belspo.be",
    },
  },
  {
    countryCode: "AT",
    countryName: "Austria",
    ncaName: "Austrian Research Promotion Agency",
    ncaAbbreviation: "FFG",
    processingTimeDays: {
      standard: 180,
      expedited: undefined,
    },
    insuranceMinimums: {
      tplMinimum: 60_000_000,
      currency: "EUR",
      notes: "Standard EU Space Act alignment expected",
    },
    liabilityRegime: "Absolute liability per Austrian Space Act",
    specialRequirements: [
      "Austrian Outer Space Act 2011",
      "Strong SME support programs",
      "Neutral state considerations for certain missions",
      "German language mandatory",
    ],
    favorabilityScore: 70,
    languageRequirements: ["German (mandatory)"],
    fees: {
      application: 20000,
      annual: 7500,
      currency: "EUR",
    },
    contacts: {
      website: "https://www.ffg.at/space",
      email: "space@ffg.at",
    },
  },
  {
    countryCode: "DK",
    countryName: "Denmark",
    ncaName: "Danish Agency for Science and Higher Education",
    ncaAbbreviation: "UFST",
    processingTimeDays: {
      standard: 120,
      expedited: undefined,
    },
    insuranceMinimums: {
      tplMinimum: 50_000_000,
      currency: "DKK", // ~EUR 6.7M
      notes: "Converted to DKK; relatively low minimums",
    },
    liabilityRegime: "Fault-based with state recourse rights",
    specialRequirements: [
      "Danish Outer Space Act 2016",
      "Arctic/polar orbit considerations",
      "Greenland/Faroe Islands jurisdiction questions",
      "English widely accepted",
    ],
    favorabilityScore: 80,
    languageRequirements: ["Danish", "English"],
    fees: {
      application: 50000,
      annual: 25000,
      currency: "DKK",
    },
    contacts: {
      website: "https://ufst.dk",
      email: "rumregistret@ufst.dk",
    },
  },
  {
    countryCode: "IT",
    countryName: "Italy",
    ncaName: "Italian Space Agency",
    ncaAbbreviation: "ASI",
    processingTimeDays: {
      standard: 240,
      expedited: undefined,
    },
    insuranceMinimums: {
      tplMinimum: 60_000_000,
      currency: "EUR",
      notes: "Comprehensive coverage required; state guarantee available",
    },
    liabilityRegime: "Absolute liability with state indemnification",
    specialRequirements: [
      "Italian Space Law pending comprehensive update",
      "Strong defense-space linkage",
      "Mediterranean launch corridor interest",
      "Italian language strongly preferred",
    ],
    favorabilityScore: 65,
    languageRequirements: ["Italian (preferred)", "English (technical)"],
    fees: {
      application: 30000,
      annual: 15000,
      currency: "EUR",
    },
    contacts: {
      website: "https://www.asi.it",
      email: "urp@asi.it",
    },
  },
  {
    countryCode: "NO",
    countryName: "Norway",
    ncaName: "Norwegian Space Agency",
    ncaAbbreviation: "NOSA",
    processingTimeDays: {
      standard: 150,
      expedited: 90,
    },
    insuranceMinimums: {
      tplMinimum: 60_000_000,
      currency: "NOK", // ~EUR 5.5M
      notes: "Converted to NOK; competitive rates",
    },
    liabilityRegime: "Fault-based per Norwegian Space Act",
    specialRequirements: [
      "Norwegian Space Act 1969 (updated 2021)",
      "Svalbard launch facility (Andøya)",
      "Arctic/polar orbit expertise",
      "EEA member, aligns with EU regulations",
    ],
    favorabilityScore: 85,
    languageRequirements: ["Norwegian", "English"],
    fees: {
      application: 75000,
      annual: 35000,
      currency: "NOK",
    },
    contacts: {
      website: "https://www.romsenter.no",
      email: "post@spaceagency.no",
    },
  },
];

// ─── Lookup Functions ───

export function getJurisdictionByCode(
  code: string,
): JurisdictionProfile | undefined {
  return JURISDICTION_PROFILES.find((j) => j.countryCode === code);
}

export function getJurisdictionsByFavorability(
  minScore: number = 0,
): JurisdictionProfile[] {
  return JURISDICTION_PROFILES.filter(
    (j) => j.favorabilityScore >= minScore,
  ).sort((a, b) => b.favorabilityScore - a.favorabilityScore);
}

export function compareJurisdictions(codes: string[]): JurisdictionProfile[] {
  return codes
    .map((code) => getJurisdictionByCode(code))
    .filter((j): j is JurisdictionProfile => j !== undefined);
}

export function getJurisdictionsWithInsuranceBelow(
  amount: number,
): JurisdictionProfile[] {
  return JURISDICTION_PROFILES.filter(
    (j) => j.insuranceMinimums.tplMinimum <= amount,
  );
}

export function getJurisdictionsByProcessingTime(
  maxDays: number,
): JurisdictionProfile[] {
  return JURISDICTION_PROFILES.filter(
    (j) => j.processingTimeDays.standard <= maxDays,
  );
}

// ─── Favorability Factors ───

export const FAVORABILITY_FACTORS = {
  processingTime: {
    weight: 0.2,
    description: "Speed of authorization processing",
  },
  insuranceCosts: {
    weight: 0.15,
    description: "Insurance minimum requirements and availability",
  },
  liabilityRegime: {
    weight: 0.2,
    description: "Operator liability exposure and state indemnification",
  },
  regulatoryMaturity: {
    weight: 0.15,
    description: "Clarity and stability of regulatory framework",
  },
  languageAccessibility: {
    weight: 0.1,
    description: "English acceptance and documentation requirements",
  },
  fees: {
    weight: 0.1,
    description: "Application and annual licensing fees",
  },
  ecosystemSupport: {
    weight: 0.1,
    description: "Industry support, funding, and NewSpace friendliness",
  },
};

// ─── Summary for ASTRA Context ───

export const JURISDICTIONS_SUMMARY = `
Ten European jurisdictions have established national space law frameworks for licensing space activities:

**Most Favorable (85+ score)**:
- Luxembourg (90): Fastest processing (60-120 days), space resources law, English accepted, strong financial sector
- France (85): State indemnification, CNES expertise, established framework, no fees
- Netherlands (85): Strong NewSpace ecosystem, ESA ESTEC presence, limited liability
- Norway (85): Polar orbit expertise, Andøya launch site, EEA alignment

**Favorable (75-84 score)**:
- UK (80): Established CAA regime, orbital safety case process, post-Brexit independence
- Denmark (80): Fast processing, Arctic considerations, reasonable fees
- Belgium (75): ESA HQ presence, lower insurance minimums, academic links

**Developing (65-74 score)**:
- Germany (70): Technical strength but longer processing, higher fees, language requirements
- Austria (70): SME support, German-language requirement
- Italy (65): Strong capabilities but slower processing, language preference

**Key Comparison Factors**:
- Processing time: 60 days (Luxembourg expedited) to 240 days (Germany/Italy)
- Insurance minimums: EUR 40-100M depending on jurisdiction
- Language: English fully accepted in LU, UK, NL, NO, DK; German required in DE, AT; French in FR
- Fees: EUR 0 (France) to EUR 35,000 (some jurisdictions)

**EU Space Act Impact**: Once fully applicable (2030), the EU Space Act will harmonize authorization requirements across EU Member States with mutual recognition, potentially reducing the importance of jurisdiction shopping within the EU.
`.trim();
