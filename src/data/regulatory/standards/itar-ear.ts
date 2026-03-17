/**
 * ITAR (22 CFR 120-130) + EAR (15 CFR 730-774)
 * US Export Control Requirements for Space Technology
 *
 * International Traffic in Arms Regulations (ITAR): 22 CFR Parts 120-130
 * Administered by the Directorate of Defense Trade Controls (DDTC),
 * U.S. Department of State.
 *
 * Export Administration Regulations (EAR): 15 CFR Parts 730-774
 * Administered by the Bureau of Industry and Security (BIS),
 * U.S. Department of Commerce.
 *
 * IMPORTANT LEGAL DISCLAIMER:
 * This module is for COMPLIANCE TRACKING AND EDUCATIONAL PURPOSES ONLY.
 * It does NOT constitute legal advice and should NOT be relied upon for
 * export control compliance decisions. Violations of ITAR and EAR can result
 * in criminal penalties including imprisonment up to 20 years and fines up
 * to $1,000,000 per violation. ALWAYS consult with qualified export control
 * counsel and/or the appropriate government agencies (DDTC, BIS) before
 * making any export control decisions.
 *
 * Sources:
 * - International Traffic in Arms Regulations (ITAR): 22 CFR 120-130
 * - Export Administration Regulations (EAR): 15 CFR 730-774
 * - U.S. Munitions List (USML): 22 CFR 121
 * - Commerce Control List (CCL): 15 CFR 774, Supplement No. 1
 *
 * LEGAL DISCLAIMER: This data references enacted US federal law. Regulatory
 * citations and descriptions are sourced from the Code of Federal Regulations.
 * This does not constitute legal advice. Export control violations carry severe
 * criminal and civil penalties. Always consult the current CFR, DDTC, BIS,
 * and qualified export control counsel before making compliance decisions.
 */

import type { EnactedRequirement } from "../types";

// ─── Constants ──────────────────────────────────────────────────────────────

const ITAR_CITATION = "22 CFR Parts 120-130 (ITAR)";
const EAR_CITATION = "15 CFR Parts 730-774 (EAR)";

const LAST_VERIFIED = "2026-03-17";

const EU_SPACE_ACT_DISCLAIMER =
  "Based on COM(2025) 335 legislative proposal. Article numbers may change." as const;

// ─── ITAR/EAR Export Control — Enacted Requirements ─────────────────────────

const itarEarRequirements: EnactedRequirement[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ITAR-USML-XV — USML Category XV: Spacecraft and Related Articles
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ITAR-USML-XV",
    source: {
      framework: "ITAR",
      reference: "22 CFR §121.1, Category XV",
      title: "USML Category XV — Spacecraft and Related Articles",
      fullText:
        "USML Category XV controls spacecraft and related articles, including: " +
        "(a) Spacecraft, including satellites, and ground control systems therefor; " +
        "(b) On-board spacecraft systems and components specifically designed or " +
        "modified for use on spacecraft controlled under this category, including " +
        "attitude control systems, propulsion systems, power systems, thermal " +
        "control systems, and space-qualified electronics; (c) Radiation-hardened " +
        "microelectronics specifically designed for space applications; (d) Ground " +
        "support equipment specifically designed for spacecraft in this category. " +
        "Items on USML Category XV require DDTC authorization (licence) for any " +
        "export, temporary import, or defence service. The 2017 ECR reform moved " +
        "certain lower-technology items from USML XV to EAR ECCN 9A515.",
      status: "enacted",
      citation: ITAR_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "22 CFR §121.1, Cat. XV; DDTC Registration §122",
        notes:
          "All manufacturers, exporters, and brokers of USML Category XV items " +
          "must register with DDTC. Export requires DSP-5 licence, technical data " +
          "sharing requires TAA. Violations subject to criminal penalties.",
      },
      {
        jurisdiction: "EU",
        reference:
          "EU Dual-Use Regulation 2021/821, Annex I; Wassenaar ML11/ML15",
        notes:
          "EU dual-use controls complement ITAR. European companies involved in " +
          "US-origin spacecraft technology must comply with both ITAR (as imposed " +
          "by US) and EU Regulation 2021/821 re-export controls.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 76",
      confidence: "inferred",
      relationship: "new_obligation",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "export_control",
    applicableTo: ["SCO"],
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITAR-USML-IV — USML Category IV: Launch Vehicles
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ITAR-USML-IV",
    source: {
      framework: "ITAR",
      reference: "22 CFR §121.1, Category IV",
      title:
        "USML Category IV — Launch Vehicles, Guided Missiles, Ballistic Vehicles",
      fullText:
        "USML Category IV controls launch vehicles, guided missiles, ballistic " +
        "vehicles, rockets, torpedoes, bombs, and mines. For space applications, " +
        "this includes: (a) Launch vehicles and missile systems including all " +
        "stages and solid/liquid propulsion systems; (b) Individual rocket stages; " +
        "(c) Guidance and navigation systems specifically designed for launch " +
        "vehicles; (d) Thrust vector control systems; (e) Re-entry vehicles; " +
        "(f) Launch support equipment specifically designed for items in this " +
        "category. Category IV items are among the most strictly controlled " +
        "under ITAR due to missile proliferation concerns. No significant items " +
        "were moved to EAR under ECR reform.",
      status: "enacted",
      citation: ITAR_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "22 CFR §121.1, Cat. IV; MTCR Annex; EAR §742.5",
        notes:
          "Category IV items are subject to the strictest ITAR controls. " +
          "Missile Technology Control Regime (MTCR) Category I items face a " +
          "strong presumption of denial for export. No licence exceptions exist.",
      },
      {
        jurisdiction: "EU",
        reference:
          "EU Dual-Use Regulation 2021/821, Annex I (9A); MTCR implementation",
        notes:
          "EU implements MTCR controls through Dual-Use Regulation Annex I. " +
          "Launch vehicle technology with US-origin content requires ITAR " +
          "compliance regardless of EU export licence status.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 76",
      confidence: "inferred",
      relationship: "new_obligation",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "export_control",
    applicableTo: ["LO", "LSO"],
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITAR-TAA — Technical Assistance Agreement
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ITAR-TAA",
    source: {
      framework: "ITAR",
      reference: "22 CFR §124.1 (Technical Assistance Agreements)",
      title: "Technical Assistance Agreement requirement for defence services",
      fullText:
        "Any person who intends to export defence services, including the " +
        "furnishing of technical data and assistance (including training) to " +
        "foreign persons in connection with the design, development, engineering, " +
        "manufacture, production, assembly, testing, repair, maintenance, " +
        "modification, operation, or use of defence articles, must obtain prior " +
        "DDTC approval through a Technical Assistance Agreement (TAA). For space " +
        "programmes, TAAs are required when sharing spacecraft design data, " +
        "providing launch integration support to foreign entities, conducting " +
        "joint development activities, and training foreign nationals on USML- " +
        "controlled systems. TAAs must specify all parties, scope of work, " +
        "third-party transfer limitations, and security measures.",
      status: "enacted",
      citation: ITAR_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "22 CFR §124.1–124.16; DDTC Guidelines for TAA Preparation",
        notes:
          "TAAs require DDTC approval with typical processing times of 30-90 " +
          "days. All parties must be DDTC-registered. TAAs have defined periods " +
          "of performance and require amendment for scope changes.",
      },
      {
        jurisdiction: "EU",
        reference:
          "EU Dual-Use Regulation 2021/821; National catch-all provisions",
        notes:
          "European entities receiving US technical data under TAAs must comply " +
          "with TAA restrictions on re-transfer. EU dual-use controls apply " +
          "independently to European-origin technology.",
      },
    ],
    euSpaceActProposal: null,
    category: "export_control",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITAR-DSP73 — DSP-73 Temporary Export Licence
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ITAR-DSP73",
    source: {
      framework: "ITAR",
      reference: "22 CFR §123.5 (Temporary Export Licences — DSP-73)",
      title: "DSP-73 licence for temporary exports of defence articles",
      fullText:
        "A DSP-73 licence authorises the temporary export of unclassified defence " +
        "articles that will be returned to the United States. This is commonly " +
        "required in space programmes for: temporary export of spacecraft or " +
        "components for integration at foreign launch sites, exhibition of space " +
        "hardware at international trade shows, testing of defence articles at " +
        "foreign facilities, and temporary deployment of ground support equipment " +
        "abroad. The licence specifies the articles, destination, end-use, " +
        "duration of temporary export, and conditions for return. Items must be " +
        "returned within 4 years unless an extension is obtained.",
      status: "enacted",
      citation: ITAR_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "22 CFR §123.5; DDTC Temporary Export Guidelines",
        notes:
          "DSP-73 applications must detail the temporary export purpose, " +
          "security measures at the foreign location, and return logistics. " +
          "Items must be under US person control at all times abroad.",
      },
      {
        jurisdiction: "EU",
        reference: "EU Dual-Use Regulation 2021/821, Art. 6 (transit)",
        notes:
          "EU transit and transhipment controls may apply when ITAR-controlled " +
          "items pass through EU territory under DSP-73 temporary export. " +
          "EU customs authorities may require transit documentation.",
      },
    ],
    euSpaceActProposal: null,
    category: "export_control",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EAR-ECCN-9A515 — Commerce Control List 9A515: Spacecraft
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "EAR-ECCN-9A515",
    source: {
      framework: "EAR",
      reference: "15 CFR §774, Supplement No. 1, ECCN 9A515",
      title: "Commerce Control List ECCN 9A515 — Spacecraft and related items",
      fullText:
        "ECCN 9A515 controls spacecraft and related items that were transitioned " +
        "from USML Category XV to the Commerce Control List under the Export " +
        "Control Reform (ECR) initiative. This includes: (a) Spacecraft that are " +
        "not enumerated in USML Category XV (generally lower-technology and " +
        "commercial spacecraft); (b) Spacecraft parts, components, and accessories " +
        "not enumerated in USML XV; (c) Remote sensing spacecraft with performance " +
        "parameters below USML thresholds; (d) Commercial communication satellite " +
        "buses and subsystems. Items classified as 9A515 require a BIS licence " +
        "for export to most destinations, with limited licence exceptions available " +
        "(STA, GOV). Anti-Terrorism (AT) controls apply to all destinations.",
      status: "enacted",
      citation: EAR_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "15 CFR §774 (ECCN 9A515); BIS Licensing Policy",
        notes:
          "BIS licence required for export of 9A515 items to most destinations. " +
          "Licence exceptions STA and GOV may be available for certain allies. " +
          "China, Russia, and other embargoed destinations face presumption of denial.",
      },
      {
        jurisdiction: "EU",
        reference: "EU Dual-Use Regulation 2021/821, Annex I (9A)",
        notes:
          "EU dual-use list includes equivalent controls for commercial " +
          "spacecraft technology. Items with US-origin content classified " +
          "under 9A515 require compliance with both EAR and EU export controls.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 76",
      confidence: "inferred",
      relationship: "new_obligation",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "export_control",
    applicableTo: ["SCO"],
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EAR-ECCN-9E515 — Technology for Spacecraft (Deemed Export)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "EAR-ECCN-9E515",
    source: {
      framework: "EAR",
      reference: "15 CFR §774, Supplement No. 1, ECCN 9E515; 15 CFR §734.13",
      title: "Technology for spacecraft — deemed export controls",
      fullText:
        "ECCN 9E515 controls technology required for the development, production, " +
        "or use of items controlled under ECCN 9A515. Under EAR deemed export " +
        "rules (15 CFR §734.13), the release of 9E515 technology to a foreign " +
        "national within the United States is deemed an export to that person's " +
        "most recent country of citizenship or permanent residency. This means " +
        "that employing or collaborating with foreign nationals on 9A515/9E515 " +
        "spacecraft projects requires a deemed export licence unless a licence " +
        "exception applies. Technology includes technical data (blueprints, " +
        "specifications, software source code) and technical assistance " +
        "(instruction, training, working knowledge).",
      status: "enacted",
      citation: EAR_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "15 CFR §734.13; §734.14; BIS Deemed Export FAQ",
        notes:
          "Companies must implement Technology Control Plans (TCPs) to prevent " +
          "unauthorized deemed exports. Foreign national employees working on " +
          "9E515 technology require BIS deemed export licences or qualification " +
          "for licence exception.",
      },
      {
        jurisdiction: "EU",
        reference:
          "EU Dual-Use Regulation 2021/821, Art. 2(2) (intangible transfers)",
        notes:
          "EU dual-use regulation covers intangible technology transfers but " +
          "does not have an exact 'deemed export' equivalent. EU entities with " +
          "US-origin 9E515 technology must comply with EAR re-export controls.",
      },
    ],
    euSpaceActProposal: null,
    category: "export_control",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EAR-LICENSE — BIS Licence Requirements for Controlled Destinations
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "EAR-LICENSE",
    source: {
      framework: "EAR",
      reference:
        "15 CFR §742; §746 (Embargoes); Commerce Country Chart (Supplement No. 1 to Part 738)",
      title: "BIS licence requirements for controlled destinations",
      fullText:
        "The EAR Commerce Country Chart determines BIS licence requirements " +
        "based on the combination of an item's ECCN reason for control and the " +
        "destination country. For space technology (ECCN 9A515, 9D515, 9E515), " +
        "licence requirements apply for: (1) National Security (NS) reasons — " +
        "most destinations except close allies; (2) Regional Stability (RS) " +
        "reasons — selected destinations; (3) Anti-Terrorism (AT) reasons — all " +
        "destinations. Comprehensive embargoes (§746) prohibit virtually all " +
        "exports to Cuba, Iran, North Korea, Syria, and the Crimea/Donetsk/ " +
        "Luhansk regions. Entity List restrictions (§744.11) impose licence " +
        "requirements for specific end-users regardless of ECCN classification.",
      status: "enacted",
      citation: EAR_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference: "15 CFR §738 (Commerce Country Chart); §742; §744; §746",
        notes:
          "Exporters must classify items, check the Commerce Country Chart, " +
          "screen all parties against restricted party lists (Entity List, SDN, " +
          "DPL, Unverified List), and apply for BIS licences where required. " +
          "Licence processing times vary from 30-90 days.",
      },
      {
        jurisdiction: "EU",
        reference: "EU Sanctions Regulations; EU Dual-Use Regulation 2021/821",
        notes:
          "EU maintains parallel sanctions and embargo regimes. EU entities " +
          "re-exporting US-origin items must comply with both EAR (including " +
          "Entity List) and EU export control regulations.",
      },
    ],
    euSpaceActProposal: null,
    category: "export_control",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT-ENCRYPTION — Encryption Export Controls
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "EXPORT-ENCRYPTION",
    source: {
      framework: "ITAR / EAR",
      reference:
        "EAR Part 740.17 (ENC licence exception); ITAR §120.56; Wassenaar Arrangement",
      title: "Encryption export controls for space systems",
      fullText:
        "Encryption technology in space systems is subject to specific export " +
        "controls under both ITAR and EAR. Under EAR, encryption items (ECCN " +
        "5A002, 5D002, 5E002) may qualify for Licence Exception ENC (§740.17) " +
        "which allows export of mass-market encryption, publicly available " +
        "encryption, and certain encryption items after classification review. " +
        "Under ITAR, cryptographic systems specifically designed for military " +
        "or intelligence applications remain controlled under USML Category XIII. " +
        "Space-to-ground and ground-to-space link encryption implementations " +
        "must be evaluated for both ITAR (if integrated into USML items) and " +
        "EAR (if standalone or in EAR-controlled items). The Wassenaar " +
        "Arrangement Category 5 Part 2 provides the international framework " +
        "for cryptography controls.",
      status: "enacted",
      citation: ITAR_CITATION + "; " + EAR_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "US",
        reference:
          "15 CFR §740.17 (ENC); 22 CFR §121.1, Cat. XIII; BIS Encryption FAQ",
        notes:
          "Encryption classification requests (ECCN 5A002/5D002) must be " +
          "submitted to BIS for review before applying Licence Exception ENC. " +
          "ITAR-controlled encryption for defence/intelligence use requires " +
          "DDTC licence. Dual-use encryption in spacecraft may fall under " +
          "either regime depending on integration context.",
      },
      {
        jurisdiction: "EU",
        reference:
          "EU Dual-Use Regulation 2021/821, Annex I (Category 5 Part 2); Wassenaar",
        notes:
          "EU controls encryption items under Category 5 Part 2 of the dual-use " +
          "regulation, with general authorisations available for exports to " +
          "listed countries. EU-US cooperation under Wassenaar aligns many " +
          "encryption control thresholds.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74; Art. 76",
      confidence: "inferred",
      relationship: "new_obligation",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "export_control",
    applicableTo: "all",
    priority: "mandatory",
  },
];

// ─── Accessor Functions ─────────────────────────────────────────────────────

/**
 * Returns all ITAR/EAR export control requirements for space technology.
 */
export function getITAREARRequirements(): EnactedRequirement[] {
  return itarEarRequirements;
}

/**
 * Returns a single ITAR/EAR requirement by its ID, or null if not found.
 *
 * @param id - The requirement identifier (e.g., "ITAR-USML-XV", "EAR-ECCN-9A515")
 */
export function getITAREARRequirementById(
  id: string,
): EnactedRequirement | null {
  return itarEarRequirements.find((r) => r.id === id) ?? null;
}
