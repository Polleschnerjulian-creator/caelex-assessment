/**
 * @deprecated Use individual jurisdiction files in `src/data/regulatory/jurisdictions/` instead.
 * Each jurisdiction now has its own file with enacted law, NCA knowledge, and requirements.
 */

/*
 * TODO(H7 + H8 audit drift, 2026-04-19):
 *
 * H7 — licensingAuthority entries below that do NOT yet have a matching
 *      record in src/data/legal-sources/sources/<code>.ts AUTHORITIES_*:
 *        FR: CNES (website mismatch with FR-CNES in fr.ts)
 *        UK: UK Civil Aviation Authority (Space)
 *        LU: Luxembourg Space Agency
 *        NL: Ministry of Economic Affairs / Agentschap Telecom
 *        ES: AEE (aee.gob.es)
 *        PT: Portugal Space (ptspace.pt)
 *        CZ: Ministry of Transport — Space Activities Department
 *
 * H8 — `legislation` primary-law entries that do NOT yet map to a
 *      legal-source record by year/URL/title:
 *        NL: Space Activities Act 2007
 *        ES: Royal Decree 278/2024
 *        GR: Law 4903/2022
 *        CZ: Act 77/2024 on Space Activities
 *        CH: Federal Ordinance on Space Objects 2019
 *        IE: no dedicated national law (informational)
 *
 * Reconciliation is additive: adds missing records to legal-sources/sources/*.ts;
 * no changes to this file needed. Tracked for next quarterly data review.
 */

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * National space law regulatory data for 10 priority European jurisdictions.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  SpaceLawCountryCode,
  JurisdictionLaw,
  SpaceLawActivityType,
} from "@/lib/space-law-types";

// ─── Helper: All general activity types ───

const ALL_GENERAL_ACTIVITIES: SpaceLawActivityType[] = [
  "spacecraft_operation",
  "launch_vehicle",
  "launch_site",
  "in_orbit_services",
  "earth_observation",
  "satellite_communications",
  "space_resources",
];

const ALL_ORBITAL_ACTIVITIES: SpaceLawActivityType[] = [
  "spacecraft_operation",
  "in_orbit_services",
  "earth_observation",
  "satellite_communications",
  "space_resources",
];

// ─── France (FR) ───

const FR: JurisdictionLaw = {
  countryCode: "FR",
  countryName: "France",
  flagEmoji: "\u{1F1EB}\u{1F1F7}",

  legislation: {
    name: "French Space Operations Act (LOS)",
    nameLocal: "Loi relative aux op\u00e9rations spatiales",
    yearEnacted: 2008,
    yearAmended: 2019,
    status: "enacted",
    officialUrl: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000018931380",
    keyArticles: "Articles 1-22",
  },

  licensingAuthority: {
    name: "Centre National d'\u00c9tudes Spatiales (CNES)",
    nameLocal: "Centre National d'\u00c9tudes Spatiales",
    website: "https://cnes.fr",
    contactEmail: "contact@cnes.fr",
    parentMinistry: "Ministry of Higher Education, Research and Innovation",
  },

  licensingRequirements: [
    {
      id: "fr-tech-assessment",
      category: "technical_assessment",
      title: "Technical Conformity Assessment",
      description:
        "Comprehensive technical assessment of the space object demonstrating conformity with regulations on technical requirements for space operations, as defined by CNES technical regulation.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 4, D\u00e9cret 2009-643",
    },
    {
      id: "fr-financial-guarantee",
      category: "financial_guarantee",
      title: "Financial Guarantee",
      description:
        "Proof of adequate financial resources to cover potential liabilities arising from space operations, including third-party damage on Earth and in space.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 6 LOS",
    },
    {
      id: "fr-insurance",
      category: "insurance",
      title: "Mandatory Third-Party Liability Insurance",
      description:
        "Operators must obtain third-party liability insurance with a minimum coverage of \u20ac60M. The French government provides indemnification for damages exceeding the insured amount.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 6 LOS",
    },
    {
      id: "fr-debris-plan",
      category: "debris_plan",
      title: "Debris Mitigation Plan",
      description:
        "A detailed plan for limiting the creation of space debris, including measures for collision avoidance and post-mission disposal of the space object.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 5 LOS, Arr\u00eat\u00e9 technique 2011",
    },
    {
      id: "fr-safety-assessment",
      category: "safety_assessment",
      title: "Safety Assessment",
      description:
        "Assessment of risks to persons, property, public health, and the environment during all mission phases, including launch, in-orbit operations, and re-entry.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 4-5 LOS",
    },
    {
      id: "fr-end-of-life",
      category: "end_of_life_plan",
      title: "End-of-Life Plan",
      description:
        "Detailed plan for post-mission disposal including deorbiting, passivation of all energy sources, and compliance with the 25-year deorbit guideline.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Art. 5 LOS, FSOA Technical Regulation",
    },
  ],

  applicabilityRules: [
    {
      id: "fr-rule-launch-territory",
      description:
        "Applies to any space operation launched from French territory (including Guiana Space Centre)",
      condition:
        "Launch from French territory or French overseas territories (incl. Kourou/CSG)",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "eu_other", "non_eu"],
      articleRef: "Art. 1 LOS",
    },
    {
      id: "fr-rule-french-jurisdiction",
      description:
        "Applies to operators under French jurisdiction regardless of launch site",
      condition:
        "Entity established in France or controlled by a French entity",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Art. 2 LOS",
    },
    {
      id: "fr-rule-transfer",
      description: "Transfer of operational control requires new authorization",
      condition:
        "Any transfer of in-orbit control to a new operator under French jurisdiction",
      applies: true,
      activityTypes: ["spacecraft_operation", "in_orbit_services"],
      entityTypes: ["domestic", "eu_other"],
      articleRef: "Art. 3 LOS",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "\u20ac60,000,000",
    governmentIndemnification: true,
    indemnificationCap:
      "Unlimited above \u20ac60M (State guarantee for damage exceeding operator insurance)",
    liabilityRegime: "capped",
    liabilityCap: "\u20ac60M for operator; State assumes liability above cap",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years (FSOA technical regulation)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: [
      "FSOA Technical Regulation (Arr\u00eat\u00e9 technique)",
      "IADC Space Debris Mitigation Guidelines",
      "ISO 24113",
    ],
  },

  dataSensing: {
    remoteSensingLicense: true,
    dataDistributionRestrictions: true,
    resolutionRestrictions:
      "Distribution restrictions on high-resolution data; defense-related imagery subject to additional controls",
    dataPolicyUrl: "https://www.legifrance.gouv.fr",
  },

  timeline: {
    typicalProcessingWeeks: { min: 12, max: 26 },
    applicationFee: "\u20ac5,000\u2013\u20ac15,000",
    annualFee: "\u20ac2,000\u2013\u20ac5,000",
    otherCosts: [
      "Technical assessment fees (CNES)",
      "Insurance premiums (mission-dependent)",
    ],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "CNES National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "complementary",
    description:
      "LOS provisions largely align with EU Space Act. French government indemnification scheme (unique in EU) expected to continue alongside EU framework. CNES to serve as national implementing authority.",
    keyArticles: ["Art. 6-14 EU Space Act (Authorization)"],
    transitionNotes:
      "France has indicated CNES will serve as the competent national authority under the EU Space Act. Existing LOS licenses expected to be recognized during transition period.",
  },

  lastUpdated: "2026-01",
};

// ─── United Kingdom (UK) ───
// Delegated to uk-space-engine.server.ts — this entry is kept for metadata/display only

const UK: JurisdictionLaw = {
  countryCode: "UK",
  countryName: "United Kingdom",
  flagEmoji: "\u{1F1EC}\u{1F1E7}",

  legislation: {
    name: "Space Industry Act 2018 + Outer Space Act 1986",
    nameLocal: "Space Industry Act 2018",
    yearEnacted: 2018,
    yearAmended: 2021,
    status: "enacted",
    officialUrl: "https://www.legislation.gov.uk/ukpga/2018/5/contents/enacted",
    keyArticles: "Sections 1-70 (SIA 2018)",
  },

  licensingAuthority: {
    name: "UK Civil Aviation Authority (Space)",
    nameLocal: "Civil Aviation Authority",
    website: "https://www.caa.co.uk",
    contactEmail: "space@caa.co.uk",
    parentMinistry: "Department for Transport",
  },

  licensingRequirements: [
    {
      id: "uk-tech-assessment",
      category: "technical_assessment",
      title: "Technical Assessment",
      description:
        "Demonstration that the space activity meets all technical requirements including mission design, spacecraft safety, and orbital parameters as specified by the CAA.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Section 8 SIA 2018",
    },
    {
      id: "uk-insurance",
      category: "insurance",
      title: "Third-Party Liability Insurance",
      description:
        "Mandatory third-party liability insurance with minimum coverage of \u00a360M. Higher coverage may be required based on risk assessment of the specific mission.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Section 12 SIA 2018",
    },
    {
      id: "uk-safety-assessment",
      category: "safety_assessment",
      title: "Safety Assessment",
      description:
        "Comprehensive safety case demonstrating acceptable risk levels for persons, property, and the environment throughout all mission phases.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Section 9 SIA 2018",
    },
    {
      id: "uk-environmental",
      category: "environmental_assessment",
      title: "Environmental Assessment",
      description:
        "Assessment of environmental impact including effects on the space environment and terrestrial environment during launch and re-entry operations.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Section 10 SIA 2018",
    },
    {
      id: "uk-corporate-governance",
      category: "corporate_governance",
      title: "Corporate Governance Requirements",
      description:
        "Demonstration of adequate corporate governance, including fit-and-proper-person assessment for key personnel and organizational competence.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Section 8(4) SIA 2018",
    },
    {
      id: "uk-end-of-life",
      category: "end_of_life_plan",
      title: "End-of-Life Disposal Plan",
      description:
        "Plan for post-mission disposal of the space object, including deorbit strategy, passivation procedures, and compliance with the 25-year rule.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Sections 9-10 SIA 2018, UK Space Agency Guidelines",
    },
  ],

  applicabilityRules: [
    {
      id: "uk-rule-territory",
      description:
        "Applies to all space activities carried out from the United Kingdom",
      condition:
        "Launch or operation from UK territory, including overseas territories and Crown dependencies",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "non_eu"],
      articleRef: "Section 1 SIA 2018",
    },
    {
      id: "uk-rule-nationals",
      description:
        "Applies to UK nationals and entities wherever they conduct space activities",
      condition:
        "UK national, Scottish body, or body incorporated under UK law",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Section 1 OSA 1986",
    },
    {
      id: "uk-rule-procurement",
      description:
        "Applies when a UK entity procures a launch, even from foreign territory",
      condition:
        "UK entity procuring launch services from any launch provider worldwide",
      applies: true,
      activityTypes: ["spacecraft_operation", "launch_vehicle"],
      entityTypes: ["domestic"],
      articleRef: "Section 1(1) OSA 1986",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "\u00a360,000,000",
    governmentIndemnification: true,
    indemnificationCap:
      "Government indemnification for claims above \u00a360M (under review for reform)",
    liabilityRegime: "capped",
    liabilityCap: "\u00a360M operator cap; government assumes excess",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: [
      "UK Space Agency Debris Mitigation Guidelines",
      "IADC Space Debris Mitigation Guidelines",
      "ISO 24113",
    ],
  },

  dataSensing: {
    remoteSensingLicense: true,
    dataDistributionRestrictions: true,
    resolutionRestrictions:
      "High-resolution imagery subject to distribution controls under national security provisions",
    dataPolicyUrl: "https://www.legislation.gov.uk/ukpga/2018/5/contents",
  },

  timeline: {
    typicalProcessingWeeks: { min: 16, max: 26 },
    applicationFee: "\u00a36,500\u2013\u00a350,000",
    annualFee: "\u00a33,000+",
    otherCosts: [
      "Safety case development costs",
      "Insurance premiums",
      "Environmental impact assessment",
    ],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "UK Space Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "parallel",
    description:
      "Post-Brexit, UK space law operates independently. UK-licensed operators serving EU market will require separate EU authorization under Art. 14 (third-country operator provisions).",
    keyArticles: [
      "Art. 14 EU Space Act (Third-Country Operators)",
      "Art. 6-12 EU Space Act (Authorization Framework)",
    ],
    transitionNotes:
      "UK operators with EU market presence must plan for dual licensing. No mutual recognition framework currently exists between UK SIA and EU Space Act.",
  },

  lastUpdated: "2026-01",
};

// ─── Belgium (BE) ───

const BE: JurisdictionLaw = {
  countryCode: "BE",
  countryName: "Belgium",
  flagEmoji: "\u{1F1E7}\u{1F1EA}",

  legislation: {
    name: "Law on Space Activities 2005",
    nameLocal: "Loi relative aux activit\u00e9s spatiales",
    yearEnacted: 2005,
    status: "enacted",
    officialUrl: "https://www.belspo.be/belspo/space/policy_en.stm",
    keyArticles: "Articles 1-18",
  },

  licensingAuthority: {
    name: "Belgian Federal Science Policy Office (BELSPO)",
    nameLocal:
      "Service public f\u00e9d\u00e9ral de programmation Politique scientifique",
    website: "https://www.belspo.be",
    contactEmail: "space@belspo.be",
    parentMinistry: "Federal Government",
  },

  licensingRequirements: [
    {
      id: "be-tech-assessment",
      category: "technical_assessment",
      title: "Technical Dossier",
      description:
        "Submission of a comprehensive technical dossier demonstrating the safety and viability of the proposed space activity, including mission design and spacecraft specifications.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 4",
    },
    {
      id: "be-insurance",
      category: "insurance",
      title: "Liability Insurance",
      description:
        "Proof of adequate insurance coverage for third-party liability. Coverage amount determined on a case-by-case basis by the licensing authority.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 10",
    },
    {
      id: "be-safety-assessment",
      category: "safety_assessment",
      title: "Safety Assessment",
      description:
        "Risk assessment addressing potential hazards to persons, property, and the environment from the space activity.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 5",
    },
    {
      id: "be-notification",
      category: "notification",
      title: "Prior Notification",
      description:
        "Notification to BELSPO prior to commencing any space activity, including planned launch date, orbital parameters, and mission objectives.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 3",
    },
    {
      id: "be-end-of-life",
      category: "end_of_life_plan",
      title: "End-of-Life Plan",
      description:
        "Documented plan for the disposal of the space object after end of operational life, consistent with international debris mitigation guidelines.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Art. 5, Royal Decree 2014",
    },
  ],

  applicabilityRules: [
    {
      id: "be-rule-jurisdiction",
      description:
        "Applies to space activities conducted by Belgian entities or from Belgian territory",
      condition:
        "Operator is a Belgian national, entity incorporated in Belgium, or activity launched from Belgian territory",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Art. 2",
    },
    {
      id: "be-rule-control",
      description:
        "Applies when a Belgian entity exercises effective control over the space activity",
      condition:
        "Belgian entity has operational or managerial control of the space object",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "eu_other"],
      articleRef: "Art. 2",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "Case-by-case determination",
    governmentIndemnification: true,
    indemnificationCap:
      "Government may assume liability above insured amount (subject to Council of Ministers decision)",
    liabilityRegime: "tiered",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "Per IADC guidelines (25 years recommended)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: ["IADC Space Debris Mitigation Guidelines", "ISO 24113"],
  },

  dataSensing: {
    remoteSensingLicense: true,
    dataDistributionRestrictions: true,
    resolutionRestrictions:
      "Subject to national security review for high-resolution data distribution",
  },

  timeline: {
    typicalProcessingWeeks: { min: 8, max: 16 },
    applicationFee: "\u20ac2,000\u2013\u20ac10,000",
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "Belgian National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "superseded",
    description:
      "Belgian law is relatively concise. EU Space Act will significantly expand Belgium\u2019s regulatory framework, adding detailed requirements for debris mitigation, cybersecurity, and environmental footprint.",
    keyArticles: [
      "Art. 6-27 EU Space Act (Authorization)",
      "Art. 55-73 EU Space Act (Debris Mitigation)",
    ],
    transitionNotes:
      "Belgium expected to designate BELSPO or a successor entity as the national competent authority. Existing authorizations likely to be grandfathered.",
  },

  lastUpdated: "2026-01",
};

// ─── Netherlands (NL) ───

const NL: JurisdictionLaw = {
  countryCode: "NL",
  countryName: "Netherlands",
  flagEmoji: "\u{1F1F3}\u{1F1F1}",

  legislation: {
    name: "Space Activities Act 2007",
    nameLocal: "Wet ruimtevaartactiviteiten",
    yearEnacted: 2007,
    status: "enacted",
    officialUrl: "https://wetten.overheid.nl/BWBR0021418/2021-07-01",
    keyArticles: "Articles 1-16",
  },

  licensingAuthority: {
    name: "Ministry of Economic Affairs (Agentschap Telecom)",
    nameLocal: "Agentschap Telecom",
    website: "https://www.agentschaptelecom.nl",
    contactEmail: "space@minezk.nl",
    parentMinistry: "Ministry of Economic Affairs and Climate Policy",
  },

  licensingRequirements: [
    {
      id: "nl-tech-assessment",
      category: "technical_assessment",
      title: "Technical Assessment",
      description:
        "Detailed technical information about the space object, mission profile, and orbital parameters to demonstrate compliance with safety requirements.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 3",
    },
    {
      id: "nl-insurance",
      category: "insurance",
      title: "Third-Party Liability Insurance",
      description:
        "Mandatory insurance covering third-party liability. Minimum coverage starts at \u20ac3M for small satellites, scaling with mission risk profile.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 3(3)(d)",
    },
    {
      id: "nl-financial-guarantee",
      category: "financial_guarantee",
      title: "Financial Guarantee",
      description:
        "Demonstration of financial capacity to conduct the space activity and cover potential liabilities, including bank guarantees or other financial instruments.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 3(3)(e)",
    },
    {
      id: "nl-notification",
      category: "notification",
      title: "Activity Notification",
      description:
        "Prior notification to the Minister of Economic Affairs before commencing any space activity, including changes to previously authorized activities.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 2",
    },
    {
      id: "nl-end-of-life",
      category: "end_of_life_plan",
      title: "End-of-Life Disposal Plan",
      description:
        "Plan for post-mission disposal of the space object within 25 years of end of operational life, including passivation and deorbit measures.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Art. 3(3), Space Activities Decree",
    },
  ],

  applicabilityRules: [
    {
      id: "nl-rule-jurisdiction",
      description:
        "Applies to space activities by Dutch entities or activities under Dutch jurisdiction",
      condition:
        "Entity incorporated in the Netherlands, or operating space objects registered in the Dutch national registry",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Art. 2",
    },
    {
      id: "nl-rule-control",
      description:
        "Applies when a Dutch entity has effective control over space activities conducted abroad",
      condition:
        "Dutch entity directing or controlling space operations regardless of launch location",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "eu_other"],
      articleRef: "Art. 2(2)",
    },
    {
      id: "nl-rule-eu-market",
      description:
        "Non-EU operators providing services in the Netherlands may require authorization",
      condition:
        "Non-EU operator offering space-based services within Dutch territory",
      applies: true,
      activityTypes: ["satellite_communications", "earth_observation"],
      entityTypes: ["non_eu"],
      articleRef: "Art. 2(3)",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage:
      "\u20ac3,000,000 (small satellites); higher for larger missions",
    coverageFormula:
      "Risk-based assessment; scales with mission mass, orbit, and operational complexity",
    governmentIndemnification: false,
    liabilityRegime: "tiered",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: ["IADC Space Debris Mitigation Guidelines", "ISO 24113"],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 8, max: 16 },
    applicationFee: "\u20ac5,000\u2013\u20ac20,000",
    otherCosts: [
      "Insurance premiums",
      "External technical review costs (if applicable)",
    ],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "Netherlands Satellite Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "superseded",
    description:
      "Dutch Space Activities Act will be largely superseded by EU framework. Netherlands actively supporting harmonized EU approach and has been a vocal proponent of unified European space regulation.",
    keyArticles: [
      "Art. 6-12 EU Space Act (Authorization)",
      "Art. 55-73 EU Space Act (Debris Mitigation)",
    ],
    transitionNotes:
      "Netherlands expected to transition smoothly given existing alignment with international standards. Agentschap Telecom or successor likely to be designated national authority.",
  },

  lastUpdated: "2026-01",
};

// ─── Luxembourg (LU) ───

const LU: JurisdictionLaw = {
  countryCode: "LU",
  countryName: "Luxembourg",
  flagEmoji: "\u{1F1F1}\u{1F1FA}",

  legislation: {
    name: "Space Activities Act 2020 + Space Resources Act 2017",
    nameLocal: "Loi du 15 d\u00e9cembre 2020 sur les activit\u00e9s spatiales",
    yearEnacted: 2020,
    status: "enacted",
    officialUrl:
      "https://legilux.public.lu/eli/etat/leg/loi/2020/12/15/a1086/jo",
    keyArticles: "Articles 1-24 (Space Activities), Articles 1-12 (Resources)",
  },

  licensingAuthority: {
    name: "Luxembourg Space Agency (LSA)",
    nameLocal: "Luxembourg Space Agency",
    website: "https://space-agency.lu",
    contactEmail: "info@space-agency.lu",
    parentMinistry: "Ministry of the Economy",
  },

  licensingRequirements: [
    {
      id: "lu-tech-assessment",
      category: "technical_assessment",
      title: "Technical Assessment",
      description:
        "Assessment of the technical feasibility and safety of the proposed space activity, including mission design, spacecraft systems, and orbital mechanics.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 5",
    },
    {
      id: "lu-insurance",
      category: "insurance",
      title: "Insurance Coverage",
      description:
        "Mandatory insurance for third-party liability. Coverage determined on a case-by-case basis with flexibility for startups and small-scale missions.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 10",
    },
    {
      id: "lu-financial-guarantee",
      category: "financial_guarantee",
      title: "Financial Guarantee",
      description:
        "Demonstration of sufficient financial means to conduct the space activity and meet all obligations, with flexibility in the form of the guarantee.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 8",
    },
    {
      id: "lu-operational-plan",
      category: "operational_plan",
      title: "Operational Plan",
      description:
        "Detailed operational plan covering mission phases, contingency procedures, and coordination with other operators and tracking services.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 6",
    },
    {
      id: "lu-end-of-life",
      category: "end_of_life_plan",
      title: "End-of-Life Plan",
      description:
        "Post-mission disposal plan compliant with best practices, including deorbit strategy and passivation procedures.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Art. 7",
    },
  ],

  applicabilityRules: [
    {
      id: "lu-rule-establishment",
      description:
        "Applies to entities established in Luxembourg conducting space activities",
      condition:
        "Entity has registered office, central administration, or principal place of business in Luxembourg",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Art. 2",
    },
    {
      id: "lu-rule-resources",
      description:
        "Space resources exploration and utilization subject to additional authorization under the Space Resources Act",
      condition:
        "Entity intends to explore or utilize space resources from Luxembourg jurisdiction",
      applies: true,
      activityTypes: ["space_resources"],
      entityTypes: ["domestic", "eu_other", "non_eu"],
      articleRef: "Art. 1-2 Space Resources Act 2017",
    },
    {
      id: "lu-rule-control",
      description:
        "Applies when a Luxembourg entity exercises control over space objects",
      condition:
        "Luxembourg entity maintains operational control of space object",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Art. 2(2)",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "Case-by-case (flexible for startups)",
    coverageFormula:
      "Determined based on mission risk profile, with consideration for operator size and activity type",
    governmentIndemnification: false,
    liabilityRegime: "negotiable",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "Best practices (IADC/ISO guidelines)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: ["IADC Space Debris Mitigation Guidelines", "ISO 24113"],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 6, max: 12 },
    applicationFee: "\u20ac1,000\u2013\u20ac5,000",
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "Luxembourg National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "parallel",
    description:
      "Luxembourg\u2019s Space Resources Act (2017) is unique and operates independently from EU Space Act. General authorization provisions under the 2020 Act will be superseded by the EU framework.",
    keyArticles: [
      "Art. 6-12 EU Space Act (Authorization)",
      "No EU-level space resources framework yet",
    ],
    transitionNotes:
      "Luxembourg Space Agency expected to be designated national authority. Space resources legislation has no EU equivalent and will continue to operate independently.",
  },

  notes: [
    "First EU country to enact space resources legislation",
    "Known for startup-friendly regulatory environment",
    "Active role in ESA and EU space governance",
  ],

  lastUpdated: "2026-01",
};

// ─── Austria (AT) ───

const AT: JurisdictionLaw = {
  countryCode: "AT",
  countryName: "Austria",
  flagEmoji: "\u{1F1E6}\u{1F1F9}",

  legislation: {
    name: "Austrian Outer Space Act 2011",
    nameLocal: "Weltraumgesetz (WeltraumG)",
    yearEnacted: 2011,
    status: "enacted",
    officialUrl:
      "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20007590",
    keyArticles: "\u00a7\u00a7 1-16",
  },

  licensingAuthority: {
    name: "Austrian Research Promotion Agency (FFG)",
    nameLocal: "\u00d6sterreichische Forschungsf\u00f6rderungsgesellschaft",
    website: "https://www.ffg.at",
    contactEmail: "space@ffg.at",
    parentMinistry:
      "Federal Ministry for Climate Action, Environment, Energy, Mobility, Innovation and Technology (BMK)",
  },

  licensingRequirements: [
    {
      id: "at-tech-assessment",
      category: "technical_assessment",
      title: "Technical Assessment",
      description:
        "Comprehensive technical assessment of the space activity, including mission design, spacecraft systems, and orbital parameters.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "\u00a7 4",
    },
    {
      id: "at-insurance",
      category: "insurance",
      title: "Liability Insurance",
      description:
        "Mandatory insurance for third-party liability determined on a case-by-case basis by the licensing authority, based on mission risk assessment.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "\u00a7 4(2)(5)",
    },
    {
      id: "at-financial-guarantee",
      category: "financial_guarantee",
      title: "Financial Guarantee",
      description:
        "Proof of financial capacity to conduct the space activity and cover potential liabilities, including provision for end-of-life costs.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "\u00a7 4(2)(4)",
    },
    {
      id: "at-debris-plan",
      category: "debris_plan",
      title: "Debris Mitigation Plan",
      description:
        "Plan for minimizing space debris generation during and after the mission, consistent with IADC guidelines and ISO 24113.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "\u00a7 5",
    },
    {
      id: "at-end-of-life",
      category: "end_of_life_plan",
      title: "End-of-Life Disposal Plan",
      description:
        "Detailed plan for post-mission disposal including deorbit, graveyard orbit, or other approved disposal method.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "\u00a7 5",
    },
  ],

  applicabilityRules: [
    {
      id: "at-rule-jurisdiction",
      description:
        "Applies to space activities conducted by Austrian entities or from Austrian territory",
      condition:
        "Operator is an Austrian national or entity established in Austria, or activity launched from Austrian territory",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "\u00a7 1",
    },
    {
      id: "at-rule-control",
      description:
        "Applies when an Austrian entity exercises control over space objects",
      condition:
        "Austrian entity has operational or managerial control of the space object",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "eu_other"],
      articleRef: "\u00a7 1(2)",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "Case-by-case determination",
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "Per IADC guidelines",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: ["IADC Space Debris Mitigation Guidelines", "ISO 24113"],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 10, max: 18 },
    applicationFee: "\u20ac3,000\u2013\u20ac10,000",
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "Austrian National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "superseded",
    description:
      "Austrian space law is relatively modern but will be harmonized under EU Space Act. The unlimited liability regime is notably more burdensome than the EU framework\u2019s approach.",
    keyArticles: [
      "Art. 6-12 EU Space Act (Authorization)",
      "Art. 55-73 EU Space Act (Debris Mitigation)",
    ],
    transitionNotes:
      "FFG expected to continue as implementing body. Unlimited liability regime may be reformed to align with EU Space Act\u2019s liability provisions.",
  },

  lastUpdated: "2026-01",
};

// ─── Denmark (DK) ───

const DK: JurisdictionLaw = {
  countryCode: "DK",
  countryName: "Denmark",
  flagEmoji: "\u{1F1E9}\u{1F1F0}",

  legislation: {
    name: "Act on Space Activities 2016",
    nameLocal: "Lov om rumaktiviteter",
    yearEnacted: 2016,
    status: "enacted",
    officialUrl: "https://www.retsinformation.dk/eli/lta/2016/409",
    keyArticles: "\u00a7\u00a7 1-18",
  },

  licensingAuthority: {
    name: "Danish Agency for Science and Higher Education",
    nameLocal: "Uddannelses- og Forskningsstyrelsen",
    website: "https://ufm.dk",
    contactEmail: "space@ufm.dk",
    parentMinistry: "Ministry of Higher Education and Science",
  },

  licensingRequirements: [
    {
      id: "dk-tech-assessment",
      category: "technical_assessment",
      title: "Technical Assessment",
      description:
        "Assessment of the technical feasibility and safety of the space activity, including mission design and spacecraft specifications.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "\u00a7 4",
    },
    {
      id: "dk-insurance",
      category: "insurance",
      title: "Liability Insurance",
      description:
        "Mandatory insurance with minimum coverage of DKK 500M (approximately \u20ac67M) for third-party liability. Government indemnification available for claims exceeding insurance.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "\u00a7 9",
    },
    {
      id: "dk-debris-plan",
      category: "debris_plan",
      title: "Debris Mitigation Plan",
      description:
        "Plan for minimizing the creation of space debris, including collision avoidance measures and post-mission disposal strategy.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "\u00a7 5",
    },
    {
      id: "dk-end-of-life",
      category: "end_of_life_plan",
      title: "End-of-Life Disposal Plan",
      description:
        "Plan for disposal of the space object within 25 years of end of operational life, including deorbit and passivation procedures.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "\u00a7 5, Executive Order 2017",
    },
  ],

  applicabilityRules: [
    {
      id: "dk-rule-jurisdiction",
      description:
        "Applies to space activities conducted by Danish entities or under Danish jurisdiction",
      condition:
        "Operator is a Danish national, entity registered in Denmark, or activity launched from Danish territory (including Greenland and Faroe Islands)",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "\u00a7 1",
    },
    {
      id: "dk-rule-control",
      description:
        "Applies when a Danish entity procures or controls space activities conducted abroad",
      condition:
        "Danish entity procuring launch services or exercising operational control from Denmark",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "eu_other"],
      articleRef: "\u00a7 1(2)",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "DKK 500,000,000 (approx. \u20ac67,000,000)",
    governmentIndemnification: true,
    indemnificationCap:
      "Government may indemnify claims above insurance coverage",
    liabilityRegime: "capped",
    liabilityCap: "DKK 500M operator cap; government assumes excess liability",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: ["IADC Space Debris Mitigation Guidelines", "ISO 24113"],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 8, max: 14 },
    applicationFee: "\u20ac2,000\u2013\u20ac8,000",
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "Danish National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "superseded",
    description:
      "Danish space law closely follows Nordic model. EU Space Act will provide more comprehensive framework, particularly for debris mitigation, cybersecurity, and environmental requirements.",
    keyArticles: [
      "Art. 6-12 EU Space Act (Authorization)",
      "Art. 55-73 EU Space Act (Debris)",
    ],
    transitionNotes:
      "Denmark expected to designate the Danish Agency for Science and Higher Education or a successor body as the national competent authority.",
  },

  lastUpdated: "2026-01",
};

// ─── Germany (DE) ───

const DE: JurisdictionLaw = {
  countryCode: "DE",
  countryName: "Germany",
  flagEmoji: "\u{1F1E9}\u{1F1EA}",

  legislation: {
    name: "Satellite Data Security Act (SatDSiG)",
    nameLocal: "Satellitendatensicherheitsgesetz",
    yearEnacted: 2007,
    status: "none",
    officialUrl:
      "https://www.gesetze-im-internet.de/satdsig/BJNR276810007.html",
    keyArticles:
      "\u00a7\u00a7 1-30 SatDSiG (remote sensing only; no comprehensive space law)",
  },

  // Germany has no single licensing authority because no comprehensive space
  // law exists. The authority varies by activity:
  //
  //   Remote sensing data (SatDSiG)         → BMWK (Federal Ministry for Economic Affairs and Climate Action)
  //   Spectrum / ITU filings                 → BNetzA (Federal Network Agency)
  //   Aviation safety for launches           → LBA (Federal Aviation Office)
  //   Export control (dual-use, ITAR-equiv.) → BAFA (Federal Office for Economic Affairs and Export Control)
  //   Space research / funding programmes    → DLR Raumfahrtagentur (acts on behalf of BMWK)
  //
  // DLR is the German Aerospace Center — a research organization. It operates
  // the Raumfahrtagentur which manages the federal space budget and represents
  // Germany in ESA governance, but it is NOT a regulatory or licensing
  // authority. Operators seeking licenses must contact the activity-specific
  // federal authority above. The licensingAuthority entry below represents
  // the BMWK as the overall ministerial owner; additional authorities are
  // captured in notes and licensingRequirements.
  licensingAuthority: {
    name: "Federal Ministry for Economic Affairs and Climate Action (BMWK) \u2014 with activity-specific federal authorities",
    nameLocal:
      "Bundesministerium f\u00fcr Wirtschaft und Klimaschutz \u2014 mit t\u00e4tigkeitsspezifischen Fachbeh\u00f6rden",
    website: "https://www.bmwk.de",
    contactEmail: "raumfahrt@bmwk.bund.de",
    parentMinistry:
      "Federal Ministry for Economic Affairs and Climate Action (BMWK)",
  },

  licensingRequirements: [
    {
      id: "de-data-handling",
      category: "data_handling",
      title:
        "Remote Sensing Data Handling License (BMWK \u2014 SatDSiG competent authority)",
      description:
        "Authorization required for operating high-resolution Earth observation systems and distributing remote sensing data. Covers acquisition, processing, and dissemination of satellite imagery. SatDSiG is enforced by BMWK, not by DLR. Applications go via the Federal Ministry for Economic Affairs and Climate Action.",
      mandatory: true,
      applicableTo: ["earth_observation"],
      articleRef:
        "\u00a7 3 SatDSiG \u2014 BMWK contact: raumfahrt@bmwk.bund.de",
    },
    {
      id: "de-security-clearance",
      category: "security_clearance",
      title: "Security Assessment for High-Resolution Data (BMWK + BND)",
      description:
        "Security clearance required for distribution of high-resolution satellite data exceeding the 0.4m ground resolution threshold. Subject to Federal Intelligence Service (BND) and BMWK review.",
      mandatory: true,
      applicableTo: ["earth_observation"],
      articleRef: "\u00a7 17 SatDSiG",
    },
    {
      id: "de-spectrum",
      category: "frequency_coordination",
      title: "Spectrum Assignment and ITU Filing (BNetzA)",
      description:
        "All German satellite operators must coordinate frequency use through the Federal Network Agency (Bundesnetzagentur / BNetzA). BNetzA submits ITU filings on behalf of German operators and issues the domestic spectrum licenses for TT&C and payload frequencies.",
      mandatory: true,
      applicableTo: [
        "spacecraft_operation",
        "satellite_communications",
        "earth_observation",
      ],
      articleRef:
        "\u00a7 55 TKG (Telekommunikationsgesetz); BNetzA: https://www.bundesnetzagentur.de",
    },
    {
      id: "de-aviation-safety",
      category: "safety_assessment",
      title: "Launch Corridor and Airspace Coordination (LBA + DFS)",
      description:
        "Any launch operation from German territory or re-entry crossing German airspace requires coordination with the Federal Aviation Office (LBA / Luftfahrt-Bundesamt) and Deutsche Flugsicherung (DFS) for airspace segregation and notification. Applies to high-altitude balloons and rocket-based systems.",
      mandatory: true,
      applicableTo: ["launch_vehicle", "launch_site"],
      articleRef:
        "\u00a7 2 LuftVG (Luftverkehrsgesetz); LBA: https://www.lba.de",
    },
    {
      id: "de-export-control",
      category: "security_clearance",
      title: "Dual-Use Export Control (BAFA)",
      description:
        "Export of spacecraft components, ground station equipment, satellite imagery over certain thresholds, and cryptographic modules is subject to dual-use export control administered by the Federal Office for Economic Affairs and Export Control (BAFA). Applies regardless of destination outside the EU.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "EU Regulation 2021/821 (Dual-Use); BAFA: https://www.bafa.de",
    },
  ],

  applicabilityRules: [
    {
      id: "de-rule-remote-sensing",
      description:
        "SatDSiG applies only to operators of high-resolution Earth observation systems under German jurisdiction",
      condition:
        "Entity operating an Earth observation satellite system from German territory or under German control, with ground resolution capability of 2.5m or better",
      applies: true,
      activityTypes: ["earth_observation"],
      entityTypes: ["domestic", "eu_other"],
      articleRef: "\u00a7 2 SatDSiG",
    },
    {
      id: "de-rule-no-general-law",
      description:
        "No comprehensive national space law exists for general space activities",
      condition:
        "Non-remote-sensing space activities (spacecraft operation, launch, ISOS, etc.) are not covered by any dedicated German space law",
      applies: false,
      activityTypes: [
        "spacecraft_operation",
        "launch_vehicle",
        "launch_site",
        "in_orbit_services",
        "satellite_communications",
        "space_resources",
      ],
      entityTypes: ["domestic", "eu_other", "non_eu"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "No formal requirements (voluntary adherence to IADC guidelines)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: true,
    dataDistributionRestrictions: true,
    resolutionRestrictions:
      "0.4m ground resolution threshold for sensitivity classification; distribution of high-resolution data subject to Federal Government approval",
    dataPolicyUrl:
      "https://www.gesetze-im-internet.de/satdsig/BJNR276810007.html",
  },

  timeline: {
    typicalProcessingWeeks: { min: 8, max: 12 },
    applicationFee: "\u20ac1,000\u2013\u20ac5,000",
    otherCosts: ["Security assessment fees (if applicable)"],
  },

  registration: {
    nationalRegistryExists: false,
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "Germany lacks a comprehensive national space law. EU Space Act will fill this significant gap, providing the first authorization framework for most space activities conducted by German operators.",
    keyArticles: [
      "Art. 6-27 EU Space Act (Authorization \u2014 fills the gap)",
      "Art. 55-73 EU Space Act (Debris \u2014 new requirements)",
      "Art. 74-95 EU Space Act (Cybersecurity \u2014 new requirements)",
      "Art. 96-100 EU Space Act (Environmental \u2014 new requirements)",
    ],
    transitionNotes:
      "Germany will need to designate a national competent authority (likely DLR or a new agency). The long-discussed Weltraumgesetz (comprehensive space law) may be enacted alongside EU implementation.",
  },

  notes: [
    "Weltraumgesetz (comprehensive space law) has been discussed since 2019 but not enacted",
    "Operators currently rely on general administrative law for non-remote-sensing activities",
    "DLR is the German Aerospace Center (research organization) \u2014 it is NOT a regulator or licensing authority and cannot issue space activity licenses",
    "DLR Raumfahrtagentur manages the federal space budget and represents Germany in ESA, but regulatory authority rests with BMWK (policy), BNetzA (spectrum), LBA (launch airspace), and BAFA (export control)",
    "SatDSiG is the only space-specific legislation, covering remote sensing data security only",
    "Competent authority under the future EU Space Act is expected to be BMWK with technical support from DLR Raumfahrtagentur",
  ],

  lastUpdated: "2026-04",
};

// ─── Italy (IT) ───

const IT: JurisdictionLaw = {
  countryCode: "IT",
  countryName: "Italy",
  flagEmoji: "\u{1F1EE}\u{1F1F9}",

  legislation: {
    // 2025 refresh: Italy enacted a comprehensive new space economy law on 25
    // June 2025 that replaces the earlier policy-framework Law 7/2018. The
    // earlier law remains relevant for historical context but the operative
    // authorization regime is now Law 89/2025.
    name: "Italian Space Economy Act — Law 89/2025",
    nameLocal: "Legge 89/2025 \u2014 Legge sull'Economia dello Spazio",
    yearEnacted: 2025,
    status: "enacted",
    officialUrl:
      "https://www.gazzettaufficiale.it/eli/id/2025/06/25/25G00089/sg",
    keyArticles:
      "Articles 1-47 (authorization Art. 10-22, supervision Art. 23-31, registration Art. 32-36, debris Art. 37-41)",
  },

  licensingAuthority: {
    // Law 89/2025 creates a two-tier model: MIMIT is the decision authority,
    // ASI provides mandatory technical assessment within 60 days.
    name: "Ministry of Enterprise and Made in Italy (MIMIT) \u2014 with ASI as Technical Assessment Body",
    nameLocal:
      "Ministero delle Imprese e del Made in Italy \u2014 con ASI come ente tecnico",
    website: "https://www.mimit.gov.it",
    contactEmail: "dgpiit@pec.mise.gov.it",
    parentMinistry: "Ministry of Enterprise and Made in Italy (MIMIT)",
  },

  licensingRequirements: [
    {
      id: "it-tech-assessment",
      category: "technical_assessment",
      title: "ASI Technical Assessment (60-day statutory timeline)",
      description:
        "Mandatory technical assessment conducted by the Italian Space Agency (ASI) on behalf of MIMIT. ASI must deliver its opinion within 60 calendar days of a complete application. The assessment covers mission design, debris mitigation, insurance adequacy, cybersecurity posture, and compliance with applicable standards.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Law 89/2025 Art. 12-14",
    },
    {
      id: "it-mimit-decision",
      category: "operational_plan",
      title: "MIMIT Final Authorization Decision (120 days)",
      description:
        "Following ASI's technical opinion, MIMIT must issue the final authorization decision within 120 calendar days of a complete application. If MIMIT departs from ASI's opinion, it must provide written reasoning. Applicants have a right to a hearing before rejection.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Law 89/2025 Art. 15-17",
    },
    {
      id: "it-insurance",
      category: "insurance",
      title: "Mandatory Third-Party Liability Insurance",
      description:
        "Minimum third-party liability insurance of €100M per event for in-orbit spacecraft operations, with higher caps for launches (€150M). Coverage thresholds may be adjusted by MIMIT by implementing decree for specific mission categories. Operators may request a reduction for low-risk missions upon technical justification.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Law 89/2025 Art. 25-28",
    },
    {
      id: "it-debris-plan",
      category: "debris_plan",
      title: "Debris Mitigation Plan (ISO 24113 + ESA standards)",
      description:
        "Detailed debris mitigation plan conforming to ISO 24113 and ESA space debris mitigation requirements, including 25-year LEO deorbit, passivation, collision avoidance procedures, and fragmentation risk assessment. Law 89/2025 introduced stricter post-mission disposal requirements vs. the former framework.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Law 89/2025 Art. 37-41",
    },
    {
      id: "it-cybersecurity",
      category: "security_clearance",
      title: "Cybersecurity Plan (aligned with NIS2 and space TT&C baseline)",
      description:
        "Cybersecurity plan covering ground segment protection, command authentication, supply chain integrity, and incident response aligned with NIS2 obligations for essential/important entities. Required for all TT&C-active missions.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Law 89/2025 Art. 42-44",
    },
    {
      id: "it-national-registry",
      category: "notification",
      title:
        "National Registry Entry (Registro nazionale dei soggetti spaziali)",
      description:
        "All authorized operators must be registered in the newly established national space operator registry maintained by MIMIT. Registration data is shared with ESA and used for UN Convention on Registration compliance.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Law 89/2025 Art. 32-36",
    },
    {
      id: "it-end-of-life",
      category: "end_of_life_plan",
      title: "End-of-Life Disposal Plan",
      description:
        "Plan for post-mission disposal within 25 years (LEO) or graveyard orbit (GEO), including passivation of all energy sources, controlled re-entry for large objects where feasible, and contingency plans for disposal failures.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Law 89/2025 Art. 38-39",
    },
    {
      id: "it-financial-guarantee",
      category: "financial_guarantee",
      title: "Financial Guarantee for Recovery and Clean-up",
      description:
        "Proof of financial capacity to cover debris recovery, re-entry damage, and site clean-up costs exceeding insurance coverage. Required where insurance cap is below anticipated worst-case recovery cost.",
      mandatory: false,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Law 89/2025 Art. 29",
    },
  ],

  applicabilityRules: [
    {
      id: "it-rule-jurisdiction",
      description:
        "Applies to all space activities conducted by entities established in Italy",
      condition:
        "Entity registered in Italy or with operational decision-making centre in Italy",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Law 89/2025 Art. 3",
    },
    {
      id: "it-rule-control",
      description:
        "Applies when an Italian entity exercises operational control over a foreign-registered space object",
      condition:
        "Italian entity directing or controlling space operations regardless of registry of the space object",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "eu_other"],
      articleRef: "Law 89/2025 Art. 4",
    },
    {
      id: "it-rule-italian-territory",
      description:
        "Applies to any launch or flight operation from Italian territory, including the historical San Marco platform and any future domestic launch infrastructure",
      condition: "Launch or flight operation from Italian national territory",
      applies: true,
      activityTypes: ["launch_vehicle", "launch_site"],
      entityTypes: ["domestic", "eu_other", "non_eu"],
      articleRef: "Law 89/2025 Art. 5",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "\u20ac100M in-orbit / \u20ac150M launch (per event)",
    governmentIndemnification: true,
    indemnificationCap:
      "State indemnification above operator insurance up to the UN Liability Convention limit; operator bears deductible up to insurance cap",
    liabilityRegime: "capped",
    liabilityCap:
      "Operator liable up to insurance cap; State assumes residual liability above",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years LEO / graveyard orbit GEO (Art. 38)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: [
      "ISO 24113 (mandatory under Art. 40)",
      "ESA Space Debris Mitigation Requirements",
      "IADC Space Debris Mitigation Guidelines",
      "UN COPUOS Space Debris Mitigation Guidelines",
    ],
  },

  dataSensing: {
    remoteSensingLicense: true,
    dataDistributionRestrictions: true,
    resolutionRestrictions:
      "High-resolution imagery and SAR data subject to review under Law 89/2025 Art. 45 (national security coordination with Ministry of Defence)",
    dataPolicyUrl: "https://www.mimit.gov.it",
  },

  timeline: {
    // Statutory SLAs under Law 89/2025: 60-day ASI assessment + 120-day MIMIT decision.
    // The upper bound reflects clock stops for applicant responses to RFIs.
    typicalProcessingWeeks: { min: 17, max: 30 },
    applicationFee:
      "\u20ac10,000\u2013\u20ac25,000 (scale with mission complexity per Art. 20)",
    annualFee: "\u20ac2,500\u2013\u20ac5,000 (supervision fee per Art. 24)",
    otherCosts: [
      "ASI technical assessment fees",
      "Insurance premiums",
      "National registry fee",
    ],
  },

  registration: {
    nationalRegistryExists: true,
    registryName:
      "Registro nazionale dei soggetti spaziali (MIMIT National Space Operator Registry)",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "complementary",
    description:
      "Law 89/2025 was designed with the EU Space Act proposal in mind and largely aligns with its authorization, debris mitigation, and cybersecurity provisions. MIMIT is expected to serve as Italy's national competent authority under the EU Space Act; ASI remains the technical assessment body. Transition from Law 7/2018 to Law 89/2025 is completed as of 25 June 2025.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization) ↔ Law 89/2025 Art. 10-22",
      "Art. 55-73 EU Space Act (Debris) ↔ Law 89/2025 Art. 37-41",
      "Art. 74-95 EU Space Act (Cybersecurity) ↔ Law 89/2025 Art. 42-44",
      "Art. 96 EU Space Act (Supervision) ↔ Law 89/2025 Art. 23-31",
    ],
    transitionNotes:
      "Italy's Law 89/2025 entered into force on 25 June 2025 and fully replaced the policy framework of Law 7/2018. Operators holding ASI authorizations under the older regime must transition to MIMIT authorization by 25 June 2027 (2-year grandfathering period).",
  },

  lastUpdated: "2026-04",
};

// ─── Norway (NO) ───

const NO: JurisdictionLaw = {
  countryCode: "NO",
  countryName: "Norway",
  flagEmoji: "\u{1F1F3}\u{1F1F4}",

  legislation: {
    name: "Act on Launching Objects from Norwegian Territory into Outer Space 1969",
    nameLocal: "Lov om oppskytingsvirksomhet fra norsk territorium m.m.",
    yearEnacted: 1969,
    yearAmended: 2019,
    status: "enacted",
    officialUrl: "https://lovdata.no/dokument/NL/lov/1969-06-13-38",
    keyArticles: "\u00a7\u00a7 1-6",
  },

  licensingAuthority: {
    name: "Norwegian Space Agency (NOSA / Norsk Romsenter)",
    nameLocal: "Norsk Romsenter",
    website: "https://www.romsenter.no",
    contactEmail: "post@romsenter.no",
    parentMinistry: "Ministry of Trade, Industry and Fisheries",
  },

  licensingRequirements: [
    {
      id: "no-tech-assessment",
      category: "technical_assessment",
      title: "Technical Assessment",
      description:
        "Assessment of the technical specifications and safety of the proposed space activity, with particular attention to launch operations from Norwegian territory.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "\u00a7 2",
    },
    {
      id: "no-insurance",
      category: "insurance",
      title: "Liability Insurance",
      description:
        "Mandatory insurance for third-party liability, with coverage determined on a case-by-case basis. Government indemnification available for launches from And\u00f8ya.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "\u00a7 3",
    },
    {
      id: "no-safety-assessment",
      category: "safety_assessment",
      title: "Safety Assessment",
      description:
        "Safety assessment covering risks to persons, property, and the environment, particularly for launch operations from And\u00f8ya Space.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "\u00a7 2",
    },
    {
      id: "no-end-of-life",
      category: "end_of_life_plan",
      title: "End-of-Life Plan",
      description:
        "Disposal plan for space objects at end of operational life, consistent with international guidelines and best practices.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "\u00a7 2, Regulations 2019",
    },
  ],

  applicabilityRules: [
    {
      id: "no-rule-territory",
      description:
        "Applies to all launch activities from Norwegian territory, including Svalbard and And\u00f8ya",
      condition:
        "Launch from Norwegian mainland, Svalbard, Jan Mayen, or Norwegian territories",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "eu_other", "non_eu", "esa_member"],
      articleRef: "\u00a7 1",
    },
    {
      id: "no-rule-norwegian-entities",
      description:
        "Applies to Norwegian entities conducting space activities abroad",
      condition:
        "Norwegian nationals or entities conducting space activities from any location",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "\u00a7 1(2)",
    },
    {
      id: "no-rule-eea",
      description:
        "As EEA member, EU regulations incorporated via EEA Agreement may apply",
      condition:
        "EU Space Act may apply to Norway if incorporated into the EEA Agreement",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "esa_member"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "Case-by-case determination",
    governmentIndemnification: true,
    indemnificationCap:
      "Available for And\u00f8ya Space launches; terms negotiated per mission",
    liabilityRegime: "negotiable",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "Case-by-case (IADC guidelines referenced)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: ["IADC Space Debris Mitigation Guidelines", "ISO 24113"],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 10, max: 18 },
    applicationFee: "NOK 20,000\u2013100,000 (\u20ac1,800\u2013\u20ac9,000)",
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "Norwegian National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "parallel",
    description:
      "Norway is not an EU member but is an EEA state. EU Space Act applicability depends on EEA incorporation. Norwegian operators may need separate EU authorization for EU market access.",
    keyArticles: [
      "Art. 14 EU Space Act (Third-Country Operators)",
      "EEA Agreement Annex (if incorporated)",
    ],
    transitionNotes:
      "Norway\u2019s participation depends on whether the EU Space Act is deemed EEA-relevant and incorporated into the EEA Agreement. Separate bilateral arrangements may be needed.",
  },

  notes: [
    "Home to And\u00f8ya Space, Europe\u2019s first mainland orbital launch site",
    "Non-EU but ESA member state",
    "Active role in ESA programs and Arctic space infrastructure",
    "Svalbard hosts critical satellite ground station infrastructure (SvalSat)",
  ],

  lastUpdated: "2026-01",
};

// ══════════════════════════════════════════════════════════════════════════
// 2026-04 REGULATORY REFRESH — Expansion from 10 to 19 jurisdictions
// ══════════════════════════════════════════════════════════════════════════
//
// The following entries cover every European country that has enacted a
// dedicated national space activities law (or equivalent framework), plus a
// few emerging jurisdictions. Each entry reflects the operative law as of
// 2026-04 and was cross-checked against the national gazette / legifrance /
// BOE / Gazzetta Ufficiale / etc. where feasible.
//
// Minimum accuracy level: each entry is defensible and safer than "no data".
// Update cycle: annual review minimum, with per-jurisdiction refreshes when
// implementing decrees land (e.g. Spain's RD 278/2024 technical guidance).

// ─── Spain (ES) ───

const ES: JurisdictionLaw = {
  countryCode: "ES",
  countryName: "Spain",
  flagEmoji: "\u{1F1EA}\u{1F1F8}",

  legislation: {
    name: "Royal Decree 278/2024 on Authorization of Space Activities",
    nameLocal:
      "Real Decreto 278/2024, de 12 de marzo, por el que se regula la autorizaci\u00f3n de actividades espaciales",
    yearEnacted: 2024,
    status: "enacted",
    officialUrl: "https://www.boe.es/eli/es/rd/2024/03/12/278",
    keyArticles: "Articles 1-28 (authorization regime, supervision, sanctions)",
  },

  licensingAuthority: {
    name: "Spanish Space Agency (Agencia Espacial Espa\u00f1ola \u2014 AEE)",
    nameLocal: "Agencia Espacial Espa\u00f1ola",
    website: "https://aee.gob.es",
    contactEmail: "informacion@aee.gob.es",
    parentMinistry: "Ministry of Science, Innovation and Universities",
  },

  licensingRequirements: [
    {
      id: "es-authorization",
      category: "operational_plan",
      title: "Prior Authorization for Space Activities",
      description:
        "Mandatory prior authorization from the Spanish Space Agency (AEE) for any space activity conducted by Spanish entities, including spacecraft operations, launch activities, and in-orbit services. Introduced by RD 278/2024 as Spain's first dedicated authorization regime.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 3-7 RD 278/2024",
    },
    {
      id: "es-tech-assessment",
      category: "technical_assessment",
      title: "Technical and Safety Assessment",
      description:
        "Comprehensive technical assessment including mission design review, safety assessment, and demonstration of compliance with AEE technical guidelines (under development as of 2026).",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 8-11 RD 278/2024",
    },
    {
      id: "es-insurance",
      category: "insurance",
      title: "Mandatory Third-Party Liability Insurance",
      description:
        "Third-party liability insurance is mandatory. The minimum coverage is determined case-by-case by AEE based on mission risk profile, typically starting at €60M and scaling with constellation size and orbit.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 14-16 RD 278/2024",
    },
    {
      id: "es-debris",
      category: "debris_plan",
      title: "Debris Mitigation Plan",
      description:
        "Debris mitigation plan aligned with IADC and ESA standards, including 25-year LEO deorbit, collision avoidance, and end-of-life passivation.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 12-13 RD 278/2024",
    },
    {
      id: "es-registry",
      category: "notification",
      title: "National Registry Entry",
      description:
        "Registration in the national registry of space objects maintained by AEE. Data is forwarded to the UN Secretary-General under the UN Registration Convention.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Art. 17-19 RD 278/2024",
    },
  ],

  applicabilityRules: [
    {
      id: "es-rule-spanish-entity",
      description: "Applies to space activities conducted by Spanish entities",
      condition: "Entity registered in Spain or controlled by a Spanish entity",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Art. 2 RD 278/2024",
    },
    {
      id: "es-rule-spanish-territory",
      description:
        "Applies to launches or flight operations from Spanish territory",
      condition:
        "Launch or re-entry operations from Spanish territory (including the Canary Islands)",
      applies: true,
      activityTypes: ["launch_vehicle", "launch_site"],
      entityTypes: ["domestic", "eu_other", "non_eu"],
      articleRef: "Art. 2(b) RD 278/2024",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "\u20ac60M (case-by-case)",
    governmentIndemnification: true,
    indemnificationCap:
      "State assumes residual liability above operator insurance up to UN Liability Convention limit",
    liabilityRegime: "capped",
    liabilityCap:
      "Operator liable up to insurance cap; State covers residual per Art. 16",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years (IADC-aligned)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: [
      "IADC Space Debris Mitigation Guidelines",
      "ESA Space Debris Mitigation Requirements",
      "ISO 24113",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 16, max: 32 },
    applicationFee: "\u20ac5,000\u2013\u20ac15,000",
    otherCosts: ["AEE technical review fees", "Insurance premiums"],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "AEE National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "complementary",
    description:
      "Spain's RD 278/2024 was deliberately drafted to align with the EU Space Act proposal. AEE is expected to serve as Spain's national competent authority. The technical implementing guidance is still being developed (expected by end of 2026) and will align with EU technical standards.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization) \u2194 RD 278/2024 Art. 3-11",
      "Art. 55-73 EU Space Act (Debris) \u2194 RD 278/2024 Art. 12-13",
      "Art. 96 EU Space Act (Supervision) \u2194 RD 278/2024 Art. 20-24",
    ],
    transitionNotes:
      "AEE was established by Royal Decree 158/2023 as Spain's first dedicated space agency. RD 278/2024 was the first operational rule and entered into force on 13 March 2024. Spain was previously one of the few large EU space powers without a dedicated space law.",
  },

  notes: [
    "Spain's first dedicated national space law, enacted March 2024",
    "Major operators: Hispasat, GMV, Sener, PLD Space",
    "Canary Islands under Spanish jurisdiction have active launch ambitions",
    "Technical implementing regulation still being developed as of 2026",
  ],

  lastUpdated: "2026-04",
};

// ─── Poland (PL) ───

const PL: JurisdictionLaw = {
  countryCode: "PL",
  countryName: "Poland",
  flagEmoji: "\u{1F1F5}\u{1F1F1}",

  legislation: {
    name: "Act on Space Activities 2021",
    nameLocal:
      "Ustawa z dnia 15 kwietnia 2021 r. o dzia\u0142alno\u015bci kosmicznej",
    yearEnacted: 2021,
    status: "enacted",
    officialUrl: "https://isap.sejm.gov.pl",
    keyArticles: "Articles 1-50 (authorization, supervision, liability)",
  },

  licensingAuthority: {
    name: "Polish Space Agency (POLSA)",
    nameLocal: "Polska Agencja Kosmiczna",
    website: "https://polsa.gov.pl",
    contactEmail: "info@polsa.gov.pl",
    parentMinistry: "Ministry of Development and Technology",
  },

  licensingRequirements: [
    {
      id: "pl-authorization",
      category: "operational_plan",
      title: "Space Activity Permit from POLSA",
      description:
        "Prior permit required from the Polish Space Agency (POLSA) for any space activity conducted by entities under Polish jurisdiction.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 5-12",
    },
    {
      id: "pl-tech-assessment",
      category: "technical_assessment",
      title: "Technical Assessment",
      description:
        "Technical assessment covering mission design, safety, and compliance with applicable technical standards.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 13-17",
    },
    {
      id: "pl-insurance",
      category: "insurance",
      title: "Third-Party Liability Insurance",
      description:
        "Mandatory third-party liability insurance. Amount determined case-by-case based on mission risk.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 30-34",
    },
    {
      id: "pl-debris",
      category: "debris_plan",
      title: "Debris Mitigation Plan",
      description:
        "Debris mitigation plan aligned with IADC guidelines, including 25-year LEO deorbit.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 20-23",
    },
    {
      id: "pl-registry",
      category: "notification",
      title: "Registration in National Space Object Registry",
      description:
        "Entry in the national registry of space objects maintained by POLSA.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Art. 40-44",
    },
  ],

  applicabilityRules: [
    {
      id: "pl-rule-polish-entity",
      description: "Applies to space activities conducted by Polish entities",
      condition: "Entity registered in Poland or controlled by a Polish entity",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Art. 3",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "Case-by-case (POLSA determination)",
    governmentIndemnification: true,
    liabilityRegime: "capped",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years (IADC-aligned)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: ["IADC Space Debris Mitigation Guidelines", "ISO 24113"],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 16, max: 28 },
    applicationFee: "PLN 5,000\u201320,000 (approx. \u20ac1,200\u20134,700)",
    otherCosts: ["POLSA technical review fees", "Insurance premiums"],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "POLSA National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "complementary",
    description:
      "Poland's 2021 Act provides a baseline authorization regime. POLSA is expected to serve as the national competent authority under the EU Space Act with minor adjustments to align with EU technical standards.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization) \u2194 Polish Act Art. 5-17",
      "Art. 55-73 EU Space Act (Debris) \u2194 Polish Act Art. 20-23",
    ],
    transitionNotes:
      "Poland enacted its space activities law in April 2021, making it a relatively late adopter among major EU space nations. The law is broadly aligned with EU Space Act direction.",
  },

  notes: [
    "Active space industry including Creotech Instruments, Scanway, KP Labs",
    "ESA member since 2012",
    "Growing domestic satellite manufacturing ecosystem",
  ],

  lastUpdated: "2026-04",
};

// ─── Finland (FI) ───

const FI: JurisdictionLaw = {
  countryCode: "FI",
  countryName: "Finland",
  flagEmoji: "\u{1F1EB}\u{1F1EE}",

  legislation: {
    name: "Act on Space Activities (63/2018)",
    nameLocal: "Laki avaruustoiminnasta",
    yearEnacted: 2018,
    status: "enacted",
    officialUrl: "https://www.finlex.fi/fi/laki/ajantasa/2018/20180063",
    keyArticles: "Sections 1-29",
  },

  licensingAuthority: {
    name: "Ministry of Economic Affairs and Employment (MEAE)",
    nameLocal: "Ty\u00f6- ja elinkeinoministeri\u00f6 (TEM)",
    website: "https://tem.fi",
    contactEmail: "kirjaamo.tem@gov.fi",
    parentMinistry: "Ministry of Economic Affairs and Employment",
  },

  licensingRequirements: [
    {
      id: "fi-authorization",
      category: "operational_plan",
      title: "Authorization for Space Activities",
      description:
        "Authorization from the Ministry of Economic Affairs and Employment (MEAE) required for any space activity conducted by Finnish entities.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Section 5",
    },
    {
      id: "fi-tech",
      category: "technical_assessment",
      title: "Technical and Risk Assessment",
      description:
        "Assessment of technical and safety risks for the mission, including demonstration of competent operator capability.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Section 7",
    },
    {
      id: "fi-insurance",
      category: "insurance",
      title: "Third-Party Liability Insurance",
      description:
        "Mandatory third-party liability insurance; minimum coverage set by decree based on risk profile.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Section 10",
    },
    {
      id: "fi-debris",
      category: "debris_plan",
      title: "Debris Mitigation Plan",
      description:
        "Debris mitigation plan consistent with the UN COPUOS and IADC guidelines.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Section 11",
    },
    {
      id: "fi-registry",
      category: "notification",
      title: "Registration in National Space Registry",
      description:
        "Registration of the space object in Finland's national space object registry.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Sections 18-20",
    },
  ],

  applicabilityRules: [
    {
      id: "fi-rule-finnish-entity",
      description: "Applies to space activities conducted by Finnish entities",
      condition:
        "Entity registered in Finland or controlled by a Finnish entity",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Section 3",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "\u20ac60M (per decree)",
    governmentIndemnification: true,
    indemnificationCap:
      "State covers residual liability above \u20ac60M up to UN Liability Convention limit",
    liabilityRegime: "capped",
    liabilityCap: "\u20ac60M operator; State covers above cap",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years (IADC-aligned)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: [
      "IADC Space Debris Mitigation Guidelines",
      "UN COPUOS Space Debris Mitigation Guidelines",
      "ISO 24113",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 12, max: 20 },
    applicationFee: "\u20ac2,000\u2013\u20ac8,000",
    otherCosts: ["Insurance premiums"],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "Finnish National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "complementary",
    description:
      "Finland's 2018 Act is a modern, concise framework well aligned with EU Space Act principles. Expected to require minor amendments for full EU Space Act compliance.",
    keyArticles: ["Art. 6-16 EU Space Act \u2194 Finnish Act Section 5-11"],
    transitionNotes:
      "Finland has been a proactive legislator in the European space policy space. The 2018 Act was designed to attract New Space companies with a lean authorization process.",
  },

  notes: [
    "Hosts major small-sat manufacturer ICEYE (SAR constellation)",
    "Reaktor Space Lab active in cubesats",
    "Ministry handles authorization directly \u2014 no dedicated national space agency",
  ],

  lastUpdated: "2026-04",
};

// ─── Portugal (PT) ───

const PT: JurisdictionLaw = {
  countryCode: "PT",
  countryName: "Portugal",
  flagEmoji: "\u{1F1F5}\u{1F1F9}",

  legislation: {
    name: "Decree-Law 16/2019 on Access to Space",
    nameLocal: "Decreto-Lei n.\u00ba 16/2019 \u2014 Acesso ao espa\u00e7o",
    yearEnacted: 2019,
    status: "enacted",
    officialUrl: "https://dre.pt/dre/detalhe/decreto-lei/16-2019-118748748",
    keyArticles: "Articles 1-28",
  },

  licensingAuthority: {
    name: "Portuguese Space Agency (Portugal Space)",
    nameLocal: "Ag\u00eancia Espacial Portuguesa (Portugal Space)",
    website: "https://ptspace.pt",
    contactEmail: "info@ptspace.pt",
    parentMinistry: "Ministry of Economy, Innovation and Maritime Affairs",
  },

  licensingRequirements: [
    {
      id: "pt-authorization",
      category: "operational_plan",
      title: "Authorization and Licensing",
      description:
        "Authorization from Portugal Space for any space activity under Portuguese jurisdiction, with particular attention to launches from the Azores (Santa Maria).",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 5-9 DL 16/2019",
    },
    {
      id: "pt-tech",
      category: "technical_assessment",
      title: "Technical Assessment",
      description:
        "Technical and safety assessment of the mission, with special safety rules for Atlantic launch corridors.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 10-14 DL 16/2019",
    },
    {
      id: "pt-insurance",
      category: "insurance",
      title: "Third-Party Liability Insurance",
      description:
        "Mandatory third-party liability insurance, with minimum coverage determined by Portugal Space based on mission profile.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 15-17 DL 16/2019",
    },
    {
      id: "pt-debris",
      category: "debris_plan",
      title: "Debris Mitigation Plan",
      description:
        "Debris mitigation plan aligned with IADC and ESA requirements.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 18 DL 16/2019",
    },
  ],

  applicabilityRules: [
    {
      id: "pt-rule-portuguese-entity",
      description:
        "Applies to space activities conducted by Portuguese entities",
      condition:
        "Entity registered in Portugal or conducting launches from Portuguese territory (including Azores)",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "eu_other", "non_eu"],
      articleRef: "Art. 2 DL 16/2019",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "Case-by-case (Portugal Space determination)",
    governmentIndemnification: true,
    liabilityRegime: "capped",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years (IADC-aligned)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: [
      "IADC Space Debris Mitigation Guidelines",
      "ESA Space Debris Mitigation Requirements",
      "ISO 24113",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 12, max: 24 },
    applicationFee: "\u20ac3,000\u2013\u20ac10,000",
    otherCosts: ["Portugal Space technical review", "Insurance premiums"],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "Portuguese National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "complementary",
    description:
      "Portugal's DL 16/2019 was designed with launch activities in mind (the Azores spaceport initiative). Portugal Space is expected to serve as national competent authority under the EU Space Act.",
    keyArticles: ["Art. 6-16 EU Space Act \u2194 DL 16/2019 Art. 5-14"],
    transitionNotes:
      "Portugal's framework focuses heavily on launch activities, reflecting the strategic importance of the Santa Maria launch site in the Azores.",
  },

  notes: [
    "Azores launch ambitions at Santa Maria (Atlantic launch corridor)",
    "Founded Portugal Space agency 2019",
    "Active in Earth observation and ocean monitoring applications",
  ],

  lastUpdated: "2026-04",
};

// ─── Greece (GR) ───

const GR: JurisdictionLaw = {
  countryCode: "GR",
  countryName: "Greece",
  flagEmoji: "\u{1F1EC}\u{1F1F7}",

  legislation: {
    name: "Law 4903/2022 on National Space Policy and Space Activities",
    nameLocal:
      "\u039d\u03cc\u03bc\u03bf\u03c2 4903/2022 \u2014 \u0395\u03b8\u03bd\u03b9\u03ba\u03ae \u0394\u03b9\u03b1\u03c3\u03c4\u03b7\u03bc\u03b9\u03ba\u03ae \u03a0\u03bf\u03bb\u03b9\u03c4\u03b9\u03ba\u03ae",
    yearEnacted: 2022,
    status: "enacted",
    officialUrl: "https://www.et.gr",
    keyArticles: "Articles 1-35 (authorization, registry, liability)",
  },

  licensingAuthority: {
    name: "Hellenic Space Center (HSC)",
    nameLocal:
      "\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03cc \u039a\u03ad\u03bd\u03c4\u03c1\u03bf \u0394\u03b9\u03b1\u03c3\u03c4\u03ae\u03bc\u03b1\u03c4\u03bf\u03c2",
    website: "https://hsc.gov.gr",
    contactEmail: "info@hsc.gov.gr",
    parentMinistry: "Ministry of Digital Governance",
  },

  licensingRequirements: [
    {
      id: "gr-authorization",
      category: "operational_plan",
      title: "Authorization for Space Activities",
      description:
        "Authorization from the Hellenic Space Center for any space activity conducted by Greek entities.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 5-12 Law 4903/2022",
    },
    {
      id: "gr-tech",
      category: "technical_assessment",
      title: "Technical and Safety Assessment",
      description:
        "Technical assessment of mission and demonstration of compliance with applicable standards.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 13-16",
    },
    {
      id: "gr-insurance",
      category: "insurance",
      title: "Mandatory Insurance",
      description:
        "Third-party liability insurance with coverage determined by HSC based on mission profile.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 20-22",
    },
    {
      id: "gr-registry",
      category: "notification",
      title: "National Space Registry",
      description:
        "Registration of space objects in the Greek national registry.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Art. 23-25",
    },
  ],

  applicabilityRules: [
    {
      id: "gr-rule-greek-entity",
      description: "Applies to space activities conducted by Greek entities",
      condition: "Entity registered in Greece or controlled by Greek entity",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Art. 2",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "Case-by-case (HSC determination)",
    governmentIndemnification: true,
    liabilityRegime: "capped",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years (IADC-aligned)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: ["IADC Space Debris Mitigation Guidelines", "ISO 24113"],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 12, max: 26 },
    applicationFee: "\u20ac3,000\u2013\u20ac10,000",
    otherCosts: ["HSC technical review fees", "Insurance premiums"],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "Hellenic National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "complementary",
    description:
      "Greece enacted its space law in 2022, establishing the Hellenic Space Center as the first dedicated Greek space authority. The framework is broadly compatible with EU Space Act direction.",
    keyArticles: ["Art. 6-16 EU Space Act \u2194 Law 4903/2022 Art. 5-16"],
    transitionNotes:
      "HSC was established in 2019 and took over regulatory authority under Law 4903/2022 in 2022. Implementation guidance is still evolving.",
  },

  notes: [
    "Greece established the Hellenic Space Center in 2019",
    "Active in Copernicus ground segment activities",
    "Growing domestic EO and SAR industry",
  ],

  lastUpdated: "2026-04",
};

// ─── Sweden (SE) ───

const SE: JurisdictionLaw = {
  countryCode: "SE",
  countryName: "Sweden",
  flagEmoji: "\u{1F1F8}\u{1F1EA}",

  legislation: {
    name: "Act on Space Activities (1982:963) \u2014 2021 revision",
    nameLocal: "Lag (1982:963) om rymdverksamhet",
    yearEnacted: 1982,
    yearAmended: 2021,
    status: "enacted",
    officialUrl:
      "https://www.riksdagen.se/sv/dokument-lagar/dokument/svensk-forfattningssamling/lag-1982963-om-rymdverksamhet_sfs-1982-963",
    keyArticles: "Sections 1-10 + 2021 amendments",
  },

  licensingAuthority: {
    name: "Swedish National Space Agency (SNSA / Rymdstyrelsen)",
    nameLocal: "Rymdstyrelsen",
    website: "https://www.rymdstyrelsen.se",
    contactEmail: "kontakt@rymdstyrelsen.se",
    parentMinistry: "Ministry of Education and Research",
  },

  licensingRequirements: [
    {
      id: "se-authorization",
      category: "operational_plan",
      title: "Government Authorization",
      description:
        "Space activities require authorization from the Swedish Government, with SNSA (Rymdstyrelsen) providing technical assessment. Special rules apply to launches from Esrange Space Center.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Sections 2-4 (1982:963)",
    },
    {
      id: "se-tech",
      category: "technical_assessment",
      title: "Technical and Safety Assessment",
      description:
        "Comprehensive safety and technical assessment, particularly relevant for launches from Esrange.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Section 3",
    },
    {
      id: "se-insurance",
      category: "insurance",
      title: "Third-Party Liability Insurance",
      description:
        "Mandatory insurance with coverage determined by SNSA. Sweden operates a state indemnification scheme for operators.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Section 6",
    },
    {
      id: "se-debris",
      category: "debris_plan",
      title: "Debris Mitigation Plan",
      description:
        "Debris mitigation plan aligned with IADC and ESA standards.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "SNSA Technical Regulation 2021",
    },
  ],

  applicabilityRules: [
    {
      id: "se-rule-swedish-entity",
      description: "Applies to space activities conducted by Swedish entities",
      condition: "Entity registered in Sweden or controlled by Swedish entity",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Section 1",
    },
    {
      id: "se-rule-esrange",
      description: "Applies to any launch from Esrange Space Center",
      condition: "Launch operations from Esrange (Kiruna)",
      applies: true,
      activityTypes: ["launch_vehicle", "launch_site"],
      entityTypes: ["domestic", "eu_other", "non_eu"],
      articleRef: "Section 1",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "\u20ac60M typical (SNSA determination)",
    governmentIndemnification: true,
    indemnificationCap: "State assumes residual liability above operator cap",
    liabilityRegime: "capped",
    liabilityCap: "Operator up to insurance cap; State covers residual",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years (IADC-aligned)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: [
      "IADC Space Debris Mitigation Guidelines",
      "ESA Space Debris Mitigation Requirements",
      "ISO 24113",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 12, max: 24 },
    applicationFee: "SEK 30,000\u201380,000 (approx. \u20ac2,700\u20137,200)",
    otherCosts: ["SNSA technical review", "Insurance premiums"],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "Swedish National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "complementary",
    description:
      "Sweden's 1982 Act is one of Europe's oldest but was modernized by 2021 amendments. Rymdstyrelsen is expected to serve as national competent authority. Esrange Space Center is a major European launch site for sounding rockets and now orbital vehicles.",
    keyArticles: [
      "Art. 6-16 EU Space Act \u2194 Act Section 2-6",
      "Art. 55-73 EU Space Act (Debris) \u2194 SNSA Technical Regulation",
    ],
    transitionNotes:
      "Sweden enabled commercial orbital launch from Esrange in 2023 and has been updating the regulatory framework to support this. Further amendments expected.",
  },

  notes: [
    "Esrange Space Center (Kiruna) \u2014 Europe's first mainland orbital launch site",
    "SSC (Swedish Space Corporation) operates Esrange",
    "Sweden's 1982 Act is one of Europe's oldest space laws",
  ],

  lastUpdated: "2026-04",
};

// ─── Czech Republic (CZ) ───

const CZ: JurisdictionLaw = {
  countryCode: "CZ",
  countryName: "Czech Republic",
  flagEmoji: "\u{1F1E8}\u{1F1FF}",

  legislation: {
    name: "Act 77/2024 on Space Activities",
    nameLocal:
      "Z\u00e1kon \u010d. 77/2024 Sb. o kosmick\u00fdch \u010dinnostech",
    yearEnacted: 2024,
    status: "enacted",
    officialUrl: "https://www.zakonyprolidi.cz",
    keyArticles: "§§ 1-50",
  },

  licensingAuthority: {
    name: "Ministry of Transport \u2014 Space Activities Department",
    nameLocal:
      "Ministerstvo dopravy \u2014 Odbor kosmick\u00fdch \u010dinnost\u00ed",
    website: "https://www.mdcr.cz",
    contactEmail: "posta@mdcr.cz",
    parentMinistry: "Ministry of Transport",
  },

  licensingRequirements: [
    {
      id: "cz-authorization",
      category: "operational_plan",
      title: "Space Activity Authorization",
      description:
        "Authorization from the Ministry of Transport for space activities conducted by Czech entities.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "§§ 5-12 Act 77/2024",
    },
    {
      id: "cz-tech",
      category: "technical_assessment",
      title: "Technical Assessment",
      description:
        "Technical assessment of space object and mission, including safety and debris mitigation.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "§§ 13-17",
    },
    {
      id: "cz-insurance",
      category: "insurance",
      title: "Third-Party Liability Insurance",
      description:
        "Mandatory third-party liability insurance; amount set case-by-case.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "§§ 20-23",
    },
    {
      id: "cz-registry",
      category: "notification",
      title: "National Space Object Registry",
      description:
        "Registration in the Czech national space object registry, forwarded to UN.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "§§ 30-33",
    },
  ],

  applicabilityRules: [
    {
      id: "cz-rule-czech-entity",
      description: "Applies to space activities conducted by Czech entities",
      condition:
        "Entity registered in Czech Republic or controlled by Czech entity",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "§ 2",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "Case-by-case determination",
    governmentIndemnification: true,
    liabilityRegime: "capped",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years (IADC-aligned)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: ["IADC Space Debris Mitigation Guidelines", "ISO 24113"],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 12, max: 24 },
    applicationFee: "CZK 50,000\u2013150,000 (approx. \u20ac2,000\u20136,000)",
    otherCosts: ["Ministry technical review", "Insurance premiums"],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "Czech National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "complementary",
    description:
      "Czech Republic enacted its first dedicated space law in 2024, establishing a modern authorization framework aligned with EU Space Act principles.",
    keyArticles: ["Art. 6-16 EU Space Act \u2194 Act 77/2024 §§ 5-17"],
    transitionNotes:
      "Act 77/2024 entered into force in 2024. The Ministry of Transport is the competent authority; implementation details are still being finalized.",
  },

  notes: [
    "Hosts EU Agency for the Space Programme (EUSPA) headquarters in Prague",
    "Active domestic satellite integration industry",
    "First dedicated Czech space law enacted 2024",
  ],

  lastUpdated: "2026-04",
};

// ─── Ireland (IE) ───

const IE: JurisdictionLaw = {
  countryCode: "IE",
  countryName: "Ireland",
  flagEmoji: "\u{1F1EE}\u{1F1EA}",

  legislation: {
    name: "No dedicated national space law \u2014 interim framework via Enterprise Ireland / DETE",
    nameLocal: "(No dedicated legislation)",
    yearEnacted: 0,
    status: "none",
    keyArticles: "N/A",
  },

  licensingAuthority: {
    name: "Department of Enterprise, Trade and Employment (DETE) \u2014 Space Policy Unit",
    nameLocal: "Department of Enterprise, Trade and Employment",
    website: "https://enterprise.gov.ie",
    contactEmail: "info@enterprise.gov.ie",
    parentMinistry: "Department of Enterprise, Trade and Employment",
  },

  licensingRequirements: [
    {
      id: "ie-interim",
      category: "operational_plan",
      title: "Interim Authorization via Enterprise Ireland and UN Registration",
      description:
        "In the absence of a dedicated national space law, Irish operators typically rely on general administrative procedures coordinated via Enterprise Ireland and the Space Policy Unit. Operators must comply with UN Registration Convention obligations and EU dual-use export controls.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "Enterprise Ireland space policy; UN Registration Convention (1976)",
    },
  ],

  applicabilityRules: [
    {
      id: "ie-rule-irish-entity",
      description: "Interim framework applies to Irish space activities",
      condition: "Entity registered in Ireland",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "No formal requirements (voluntary adherence to IADC/ISO 24113)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 4, max: 12 },
    applicationFee: "N/A (interim framework)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: false,
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "Ireland lacks a dedicated national space law. EU Space Act will fill this significant gap. Ireland has a growing space sector and Enterprise Ireland has been consulting on a domestic framework.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization \u2014 fills the gap)",
    ],
    transitionNotes:
      "Ireland will need to designate a national competent authority for EU Space Act implementation. A dedicated Irish space law has been under consideration since 2019.",
  },

  notes: [
    "No dedicated national space law \u2014 interim framework only",
    "Growing space industry: Moonrider, Ubotica, Skytek",
    "EU Space Act will be Ireland's first comprehensive framework",
  ],

  lastUpdated: "2026-04",
};

// ─── Switzerland (CH) ───

const CH: JurisdictionLaw = {
  countryCode: "CH",
  countryName: "Switzerland",
  flagEmoji: "\u{1F1E8}\u{1F1ED}",

  legislation: {
    name: "Federal Ordinance on Space Objects (2019)",
    nameLocal: "Bundesgesetz \u00fcber Weltraumobjekte",
    yearEnacted: 2019,
    status: "enacted",
    officialUrl: "https://www.fedlex.admin.ch",
    keyArticles: "Arts. 1-15",
  },

  licensingAuthority: {
    name: "Swiss Space Office (SSO / State Secretariat for Education, Research and Innovation)",
    nameLocal:
      "Staatssekretariat f\u00fcr Bildung, Forschung und Innovation (SBFI)",
    website: "https://www.sbfi.admin.ch",
    contactEmail: "info@sbfi.admin.ch",
    parentMinistry:
      "Federal Department of Economic Affairs, Education and Research",
  },

  licensingRequirements: [
    {
      id: "ch-registration",
      category: "notification",
      title: "Registration of Space Objects",
      description:
        "All space objects launched under Swiss jurisdiction must be registered with the Swiss Space Office. Registration data is forwarded to the UN Secretary-General.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Art. 3 Ordinance on Space Objects",
    },
    {
      id: "ch-liability",
      category: "liability_coverage",
      title: "Liability Coverage",
      description:
        "Swiss operators are liable for damage caused by their space objects. Insurance is not mandated by federal law but strongly recommended.",
      mandatory: false,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 7",
    },
  ],

  applicabilityRules: [
    {
      id: "ch-rule-swiss-entity",
      description: "Applies to Swiss entities launching space objects",
      condition: "Entity registered in Switzerland",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Art. 2",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "Voluntary adherence to IADC Space Debris Mitigation Guidelines",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 4, max: 8 },
    applicationFee: "CHF 500\u20133,000 (approx. \u20ac500\u20133,100)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "Swiss Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "Switzerland is not an EU member state and the EU Space Act will not apply directly. Swiss operators active in EU markets will still be subject to the EU Space Act's third-country operator provisions. Switzerland has a minimal registration-only framework.",
    keyArticles: [
      "Art. 105-110 EU Space Act (Third Country Operator obligations for Swiss operators serving EU customers)",
    ],
    transitionNotes:
      "Switzerland is an ESA member but not EU. The Swiss framework is currently limited to UN registration; operators serving EU customers should prepare for TCO obligations under the EU Space Act.",
  },

  notes: [
    "Non-EU but ESA member state",
    "Home to ClearSpace (in-orbit servicing), Astrocast (IoT constellation)",
    "Minimal federal framework \u2014 registration-only",
  ],

  lastUpdated: "2026-04",
};

// ─── Estonia (EE) ───

const EE: JurisdictionLaw = {
  countryCode: "EE",
  countryName: "Estonia",
  flagEmoji: "\u{1F1EA}\u{1F1EA}",

  legislation: {
    name: "No dedicated national space law \u2014 interim framework via MKM Space Office + sectoral laws",
    nameLocal: "(Eraldi kosmoseseadust ei ole)",
    yearEnacted: 0,
    status: "none",
    keyArticles: "N/A",
  },

  licensingAuthority: {
    name: "Ministry of Economic Affairs and Communications \u2014 Estonian Space Office",
    nameLocal:
      "Majandus- ja Kommunikatsiooniministeerium \u2014 Eesti Kosmoseb\u00fcroo",
    website: "https://mkm.ee",
    contactEmail: "info@mkm.ee",
    parentMinistry: "Ministry of Economic Affairs and Communications",
  },

  licensingRequirements: [
    {
      id: "ee-interim",
      category: "operational_plan",
      title:
        "Interim Authorization via MKM Space Office and sectoral regulators",
      description:
        "In the absence of a dedicated national space law, Estonian operators coordinate with the MKM Space Office and comply with sectoral regulators: TTJA for radio spectrum authorisations, Strategic Goods Commission for dual-use export control, RIA for cybersecurity. UN Registration Convention obligations are handled via the Ministry of Foreign Affairs.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "Electronic Communications Act (RT I 2004, 87, 593); Strategic Goods Act (RT I, 29.12.2011, 2); UN Registration Convention",
    },
  ],

  applicabilityRules: [
    {
      id: "ee-rule-estonian-entity",
      description: "Interim framework applies to Estonian space activities",
      condition: "Entity registered in Estonia (incl. via E-Residency)",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "No formal requirements (voluntary adherence to IADC/ISO 24113)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 4, max: 12 },
    applicationFee: "N/A (interim framework)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: false,
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "Estonia lacks a dedicated national space law. The EU Space Act will apply directly upon entry into force and will provide the first comprehensive authorization framework for Estonian operators. Estonia's digital-first governance (E-Residency) makes it an attractive SPV incorporation jurisdiction for international space ventures, which amplifies the need for a clear authorization regime.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization \u2014 fills the gap)",
      "Art. 26-35 EU Space Act (Registration \u2014 formalises MKM/MFA practice)",
    ],
    transitionNotes:
      "Estonia will need to designate a national competent authority under the EU Space Act. MKM (Ministry of Economic Affairs and Communications) is the most likely candidate given its current role as ESA delegation and Space Office host.",
  },

  notes: [
    "No dedicated national space law \u2014 sectoral framework only",
    "ESA full member since 2 February 2015",
    "ESTCube-1 (first Estonian satellite, 1U CubeSat, University of Tartu) launched 7 May 2013",
    "ESTCube-2 launched 9 October 2023 (Vega VV23), deorbited 3 January 2024",
    "Tartu Observatory is the primary space research institution",
    "E-Residency programme enables non-Estonians to register space SPVs remotely",
  ],

  lastUpdated: "2026-04",
};

// ─── Romania (RO) ───

const RO: JurisdictionLaw = {
  countryCode: "RO",
  countryName: "Romania",
  flagEmoji: "\u{1F1F7}\u{1F1F4}",

  legislation: {
    name: "No dedicated national space law \u2014 ROSA coordination + sectoral framework",
    nameLocal: "(Nu exist\u0103 o lege spa\u021bial\u0103 dedicat\u0103)",
    yearEnacted: 0,
    status: "none",
    keyArticles: "N/A",
  },

  licensingAuthority: {
    name: "Romanian Space Agency",
    nameLocal: "Agen\u021bia Spa\u021bial\u0103 Rom\u00e2n\u0103 (ROSA)",
    website: "https://rosa.ro",
    contactEmail: "office@rosa.ro",
    parentMinistry: "Ministry of Research, Innovation and Digitalisation",
  },

  licensingRequirements: [
    {
      id: "ro-interim",
      category: "operational_plan",
      title: "Interim coordination via ROSA + sectoral regulators",
      description:
        "Romania has no dedicated national space act. Operators coordinate with ROSA for ESA participation and policy alignment, and comply with sectoral regulators: ANCOM for radio spectrum, ANCEX (within MFA) for dual-use export control, DNSC for cybersecurity. UN Registration Convention obligations are handled via the MFA.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "Electronic Communications Code (Legea 140/2023); Strategic Goods Act (Legea 227/2018); UN Registration Convention",
    },
  ],

  applicabilityRules: [
    {
      id: "ro-rule-romanian-entity",
      description: "Interim framework applies to Romanian space activities",
      condition: "Entity registered in Romania",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "No formal requirements (voluntary adherence to IADC/ISO 24113)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 4, max: 12 },
    applicationFee: "N/A (interim framework)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: false,
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "Romania lacks a dedicated national space law. The EU Space Act will apply directly upon entry into force and will provide the first comprehensive authorization framework for Romanian operators. ROSA (established 1991) is expected to be designated the national competent authority.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization \u2014 fills the gap)",
      "Art. 26-35 EU Space Act (Registration \u2014 formalises MFA/ROSA practice)",
    ],
    transitionNotes:
      "Romania has discussed a dedicated space law repeatedly since ~2018 but no draft has advanced to parliament. The EU Space Act will likely supersede any such national effort.",
  },

  notes: [
    "No dedicated national space law \u2014 sectoral framework only",
    "ESA full member since 22 December 2011",
    "ROSA (Romanian Space Agency) established 1991, re-confirmed by GD 923/1995",
    "Hermann Oberth (born Sibiu, Transylvania) \u2014 founding father of astronautics",
    "Active companies include Deimos Space, GMV Innovating Solutions",
  ],

  lastUpdated: "2026-04",
};

// ─── Hungary (HU) ───

const HU: JurisdictionLaw = {
  countryCode: "HU",
  countryName: "Hungary",
  flagEmoji: "\u{1F1ED}\u{1F1FA}",

  legislation: {
    name: "No dedicated national space law \u2014 Hungarian Space Office + sectoral framework",
    nameLocal: "(Nincs k\u00fcl\u00f6n \u0171rt\u00f6rv\u00e9ny)",
    yearEnacted: 0,
    status: "none",
    keyArticles: "N/A",
  },

  licensingAuthority: {
    name: "Hungarian Space Office (Űrügyi Főosztály)",
    nameLocal: "\u0170r\u00fcgyi F\u0151oszt\u00e1ly",
    website: "https://kormany.hu",
    parentMinistry: "Ministry of Foreign Affairs and Trade (KKM)",
  },

  licensingRequirements: [
    {
      id: "hu-interim",
      category: "operational_plan",
      title:
        "Interim coordination via Hungarian Space Office + sectoral regulators",
      description:
        "Hungary has no dedicated national space act. Operators coordinate with the Hungarian Space Office (within KKM) for ESA and COPUOS matters, and comply with sectoral regulators: NMHH for radio spectrum, SZTNH Trade Control Department for dual-use export control, SZTFH for cybersecurity. UN Registration Convention obligations are handled via KKM.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "Electronic Communications Act (2003. évi C. törvény); Export Control Act (2011. évi CLVII. törvény); UN Registration Convention",
    },
  ],

  applicabilityRules: [
    {
      id: "hu-rule-hungarian-entity",
      description: "Interim framework applies to Hungarian space activities",
      condition: "Entity registered in Hungary",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "No formal requirements (voluntary adherence to IADC/ISO 24113)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 4, max: 12 },
    applicationFee: "N/A (interim framework)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: false,
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "Hungary lacks a dedicated national space law. The EU Space Act will apply directly upon entry into force and will provide the first comprehensive authorization framework. The Hungarian Space Office (within KKM) is the most likely national competent authority candidate.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization \u2014 fills the gap)",
      "Art. 26-35 EU Space Act (Registration)",
    ],
    transitionNotes:
      "Hungary's HUNOR astronaut programme and increasing ESA contribution suggest national space policy attention but a dedicated space act has not been drafted.",
  },

  notes: [
    "No dedicated national space law \u2014 sectoral framework only",
    "ESA full member since 24 February 2015",
    "Bertalan Farkas (1980) was the first Hungarian cosmonaut (Soyuz-36)",
    "Tibor Kapu flew to the ISS on Axiom Mission 4 in 2025 (HUNOR programme)",
    "Active companies include C3S, 4iG, Puli Space Technologies",
    "Artemis Accords signatory since 18 December 2024 (53rd signatory)",
  ],

  lastUpdated: "2026-04",
};

// ─── Slovenia (SI) ───

const SI: JurisdictionLaw = {
  countryCode: "SI",
  countryName: "Slovenia",
  flagEmoji: "\u{1F1F8}\u{1F1EE}",

  legislation: {
    name: "No dedicated national space law \u2014 MGTS coordination + sectoral framework",
    nameLocal: "(Ni namenskega vesoljskega zakona)",
    yearEnacted: 0,
    status: "none",
    keyArticles: "N/A",
  },

  licensingAuthority: {
    name: "Ministry of the Economy, Tourism and Sport",
    nameLocal: "Ministrstvo za gospodarstvo, turizem in \u0161port (MGTS)",
    website: "https://gov.si/mgts",
    parentMinistry: "Ministry of the Economy, Tourism and Sport",
  },

  licensingRequirements: [
    {
      id: "si-interim",
      category: "operational_plan",
      title: "Interim coordination via MGTS + sectoral regulators",
      description:
        "Slovenia has no dedicated national space act. Operators coordinate with MGTS for ESA participation and comply with sectoral regulators: AKOS for radio spectrum, the Interministerial Commission on Export Control (MKNIB) for dual-use items, URSIV for cybersecurity. UN Registration Convention obligations are handled via the Ministry of Foreign and European Affairs.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "Electronic Communications Act (ZEKom-2, 2023); Strategic Goods Regime Act (ZNIBD, 2018); UN Registration Convention",
    },
  ],

  applicabilityRules: [
    {
      id: "si-rule-slovenian-entity",
      description: "Interim framework applies to Slovenian space activities",
      condition: "Entity registered in Slovenia",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "No formal requirements (voluntary adherence to IADC/ISO 24113)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 4, max: 12 },
    applicationFee: "N/A (interim framework)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: false,
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "Slovenia lacks a dedicated national space law. The EU Space Act will apply directly upon entry into force and will provide the first comprehensive authorization framework. MGTS (Ministry of Economy, Tourism and Sport) is the most likely national competent authority candidate given its ESA delegation role.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization \u2014 fills the gap)",
      "Art. 26-35 EU Space Act (Registration)",
    ],
    transitionNotes:
      "Slovenia's recent ESA full membership (July 2022) and growing commercial sector suggest policy attention but no dedicated space act is currently drafted.",
  },

  notes: [
    "No dedicated national space law \u2014 sectoral framework only",
    "ESA full member since 5 July 2022 (European Cooperating State since 2010, Associate 2016)",
    "Sinergise (Sentinel Hub) acquired by Planet Labs in 2023 \u2014 major EO platform",
    "Active companies include Skylabs, Dewesoft, Sinergise",
    "Artemis Accords signatory since 19 April 2024 (39th signatory)",
  ],

  lastUpdated: "2026-04",
};

// ─── Latvia (LV) ───

const LV: JurisdictionLaw = {
  countryCode: "LV",
  countryName: "Latvia",
  flagEmoji: "\u{1F1F1}\u{1F1FB}",

  legislation: {
    name: "No dedicated national space law \u2014 IZM coordination + sectoral framework",
    nameLocal: "(Nav īpaša kosmosa likuma)",
    yearEnacted: 0,
    status: "none",
    keyArticles: "N/A",
  },

  licensingAuthority: {
    name: "Ministry of Education and Science",
    nameLocal: "Izgl\u012bt\u012bbas un zin\u0101tnes ministrija (IZM)",
    website: "https://izm.gov.lv",
    parentMinistry: "Ministry of Education and Science",
  },

  licensingRequirements: [
    {
      id: "lv-interim",
      category: "operational_plan",
      title: "Interim coordination via IZM + sectoral regulators",
      description:
        "Latvia has no dedicated national space act. Operators coordinate with IZM for ESA matters and comply with sectoral regulators: VAS ESD for radio spectrum, SPKK (within MFA) for dual-use export control, CERT.LV for cybersecurity. UN Registration Convention obligations are handled via the MFA.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "Electronic Communications Law (2004); Strategic Goods Act (2007); Cybersecurity Law (2024); UN Registration Convention",
    },
  ],

  applicabilityRules: [
    {
      id: "lv-rule-latvian-entity",
      description: "Interim framework applies to Latvian space activities",
      condition: "Entity registered in Latvia",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "No formal requirements (voluntary adherence to IADC/ISO 24113)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 4, max: 12 },
    applicationFee: "N/A (interim framework)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: false,
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "Latvia lacks a dedicated national space law. The EU Space Act will apply directly upon entry into force and will provide the first comprehensive authorization framework for Latvian operators. IZM is the most likely national competent authority candidate given its ESA delegation role.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization \u2014 fills the gap)",
      "Art. 26-35 EU Space Act (Registration)",
    ],
    transitionNotes:
      "Latvia's ESA Associate membership (2020) and growing radio-astronomy + ground-segment sector suggest future policy attention but no dedicated space act is currently drafted.",
  },

  notes: [
    "No dedicated national space law \u2014 sectoral framework only",
    "ESA European Cooperating State since 25 July 2013; Associate Member since 27 July 2020",
    "VIRAC (Ventspils 32m RT-32 radio telescope) \u2014 major space science asset",
    "Active companies include Eventech (satellite laser ranging), ARMS, Tet",
  ],

  lastUpdated: "2026-04",
};

// ─── Lithuania (LT) ───

const LT: JurisdictionLaw = {
  countryCode: "LT",
  countryName: "Lithuania",
  flagEmoji: "\u{1F1F1}\u{1F1F9}",

  legislation: {
    name: "No dedicated national space law \u2014 EIM coordination + sectoral framework",
    nameLocal: "(Nėra specialaus kosmoso įstatymo)",
    yearEnacted: 0,
    status: "none",
    keyArticles: "N/A",
  },

  licensingAuthority: {
    name: "Ministry of Economy and Innovation — Space Affairs Division",
    nameLocal: "Ekonomikos ir inovacij\u0173 ministerija",
    website: "https://eimin.lrv.lt",
    parentMinistry: "Ministry of Economy and Innovation",
  },

  licensingRequirements: [
    {
      id: "lt-interim",
      category: "operational_plan",
      title:
        "Interim coordination via EIM Space Affairs Division + sectoral regulators",
      description:
        "Lithuania has no dedicated national space act. Operators coordinate with the EIM Space Affairs Division for ESA matters and comply with sectoral regulators: RRT for radio spectrum, KAM (Ministry of National Defence) for dual-use export control, NKSC for cybersecurity. UN Registration Convention obligations are handled via URM (MFA).",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "Law on Electronic Communications (2004); Law on Control of Strategic Goods; Cybersecurity Law (2014, amended 2024 for NIS2); UN Registration Convention",
    },
  ],

  applicabilityRules: [
    {
      id: "lt-rule-lithuanian-entity",
      description: "Interim framework applies to Lithuanian space activities",
      condition: "Entity registered in Lithuania",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "No formal requirements (voluntary adherence to IADC/ISO 24113)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 4, max: 12 },
    applicationFee: "N/A (interim framework)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: false,
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "Lithuania lacks a dedicated national space law. The EU Space Act will apply directly upon entry into force and will provide the first comprehensive authorization framework for Lithuanian operators. Given Lithuania's concentrated nanosatellite industry (NanoAvionics flies >100 satellites globally), the liability and registration provisions of the EU Space Act will be particularly consequential. EIM Space Affairs Division is the most likely competent authority candidate.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization \u2014 fills the gap)",
      "Art. 26-35 EU Space Act (Registration)",
      "Art. 56-70 EU Space Act (Insurance & Liability \u2014 critical for nanosat export operators)",
    ],
    transitionNotes:
      "Lithuania's Associate ESA Membership (2021) and nanosat export industry pressure are likely to accelerate national space law drafting once the EU Space Act passes trilogue.",
  },

  notes: [
    "No dedicated national space law \u2014 sectoral framework only",
    "ESA European Cooperating State since 7 October 2014; Associate Member since 21 May 2021",
    "Nanosat cluster: NanoAvionics (acquired by Kongsberg 2022), Astrolight, Blackswan Space, Brolis Semiconductors",
    "Artemis Accords signatory since 13 May 2024 (40th signatory)",
  ],

  lastUpdated: "2026-04",
};

// ─── Slovakia (SK) ───

const SK: JurisdictionLaw = {
  countryCode: "SK",
  countryName: "Slovakia",
  flagEmoji: "\u{1F1F8}\u{1F1F0}",

  legislation: {
    name: "No dedicated national space law \u2014 MŠVVaM coordination + sectoral framework",
    nameLocal: "(Osobitn\u00fd kozmick\u00fd z\u00e1kon neexistuje)",
    yearEnacted: 0,
    status: "none",
    keyArticles: "N/A",
  },

  licensingAuthority: {
    name: "Ministry of Education, Research, Development and Youth",
    nameLocal:
      "Ministerstvo \u0161kolstva, v\u00fdskumu, v\u00fdvoja a ml\u00e1de\u017ee SR (M\u0160VVaM)",
    website: "https://minedu.sk",
    parentMinistry: "Ministry of Education, Research, Development and Youth",
  },

  licensingRequirements: [
    {
      id: "sk-interim",
      category: "operational_plan",
      title: "Interim coordination via MŠVVaM + sectoral regulators",
      description:
        "Slovakia has no dedicated national space act. Operators coordinate with MŠVVaM for ESA matters and comply with sectoral regulators: RÚ for radio spectrum, MH SR for dual-use export control, NBÚ for cybersecurity. UN Registration Convention obligations are handled via MZVEZ (MFA).",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "Electronic Communications Act (452/2021 Z.z.); Foreign Trade Act (39/2011 Z.z.); Cybersecurity Act (69/2018 Z.z., NIS2 amendment 2024); UN Registration Convention (Czechoslovak succession)",
    },
  ],

  applicabilityRules: [
    {
      id: "sk-rule-slovak-entity",
      description: "Interim framework applies to Slovak space activities",
      condition: "Entity registered in Slovakia",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "No formal requirements (voluntary adherence to IADC/ISO 24113)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 4, max: 12 },
    applicationFee: "N/A (interim framework)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: false,
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "Slovakia lacks a dedicated national space law. The EU Space Act will apply directly upon entry into force and will provide the first comprehensive authorization framework for Slovak operators. MŠVVaM is the most likely national competent authority candidate given its ESA delegation role.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization \u2014 fills the gap)",
      "Art. 26-35 EU Space Act (Registration)",
    ],
    transitionNotes:
      "Slovakia's ESA Associate membership (2022) and growing nanosat sector (Needronix, Spacemanic, SOSA) suggest future policy attention but no dedicated space act is currently drafted.",
  },

  notes: [
    "No dedicated national space law \u2014 sectoral framework only",
    "ESA European Cooperating State since 16 February 2010; Associate Member since 30 September 2022",
    "skCUBE (first Slovak satellite) launched 23 June 2017 on PSLV-C38",
    "Slovak Organisation for Space Activities (SOSA) leads community development",
    "Active companies include Needronix, Spacemanic, GA Drilling",
    "Treaty obligations inherited via Czechoslovak succession (1 January 1993)",
  ],

  lastUpdated: "2026-04",
};

// ─── Croatia (HR) ───

const HR: JurisdictionLaw = {
  countryCode: "HR",
  countryName: "Croatia",
  flagEmoji: "\u{1F1ED}\u{1F1F7}",

  legislation: {
    name: "No dedicated national space law \u2014 MZO coordination + sectoral framework",
    nameLocal: "(Nema posebnog zakona o svemiru)",
    yearEnacted: 0,
    status: "none",
    keyArticles: "N/A",
  },

  licensingAuthority: {
    name: "Ministry of Science, Education and Youth",
    nameLocal: "Ministarstvo znanosti, obrazovanja i mladih (MZO)",
    website: "https://mzo.gov.hr",
    parentMinistry: "Ministry of Science, Education and Youth",
  },

  licensingRequirements: [
    {
      id: "hr-interim",
      category: "operational_plan",
      title: "Interim coordination via MZO + sectoral regulators",
      description:
        "Croatia has no dedicated national space act. Operators coordinate with MZO for ESA matters and comply with sectoral regulators: HAKOM for radio spectrum, MINGO for dual-use export control, ZSIS for cybersecurity. UN Registration Convention obligations are handled via MVEP (MFA).",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "Electronic Communications Act (NN 76/22); Dual-Use Goods Act (NN 118/18); Cybersecurity Act (NN 14/24); UN Registration Convention",
    },
  ],

  applicabilityRules: [
    {
      id: "hr-rule-croatian-entity",
      description: "Interim framework applies to Croatian space activities",
      condition: "Entity registered in Croatia",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "No formal requirements (voluntary adherence to IADC/ISO 24113)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 4, max: 12 },
    applicationFee: "N/A (interim framework)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: false,
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "Croatia lacks a dedicated national space law. The EU Space Act will apply directly upon entry into force and will provide the first comprehensive authorization framework for Croatian operators. MZO is the most likely national competent authority candidate given its ESA delegation role.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization \u2014 fills the gap)",
      "Art. 26-35 EU Space Act (Registration)",
    ],
    transitionNotes:
      "Croatia's ESA PECS status (since December 2022) and Amphinicy's ground-segment success signal a maturing ecosystem but no dedicated space act is currently drafted.",
  },

  notes: [
    "No dedicated national space law \u2014 sectoral framework only",
    "ESA European Cooperating State since 19 February 2018; PECS since 7 December 2022",
    "University of Zagreb FER laboratory is the main ESA academic partner",
    "Active companies include Amphinicy Technologies (ground-segment SW), RT-RK",
    "Treaty obligations inherited via Yugoslav succession (independence 1991, recognised 1992)",
  ],

  lastUpdated: "2026-04",
};

// ─── Turkey (TR) ───

const TR: JurisdictionLaw = {
  countryCode: "TR",
  countryName: "Turkey",
  flagEmoji: "\u{1F1F9}\u{1F1F7}",

  legislation: {
    name: "No dedicated national space law \u2014 TUA coordination via Presidential Decree",
    nameLocal:
      "(Özel bir uzay kanunu yok; TUA Cumhurbaşkanlığı Kararnamesi ile)",
    yearEnacted: 2018,
    status: "draft",
    keyArticles: "Presidential Decree 23 (2018); 170 (2024)",
  },

  licensingAuthority: {
    name: "Turkish Space Agency",
    nameLocal: "T\u00fcrkiye Uzay Ajans\u0131 (TUA)",
    website: "https://tua.gov.tr",
    parentMinistry: "Presidency of the Republic of Turkey",
  },

  licensingRequirements: [
    {
      id: "tr-tua",
      category: "operational_plan",
      title:
        "TUA coordination + sectoral authorisations (Turkey has no dedicated space act)",
      description:
        "Turkish space operators coordinate with the Turkish Space Agency (TUA) under its Presidential Decree mandate, and comply with sectoral regulators: BTK for radio spectrum, SSB / Ministry of Trade for export control, USOM/BTK for cybersecurity, KVKK for data protection. No unified authorization regime exists; each activity triggers its own sector-specific licence.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "Presidential Decree 23/2018 (TUA); 5809 Electronic Communications Law (2008); 6698 Personal Data Protection Law (2016)",
    },
  ],

  applicabilityRules: [
    {
      id: "tr-rule-turkish-entity",
      description: "TUA coordination applies to Turkish space activities",
      condition: "Entity registered in Turkey",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "No formal requirements (voluntary adherence to IADC/ISO 24113)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 8, max: 20 },
    applicationFee: "Varies by authority (TUA/BTK/SSB)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "TUA National Space Object Registry (via decree)",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "Turkey is NOT an EU or EEA member; the EU Space Act will not apply directly. Turkish operators serving EU markets will be subject to EU Space Act third-country operator (TCO) provisions. A dedicated Turkish space law is under discussion but not enacted as of 2026; TUA's Presidential Decree mandate is the current quasi-regulatory framework.",
    keyArticles: [
      "Art. 105-110 EU Space Act (Third Country Operator obligations for Turkish operators serving EU customers)",
    ],
    transitionNotes:
      "Turkish operators entering EU markets should prepare for TCO obligations under the EU Space Act. A draft national space law has been circulated but not introduced in the Grand National Assembly as of 2026.",
  },

  notes: [
    "No dedicated national space law \u2014 TUA operates under Presidential Decree",
    "TUA (Turkish Space Agency) established 13 December 2018 (Decree 23), reorganised 2024 (Decree 170)",
    "10-Year National Space Programme announced 9 February 2021",
    "Alper Gezeravcı first Turkish astronaut \u2014 Axiom Mission 3 to ISS (18 January 2024)",
    "İMECE Earth observation satellite launched April 2023 (SpaceX Transporter-7)",
    "Artemis Accords signatory since 13 April 2024 (36th signatory)",
    "Not an ESA member; cooperation via framework agreements",
  ],

  lastUpdated: "2026-04",
};

// ─── Iceland (IS) ───

const IS: JurisdictionLaw = {
  countryCode: "IS",
  countryName: "Iceland",
  flagEmoji: "\u{1F1EE}\u{1F1F8}",

  legislation: {
    name: "No dedicated national space law \u2014 EEA-transposed EU framework",
    nameLocal: "(Engin sérstök geimlög)",
    yearEnacted: 0,
    status: "none",
    keyArticles: "N/A",
  },

  licensingAuthority: {
    name: "Ministry of Higher Education, Science and Innovation",
    nameLocal:
      "H\u00e1sk\u00f3la-, i\u00f0na\u00f0ar- og n\u00fdsk\u00f6punarr\u00e1\u00f0uneyti\u00f0 (HVIN)",
    website: "https://stjr.is/hvin",
    parentMinistry: "Ministry of Higher Education, Science and Innovation",
  },

  licensingRequirements: [
    {
      id: "is-interim",
      category: "operational_plan",
      title: "No domestic framework \u2014 sectoral authorities only",
      description:
        "Iceland has no national space agency and no commercial space industry. Any future Icelandic operator would rely on Fjarskiptastofa (spectrum), Persónuvernd (data protection under GDPR via EEA), and the Ministry of Foreign Affairs (UN treaty coordination). EU Space Act reaches Iceland via EEA Joint Committee mechanism with typical 6–18 month transposition lag.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "Electronic Communications Act 70/2022; Data Protection Act 90/2018",
    },
  ],

  applicabilityRules: [
    {
      id: "is-rule-icelandic-entity",
      description: "Sectoral framework applies if Icelandic entity exists",
      condition: "Entity registered in Iceland",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: [
      "No formal requirements (voluntary adherence to IADC/ISO 24113)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 4, max: 12 },
    applicationFee: "N/A (no domestic space regime)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: false,
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "complementary",
    description:
      "Iceland is an EEA member since 1 January 1994. The EU Space Act will apply via EEA Joint Committee Decision with typical 6–18 month transposition lag. Given Iceland has no commercial space industry, the practical impact is minimal — primarily relevant if a future Icelandic ground-station operator or EO entity emerges.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization \u2014 will apply via EEA)",
      "Art. 26-35 EU Space Act (Registration \u2014 will apply via EEA)",
    ],
    transitionNotes:
      "EEA Joint Committee typically takes 6–18 months to adopt EU instruments. Operators should verify the EEA incorporation status before assuming equivalence.",
  },

  notes: [
    "No dedicated national space law \u2014 EEA-transposed EU framework",
    "EEA member since 1 January 1994 (via EFTA)",
    "Not an ESA member",
    "No national space agency, no commercial space industry",
    "Arctic position relevant for polar-orbit ground stations and reentry observation",
  ],

  lastUpdated: "2026-04",
};

// ─── Liechtenstein (LI) ───

const LI: JurisdictionLaw = {
  countryCode: "LI",
  countryName: "Liechtenstein",
  flagEmoji: "\u{1F1F1}\u{1F1EE}",

  legislation: {
    name: "No dedicated national space law \u2014 EEA-transposed EU framework",
    nameLocal: "(Kein eigenes Weltraumgesetz)",
    yearEnacted: 0,
    status: "none",
    keyArticles: "N/A",
  },

  licensingAuthority: {
    name: "Government of the Principality of Liechtenstein",
    nameLocal: "Regierung des F\u00fcrstentums Liechtenstein",
    website: "https://regierung.li",
    parentMinistry: "Ministry of Foreign Affairs, Justice and Culture",
  },

  licensingRequirements: [
    {
      id: "li-interim",
      category: "operational_plan",
      title: "No space activity — theoretical exposure only",
      description:
        "Liechtenstein has no domestic space activity, no national space agency, and no operational satellites. Theoretical exposure exists if a Liechtenstein SPV or foundation holds space assets or procures a launch, triggering State-responsibility under OST Art. VI. In practice the Amt für Kommunikation handles any electronic-communications authorisation; the Financial Market Authority (FMA) supervises asset-holding structures including space-sector SPVs.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Kommunikationsgesetz (KomG); Datenschutzgesetz (DSG 2018)",
    },
  ],

  applicabilityRules: [
    {
      id: "li-rule-liechtenstein-entity",
      description: "Sectoral framework applies if Liechtenstein entity exists",
      condition: "Entity registered in Liechtenstein",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: false,
    governmentIndemnification: false,
    liabilityRegime: "unlimited",
    thirdPartyRequired: false,
  },

  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
    standards: ["No formal requirements"],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 4, max: 12 },
    applicationFee: "N/A (no domestic space regime)",
    otherCosts: [],
  },

  registration: {
    nationalRegistryExists: false,
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "complementary",
    description:
      "Liechtenstein is an EEA member since 1 May 1995. The EU Space Act will apply via EEA Joint Committee Decision with typical 6–24 month transposition lag. Given no commercial space industry, the practical relevance is limited to space-asset SPVs and trust/foundation structures that hold space collateral — triggering compliance via the Trust Enterprise Act (Treuunternehmen) and FMA supervision.",
    keyArticles: [
      "Art. 6-16 EU Space Act (Authorization \u2014 via EEA, applies to SPV-held operations)",
      "Art. 56-70 EU Space Act (Insurance & Liability \u2014 particularly relevant for asset-holding structures)",
    ],
    transitionNotes:
      "EEA Joint Committee transposition lag is typically 12–24 months for Liechtenstein due to smaller administrative capacity. Asset-holding structures should consult specialist counsel before assuming EU-equivalent operating reality.",
  },

  notes: [
    "No dedicated national space law \u2014 EEA-transposed EU framework",
    "EEA member since 1 May 1995 (via EFTA)",
    "Not an ESA member",
    "No domestic space activity \u2014 tracked primarily for SPV/trust exposure",
    "Customs and monetary union with Switzerland overlays electronic-communications regulation",
  ],

  lastUpdated: "2026-04",
};

// ─── United States (US) ───

const US: JurisdictionLaw = {
  countryCode: "US",
  countryName: "United States",
  flagEmoji: "\u{1F1FA}\u{1F1F8}",

  legislation: {
    name: "Commercial Space Launch Act (CSLA) — 51 USC Ch. 509",
    nameLocal: "Commercial Space Launch Act",
    yearEnacted: 1984,
    yearAmended: 2023,
    status: "enacted",
    officialUrl:
      "https://www.law.cornell.edu/uscode/text/51/subtitle-V/chapter-509",
    keyArticles: "51 USC §§50901-50923; 14 CFR Parts 400-450",
  },

  licensingAuthority: {
    name: "Federal Aviation Administration — Office of Commercial Space Transportation (FAA/AST)",
    nameLocal: "FAA/AST",
    website: "https://faa.gov/space",
    parentMinistry: "Department of Transportation",
  },

  licensingRequirements: [
    {
      id: "us-faa-launch",
      category: "operational_plan",
      title: "FAA/AST launch or reentry licence (14 CFR Part 450)",
      description:
        "Commercial launch and reentry operations require an FAA/AST licence under 51 USC §50904. 14 CFR Part 450 (consolidated 2020, effective 2021) sets performance-based public-safety criteria (Ec ≤ 1×10⁻⁴, Pc ≤ 1×10⁻⁶). Licence is operator-specific; mission-specific for certain profiles.",
      mandatory: true,
      applicableTo: ["launch_vehicle", "launch_site"],
      articleRef: "14 CFR §§ 450.1-450.245",
    },
    {
      id: "us-fcc-spectrum",
      category: "technical_assessment",
      title: "FCC space-station + earth-station licences (47 CFR Part 25)",
      description:
        "Satellite operators require FCC authorisation for space-station and earth-station operation. Non-US operators need market-access grant under 47 CFR §25.137. Orbital debris plan mandatory (47 CFR §25.114) including 5-year post-mission disposal for LEO (adopted 2022, effective 2023).",
      mandatory: true,
      applicableTo: ["spacecraft_operation", "satellite_communications"],
      articleRef: "47 CFR Part 25; FCC 22-74 (debris rule)",
    },
    {
      id: "us-noaa-remote-sensing",
      category: "technical_assessment",
      title: "NOAA remote-sensing licence (15 CFR Part 960)",
      description:
        "Private Earth remote-sensing operators require a NOAA licence under 51 USC §60121. 2020 rulemaking established Tier 1 (unrestricted), Tier 2 (conditions possible), Tier 3 (extraordinary national-security conditions). Most modern EO missions are Tier 1.",
      mandatory: true,
      applicableTo: ["earth_observation"],
      articleRef: "15 CFR Part 960 (2020 rulemaking)",
    },
    {
      id: "us-ddtc-itar",
      category: "technical_assessment",
      title: "DDTC ITAR licence (USML Category IV & XV)",
      description:
        "Defence-article exports require DDTC licence under 22 CFR 120-130. USML Category IV covers launch vehicles and propulsion; Category XV covers defence-specific spacecraft. 2014 Export Control Reform migrated most commercial spacecraft to EAR 9E515/9A515. Technical Assistance Agreements required for foreign-person technical-data disclosure.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "22 USC 2751; 22 CFR 120-130",
    },
    {
      id: "us-bis-ear",
      category: "technical_assessment",
      title: "BIS EAR licence (CCL Category 9)",
      description:
        "Commercial dual-use space items require BIS classification and, where applicable, licence. ECCN 9A515 (hardware) and 9E515 (technology) cover most commercial spacecraft. Licence requirements depend on destination country group, end-user screening (Entity List), and applicable reasons for control (NS, AT, RS, MT).",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "50 USC Ch. 58 (ECRA); 15 CFR 730-774",
    },
  ],

  applicabilityRules: [
    {
      id: "us-rule-person",
      description:
        "CSLA applies to US persons, domestic operations, and market access",
      condition:
        "US person OR operating from US territory OR serving US customers",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "foreign"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage:
      "Maximum Probable Loss determined per FAA licence ($100M–$500M typical)",
    governmentIndemnification: true,
    indemnificationCap:
      "Government indemnification MPL → $3.1B (2023 cap; authorised through 30 Sep 2025)",
    liabilityRegime: "unlimited",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline:
      "LEO: 5 years post-mission (FCC 47 CFR §25.114, 2022 rule; applies to apps after 29 Sep 2022)",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: [
      "FCC 47 CFR §25.114",
      "NASA-STD-8719.14 (reference for USG missions)",
      "IADC Guidelines (voluntary)",
      "Space Debris Mitigation Standard Practices (ODMSP, 2019)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: true,
    dataDistributionRestrictions: true,
  },

  timeline: {
    typicalProcessingWeeks: { min: 16, max: 52 },
    applicationFee:
      "FAA launch licence fee per 14 CFR; FCC satellite filings $10K–$100K; NOAA licence fees modest",
    otherCosts: [
      "Environmental review (NEPA) costs",
      "DDTC registration fee ($2,250+)",
      "BIS licence processing",
      "Insurance premium (MPL-dependent)",
    ],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "US Registry of Space Objects (Department of State)",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "The USA is NOT an EU or EEA member; the EU Space Act will not apply domestically. US operators serving EU markets will be subject to EU Space Act third-country operator (TCO) provisions (Art. 105-110), which require equivalence assessment and compliance with key EU requirements even outside EU territory.",
    keyArticles: [
      "EU Space Act Art. 105-110 (Third Country Operator regime applicable to US operators)",
    ],
    transitionNotes:
      "US operators (SpaceX, Blue Origin, Viasat, Iridium, etc.) should prepare TCO compliance plans. US national security payloads may invoke DFAR/ITAR carve-outs; dual-use commercial payloads will need full TCO review.",
  },

  notes: [
    "Multi-agency regime \u2014 no single 'US space law'",
    "FAA/AST licences launch+reentry (CSLA 1984, 14 CFR Part 450 from 2020)",
    "FCC licenses spectrum + orbital debris rules (47 CFR Part 25)",
    "NOAA licenses remote sensing (LRSPA 1992, 15 CFR Part 960)",
    "DDTC administers ITAR (22 CFR 120-130) \u2014 launch vehicles + defence spacecraft",
    "BIS administers EAR (15 CFR 730-774) \u2014 commercial spacecraft post-2014 ECR",
    "CSLCA 2015 \u00a751303 recognises space-resource property rights",
    "USA is NOT a party to the 1979 Moon Agreement (deliberate policy)",
    "USA originated + 1st signed Artemis Accords (13 October 2020)",
    "Indemnification regime (CSLA \u00a750914) scheduled to sunset 30 Sep 2025",
  ],

  lastUpdated: "2026-04",
};

// ═══════════════════════════════════════════════════════════════════
// ASIA-PACIFIC
// ═══════════════════════════════════════════════════════════════════

const NZ: JurisdictionLaw = {
  countryCode: "NZ",
  countryName: "New Zealand",
  flagEmoji: "\u{1F1F3}\u{1F1FF}",

  legislation: {
    name: "Outer Space and High-altitude Activities Act 2017 (OSHAA)",
    nameLocal: "Outer Space and High-altitude Activities Act 2017",
    yearEnacted: 2017,
    status: "enacted",
    officialUrl:
      "https://www.legislation.govt.nz/act/public/2017/0029/latest/whole.html",
    keyArticles:
      "Public Act 2017 No. 29; OSHAA (Authorisations) Regulations 2017 (LI 2017/295)",
  },

  licensingAuthority: {
    name: "New Zealand Space Agency (within Ministry of Business, Innovation and Employment)",
    nameLocal: "New Zealand Space Agency — MBIE",
    website: "https://www.mbie.govt.nz/business-and-employment/space",
    parentMinistry: "Ministry of Business, Innovation and Employment (MBIE)",
  },

  licensingRequirements: [
    {
      id: "nz-payload-permit",
      category: "operational_plan",
      title: "OSHAA Payload Permit",
      description:
        "Any spacecraft payload launched by an NZ operator, or from NZ territory, requires a Payload Permit from MBIE's NZSA. Requires payload technical specification, orbital parameters, spectrum coordination status, end-of-life disposal plan, and debris-mitigation analysis aligned with COPUOS Guidelines + LTS-21.",
      mandatory: true,
      applicableTo: [
        "spacecraft_operation",
        "satellite_communications",
        "earth_observation",
        "in_orbit_services",
      ],
      articleRef: "OSHAA 2017 s. 8-11; Regs 2017 reg. 9",
    },
    {
      id: "nz-launch-licence",
      category: "operational_plan",
      title: "OSHAA Launch Licence",
      description:
        "A Launch Licence is required for each launch from NZ territory. Requires mission-risk analysis, failure-mode and effects analysis (FMEA), casualty-risk computation (target ≤ 1 × 10⁻⁴), range-safety coordination with NZDF where applicable, and indemnity + insurance arrangements (typically NZD 100M third-party minimum).",
      mandatory: true,
      applicableTo: ["launch_vehicle", "launch_site"],
      articleRef: "OSHAA 2017 s. 12-15; Regs 2017 reg. 14",
    },
    {
      id: "nz-overseas-launch",
      category: "operational_plan",
      title: "OSHAA Overseas Launch Licence",
      description:
        "NZ nationals launching from foreign territory must hold an Overseas Launch Licence. Aligns NZ state responsibility under OST Art. VI with extraterritorial NZ commercial activity, particularly relevant for NZ-domiciled satellite operators procuring launches from US, EU, or other jurisdictions.",
      mandatory: true,
      applicableTo: ["launch_vehicle", "spacecraft_operation"],
      articleRef: "OSHAA 2017 s. 16-19",
    },
    {
      id: "nz-facility-licence",
      category: "operational_plan",
      title: "OSHAA Facility Licence",
      description:
        "Launch facilities (spaceports) operating from NZ territory require a Facility Licence. Current licensed facility: Rocket Lab Launch Complex 1 (Mahia Peninsula). Facility licensing covers site-level safety, environmental impact, iwi consultation, and airspace coordination with CAA.",
      mandatory: true,
      applicableTo: ["launch_site"],
      articleRef: "OSHAA 2017 s. 20-24",
    },
    {
      id: "nz-return-licence",
      category: "operational_plan",
      title: "OSHAA Return Licence",
      description:
        "Controlled returns (re-entry) of NZ space objects, or of any object returning to NZ territory, require a Return Licence. Increasingly relevant for capsule recovery and in-orbit servicing missions that return hardware. Covers re-entry corridor planning, debris-risk assessment, and recovery-site coordination.",
      mandatory: false,
      applicableTo: ["spacecraft_operation", "in_orbit_services"],
      articleRef: "OSHAA 2017 s. 25-29",
    },
    {
      id: "nz-adr-ios-auth",
      category: "technical_assessment",
      title:
        "ADR / IOS authorisation (under OSHAA + 2023 NZSA Policy Statement)",
      description:
        "Active debris removal and in-orbit servicing missions require additional documentation under the 2023 NZSA Policy Statement on ADR/IOS. Requires documented client-state consent for non-cooperative rendezvous, abort-trajectory safety analysis, and servicer post-mission-disposal plan. Cross-recognition with FAA Part 450, UK CAA, and ESA Clean Space approvals reduces duplication.",
      mandatory: true,
      applicableTo: ["in_orbit_services"],
      articleRef: "OSHAA 2017 + NZSA Policy Statement on ADR/IOS (July 2023)",
    },
    {
      id: "nz-mfat-export",
      category: "technical_assessment",
      title: "MFAT strategic-goods export permit (dual-use space technology)",
      description:
        "Export of dual-use space technology from NZ requires an MFAT Export Controls Office permit under the Customs Export Prohibition Order 2017. NZ is a Wassenaar, MTCR, NSG, and Australia Group member. ITAR-controlled content is covered in parallel via the 2016 NZ-US Technology Safeguards Agreement for Rocket Lab operations.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef:
        "Customs and Excise Act 2018; NZ-US Technology Safeguards Agreement (2016)",
    },
  ],

  applicabilityRules: [
    {
      id: "nz-rule-person",
      description:
        "OSHAA 2017 applies to NZ persons and to any launch from NZ territory, plus cross-border operations triggering state responsibility under OST Art. VI",
      condition:
        "NZ-incorporated entity OR NZ national OR launch from NZ territory OR NZ-flagged space object",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "foreign"],
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage:
      "Determined per licence — typically NZD 100M third-party liability for orbital launches; case-by-case for ADR/IOS",
    governmentIndemnification: true,
    indemnificationCap:
      "Crown pays Convention claims above insurance floor with right of recourse against operator up to the licence-defined ceiling (OSHAA s. 15)",
    liabilityRegime: "capped",
    thirdPartyRequired: true,
  },

  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline:
      "Alignment with COPUOS Guidelines (2007) + LTS-21 (2019); NZSA following international PMD tightening trend (US FCC 5-year, ESA Zero Debris Std). Each licence specifies disposal commitments.",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
    standards: [
      "COPUOS Space Debris Mitigation Guidelines (2007)",
      "UN COPUOS LTS-21 (2019)",
      "ISO 24113 (Space systems — Space debris mitigation requirements)",
      "NZSA ADR/IOS Policy Statement (2023)",
    ],
  },

  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },

  timeline: {
    typicalProcessingWeeks: { min: 12, max: 26 },
    applicationFee:
      "OSHAA authorisation fees per Regs Schedule (NZD-scaled by mission complexity); MFAT export permits separate",
    otherCosts: [
      "Insurance premium (NZD 100M third-party baseline)",
      "MFAT export-control permit fees",
      "NZDF range-safety coordination (launches only)",
      "Iwi and local-authority consultation (spaceports)",
    ],
  },

  registration: {
    nationalRegistryExists: true,
    registryName:
      "New Zealand Registry of Space Objects (maintained by NZSA, submitted to UNOOSA via MFAT)",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "gap",
    description:
      "New Zealand is not an EU or EEA member — the EU Space Act will not apply domestically. NZ operators serving EU markets will be subject to the EU Space Act third-country operator (TCO) provisions (Art. 105-110), requiring equivalence assessment and compliance with key EU requirements even outside EU territory.",
    keyArticles: [
      "EU Space Act Art. 105-110 (TCO regime applicable to NZ operators)",
    ],
    transitionNotes:
      "NZ operators exporting satellite services into the EU should prepare a TCO compliance workstream in parallel with OSHAA licensing. Particularly relevant for NZ-based EO data providers and satellite communications operators.",
  },

  notes: [
    "Trigger event for OSHAA: Rocket Lab's commercial launches from Mahia, Launch Complex 1 (first orbital attempt 'It's a Test' 25 May 2017).",
    "First Southern-Hemisphere dedicated national space act.",
    "OSHAA gives MBIE/NZSA a five-licence structure: Payload Permit + Launch Licence + Overseas Launch Licence + Facility Licence + Return Licence.",
    "2023 NZSA Policy Statement on ADR/IOS makes NZ an early permissive-but-guardrailed jurisdiction for active debris removal missions.",
    "2016 NZ-US Technology Safeguards Agreement (TSA) enables ITAR-controlled US space technology to operate from NZ soil without constituting a US export.",
    "Co-regulation with CAA for airspace integration + high-altitude sub-orbital activities.",
  ],

  lastUpdated: "2026-04",
};

// ─── Export: Jurisdiction Data Map ───
//
// 2026-04 regulatory refresh: expanded from 10 to 19 European jurisdictions to cover
// every European country with an enacted national space activities law or
// an interim framework. 2026-04-21: added NZ (OSHAA 2017) — first non-EU/non-US
// jurisdiction with a dedicated national space act. Alphabetized by country
// code within region groups.

export const JURISDICTION_DATA = new Map<SpaceLawCountryCode, JurisdictionLaw>([
  // Core EU with dedicated space law
  ["FR", FR],
  ["DE", DE],
  ["IT", IT],
  ["UK", UK],
  ["LU", LU],
  ["NL", NL],
  ["BE", BE],
  ["ES", ES],
  ["AT", AT],
  ["PL", PL],
  // Nordics
  ["DK", DK],
  ["NO", NO],
  ["SE", SE],
  ["FI", FI],
  // Other enacted
  ["PT", PT],
  ["GR", GR],
  ["CZ", CZ],
  ["IE", IE],
  ["CH", CH],
  // Interim framework (no dedicated national space law)
  ["EE", EE],
  ["RO", RO],
  ["HU", HU],
  ["SI", SI],
  ["LV", LV],
  ["LT", LT],
  ["SK", SK],
  ["HR", HR],
  // Non-EU
  ["TR", TR],
  ["IS", IS],
  ["LI", LI],
  // Americas
  ["US", US],
  // Asia-Pacific
  ["NZ", NZ],
]);
