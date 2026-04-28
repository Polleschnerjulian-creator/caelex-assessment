/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unified module data source for module detail pages.
 * Merges identity, content, SEO, and cross-link data for all 14 modules.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedModuleData {
  // Identity
  slug: string;
  id: string;
  name: string;
  icon: string;

  // Hero
  headline: string;
  articleRange: string;

  // Content
  overview: string;
  keyCapabilities: { title: string; description: string }[];
  automations: string[];
  assessmentIncludes: string[];
  documentsGenerated: string[];

  // SEO
  seo: {
    title: string;
    h1: string;
    description: string;
    keywords: string[];
    regulations: string[];
    jurisdictions: string[];
  };

  // Cross-links
  relatedModules: string[];
  relatedArticles: { title: string; slug: string }[];
}

// ============================================================================
// DATA — All 14 Modules
// ============================================================================

export const UNIFIED_MODULES: UnifiedModuleData[] = [
  // ── 01 Authorization ─────────────────────────────────────────────────
  {
    slug: "authorization",
    id: "01",
    name: "Authorization & Licensing",
    icon: "FileCheck",
    headline: "Navigate multi-jurisdictional authorization with confidence.",
    articleRange: "Art. 6\u201316, 32\u201339, 105\u2013108",
    overview:
      "Space authorization is the foundational requirement for all space activities. Under the EU Space Act and national laws, operators must obtain authorization before launching, operating, or controlling spacecraft. This module guides you through the complete authorization process, from initial application to ongoing compliance.",
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
    assessmentIncludes: [
      "Determination of applicable authorization requirements",
      "Identification of relevant National Competent Authority (NCA)",
      "Pre-authorization checklist generation",
      "Document requirements mapping",
      "Timeline and milestone planning",
    ],
    documentsGenerated: [
      "Authorization Application Template",
      "Mission Profile Summary",
      "Operator Capability Statement",
      "Safety Assessment Framework",
      "NCA Correspondence Templates",
    ],
    seo: {
      title: "Space Authorization & Licensing Compliance",
      h1: "Space Authorization & Licensing Compliance",
      description:
        "Navigate space authorization requirements across EU Space Act, national laws, and international frameworks. Get licensed to operate satellites with confidence.",
      keywords: [
        "space authorization",
        "satellite license",
        "space licensing requirements",
        "launch authorization",
      ],
      regulations: ["EU Space Act Art. 5-9", "National Space Laws", "UN OST"],
      jurisdictions: [
        "EU",
        "Germany",
        "France",
        "UK",
        "Luxembourg",
        "Netherlands",
      ],
    },
    relatedModules: ["supervision", "insurance", "debris-mitigation"],
    relatedArticles: [
      {
        title: "EU Space Act Article 5: Authorization Explained",
        slug: "eu-space-act-article-5-authorization",
      },
      {
        title: "How to Get a Satellite License",
        slug: "satellite-licensing",
      },
    ],
  },

  // ── 02 Registration ──────────────────────────────────────────────────
  {
    slug: "registration",
    id: "02",
    name: "Registration & Registry",
    icon: "Database",
    headline: "Streamline URSO registration and space object tracking.",
    articleRange: "Art. 24",
    overview:
      "Article 24 of the EU Space Act establishes the Union Register of Space Objects (URSO). Every authorized space object must be registered. Caelex automates data preparation, validates submissions against URSO requirements, and maintains your registry records throughout the mission lifecycle.",
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
    assessmentIncludes: [
      "URSO registration requirement determination",
      "Data completeness assessment against URSO schema",
      "National registry obligation mapping",
      "Constellation batch registration planning",
      "Lifecycle event notification requirements",
    ],
    documentsGenerated: [
      "URSO Registration Form",
      "Space Object Data Sheet",
      "Registry Reconciliation Report",
      "Change-of-Status Notification",
      "Bulk Registration Summary",
    ],
    seo: {
      title: "Space Object Registration & URSO Compliance",
      h1: "Space Object Registration & URSO Compliance",
      description:
        "Streamline URSO registration and space object tracking under the EU Space Act. Automated data validation, submission preparation, and lifecycle management.",
      keywords: [
        "space object registration",
        "URSO registration",
        "Union Register of Space Objects",
        "satellite registration",
      ],
      regulations: ["EU Space Act Art. 24", "Registration Convention"],
      jurisdictions: ["EU", "National Registries"],
    },
    relatedModules: ["authorization", "supervision", "debris-mitigation"],
    relatedArticles: [
      {
        title: "URSO Registration Requirements Explained",
        slug: "urso-registration-requirements",
      },
    ],
  },

  // ── 03 Environmental ─────────────────────────────────────────────────
  {
    slug: "environmental",
    id: "03",
    name: "Environmental Footprint",
    icon: "Leaf",
    headline: "Calculate and declare your mission\u2019s environmental impact.",
    articleRange: "Art. 96\u2013100",
    overview:
      "The EU Space Act introduces mandatory Environmental Footprint Declarations (EFD) following the Annex III methodology. Caelex provides lifecycle assessment tools, emission calculators, and automated declaration generation \u2014 including the delayed 2032 deadline for light-regime operators.",
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
    assessmentIncludes: [
      "Environmental impact assessment requirements",
      "Launch site environmental compliance",
      "Emissions and sustainability evaluation",
      "Protected area considerations",
      "Environmental reporting obligations",
    ],
    documentsGenerated: [
      "Environmental Impact Statement",
      "Sustainability Assessment",
      "Emissions Report Template",
      "Environmental Compliance Checklist",
    ],
    seo: {
      title: "Environmental Compliance for Space Operations",
      h1: "Environmental Compliance for Space Operations",
      description:
        "Address environmental requirements for launches and space operations. Navigate emissions, protected areas, and environmental impact assessments.",
      keywords: [
        "space environmental compliance",
        "launch environmental impact",
        "space sustainability",
      ],
      regulations: [
        "EU Space Act Art. 13",
        "National Environmental Laws",
        "REACH",
      ],
      jurisdictions: ["EU", "National environmental agencies"],
    },
    relatedModules: ["debris-mitigation", "authorization", "copuos-iadc"],
    relatedArticles: [
      {
        title: "Space Sustainability Rating",
        slug: "space-sustainability-rating",
      },
    ],
  },

  // ── 04 Cybersecurity ─────────────────────────────────────────────────
  {
    slug: "cybersecurity",
    id: "04",
    name: "Cybersecurity & Resilience",
    icon: "Shield",
    headline: "NIS2-aligned security for space systems.",
    articleRange: "Art. 74\u201395",
    overview:
      "Space systems are increasingly targeted by cyber threats. The NIS2 Directive classifies space operators as essential entities, requiring robust cybersecurity measures. This module helps you implement security controls aligned with NIS2, NIST CSF, and ISO 27001.",
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
    assessmentIncludes: [
      "NIS2 essential/important entity classification",
      "Gap analysis against Art. 21(2) security measures",
      "Incident response capability assessment",
      "Supply chain security evaluation",
      "Governance and risk management review",
    ],
    documentsGenerated: [
      "Cybersecurity Policy Template",
      "Incident Response Plan",
      "Risk Assessment Report",
      "Security Measures Checklist",
      "NIS2 Compliance Report",
    ],
    seo: {
      title: "Space Cybersecurity & NIS2 Compliance",
      h1: "Space Cybersecurity & NIS2 Compliance",
      description:
        "Implement cybersecurity measures for space systems under NIS2, NIST, and ISO 27001. Protect satellites and ground infrastructure from cyber threats.",
      keywords: [
        "space cybersecurity",
        "NIS2 space",
        "satellite cybersecurity",
        "space NIST framework",
      ],
      regulations: [
        "NIS2 Directive",
        "ISO 27001",
        "NIST CSF",
        "EU Space Act Art. 16",
      ],
      jurisdictions: ["EU", "All EU Member States"],
    },
    relatedModules: ["nis2", "supervision", "authorization"],
    relatedArticles: [
      {
        title: "How NIS2 Affects Space Operators",
        slug: "nis2-space-operators",
      },
      {
        title: "Cybersecurity for Space: NIST Framework",
        slug: "space-cybersecurity-nist-framework",
      },
    ],
  },

  // ── 05 Debris Mitigation ─────────────────────────────────────────────
  {
    slug: "debris-mitigation",
    id: "05",
    name: "Debris Mitigation & Safety",
    icon: "Orbit",
    headline: "Plan compliant end-of-life and collision avoidance.",
    articleRange: "Art. 58\u201372, 101\u2013103",
    overview:
      "Space debris mitigation is critical for the long-term sustainability of space activities. Operators must comply with IADC guidelines, ISO 24113, and EU Space Act requirements for debris avoidance, passivation, and end-of-life disposal.",
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
    assessmentIncludes: [
      "Debris mitigation plan evaluation",
      "Deorbit/re-entry compliance check",
      "Passivation requirements assessment",
      "Collision avoidance capability review",
      "End-of-life disposal planning",
    ],
    documentsGenerated: [
      "Debris Mitigation Plan",
      "End-of-Life Disposal Plan",
      "Passivation Procedure",
      "Re-entry Safety Assessment",
      "IADC Compliance Checklist",
    ],
    seo: {
      title: "Space Debris Mitigation Compliance",
      h1: "Space Debris Mitigation Compliance",
      description:
        "Meet space debris mitigation requirements under IADC guidelines, ISO 24113, and EU Space Act. Plan deorbit, passivation, and end-of-life disposal.",
      keywords: [
        "space debris mitigation",
        "satellite deorbit",
        "IADC guidelines",
        "ISO 24113",
      ],
      regulations: [
        "EU Space Act Art. 10-12",
        "IADC Guidelines",
        "ISO 24113",
        "COPUOS LTS",
      ],
      jurisdictions: ["International", "EU", "National requirements vary"],
    },
    relatedModules: ["environmental", "authorization", "copuos-iadc"],
    relatedArticles: [
      {
        title: "IADC vs ISO 24113: Standards Compared",
        slug: "space-debris-iadc-vs-iso",
      },
      {
        title: "Space Debris Mitigation Requirements",
        slug: "space-debris-mitigation",
      },
    ],
  },

  // ── 06 Insurance ─────────────────────────────────────────────────────
  {
    slug: "insurance",
    id: "06",
    name: "Insurance & Liability",
    icon: "ShieldCheck",
    headline: "Manage third-party liability and coverage requirements.",
    articleRange: "Art. 44\u201351",
    overview:
      "Third-party liability insurance is mandatory for space operators across most jurisdictions. Insurance requirements vary significantly by country, activity type, and risk profile. This module helps you navigate insurance obligations and coverage requirements.",
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
    assessmentIncludes: [
      "Insurance requirement determination by jurisdiction",
      "Coverage amount calculation",
      "Policy type recommendations",
      "Liability cap analysis",
      "Insurance documentation requirements",
    ],
    documentsGenerated: [
      "Insurance Requirements Summary",
      "Coverage Analysis Report",
      "Insurance Certificate Template",
      "Liability Assessment",
    ],
    seo: {
      title: "Space Insurance & Liability Compliance",
      h1: "Space Insurance & Liability Compliance",
      description:
        "Understand third-party liability insurance requirements for space operations. Compare insurance mandates across jurisdictions and meet coverage minimums.",
      keywords: [
        "space insurance",
        "satellite liability insurance",
        "space TPL",
        "launch insurance",
      ],
      regulations: [
        "EU Space Act Art. 14",
        "Liability Convention",
        "National Insurance Requirements",
      ],
      jurisdictions: ["EU", "Germany", "France", "UK", "Luxembourg", "Belgium"],
    },
    relatedModules: ["authorization", "supervision"],
    relatedArticles: [
      {
        title: "Satellite Insurance Requirements in Europe",
        slug: "satellite-insurance-requirements-europe",
      },
      {
        title: "Space Insurance Requirements Guide",
        slug: "space-insurance",
      },
    ],
  },

  // ── 07 Supervision ───────────────────────────────────────────────────
  {
    slug: "supervision",
    id: "07",
    name: "Supervision & Reporting",
    icon: "Eye",
    headline: "Stay ahead of ongoing supervisory obligations.",
    articleRange: "Art. 26\u201331, 40\u201357, 73",
    overview:
      "Ongoing regulatory supervision ensures continued compliance throughout mission lifecycle. This includes reporting obligations, inspections, and maintaining authorization conditions.",
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
    assessmentIncludes: [
      "Ongoing reporting requirements mapping",
      "Inspection preparedness assessment",
      "Compliance monitoring framework",
      "Change notification procedures",
      "Record-keeping requirements",
    ],
    documentsGenerated: [
      "Compliance Monitoring Plan",
      "Reporting Calendar",
      "Inspection Checklist",
      "Change Notification Templates",
    ],
    seo: {
      title: "Regulatory Supervision for Space Operators",
      h1: "Regulatory Supervision for Space Operators",
      description:
        "Navigate ongoing regulatory supervision, reporting requirements, and inspections. Stay compliant throughout your mission lifecycle.",
      keywords: [
        "space regulatory supervision",
        "satellite operator reporting",
        "NCA supervision",
      ],
      regulations: [
        "EU Space Act Art. 17-20",
        "National Supervision Frameworks",
      ],
      jurisdictions: ["EU", "National Competent Authorities"],
    },
    relatedModules: ["authorization", "cybersecurity", "insurance"],
    relatedArticles: [],
  },

  // ── 08 Regulatory Intelligence ────────────────────────────────────────
  {
    slug: "regulatory-intelligence",
    id: "08",
    name: "Regulatory Intelligence",
    icon: "Bell",
    headline: "Track every regulatory change that affects you.",
    articleRange: "Art. 104, 114\u2013119",
    overview:
      "The EU Space Act delegates significant detail to implementing acts and delegated legislation. Caelex monitors all regulatory developments, analyzes their impact on your operations, and alerts you to changes that require action.",
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
    assessmentIncludes: [
      "Regulatory landscape mapping for your profile",
      "Change impact assessment methodology",
      "Alert configuration and notification setup",
      "Timeline integration with compliance obligations",
      "Delegated act tracking and readiness planning",
    ],
    documentsGenerated: [
      "Regulatory Change Impact Report",
      "Compliance Timeline Update",
      "Regulatory Alert Summary",
      "Delegated Act Readiness Assessment",
    ],
    seo: {
      title: "Space Regulatory Intelligence & Change Tracking",
      h1: "Space Regulatory Intelligence & Change Tracking",
      description:
        "Track every regulatory change that affects your space operations. AI-powered monitoring of EU Space Act delegated acts, NIS2 updates, and national law changes.",
      keywords: [
        "space regulatory intelligence",
        "regulatory change tracking",
        "EU Space Act updates",
        "space law monitoring",
      ],
      regulations: [
        "EU Space Act Art. 104, 114-119",
        "NIS2 Implementing Acts",
        "National Space Laws",
      ],
      jurisdictions: ["EU", "All Monitored Jurisdictions"],
    },
    relatedModules: ["supervision", "nis2", "cybersecurity"],
    relatedArticles: [
      {
        title: "EU Space Act Delegated Acts: What to Expect",
        slug: "eu-space-act-delegated-acts",
      },
    ],
  },

  // ── 09 Export Control ─────────────────────────────────────────────────
  {
    slug: "export-control",
    id: "09",
    name: "Export Control",
    icon: "PackageCheck",
    headline:
      "Navigate ITAR, EAR, and EU dual-use export controls for space technology.",
    articleRange: "ITAR, EAR, EU Dual-Use Reg.",
    overview:
      "Space technology often falls under export control regimes including ITAR (US), EAR (US), and EU dual-use regulations. Understanding which regime applies and obtaining necessary licenses is critical for international operations.",
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
    assessmentIncludes: [
      "Export control jurisdiction determination",
      "ITAR vs EAR classification",
      "EU dual-use screening",
      "License requirement analysis",
      "Technology control plan assessment",
    ],
    documentsGenerated: [
      "Export Classification Report",
      "Technology Control Plan",
      "License Application Guidance",
      "Export Compliance Manual",
    ],
    seo: {
      title: "Space Export Control Compliance (ITAR, EAR, EU)",
      h1: "Space Export Control Compliance (ITAR, EAR, EU)",
      description:
        "Navigate ITAR, EAR, and EU dual-use export controls for space technology. Understand licensing requirements and compliance obligations.",
      keywords: [
        "space export control",
        "ITAR space",
        "EAR satellites",
        "EU dual-use space",
      ],
      regulations: [
        "ITAR",
        "EAR",
        "EU Dual-Use Regulation",
        "Wassenaar Arrangement",
      ],
      jurisdictions: ["USA", "EU", "International"],
    },
    relatedModules: ["authorization", "us-regulatory"],
    relatedArticles: [
      {
        title: "ITAR vs EAR: Which Applies to Your Satellite?",
        slug: "itar-vs-ear-space",
      },
      {
        title: "Space Export Control Guide",
        slug: "space-export-control",
      },
    ],
  },

  // ── 10 Spectrum ───────────────────────────────────────────────────────
  {
    slug: "spectrum",
    id: "10",
    name: "Spectrum Management",
    icon: "Radio",
    headline: "Manage satellite frequency coordination and ITU compliance.",
    articleRange: "ITU Radio Regulations",
    overview:
      "Radio frequency spectrum is a limited resource governed by ITU Radio Regulations. Satellite operators must coordinate frequencies, file with the ITU, and comply with national spectrum authorities.",
    keyCapabilities: [
      {
        title: "Frequency Coordination",
        description:
          "Manage the ITU coordination process for your satellite network filings, including interference analysis and bilateral negotiations.",
      },
      {
        title: "ITU Filing Tracker",
        description:
          "Track all ITU filing milestones \u2014 from API submission through coordination, notification, and bringing into use deadlines.",
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
    assessmentIncludes: [
      "Frequency coordination requirements",
      "ITU filing status review",
      "National spectrum license needs",
      "Interference mitigation planning",
      "Spectrum sharing assessment",
    ],
    documentsGenerated: [
      "Frequency Coordination Plan",
      "ITU Filing Checklist",
      "Spectrum License Application",
      "Interference Analysis Report",
    ],
    seo: {
      title: "Spectrum Management & ITU Compliance",
      h1: "Spectrum Management & ITU Compliance",
      description:
        "Manage radio frequency coordination under ITU Radio Regulations. Navigate spectrum allocation, interference mitigation, and filing procedures.",
      keywords: [
        "spectrum management",
        "ITU space",
        "satellite frequency coordination",
        "radio frequency licensing",
      ],
      regulations: [
        "ITU Radio Regulations",
        "EU Space Act Art. 15",
        "National Spectrum Authorities",
      ],
      jurisdictions: ["International (ITU)", "EU", "National"],
    },
    relatedModules: ["authorization", "us-regulatory"],
    relatedArticles: [
      {
        title: "ITU Frequency Coordination Guide",
        slug: "itu-frequency-coordination",
      },
    ],
  },

  // ── 11 NIS2 ──────────────────────────────────────────────────────────
  {
    slug: "nis2",
    id: "11",
    name: "NIS2 Compliance",
    icon: "Lock",
    headline: "Full NIS2 Directive compliance for space essential entities.",
    articleRange: "NIS2 Art. 21, 23, 27, 29",
    overview:
      "The NIS2 Directive (EU 2022/2555) establishes cybersecurity requirements for essential and important entities, including space operators. This module provides comprehensive NIS2 compliance guidance specific to the space sector.",
    keyCapabilities: [
      {
        title: "Entity Classification",
        description:
          "Determine your entity classification (essential vs. important) under NIS2 based on sector, size, and criticality criteria.",
      },
      {
        title: "Security Measures Assessment",
        description:
          "Gap analysis against all Art. 21(2) security measures (a)\u2013(j) with space-sector-specific control mappings.",
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
    assessmentIncludes: [
      "Entity classification (essential vs important)",
      "Security measures gap analysis",
      "Incident reporting requirements",
      "Supply chain security assessment",
      "Management liability review",
    ],
    documentsGenerated: [
      "NIS2 Compliance Assessment",
      "Security Measures Implementation Plan",
      "Incident Reporting Procedures",
      "Supply Chain Security Policy",
    ],
    seo: {
      title: "NIS2 Directive Compliance for Space",
      h1: "NIS2 Directive Compliance for Space",
      description:
        "Understand NIS2 requirements for space operators. Implement security measures, incident reporting, and supply chain security for essential entities.",
      keywords: [
        "NIS2 space",
        "NIS2 satellite",
        "space essential entity",
        "NIS2 compliance",
      ],
      regulations: [
        "NIS2 Directive (EU 2022/2555)",
        "National NIS2 Implementations",
      ],
      jurisdictions: ["EU", "All EU Member States"],
    },
    relatedModules: ["cybersecurity", "supervision"],
    relatedArticles: [
      {
        title: "How NIS2 Affects Space Operators",
        slug: "nis2-space-operators",
      },
      {
        title: "NIS2 Compliance Guide for Space",
        slug: "nis2-space",
      },
    ],
  },

  // ── 12 COPUOS & IADC ─────────────────────────────────────────────────
  {
    slug: "copuos-iadc",
    id: "12",
    name: "COPUOS & IADC Guidelines",
    icon: "Globe2",
    headline: "Align with international space sustainability best practices.",
    articleRange: "COPUOS LTS, IADC Guidelines",
    overview:
      "UN COPUOS Long-Term Sustainability Guidelines and IADC Space Debris Mitigation Guidelines represent international best practices for responsible space operations. Many national laws reference these guidelines.",
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
    assessmentIncludes: [
      "COPUOS LTS guideline mapping",
      "IADC guideline compliance check",
      "Best practice gap analysis",
      "International obligation review",
      "Voluntary commitment tracking",
    ],
    documentsGenerated: [
      "COPUOS LTS Compliance Report",
      "IADC Guidelines Checklist",
      "Best Practice Assessment",
      "International Obligations Summary",
    ],
    seo: {
      title: "COPUOS & IADC Guidelines Compliance",
      h1: "COPUOS & IADC Guidelines Compliance",
      description:
        "Align with UN COPUOS Long-Term Sustainability Guidelines and IADC Space Debris Mitigation Guidelines. Meet international best practices.",
      keywords: [
        "COPUOS guidelines",
        "IADC compliance",
        "UN space guidelines",
        "space sustainability",
      ],
      regulations: ["COPUOS LTS Guidelines", "IADC Guidelines", "UN OST"],
      jurisdictions: [
        "International (UN)",
        "Referenced by EU and National Laws",
      ],
    },
    relatedModules: ["debris-mitigation", "environmental", "authorization"],
    relatedArticles: [
      {
        title: "COPUOS Guidelines Compliance",
        slug: "copuos-guidelines-compliance",
      },
    ],
  },

  // ── 13 UK Space Act ──────────────────────────────────────────────────
  {
    slug: "uk-space-act",
    id: "13",
    name: "UK Space Industry Act",
    icon: "Building2",
    headline: "Navigate the UK Space Industry Act 2018 licensing framework.",
    articleRange: "UK Space Industry Act 2018",
    overview:
      "The UK Space Industry Act 2018 established a comprehensive regulatory framework for space activities in the UK. The UK Space Agency (UKSA) is the licensing authority for launches and orbital operations.",
    keyCapabilities: [
      {
        title: "UK License Requirements",
        description:
          "Determine which UK license types apply to your activities \u2014 launch, orbital operation, range, or return \u2014 and map all requirements.",
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
    assessmentIncludes: [
      "UK licensing requirement determination",
      "UKSA application process guidance",
      "Insurance requirement analysis",
      "Range safety assessment",
      "Ongoing compliance obligations",
    ],
    documentsGenerated: [
      "UK License Application Checklist",
      "Mission Safety Assessment",
      "UK Insurance Requirements Summary",
      "UKSA Compliance Report",
    ],
    seo: {
      title: "UK Space Industry Act Compliance",
      h1: "UK Space Industry Act Compliance",
      description:
        "Navigate the UK Space Industry Act 2018. Understand licensing requirements from the UK Space Agency for launch and orbital operations.",
      keywords: [
        "UK Space Industry Act",
        "UK space license",
        "UKSA compliance",
        "UK satellite regulation",
      ],
      regulations: ["UK Space Industry Act 2018", "UK Space Agency Guidelines"],
      jurisdictions: ["United Kingdom"],
    },
    relatedModules: ["authorization", "insurance", "supervision"],
    relatedArticles: [
      {
        title: "UK Space Industry Act Guide",
        slug: "uk-space-industry-act-guide",
      },
    ],
  },

  // ── 14 US Regulatory ─────────────────────────────────────────────────
  {
    slug: "us-regulatory",
    id: "14",
    name: "US Regulatory",
    icon: "Landmark",
    headline: "Navigate FAA, FCC, and NOAA requirements for US market access.",
    articleRange: "FAA, FCC, NOAA",
    overview:
      "US space regulation involves multiple agencies: FAA for launches, FCC for spectrum, and NOAA for remote sensing. Understanding the US regulatory landscape is essential for market access and partnerships.",
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
    assessmentIncludes: [
      "FAA launch license requirements",
      "FCC spectrum licensing needs",
      "NOAA remote sensing requirements",
      "Export control implications",
      "US market access strategy",
    ],
    documentsGenerated: [
      "US Regulatory Requirements Summary",
      "FAA License Guidance",
      "FCC Filing Checklist",
      "NOAA License Assessment",
    ],
    seo: {
      title: "US Space Regulatory Compliance (FAA, FCC, NOAA)",
      h1: "US Space Regulatory Compliance (FAA, FCC, NOAA)",
      description:
        "Navigate US space regulations from FAA (launches), FCC (spectrum), and NOAA (remote sensing). Understand licensing requirements for US market access.",
      keywords: [
        "US space regulation",
        "FAA launch license",
        "FCC satellite license",
        "NOAA remote sensing",
      ],
      regulations: [
        "Commercial Space Launch Act",
        "Communications Act",
        "Land Remote Sensing Policy Act",
      ],
      jurisdictions: ["United States"],
    },
    relatedModules: ["export-control", "spectrum", "authorization"],
    relatedArticles: [],
  },
];

// ============================================================================
// HELPERS
// ============================================================================

export function getUnifiedModule(slug: string): UnifiedModuleData | undefined {
  return UNIFIED_MODULES.find((m) => m.slug === slug);
}

export function getAdjacentModules(slug: string): {
  prev: UnifiedModuleData | null;
  next: UnifiedModuleData | null;
} {
  const index = UNIFIED_MODULES.findIndex((m) => m.slug === slug);
  if (index === -1) return { prev: null, next: null };

  const total = UNIFIED_MODULES.length;
  return {
    prev: UNIFIED_MODULES[(index - 1 + total) % total],
    next: UNIFIED_MODULES[(index + 1) % total],
  };
}

export function getAllModuleSlugs(): string[] {
  return UNIFIED_MODULES.map((m) => m.slug);
}
