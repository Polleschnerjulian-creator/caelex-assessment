/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary regulatory compliance mappings and data
 * that represent significant research and development investment.
 *
 * Unauthorized reproduction, distribution, reverse-engineering, or use
 * of this data to build competing products or services is strictly prohibited
 * and may result in legal action.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface ModuleDetail {
  slug: string;
  id: string;
  name: string;
  headline: string;
  description: string;
  articleRange: string;
  icon: string;
  keyCapabilities: {
    title: string;
    description: string;
  }[];
  automations: string[];
  comingSoon: boolean;
}

export const MODULE_DETAILS: ModuleDetail[] = [
  {
    slug: "authorization",
    id: "01",
    name: "Authorization & Licensing",
    headline: "Navigate multi-jurisdictional authorization with confidence.",
    description:
      "The EU Space Act requires every operator to obtain authorization from their National Competent Authority before conducting space activities. Caelex automates NCA determination, generates document checklists tailored to your operator type, and tracks your application through every stage of the process.",
    articleRange: "Art. 6\u201316, 32\u201339, 105\u2013108",
    icon: "FileCheck",
    keyCapabilities: [
      {
        title: "NCA Determination Engine",
        description:
          "Automatically identifies which National Competent Authority has jurisdiction over your operation based on establishment, launch site, and controlling entity.",
      },
      {
        title: "Document Checklist Generator",
        description:
          "Generates a tailored authorization document checklist based on your operator type, constellation size, and regulatory regime (standard or light).",
      },
      {
        title: "Application Tracker",
        description:
          "Track your authorization application across multiple authorities with status updates, deadline alerts, and document versioning.",
      },
      {
        title: "Multi-Authority Coordination",
        description:
          "For operators requiring authorization from multiple NCAs, manage parallel application processes in a single workflow.",
      },
    ],
    automations: [
      "Auto-generated application forms based on your compliance profile",
      "Deadline tracking with configurable reminders",
      "Document completeness checks before submission",
      "Status sync across all involved authorities",
    ],
    comingSoon: false,
  },
  {
    slug: "registration",
    id: "02",
    name: "Registration & Registry",
    headline: "Streamline URSO registration and space object tracking.",
    description:
      "Article 24 of the EU Space Act establishes the Union Register of Space Objects (URSO). Every authorized space object must be registered. Caelex automates data preparation, validates submissions against URSO requirements, and maintains your registry records.",
    articleRange: "Art. 24",
    icon: "Database",
    keyCapabilities: [
      {
        title: "URSO Data Templates",
        description:
          "Pre-formatted templates that match the URSO submission schema, pre-filled with data from your authorization application.",
      },
      {
        title: "Automated Validation",
        description:
          "Validates all required fields against URSO specifications before submission, flagging missing or inconsistent data.",
      },
      {
        title: "Object Lifecycle Tracking",
        description:
          "Track each registered space object through its full lifecycle \u2014 from registration through operational changes to de-registration.",
      },
      {
        title: "Bulk Registration",
        description:
          "Constellation operators can register multiple objects in a single batch process with consistent data quality.",
      },
    ],
    automations: [
      "Auto-populated registration forms from authorization data",
      "Change-of-status notifications to URSO",
      "Annual registry reconciliation reports",
      "Integration-ready API for fleet management systems",
    ],
    comingSoon: false,
  },
  {
    slug: "environmental",
    id: "03",
    name: "Environmental Footprint",
    headline: "Calculate and declare your mission\u2019s environmental impact.",
    description:
      "The EU Space Act introduces mandatory Environmental Footprint Declarations (EFD) following the Annex III methodology. Caelex provides lifecycle assessment tools, emission calculators, and automated declaration generation \u2014 including the delayed 2032 deadline for light-regime operators.",
    articleRange: "Art. 96\u2013100",
    icon: "Leaf",
    keyCapabilities: [
      {
        title: "Annex III Calculator",
        description:
          "Step-by-step calculator following the EU Space Act\u2019s Annex III methodology for environmental footprint assessment.",
      },
      {
        title: "Lifecycle Assessment",
        description:
          "Full lifecycle analysis from manufacturing through launch, operations, and disposal \u2014 covering all emission categories.",
      },
      {
        title: "Supplier Data Collection",
        description:
          "Automated supplier outreach to collect upstream emission data for your supply chain footprint calculation.",
      },
      {
        title: "Declaration Generator",
        description:
          "One-click generation of compliant Environmental Footprint Declarations ready for NCA submission.",
      },
    ],
    automations: [
      "Pre-filled emission factors from EU reference databases",
      "Automated supplier data request workflows",
      "Annual recalculation reminders",
      "Comparison against sector benchmarks",
    ],
    comingSoon: false,
  },
  {
    slug: "cybersecurity",
    id: "04",
    name: "Cybersecurity & Resilience",
    headline: "NIS2-aligned security for space systems.",
    description:
      "Articles 74\u201395 impose comprehensive cybersecurity requirements aligned with the NIS2 Directive. Caelex provides security risk assessment frameworks, maturity scoring, gap analysis, and incident reporting workflows tailored for space operations.",
    articleRange: "Art. 74\u201395",
    icon: "Shield",
    keyCapabilities: [
      {
        title: "Security Profile Builder",
        description:
          "Build your space system\u2019s security profile across ground segment, space segment, and communications links.",
      },
      {
        title: "Maturity Assessment",
        description:
          "Assess your current security posture against EU Space Act requirements with a structured maturity model.",
      },
      {
        title: "Gap Analysis",
        description:
          "Automatically identify gaps between your current security measures and the regulation\u2019s requirements.",
      },
      {
        title: "Incident Reporting",
        description:
          "Structured incident reporting workflow meeting the 24h/72h notification requirements to competent authorities.",
      },
    ],
    automations: [
      "Automated risk scoring based on your architecture",
      "Pre-built control frameworks mapped to articles",
      "Incident response playbook generation",
      "Continuous monitoring dashboard",
    ],
    comingSoon: false,
  },
  {
    slug: "debris-mitigation",
    id: "05",
    name: "Debris Mitigation & Safety",
    headline: "Plan compliant end-of-life and collision avoidance.",
    description:
      "The EU Space Act imposes strict debris mitigation requirements covering mission design, collision avoidance procedures, and end-of-life disposal. Caelex helps you plan, document, and demonstrate compliance with these safety-critical obligations.",
    articleRange: "Art. 58\u201372, 101\u2013103",
    icon: "Orbit",
    keyCapabilities: [
      {
        title: "Disposal Planning",
        description:
          "Generate compliant end-of-life disposal plans including de-orbit strategies, graveyard orbit transfers, and passivation procedures.",
      },
      {
        title: "Collision Risk Assessment",
        description:
          "Document your collision avoidance capabilities and response procedures as required by the regulation.",
      },
      {
        title: "De-orbit Compliance",
        description:
          "Track compliance with the 5-year de-orbit requirement for LEO objects and generate supporting documentation.",
      },
      {
        title: "Safety Documentation",
        description:
          "Automated generation of debris mitigation plans and safety cases for authorization applications.",
      },
    ],
    automations: [
      "Auto-generated disposal plans based on orbital parameters",
      "25-year compliance timeline tracking",
      "Conjunction assessment documentation",
      "Re-entry risk analysis summaries",
    ],
    comingSoon: false,
  },
  {
    slug: "insurance",
    id: "06",
    name: "Insurance & Liability",
    headline: "Manage third-party liability and coverage requirements.",
    description:
      "Articles 44\u201351 establish mandatory third-party liability insurance requirements for space operators. Caelex tracks your coverage obligations, calculates minimum insurance levels, and maintains documentation for NCA review.",
    articleRange: "Art. 44\u201351",
    icon: "ShieldCheck",
    keyCapabilities: [
      {
        title: "Coverage Calculator",
        description:
          "Calculate minimum insurance requirements based on your operator type, constellation size, and risk profile.",
      },
      {
        title: "Policy Tracking",
        description:
          "Monitor insurance policy status, renewal dates, and coverage gaps across all your space assets.",
      },
      {
        title: "Claims Documentation",
        description:
          "Structured documentation workflow for liability claims and incident-related insurance processes.",
      },
      {
        title: "NCA Compliance Evidence",
        description:
          "Generate insurance compliance evidence packages for authorization applications and ongoing supervision.",
      },
    ],
    automations: [
      "Policy renewal reminders 90/60/30 days before expiry",
      "Coverage gap detection across fleet",
      "Automated compliance certificates for NCAs",
      "Insurance requirement updates when fleet changes",
    ],
    comingSoon: false,
  },
  {
    slug: "supervision",
    id: "07",
    name: "Supervision & Reporting",
    headline: "Stay ahead of ongoing supervisory obligations.",
    description:
      "Once authorized, operators face continuous supervisory obligations including incident reporting, periodic reviews, and regulatory communication. Caelex centralizes all reporting requirements and ensures you never miss a deadline.",
    articleRange: "Art. 26\u201331, 40\u201357, 73",
    icon: "Eye",
    keyCapabilities: [
      {
        title: "Incident Reporting",
        description:
          "Structured workflows for mandatory incident reporting with configurable escalation paths and notification timelines.",
      },
      {
        title: "Audit Trail",
        description:
          "Automatic logging of all compliance actions, decisions, and communications for complete audit readiness.",
      },
      {
        title: "Regulatory Communications",
        description:
          "Manage all correspondence with NCAs, EUSPA, and other regulatory bodies in one place.",
      },
      {
        title: "Periodic Reviews",
        description:
          "Automated preparation of periodic compliance reviews and status reports as required by your authorization conditions.",
      },
    ],
    automations: [
      "Automated incident detection and notification workflows",
      "Compliance status dashboards for all obligations",
      "Pre-generated regulatory response templates",
      "Annual compliance review preparation",
    ],
    comingSoon: false,
  },
  {
    slug: "regulatory-intelligence",
    id: "08",
    name: "Regulatory Intelligence",
    headline: "Track every regulatory change that affects you.",
    description:
      "The EU Space Act delegates significant detail to implementing acts and delegated legislation. Caelex monitors all regulatory developments, analyzes their impact on your operations, and alerts you to changes that require action.",
    articleRange: "Art. 104, 114\u2013119",
    icon: "Bell",
    keyCapabilities: [
      {
        title: "Change Tracking",
        description:
          "Real-time monitoring of delegated acts, implementing decisions, and guidance documents from the European Commission and EUSPA.",
      },
      {
        title: "Impact Analysis",
        description:
          "Automated analysis of how regulatory changes affect your specific compliance obligations and timeline.",
      },
      {
        title: "Alert System",
        description:
          "Configurable alerts for regulatory changes relevant to your operator type, modules, and compliance status.",
      },
      {
        title: "Regulatory Timeline",
        description:
          "Visual timeline of upcoming regulatory milestones, transition periods, and compliance deadlines.",
      },
    ],
    automations: [
      "AI-powered regulatory change detection",
      "Automated impact scoring per operator profile",
      "Digest emails with relevant updates",
      "Compliance timeline auto-adjustment",
    ],
    comingSoon: false,
  },
  {
    slug: "export-control",
    id: "09",
    name: "Export Control",
    headline:
      "Navigate ITAR, EAR, and EU dual-use export controls for space technology.",
    description:
      "Space technology often falls under export control regimes including ITAR (US), EAR (US), and EU dual-use regulations. Understanding which regime applies and obtaining necessary licenses is critical for international operations.",
    articleRange: "ITAR, EAR, EU Dual-Use Reg.",
    icon: "PackageCheck",
    keyCapabilities: [
      {
        title: "Jurisdiction Determination",
        description:
          "Determine whether your technology falls under ITAR, EAR, or EU dual-use regulations based on technical parameters and end-use analysis.",
      },
      {
        title: "Classification Engine",
        description:
          "Automated USML/CCL/EU dual-use classification screening with detailed rationale and supporting documentation.",
      },
      {
        title: "License Management",
        description:
          "Track export license applications, approvals, and conditions across multiple regulatory regimes in a single workflow.",
      },
      {
        title: "Technology Control Plans",
        description:
          "Generate and maintain technology control plans for international collaborations, transfers, and manufacturing.",
      },
    ],
    automations: [
      "Automated screening against denied party lists",
      "License expiry and condition tracking",
      "Compliance audit trail generation",
      "Regulatory change alerts for export regimes",
    ],
    comingSoon: false,
  },
  {
    slug: "spectrum",
    id: "10",
    name: "Spectrum Management",
    headline: "Manage satellite frequency coordination and ITU compliance.",
    description:
      "Radio frequency spectrum is a limited resource governed by ITU Radio Regulations. Satellite operators must coordinate frequencies, file with the ITU, and comply with national spectrum authorities.",
    articleRange: "ITU Radio Regulations",
    icon: "Radio",
    keyCapabilities: [
      {
        title: "Frequency Coordination",
        description:
          "Manage the ITU coordination process for your satellite network filings, including interference analysis and bilateral negotiations.",
      },
      {
        title: "ITU Filing Tracker",
        description:
          "Track all ITU filing milestones — from API submission through coordination, notification, and bringing into use deadlines.",
      },
      {
        title: "National Spectrum Licensing",
        description:
          "Navigate national spectrum authority requirements for landing rights and earth station licenses across target markets.",
      },
      {
        title: "Interference Mitigation",
        description:
          "Document interference mitigation strategies and power flux density compliance for regulatory submissions.",
      },
    ],
    automations: [
      "ITU deadline tracking with automated reminders",
      "Coordination status dashboard across filings",
      "Regulatory requirement mapping per jurisdiction",
      "Filing document generation and validation",
    ],
    comingSoon: false,
  },
  {
    slug: "nis2",
    id: "11",
    name: "NIS2 Compliance",
    headline: "Full NIS2 Directive compliance for space essential entities.",
    description:
      "The NIS2 Directive (EU 2022/2555) establishes cybersecurity requirements for essential and important entities, including space operators. This module provides comprehensive NIS2 compliance guidance specific to the space sector.",
    articleRange: "NIS2 Art. 21, 23, 27, 29",
    icon: "Lock",
    keyCapabilities: [
      {
        title: "Entity Classification",
        description:
          "Determine your entity classification (essential vs. important) under NIS2 based on sector, size, and criticality criteria.",
      },
      {
        title: "Security Measures Assessment",
        description:
          "Gap analysis against all Art. 21(2) security measures (a)–(j) with space-sector-specific control mappings.",
      },
      {
        title: "Incident Reporting Workflows",
        description:
          "Structured workflows meeting the 24h early warning, 72h notification, and 1-month final report requirements.",
      },
      {
        title: "Supply Chain Security",
        description:
          "Evaluate and document supply chain security measures for critical space system components and services.",
      },
    ],
    automations: [
      "Automated entity classification questionnaire",
      "Pre-mapped controls to Art. 21(2) measures",
      "Incident timeline enforcement and reminders",
      "Management liability documentation",
    ],
    comingSoon: false,
  },
  {
    slug: "copuos-iadc",
    id: "12",
    name: "COPUOS & IADC Guidelines",
    headline: "Align with international space sustainability best practices.",
    description:
      "UN COPUOS Long-Term Sustainability Guidelines and IADC Space Debris Mitigation Guidelines represent international best practices for responsible space operations. Many national laws reference these guidelines.",
    articleRange: "COPUOS LTS, IADC Guidelines",
    icon: "Globe2",
    keyCapabilities: [
      {
        title: "COPUOS LTS Mapping",
        description:
          "Map your operations against all 21 COPUOS Long-Term Sustainability guidelines with structured compliance evidence.",
      },
      {
        title: "IADC Compliance Check",
        description:
          "Systematic assessment against IADC Space Debris Mitigation Guidelines with gap identification and remediation guidance.",
      },
      {
        title: "Best Practice Analysis",
        description:
          "Compare your practices against international standards and identify areas for voluntary improvement beyond minimum requirements.",
      },
      {
        title: "Obligation Tracking",
        description:
          "Track voluntary commitments, national law references to COPUOS/IADC, and evolving guideline interpretations.",
      },
    ],
    automations: [
      "Automated guideline mapping from mission profile",
      "Cross-reference with national law requirements",
      "Compliance evidence collection workflows",
      "Periodic review and update reminders",
    ],
    comingSoon: false,
  },
  {
    slug: "uk-space-act",
    id: "13",
    name: "UK Space Industry Act",
    headline: "Navigate the UK Space Industry Act 2018 licensing framework.",
    description:
      "The UK Space Industry Act 2018 established a comprehensive regulatory framework for space activities in the UK. The UK Space Agency (UKSA) is the licensing authority for launches and orbital operations.",
    articleRange: "UK Space Industry Act 2018",
    icon: "Building2",
    keyCapabilities: [
      {
        title: "UK License Requirements",
        description:
          "Determine which UK license types apply to your activities — launch, orbital operation, range, or return — and map all requirements.",
      },
      {
        title: "UKSA Application Guidance",
        description:
          "Step-by-step guidance through the UKSA application process with document checklists and submission preparation.",
      },
      {
        title: "Insurance & Liability",
        description:
          "Analyze UK-specific insurance requirements, liability caps, and government indemnification provisions.",
      },
      {
        title: "Range Safety Assessment",
        description:
          "Document range safety compliance for UK launch activities including safety case preparation and hazard analysis.",
      },
    ],
    automations: [
      "Pre-filled UKSA application templates",
      "License condition tracking and reminders",
      "Insurance requirement calculations",
      "Compliance reporting to UKSA",
    ],
    comingSoon: false,
  },
  {
    slug: "us-regulatory",
    id: "14",
    name: "US Regulatory",
    headline: "Navigate FAA, FCC, and NOAA requirements for US market access.",
    description:
      "US space regulation involves multiple agencies: FAA for launches, FCC for spectrum, and NOAA for remote sensing. Understanding the US regulatory landscape is essential for market access and partnerships.",
    articleRange: "FAA, FCC, NOAA",
    icon: "Landmark",
    keyCapabilities: [
      {
        title: "FAA Launch Licensing",
        description:
          "Navigate FAA Part 450 launch and reentry licensing requirements, including safety analysis and environmental review processes.",
      },
      {
        title: "FCC Spectrum Licensing",
        description:
          "Understand FCC satellite licensing for Ka/Ku/V-band and other frequencies, including market access petitions and earth station licensing.",
      },
      {
        title: "NOAA Remote Sensing",
        description:
          "Address NOAA licensing requirements for commercial remote sensing systems, including data distribution and shutter control provisions.",
      },
      {
        title: "Multi-Agency Coordination",
        description:
          "Manage parallel licensing processes across FAA, FCC, and NOAA with unified timeline and document tracking.",
      },
    ],
    automations: [
      "Regulatory requirement mapping across agencies",
      "Application timeline coordination",
      "License condition monitoring and compliance",
      "Regulatory update tracking for all three agencies",
    ],
    comingSoon: false,
  },
];

export function getModuleBySlug(slug: string): ModuleDetail | undefined {
  return MODULE_DETAILS.find((m) => m.slug === slug);
}

export function getAllModuleSlugs(): string[] {
  return MODULE_DETAILS.map((m) => m.slug);
}
