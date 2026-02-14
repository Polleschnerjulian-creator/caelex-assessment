// ============================================================================
// ADDITIONAL FAQ DATA - Extended Coverage
// ============================================================================

import { FAQ } from "./faqs";

export const additionalFaqs: FAQ[] = [
  // ============================================================================
  // EU SPACE ACT - Additional
  // ============================================================================
  {
    id: "eu-space-act-vs-national-laws",
    question: "How does the EU Space Act interact with national space laws?",
    answer:
      "The EU Space Act sets minimum standards that all member states must implement, but national space laws are not fully replaced. Member states may maintain stricter requirements in certain areas. The Act establishes mutual recognition, meaning authorization from one NCA is valid across all EU member states. For matters outside EU scope (certain national security aspects, some data controls like Germany's SatDSiG), national laws continue to apply. This creates a harmonized baseline with room for national specialization.",
    category: "eu-space-act",
  },
  {
    id: "eu-space-registry-purpose",
    question: "What is the EU Space Registry and what must be registered?",
    answer:
      "The EU Space Registry is a centralized database of all authorized space objects and their operators. Registration is mandatory for all EU-authorized space activities. Required information includes: space object identifiers, launch date and vehicle, orbital parameters, mission description, operator details, and contact information. Operators must update registrations within 14 days of material changes, confirm annual status, and notify of end-of-life initiation. The Registry integrates with the UN Register of Space Objects for international coordination.",
    category: "eu-space-act",
  },
  {
    id: "third-country-operator-requirements",
    question:
      "I'm based outside the EU. When do I need EU Space Act authorization?",
    answer:
      "Third Country Operators (TCOs) need EU authorization when: launching from EU territory, returning space objects to EU territory, operating ground stations in the EU for spacecraft command, providing space services to EU customers as a primary market, or receiving EU government contracts. TCOs receive equivalent treatment to EU operators but must designate an EU-based representative. If your primary market is EU-based or you use EU infrastructure significantly, you likely need authorization.",
    category: "eu-space-act",
  },

  // ============================================================================
  // NIS2 - Additional
  // ============================================================================
  {
    id: "nis2-essential-vs-important",
    question:
      "What's the difference between essential and important entities under NIS2?",
    answer:
      "Essential entities face stricter requirements and higher penalties. For space operators, essential entities typically include: satellite communication system operators, critical ground infrastructure, launch service providers supporting government operations, and space situational awareness providers. Important entities include Earth observation providers, satellite manufacturing, and space data services at significant scale. Essential entity penalties reach EUR 10 million or 2% of turnover, while important entity penalties cap at EUR 7 million or 1.4% of turnover.",
    category: "nis2",
  },
  {
    id: "nis2-supply-chain-requirements",
    question: "What are the NIS2 supply chain security requirements?",
    answer:
      "NIS2 Article 21(2)(d) mandates supply chain security. For space operators, this means: assessing security of direct suppliers and service providers, incorporating security requirements into procurement contracts, verifying component authenticity (especially for spacecraft hardware), managing ITAR/EAR compliance integration, evaluating launch service provider security practices, and considering geographic supply chain risks. Organizations must document their supply chain security approach and conduct periodic reviews of supplier security posture.",
    category: "nis2",
  },
  {
    id: "nis2-cross-border-incidents",
    question: "How do I report incidents that affect multiple countries?",
    answer:
      "For cross-border incidents, report to your primary NCA (where you're established) within the standard timeline (24h early warning, 72h notification). Include cross-border impact assessment identifying affected countries. Your NCA coordinates with other affected NCAs through the EU cybersecurity network. For space systems, cross-border impact is common (satellite coverage spans multiple countries), so include this analysis in your incident response procedures. Consider service-level impacts, not just technical impacts.",
    category: "nis2",
  },

  // ============================================================================
  // LICENSING - Additional
  // ============================================================================
  {
    id: "authorization-timeline",
    question: "How long does the authorization process take?",
    answer:
      "Standard regime authorization takes approximately 90 days from complete application submission. Light regime applications target 45 days. However, actual timelines depend on: application completeness (incomplete applications pause the clock), complexity of the mission, NCA workload, need for clarifications or additional information, and coordination with other authorities. Pre-application engagement with your NCA typically adds 2-4 weeks but significantly improves success rates. Plan for 4-6 months from first contact to authorization.",
    category: "licensing",
  },
  {
    id: "authorization-transfer",
    question: "Can I transfer my authorization to another entity?",
    answer:
      "Yes, authorizations are transferable with NCA approval. The process requires: joint application from transferor and transferee, demonstration that the transferee meets all qualification requirements, evidence of adequate financial capacity and insurance, updated organizational and technical documentation, and verification of ongoing compliance capability. Processing typically takes 30-60 days. The transfer becomes effective upon NCA written approval. Unauthorized transfers can result in authorization revocation.",
    category: "licensing",
  },
  {
    id: "multiple-spacecraft-authorization",
    question:
      "Do I need separate authorization for each satellite in a constellation?",
    answer:
      "Not necessarily. The EU Space Act allows constellation-level authorization for homogeneous fleets. Your application can cover multiple spacecraft of the same type operating in similar orbits. Requirements include: type approval for the spacecraft design, constellation-wide debris mitigation assessment, aggregated insurance consideration, phased deployment plan, and fleet management procedures. Individual satellites are registered separately in the EU Space Registry, but operational authorization can be consolidated.",
    category: "licensing",
  },

  // ============================================================================
  // COMPLIANCE - Additional
  // ============================================================================
  {
    id: "compliance-transition-timeline",
    question: "I'm an existing operator. What's my compliance timeline?",
    answer:
      "Existing operators have until 2030 for full EU Space Act compliance. Recommended phased approach: 2025-2026 assess current status, identify gaps, engage with NCA; 2026-2027 implement technical measures (debris mitigation, cybersecurity); 2027-2028 formalize documentation, complete authorization application; 2028-2029 NCA review, address any issues; 2030 achieve full compliance. New missions after regulation entry into force must comply immediately. Don't wait until 2030 - NCAs will be overwhelmed with applications.",
    category: "compliance",
  },
  {
    id: "compliance-ongoing-obligations",
    question:
      "What are the ongoing compliance obligations after authorization?",
    answer:
      "Post-authorization obligations include: annual status reporting to your NCA, registration updates within 14 days of changes, anomaly and incident reporting (immediately for significant events), collision avoidance participation and response, cybersecurity maintenance and updates (NIS2 entities), insurance coverage maintenance, and NCA inspections/audits. You must also notify of any changes to mission parameters, organizational structure, or technical configuration that affect authorization conditions.",
    category: "compliance",
  },
  {
    id: "compliance-audit-preparation",
    question: "How should I prepare for NCA compliance audits?",
    answer:
      "NCA audits examine: authorization condition adherence, technical compliance (debris, cybersecurity), documentation currency, incident response capability, and organizational changes. Preparation includes: maintaining up-to-date compliance documentation, conducting internal audits annually, ensuring staff understand obligations, testing incident response procedures, verifying insurance remains adequate, and documenting all operational decisions. Designate a compliance contact who can coordinate with auditors and access all relevant documentation.",
    category: "compliance",
  },

  // ============================================================================
  // PLATFORM - Additional
  // ============================================================================
  {
    id: "caelex-integration",
    question: "Does Caelex integrate with other systems?",
    answer:
      "Caelex provides API access (v1) for integration with: flight dynamics systems (orbital data import), ground segment software (operational status), document management systems (compliance documentation), GRC platforms (governance integration), and incident management tools (NIS2 reporting). Our API supports standard formats including CCSDS for orbital data. Enterprise customers can configure custom integrations. Contact us for specific integration requirements.",
    category: "platform",
  },
  {
    id: "caelex-multi-mission",
    question: "Can Caelex manage multiple missions or constellations?",
    answer:
      "Yes, Caelex supports multi-mission and constellation management. Features include: organization-level compliance dashboards, mission-specific tracking and deadlines, fleet-wide reporting capabilities, shared documentation libraries, role-based access across missions, and consolidated regulatory timeline view. Enterprise plans include advanced multi-mission features including constellation-level compliance assessment and aggregated reporting.",
    category: "platform",
  },

  // ============================================================================
  // TECHNICAL - Additional
  // ============================================================================
  {
    id: "trackability-requirements",
    question: "What are the trackability requirements for spacecraft?",
    answer:
      "The EU Space Act requires demonstration that your spacecraft can be tracked by ground-based systems. Requirements include: sufficient radar cross-section or optical signature, consideration of tracking aids (corner reflectors, laser retroreflectors), registration in tracking catalogs, sharing of orbital data with EU SST, and unique identification capability. Small satellites (under 10cm) may need tracking aids. Your debris mitigation plan must address trackability throughout the mission lifecycle.",
    category: "technical",
  },
  {
    id: "design-for-demise",
    question: "What is design for demise and when is it required?",
    answer:
      "Design for demise (D4D) means designing spacecraft to fully break apart and burn up during atmospheric re-entry, minimizing casualty risk on ground. Required when: controlled re-entry isn't feasible, spacecraft has significant re-entry mass, or when materials might survive re-entry. D4D involves: using demisable materials, avoiding high-melting-point components where possible, structural design for early break-up, and assessment of ground casualty risk (must be below 1:10,000). Document D4D analysis in your debris mitigation plan.",
    category: "technical",
  },
  {
    id: "propulsion-requirements",
    question: "Do I need propulsion on my spacecraft?",
    answer:
      "Propulsion is not universally required, but may be necessary depending on: orbit selection (high LEO may require active deorbit), collision avoidance obligations (must be able to respond to conjunction warnings), mission profile (station-keeping needs), and end-of-life disposal strategy. For light regime missions, passive deorbit via natural drag may be acceptable if orbital lifetime is under 5 years. If your orbit doesn't naturally decay within 5 years, you need either propulsion or a demonstrated passive deorbit device.",
    category: "technical",
  },
  {
    id: "space-weather-considerations",
    question: "How does space weather affect compliance requirements?",
    answer:
      "Space weather impacts compliance in several ways: orbital lifetime calculations must account for solar activity effects on atmospheric drag; radiation environment affects spacecraft design requirements; geomagnetic storms can affect conjunction assessment accuracy; and solar events may require operational responses. Your orbital analysis should use appropriate solar activity models. Cybersecurity measures should account for space weather effects on communications. Consider space weather in your continuity planning.",
    category: "technical",
  },
  {
    id: "hosted-payload-authorization",
    question:
      "How is authorization handled for hosted payloads on another operator's spacecraft?",
    answer:
      "Hosted payloads typically require separate authorization from the host spacecraft. The host operator is authorized for spacecraft operation, while the payload operator needs authorization for their specific activities (e.g., Earth observation, communications). Both operators must coordinate on: liability allocation, insurance coverage, frequency coordination, cybersecurity responsibilities, and end-of-life procedures. Document the relationship in both authorization applications. Some NCAs allow streamlined processes for hosted payload authorization.",
    category: "technical",
  },
];

// Export function
export function getAdditionalFaqs(): FAQ[] {
  return additionalFaqs;
}
