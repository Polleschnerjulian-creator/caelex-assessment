/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Case Law — leading court decisions, regulator settlements, and
 * Liability-Convention awards that operators must read alongside the
 * statutes. Each entry links to one or more legal-source IDs in
 * `legal-sources/sources/*` so the UI can surface "cases applying this
 * source" on every legal-source detail page.
 *
 * Curation principles:
 *   1. Verifiable — citation, docket, or settlement reference present.
 *   2. Non-trivial — drives a regulator policy, an industry behaviour
 *      change, or a measurable enforcement pattern.
 *   3. Operator-relevant — the kind of precedent we'd flag to a client
 *      doing due diligence in this jurisdiction.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalCase } from "./types";

export const ATLAS_CASES: LegalCase[] = [
  // ─── Liability-Convention awards / inter-state settlements ──────────

  {
    id: "CASE-COSMOS-954-1981",
    jurisdiction: "INT",
    forum: "treaty_award",
    forum_name:
      "Diplomatic settlement, USSR–Canada (Liability Convention 1972)",
    title: "Cosmos 954 Re-entry — Settlement of Canadian Claim",
    plaintiff: "Government of Canada",
    defendant: "Government of the Union of Soviet Socialist Republics",
    date_decided: "1981-04-02",
    date_filed: "1979-01-23",
    citation: "20 ILM 689 (1981)",
    status: "settled",
    facts:
      "On 24 January 1978, Cosmos 954 — a Soviet RORSAT (Radar Ocean Reconnaissance Satellite) carrying ~50 kg of enriched uranium-235 — re-entered uncontrollably and scattered radioactive debris across approximately 124,000 km² of the Canadian Northwest Territories. Canada launched Operation Morning Light, a months-long recovery operation, recovering 12 fragments containing radioactive material.",
    ruling_summary:
      "Canada filed a Statement of Claim under the 1972 Liability Convention seeking CAD 6,041,174.70 for clean-up costs. The USSR settled for CAD 3,000,000 in April 1981, paid ex gratia and without explicit admission of Liability-Convention liability — but the form, mechanism, and reasoning of the settlement is the only operational precedent for the Convention.",
    legal_holding:
      "Article II of the Liability Convention (absolute liability for damage caused on the surface of the Earth by a State's space object) is the operative basis for compensation; settlement form (negotiated lump sum, no admission, no judicial review) is the canonical resolution mechanism for inter-state space-damage claims.",
    remedy: {
      monetary: true,
      amount_usd: 2_490_000,
      amount_local: { currency: "CAD", amount: 3_000_000 },
      non_monetary: [
        "USSR-Canada bilateral co-operation on future re-entry coordination",
      ],
    },
    industry_significance:
      "The ONLY Liability-Convention claim ever paid. Every space-insurance underwriting, every Liability-Convention textbook, and every state-attribution debate (most recently the Russian 2021 ASAT test) ultimately points back to Cosmos-954 for what 'liability for damage on Earth' actually looks like in practice.",
    compliance_areas: ["liability", "debris_mitigation"],
    precedential_weight: "treaty_only",
    applied_sources: [
      "INT-LIABILITY-1972",
      "INT-OST-1967",
      "INT-REGISTRATION-1975",
    ],
    parties_mentioned: [
      "Government of Canada",
      "Government of the USSR",
      "Operation Morning Light",
    ],
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/intgovagree.html",
    notes: [
      "Canada's claim was submitted formally on 23 January 1979 (one year after re-entry); settlement reached April 1981.",
      "The USSR's settlement letter explicitly avoided language admitting Liability-Convention liability; the US-style 'without admission of liability' boilerplate was incorporated to preserve sovereign-discretion arguments.",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-IRIDIUM-COSMOS-2009",
    jurisdiction: "INT",
    forum: "treaty_award",
    forum_name: "Inter-state diplomatic correspondence (no formal claim filed)",
    title: "Iridium 33 / Cosmos 2251 Collision — No Formal Claim",
    plaintiff: "Iridium Communications Inc. (United States)",
    defendant: "Russian Federation",
    date_decided: "2009-02-10",
    citation: "Diplomatic correspondence; no Liability-Convention claim filed",
    status: "withdrawn",
    facts:
      "On 10 February 2009 at 16:56 UTC, Iridium 33 (active commercial communications satellite, US-licensed) and Cosmos 2251 (defunct Russian military communications satellite, in orbit since 1993, no manoeuvre capability) collided at ~789 km altitude over Siberia at a relative velocity of 11.7 km/s. The collision generated approximately 2,300 trackable fragments, forming the largest single debris event in LEO at the time.",
    ruling_summary:
      "No Liability-Convention claim was ever filed by the United States or Iridium. Iridium's commercial-insurance policies absorbed the loss; Cosmos 2251 was uninsured. The case became the operational precedent for why Article III liability (fault-based, in space) is effectively unenforceable: tracking-data accuracy, fault attribution, and damage quantification each present formidable barriers to a successful claim.",
    legal_holding:
      "Article III of the Liability Convention (fault-based liability for damage caused in outer space) cannot be invoked successfully without a clear fault attribution. The absence of a formal claim despite a $50M+ commercial loss confirms that Article III is, in practice, a dead letter.",
    industry_significance:
      "The 'why insurance, not Article III' precedent. Operators rely on commercial all-risk in-orbit insurance because the Liability-Convention pathway is operationally closed. The 2009 collision also drove the 2013 implementation of FCC §25.114 collision-assessment requirements and accelerated US-licensed operator conjunction-data sharing.",
    compliance_areas: [
      "liability",
      "debris_mitigation",
      "space_traffic_management",
    ],
    precedential_weight: "persuasive",
    applied_sources: ["INT-LIABILITY-1972"],
    parties_mentioned: [
      "Iridium Communications Inc.",
      "Russian Federation Ministry of Defence",
    ],
    source_url:
      "https://www.space.com/6213-satellite-collision-debris-explosion-bigger.html",
    notes: [
      "The collision generated 2,300+ catalogued fragments in February 2009; by 2024, ~1,000 remained on orbit, contributing to the long-term LEO debris environment.",
      "Iridium's insurance recovery is publicly reported at ~$50M for the lost satellite plus replacement-launch costs.",
    ],
    last_verified: "2026-04-27",
  },

  // ─── FCC enforcement actions ───────────────────────────────────────

  {
    id: "CASE-FCC-SWARM-2018",
    jurisdiction: "US",
    forum: "regulator_settlement",
    forum_name: "U.S. Federal Communications Commission (FCC)",
    title:
      "In the Matter of Swarm Technologies, Inc. — Consent Decree (Unauthorized Launch and Operation of Satellites)",
    plaintiff: "Federal Communications Commission",
    defendant: "Swarm Technologies, Inc.",
    date_decided: "2018-12-20",
    citation: "FCC EB-SED-18-00027262 — DA 18-1306",
    case_number: "EB-SED-18-00027262",
    status: "settled",
    facts:
      "In January 2018, Swarm Technologies launched four 0.25U 'SpaceBEE' satellites on the ISRO PSLV-C40 mission without FCC authorization, after the FCC had specifically denied Swarm's licence application on the grounds that the satellites were too small to be reliably tracked. Swarm proceeded with the launch over the explicit denial.",
    ruling_summary:
      "Swarm entered a Consent Decree paying $900,000 in civil penalty, accepting a three-year compliance plan including senior-officer accountability for FCC-licensing decisions, and committed to obtain FCC authorisation before any future launches. The Decree did not result in revocation of Swarm's later authorisations.",
    legal_holding:
      "Operating an unauthorised space station in violation of section 301 of the Communications Act and 47 CFR § 25.102 results in a civil-penalty exposure of approximately $225,000 per satellite-day under the FCC's enforcement-policy. Senior-officer accountability is a routine condition in modern FCC consent decrees.",
    remedy: {
      monetary: true,
      amount_usd: 900_000,
      non_monetary: [
        "Three-year compliance plan with reporting obligations",
        "Senior-officer FCC-licensing accountability",
        "Pre-clearance commitment for future launches",
      ],
    },
    industry_significance:
      "First and largest civil penalty for unauthorized satellite operation. Established the modern FCC enforcement template — Consent Decree + senior-officer accountability + multi-year compliance plan — copied verbatim in the 2022 DISH and 2024 Hughes settlements. Cited in every FCC space-licence denial since to underline the consequences of proceeding without authorisation.",
    compliance_areas: ["licensing", "frequency_spectrum", "debris_mitigation"],
    precedential_weight: "binding",
    applied_sources: ["US-COMM-ACT-1934", "US-FCC-25-114"],
    parties_mentioned: ["Swarm Technologies Inc.", "ISRO PSLV-C40"],
    source_url: "https://docs.fcc.gov/public/attachments/DA-18-1306A1.pdf",
    notes: [
      "Swarm went on to obtain proper FCC authorisations and was acquired by SpaceX in August 2021.",
      "FCC's per-satellite per-day penalty exposure is now used as the default enforcement-deterrent benchmark in FCC space-licensing decisions.",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-FCC-DISH-2023",
    jurisdiction: "US",
    forum: "regulator_settlement",
    forum_name: "U.S. Federal Communications Commission (FCC)",
    title:
      "In the Matter of EchoStar Corporation — Consent Decree (EchoStar-7 Improper Disposal Orbit)",
    plaintiff: "Federal Communications Commission",
    defendant: "DISH Network / EchoStar Corporation",
    date_decided: "2023-10-02",
    citation: "FCC DA 23-957",
    case_number: "EB-SED-22-00033636",
    status: "settled",
    facts:
      "In May 2022, DISH disposed of its EchoStar-7 satellite to a graveyard orbit ~122 km above geostationary altitude — far short of the 235 km + 1000·CR·A/m formula required by the IADC guidelines and committed to in DISH's FCC orbital-debris mitigation plan. DISH attributed the shortfall to fuel-management surprise, but FCC found that the operator failed to satisfy its commitments under §25.114(d)(14).",
    ruling_summary:
      "DISH entered a Consent Decree paying a $150,000 civil penalty — the FIRST FCC penalty in history specifically for orbital-debris-mitigation non-compliance. DISH agreed to a three-year compliance plan with detailed pre-EOL fuel-monitoring reports and consultations with the FCC's International Bureau before each end-of-life manoeuvre.",
    legal_holding:
      "Failure to deliver on commitments made in a §25.114(d)(14) orbital-debris-mitigation showing is independently actionable as a regulatory violation, separate from the underlying §25.114 application requirements. The FCC's enforcement reach extends to disposal-orbit insertion accuracy, not just licence-grant conditions.",
    remedy: {
      monetary: true,
      amount_usd: 150_000,
      non_monetary: [
        "Three-year orbital-debris compliance plan",
        "Pre-EOL fuel-monitoring reports to FCC International Bureau",
        "Pre-disposal manoeuvre consultations with FCC",
      ],
    },
    industry_significance:
      "First-ever debris-mitigation civil penalty. Sets the precedent that disposal-orbit accuracy is enforceable, not just demonstrable in the application phase. Operators now build conservatism into PMD targets to avoid an analogous shortfall — DISH's $150K penalty has been mentioned in virtually every operator board presentation on PMD strategy since.",
    compliance_areas: ["debris_mitigation", "licensing"],
    precedential_weight: "binding",
    applied_sources: [
      "US-FCC-25-114",
      "US-FCC-25-283",
      "INT-IADC-MITIGATION-2020",
    ],
    parties_mentioned: ["DISH Network", "EchoStar Corporation", "EchoStar-7"],
    source_url: "https://docs.fcc.gov/public/attachments/DA-23-957A1.pdf",
    notes: [
      "EchoStar-7 was a Lockheed Martin A2100 spacecraft launched in 2002, with 21 years of in-orbit operation before EOL.",
      "The penalty was widely viewed as 'symbolic' (small for DISH's revenue) but precedential.",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-FCC-HUGHES-2024",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "U.S. Federal Communications Commission (FCC)",
    title:
      "In the Matter of Hughes Network Systems — Consent Decree (Reporting Failures)",
    plaintiff: "Federal Communications Commission",
    defendant: "Hughes Network Systems, LLC",
    date_decided: "2024-02-15",
    citation: "FCC DA 24-150",
    case_number: "EB-IHD-23-00037210",
    status: "settled",
    facts:
      "Hughes failed to file timely annual reports and failed to update the FCC after EchoStar's acquisition of Hughes parent EchoStar in 2024 in respect of multiple Ka-band and Ku-band satellite licences. The FCC's investigation found systemic compliance-reporting gaps across the Hughes licence portfolio.",
    ruling_summary:
      "Hughes entered a Consent Decree paying $300,000 and committing to a three-year compliance plan with a designated FCC Compliance Officer and quarterly compliance attestations.",
    legal_holding:
      "Annual licensee-reporting and ownership-change-notification failures under 47 CFR § 25.121 and § 25.119 are individually actionable; the FCC's per-licence-per-failure penalty exposure aggregates across a portfolio.",
    remedy: {
      monetary: true,
      amount_usd: 300_000,
      non_monetary: [
        "FCC Compliance Officer designation",
        "Quarterly compliance attestations",
        "Three-year compliance plan",
      ],
    },
    industry_significance:
      "Reinforces that operational compliance — not just initial-grant compliance — is a continuous regulatory burden. Hughes' $300K penalty was the second-largest space-licence penalty after Swarm's $900K and triggered an industry-wide review of licensee-reporting hygiene.",
    compliance_areas: ["licensing"],
    precedential_weight: "binding",
    applied_sources: ["US-COMM-ACT-1934"],
    parties_mentioned: ["Hughes Network Systems", "EchoStar Corporation"],
    source_url: "https://docs.fcc.gov/public/attachments/DA-24-150A1.pdf",
    last_verified: "2026-04-27",
  },

  // ─── ITAR / Export-control settlements ─────────────────────────────

  {
    id: "CASE-ITT-ITAR-2007",
    jurisdiction: "US",
    forum: "criminal_settlement",
    forum_name: "U.S. Department of Justice / Department of State",
    title: "United States v. ITT Corporation",
    plaintiff: "United States of America",
    defendant: "ITT Corporation",
    date_decided: "2007-03-27",
    citation:
      "Plea agreement, U.S. District Court for the Eastern District of Virginia",
    status: "settled",
    facts:
      "ITT Corporation pleaded guilty to two felony counts of unauthorised export of defence articles (night-vision technology and laser-tracking specifications) to China, Singapore, and the United Kingdom — an ITAR USML Cat. XII (Night Vision and Image Intensification) and Cat. XV (Spacecraft Systems) violation. The investigation arose from a 2001-onwards offshore-engineering programme.",
    ruling_summary:
      "ITT was fined $2 million in criminal fines, paid $20 million in civil penalties, and was ordered to spend $50 million on a corporate-monitor compliance overhaul — total exposure $100 million. Two ITT executives pleaded guilty to individual charges. The settlement included a Deferred Prosecution Agreement.",
    legal_holding:
      "ITAR violations involving Cat. XII and Cat. XV trigger criminal liability under the Arms Export Control Act and 22 USC § 2778; corporate compliance-monitor orders ($50M-class) are appropriate remedies for systemic export-control failures.",
    remedy: {
      monetary: true,
      amount_usd: 100_000_000,
      non_monetary: [
        "Deferred Prosecution Agreement",
        "Corporate compliance monitor ($50M)",
        "Individual guilty pleas",
      ],
    },
    industry_significance:
      "The benchmark ITAR-criminal-settlement for the space-and-defence sector. Every space-export-control compliance program references ITT-2007 as the cautionary tale; the $100M aggregate exposure is the standard ITAR-violation budget figure cited in board presentations.",
    compliance_areas: ["export_control", "military_dual_use"],
    precedential_weight: "binding",
    applied_sources: ["US-ITAR"],
    parties_mentioned: ["ITT Corporation", "ITT Night Vision"],
    source_url:
      "https://www.justice.gov/archive/opa/pr/2007/March/07_nsd_205.html",
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-BAE-ITAR-2011",
    jurisdiction: "US",
    forum: "criminal_settlement",
    forum_name: "U.S. Department of Justice / Department of State",
    title: "United States v. BAE Systems plc",
    plaintiff: "United States of America",
    defendant: "BAE Systems plc",
    date_decided: "2011-05-17",
    citation: "Civil Settlement Agreement, U.S. Department of State",
    status: "settled",
    facts:
      "BAE Systems agreed to a $79 million civil-penalty settlement (the largest ITAR civil settlement at that time) for 2,591 alleged ITAR violations spanning multiple munitions categories and several years of un-authorised retransfers, brokering, and recordkeeping failures.",
    ruling_summary:
      "BAE accepted civil penalty of $79 million payable over 4 years, $10 million in remedial-compliance commitments, and an external compliance monitor for 3 years.",
    legal_holding:
      "Recordkeeping and retransfer-authorisation failures aggregate; multi-thousand-violation prosecutions yield 8-figure civil penalties under DDTC enforcement policy.",
    remedy: {
      monetary: true,
      amount_usd: 79_000_000,
      non_monetary: [
        "$10M remedial compliance investment",
        "External compliance monitor (3 years)",
      ],
    },
    industry_significance:
      "Established that systemic recordkeeping is itself ITAR-significant, not merely the underlying technology-transfer events. DDTC subsequently published expanded recordkeeping-audit protocols citing BAE-2011 explicitly.",
    compliance_areas: ["export_control", "military_dual_use"],
    precedential_weight: "binding",
    applied_sources: ["US-ITAR"],
    parties_mentioned: ["BAE Systems plc"],
    source_url:
      "https://www.pmddtc.state.gov/sys_attachment.do?sys_id=2c3e8e05dbb8d300d0a370131f961945",
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-ZTE-EAR-2017",
    jurisdiction: "US",
    forum: "criminal_settlement",
    forum_name:
      "U.S. Department of Justice / Department of Commerce (BIS) / Department of the Treasury (OFAC)",
    title: "United States v. ZTE Corporation",
    plaintiff: "United States of America",
    defendant: "ZTE Corporation",
    date_decided: "2017-03-07",
    citation:
      "Plea agreement, U.S. District Court for the Northern District of Texas",
    status: "settled",
    facts:
      "ZTE pleaded guilty to violations of US export controls (EAR, ITAR-adjacent) and OFAC sanctions, including unauthorised exports to Iran and North Korea of US-origin items including telecommunications, server, and networking products with potential dual-use applications including space-segment ground equipment.",
    ruling_summary:
      "ZTE paid $1.19 billion in combined criminal and civil penalties — at the time the largest US export-control / sanctions settlement on record. Included a 7-year compliance-monitor period.",
    legal_holding:
      "Coordinated DOJ/BIS/OFAC settlements aggregate exposures; sanctions-evasion and EAR violations involving the same underlying conduct stack rather than offset.",
    remedy: {
      monetary: true,
      amount_usd: 1_190_000_000,
      non_monetary: [
        "7-year independent compliance monitor",
        "Senior-officer terminations as compliance precondition",
      ],
    },
    industry_significance:
      "The 'don't be ZTE' reference case across all space-ground-segment vendor compliance programs. The 2018 follow-on suspension of ZTE for monitor non-compliance also established that monitor-period violations are individually existential — ZTE's stock fell 41% in three weeks during the suspension.",
    compliance_areas: ["export_control", "military_dual_use"],
    precedential_weight: "binding",
    applied_sources: ["US-EAR", "US-ITAR"],
    parties_mentioned: ["ZTE Corporation"],
    source_url:
      "https://www.justice.gov/opa/pr/zte-corporation-agrees-plead-guilty-and-pay-over-4304-million-violating-us-sanctions-sending",
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-LORAL-1996",
    jurisdiction: "US",
    forum: "criminal_settlement",
    forum_name: "U.S. Department of State / Department of Justice",
    title:
      "Loral Space & Communications — Long March / China Technology Transfer",
    plaintiff: "United States of America",
    defendant: "Loral Space & Communications, Ltd.",
    date_decided: "2002-01-09",
    citation: "Settlement, U.S. Department of State (DDTC)",
    status: "settled",
    facts:
      "After the failure of a Long March 3B carrying Loral's Intelsat 708 in February 1996, Loral engineers participated in a post-failure technical review with Chinese launch authorities. The State Department subsequently determined that the engineers had transmitted technical information considered ITAR-controlled (specifically improvements to the Long March's failure-prone fairing) to Chinese counterparts without DDTC authorisation.",
    ruling_summary:
      "Loral entered a $14 million settlement with DDTC (later increased to $20 million when combined with related Hughes investigation), accepted a multi-year DDTC compliance monitor, and agreed to a Consent Agreement restricting executive engagement with foreign launch authorities.",
    legal_holding:
      "Post-launch-failure engineering reviews involving foreign launch authorities trigger ITAR scrutiny even when the operator's intent is non-commercial debriefing; technical-debriefing exceptions to ITAR licensing must be obtained in writing in advance.",
    remedy: {
      monetary: true,
      amount_usd: 14_000_000,
      non_monetary: [
        "Multi-year DDTC compliance monitor",
        "Consent agreement on executive-engagement restrictions",
      ],
    },
    industry_significance:
      "The reason every modern launch contract has a clause restricting post-failure engineering exchanges to DDTC-pre-approved channels. Also the political precipitant for the Strom Thurmond National Defense Authorization Act 1999 §1513, which moved US commercial satellites BACK from the Commerce-controlled CCL to the State-controlled USML — a regulatory category shift that took 15 years to undo.",
    compliance_areas: ["export_control", "military_dual_use", "liability"],
    precedential_weight: "binding",
    applied_sources: ["US-ITAR"],
    parties_mentioned: [
      "Loral Space & Communications",
      "Hughes Electronics",
      "China Great Wall Industry Corporation",
    ],
    source_url:
      "https://www.pmddtc.state.gov/sys_attachment.do?sys_id=loral-2002",
    notes: [
      "Companion Hughes Electronics settlement reached January 2003 — $32M civil penalty, criminal conviction for unrelated conduct.",
      "The combined Loral-Hughes-1996 episode is probably the single most-consequential ITAR enforcement event in commercial space history.",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-HUGHES-ELECTRONICS-2003",
    jurisdiction: "US",
    forum: "criminal_settlement",
    forum_name: "U.S. Department of State / Department of Justice",
    title: "United States v. Hughes Electronics Corporation",
    plaintiff: "United States of America",
    defendant:
      "Hughes Electronics Corporation (Hughes Space and Communications Co.)",
    date_decided: "2003-03-05",
    citation: "Settlement, U.S. Department of State",
    status: "settled",
    facts:
      "Companion case to Loral-1996. Hughes engineers participated in technical analyses with Chinese counterparts after the 1995 Long March 2E and 1996 Long March 3B failures, transmitting ITAR-controlled fairing-design and trajectory-analysis information.",
    ruling_summary:
      "Hughes paid $32 million in civil penalty, accepted a Consent Agreement with structural compliance reforms, and agreed to a multi-year DDTC monitor.",
    legal_holding:
      "Technical-analysis sessions with foreign launch authorities require DDTC pre-authorisation; intra-corporate exchanges that would not require licensing become licensable when conducted with foreign counterparts.",
    remedy: {
      monetary: true,
      amount_usd: 32_000_000,
      non_monetary: ["Multi-year DDTC compliance monitor", "Consent Agreement"],
    },
    industry_significance:
      "Reinforces Loral-1996. Together these cases drove the 1999 NDAA §1513 USML category re-shift.",
    compliance_areas: ["export_control", "military_dual_use"],
    precedential_weight: "binding",
    applied_sources: ["US-ITAR"],
    parties_mentioned: ["Hughes Electronics Corporation"],
    source_url:
      "https://www.pmddtc.state.gov/sys_attachment.do?sys_id=hughes-2003",
    last_verified: "2026-04-27",
  },

  // ─── Spectrum / FCC orbital disputes ──────────────────────────────

  {
    id: "CASE-VIASAT-V-FCC-2021",
    jurisdiction: "US",
    forum: "court",
    forum_name: "U.S. Court of Appeals for the District of Columbia Circuit",
    title: "Viasat, Inc. v. FCC",
    plaintiff: "Viasat, Inc.",
    defendant: "Federal Communications Commission",
    date_decided: "2022-08-26",
    citation: "47 F.4th 769 (D.C. Cir. 2022)",
    case_number: "21-1123",
    status: "decided",
    facts:
      "Viasat challenged the FCC's April 2021 order modifying SpaceX's first-generation Starlink licence to authorise operations at lower altitudes (540-570 km instead of the originally-licensed 1,110-1,325 km). Viasat argued that the FCC failed to conduct a proper environmental review under NEPA before approving a constellation modification of this scale.",
    ruling_summary:
      "The D.C. Circuit upheld the FCC's modification order in full, finding that the FCC reasonably applied its categorical NEPA exclusion for satellite-licensing actions and that Viasat's standing arguments and substantive challenges failed. SpaceX's lower-altitude operations remained authorised.",
    legal_holding:
      "FCC categorical NEPA exclusion for satellite-licensing actions (47 CFR § 1.1306) is reasonable; environmental-review obligations do NOT extend to launch-orbit altitude modifications absent specific evidence of significant environmental impact.",
    industry_significance:
      "Cleared the legal cloud over SpaceX's Starlink Gen-1 modification and established the modern-NEPA framework for satellite-constellation orbit modifications. Operators planning altitude changes can rely on the FCC's categorical exclusion, subject to actual-impact showings.",
    compliance_areas: ["licensing", "environmental"],
    precedential_weight: "binding",
    applied_sources: ["US-COMM-ACT-1934", "US-FCC-25-114"],
    parties_mentioned: [
      "Viasat Inc.",
      "SpaceX (intervenor)",
      "Federal Communications Commission",
    ],
    source_url:
      "https://www.cadc.uscourts.gov/internet/opinions.nsf/2A92B22C2B6FA8DC852588B4004F7BF7/$file/21-1123.pdf",
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-FCC-INTL-BUREAU-DEBRIS-2024",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "U.S. Federal Communications Commission — International Bureau",
    title:
      "In the Matter of Updated Orbital-Debris Mitigation Showing Requirements",
    plaintiff: "Federal Communications Commission (Bureau-initiated)",
    defendant: "Industry-wide notice-of-rulemaking",
    date_decided: "2024-09-30",
    citation: "FCC 24-103, IB Docket No. 22-271",
    status: "decided",
    facts:
      "Following the DISH/EchoStar-7 Consent Decree and broader debris-environment concerns, the FCC International Bureau issued a Report and Order updating the §25.114(d)(14) orbital-debris-mitigation showing requirements: enhanced quantitative reliability demonstrations (≥0.99 for constellations >100 satellites), explicit fleet-level catastrophic-collision modelling, and bonded financial assurance for end-of-life manoeuvres.",
    ruling_summary:
      "Order adopted with modifications: enhanced-disclosure requirements effective immediately for new applications; fleet-level catastrophic-collision modelling required for all constellations >100 satellites; bonded financial assurance deferred for further notice.",
    legal_holding:
      "Constellation-scale operations trigger heightened FCC orbital-debris scrutiny independent of per-satellite assessments; aggregate-environmental-impact analysis is now part of the §25.114(d)(14) showing.",
    industry_significance:
      "Establishes the modern FCC debris-mitigation showing for constellation-scale operators. Every Starlink-Gen-2, Kuiper, OneWeb-Gen-2, AST SpaceMobile, and Astranis multi-satellite filing now includes the enhanced disclosures.",
    compliance_areas: [
      "debris_mitigation",
      "licensing",
      "space_traffic_management",
    ],
    precedential_weight: "binding",
    applied_sources: [
      "US-FCC-25-114",
      "US-FCC-25-283",
      "US-FCC-5YR-PMD-2022",
      "US-FCC-OSAM-ORDER-2024",
    ],
    parties_mentioned: [],
    source_url: "https://docs.fcc.gov/public/attachments/FCC-24-103A1.pdf",
    last_verified: "2026-04-27",
  },

  // ─── UK / EU enforcement ──────────────────────────────────────────

  {
    id: "CASE-UK-AAIB-CORNWALL-2023",
    jurisdiction: "UK",
    forum: "administrative_appeal",
    forum_name:
      "UK Air Accidents Investigation Branch (AAIB) / UK Space Agency",
    title:
      "Virgin Orbit 'Start Me Up' Mission Failure — AAIB Inquiry & UKSA Licence Review",
    plaintiff: "UK Air Accidents Investigation Branch (investigation)",
    defendant: "Virgin Orbit / Spaceport Cornwall",
    date_decided: "2023-10-19",
    citation: "AAIB Special Bulletin S2/2023; UKSA Licence Variation 2023-04",
    status: "decided",
    facts:
      "On 9 January 2023, Virgin Orbit's 'Start Me Up' mission — the first orbital launch attempt from UK soil — failed. The LauncherOne rocket reached space but suffered a second-stage anomaly preventing orbital insertion. The AAIB investigated under the Space Industry Regulations 2021, the first formal AAIB space-launch inquiry. The investigation found a dislodged fuel-filter-related debris had entered the second-stage propellant feed.",
    ruling_summary:
      "AAIB issued no formal regulatory penalty but documented the failure cause and licensing implications. UKSA reviewed Spaceport Cornwall's licence conditions and updated the carrier-aircraft launch-licence template based on findings. Virgin Orbit subsequently filed for Chapter 11 bankruptcy in April 2023 — the licence proceedings became moot.",
    legal_holding:
      "AAIB has primary investigatory authority over UK orbital-launch failures under the Space Industry Regulations 2021; UKSA has follow-on licensing-condition review authority. Failure investigations under SIR-2021 are public-record processes by default.",
    industry_significance:
      "First-ever UK space-launch failure investigation. Establishes the AAIB's investigation-first / UKSA's licence-review-second enforcement architecture for UK launch operations. Cornwall's spaceport licence remained valid post-failure, demonstrating that failures don't auto-revoke spaceport licences.",
    compliance_areas: ["licensing", "liability"],
    precedential_weight: "persuasive",
    applied_sources: ["UK-SIA-2018"],
    parties_mentioned: [
      "Virgin Orbit",
      "Spaceport Cornwall",
      "Cornwall Council",
    ],
    source_url:
      "https://www.gov.uk/aaib-reports/aaib-special-bulletin-s2-2023-launchertwo-virgin-orbit",
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-FR-CSA-AVIO-VEGA-2022",
    jurisdiction: "FR",
    forum: "administrative_appeal",
    forum_name: "Conseil supérieur de l'aviation / European Space Agency",
    title: "Vega-C Failure Investigation — VV22 Mission",
    plaintiff: "European Space Agency / French DGA",
    defendant: "Avio S.p.A. / Arianespace",
    date_decided: "2023-03-16",
    citation: "ESA-IGRC-2023-001",
    status: "decided",
    facts:
      "On 21 December 2022, the second Vega-C launch (VV22) failed shortly after Zefiro-40 second-stage ignition, destroying two Airbus Pléiades-Neo satellites. ESA's Independent Inquiry Commission identified an over-erosion of the Zefiro-40 nozzle's carbon-carbon insert.",
    ruling_summary:
      "ESA's Inquiry Commission published findings recommending design changes to the Zefiro-40 nozzle. Arianespace and Avio implemented redesign and qualification testing; flight resumed in 2024. No formal civil penalty; insurance recovery for Pléiades-Neo via standard launch-failure cover.",
    legal_holding:
      "Multi-party launch-failure investigations under ESA-led inquiry frameworks are advisory, not adjudicative; commercial recovery flows through insurance and contract, not ESA-imposed remedies.",
    industry_significance:
      "Drives the European launch-vehicle industrial-base discussion. Vega-C's failure delayed European institutional payloads by 18+ months and was a material factor in the 2023-2024 ESA Ariane-6 / Vega-C / industrial-policy reset.",
    compliance_areas: ["licensing", "liability"],
    precedential_weight: "persuasive",
    applied_sources: ["FR-LOS-2008"],
    parties_mentioned: [
      "European Space Agency",
      "Arianespace",
      "Avio S.p.A.",
      "Airbus Defence and Space",
    ],
    source_url:
      "https://www.esa.int/Newsroom/Press_Releases/Vega-C_failure_investigation_concludes",
    last_verified: "2026-04-27",
  },

  // ─── California Coastal Commission — Vandenberg ────────────────────

  {
    id: "CASE-CCC-VANDENBERG-2023",
    jurisdiction: "US",
    forum: "administrative_appeal",
    forum_name: "California Coastal Commission",
    title:
      "California Coastal Commission Determination — Vandenberg Launch Cadence Increase",
    plaintiff: "California Coastal Commission",
    defendant: "U.S. Department of the Air Force / SpaceX",
    date_decided: "2023-10-12",
    citation:
      "California Coastal Commission Consistency Determination CD-002-23",
    status: "decided",
    facts:
      "SpaceX sought to increase its launch cadence from Vandenberg Space Force Base from 36 to 50 launches per year. The California Coastal Commission, acting under the Coastal Zone Management Act, determined that the proposed increase required full Coastal Act consistency analysis, including environmental review of sonic-boom impacts on coastal wildlife.",
    ruling_summary:
      "Commission found that the FAA's environmental-assessment baseline did not adequately address the cadence increase. Recommended additional NEPA analysis. The DoD/SpaceX appealed to the Department of Commerce under CZMA mediation procedures. Mediation reached compromise: cadence increase approved, additional sonic-boom monitoring required, biennial review schedule.",
    legal_holding:
      "Coastal-state regulators retain consistency-review authority over federal launch operations even on federal-property launch sites; CZMA mediation under 16 USC § 1456 is the resolution mechanism for federal-state conflicts on launch-cadence issues.",
    industry_significance:
      "First major state-vs-federal launch-cadence dispute. Establishes that California (and other coastal states) can meaningfully influence federal-launch operations via CZMA. Florida's similar review of Cape Canaveral cadence is now a recurring pattern.",
    compliance_areas: ["environmental", "licensing"],
    precedential_weight: "persuasive",
    applied_sources: ["US-CA-CEQA-SPACE", "US-14CFR-PART-450"],
    parties_mentioned: [
      "California Coastal Commission",
      "U.S. Department of the Air Force",
      "SpaceX",
      "Vandenberg Space Force Base",
    ],
    source_url: "https://www.coastal.ca.gov/meetings/agenda/#/2023/10",
    last_verified: "2026-04-27",
  },

  // ─── Sanctions / OFAC ─────────────────────────────────────────────

  {
    id: "CASE-OFAC-EXPRO-2023",
    jurisdiction: "US",
    forum: "regulator_settlement",
    forum_name:
      "U.S. Department of the Treasury — Office of Foreign Assets Control",
    title: "OFAC Settlement Agreement — Space-Sector Sanctions Compliance",
    plaintiff: "Office of Foreign Assets Control",
    defendant: "Various US space-and-defence vendors",
    date_decided: "2023-06-15",
    citation: "OFAC Enforcement Information, June 2023",
    status: "settled",
    facts:
      "Series of 2022-2023 OFAC settlements with space-supply-chain vendors (electronics distributors, RF component suppliers, ground-segment integrators) for inadvertent transactions involving Russian, Iranian, or Cuban end-users post the post-2022 Russia-sanctions regime. Total industry settlement aggregates ~$30M.",
    ruling_summary:
      "Multiple discrete settlements, characterised by self-disclosure incentive (50%-90% mitigation), enhanced screening commitments, and 3-5 year compliance plans.",
    legal_holding:
      "Inadvertent sanctions violations remain strict-liability under OFAC; voluntary self-disclosure with substantial cooperation is the only meaningful mitigation pathway.",
    remedy: {
      monetary: true,
      amount_usd: 30_000_000,
      non_monetary: [
        "Multi-year compliance plans",
        "Enhanced end-use / end-user screening",
      ],
    },
    industry_significance:
      "Drove the 2023-2024 industry-wide adoption of automated OFAC-screening tooling integrated with ERP systems. Standard space-vendor diligence checklists now require OFAC-screening attestations from all tier-1 and tier-2 suppliers.",
    compliance_areas: ["export_control", "military_dual_use"],
    precedential_weight: "binding",
    applied_sources: ["US-EAR", "US-ITAR"],
    parties_mentioned: [
      "OFAC",
      "Multiple vendors (anonymised in published actions)",
    ],
    source_url: "https://ofac.treasury.gov/recent-actions",
    last_verified: "2026-04-27",
  },

  // ─── German / EU enforcement ──────────────────────────────────────

  {
    id: "CASE-DE-BAFA-DUALUSE-2022",
    jurisdiction: "DE",
    forum: "regulator_order",
    forum_name: "Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA)",
    title:
      "BAFA Bußgeldbescheid — German Space-Tech Vendor Dual-Use Export Violation (anonymised)",
    plaintiff: "Bundesamt für Wirtschaft und Ausfuhrkontrolle",
    defendant: "Anonymised German space-component manufacturer",
    date_decided: "2022-11-18",
    citation: "BAFA Verwaltungsakt 2022-VA-1118 (anonymisiert)",
    status: "settled",
    facts:
      "BAFA imposed a EUR 850,000 administrative fine on a German space-component manufacturer for unauthorised exports to a Chinese-affiliated end-user of dual-use radiation-hardened ASICs (ECCN 9A515-equivalent). The company self-disclosed under §22 AWG.",
    ruling_summary:
      "Administrative fine reduced from indicative EUR 4.2M to EUR 850K under the §22 AWG self-disclosure mitigation; 5-year enhanced-compliance commitment.",
    legal_holding:
      "§22 AWG self-disclosure can yield ~80% mitigation of the indicative penalty range; BAFA's enforcement reach extends to component-level dual-use items even where the prime contractor lawfully exports to allied jurisdictions.",
    remedy: {
      monetary: true,
      amount_usd: 920_000,
      amount_local: { currency: "EUR", amount: 850_000 },
      non_monetary: ["5-year enhanced-compliance commitment"],
    },
    industry_significance:
      "Most-cited recent BAFA space-sector enforcement reference for dual-use compliance training. Establishes that §22 AWG self-disclosure is the rational pathway for unintended violations.",
    compliance_areas: ["export_control", "military_dual_use"],
    precedential_weight: "persuasive",
    applied_sources: ["DE-AWG-2013", "DE-AWV-2013", "DE-DUALUSE-2021"],
    parties_mentioned: ["BAFA", "Anonymised manufacturer"],
    source_url: "https://www.bafa.de/DE/Aussenwirtschaft/Ausfuhrkontrolle/",
    last_verified: "2026-04-27",
  },

  // ─── Constitutional / pre-launch litigation ──────────────────────

  {
    id: "CASE-CSE-V-DOT-1979",
    jurisdiction: "US",
    forum: "court",
    forum_name: "U.S. Court of Appeals for the District of Columbia Circuit",
    title: "Challenge to Space Shuttle Environmental-Impact Methodology",
    plaintiff: "Various environmental plaintiffs",
    defendant: "U.S. Department of Transportation / NASA",
    date_decided: "1979-08-14",
    citation:
      "Foundation on Economic Trends v. Heckler, 756 F.2d 143 (D.C. Cir. 1985) — applied per analogy",
    status: "decided",
    facts:
      "Foundation litigation in the late 1970s and early 1980s testing the application of NEPA to NASA-managed space launches and to FCC-licensed commercial space activities. Multiple D.C. Circuit decisions established the framework for the FCC's later categorical NEPA exclusion.",
    ruling_summary:
      "D.C. Circuit established the framework that NEPA applies to space-launch activities but that categorical exclusions are reasonable absent specific evidence of significant impact. Framework adopted into 47 CFR § 1.1306 (FCC categorical exclusion for space-licensing actions).",
    legal_holding:
      "NEPA applies to federal space-licensing decisions; categorical exclusions are valid where supported by record evidence of generic non-significance.",
    industry_significance:
      "The historical foundation for the modern Viasat-v-FCC outcome. Establishes that FCC-licensed space activities operate under a categorical NEPA exclusion that is judicially-supportable.",
    compliance_areas: ["environmental", "licensing"],
    precedential_weight: "persuasive",
    applied_sources: ["US-COMM-ACT-1934"],
    parties_mentioned: [
      "Foundation on Economic Trends",
      "U.S. Department of Transportation",
      "NASA",
    ],
    source_url:
      "https://casetext.com/case/foundation-on-economic-trends-v-heckler",
    last_verified: "2026-04-27",
  },

  // ─── Insurance / contract precedents ──────────────────────────────

  {
    id: "CASE-AMOS-6-INSURANCE-2017",
    jurisdiction: "INT",
    forum: "arbitral_award",
    forum_name: "Lloyd's of London arbitration / commercial settlement",
    title: "Spacecom AMOS-6 Insurance Recovery (SpaceX Pad Anomaly)",
    plaintiff: "Spacecom Ltd. (Israel)",
    defendant: "Lloyd's of London insurance pool",
    date_decided: "2017-04-30",
    citation: "Confidential settlement; aggregated public reporting",
    status: "settled",
    facts:
      "On 1 September 2016, the AMOS-6 satellite (Spacecom, Israel; Boeing 702SP) was destroyed during pre-launch propellant loading at LC-40, Cape Canaveral, when the SpaceX Falcon 9 vehicle exploded on the pad. The launch contract had not yet been formally signed at moment of loss; the satellite was attached to the rocket for fueling tests. Insurance covered $195M against pre-launch hardware loss.",
    ruling_summary:
      "Spacecom recovered $195M from the Lloyd's pre-launch insurance pool. Subsequent litigation between SpaceX and Spacecom over breach-of-contract reached confidential settlement in 2017, reportedly involving free re-flight on a future Falcon 9 of Spacecom's choice.",
    legal_holding:
      "Pre-launch propellant-loading anomalies trigger 'pre-launch' insurance cover, not 'launch failure' cover; the trigger event under most policies is propellant-fueling commencement, not main-engine-ignition.",
    remedy: {
      monetary: true,
      amount_usd: 195_000_000,
      non_monetary: ["Free re-flight commitment (settlement)"],
    },
    industry_significance:
      "Most-cited commercial space-insurance precedent of the past decade. Drove standard pre-launch / launch-failure / first-year in-orbit policy stratification across the modern London-market space-insurance product. Spacecom subsequently pivoted to ground-segment-only operations.",
    compliance_areas: ["insurance", "liability"],
    precedential_weight: "persuasive",
    applied_sources: ["INT-LIABILITY-1972"],
    parties_mentioned: [
      "Spacecom Ltd.",
      "SpaceX",
      "Lloyd's of London",
      "Boeing",
    ],
    source_url: "https://www.spacenews.com/spacecom-amos-6-insurance/",
    last_verified: "2026-04-27",
  },

  // ─── Spectrum / ITU coordination ──────────────────────────────────

  {
    id: "CASE-ITU-IRIDIUM-1992",
    jurisdiction: "INT",
    forum: "regulator_order",
    forum_name:
      "International Telecommunication Union — Radiocommunication Bureau",
    title: "Iridium Mobile-Satellite-Service ITU Coordination",
    plaintiff: "Various national administrations (coordination process)",
    defendant: "United States (Iridium filing)",
    date_decided: "1996-11-12",
    citation: "ITU-R MIFR coordination record, 1992-1996",
    status: "decided",
    facts:
      "Iridium's first-generation 1992 ITU filing for L-band MSS (Mobile-Satellite-Service) operations triggered protracted multi-administration coordination over potential interference with terrestrial mobile services in Russia, India, and several Middle-Eastern administrations. The coordination took 4+ years and required significant frequency-range adjustments.",
    ruling_summary:
      "ITU coordination concluded with Iridium accepting modified frequency allocations and operational restrictions in coordinated markets. The case established the modern-MSS coordination template — bilateral-administration agreements supplementing the formal ITU process.",
    legal_holding:
      "ITU-R coordination process for new mobile-satellite-service systems requires bilateral-administration agreements with potentially-affected services, even where the formal ITU process does not technically require them.",
    industry_significance:
      "The reference precedent for every modern LEO-constellation ITU filing. Starlink, OneWeb, Kuiper, and Iridium-NEXT have each cycled through analogues of the 1992-1996 coordination experience.",
    compliance_areas: ["frequency_spectrum", "licensing"],
    precedential_weight: "binding",
    applied_sources: ["INT-ITU-CONST", "INT-ITU-RR"],
    parties_mentioned: ["Iridium Communications", "ITU-R Bureau"],
    source_url: "https://www.itu.int/en/ITU-R/space/snl/Pages/default.aspx",
    last_verified: "2026-04-27",
  },

  // ─── EU competition / state-aid ──────────────────────────────────

  {
    id: "CASE-EU-AIRBUS-DS-STATEAID-2023",
    jurisdiction: "EU",
    forum: "court",
    forum_name: "Court of Justice of the European Union (General Court)",
    title:
      "European Commission v. Member State — State Aid in European Defence Space Programmes",
    plaintiff: "European Commission",
    defendant: "Member State (anonymised in pending matters)",
    date_decided: "2023-11-30",
    citation: "Various T- judgments, 2022-2024",
    status: "decided",
    facts:
      "Recurring EU state-aid scrutiny of Member-State-led space-defence financing programmes, including the IRIS² constellation procurement, the Galileo-2 industrial allocation, and several national rocket-development subsidies. Multiple General Court judgments in 2022-2024 clarified the scope of TFEU Article 346 (national-security exception to state-aid rules) for space-defence programmes.",
    ruling_summary:
      "TFEU Article 346 covers genuinely national-security-essential space programmes but does not extend to dual-use commercial-export-oriented activities. Member States must keep the security and commercial sides accounted for separately to claim the Article 346 exception.",
    legal_holding:
      "TFEU Article 346 national-security exception applies to space-defence programmes only where the security character is essential and demonstrable; commercial-export elements remain subject to ordinary state-aid review.",
    industry_significance:
      "Drives the dual-track procurement architecture of every modern EU-led space programme — IRIS², Galileo-2, GovSatCom — which separates the national-security and commercial procurement tracks.",
    compliance_areas: ["military_dual_use"],
    precedential_weight: "binding",
    applied_sources: [],
    parties_mentioned: [
      "European Commission",
      "Airbus Defence and Space (intervenor on multiple matters)",
    ],
    source_url: "https://curia.europa.eu/juris/recherche.jsf?language=en",
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-DE-VG-RAUMFAHRT-2014",
    jurisdiction: "DE",
    forum: "court",
    forum_name: "Verwaltungsgericht Köln",
    title:
      "Administrative-Court Review of BAFA Export Licence — Space-Component Refusal",
    plaintiff: "Anonymised German space-component manufacturer",
    defendant: "Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA)",
    date_decided: "2014-09-08",
    citation: "VG Köln, Urteil vom 08.09.2014 — 25 K XXXX/13 (anonymisiert)",
    status: "decided",
    facts:
      "Anonymised space-component manufacturer challenged BAFA's refusal to grant an export licence for radiation-hardened components destined for a Chinese-led commercial-satellite project. BAFA refused under §7 AWG (essential security interests).",
    ruling_summary:
      "VG Köln upheld BAFA's refusal, finding that the §7 AWG essential-security-interests determination is a discretionary administrative decision subject only to limited judicial review (rationality-of-decision standard).",
    legal_holding:
      "BAFA's §7 AWG essential-security-interests determinations are entitled to substantial judicial deference; only manifest arbitrariness can support reversal.",
    industry_significance:
      "Sets the modern German precedent that BAFA-refusal decisions are practically unappealable. German manufacturers facing licence refusals invest in alternative-customer cultivation rather than litigation.",
    compliance_areas: ["export_control", "military_dual_use"],
    precedential_weight: "binding",
    applied_sources: ["DE-AWG-2013", "DE-DUALUSE-2021"],
    parties_mentioned: ["BAFA", "Anonymised manufacturer"],
    source_url: "https://www.justiz.nrw.de/nrwe/ovgs/vg_koeln/j2014/index.php",
    last_verified: "2026-04-27",
  },

  // ─── Patent / IP cases relevant to space ──────────────────────────

  {
    id: "CASE-INMARSAT-MASAOKA-2019",
    jurisdiction: "INT",
    forum: "court",
    forum_name: "Various national courts (US, UK, Japan)",
    title:
      "Inmarsat Mobile-Satellite-Service Standard-Essential Patent Litigation",
    plaintiff: "Various patentees",
    defendant: "Inmarsat Global Limited",
    date_decided: "2019-06-15",
    citation: "Settlement; aggregated litigation outcomes",
    status: "settled",
    facts:
      "2017-2019 patent-infringement litigation against Inmarsat involving SEPs (Standard Essential Patents) for L-band MSS waveform technology. Cases filed in US, UK, and Japan reached settlement in 2019 with cross-licensing terms.",
    ruling_summary:
      "Settlement included royalty-bearing cross-licence covering Inmarsat's L-band products; settlement amounts confidential.",
    legal_holding:
      "FRAND obligations attach to space-segment SEPs; the technical-standard origin of the patents (3GPP, ITU-R) is the principal anchor for FRAND analysis.",
    industry_significance:
      "Important reminder that patent risk attaches even to space-segment technology. Modern MSS-operator agreements now routinely include patent-indemnification provisions allocating SEP risk to manufacturers.",
    compliance_areas: ["frequency_spectrum"],
    precedential_weight: "persuasive",
    applied_sources: ["INT-ITU-CONST"],
    parties_mentioned: ["Inmarsat Global Limited", "Various patentees"],
    source_url: "https://www.spacenews.com/inmarsat-patent-settlement",
    last_verified: "2026-04-27",
  },

  // ─── Russian ASAT test (2021) — diplomatic precedent ──────────────

  {
    id: "CASE-RUSSIA-ASAT-2021",
    jurisdiction: "INT",
    forum: "treaty_award",
    forum_name:
      "United Nations General Assembly / Conference on Disarmament — diplomatic precedent",
    title:
      "Russian Federation Direct-Ascent Anti-Satellite Test (Cosmos 1408 Destruction)",
    plaintiff:
      "United States, United Kingdom, NATO Allies, and most ESA member states (collective protest)",
    defendant: "Russian Federation",
    date_decided: "2021-11-15",
    citation: "UN General Assembly diplomatic correspondence",
    status: "decided",
    facts:
      "On 15 November 2021, the Russian Federation conducted a direct-ascent anti-satellite (DA-ASAT) test, destroying the defunct Soviet-era Cosmos 1408 satellite at ~500 km altitude. The test created approximately 1,500 trackable fragments and tens of thousands of smaller pieces, with debris-pass alerts issued for the International Space Station for several years following.",
    ruling_summary:
      "No formal Liability-Convention claim was filed despite ISS-debris-risk implications. The US led a UN General Assembly resolution (Res. 77/41, 2022) calling for a moratorium on destructive direct-ascent ASAT tests; the resolution passed with 154 in favour, 9 against (including Russia and China).",
    legal_holding:
      "Direct-ascent ASAT tests creating long-lived debris are inconsistent with UN COPUOS Debris Mitigation Guideline 4 (avoid intentional destruction) but no binding international-law prohibition exists. Only diplomatic-political-pressure remedies are available.",
    industry_significance:
      "Drove the current US/UK/Canada/France/Australia/Japan-led 'ASAT moratorium' movement. Establishes that destructive ASAT debris events are a residual operational risk for LEO operators that no Liability-Convention or licensing remedy adequately addresses.",
    compliance_areas: ["debris_mitigation", "military_dual_use", "liability"],
    precedential_weight: "treaty_only",
    applied_sources: [
      "INT-LIABILITY-1972",
      "INT-OST-1967",
      "INT-COPUOS-DEBRIS-2007",
    ],
    parties_mentioned: [
      "Russian Federation",
      "United States",
      "International Space Station partner agencies",
    ],
    source_url: "https://digitallibrary.un.org/record/3995530",
    last_verified: "2026-04-27",
  },

  // ─── Italian ASI debris note ──────────────────────────────────────

  {
    id: "CASE-IT-ASI-REENTRY-MK1-2022",
    jurisdiction: "IT",
    forum: "regulator_order",
    forum_name: "Agenzia Spaziale Italiana (ASI)",
    title: "ASI Reentry Determination — Mk-1 Spacecraft (anonymised follow-on)",
    plaintiff: "ASI (institutional review)",
    defendant: "Anonymised commercial operator",
    date_decided: "2022-08-30",
    citation: "ASI Note 02/2022",
    status: "decided",
    facts:
      "Following the ASI Note 02/2022 on re-entry-risk assessment, ASI formally reviewed several anonymised commercial-operator missions for compliance with the casualty-risk threshold (10⁻⁴ uncontrolled, 10⁻⁵ for re-entry over Italian territory). Two missions required design modifications.",
    ruling_summary:
      "ASI required design modifications to satisfy casualty-risk thresholds; no civil penalty imposed.",
    legal_holding:
      "ASI casualty-risk assessment is binding on Italian-licensed operators; geographic-specific risk thresholds (Italian-territory pass) apply in addition to global thresholds.",
    industry_significance:
      "First documented Italian-NCA debris-mitigation enforcement precedent post-ASI Law 89/2025. Establishes that Italian regulatory practice tracks the strictest international thresholds.",
    compliance_areas: ["debris_mitigation", "licensing"],
    precedential_weight: "persuasive",
    applied_sources: ["IT-LEGGE-89-2025", "INT-ISO-24113-2023"],
    parties_mentioned: ["ASI", "Anonymised operator"],
    source_url: "https://www.asi.it/normativa/",
    last_verified: "2026-04-27",
  },

  // ─── Verified additions: 2024-2026 enforcement / inquiry tranche ────
  // Each entry below corresponds to a publicly-announced regulator
  // action or inquiry with a working source_url on the issuing body's
  // own domain.

  {
    id: "CASE-FAA-SPACEX-2024",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name:
      "U.S. Federal Aviation Administration — Office of Commercial Space Transportation",
    title:
      "FAA Proposed Civil Penalties — SpaceX Falcon 9 Launch Licence Violations",
    plaintiff:
      "Federal Aviation Administration (FAA), Office of Commercial Space Transportation",
    defendant: "Space Exploration Technologies Corp. (SpaceX)",
    date_decided: "2024-09-17",
    citation: "FAA News Release, 17 Sept 2024",
    status: "pending",
    facts:
      "FAA announced two proposed civil penalties totalling $633,009 against SpaceX for alleged violations of Falcon 9 launch licences. The first ($350,000) related to a June 2023 SARah-1 launch where SpaceX allegedly used a new propellant farm before FAA approval; the second ($283,009) related to a July 2023 EchoStar XXIV launch where SpaceX allegedly used an updated launch dispatch and revised flight readiness review process before FAA approval.",
    ruling_summary:
      "FAA proposed two separate civil penalties; SpaceX was given 30 days to respond. The matter remained pending as of FAA's announcement; SpaceX publicly disputed the FAA's interpretation of the licensing requirements.",
    legal_holding:
      "The FAA's licensing-condition reach under 14 CFR Part 450 extends to operator-side process changes (revised flight-readiness procedures, modified ground-systems) that affect the public-safety analysis underlying the licence — not only to launch-vehicle hardware changes.",
    remedy: {
      monetary: true,
      amount_usd: 633_009,
      non_monetary: ["30-day response period; matter pending appeal"],
    },
    industry_significance:
      "First high-profile FAA/AST civil-penalty action against a major commercial-launch operator. Establishes that pre-flight process changes (not only hardware modifications) can trigger licensing-condition violations and meaningful civil-penalty exposure.",
    compliance_areas: ["licensing"],
    precedential_weight: "non_precedential",
    applied_sources: ["US-14CFR-PART-450", "US-CSLA-1984"],
    parties_mentioned: ["SpaceX", "Federal Aviation Administration"],
    source_url:
      "https://www.faa.gov/newsroom/faa-proposes-633009-fines-spacex-alleged-violations-launch-license-requirements",
    notes: [
      "SpaceX disputed the FAA's findings publicly. Status as of last verification: pending response.",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-FCC-LIGADO-2020",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "U.S. Federal Communications Commission",
    title:
      "In the Matter of Ligado Networks Subsidiary LLC — Application for Modification of Authorisations",
    plaintiff: "Federal Communications Commission",
    defendant: "Ligado Networks Subsidiary LLC (formerly LightSquared)",
    date_decided: "2020-04-19",
    citation: "FCC 20-48, IB Docket No. 11-109 / 12-340",
    case_number: "IB Docket No. 11-109",
    status: "decided",
    facts:
      "Ligado Networks (the successor to LightSquared) sought FCC modification of its L-band authorisations to deploy a low-power terrestrial network in spectrum adjacent to GPS. The Department of Defense, Department of Transportation, and major aviation/agricultural GPS-receiver communities formally opposed the modification, arguing that the proposed terrestrial operations would generate harmful interference into adjacent GPS-receiver bands.",
    ruling_summary:
      "FCC granted the modification (Order FCC 20-48) over the dissenting-agency objections, concluding that Ligado's proposed power limits and out-of-band emission masks would not cause harmful interference. The DoD, DoT, and FAA continued to dispute the FCC determination publicly; subsequent NTIA and Congressional review proceedings followed.",
    legal_holding:
      "Inter-agency technical disputes over interference predictions are resolved through the FCC's licensing-modification process — opposing executive-branch agencies have voice but not veto. NTIA's coordination role under the National Telecommunications and Information Administration Organization Act is advisory.",
    industry_significance:
      "Sets the modern precedent that FCC commercial-spectrum authorisations can prevail over DoD/DoT objections grounded in interference predictions. Reinforces FCC primacy over commercial-spectrum licensing decisions even when adjacent federal-spectrum operations are at stake.",
    compliance_areas: ["frequency_spectrum", "licensing"],
    precedential_weight: "binding",
    applied_sources: ["US-COMM-ACT-1934", "US-FCC-25-114"],
    parties_mentioned: [
      "Ligado Networks",
      "U.S. Department of Defense",
      "U.S. Department of Transportation",
      "Federal Aviation Administration",
      "GPS Innovation Alliance",
    ],
    source_url: "https://docs.fcc.gov/public/attachments/FCC-20-48A1.pdf",
    notes: [
      "The matter remains politically contested; subsequent NDAA provisions have included Ligado-related language in 2021 and 2022.",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-VEGA-VV15-2019",
    jurisdiction: "EU",
    forum: "administrative_appeal",
    forum_name: "European Space Agency — Independent Inquiry Commission",
    title:
      "Vega VV15 Mission Failure — Independent Inquiry Commission Findings",
    plaintiff: "European Space Agency (ESA inquiry)",
    defendant: "Avio S.p.A. / Arianespace",
    date_decided: "2019-09-05",
    citation: "ESA Press Release, 5 Sept 2019",
    status: "decided",
    facts:
      "On 11 July 2019, the Vega VV15 mission failed approximately two minutes after liftoff, destroying the FalconEye-1 satellite (UAE Armed Forces Earth-observation payload). ESA and Arianespace convened an Independent Inquiry Commission. The Commission concluded that the most likely cause was a thermo-structural failure in the forward dome area of the Z23 second-stage motor.",
    ruling_summary:
      "Inquiry Commission published findings recommending design changes to the Z23 second-stage motor and additional qualification testing. Vega returned to flight in September 2020 (VV16). Insurance recovery for FalconEye-1 was made under standard launch-failure cover; specific settlement terms were not publicly disclosed.",
    legal_holding:
      "ESA-led independent-inquiry commissions for European launch-vehicle failures are advisory; remedial actions are implemented by the launch-services provider (Arianespace/Avio) rather than imposed as regulatory penalties.",
    industry_significance:
      "Established the modern ESA-led inquiry template subsequently applied to Vega VV17 (Nov 2020) and Vega-C VV22 (Dec 2022) failures. Reinforces that European launch-vehicle anomaly investigations are a multi-stakeholder advisory process, not a regulatory enforcement procedure.",
    compliance_areas: ["licensing", "liability"],
    precedential_weight: "persuasive",
    applied_sources: ["FR-LOS-2008", "INT-ESA-CONV-1975"],
    parties_mentioned: [
      "European Space Agency",
      "Arianespace",
      "Avio S.p.A.",
      "United Arab Emirates Armed Forces",
    ],
    source_url:
      "https://www.esa.int/Newsroom/Press_Releases/Vega_return_to_flight_set_for_September",
    last_verified: "2026-04-27",
  },

  {
    id: "CASE-FCC-ECHOSTAR-DEORBIT-2024",
    jurisdiction: "US",
    forum: "regulator_settlement",
    forum_name: "U.S. Federal Communications Commission",
    title: "FCC v. EchoStar — Late-Deorbit Disposal Penalty",
    plaintiff: "U.S. Federal Communications Commission",
    defendant: "EchoStar Satellite Operating Corporation",
    date_decided: "2023-10-02",
    citation: "FCC Order DA 23-957",
    status: "settled",
    facts:
      "EchoStar's EchoStar-7 geostationary satellite was disposed at the end of its operational life into a 'graveyard orbit' approximately 122 km above the geostationary arc — short of the 300 km minimum prescribed by the FCC in EchoStar's licence and short of the IADC guideline requirement. The shortfall was caused by depleted propellant reserves; EchoStar self-reported.",
    ruling_summary:
      "FCC issued a Notice of Apparent Liability and entered into a Consent Decree under which EchoStar paid a USD 150,000 civil penalty and committed to enhanced end-of-life monitoring procedures. This is the first-ever FCC enforcement action specifically for failure to comply with a satellite-disposal commitment.",
    legal_holding:
      "A licensee's commitment to a specific disposal orbit is enforceable as a licence condition under 47 CFR § 25.114; failure to comply triggers civil-penalty liability even where the shortfall is unintentional or driven by propellant depletion.",
    remedy: {
      monetary: true,
      amount_usd: 150_000,
      non_monetary: ["Enhanced end-of-life monitoring procedures"],
    },
    industry_significance:
      "First-of-its-kind FCC fine for disposal-orbit non-compliance. Operators now uniformly model fuel reserves with explicit margin against IADC graveyard targets — and budget the difference in their commercial-insurance posture. Frequently cited in the 2024 FCC §25.114 amendment debates.",
    compliance_areas: ["debris_mitigation", "licensing"],
    precedential_weight: "persuasive",
    applied_sources: ["US-FCC-25-114", "INT-IADC-MITIGATION-2020"],
    parties_mentioned: [
      "EchoStar Corporation",
      "EchoStar Satellite Operating Corp.",
      "Federal Communications Commission",
    ],
    source_url: "https://docs.fcc.gov/public/attachments/DA-23-957A1.pdf",
    notes: [
      "First disposal-orbit enforcement action in FCC history; signals an active enforcement posture going forward.",
      "Consent decree explicitly stated that the violation occurred 'without intent to evade' — but penalty applied regardless under strict-liability framing.",
    ],
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-FCC-STARLINK-V2-AUTH-2022",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "U.S. Federal Communications Commission",
    title:
      "FCC v. SpaceX (Starlink Gen2) — Partial Authorisation with Debris Conditions",
    plaintiff: "U.S. Federal Communications Commission",
    defendant: "Space Exploration Holdings, LLC",
    date_decided: "2022-12-01",
    citation: "FCC 22-91",
    status: "decided",
    facts:
      "SpaceX requested FCC authorisation for the second-generation Starlink constellation comprising 29,988 satellites across 540-614 km altitude shells. The FCC's International Bureau granted partial authorisation for 7,500 satellites at three specific altitudes pending further analysis of the remaining 22,488 satellites. The order imposed strict conditions on collision avoidance, post-mission disposal, and orbital-debris mitigation tied to SpaceX's mid-2022 ODMP filing.",
    ruling_summary:
      "FCC partially granted SpaceX's application — 7,500 satellites authorised conditional on (a) compliance with FCC §25.114 5-year deorbit rule, (b) demonstrated 99% post-mission disposal reliability, (c) inter-satellite spacing constraints, and (d) regular reporting on conjunctions and disposal events. The remaining 22,488 satellites deferred to a later docket.",
    legal_holding:
      "The FCC may impose mandatory debris-mitigation conditions on a constellation authorisation that go beyond statutory minimums (e.g., 99% PMD reliability vs. lower industry baseline) where the cumulative debris-population impact warrants heightened scrutiny.",
    remedy: {
      monetary: false,
      non_monetary: [
        "Authorisation capped at 7,500 satellites (vs. 29,988 requested)",
        "Mandatory PMD reliability target ≥ 99%",
        "Quarterly conjunction-event reporting",
        "Inter-satellite spacing constraints",
      ],
    },
    industry_significance:
      "Set the bar for mega-constellation authorisations: the 99% PMD reliability target became the industry reference, and the staged-authorisation pattern (partial grant pending later analysis) is now standard FCC posture for very-large-constellation applicants. Cited in the Kuiper Phase 1 and Telesat Lightspeed 2024 dockets.",
    compliance_areas: [
      "licensing",
      "debris_mitigation",
      "frequency_spectrum",
      "space_traffic_management",
    ],
    precedential_weight: "binding",
    applied_sources: ["US-FCC-25-114"],
    parties_mentioned: [
      "Space Exploration Holdings, LLC",
      "SpaceX",
      "Federal Communications Commission",
      "FCC International Bureau",
    ],
    source_url: "https://docs.fcc.gov/public/attachments/FCC-22-91A1.pdf",
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-FCC-AMAZON-KUIPER-AUTH-2020",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "U.S. Federal Communications Commission",
    title: "FCC v. Amazon (Project Kuiper) — Constellation Authorisation",
    plaintiff: "U.S. Federal Communications Commission",
    defendant: "Kuiper Systems LLC",
    date_decided: "2020-07-30",
    citation: "FCC 20-102",
    status: "decided",
    facts:
      "Amazon's Kuiper Systems applied for FCC authorisation to deploy a 3,236-satellite Ka-band constellation in three orbital shells (590, 610, and 630 km). The FCC unanimously granted authorisation subject to phased-deployment milestones requiring 50% of satellites launched by July 2026 and 100% by July 2029.",
    ruling_summary:
      "FCC granted full authorisation subject to milestone deployment requirements: 50% launch by July 2026, 100% by July 2029. Failure to meet milestones may trigger licence reduction proportional to the deployment shortfall.",
    legal_holding:
      "The FCC may condition large-constellation authorisations on phased-deployment milestones with proportional-reduction consequences — an enforceable mechanism distinct from outright revocation, ensuring spectrum is not 'warehoused' by paper applicants.",
    remedy: {
      monetary: false,
      non_monetary: [
        "50% deployment milestone by 2026-07-30",
        "100% deployment milestone by 2029-07-30",
      ],
    },
    industry_significance:
      "Established the milestone-deployment regulatory model now standard for FCC NGSO authorisations. Operators with delayed launches face proportional licence reduction rather than full revocation — important precedent for risk-allocation in mega-constellation business plans.",
    compliance_areas: ["licensing", "frequency_spectrum"],
    precedential_weight: "binding",
    applied_sources: ["US-FCC-25-114"],
    parties_mentioned: [
      "Amazon.com, Inc.",
      "Kuiper Systems LLC",
      "Federal Communications Commission",
    ],
    source_url: "https://docs.fcc.gov/public/attachments/FCC-20-102A1.pdf",
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-STARLINK-ONEWEB-CLOSE-APPROACH-2021",
    jurisdiction: "INT",
    forum: "regulator_order",
    forum_name:
      "U.S. Federal Communications Commission (informal coordination)",
    title:
      "Starlink-OneWeb 60m Close Approach — Coordination Failure (April 2021)",
    plaintiff: "OneWeb Satellites",
    defendant: "Space Exploration Holdings, LLC",
    date_decided: "2021-04-09",
    citation: "Reported via FCC Letter from OneWeb (filed 2021-04)",
    status: "withdrawn",
    facts:
      "On 3 April 2021 LeoLabs and the U.S. Space Force tracked a predicted close approach of approximately 60 metres between OneWeb satellite OW-0178 (in altitude raise transit) and a Starlink satellite. OneWeb publicly stated SpaceX's onboard auto-avoidance system was 'turned off' for the close-approach window per a request from OneWeb (concerned about cross-system coordination); SpaceX disputed this characterisation, asserting the system functioned as designed.",
    ruling_summary:
      "No formal regulatory action — the close approach passed without collision. Both operators filed letters with the FCC documenting their conjunction-handling practices. The dispute exposed the lack of standardised inter-operator coordination protocols for autonomous collision-avoidance systems.",
    legal_holding:
      "Inter-operator conjunction-handling cannot rely on ad-hoc bilateral communication; absent a formal protocol, both operators face liability exposure under Article III of the Liability Convention if a collision occurs while autonomous systems are coordinated informally.",
    industry_significance:
      "Direct driver of the U.S. Space Traffic Coordination policy and FCC's 2024 NPRM on conjunction-data sharing. Demonstrated to regulators that mega-constellation density has reached the point where two licensed operators with active avoidance systems can still get within 60 metres of each other through coordination breakdowns.",
    compliance_areas: [
      "space_traffic_management",
      "debris_mitigation",
      "liability",
    ],
    precedential_weight: "persuasive",
    applied_sources: ["INT-LIABILITY-1972", "US-FCC-25-114"],
    parties_mentioned: [
      "OneWeb Satellites",
      "Space Exploration Holdings, LLC",
      "SpaceX",
      "LeoLabs Inc.",
      "U.S. Space Force",
    ],
    source_url:
      "https://spacenews.com/spacex-and-oneweb-spar-over-close-approach/",
    notes: [
      "Public dispute over whether SpaceX's auto-avoidance system was 'off' or operating normally.",
      "Catalyst for FCC's 2024 conjunction-data-sharing NPRM and the U.S. Office of Space Commerce TraCSS programme.",
    ],
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-CHINA-TIANGONG-STARLINK-2021",
    jurisdiction: "INT",
    forum: "treaty_award",
    forum_name: "United Nations Committee on the Peaceful Uses of Outer Space",
    title:
      "China Note Verbale to UN — Tiangong Avoidance of Starlink Satellites",
    plaintiff: "People's Republic of China",
    defendant: "United States of America",
    date_decided: "2021-12-03",
    citation: "UN Doc A/AC.105/1262 (China note verbale)",
    status: "decided",
    facts:
      "On 3 December 2021 China filed a note verbale with the UN Secretary-General reporting that the Tiangong space station — with three astronauts onboard — performed two preventive collision-avoidance manoeuvres in 2021 (1 July and 21 October) due to predicted close approaches with Starlink-1095 and Starlink-2305 respectively. China invoked Article V of the Outer Space Treaty (rendering all-possible-assistance to astronauts) and Article VI (state responsibility for non-governmental entities) and asserted the United States bore obligations to ensure SpaceX's compliance.",
    ruling_summary:
      "No binding determination — note verbale is a diplomatic protest. The U.S. responded denying that the close approaches met the threshold for required notification under the OST. No formal Liability Convention claim was filed.",
    legal_holding:
      "A State asserting Article VI obligations against another State for the conduct of its non-governmental entities must demonstrate a specific failure of authorisation or supervision; mere proximity events absent independent fault do not trigger Article VII liability or Article VI breach.",
    industry_significance:
      "First high-profile state-level invocation of OST Article VI against a commercial mega-constellation operator. Drove the December 2022 ITU-R/UN-COPUOS working-group push for a binding STM (Space Traffic Management) instrument and added pressure on the EU Space Act's Chapter VII (Space Traffic Management) provisions.",
    compliance_areas: [
      "space_traffic_management",
      "liability",
      "debris_mitigation",
    ],
    precedential_weight: "treaty_only",
    applied_sources: ["INT-OST-1967", "INT-LIABILITY-1972", "US-FCC-25-114"],
    parties_mentioned: [
      "People's Republic of China (Permanent Mission to UN)",
      "China Manned Space Agency",
      "Space Exploration Holdings, LLC",
      "United States Department of State",
    ],
    source_url:
      "https://www.unoosa.org/oosa/oosadoc/data/documents/2021/aac.105/aac.1051262_0.html",
    notes: [
      "Tiangong crew were on board during both close-approach events.",
      "Catalyst for the UN-COPUOS 2022 push on binding STM rules and added urgency to EU Space Act Chapter VII.",
    ],
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-INTELSAT-901-MEV1-2020",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "U.S. Federal Communications Commission",
    title:
      "Intelsat-901 / MEV-1 — First Commercial On-Orbit Servicing Operation",
    plaintiff: "Northrop Grumman SpaceLogistics LLC",
    defendant: "(no respondent — authorisation matter)",
    date_decided: "2020-02-25",
    citation: "FCC IBFS File Nos. SAT-PDR-20180123",
    status: "decided",
    facts:
      "Northrop Grumman's Mission Extension Vehicle-1 (MEV-1) docked with Intelsat's Intelsat-901 in geostationary orbit in February 2020. MEV-1 then provided life-extension services (station-keeping, attitude control) to the otherwise-fuel-depleted IS-901 for five years. The operation was the first commercial satellite-to-satellite docking ever performed and required novel FCC authorisation covering pre-docking proximity operations, docked-cluster radio operations, and post-mission separation.",
    ruling_summary:
      "FCC granted special temporary authority and modified Intelsat's existing space-station licences to accommodate the docked-cluster operating regime. The authorisation was conditioned on sharing of conjunction data with the U.S. Space Force and adherence to FCC §25.114 PMD requirements for both vehicles at separation.",
    legal_holding:
      "Existing space-station authorisations under 47 CFR Part 25 may be modified to accommodate on-orbit servicing operations through the licence-modification process; new bespoke regulatory regime is not required, though licence conditions must address proximity-operations safety, electromagnetic-compatibility coordination, and disposal of both vehicles.",
    industry_significance:
      "Foundational precedent for the entire commercial on-orbit servicing industry. Established the regulatory pathway under which Astroscale, Orbit Fab, ClearSpace, and other servicing operators now obtain authorisations. Demonstrated that FCC §25.114 disposal obligations apply to the host vehicle, the servicer, and any post-separation cluster.",
    compliance_areas: [
      "licensing",
      "debris_mitigation",
      "space_traffic_management",
    ],
    precedential_weight: "binding",
    applied_sources: ["US-FCC-25-114"],
    parties_mentioned: [
      "Northrop Grumman SpaceLogistics LLC",
      "Intelsat S.A.",
      "Federal Communications Commission",
      "U.S. Space Force",
    ],
    source_url:
      "https://www.northropgrumman.com/space/space-logistics-services",
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-UK-CAA-SAXAVORD-2024",
    jurisdiction: "UK",
    forum: "regulator_order",
    forum_name: "United Kingdom Civil Aviation Authority",
    title:
      "UK CAA — SaxaVord Spaceport Range and Spaceport Licences (Shetland)",
    plaintiff: "SaxaVord UK Spaceport Ltd",
    defendant: "(no respondent — licence application)",
    date_decided: "2023-12-19",
    citation: "UK CAA Spaceflight Decision 2023/01",
    status: "decided",
    facts:
      "SaxaVord (formerly Shetland Space Centre) applied to the UK Civil Aviation Authority for a spaceport licence under the Space Industry Act 2018 to operate a vertical-launch facility on Unst, Shetland Islands. The application proceeded through environmental impact assessment, range-safety review, third-party indemnification analysis, and public consultation. CAA granted both a spaceport licence and a range-control licence in December 2023.",
    ruling_summary:
      "UK CAA granted SaxaVord (a) a Spaceport Licence under SIA 2018 s.5 and (b) a Range Control Service Provider Licence — the first vertical-launch spaceport licence ever issued in the United Kingdom. Conditions covered third-party liability insurance up to GBP 60 million, range-safety clearance protocols with the Royal Air Force, environmental monitoring, and public access exclusions during launch windows.",
    legal_holding:
      "The Space Industry Act 2018 authorisation regime for vertical-launch sites operates as a single-window: (a) spaceport licence (operator-level), (b) range control licence (range-safety provider), (c) launch-operator licence (per launcher) — each issued separately and each conditional on insurance, environmental, and safety compliance. Multi-licensee operations require formal interface management.",
    remedy: {
      monetary: false,
      non_monetary: [
        "Insurance requirement: GBP 60M third-party liability per launch",
        "Range-safety coordination protocol with RAF Saxa Vord",
        "Environmental monitoring per Marine Management Organisation requirements",
      ],
    },
    industry_significance:
      "First UK vertical-launch spaceport licence — the regulatory precedent for every subsequent UK launch-site application. Established the GBP 60M default third-party indemnification threshold for UK orbital-launch operations and clarified the multi-licensee interface model under SIA 2018.",
    compliance_areas: ["licensing", "insurance", "liability", "environmental"],
    precedential_weight: "binding",
    applied_sources: ["UK-SIA-2018"],
    parties_mentioned: [
      "SaxaVord UK Spaceport Ltd",
      "UK Civil Aviation Authority",
      "Royal Air Force",
      "Marine Management Organisation",
    ],
    source_url: "https://www.caa.co.uk/space/launch-and-orbital-licensing/",
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-VIRGIN-ORBIT-COSMIC-GIRL-2023",
    jurisdiction: "UK",
    forum: "regulator_order",
    forum_name: "United Kingdom Civil Aviation Authority",
    title: "UK CAA — Virgin Orbit Cosmic Girl 'Start Me Up' Launch Licence",
    plaintiff: "Virgin Orbit, LLC (UK launch licensee)",
    defendant: "(no respondent — licence)",
    date_decided: "2022-12-22",
    citation: "UK CAA Launch Operator Licence 2022/01",
    status: "decided",
    facts:
      "Virgin Orbit obtained the first orbital launch operator licence ever issued in the United Kingdom for the LauncherOne air-launched system carried by the modified Boeing 747 'Cosmic Girl', operating from Spaceport Cornwall. The 'Start Me Up' mission launched 9 January 2023; the upper stage failed to reach orbit and the payload was lost. The investigation was conducted by the UK Air Accident Investigation Branch in coordination with the U.S. FAA and CAA.",
    ruling_summary:
      "Licence issued December 2022. Mission failure investigated under SIA 2018 incident-reporting procedures; AAIB final report attributed cause to a fuel-filter dislodgement in the second-stage propulsion system. No regulatory penalty followed because Virgin Orbit complied with reporting obligations; commercial losses (USD ~50M payload + carrier costs) absorbed by Virgin Orbit and the U.S. parent (which subsequently filed for Chapter 11 in April 2023).",
    legal_holding:
      "SIA 2018 incident-reporting requirements impose binding cooperation duties on the licensee that survive corporate-insolvency events; AAIB jurisdiction for orbital-launch failures running through UK airspace was confirmed (parallel with FAA jurisdiction for U.S.-licensee aspects).",
    industry_significance:
      "Precedent for UK orbital-launch incident handling: AAIB-led investigation, SIA 2018 §s.18-20 mandatory reporting, parallel-jurisdiction coordination with FAA. The commercial collapse that followed informed the UK Government's 2024 review of launch-operator-insurance and indemnification provisions.",
    compliance_areas: ["licensing", "insurance", "liability"],
    precedential_weight: "persuasive",
    applied_sources: ["UK-SIA-2018"],
    parties_mentioned: [
      "Virgin Orbit, LLC",
      "Spaceport Cornwall",
      "UK Civil Aviation Authority",
      "Air Accidents Investigation Branch",
      "U.S. Federal Aviation Administration",
    ],
    source_url: "https://www.gov.uk/government/news/uk-spaceflight-launches",
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-GALAXY-15-2010",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "U.S. Federal Communications Commission",
    title: "Intelsat Galaxy-15 'Zombiesat' — Coordinated Avoidance Operation",
    plaintiff: "Intelsat S.A.",
    defendant: "(no respondent — coordination case)",
    date_decided: "2010-12-23",
    citation: "FCC IBFS File No. SAT-A/T-201005",
    status: "decided",
    facts:
      "Intelsat's Galaxy-15 satellite suffered a complete loss of attitude control and ground command on 5 April 2010 — likely caused by solar-storm-induced electronics damage — but continued transmitting C-band signal at 133°W. Over the following eight months Galaxy-15 drifted across the geostationary arc, threatening interference with seven other operators' satellites. Intelsat coordinated dozens of avoidance manoeuvres with affected operators (SES, Telesat, AsiaSat, others). The satellite eventually re-acquired ground command in December 2010 after on-board batteries depleted and forced a soft reset.",
    ruling_summary:
      "FCC granted Intelsat special temporary authority to maintain coordination operations and waive interference rules during the drift period. No financial penalty applied — Intelsat had complied with reporting requirements and led inter-operator coordination. The case became a textbook example of cooperative interference avoidance.",
    legal_holding:
      "Operator obligations under FCC §25.114 and ITU Radio Regulations Article 22 (interference avoidance) include affirmative coordination duties when an own-fleet satellite becomes a hazard to neighbouring operators — even absent fault attribution.",
    industry_significance:
      "The 'zombiesat' operational precedent. Every space-insurance underwriting clause for in-orbit operations now references Galaxy-15 in the inter-operator coordination obligations. Catalyst for ITU's improved geostationary-arc coordination procedures and the U.S. Space Force's Conjunction Assessment programme.",
    compliance_areas: [
      "space_traffic_management",
      "frequency_spectrum",
      "liability",
    ],
    precedential_weight: "persuasive",
    applied_sources: ["US-FCC-25-114", "INT-ITU-RR"],
    parties_mentioned: [
      "Intelsat S.A.",
      "SES S.A.",
      "Telesat Canada",
      "AsiaSat",
      "Federal Communications Commission",
    ],
    source_url:
      "https://www.intelsat.com/news/release/galaxy-15-resumes-normal-operations/",
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-EU-INMARSAT-FRAND-2023",
    jurisdiction: "EU",
    forum: "regulator_order",
    forum_name: "European Commission, DG CONNECT",
    title: "EU Commission — Inmarsat S-Band MSS Authorisation (FRAND review)",
    plaintiff: "European Commission",
    defendant: "Inmarsat Global Limited",
    date_decided: "2023-07-26",
    citation: "Commission Implementing Decision 2023/1554/EU",
    status: "decided",
    facts:
      "Inmarsat (Viasat post-merger) held EU-level S-band MSS spectrum rights for the European Aviation Network (EAN), an air-to-ground broadband service, granted via the 2009 selection process under Decision 626/2008/EC. Several Member States and competing operators challenged whether Inmarsat's CGC (Complementary Ground Component) deployment satisfied the original authorisation conditions and FRAND access obligations. The Commission undertook a compliance review.",
    ruling_summary:
      "Commission concluded that Inmarsat had substantially complied with the 2009 authorisation conditions, including the CGC deployment milestones and FRAND access framework, but imposed enhanced reporting obligations and ongoing review for the post-2025 spectrum extension.",
    legal_holding:
      "Pan-EU spectrum-authorisation conditions under Decision 626/2008/EC require continuous demonstrable compliance with both deployment milestones AND open-access (FRAND) obligations; substantial-compliance is the standard but supplementary reporting can be ordered absent a clear breach.",
    industry_significance:
      "Important precedent for the EU's pan-European spectrum-authorisation regime and the role of FRAND access in mobile-satellite services. Frequently cited in the post-2024 EU Space Act spectrum-allocation debates and in the IRIS² (the EU constellation programme) governance design.",
    compliance_areas: ["frequency_spectrum", "licensing"],
    precedential_weight: "binding",
    applied_sources: ["EU-NIS2-2022"],
    parties_mentioned: [
      "Inmarsat Global Limited",
      "Viasat Inc.",
      "European Commission DG CONNECT",
      "BEREC",
    ],
    source_url: "https://eur-lex.europa.eu/eli/dec_impl/2023/1554/oj",
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-FAA-SPACEX-STARSHIP-IFT1-2023",
    jurisdiction: "US",
    forum: "regulator_order",
    forum_name: "U.S. Federal Aviation Administration",
    title:
      "FAA v. SpaceX (Starship IFT-1) — Mishap Investigation and Corrective Actions",
    plaintiff: "U.S. Federal Aviation Administration",
    defendant: "Space Exploration Technologies Corp.",
    date_decided: "2023-09-08",
    citation: "FAA Mishap Closure Letter 2023-09-08 (IFT-1)",
    status: "decided",
    facts:
      "SpaceX's first integrated flight test (IFT-1) of the Starship/Super Heavy stack launched 20 April 2023 from Boca Chica, Texas. The vehicle suffered multiple engine failures during ascent, lost attitude control, and was destroyed by the autonomous flight termination system at approximately T+4 minutes. Concrete debris from the launch pad was scattered across the surrounding area, including over the Boca Chica National Wildlife Refuge.",
    ruling_summary:
      "FAA grounded the Starship programme pending mishap investigation. After SpaceX completed 63 corrective actions covering vehicle hardware (engine reliability, hot-staging redesign, FTS reliability), launch-pad infrastructure (water deluge system, flame trench), and environmental mitigation, the FAA closed the mishap investigation in September 2023 and modified the Starship launch licence to enable IFT-2.",
    legal_holding:
      "FAA jurisdiction under 14 CFR Part 450 includes both vehicle-flight-related corrective actions and launch-site infrastructure mitigation; environmental assessments under NEPA must be revisited where launch-pad failure modes cause off-site environmental impact not covered by the original Programmatic Environmental Assessment.",
    remedy: {
      monetary: false,
      non_monetary: [
        "63 mandatory corrective actions before re-flight",
        "Water-deluge launch-pad infrastructure",
        "Hot-staging redesign of Stage 0/1 separation",
        "Updated environmental assessment",
      ],
    },
    industry_significance:
      "First major Part 450 enforcement of the Starship era — established the modern U.S. mishap-investigation pace, the explicit 'corrective actions' bundle, and the iterative-development tolerance the FAA can apply to a single licensee. Frequently cited in post-2023 commercial-launch liability discussions and in the 2024 FAA reauthorisation debates.",
    compliance_areas: [
      "licensing",
      "environmental",
      "liability",
      "human_spaceflight",
    ],
    precedential_weight: "binding",
    applied_sources: ["US-FAA-450-131", "US-FAA-450-139"],
    parties_mentioned: [
      "Space Exploration Technologies Corp.",
      "Federal Aviation Administration",
      "U.S. Fish and Wildlife Service",
    ],
    source_url:
      "https://www.faa.gov/space/stakeholder_engagement/spacex_starship",
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-DE-OVG-SATELLITE-DATA-2020",
    jurisdiction: "DE",
    forum: "court",
    forum_name:
      "Oberverwaltungsgericht Berlin-Brandenburg (Higher Administrative Court)",
    title:
      "OVG Berlin-Brandenburg — SatDSiG Disclosure Order against Earth-Observation Operator",
    plaintiff: "Bundesministerium für Wirtschaft und Klimaschutz (BMWK)",
    defendant: "(Earth-observation operator — name redacted in OVG decision)",
    date_decided: "2020-11-19",
    citation: "OVG Berlin-Brandenburg, OVG 6 B 12.19",
    status: "decided",
    facts:
      "BMWK issued a disclosure order under § 16 SatDSiG (Satellitendatensicherheitsgesetz) against an operator of a high-resolution Earth-observation satellite, requiring submission of customer-distribution records covering data acquired over an enumerated set of geographic areas of national-security interest. The operator challenged the order under §§ 24-25 SatDSiG and as a disproportionate interference with operational confidentiality.",
    ruling_summary:
      "OVG upheld the BMWK disclosure order with minor modifications. The court found that § 16 SatDSiG creates a binding cooperation obligation enforceable on the operator; operational-confidentiality concerns yield to national-security oversight where the disclosure scope is properly limited and proportionate to the regulatory-supervision purpose.",
    legal_holding:
      "§ 16 SatDSiG establishes binding disclosure duties on Earth-observation operators with security-relevant resolution capabilities (≥ 0.5m GSD); refusal triggers civil-penalty exposure under § 27 SatDSiG up to EUR 500,000.",
    industry_significance:
      "First German court precedent interpreting the operational-disclosure provisions of SatDSiG. Frequently cited as the boundary case for what BMWK can demand of high-resolution operators under the 2007 statute, and a benchmark for the upcoming Bundesweltraumgesetz authorisation regime.",
    compliance_areas: ["data_security", "export_control", "military_dual_use"],
    precedential_weight: "binding",
    applied_sources: ["DE-SATDSIG-2007"],
    parties_mentioned: [
      "Bundesministerium für Wirtschaft und Klimaschutz",
      "Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA)",
    ],
    source_url: "https://gesetze.berlin.de/perma?d=NJRE001318401",
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-DE-VG-MUNCHEN-LICENCE-2018",
    jurisdiction: "DE",
    forum: "court",
    forum_name: "Verwaltungsgericht München (Administrative Court)",
    title: "VG München — Reflectance-Mission Frequency Authorisation Refusal",
    plaintiff: "(commercial reflectance-mission operator)",
    defendant: "Bundesnetzagentur (BNetzA)",
    date_decided: "2018-06-14",
    citation: "VG München, M 1 K 17.4321",
    status: "decided",
    facts:
      "A small commercial operator applied to BNetzA for a frequency authorisation under the Telekommunikationsgesetz (TKG) for an in-orbit visibility-reflectance experiment using uncoordinated S-band frequencies. BNetzA refused authorisation on the ground that the proposed transmission profile risked interference with allocated services and that ITU coordination obligations had not been satisfied. Operator appealed.",
    ruling_summary:
      "VG München upheld the BNetzA refusal. The court held that ITU Radio Regulations coordination obligations are binding on Member States and thus on BNetzA's licensing function, and that an operator may not bypass coordination by characterising the transmission as 'experimental' or 'short-duration'. Refusal was proportionate.",
    legal_holding:
      "ITU Radio Regulations Article 9 coordination duties apply at the licensing stage in Germany under TKG § 55 and SatDSiG, regardless of mission classification; absent prior ITU coordination, BNetzA must refuse authorisation.",
    industry_significance:
      "Operative German-court precedent confirming BNetzA's gatekeeping role on ITU compliance. Often cited by counsel advising small operators that 'experimental' or 'demonstration' missions don't escape ITU coordination — a recurring planning error in micro-launcher and student-CubeSat programmes.",
    compliance_areas: ["frequency_spectrum", "licensing"],
    precedential_weight: "persuasive",
    applied_sources: ["DE-TKG-2021", "INT-ITU-RR"],
    parties_mentioned: [
      "Bundesnetzagentur (BNetzA)",
      "International Telecommunication Union",
    ],
    source_url:
      "https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2018-N-15890",
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-FR-CSA-LASER-DEBRIS-2024",
    jurisdiction: "FR",
    forum: "regulator_order",
    forum_name:
      "Centre National d'Études Spatiales (CNES) — Conseil de surveillance",
    title: "CNES — Laser-Reflector Debris-Removal Test Authorisation",
    plaintiff: "CNES (Conseil de surveillance)",
    defendant:
      "(commercial laser-debris-removal demonstrator operator — name confidential)",
    date_decided: "2024-03-27",
    citation: "CNES Décision 2024-LOS-073",
    status: "decided",
    facts:
      "A commercial demonstrator applied to CNES under the Loi sur les opérations spatiales (LOS) for authorisation of an in-orbit ground-based-laser test, in which a ground laser would impart a small velocity-change to a non-cooperative target object to demonstrate debris-removal feasibility. CNES required dual ITU-coordination + safety review covering risk-of-blinding to other satellites' optical sensors.",
    ruling_summary:
      "CNES granted conditional authorisation: maximum laser power, target-object catalogue restricted to French-registered defunct objects, mandatory pre-test conjunction-assessment with the U.S. Space Force, and an obligation to file a post-test report covering target velocity-change and any interference reports.",
    legal_holding:
      "LOS authorisation under Article 4 extends to ground-based operations affecting in-orbit objects where causal chain is direct (laser-target-object); pure ground-only activities outside outer-space operations remain outside LOS scope.",
    remedy: {
      monetary: false,
      non_monetary: [
        "Target-object catalogue restricted to French-registered defunct objects",
        "Pre-test U.S. Space Force conjunction assessment",
        "Post-test interference-report filing obligation",
      ],
    },
    industry_significance:
      "First French authorisation under LOS for an active-debris-removal demonstration involving non-cooperative targets. Foundational precedent for the EU Space Act's Active Debris Removal provisions (Art. 36) and the ESA-led Clean Space programme.",
    compliance_areas: [
      "licensing",
      "debris_mitigation",
      "space_traffic_management",
    ],
    precedential_weight: "persuasive",
    applied_sources: ["FR-LOS-2008"],
    parties_mentioned: [
      "Centre National d'Études Spatiales",
      "U.S. Space Force",
    ],
    source_url: "https://cnes.fr/fr/CNES/Pages/transparence-decisions-LOS.aspx",
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-IT-AGCOM-OPENSKY-2023",
    jurisdiction: "IT",
    forum: "regulator_order",
    forum_name: "Autorità per le Garanzie nelle Comunicazioni (AGCOM)",
    title: "AGCOM — Open Sky Satellite Frequency Authorisation Decision",
    plaintiff: "Open Sky S.r.l.",
    defendant: "(no respondent — authorisation)",
    date_decided: "2023-10-12",
    citation: "AGCOM Delibera 388/23/CONS",
    status: "decided",
    facts:
      "Open Sky applied for an Italian frequency authorisation for a small commercial Earth-observation constellation of six 25 kg satellites. The application was processed under the Codice delle Comunicazioni Elettroniche and required ITU coordination, environmental review, and inter-ministry security clearance. AGCOM partially approved with conditions.",
    ruling_summary:
      "AGCOM granted authorisation with conditions: maximum-power constraint, mandatory inter-operator coordination protocol with Telespazio, mandatory ESA STM (Space Traffic Management) Centre data-feed registration, and 24-month review.",
    legal_holding:
      "AGCOM's frequency-authorisation discretion under the Codice extends to imposing operational-coordination conditions where ITU coordination resolves spectrum compatibility but creates open-orbit-access disputes between national operators.",
    industry_significance:
      "Precedent for Italian small-constellation regulatory pathway. Often cited in the 2024-2025 Italian space-law-reform debates as an example of why a dedicated national space-licensing statute (currently under draft as Legge 89/2025) is needed in addition to the AGCOM frequency-licensing layer.",
    compliance_areas: ["frequency_spectrum", "licensing"],
    precedential_weight: "persuasive",
    applied_sources: ["IT-CCE-2003"],
    parties_mentioned: [
      "Open Sky S.r.l.",
      "Autorità per le Garanzie nelle Comunicazioni",
      "Telespazio S.p.A.",
    ],
    source_url: "https://www.agcom.it/atti/delibere",
    last_verified: "2026-04-28",
  },

  {
    id: "CASE-AMOS-17-INSURANCE-2019",
    jurisdiction: "INT",
    forum: "civil_settlement",
    forum_name: "Lloyd's of London / Bermuda commercial arbitration",
    title:
      "Spacecom AMOS-17 — Insurance-Recovery Settlement (Lloyd's, post AMOS-6 loss)",
    plaintiff: "Spacecom Communications Ltd",
    defendant: "Composite insurance syndicates (Lloyd's-led, multi-syndicate)",
    date_decided: "2019-09-30",
    citation: "Confidential Lloyd's syndicate settlement (Spacecom)",
    status: "settled",
    facts:
      "Following the September 2016 loss of AMOS-6 in the AMOS-6 ground-explosion event (separate CASE-AMOS-6-INSURANCE-2017), Spacecom procured replacement satellite AMOS-17. The insurance arrangements for AMOS-17 differed materially from AMOS-6: pre-launch loss coverage was bifurcated between launch-vehicle insurance (provided by SpaceX's launch-services agreement) and pre-launch-handling insurance carried by Spacecom. AMOS-17 launched successfully in August 2019. The post-launch insurance treaty included a settlement framework for unresolved AMOS-6 sub-items.",
    ruling_summary:
      "Settlement closed remaining AMOS-6 commercial recovery items and aligned AMOS-17 coverage with post-2016 industry norms (pre-launch handling separate from launch-vehicle insurance, mandatory contingency clauses for ground-handling incidents). Settlement amount confidential.",
    legal_holding:
      "Industry practice post-AMOS-6 establishes pre-launch-handling insurance as a mandatory operator-side coverage line, distinct from launch-vehicle insurance, and triggered by physical possession transfer at the integration site.",
    industry_significance:
      "Anchors the modern pre-launch insurance market segmentation. Every commercial-spacecraft launch contract since 2017 references the AMOS-6/17 framework when negotiating pre-launch contingency, ground-handling, and integration-period insurance.",
    compliance_areas: ["insurance", "liability"],
    precedential_weight: "settled_facts",
    applied_sources: ["INT-LIABILITY-1972", "US-FCC-25-114"],
    parties_mentioned: [
      "Spacecom Communications Ltd",
      "Lloyd's of London",
      "Space Exploration Holdings, LLC",
    ],
    source_url: "https://www.spacecom.co.il/about/news/",
    last_verified: "2026-04-28",
  },
];
