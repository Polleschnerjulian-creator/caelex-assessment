/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary data room structure and due diligence
 * templates that represent significant research and development investment.
 *
 * Unauthorized reproduction, distribution, reverse-engineering, or use
 * of this data to build competing products or services is strictly prohibited
 * and may result in legal action.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface DataRoomChecklistItem {
  id: string;
  name: string;
  required: boolean;
  description: string;
  fromComply?: boolean;
}

export interface DataRoomFolder {
  id: string;
  name: string;
  description: string;
  items: DataRoomChecklistItem[];
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  triggeredRiskCategories: string[];
  financialImpactRange: {
    bestCase: number;
    mostLikely: number;
    worstCase: number;
  };
  timeToRecover: string;
  mitigationEffectiveness: number;
}

export const dataRoomFolders: DataRoomFolder[] = [
  // ─── 1. CORPORATE & LEGAL ───
  {
    id: "folder-corporate-legal",
    name: "1. Corporate & Legal",
    description:
      "Core corporate documents, governance structure, and legal standing of the entity.",
    items: [
      {
        id: "cl-001",
        name: "Certificate of Incorporation",
        required: true,
        description:
          "Original certificate of incorporation or equivalent formation document from the relevant national commercial register (e.g., Handelsregister, Companies House).",
      },
      {
        id: "cl-002",
        name: "Articles of Association / Bylaws",
        required: true,
        description:
          "Current articles of association or bylaws including all amendments, shareholder agreements, and any side letters affecting governance.",
      },
      {
        id: "cl-003",
        name: "Cap Table & Shareholder Register",
        required: true,
        description:
          "Fully diluted capitalization table showing all equity holders, option pool, convertible instruments, SAFEs, and any outstanding warrants.",
      },
      {
        id: "cl-004",
        name: "Board Resolutions & Minutes",
        required: false,
        description:
          "Minutes from all board meetings and written resolutions from the past 24 months, including any committee meetings (audit, compensation).",
      },
      {
        id: "cl-005",
        name: "Material Contracts & Agreements",
        required: true,
        description:
          "All material contracts including customer agreements, supplier contracts, partnership agreements, and any contracts representing more than 10% of revenue or costs.",
      },
      {
        id: "cl-006",
        name: "Litigation & Disputes Summary",
        required: true,
        description:
          "Summary of any pending, threatened, or settled litigation, arbitration, regulatory proceedings, or IP disputes within the past 36 months.",
      },
    ],
  },

  // ─── 2. FINANCIAL ───
  {
    id: "folder-financial",
    name: "2. Financial",
    description:
      "Historical financials, projections, and key financial metrics for investment evaluation.",
    items: [
      {
        id: "fi-001",
        name: "Audited Financial Statements",
        required: true,
        description:
          "Audited annual financial statements for the past 3 years (or since inception if younger), prepared under IFRS or local GAAP. Include auditor reports and management letters.",
      },
      {
        id: "fi-002",
        name: "Management Accounts (Last 12 Months)",
        required: true,
        description:
          "Monthly management accounts for the trailing 12 months including P&L, balance sheet, and cash flow statement with commentary on material variances.",
      },
      {
        id: "fi-003",
        name: "Financial Model & Projections",
        required: true,
        description:
          "Detailed 5-year financial model including revenue build-up, cost structure, capex plan, headcount plan, and key assumptions. Must include base case, upside, and downside scenarios.",
      },
      {
        id: "fi-004",
        name: "Grant & Subsidy Documentation",
        required: false,
        description:
          "Documentation for all received or pending grants (ESA, Horizon Europe, national space agencies, EIC), including grant agreements, milestone requirements, and reporting obligations.",
      },
      {
        id: "fi-005",
        name: "Bank Statements & Debt Overview",
        required: true,
        description:
          "Bank statements for the past 6 months for all accounts. Summary of all debt instruments, credit facilities, convertible notes, and any outstanding financial obligations.",
      },
    ],
  },

  // ─── 3. TECHNOLOGY & IP ───
  {
    id: "folder-technology-ip",
    name: "3. Technology & IP",
    description:
      "Technical architecture, intellectual property portfolio, and technology readiness assessment.",
    items: [
      {
        id: "ti-001",
        name: "Technical Architecture Overview",
        required: true,
        description:
          "High-level technical architecture document covering spacecraft/payload design, ground segment, data processing pipeline, and key technology differentiators. Include current TRL assessment.",
      },
      {
        id: "ti-002",
        name: "Patent & IP Portfolio",
        required: true,
        description:
          "Complete inventory of patents (granted and pending), trademarks, trade secrets, and copyrights. Include freedom-to-operate analysis for core technology and any IP licensing agreements.",
      },
      {
        id: "ti-003",
        name: "Technology Roadmap",
        required: false,
        description:
          "18-36 month technology development roadmap with key milestones, TRL advancement targets, planned demonstration missions, and dependencies on external technology developments.",
      },
      {
        id: "ti-004",
        name: "Software & Open Source Audit",
        required: false,
        description:
          "Inventory of all third-party software dependencies, open-source components with their licenses (GPL, LGPL, MIT, Apache), and any software escrow arrangements.",
      },
    ],
  },

  // ─── 4. REGULATORY & COMPLIANCE ───
  {
    id: "folder-regulatory-compliance",
    name: "4. Regulatory & Compliance",
    description:
      "Space authorization status, regulatory compliance evidence, and applicable regulatory requirements.",
    items: [
      {
        id: "rc-001",
        name: "Space Activity Authorization / License",
        required: true,
        description:
          "Current space activity authorization or license from relevant National Competent Authority (NCA), including all conditions, restrictions, and renewal requirements.",
        fromComply: true,
      },
      {
        id: "rc-002",
        name: "EU Space Act Compliance Assessment",
        required: true,
        description:
          "Gap analysis and compliance status against EU Space Act requirements including authorization (Art. 6-16), debris mitigation (Art. 67), environmental footprint (Art. 96-100), and cybersecurity obligations.",
        fromComply: true,
      },
      {
        id: "rc-003",
        name: "Spectrum & Frequency Filings",
        required: true,
        description:
          "ITU frequency filing status, national spectrum licenses, and coordination agreements. Include filing dates, coordination status, and any pending objections or interference issues.",
      },
      {
        id: "rc-004",
        name: "Export Control Classification & Licenses",
        required: true,
        description:
          "Export control classification of all products and technologies (ITAR, EAR, EU Dual-Use Regulation). Include any export licenses, Technology Control Plans, and compliance program documentation.",
      },
      {
        id: "rc-005",
        name: "NIS2 Compliance Documentation",
        required: false,
        description:
          "NIS2 Directive compliance assessment including entity classification (essential/important), cybersecurity risk management measures, and incident reporting procedures.",
        fromComply: true,
      },
      {
        id: "rc-006",
        name: "Debris Mitigation Plan",
        required: true,
        description:
          "Debris mitigation plan per IADC guidelines and EU Space Act Art. 67 requirements, including passivation procedures, controlled deorbit plan, and collision avoidance procedures.",
        fromComply: true,
      },
    ],
  },

  // ─── 5. TEAM & HR ───
  {
    id: "folder-team-hr",
    name: "5. Team & HR",
    description:
      "Leadership team profiles, organizational structure, and human resources documentation.",
    items: [
      {
        id: "th-001",
        name: "Founder & Management Team CVs",
        required: true,
        description:
          "Detailed CVs for all founders, C-level executives, and key technical leads. Include relevant space industry experience, academic credentials, previous exits, and board memberships.",
      },
      {
        id: "th-002",
        name: "Organizational Chart & Headcount Plan",
        required: true,
        description:
          "Current organizational chart with reporting lines and planned headcount growth by function (engineering, operations, sales, G&A) for the next 18 months.",
      },
      {
        id: "th-003",
        name: "Employment Contracts & ESOP Plan",
        required: true,
        description:
          "Template employment contracts, employee stock option plan (ESOP) documentation, vesting schedules, and any key person retention agreements or non-compete clauses.",
      },
      {
        id: "th-004",
        name: "Advisory Board & Key Consultants",
        required: false,
        description:
          "List of advisors and key consultants with their engagement terms, compensation, and specific contributions. Include any industry experts, former astronauts, or agency officials.",
      },
    ],
  },

  // ─── 6. COMMERCIAL ───
  {
    id: "folder-commercial",
    name: "6. Commercial",
    description:
      "Market positioning, customer pipeline, and commercial traction evidence.",
    items: [
      {
        id: "co-001",
        name: "Customer Pipeline & LOIs",
        required: true,
        description:
          "Current customer pipeline with stage, expected close dates, and contract values. Include all signed Letters of Intent (LOIs), Memoranda of Understanding (MOUs), and binding purchase orders.",
      },
      {
        id: "co-002",
        name: "Market Analysis & TAM/SAM/SOM",
        required: true,
        description:
          "Detailed market analysis including Total Addressable Market (TAM), Serviceable Addressable Market (SAM), and Serviceable Obtainable Market (SOM) with methodology and supporting data sources.",
      },
      {
        id: "co-003",
        name: "Competitive Landscape Analysis",
        required: false,
        description:
          "Comprehensive competitive analysis mapping direct and indirect competitors, their funding, capabilities, market share, and the company's defensible differentiation.",
      },
      {
        id: "co-004",
        name: "Go-to-Market Strategy & Sales Metrics",
        required: true,
        description:
          "Go-to-market strategy document including target customer segments, pricing model, sales channels, customer acquisition cost (CAC), lifetime value (LTV), and sales cycle metrics.",
      },
    ],
  },

  // ─── 7. CAELEX ASSURE REPORTS ───
  {
    id: "folder-assure-reports",
    name: "7. Caelex Assure Reports",
    description:
      "Automated compliance and due diligence reports generated by the Caelex Assure platform from connected Comply data.",
    items: [
      {
        id: "ar-001",
        name: "Regulatory Compliance Report (RCR)",
        required: true,
        description:
          "Auto-generated comprehensive regulatory compliance assessment covering EU Space Act, NIS2, national space law, and export control status. Pulled directly from the company's Caelex Comply workspace.",
        fromComply: true,
      },
      {
        id: "ar-002",
        name: "Risk Assessment Summary",
        required: true,
        description:
          "Consolidated risk matrix across all seven risk categories (Technology, Market, Regulatory, Financial, Operational, Competitive, Geopolitical) with probability, impact, and mitigation status.",
        fromComply: true,
      },
      {
        id: "ar-003",
        name: "Space Benchmark Comparison",
        required: true,
        description:
          "Company metrics benchmarked against European New Space industry data including funding, team size, technology readiness, and commercial traction relative to stage-appropriate targets.",
        fromComply: true,
      },
      {
        id: "ar-004",
        name: "Due Diligence Package Summary",
        required: true,
        description:
          "Executive summary of the complete due diligence package including document completeness score, key findings, flagged risks, and investment readiness assessment.",
        fromComply: true,
      },
    ],
  },
];

export const scenarioTemplates: ScenarioTemplate[] = [
  {
    id: "scenario-launch-failure",
    name: "Launch Failure",
    description:
      "Total or partial loss of payload during launch. Covers launch vehicle anomaly during ascent, fairing separation failure, incorrect orbit insertion, or payload deployment malfunction. Assumes primary spacecraft is lost and must be rebuilt and re-launched.",
    triggeredRiskCategories: [
      "TECHNOLOGY",
      "FINANCIAL",
      "OPERATIONAL",
      "MARKET",
    ],
    financialImpactRange: {
      bestCase: -2000000,
      mostLikely: -8000000,
      worstCase: -25000000,
    },
    timeToRecover: "12-24 months",
    mitigationEffectiveness: 0.6,
  },
  {
    id: "scenario-regulatory-delay",
    name: "Regulatory Delay",
    description:
      "Significant delay (6-18 months) in obtaining required space activity authorization, spectrum license, or export control approval. May result from incomplete applications, inter-agency coordination issues, political changes, or new regulatory requirements introduced during the review process.",
    triggeredRiskCategories: ["REGULATORY", "FINANCIAL", "MARKET"],
    financialImpactRange: {
      bestCase: -500000,
      mostLikely: -2000000,
      worstCase: -6000000,
    },
    timeToRecover: "6-18 months",
    mitigationEffectiveness: 0.45,
  },
  {
    id: "scenario-key-person-departure",
    name: "Key Person Departure",
    description:
      "Sudden departure of a co-founder, CTO, or chief engineer who holds critical technical knowledge, key customer relationships, or unique domain expertise. May trigger investor concern, team morale issues, and project delays. Worst case includes departure to a competitor with potential IP leakage.",
    triggeredRiskCategories: [
      "OPERATIONAL",
      "TECHNOLOGY",
      "FINANCIAL",
      "COMPETITIVE",
    ],
    financialImpactRange: {
      bestCase: -200000,
      mostLikely: -1000000,
      worstCase: -4000000,
    },
    timeToRecover: "3-12 months",
    mitigationEffectiveness: 0.55,
  },
  {
    id: "scenario-market-downturn",
    name: "Market Downturn",
    description:
      "Macro-economic downturn or sector-specific correction reduces investor appetite for space ventures and compresses customer budgets. VC funding rounds become harder to close, valuations decline 30-50%, and government procurement programs face budget cuts or deferrals. Revenue growth stalls as customers delay purchasing decisions.",
    triggeredRiskCategories: [
      "FINANCIAL",
      "MARKET",
      "COMPETITIVE",
      "OPERATIONAL",
    ],
    financialImpactRange: {
      bestCase: -1000000,
      mostLikely: -5000000,
      worstCase: -15000000,
    },
    timeToRecover: "12-36 months",
    mitigationEffectiveness: 0.35,
  },
  {
    id: "scenario-cyber-incident",
    name: "Cyber Incident",
    description:
      "Significant cybersecurity breach affecting ground segment systems, satellite command infrastructure, or customer data. Scenarios range from ransomware attack on mission control to unauthorized access to satellite command links. Triggers NIS2 mandatory incident reporting (24h early warning, 72h notification), potential regulatory penalties, and reputational damage.",
    triggeredRiskCategories: [
      "TECHNOLOGY",
      "REGULATORY",
      "FINANCIAL",
      "OPERATIONAL",
    ],
    financialImpactRange: {
      bestCase: -300000,
      mostLikely: -2000000,
      worstCase: -10000000,
    },
    timeToRecover: "1-6 months",
    mitigationEffectiveness: 0.7,
  },
];
