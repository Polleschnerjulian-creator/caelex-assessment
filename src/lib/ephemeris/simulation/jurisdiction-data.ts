import type {
  JurisdictionProfile,
  JurisdictionRequirement,
} from "../core/types";

/**
 * 7 European Jurisdiction Profiles for Compliance Simulation
 *
 * Each jurisdiction has specific national space law requirements
 * that overlay the EU Space Act baseline.
 */

export const JURISDICTIONS: Record<string, JurisdictionProfile> = {
  DE: {
    code: "DE",
    name: "Germany",
    authority: "DLR / BNetzA",
    nationalSpaceLaw: "Satellitendatensicherheitsgesetz (SatDSiG)",
    euMember: true,
    esaMember: true,
    specificRequirements: [
      {
        regulationRef: "satdsig_data_security",
        name: "Satellite Data Security Clearance",
        jurisdiction: "DE",
        category: "data_security",
      },
      {
        regulationRef: "de_frequency_bnetza",
        name: "BNetzA Frequency Authorization",
        jurisdiction: "DE",
        category: "frequency",
      },
    ],
    approvalDuration: "8-12 months",
    frequencyAuthority: "BNetzA",
  },
  NO: {
    code: "NO",
    name: "Norway",
    authority: "NOSA (Norwegian Space Agency)",
    nationalSpaceLaw: "Lov om romvirksomhet (Norwegian Space Act)",
    euMember: false,
    esaMember: true,
    specificRequirements: [
      {
        regulationRef: "no_space_act_license",
        name: "Norwegian Space Activity License",
        jurisdiction: "NO",
        category: "authorization",
      },
      {
        regulationRef: "no_insurance_req",
        name: "Mandatory Third Party Liability Insurance",
        jurisdiction: "NO",
        category: "insurance",
      },
      {
        regulationRef: "no_debris_plan",
        name: "Debris Mitigation Plan (NOSA)",
        jurisdiction: "NO",
        category: "debris",
      },
    ],
    approvalDuration: "6-9 months",
    frequencyAuthority: "Nkom",
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    authority: "UK Space Agency / CAA",
    nationalSpaceLaw: "Space Industry Act 2018",
    euMember: false,
    esaMember: true,
    specificRequirements: [
      {
        regulationRef: "uk_sia_operator_license",
        name: "UK Operator License (Space Industry Act)",
        jurisdiction: "GB",
        category: "authorization",
      },
      {
        regulationRef: "uk_orbital_debris",
        name: "UK Orbital Debris Requirements",
        jurisdiction: "GB",
        category: "debris",
      },
    ],
    approvalDuration: "6-12 months",
    frequencyAuthority: "Ofcom",
  },
  LU: {
    code: "LU",
    name: "Luxembourg",
    authority: "Luxembourg Space Agency (LSA)",
    nationalSpaceLaw: "Loi du 15 décembre 2020",
    euMember: true,
    esaMember: true,
    specificRequirements: [
      {
        regulationRef: "lu_space_resources",
        name: "Space Resources Exploration License",
        jurisdiction: "LU",
        category: "authorization",
      },
    ],
    approvalDuration: "4-8 months",
    frequencyAuthority: "ILR",
  },
  FR: {
    code: "FR",
    name: "France",
    authority: "CNES",
    nationalSpaceLaw: "Loi relative aux opérations spatiales (LOS)",
    euMember: true,
    esaMember: true,
    specificRequirements: [
      {
        regulationRef: "fr_los_authorization",
        name: "LOS Launch/Operations Authorization",
        jurisdiction: "FR",
        category: "authorization",
      },
      {
        regulationRef: "fr_cnes_technical_regs",
        name: "CNES Technical Regulations Compliance",
        jurisdiction: "FR",
        category: "technical",
      },
      {
        regulationRef: "fr_tpl_guarantee",
        name: "State Financial Guarantee (TPL)",
        jurisdiction: "FR",
        category: "insurance",
      },
    ],
    approvalDuration: "9-15 months",
    frequencyAuthority: "ARCEP",
  },
  IT: {
    code: "IT",
    name: "Italy",
    authority: "ASI (Italian Space Agency)",
    nationalSpaceLaw: "Italian Space Economy Law (2018)",
    euMember: true,
    esaMember: true,
    specificRequirements: [
      {
        regulationRef: "it_asi_authorization",
        name: "ASI Space Activity Authorization",
        jurisdiction: "IT",
        category: "authorization",
      },
    ],
    approvalDuration: "6-12 months",
    frequencyAuthority: "AGCOM",
  },
  SE: {
    code: "SE",
    name: "Sweden",
    authority: "Swedish National Space Agency (SNSA)",
    nationalSpaceLaw: "Act on Space Activities (1982:963)",
    euMember: true,
    esaMember: true,
    specificRequirements: [
      {
        regulationRef: "se_space_act_license",
        name: "SNSA Space Activity License",
        jurisdiction: "SE",
        category: "authorization",
      },
      {
        regulationRef: "se_environmental_review",
        name: "Environmental Review (Kiruna Operations)",
        jurisdiction: "SE",
        category: "environmental",
      },
    ],
    approvalDuration: "6-10 months",
    frequencyAuthority: "PTS",
  },
};

/**
 * Get all jurisdiction codes.
 */
export function getJurisdictionCodes(): string[] {
  return Object.keys(JURISDICTIONS);
}

/**
 * Get a jurisdiction profile by code.
 */
export function getJurisdiction(code: string): JurisdictionProfile | undefined {
  return JURISDICTIONS[code.toUpperCase()];
}

/**
 * Get all requirements for a jurisdiction (national + baseline EU).
 */
export function getJurisdictionRequirements(
  code: string,
): JurisdictionRequirement[] {
  const jurisdiction = JURISDICTIONS[code.toUpperCase()];
  if (!jurisdiction) return [];
  return jurisdiction.specificRequirements;
}
