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

  licensingAuthority: {
    name: "German Aerospace Center (DLR)",
    nameLocal: "Deutsches Zentrum f\u00fcr Luft- und Raumfahrt",
    website: "https://www.dlr.de",
    contactEmail: "info@dlr.de",
    parentMinistry:
      "Federal Ministry for Economic Affairs and Climate Action (BMWK)",
  },

  licensingRequirements: [
    {
      id: "de-data-handling",
      category: "data_handling",
      title: "Remote Sensing Data Handling License",
      description:
        "Authorization required for operating high-resolution Earth observation systems and distributing remote sensing data. Covers acquisition, processing, and dissemination of satellite imagery.",
      mandatory: true,
      applicableTo: ["earth_observation"],
      articleRef: "\u00a7 3 SatDSiG",
    },
    {
      id: "de-security-clearance",
      category: "security_clearance",
      title: "Security Assessment for High-Resolution Data",
      description:
        "Security clearance required for distribution of high-resolution satellite data exceeding the 0.4m ground resolution threshold. Subject to Federal Intelligence Service review.",
      mandatory: true,
      applicableTo: ["earth_observation"],
      articleRef: "\u00a7 17 SatDSiG",
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
    "DLR serves as national space agency but lacks formal regulatory authority for most space activities",
    "SatDSiG is the only space-specific legislation, covering remote sensing data security only",
  ],

  lastUpdated: "2026-01",
};

// ─── Italy (IT) ───

const IT: JurisdictionLaw = {
  countryCode: "IT",
  countryName: "Italy",
  flagEmoji: "\u{1F1EE}\u{1F1F9}",

  legislation: {
    name: "Law 7/2018 on Space Activities",
    nameLocal:
      "Legge 11 gennaio 2018, n. 7 \u2013 Misure per il coordinamento della politica spaziale e aerospaziale",
    yearEnacted: 2018,
    status: "enacted",
    officialUrl:
      "https://www.gazzettaufficiale.it/eli/id/2018/02/02/18G00017/sg",
    keyArticles: "Articles 1-12",
  },

  licensingAuthority: {
    name: "Italian Space Agency (ASI)",
    nameLocal: "Agenzia Spaziale Italiana",
    website: "https://www.asi.it",
    contactEmail: "info@asi.it",
    parentMinistry: "Presidency of the Council of Ministers",
  },

  licensingRequirements: [
    {
      id: "it-tech-assessment",
      category: "technical_assessment",
      title: "Technical Assessment",
      description:
        "Comprehensive assessment of the space object and mission design, including demonstration of compliance with safety and technical standards.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 3",
    },
    {
      id: "it-insurance",
      category: "insurance",
      title: "Third-Party Liability Insurance",
      description:
        "Mandatory insurance coverage for third-party liability. Coverage amount determined by ASI on a case-by-case basis based on mission risk profile.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 7",
    },
    {
      id: "it-safety-assessment",
      category: "safety_assessment",
      title: "Safety Assessment",
      description:
        "Assessment of risks to persons, property, and the environment during all phases of the space activity, from launch through end of life.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 4",
    },
    {
      id: "it-debris-plan",
      category: "debris_plan",
      title: "Debris Mitigation Plan",
      description:
        "Plan for limiting the creation of space debris during the mission and ensuring compliance with international debris mitigation guidelines.",
      mandatory: true,
      applicableTo: ALL_GENERAL_ACTIVITIES,
      articleRef: "Art. 5",
    },
    {
      id: "it-end-of-life",
      category: "end_of_life_plan",
      title: "End-of-Life Disposal Plan",
      description:
        "Plan for post-mission disposal of the space object within 25 years, including deorbit strategy and passivation of all energy sources.",
      mandatory: true,
      applicableTo: ALL_ORBITAL_ACTIVITIES,
      articleRef: "Art. 5, ASI Guidelines",
    },
  ],

  applicabilityRules: [
    {
      id: "it-rule-jurisdiction",
      description:
        "Applies to space activities conducted by Italian entities or from Italian territory",
      condition:
        "Entity registered in Italy, Italian nationals, or activities launched from Italian territory (including San Marco platform, historically)",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic"],
      articleRef: "Art. 2",
    },
    {
      id: "it-rule-control",
      description:
        "Applies when an Italian entity exercises operational control over space objects",
      condition:
        "Italian entity directing or controlling space operations regardless of launch location",
      applies: true,
      activityTypes: ALL_GENERAL_ACTIVITIES,
      entityTypes: ["domestic", "eu_other"],
      articleRef: "Art. 2(2)",
    },
    {
      id: "it-rule-eu-entities",
      description:
        "EU entities launching under Italian coordination may be subject to Italian authorization",
      condition:
        "EU entity coordinating space activity through Italian facilities or ASI programs",
      applies: true,
      activityTypes: ["spacecraft_operation", "launch_vehicle"],
      entityTypes: ["eu_other"],
      articleRef: "Art. 2(3)",
    },
  ],

  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "Case-by-case (determined by ASI)",
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
    standards: [
      "IADC Space Debris Mitigation Guidelines",
      "ESA Space Debris Mitigation Requirements",
      "ISO 24113",
    ],
  },

  dataSensing: {
    remoteSensingLicense: true,
    dataDistributionRestrictions: true,
    resolutionRestrictions:
      "Provisions for remote sensing data governance; distribution of sensitive imagery subject to national security review",
  },

  timeline: {
    typicalProcessingWeeks: { min: 12, max: 20 },
    applicationFee: "\u20ac5,000\u2013\u20ac15,000",
    otherCosts: ["ASI technical review fees", "Insurance premiums"],
  },

  registration: {
    nationalRegistryExists: true,
    registryName: "ASI National Space Object Registry",
    unRegistrationRequired: true,
  },

  euSpaceActCrossRef: {
    relationship: "superseded",
    description:
      "Italian space law is relatively recent but implementation framework is still maturing. EU Space Act expected to provide more detailed requirements, particularly for debris mitigation, cybersecurity, and environmental footprint.",
    keyArticles: [
      "Art. 6-27 EU Space Act (Authorization)",
      "Art. 55-73 EU Space Act (Debris Mitigation)",
      "Art. 74-95 EU Space Act (Cybersecurity)",
    ],
    transitionNotes:
      "ASI expected to be designated as the national competent authority. Italy\u2019s existing framework provides a foundation but will require significant expansion to meet EU Space Act requirements.",
  },

  lastUpdated: "2026-01",
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

// ─── Export: Jurisdiction Data Map ───

export const JURISDICTION_DATA = new Map<SpaceLawCountryCode, JurisdictionLaw>([
  ["FR", FR],
  ["UK", UK],
  ["BE", BE],
  ["NL", NL],
  ["LU", LU],
  ["AT", AT],
  ["DK", DK],
  ["DE", DE],
  ["IT", IT],
  ["NO", NO],
]);
