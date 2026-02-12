/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary regulatory compliance mappings and data
 * that represent significant research and development investment.
 *
 * UK Space Industry Act 2018
 * Space Industry Regulations 2021
 * CAA (Civil Aviation Authority) Licensing Requirements
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ───

export type UkOperatorType =
  | "launch_operator"
  | "return_operator"
  | "satellite_operator"
  | "spaceport_operator"
  | "range_control";

export type UkActivityType =
  | "launch"
  | "return"
  | "orbital_operations"
  | "suborbital"
  | "spaceport_operations"
  | "range_services";

export type UkLicenseType =
  | "launch_licence"
  | "return_licence"
  | "orbital_operator_licence"
  | "spaceport_licence"
  | "range_control_licence";

export type UkRequirementCategory =
  | "operator_licensing"
  | "range_control"
  | "liability_insurance"
  | "safety"
  | "environmental"
  | "security"
  | "registration"
  | "informed_consent"
  | "emergency_response";

export type UkComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_assessed"
  | "not_applicable";

export type BindingLevel = "mandatory" | "recommended" | "guidance";

export interface UkSpaceProfile {
  operatorType: UkOperatorType;
  activityTypes: UkActivityType[];
  launchFromUk: boolean;
  launchToOrbit: boolean;
  isSuborbital: boolean;
  spacecraftMassKg?: number;
  hasUkNexus: boolean; // UK company or UK-controlled
  plannedLaunchSite?: string;
  targetOrbit?: string;
  missionDurationYears?: number;
  involvesPeople: boolean; // Human spaceflight
  isCommercial: boolean;
}

export interface UkSpaceRequirement {
  id: string;
  sectionRef: string;
  title: string;
  description: string;
  category: UkRequirementCategory;
  bindingLevel: BindingLevel;
  applicability: {
    operatorTypes?: UkOperatorType[];
    activityTypes?: UkActivityType[];
    launchFromUkOnly?: boolean;
    orbitalOnly?: boolean;
    suborbitalOnly?: boolean;
    humanSpaceflightOnly?: boolean;
    commercialOnly?: boolean;
    minSpacecraftMassKg?: number;
  };
  complianceQuestion: string;
  evidenceRequired: string[];
  implementationGuidance: string[];
  caaGuidanceRef?: string;
  euSpaceActCrossRef?: string[];
  severity: "critical" | "major" | "minor";
  licenseTypes: UkLicenseType[];
}

export interface UkEuComparison {
  ukRequirement: string;
  euEquivalent: string | null;
  comparisonNotes: string;
  postBrexitImplications: string;
}

// ─── Configuration ───

export const operatorTypeConfig: Record<
  UkOperatorType,
  { label: string; description: string; icon: string }
> = {
  launch_operator: {
    label: "Launch Operator",
    description: "Conducts launch activities from UK or under UK jurisdiction",
    icon: "Rocket",
  },
  return_operator: {
    label: "Return Operator",
    description: "Conducts controlled return of spacecraft/launch vehicles",
    icon: "ArrowDownCircle",
  },
  satellite_operator: {
    label: "Satellite Operator",
    description: "Operates satellites in orbit under UK jurisdiction",
    icon: "Satellite",
  },
  spaceport_operator: {
    label: "Spaceport Operator",
    description: "Operates a licensed UK spaceport facility",
    icon: "Building2",
  },
  range_control: {
    label: "Range Control",
    description: "Provides range control services for spaceflight activities",
    icon: "Radio",
  },
};

export const activityTypeConfig: Record<
  UkActivityType,
  { label: string; description: string }
> = {
  launch: {
    label: "Launch",
    description: "Launch of spacecraft or carrier vehicle",
  },
  return: { label: "Return", description: "Controlled return of spacecraft" },
  orbital_operations: {
    label: "Orbital Operations",
    description: "In-orbit satellite operations",
  },
  suborbital: {
    label: "Suborbital",
    description: "Suborbital spaceflight activities",
  },
  spaceport_operations: {
    label: "Spaceport Operations",
    description: "Operation of spaceport facilities",
  },
  range_services: {
    label: "Range Services",
    description: "Provision of range control services",
  },
};

export const licenseTypeConfig: Record<
  UkLicenseType,
  { label: string; regulator: string; section: string }
> = {
  launch_licence: {
    label: "Launch Licence",
    regulator: "CAA",
    section: "SIA s.3",
  },
  return_licence: {
    label: "Return Licence",
    regulator: "CAA",
    section: "SIA s.3",
  },
  orbital_operator_licence: {
    label: "Orbital Operator Licence",
    regulator: "CAA",
    section: "SIA s.7",
  },
  spaceport_licence: {
    label: "Spaceport Licence",
    regulator: "CAA",
    section: "SIA s.5",
  },
  range_control_licence: {
    label: "Range Control Licence",
    regulator: "CAA",
    section: "SIA s.6",
  },
};

export const categoryConfig: Record<
  UkRequirementCategory,
  { label: string; color: string }
> = {
  operator_licensing: { label: "Operator Licensing", color: "blue" },
  range_control: { label: "Range Control", color: "purple" },
  liability_insurance: { label: "Liability & Insurance", color: "amber" },
  safety: { label: "Safety", color: "red" },
  environmental: { label: "Environmental", color: "green" },
  security: { label: "Security", color: "orange" },
  registration: { label: "Registration", color: "cyan" },
  informed_consent: { label: "Informed Consent", color: "pink" },
  emergency_response: { label: "Emergency Response", color: "rose" },
};

export const complianceStatusConfig: Record<
  UkComplianceStatus,
  { label: string; color: string; icon: string }
> = {
  compliant: { label: "Compliant", color: "green", icon: "CheckCircle2" },
  partial: { label: "Partial", color: "amber", icon: "AlertTriangle" },
  non_compliant: { label: "Non-Compliant", color: "red", icon: "XCircle" },
  not_assessed: { label: "Not Assessed", color: "slate", icon: "HelpCircle" },
  not_applicable: { label: "N/A", color: "gray", icon: "MinusCircle" },
};

// ─── UK Space Industry Act 2018 Requirements ───

export const ukSiaRequirements: UkSpaceRequirement[] = [
  // Part 1: Operator Licensing
  {
    id: "uk-sia-s3-licence",
    sectionRef: "SIA s.3",
    title: "Requirement for Launch/Return Licence",
    description:
      "A person must not carry out spaceflight activities in the UK, or procure the carrying out of such activities, without a licence granted by the regulator.",
    category: "operator_licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator", "return_operator"],
      activityTypes: ["launch", "return"],
    },
    complianceQuestion:
      "Do you hold a valid CAA launch or return licence for your spaceflight activities?",
    evidenceRequired: [
      "CAA licence application submission",
      "Licence granted confirmation",
      "Licence conditions documentation",
    ],
    implementationGuidance: [
      "Submit application to CAA Spaceflight Team",
      "Allow minimum 6 months for licence processing",
      "Ensure financial and technical capability demonstration",
    ],
    caaGuidanceRef: "CAP 2210",
    euSpaceActCrossRef: ["Art. 4", "Art. 5"],
    severity: "critical",
    licenseTypes: ["launch_licence", "return_licence"],
  },
  {
    id: "uk-sia-s5-spaceport",
    sectionRef: "SIA s.5",
    title: "Spaceport Licence Requirement",
    description:
      "A person must not operate a spaceport in the UK without a spaceport licence granted by the regulator.",
    category: "operator_licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["spaceport_operator"],
      activityTypes: ["spaceport_operations"],
    },
    complianceQuestion:
      "Do you hold a valid CAA spaceport licence for your facility?",
    evidenceRequired: [
      "Spaceport licence application",
      "Safety case documentation",
      "Environmental impact assessment",
      "Planning permissions",
    ],
    implementationGuidance: [
      "Engage with CAA early in spaceport development",
      "Conduct environmental impact assessment",
      "Develop comprehensive safety case",
      "Obtain local authority planning consent",
    ],
    caaGuidanceRef: "CAP 2211",
    severity: "critical",
    licenseTypes: ["spaceport_licence"],
  },
  {
    id: "uk-sia-s6-range",
    sectionRef: "SIA s.6",
    title: "Range Control Licence Requirement",
    description:
      "A person must not provide range control services in the UK for spaceflight activities without a range control licence.",
    category: "range_control",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["range_control"],
      activityTypes: ["range_services"],
    },
    complianceQuestion: "Do you hold a valid CAA range control licence?",
    evidenceRequired: [
      "Range control licence application",
      "Range safety documentation",
      "Communications and tracking capabilities",
    ],
    implementationGuidance: [
      "Demonstrate range safety capabilities",
      "Establish tracking and telemetry systems",
      "Develop flight termination procedures",
    ],
    caaGuidanceRef: "CAP 2212",
    severity: "critical",
    licenseTypes: ["range_control_licence"],
  },
  {
    id: "uk-sia-s7-orbital",
    sectionRef: "SIA s.7",
    title: "Orbital Operator Licence Requirement",
    description:
      "UK persons procuring the launch of a space object, or operating a space object in orbit, require an orbital operator licence.",
    category: "operator_licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
      activityTypes: ["orbital_operations"],
      orbitalOnly: true,
    },
    complianceQuestion:
      "Do you hold a valid CAA orbital operator licence for your satellite operations?",
    evidenceRequired: [
      "Orbital operator licence application",
      "Mission description",
      "Debris mitigation plan",
      "Third party liability insurance",
    ],
    implementationGuidance: [
      "Apply to CAA for orbital operator licence",
      "Demonstrate compliance with debris mitigation guidelines",
      "Secure adequate third party liability insurance",
    ],
    caaGuidanceRef: "CAP 2213",
    euSpaceActCrossRef: ["Art. 7", "Art. 8"],
    severity: "critical",
    licenseTypes: ["orbital_operator_licence"],
  },
  {
    id: "uk-sia-s8-exemptions",
    sectionRef: "SIA s.8",
    title: "Exemptions from Licensing",
    description:
      "The regulator may grant exemptions from licensing requirements in certain circumstances, such as for governmental activities.",
    category: "operator_licensing",
    bindingLevel: "guidance",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "satellite_operator",
        "return_operator",
      ],
    },
    complianceQuestion:
      "Have you determined whether any licensing exemptions apply to your activities?",
    evidenceRequired: [
      "Exemption application (if applicable)",
      "Legal analysis of exemption eligibility",
    ],
    implementationGuidance: [
      "Review exemption criteria in SIA s.8",
      "Consult with CAA on potential exemption eligibility",
      "Note: Most commercial activities will require full licensing",
    ],
    severity: "minor",
    licenseTypes: [],
  },

  // Part 2: Safety Requirements
  {
    id: "uk-sia-s17-safety-regs",
    sectionRef: "SIA s.17 / SIR Part 4",
    title: "Safety Regulations Compliance",
    description:
      "Licence holders must comply with safety regulations made under the Act, including safety cases, risk assessments, and safety management systems.",
    category: "safety",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "spaceport_operator",
        "range_control",
      ],
      launchFromUkOnly: true,
    },
    complianceQuestion:
      "Have you developed and implemented a compliant safety management system?",
    evidenceRequired: [
      "Safety case documentation",
      "Hazard identification and risk assessment",
      "Safety management system manual",
      "Emergency response procedures",
    ],
    implementationGuidance: [
      "Develop comprehensive safety case per CAA guidance",
      "Identify all hazards and assess risks",
      "Implement systematic safety management",
      "Conduct regular safety reviews and audits",
    ],
    caaGuidanceRef: "CAP 2214",
    euSpaceActCrossRef: ["Art. 58", "Art. 59"],
    severity: "critical",
    licenseTypes: [
      "launch_licence",
      "return_licence",
      "spaceport_licence",
      "range_control_licence",
    ],
  },
  {
    id: "uk-sir-reg9-safety-case",
    sectionRef: "SIR Reg.9",
    title: "Safety Case Requirement",
    description:
      "A safety case demonstrating that risks are as low as reasonably practicable (ALARP) must be submitted as part of licence application.",
    category: "safety",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "spaceport_operator",
      ],
      launchFromUkOnly: true,
    },
    complianceQuestion:
      "Have you developed a safety case demonstrating risks are ALARP?",
    evidenceRequired: [
      "Safety case document",
      "ALARP demonstration",
      "Quantitative risk assessment",
      "Independent safety review",
    ],
    implementationGuidance: [
      "Apply ALARP principle to all identified risks",
      "Document risk reduction measures",
      "Consider independent safety assessment",
      "Update safety case throughout mission lifecycle",
    ],
    caaGuidanceRef: "CAP 2215",
    severity: "critical",
    licenseTypes: ["launch_licence", "return_licence", "spaceport_licence"],
  },
  {
    id: "uk-sir-reg14-ground-safety",
    sectionRef: "SIR Reg.14",
    title: "Ground Safety Requirements",
    description:
      "Measures must be in place to protect persons on the ground from risks arising from spaceflight activities.",
    category: "safety",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "spaceport_operator",
      ],
      launchFromUkOnly: true,
    },
    complianceQuestion: "Have you implemented adequate ground safety measures?",
    evidenceRequired: [
      "Ground safety plan",
      "Exclusion zone analysis",
      "Public notification procedures",
      "Debris hazard assessment",
    ],
    implementationGuidance: [
      "Calculate required exclusion zones",
      "Establish public notification procedures",
      "Coordinate with local authorities",
      "Plan for debris recovery",
    ],
    caaGuidanceRef: "CAP 2216",
    severity: "critical",
    licenseTypes: ["launch_licence", "return_licence", "spaceport_licence"],
  },
  {
    id: "uk-sir-reg15-flight-safety",
    sectionRef: "SIR Reg.15",
    title: "Flight Safety Requirements",
    description:
      "Flight safety systems and procedures must be in place to ensure safe conduct of spaceflight and ability to terminate flight if necessary.",
    category: "safety",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator", "return_operator"],
      activityTypes: ["launch", "return"],
    },
    complianceQuestion:
      "Do you have adequate flight safety systems including flight termination capability?",
    evidenceRequired: [
      "Flight safety plan",
      "Flight termination system design",
      "Tracking and telemetry systems",
      "Go/no-go criteria documentation",
    ],
    implementationGuidance: [
      "Implement reliable tracking systems",
      "Design flight termination system per CAA requirements",
      "Establish clear go/no-go decision criteria",
      "Test flight safety systems thoroughly",
    ],
    caaGuidanceRef: "CAP 2217",
    severity: "critical",
    licenseTypes: ["launch_licence", "return_licence"],
  },

  // Part 3: Liability and Insurance
  {
    id: "uk-sia-s34-liability",
    sectionRef: "SIA s.34",
    title: "Operator Liability for Injury and Damage",
    description:
      "An operator is liable for injury or damage caused by their spaceflight activities, subject to the liability provisions of the Act.",
    category: "liability_insurance",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "satellite_operator",
      ],
    },
    complianceQuestion:
      "Do you understand and accept your liability obligations under the SIA?",
    evidenceRequired: [
      "Liability acknowledgement",
      "Legal analysis of liability exposure",
      "Indemnification arrangements",
    ],
    implementationGuidance: [
      "Obtain legal advice on liability exposure",
      "Consider liability allocation in contracts",
      "Understand strict liability regime for surface damage",
    ],
    euSpaceActCrossRef: ["Art. 37", "Art. 38"],
    severity: "critical",
    licenseTypes: [
      "launch_licence",
      "return_licence",
      "orbital_operator_licence",
    ],
  },
  {
    id: "uk-sia-s36-indemnity",
    sectionRef: "SIA s.36",
    title: "Indemnity to Government",
    description:
      "Operators must indemnify the UK government against claims arising from their spaceflight activities under international law.",
    category: "liability_insurance",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "satellite_operator",
      ],
    },
    complianceQuestion:
      "Have you provided the required indemnity to the UK government?",
    evidenceRequired: ["Government indemnity agreement", "Legal documentation"],
    implementationGuidance: [
      "Execute standard government indemnity",
      "Understand scope of indemnity obligation",
      "Consider impact on insurance arrangements",
    ],
    euSpaceActCrossRef: ["Art. 37"],
    severity: "critical",
    licenseTypes: [
      "launch_licence",
      "return_licence",
      "orbital_operator_licence",
    ],
  },
  {
    id: "uk-sia-s38-insurance",
    sectionRef: "SIA s.38 / SIR Part 7",
    title: "Insurance Requirements",
    description:
      "Licensees must maintain third party liability insurance to the satisfaction of the regulator.",
    category: "liability_insurance",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "satellite_operator",
        "spaceport_operator",
      ],
    },
    complianceQuestion:
      "Do you maintain adequate third party liability insurance as required by your licence?",
    evidenceRequired: [
      "Insurance policy documents",
      "Certificate of insurance",
      "Coverage amount confirmation",
      "Insurance renewal procedures",
    ],
    implementationGuidance: [
      "Obtain TPL insurance from approved providers",
      "Minimum coverage typically EUR 60M for orbital activities",
      "Ensure coverage meets CAA specifications",
      "Maintain insurance throughout licence validity",
    ],
    caaGuidanceRef: "CAP 2218",
    euSpaceActCrossRef: ["Art. 39", "Art. 40", "Art. 41"],
    severity: "critical",
    licenseTypes: [
      "launch_licence",
      "return_licence",
      "orbital_operator_licence",
      "spaceport_licence",
    ],
  },
  {
    id: "uk-sir-reg55-insurance-amount",
    sectionRef: "SIR Reg.55",
    title: "Insurance Amount Determination",
    description:
      "The regulator determines the required insurance amount based on maximum probable loss assessment.",
    category: "liability_insurance",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "satellite_operator",
      ],
    },
    complianceQuestion: "Has the CAA confirmed your required insurance amount?",
    evidenceRequired: [
      "Maximum probable loss assessment",
      "CAA insurance amount determination",
      "Insurance policy matching required amount",
    ],
    implementationGuidance: [
      "Submit maximum probable loss analysis to CAA",
      "Obtain insurance quote matching CAA determination",
      "Standard minimum is around GBP 60M for orbital",
    ],
    caaGuidanceRef: "CAP 2218",
    severity: "critical",
    licenseTypes: [
      "launch_licence",
      "return_licence",
      "orbital_operator_licence",
    ],
  },

  // Part 4: Environmental Requirements
  {
    id: "uk-sia-s18-environment",
    sectionRef: "SIA s.18 / SIR Part 5",
    title: "Environmental Protection Duties",
    description:
      "Operators must take all reasonable steps to prevent adverse effects on the environment, including space debris mitigation.",
    category: "environmental",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "satellite_operator",
      ],
    },
    complianceQuestion:
      "Have you implemented environmental protection measures for your space activities?",
    evidenceRequired: [
      "Environmental impact assessment",
      "Debris mitigation plan",
      "End-of-life disposal plan",
    ],
    implementationGuidance: [
      "Conduct environmental impact assessment",
      "Develop debris mitigation plan per ISO 24113",
      "Plan for responsible end-of-life disposal",
    ],
    caaGuidanceRef: "CAP 2219",
    euSpaceActCrossRef: ["Art. 67", "Art. 72", "Art. 73"],
    severity: "critical",
    licenseTypes: ["launch_licence", "orbital_operator_licence"],
  },
  {
    id: "uk-sir-reg31-debris-mitigation",
    sectionRef: "SIR Reg.31",
    title: "Space Debris Mitigation",
    description:
      "Orbital operators must submit a debris mitigation plan demonstrating compliance with debris mitigation requirements.",
    category: "environmental",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator", "launch_operator"],
      orbitalOnly: true,
    },
    complianceQuestion:
      "Have you submitted a compliant debris mitigation plan to the CAA?",
    evidenceRequired: [
      "Debris mitigation plan",
      "25-year deorbit compliance demonstration",
      "Passivation plan",
      "Collision avoidance procedures",
    ],
    implementationGuidance: [
      "Follow ISO 24113 and IADC guidelines",
      "Demonstrate 25-year post-mission deorbit",
      "Plan for passivation of energy sources",
      "Establish collision avoidance procedures",
    ],
    caaGuidanceRef: "CAP 2220",
    euSpaceActCrossRef: ["Art. 67", "Art. 72"],
    severity: "critical",
    licenseTypes: ["orbital_operator_licence", "launch_licence"],
  },
  {
    id: "uk-sir-reg32-eol-disposal",
    sectionRef: "SIR Reg.32",
    title: "End-of-Life Disposal Plan",
    description:
      "A plan for post-mission disposal of spacecraft must be submitted, demonstrating compliance with the 25-year rule.",
    category: "environmental",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
      orbitalOnly: true,
    },
    complianceQuestion:
      "Does your end-of-life disposal plan meet the 25-year requirement?",
    evidenceRequired: [
      "End-of-life disposal plan",
      "Orbital lifetime analysis",
      "Deorbit capability demonstration",
      "Propellant budget for disposal",
    ],
    implementationGuidance: [
      "Calculate orbital lifetime post-mission",
      "Design active deorbit capability if needed",
      "Reserve propellant for disposal maneuver",
      "Consider 5-year best practice standard",
    ],
    caaGuidanceRef: "CAP 2220",
    euSpaceActCrossRef: ["Art. 72"],
    severity: "critical",
    licenseTypes: ["orbital_operator_licence"],
  },
  {
    id: "uk-sir-reg33-reentry-safety",
    sectionRef: "SIR Reg.33",
    title: "Re-entry Safety Assessment",
    description:
      "For spacecraft re-entering the atmosphere, an assessment of ground casualty risk must demonstrate acceptable risk levels.",
    category: "environmental",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator", "return_operator"],
      orbitalOnly: true,
    },
    complianceQuestion:
      "Does your re-entry casualty risk assessment meet the 1:10,000 threshold?",
    evidenceRequired: [
      "Re-entry casualty risk assessment",
      "Demise analysis",
      "Controlled re-entry plan (if required)",
    ],
    implementationGuidance: [
      "Calculate casualty expectation (target <1:10,000)",
      "Design for demise where possible",
      "Consider controlled re-entry for larger spacecraft",
    ],
    caaGuidanceRef: "CAP 2220",
    euSpaceActCrossRef: ["Art. 73"],
    severity: "critical",
    licenseTypes: ["orbital_operator_licence", "return_licence"],
  },

  // Part 5: Registration Requirements
  {
    id: "uk-sia-s61-registration",
    sectionRef: "SIA s.61",
    title: "UK Space Registry",
    description:
      "Space objects launched under UK jurisdiction must be registered in the UK Register of Space Objects.",
    category: "registration",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator", "satellite_operator"],
      orbitalOnly: true,
    },
    complianceQuestion:
      "Have you registered your space object in the UK Register of Space Objects?",
    evidenceRequired: [
      "Registration application submission",
      "Registration confirmation",
      "Object identification details",
    ],
    implementationGuidance: [
      "Submit registration to UK Space Agency",
      "Include orbital parameters and mission details",
      "Update registration for status changes",
    ],
    euSpaceActCrossRef: ["Art. 52", "Art. 53"],
    severity: "critical",
    licenseTypes: ["launch_licence", "orbital_operator_licence"],
  },
  {
    id: "uk-sir-reg62-registration-info",
    sectionRef: "SIR Reg.62",
    title: "Registration Information Requirements",
    description:
      "Specific information must be provided for registration, including designator, launch details, and orbital parameters.",
    category: "registration",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator", "satellite_operator"],
      orbitalOnly: true,
    },
    complianceQuestion:
      "Have you provided all required information for space object registration?",
    evidenceRequired: [
      "Complete registration form",
      "Object designator",
      "Launch date and site",
      "Orbital parameters",
      "General function description",
    ],
    implementationGuidance: [
      "Provide: name, designator, launch state, date, territory",
      "Include nodal period, inclination, apogee, perigee",
      "Describe general function of space object",
    ],
    severity: "major",
    licenseTypes: ["launch_licence", "orbital_operator_licence"],
  },

  // Part 6: Security Requirements
  {
    id: "uk-sir-reg41-security",
    sectionRef: "SIR Reg.41",
    title: "Security Requirements",
    description:
      "Operators must implement appropriate security measures to protect spaceflight activities and infrastructure.",
    category: "security",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator", "spaceport_operator", "range_control"],
      launchFromUkOnly: true,
    },
    complianceQuestion:
      "Have you implemented required security measures for your operations?",
    evidenceRequired: [
      "Security plan",
      "Access control procedures",
      "Personnel vetting records",
      "Cyber security measures",
    ],
    implementationGuidance: [
      "Develop comprehensive security plan",
      "Implement physical and cyber security",
      "Conduct personnel security vetting",
      "Coordinate with security services as required",
    ],
    caaGuidanceRef: "CAP 2221",
    euSpaceActCrossRef: ["Art. 76", "Art. 77"],
    severity: "critical",
    licenseTypes: [
      "launch_licence",
      "spaceport_licence",
      "range_control_licence",
    ],
  },
  {
    id: "uk-sir-reg42-cyber",
    sectionRef: "SIR Reg.42",
    title: "Cyber Security Requirements",
    description:
      "Appropriate cyber security measures must be in place to protect systems critical to spaceflight safety.",
    category: "security",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "satellite_operator",
        "spaceport_operator",
        "range_control",
      ],
    },
    complianceQuestion:
      "Have you implemented cyber security measures for mission-critical systems?",
    evidenceRequired: [
      "Cyber security assessment",
      "Security controls documentation",
      "Incident response procedures",
    ],
    implementationGuidance: [
      "Assess cyber risks to space systems",
      "Implement appropriate security controls",
      "Develop incident response capability",
      "Consider NCSC guidance for space sector",
    ],
    caaGuidanceRef: "CAP 2222",
    euSpaceActCrossRef: ["Art. 76", "Art. 77", "Art. 78"],
    severity: "critical",
    licenseTypes: [
      "launch_licence",
      "orbital_operator_licence",
      "spaceport_licence",
      "range_control_licence",
    ],
  },

  // Part 7: Informed Consent (Human Spaceflight)
  {
    id: "uk-sia-s16-informed-consent",
    sectionRef: "SIA s.16 / SIR Part 6",
    title: "Informed Consent for Human Spaceflight",
    description:
      "Individuals participating in human spaceflight must give informed consent acknowledging the risks involved.",
    category: "informed_consent",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator", "return_operator"],
      humanSpaceflightOnly: true,
    },
    complianceQuestion:
      "Do you have processes for obtaining informed consent from spaceflight participants?",
    evidenceRequired: [
      "Informed consent forms",
      "Risk disclosure documentation",
      "Participant acknowledgement records",
    ],
    implementationGuidance: [
      "Develop comprehensive risk disclosure",
      "Obtain written informed consent",
      "Ensure participants understand risks",
      "Maintain consent records",
    ],
    caaGuidanceRef: "CAP 2223",
    severity: "critical",
    licenseTypes: ["launch_licence", "return_licence"],
  },
  {
    id: "uk-sir-reg46-medical",
    sectionRef: "SIR Reg.46",
    title: "Medical Requirements for Participants",
    description:
      "Spaceflight participants may be subject to medical requirements to ensure fitness for spaceflight.",
    category: "informed_consent",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator", "return_operator"],
      humanSpaceflightOnly: true,
    },
    complianceQuestion:
      "Do you have medical screening procedures for spaceflight participants?",
    evidenceRequired: [
      "Medical screening procedures",
      "Fitness standards",
      "Medical examination records",
    ],
    implementationGuidance: [
      "Establish medical screening criteria",
      "Conduct pre-flight medical examinations",
      "Document fitness determinations",
    ],
    caaGuidanceRef: "CAP 2223",
    severity: "major",
    licenseTypes: ["launch_licence", "return_licence"],
  },

  // Part 8: Emergency Response
  {
    id: "uk-sir-reg19-emergency",
    sectionRef: "SIR Reg.19",
    title: "Emergency Response Planning",
    description:
      "Operators must have emergency response plans coordinated with relevant authorities.",
    category: "emergency_response",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "spaceport_operator",
      ],
      launchFromUkOnly: true,
    },
    complianceQuestion:
      "Do you have an emergency response plan coordinated with relevant authorities?",
    evidenceRequired: [
      "Emergency response plan",
      "Coordination agreements with emergency services",
      "Emergency exercise records",
    ],
    implementationGuidance: [
      "Develop comprehensive emergency response plan",
      "Coordinate with local emergency services",
      "Conduct emergency response exercises",
      "Establish communication protocols",
    ],
    caaGuidanceRef: "CAP 2224",
    severity: "critical",
    licenseTypes: ["launch_licence", "return_licence", "spaceport_licence"],
  },
  {
    id: "uk-sir-reg20-incident-reporting",
    sectionRef: "SIR Reg.20",
    title: "Incident Reporting Requirements",
    description:
      "Safety-related incidents must be reported to the CAA within specified timeframes.",
    category: "emergency_response",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "satellite_operator",
        "spaceport_operator",
        "range_control",
      ],
    },
    complianceQuestion:
      "Do you have procedures for mandatory incident reporting to the CAA?",
    evidenceRequired: [
      "Incident reporting procedures",
      "Incident report forms",
      "Reporting timeline documentation",
    ],
    implementationGuidance: [
      "Establish incident classification criteria",
      "Report serious incidents within 24 hours",
      "Maintain incident records",
      "Conduct incident investigations",
    ],
    caaGuidanceRef: "CAP 2225",
    euSpaceActCrossRef: ["Art. 47", "Art. 48"],
    severity: "critical",
    licenseTypes: [
      "launch_licence",
      "return_licence",
      "orbital_operator_licence",
      "spaceport_licence",
      "range_control_licence",
    ],
  },

  // Additional CAA Guidance Requirements
  {
    id: "uk-caa-technical-capability",
    sectionRef: "CAA Guidance",
    title: "Technical Capability Demonstration",
    description:
      "Applicants must demonstrate adequate technical capability to safely conduct their proposed activities.",
    category: "operator_licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "satellite_operator",
        "spaceport_operator",
        "range_control",
      ],
    },
    complianceQuestion:
      "Can you demonstrate adequate technical capability for your proposed activities?",
    evidenceRequired: [
      "Technical capability statement",
      "Key personnel qualifications",
      "Systems engineering documentation",
      "Test and verification plans",
    ],
    implementationGuidance: [
      "Document technical team qualifications",
      "Demonstrate systems engineering process",
      "Show adequate test and verification approach",
      "Evidence prior relevant experience",
    ],
    caaGuidanceRef: "CAP 2210",
    severity: "critical",
    licenseTypes: [
      "launch_licence",
      "return_licence",
      "orbital_operator_licence",
      "spaceport_licence",
      "range_control_licence",
    ],
  },
  {
    id: "uk-caa-financial-capability",
    sectionRef: "CAA Guidance",
    title: "Financial Capability Demonstration",
    description:
      "Applicants must demonstrate adequate financial resources to safely conduct activities and meet obligations.",
    category: "operator_licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "satellite_operator",
        "spaceport_operator",
      ],
    },
    complianceQuestion:
      "Can you demonstrate adequate financial capability for your operations?",
    evidenceRequired: [
      "Financial statements",
      "Business plan",
      "Funding confirmation",
      "Insurance capability evidence",
    ],
    implementationGuidance: [
      "Provide audited financial statements",
      "Show adequate funding for operations",
      "Demonstrate ability to obtain required insurance",
      "Evidence contingency funding",
    ],
    caaGuidanceRef: "CAP 2210",
    severity: "critical",
    licenseTypes: [
      "launch_licence",
      "return_licence",
      "orbital_operator_licence",
      "spaceport_licence",
    ],
  },
  {
    id: "uk-caa-continuous-compliance",
    sectionRef: "SIR Reg.70",
    title: "Continuous Compliance Obligation",
    description:
      "Licence holders must maintain continuous compliance with licence conditions throughout the licence period.",
    category: "operator_licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "return_operator",
        "satellite_operator",
        "spaceport_operator",
        "range_control",
      ],
    },
    complianceQuestion:
      "Do you have processes to ensure continuous compliance with licence conditions?",
    evidenceRequired: [
      "Compliance monitoring procedures",
      "Internal audit records",
      "Corrective action processes",
    ],
    implementationGuidance: [
      "Establish compliance monitoring system",
      "Conduct regular internal audits",
      "Maintain corrective action procedures",
      "Report changes to CAA as required",
    ],
    caaGuidanceRef: "CAP 2226",
    severity: "critical",
    licenseTypes: [
      "launch_licence",
      "return_licence",
      "orbital_operator_licence",
      "spaceport_licence",
      "range_control_licence",
    ],
  },
];

// ─── UK-EU Post-Brexit Comparison ───

export const ukEuComparisons: UkEuComparison[] = [
  {
    ukRequirement: "SIA s.3 - Launch/Return Licence",
    euEquivalent: "EU Space Act Art. 4-6 - Authorization Requirement",
    comparisonNotes:
      "Both require authorization for launch activities. UK licence valid for UK launches only; EU authorization for EU member state activities.",
    postBrexitImplications:
      "UK operators must obtain separate licences for UK and EU activities. No mutual recognition.",
  },
  {
    ukRequirement: "SIA s.7 - Orbital Operator Licence",
    euEquivalent: "EU Space Act Art. 7-8 - Space Operation Authorization",
    comparisonNotes:
      "Similar scope covering satellite operations. UK licence required for UK persons regardless of launch location.",
    postBrexitImplications:
      "UK satellite operators need UK licence; if also operating from EU, may need dual authorization.",
  },
  {
    ukRequirement: "SIA s.38 - Insurance Requirements",
    euEquivalent: "EU Space Act Art. 39-41 - Insurance Obligations",
    comparisonNotes:
      "Both require third party liability insurance. UK typically EUR 60M minimum; EU framework allows national variation.",
    postBrexitImplications:
      "Insurance from UK insurers may need separate verification for EU operations.",
  },
  {
    ukRequirement: "SIR Reg.31 - Debris Mitigation",
    euEquivalent: "EU Space Act Art. 67 - Debris Mitigation Plan",
    comparisonNotes:
      "Both align with ISO 24113 and IADC guidelines. 25-year deorbit rule applies in both regimes.",
    postBrexitImplications:
      "Technical requirements largely aligned; compliance demonstration may differ.",
  },
  {
    ukRequirement: "SIA s.61 - UK Space Registry",
    euEquivalent: "EU Space Act Art. 52-54 - Registration Requirements",
    comparisonNotes:
      "Both maintain national registries per Registration Convention. UK no longer contributes to EU registry.",
    postBrexitImplications:
      "Dual registration may be needed if object has UK and EU state of registry aspects.",
  },
  {
    ukRequirement: "SIR Reg.42 - Cyber Security",
    euEquivalent: "EU Space Act Art. 76-78 + NIS2 Directive",
    comparisonNotes:
      "UK requires cyber security measures; EU framework combines Space Act with NIS2 requirements.",
    postBrexitImplications:
      "UK operators active in EU may face both UK and EU cyber security requirements.",
  },
  {
    ukRequirement: "SIA s.36 - Government Indemnity",
    euEquivalent: "EU Space Act Art. 37 - State Liability",
    comparisonNotes:
      "Both require operators to indemnify their government. UK indemnity is to Crown; EU to respective member state.",
    postBrexitImplications:
      "Separate indemnities required for UK and any EU member state involvement.",
  },
];

// ─── Combined Requirements ───

export const allUkSpaceRequirements = ukSiaRequirements;

// ─── Helper Functions ───

export function getOperatorLicenseType(
  operatorType: UkOperatorType,
): UkLicenseType | null {
  const mapping: Record<UkOperatorType, UkLicenseType> = {
    launch_operator: "launch_licence",
    return_operator: "return_licence",
    satellite_operator: "orbital_operator_licence",
    spaceport_operator: "spaceport_licence",
    range_control: "range_control_licence",
  };
  return mapping[operatorType] ?? null;
}

export function getApplicableRequirements(
  profile: UkSpaceProfile,
): UkSpaceRequirement[] {
  return allUkSpaceRequirements.filter((req) => {
    const app = req.applicability;

    // Check operator type
    if (
      app.operatorTypes &&
      !app.operatorTypes.includes(profile.operatorType)
    ) {
      return false;
    }

    // Check activity types
    if (
      app.activityTypes &&
      !profile.activityTypes.some((a) => app.activityTypes!.includes(a))
    ) {
      return false;
    }

    // Check UK launch requirement
    if (app.launchFromUkOnly && !profile.launchFromUk) {
      return false;
    }

    // Check orbital/suborbital
    if (app.orbitalOnly && !profile.launchToOrbit) {
      return false;
    }
    if (app.suborbitalOnly && !profile.isSuborbital) {
      return false;
    }

    // Check human spaceflight
    if (app.humanSpaceflightOnly && !profile.involvesPeople) {
      return false;
    }

    // Check commercial
    if (app.commercialOnly && !profile.isCommercial) {
      return false;
    }

    // Check mass
    if (
      app.minSpacecraftMassKg &&
      profile.spacecraftMassKg &&
      profile.spacecraftMassKg < app.minSpacecraftMassKg
    ) {
      return false;
    }

    return true;
  });
}

export function getRequirementsByCategory(
  category: UkRequirementCategory,
): UkSpaceRequirement[] {
  return allUkSpaceRequirements.filter((r) => r.category === category);
}

export function getRequirementsByLicenseType(
  licenseType: UkLicenseType,
): UkSpaceRequirement[] {
  return allUkSpaceRequirements.filter((r) =>
    r.licenseTypes.includes(licenseType),
  );
}

export function getMandatoryRequirements(): UkSpaceRequirement[] {
  return allUkSpaceRequirements.filter((r) => r.bindingLevel === "mandatory");
}

export function getCriticalRequirements(): UkSpaceRequirement[] {
  return allUkSpaceRequirements.filter((r) => r.severity === "critical");
}

export function getRequirementsWithEuCrossRef(): UkSpaceRequirement[] {
  return allUkSpaceRequirements.filter(
    (r) => r.euSpaceActCrossRef && r.euSpaceActCrossRef.length > 0,
  );
}

export function getUkEuComparison(
  ukRequirementRef: string,
): UkEuComparison | undefined {
  return ukEuComparisons.find((c) =>
    c.ukRequirement.includes(ukRequirementRef),
  );
}
