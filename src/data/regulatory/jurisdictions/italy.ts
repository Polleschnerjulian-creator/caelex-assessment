/**
 * Italy / ASI — Consolidated Jurisdiction Data
 *
 * Sources:
 * - Law 89/2025, "Legge sull'Economia dello Spazio" (Italian Space Economy Act)
 *   Entry into force: 25 June 2025
 *   NOTE: Implementing regulations (decreti attuativi) are pending as of 2025.
 * - IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)
 * - NIS2 Directive (EU) 2022/2555 (transposed via D.Lgs. 138/2024)
 * - ISO 24113:2019 Space systems — Space debris mitigation requirements
 * - ACN (Agenzia per la Cybersicurezza Nazionale) — cybersecurity supervisory authority
 *
 * IMPORTANT: The 2025 space law is enacted but key implementing regulations
 * (decreti ministeriali attuativi) specifying procedural details, insurance tiers,
 * and technical standards are still pending. Until these are issued, operators
 * should engage ASI directly for guidance on compliance pathways.
 */

import type { JurisdictionData, NationalRequirement } from "../types";

// ─── National Requirements ──────────────────────────────────────────────────

const ITALY_REQUIREMENTS: NationalRequirement[] = [
  {
    id: "it-space-economy-act-authorization",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 4",
      title: "Authorization Requirement for Space Activities",
      fullText:
        "Italian nationals and Italian legal entities must obtain prior authorization from the " +
        "Minister of Enterprises and Made in Italy (MIMIT), in coordination with ASI, before " +
        "carrying out any space activity. The authorization covers launch, orbital operations, " +
        "and re-entry. Applications must be submitted to ASI (Agenzia Spaziale Italiana) which " +
        "performs the technical assessment within 60 days, with a final ministerial decision " +
        "within 120 days of the complete application being received. The specific procedural " +
        "requirements and documentation requirements will be detailed in implementing decrees " +
        "(decreti attuativi) to be issued pursuant to this law. Until implementing regulations " +
        "are published, operators should contact ASI for interim guidance.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 1",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 4",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 17-25",
      confidence: "direct",
    },
    category: "authorization",
  },
  {
    id: "it-space-economy-act-registration",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 9",
      title: "Registration of Italian Space Objects",
      fullText:
        "All space objects authorized under the Italian Space Economy Act must be registered " +
        "in the national Italian space object registry maintained by ASI. Registration data " +
        "must include operator identity, orbital parameters, launch date and vehicle, mission " +
        "purpose, and expected operational lifetime. Italy notifies the UN Secretary-General " +
        "per the Registration Convention (UNGA Res. 3235 (XXIX)). Detailed registration " +
        "procedures, formats, and timelines are to be specified in implementing decrees " +
        "currently pending. Operators are advised to confirm requirements with ASI.",
    },
    standardsMapping: [
      {
        framework: "UN Registration Convention",
        reference: "Art. IV",
        relationship: "implements",
      },
      {
        framework: "UNGA Res. 62/101",
        reference: "Section III",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 40-45",
      confidence: "direct",
    },
    category: "registration",
  },
  {
    id: "it-space-economy-act-liability-insurance",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 11",
      title: "Liability, Insurance, and Size-Tiered Coverage",
      fullText:
        "Italian operators bear strict liability for damage caused by their space activities " +
        "consistent with Italy's treaty obligations under the Liability Convention (1972) and " +
        "the Outer Space Treaty (1967). Mandatory third-party liability insurance is required. " +
        "The Italian Space Economy Act introduces a size-tiered insurance framework: " +
        "EUR 100M per incident (standard for large operators with ≥250 employees or ≥€50M " +
        "turnover); EUR 50M for lower-risk missions and medium operators (50–249 employees or " +
        "€10M–50M turnover); EUR 20M for start-ups and research entities (micro/small operators " +
        "with <50 employees or <€10M turnover). Strict liability applies up to the insurance " +
        "limit. The liability cap is lost if the operator: conducted unauthorized activities; " +
        "breached authorization conditions; failed to maintain required insurance; or acted " +
        "with gross negligence or wilful misconduct. The Italian State exercises recourse " +
        "against operators for international liability payments. Implementing decrees " +
        "specifying coverage forms and procedural details are pending.",
    },
    standardsMapping: [
      {
        framework: "Liability Convention 1972",
        reference: "Art. II-III",
        relationship: "implements",
      },
      {
        framework: "Outer Space Treaty 1967",
        reference: "Art. VI-VII",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 26-30",
      confidence: "direct",
    },
    category: "insurance",
  },
  {
    id: "it-space-economy-act-debris-mitigation",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 7",
      title: "Space Debris Mitigation and Sustainability Obligations",
      fullText:
        "Authorized operators must adopt debris mitigation measures in line with internationally " +
        "recognized guidelines. ASI applies the IADC Space Debris Mitigation Guidelines Rev.2 " +
        "and ISO 24113:2019 as the technical baseline. Operators must submit a Debris Mitigation " +
        "Plan (Piano di Mitigazione dei Detriti Spaziali) covering: lifecycle environmental " +
        "footprint assessment of the mission; collision avoidance capability and procedures; " +
        "passivation of all energy sources; post-mission disposal (25-year LEO rule); and " +
        "prohibition on intentional debris release. The law emphasizes a lifecycle approach, " +
        "requiring operators to assess the environmental impact of the space activity from " +
        "manufacturing through end-of-life disposal. Technical standards and assessment " +
        "methodology details are to be specified in implementing decrees, which remain pending. " +
        "In the interim, ASI applies IADC/ISO standards directly.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Sections 4-6",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Sections 5-7",
        relationship: "implements",
      },
      {
        framework: "NIS2 Directive",
        reference: "Art. 21(2)",
        relationship: "equivalent",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 59-72",
      confidence: "direct",
    },
    category: "debris",
  },
  {
    id: "it-d-lgs-138-2024-nis2-cybersecurity",
    nationalRef: {
      law: "D.Lgs. 138/2024 (Italian NIS2 transposition)",
      article: "Art. 24-26",
      title: "Cybersecurity Risk Management for Space Operators",
      fullText:
        "Italian space operators qualifying as essential or important entities under D.Lgs. " +
        "138/2024 (the Italian transposition of NIS2 Directive (EU) 2022/2555) must implement " +
        "appropriate technical and organisational cybersecurity measures. The Agenzia per la " +
        "Cybersicurezza Nazionale (ACN) is the competent supervisory authority. Obligations " +
        "include risk analysis, incident handling, business continuity, supply chain security, " +
        "vulnerability disclosure, and multi-factor authentication. Incident reporting timelines: " +
        "early warning within 24 hours, notification within 72 hours, final report within 1 month. " +
        "Space operators with ground segment infrastructure qualifying as critical infrastructure " +
        "are classified as essential entities regardless of size.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive",
        reference: "Art. 21-23",
        relationship: "implements",
      },
      {
        framework: "ISO/IEC 27001:2022",
        reference: "Clause 6.1",
        relationship: "equivalent",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74-95",
      confidence: "direct",
    },
    category: "cybersecurity",
  },

  // ── Authorization Timeline (Art. 4 — detailed process) ──
  {
    id: "it-space-economy-act-auth-timeline",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 4-5",
      title:
        "Authorization process timeline — ASI technical review and ministerial decision",
      fullText:
        "Upon receipt of a complete authorization application, ASI performs a technical review " +
        "within 60 days. ASI assesses the technical feasibility, safety, debris mitigation " +
        "compliance, insurance adequacy, and operator competence. Following ASI's technical " +
        "opinion, the Minister of Enterprises and Made in Italy (MIMIT) issues a final " +
        "authorization decision within 120 days of the complete application. The authorization " +
        "may be granted with conditions, granted unconditionally, or refused with reasons. " +
        "Applications may be submitted in Italian or English; ASI correspondence is typically " +
        "in Italian. Operators are strongly advised to engage ASI informally before formal " +
        "submission to ensure completeness of the dossier.",
    },
    standardsMapping: [
      {
        framework: "Outer Space Treaty 1967",
        reference: "Art. VI",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 8-12",
      confidence: "direct",
    },
    category: "authorization",
  },

  // ── Insurance Tiers (Art. 11 — detailed tier structure) ──
  {
    id: "it-space-economy-act-insurance-tiers",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 11",
      title: "Tiered insurance system — EUR 20M / 50M / 100M",
      fullText:
        "The Italian space law introduces a three-tier mandatory insurance system based on " +
        "operator category: Tier 1 (Large operators, ≥250 employees or ≥€50M turnover): " +
        "EUR 100M per incident minimum third-party liability coverage. Tier 2 (SME/medium " +
        "operators, 50–249 employees or €10M–50M turnover, or lower-risk missions): EUR 50M " +
        "per incident. Tier 3 (Start-ups and research entities, <50 employees or <€10M " +
        "turnover, including university research missions): EUR 20M per incident. Size " +
        "thresholds follow the EU SME Recommendation 2003/361/EC definitions. The tier " +
        "classification is determined at the time of authorization application and reviewed " +
        "annually. Operators may request tier reclassification if their size category changes.",
    },
    standardsMapping: [
      {
        framework: "Liability Convention 1972",
        reference: "Art. II",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 30-35",
      confidence: "direct",
    },
    category: "insurance",
  },

  // ── Environmental Footprint (Art. 7 — lifecycle assessment) ──
  {
    id: "it-space-economy-act-environmental",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 7",
      title: "Environmental lifecycle footprint assessment",
      fullText:
        "The Italian Space Economy Act requires operators to submit a full lifecycle " +
        "environmental footprint assessment as part of the authorization application. This " +
        "assessment must cover: environmental impact of spacecraft manufacturing and testing; " +
        "launch emissions and atmospheric effects; on-orbit environmental impact (debris " +
        "generation risk, collision avoidance); and end-of-life disposal impact (re-entry " +
        "emissions, ground casualty risk, marine pollution risk). The lifecycle approach is " +
        "a distinctive feature of the Italian law, going beyond the debris-only focus of many " +
        "national space laws. ASI may consult with ISPRA (Istituto Superiore per la Protezione " +
        "e la Ricerca Ambientale) for environmental impact review. Implementing decrees will " +
        "specify the methodology and reporting format for the lifecycle assessment.",
    },
    standardsMapping: [
      {
        framework: "COPUOS LTS Guidelines 2019",
        reference: "Guideline 1-5",
        relationship: "implements",
      },
      {
        framework: "ISO 14001:2015",
        reference: "Clause 6",
        relationship: "equivalent",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 59-73",
      confidence: "direct",
    },
    category: "environmental",
  },

  // ── Cybersecurity — Space-Specific (Art. 8) ──
  {
    id: "it-space-economy-act-cybersecurity",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 8",
      title: "Cybersecurity requirements for space operations",
      fullText:
        "The Italian Space Economy Act requires operators to implement cybersecurity measures " +
        "covering: encryption of command and control links; anti-jamming and anti-spoofing " +
        "capabilities for mission-critical communications; resilience of ground segment " +
        "infrastructure; secure software update mechanisms; and supply chain cybersecurity. " +
        "The Agenzia per la Cybersicurezza Nazionale (ACN), in coordination with ASI, is " +
        "responsible for developing detailed cybersecurity rules for space operations. These " +
        "ACN+ASI joint cybersecurity rules are pending publication as implementing regulations. " +
        "Until published, operators should demonstrate compliance with NIS2 requirements " +
        "(D.Lgs. 138/2024) and align with CCSDS 350.1-G-3 security standards for space data " +
        "systems. ACN maintains the national CSIRT (Computer Security Incident Response Team) " +
        "to which space cyber incidents must be reported.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive 2022/2555",
        reference: "Art. 21",
        relationship: "implements",
      },
      {
        framework: "CCSDS 350.1-G-3",
        reference: "Full",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74-85",
      confidence: "direct",
    },
    category: "cybersecurity",
  },

  // ── National Registration and UN Notification (Art. 9 — detailed) ──
  {
    id: "it-space-economy-act-registration-detailed",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 9",
      title: "National registry and UN notification",
      fullText:
        "All authorized Italian space objects must be registered in the national Italian " +
        "space object registry maintained by ASI. ASI is responsible for notifying the " +
        "UN Secretary-General of each registered object in accordance with the Registration " +
        "Convention (UNGA Res. 3235 (XXIX)) and UNGA Res. 62/101 recommendations. " +
        "Registration data must include: operator identity and contact information; " +
        "COSPAR/NORAD designator (post-launch); orbital parameters at deployment; launch " +
        "date, vehicle, and launch site; general function and mission purpose; expected " +
        "operational lifetime and planned disposal method. Registration must be completed " +
        "within 60 days of reaching orbit. Changes in orbital parameters, ownership, or " +
        "status must be notified to ASI within 30 days.",
    },
    standardsMapping: [
      {
        framework: "UN Registration Convention",
        reference: "Art. IV",
        relationship: "implements",
      },
      {
        framework: "UNGA Res. 62/101",
        reference: "Section III",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 40-50",
      confidence: "direct",
    },
    category: "registration",
  },

  // ── Pre-Mission Notification and Reporting (Art. 6) ──
  {
    id: "it-space-economy-act-reporting",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 6",
      title: "Pre-mission notification and ongoing activity reporting",
      fullText:
        "Authorized operators must provide ASI with a pre-mission notification at least 30 " +
        "days before the planned launch or commencement of space operations. The notification " +
        "must confirm that all authorization conditions have been met, insurance is in force, " +
        "and the mission profile has not materially changed since authorization. Additionally, " +
        "operators must submit semi-annual activity reports to ASI covering: operational " +
        "status of all authorized space objects; anomalies and incidents; collision avoidance " +
        "manoeuvres performed; debris mitigation compliance status; insurance coverage status; " +
        "and any material changes to corporate structure or key personnel. Incident reporting " +
        "must follow NIS2 timelines (24h early warning, 72h notification, 1-month final report) " +
        "for cybersecurity incidents, with immediate notification to ASI for safety-critical events.",
    },
    standardsMapping: [
      {
        framework: "Outer Space Treaty 1967",
        reference: "Art. VI",
        relationship: "implements",
      },
      {
        framework: "NIS2 Directive 2022/2555",
        reference: "Art. 23",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 89-92",
      confidence: "direct",
    },
    category: "supervision",
  },

  // ── Operator Categories (Art. 11 — size classification) ──
  {
    id: "it-space-economy-act-operator-categories",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 11",
      title: "Operator size categories — large, SME/startup, research",
      fullText:
        "The Italian Space Economy Act classifies operators into three categories for insurance " +
        "and regulatory proportionality purposes: (1) Large operators: ≥250 employees or " +
        "≥€50M annual turnover — full regulatory requirements, EUR 100M insurance. (2) SME " +
        "and startup operators: 50–249 employees or €10M–50M turnover, or operators conducting " +
        "lower-risk missions regardless of size — intermediate requirements, EUR 50M insurance. " +
        "(3) Research operators: micro/small entities (<50 employees, <€10M turnover) including " +
        "university and public research missions — reduced requirements, EUR 20M insurance. " +
        "The category determines not only insurance but also the depth of technical assessment " +
        "by ASI, with proportionately lighter review for research-category missions. This " +
        "tiered approach is designed to support the Italian NewSpace ecosystem and academic " +
        "space research while maintaining safety standards.",
    },
    standardsMapping: [
      {
        framework: "Liability Convention 1972",
        reference: "Art. II",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 26-35",
      confidence: "partial",
    },
    category: "insurance",
  },

  // ── Liability Cap Loss Conditions (Art. 11 — strict liability) ──
  {
    id: "it-space-economy-act-liability-cap",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 11",
      title: "Conditions under which the liability cap is lost",
      fullText:
        "Operators benefit from strict liability limited to their insurance tier (EUR 20M, " +
        "50M, or 100M). However, the liability cap is lost and the operator bears unlimited " +
        "liability if any of the following conditions apply: (1) the space activity was " +
        "conducted without proper authorization; (2) the operator breached material " +
        "conditions of the authorization; (3) the operator failed to maintain the required " +
        "insurance coverage at the time of the incident; (4) the operator acted with gross " +
        "negligence (colpa grave) or wilful misconduct (dolo). In such cases, the Italian " +
        "State retains full recourse rights against the operator for any amounts paid under " +
        "the Liability Convention. This creates a strong incentive for compliance with " +
        "authorization conditions and continuous insurance maintenance.",
    },
    standardsMapping: [
      {
        framework: "Liability Convention 1972",
        reference: "Art. II-III",
        relationship: "implements",
      },
      {
        framework: "Outer Space Treaty 1967",
        reference: "Art. VI-VII",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 26-35",
      confidence: "direct",
    },
    category: "insurance",
  },

  // ── Collision Avoidance and Post-Mission Disposal (Art. 7 — operational) ──
  {
    id: "it-space-economy-act-collision-avoidance",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 7",
      title: "Collision avoidance and post-mission disposal obligations",
      fullText:
        "Operators must maintain active collision avoidance capability throughout the " +
        "operational lifetime of their space objects. This includes: subscription to a " +
        "conjunction analysis service (e.g., EU SST, LeoLabs, or equivalent); defined " +
        "thresholds and procedures for executing collision avoidance manoeuvres; coordination " +
        "with ASI and relevant SSA providers. For post-mission disposal, operators must " +
        "execute their approved disposal plan within the timeframe specified in the Debris " +
        "Mitigation Plan. The 25-year LEO de-orbit rule applies as the baseline, with ASI " +
        "expected to move towards shorter disposal timelines consistent with evolving " +
        "international best practice. For non-manoeuvrable objects, operators must demonstrate " +
        "that natural orbital decay will achieve de-orbit within the required timeframe.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Sections 5-6",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.3",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 65-72",
      confidence: "direct",
    },
    category: "debris",
  },

  // ── Supervision and Enforcement (Art. 12-14) ──
  {
    id: "it-space-economy-act-supervision",
    nationalRef: {
      law: "Law 89/2025, Legge sull'Economia dello Spazio",
      article: "Art. 12-14",
      title: "Supervision, inspection, and enforcement powers",
      fullText:
        "ASI has the authority to conduct inspections and audits of authorized operators to " +
        "verify ongoing compliance. Enforcement measures include: warnings and corrective " +
        "action notices; suspension of authorization (temporary, pending corrective action); " +
        "revocation of authorization (permanent, for serious or repeated non-compliance); " +
        "and administrative fines. MIMIT retains the ultimate power to revoke authorizations " +
        "on ASI's recommendation. Operators must cooperate with ASI inspections and provide " +
        "access to facilities, records, and personnel. Italy may also exercise diplomatic " +
        "channels for enforcement consistent with its obligations under the Outer Space Treaty.",
    },
    standardsMapping: [
      {
        framework: "Outer Space Treaty 1967",
        reference: "Art. VI",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 89-95",
      confidence: "direct",
    },
    category: "supervision",
  },
];

// ─── Knowledge Base ─────────────────────────────────────────────────────────

const ITALY_KNOWLEDGE_BASE = `
## ITALY (ASI) — REGULATORY KNOWLEDGE BASE

### NCA Overview
ASI (Agenzia Spaziale Italiana) is Italy's national space agency and acts as the technical
assessment body for space authorization applications submitted to the Ministry of Enterprises
and Made in Italy (MIMIT). ASI maintains the Italian space object registry and represents
Italy in international space bodies.

Website: https://www.asi.it

### Law 89/2025, Legge sull'Economia dello Spazio (Italian Space Economy Act)
Italy enacted its first comprehensive space law in 2025 — Law 89/2025, the Legge sull'Economia
dello Spazio. Entry into force: 25 June 2025. This is a landmark development; Italy previously
lacked a unified national space law and operated under general administrative law principles.

CRITICAL NOTE — IMPLEMENTING REGULATIONS PENDING:
The 2025 law establishes the framework but delegates key procedural and technical details
to implementing decrees (decreti ministeriali attuativi). As of the date of this data file,
these implementing regulations have NOT yet been published. This means:
- Specific application forms and procedures are not yet finalized
- Technical assessment criteria are not yet formally specified
- Insurance tier thresholds (EUR 20M / 50M / 100M) are set in the law but procedural
  confirmation requirements are pending implementing decrees
- Registration procedures and timeline are pending
- ACN+ASI joint cybersecurity rules for space operations are pending
Operators should contact ASI directly for the current interim guidance process.

### ASI Submission Process
The authorization application process under Law 89/2025 follows a two-stage assessment:
1. Informal pre-engagement: operators are strongly encouraged to contact ASI's Space
   Regulation Office before formal submission to discuss completeness and expectations
2. Formal application: submitted to ASI with full technical dossier
3. ASI technical review: 60-day assessment of technical, safety, debris, insurance, and
   cybersecurity compliance
4. MIMIT decision: final authorization decision within 120 days of complete application
5. Conditions: authorization may include mission-specific conditions
6. Pre-mission notification: 30-day advance notice before planned launch
7. Ongoing reporting: semi-annual activity reports to ASI

### Insurance — Size-Tiered Framework
The 2025 law introduces a notable innovation: tiered insurance requirements per incident:
- Large operators (≥250 employees or ≥€50M turnover): EUR 100 million per incident
- SME/medium operators (50–249 employees or €10M–50M turnover) or lower-risk missions:
  EUR 50 million per incident
- Start-ups and research entities (<50 employees or <€10M turnover): EUR 20 million per incident
Size thresholds follow EU SME definitions (Recommendation 2003/361/EC).

STRICT LIABILITY AND CAP LOSS CONDITIONS:
- Strict liability applies up to the insurance limit
- The liability cap is LOST if the operator: (1) conducted unauthorized activities;
  (2) breached authorization conditions; (3) failed to maintain required insurance;
  (4) acted with gross negligence (colpa grave) or wilful misconduct (dolo)
- In cap-loss scenarios, the operator bears unlimited liability and the Italian State
  retains full recourse rights under the Liability Convention

This tiered system is more operator-friendly for small NewSpace companies than flat
minimums (e.g., France EUR 60M). However, implementing decrees confirming the exact
framework are still awaited.

### Cybersecurity — ACN and ASI Joint Regime
Italy has a dual cybersecurity regime for space operators:
1. General NIS2 obligations: transposed via D.Lgs. 138/2024, supervised by ACN (Agenzia
   per la Cybersicurezza Nazionale). ACN is the national cybersecurity authority and
   maintains Italy's CSIRT for incident reporting.
2. Space-specific cybersecurity: Law 89/2025 Art. 8 establishes additional requirements
   for encryption, anti-jamming, anti-spoofing, and ground segment resilience. ACN and
   ASI are jointly developing implementing rules (pending publication).

Key obligations:
- Risk management measures per D.Lgs. 138/2024 Art. 24
- 24h/72h/1-month incident reporting timelines to ACN CSIRT
- Supply chain security requirements
- Command and control link encryption and authentication
- Anti-jamming and anti-spoofing for mission-critical communications
- Italian-language incident reports typically required for ACN submissions
- Space operators with ground segment infrastructure qualifying as critical
  infrastructure are classified as essential entities regardless of size

### Debris Mitigation Standards
ASI applies IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020) and
ISO 24113:2019 as primary technical standards. The Italian law adds a distinctive
lifecycle environmental footprint requirement, going beyond debris-only considerations
to encompass the full environmental impact from manufacturing through disposal.
Until implementing decrees are issued, operators should demonstrate compliance using
these international standards directly. ESA DRAMA or equivalent tools are accepted
for orbital lifetime analysis.

### Environmental Lifecycle Assessment
A distinctive feature of Law 89/2025 is the requirement for a full lifecycle environmental
footprint assessment covering: manufacturing environmental impact; launch emissions and
atmospheric effects; on-orbit debris and collision risk; and end-of-life disposal impact
including re-entry emissions and ground/marine pollution risk. ASI may consult with ISPRA
(Istituto Superiore per la Protezione e la Ricerca Ambientale) for environmental review.

### EU Space Act Proposal Context
As an EU Member State, Italy will implement COM(2025) 335 once enacted. ASI is expected to
become the designated NCA under the harmonized EU framework. The new Italian space law was
designed in part to position Italy ahead of the EU Space Act, and ASI has been involved in
the EU Space Act legislative process. Operators should anticipate that implementing decrees
for the Italian law may be aligned with EU Space Act requirements when they are issued.

### Italy's Space Sector Profile
Italy has a significant domestic space industry (Leonardo, Thales Alenia Space, Avio) and
is a founding member of ESA with a strong scientific and commercial space heritage. ASI
administers Italian contributions to ISS, the Cosmo-SkyMed EO constellation, and the
PRISMA hyperspectral satellite. New entrants benefit from ASI's technical expertise and
access to ground infrastructure.
`.trim();

// ─── Jurisdiction Data ───────────────────────────────────────────────────────

const ITALY_JURISDICTION: JurisdictionData = {
  code: "IT",
  name: "Italy",

  nca: {
    name: "ASI",
    fullName: "Agenzia Spaziale Italiana (Italian Space Agency)",
    website: "https://www.asi.it",
    language: "it",
    executiveSummaryLanguage: "it",
  },

  spaceLaw: {
    name: "Legge sull'Economia dello Spazio (Italian Space Economy Act)",
    citation:
      "Law 89/2025, Legge sull'Economia dello Spazio. Entry into force: 25 June 2025. " +
      "(G.U. n. 33 del 8.2.2025)",
    yearEnacted: 2025,
    yearAmended: null,
    status: "enacted",
    url: "https://www.gazzettaufficiale.it/eli/id/2025/02/08/25G00018/SG",
  },

  additionalLaws: [
    {
      name: "D.Lgs. 138/2024 (Italian NIS2 transposition)",
      citation: "D.Lgs. 4 settembre 2024, n. 138",
      scope:
        "Cybersecurity obligations for essential and important entities including space operators; " +
        "ACN (Agenzia per la Cybersicurezza Nazionale) as supervisory authority; " +
        "incident reporting timelines: 24h / 72h / 1 month",
      status: "enacted",
    },
    {
      name: "Implementing Decrees under L. n. 7/2025",
      citation: "Decreti ministeriali attuativi — NOT YET PUBLISHED",
      scope:
        "PENDING: Technical standards, application procedures, insurance confirmation requirements, " +
        "registration formats, and authorization timelines. " +
        "Operators must contact ASI for interim guidance until these are issued.",
      status: "draft",
    },
  ],

  requirements: ITALY_REQUIREMENTS,

  insurance: {
    minimumTPL: 20_000_000,
    formula:
      "Size-tiered per incident: EUR 100M (large operators, ≥250 employees or ≥€50M turnover); " +
      "EUR 50M (SME/medium operators or lower-risk missions); EUR 20M (start-ups and research " +
      "entities, <50 employees or <€10M turnover). Strict liability up to insurance limit. " +
      "Liability cap lost if: unauthorized activity, breach of conditions, no insurance, or " +
      "gross negligence/wilful misconduct. Size thresholds follow EU SME Recommendation " +
      "2003/361/EC. Implementing decrees specifying procedural confirmation requirements PENDING.",
    cap: null,
    governmentGuarantee: false,
    legalBasis:
      "Law 89/2025, Legge sull'Economia dello Spazio, Art. 11. Entry into force: 25 June 2025. " +
      "Implementing regulations pending — contact ASI for current process. " +
      "Italian State exercises recourse against operators for international liability payments.",
  },

  complianceMatrixFormat: {
    statusValues: [
      "C (Conforme)",
      "NC (Non Conforme)",
      "PC (Parzialmente Conforme)",
      "NA (Non Applicabile)",
    ],
    columns: [
      "Requisito (Requirement)",
      "Base Legale (Legal Basis)",
      "EU Space Act Art.",
      "Stato (Status)",
      "Evidenza (Evidence)",
      "Note (Comment)",
    ],
    language: "it",
  },

  rigor: {
    debris: 3,
    cybersecurity: 3,
    general: 4,
    safety: 3,
  },

  requiredTools: [
    {
      name: "ESA DRAMA Suite",
      description:
        "OSCAR, MASTER, ARES modules for orbital lifetime and re-entry risk analysis. " +
        "ASI accepts ESA DRAMA or equivalent propagation tools pending issuance of implementing decrees " +
        "that may specify additional Italian-specific requirements.",
      mandatory: false,
    },
  ],

  acceptedEvidence: [
    {
      type: "ISO_27001_CERT",
      description:
        "ISO/IEC 27001:2022 certification accepted as evidence of NIS2 cybersecurity " +
        "compliance by ACN (Agenzia per la Cybersicurezza Nazionale).",
      acceptedAsShortcut: true,
    },
    {
      type: "IADC_COMPLIANCE_REPORT",
      description:
        "Technical report demonstrating compliance with IADC Space Debris Mitigation " +
        "Guidelines Rev.2. Primary debris compliance evidence accepted by ASI pending " +
        "implementing decrees.",
      acceptedAsShortcut: false,
    },
    {
      type: "INSURANCE_CERTIFICATE",
      description:
        "Certificate of third-party liability insurance confirming coverage amount " +
        "appropriate to operator size tier (EUR 20M / 50M / 100M) per L. n. 7/2025 Art. 11.",
      acceptedAsShortcut: false,
    },
  ],

  documentGuidance: {
    DMP: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference Law 89/2025, Legge sull'Economia dello Spazio, Art. 7 as legal basis",
        "Apply IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020) as primary standard",
        "Reference ISO 24113:2019 throughout as complementary standard",
        "Demonstrate 25-year post-mission disposal compliance for LEO",
        "Include passivation plan for all stored energy sources at end-of-life",
        "Include lifecycle environmental footprint assessment (manufacturing through disposal)",
        "Describe collision avoidance capability and procedures (conjunction analysis service)",
        "Address post-mission disposal execution plan with delta-V budget",
        "For non-manoeuvrable objects: demonstrate natural decay achieves compliance",
        "Note that implementing decrees may impose additional Italian-specific requirements when issued",
        "Italian-language executive summary recommended for ASI review",
        "ESA DRAMA suite accepted for orbital lifetime analysis",
      ],
      commonRejectionReasons: [
        "No reference to Law 89/2025 legal basis",
        "Passivation plan missing or incomplete",
        "25-year deorbit rule compliance not supported by analysis",
        "Lifecycle environmental footprint not addressed",
        "Collision avoidance capability not described",
        "Implementing decrees not acknowledged — document should note pending regulations",
      ],
    },
    AUTHORIZATION_APPLICATION: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Contact ASI Space Regulation Office before formal submission — implementing decrees pending",
        "Include technical description of space object, orbital parameters, mission duration",
        "Confirm applicable operator category: large, SME/startup, or research",
        "Confirm applicable insurance tier based on operator size (EUR 20M/50M/100M)",
        "Attach insurance documentation or commitment letter per Law 89/2025 Art. 11",
        "Include Debris Mitigation Plan (Piano di Mitigazione dei Detriti Spaziali)",
        "Include lifecycle environmental footprint assessment per Art. 7",
        "Include cybersecurity arrangements per Art. 8 (pending ACN+ASI detailed rules)",
        "Submit 30-day pre-mission notification before planned launch",
        "Registration under Art. 9 proceeds after authorization is granted",
        "Note: ASI technical review takes 60 days; final MIMIT decision within 120 days",
        "Applications may be submitted in Italian or English; ASI correspondence typically in Italian",
        "IMPORTANT: Reference that implementing regulations are pending and process may evolve",
      ],
      commonRejectionReasons: [
        "Failure to engage ASI before formal application given pending implementing decrees",
        "Insurance tier not matched to operator size classification",
        "Debris mitigation plan not included or not referencing Law 89/2025 Art. 7",
        "Environmental lifecycle footprint assessment missing",
        "Cybersecurity measures not addressed",
        "Missing Italian corporate/entity registration documentation",
        "Operator category not clearly identified",
      ],
    },
    CYBER_POLICY: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference Law 89/2025 Art. 8 as legal basis for space-specific cybersecurity",
        "Reference D.Lgs. 138/2024 (NIS2 transposition) for general cybersecurity obligations",
        "Describe encryption of command and control links",
        "Address anti-jamming and anti-spoofing capabilities for mission-critical communications",
        "Describe ground segment resilience and access control measures",
        "Include supply chain cybersecurity assessment",
        "Define incident reporting procedures: 24h early warning to ACN CSIRT, 72h notification, 1-month report",
        "Align with CCSDS 350.1-G-3 for space data systems security",
        "Note that ACN+ASI joint cybersecurity implementing rules are pending publication",
        "Italian-language incident reports typically required for ACN submissions",
      ],
      commonRejectionReasons: [
        "No reference to both Law 89/2025 Art. 8 and D.Lgs. 138/2024",
        "Command link encryption not specified",
        "ACN incident reporting timelines not addressed",
        "Anti-jamming/anti-spoofing capabilities not described",
        "Ground segment security measures insufficient",
      ],
    },
    ENVIRONMENTAL_FOOTPRINT: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference Law 89/2025 Art. 7 lifecycle environmental footprint requirement",
        "Cover manufacturing phase: materials, energy, waste, hazardous substances",
        "Cover launch phase: emissions from launch vehicle, atmospheric effects",
        "Cover on-orbit phase: debris generation risk, collision probability, spectrum use",
        "Cover end-of-life phase: re-entry emissions, ground casualty risk, marine pollution",
        "Align with COPUOS Long-term Sustainability Guidelines where applicable",
        "Consider ISO 14001:2015 environmental management system framework",
        "Italian-language executive summary for ASI and ISPRA review",
        "Note that implementing decrees may specify detailed methodology when issued",
      ],
      commonRejectionReasons: [
        "Not all mission lifecycle phases covered",
        "End-of-life environmental impact not assessed",
        "No reference to Law 89/2025 Art. 7 legal basis",
        "Methodology not described or not aligned with recognized standards",
      ],
    },
    INSURANCE_COMPLIANCE: {
      depthExpectation: "standard",
      specificRequirements: [
        "Reference Law 89/2025 Art. 11 as legal basis",
        "Clearly identify operator category: large (EUR 100M), SME (EUR 50M), or research (EUR 20M)",
        "Provide evidence of operator size classification (employees, turnover)",
        "Insurance certificate must specify: per-incident limit, scope, mission coverage period",
        "Confirm insurance is maintained continuously throughout authorization period",
        "Acknowledge conditions under which liability cap is lost (unauthorized, breach, no insurance, gross negligence)",
        "State recourse obligation to Italian State under Liability Convention",
        "Note implementing decrees may specify additional coverage forms when issued",
      ],
      commonRejectionReasons: [
        "Insurance tier not matched to demonstrated operator size category",
        "Per-incident coverage below required tier minimum",
        "Insurance certificate does not cover full mission duration",
        "Operator size documentation insufficient to support tier classification",
      ],
    },
  },

  knowledgeBase: ITALY_KNOWLEDGE_BASE,
};

// ─── Export ──────────────────────────────────────────────────────────────────

export function getItalyJurisdiction(): JurisdictionData {
  return ITALY_JURISDICTION;
}
