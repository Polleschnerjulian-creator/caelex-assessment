// ============================================================================
// FAQ DATA - Comprehensive Space Compliance FAQs
// ============================================================================

import { additionalFaqs } from "./additional-faqs";

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category:
    | "eu-space-act"
    | "nis2"
    | "licensing"
    | "compliance"
    | "platform"
    | "technical";
}

export const faqs: FAQ[] = [
  // ============================================================================
  // EU SPACE ACT FAQs
  // ============================================================================
  {
    id: "what-is-eu-space-act",
    question: "What is the EU Space Act and when does it take effect?",
    answer:
      "The EU Space Act (COM(2025) 335) is the European Union's comprehensive regulation establishing a unified legal framework for space activities across all EU member states. It covers authorization, registration, supervision, and liability for space operations. The regulation enters into force in 2025, with existing operators required to achieve full compliance by 2030. It replaces the fragmented national space laws with a harmonized European approach.",
    category: "eu-space-act",
  },
  {
    id: "who-needs-authorization",
    question: "Who needs authorization under the EU Space Act?",
    answer:
      "All entities conducting space activities under EU jurisdiction require authorization. This includes Spacecraft Operators (SCO), Launch Operators (LO), Launch Site Operators (LSO), In-Space Service Operators (ISOS), Collision Avoidance Providers (CAP), Positional Data Providers (PDP), and Third Country Operators (TCO) using EU infrastructure or serving EU customers. The authorization is obtained from your National Competent Authority (NCA) and is valid across all EU member states.",
    category: "eu-space-act",
  },
  {
    id: "light-regime-eligibility",
    question: "What is the Light Regime and who qualifies for it?",
    answer:
      "The Light Regime is a simplified authorization pathway for low-risk space activities. You may qualify if your satellite mass is under 500 kg, you operate in LEO (below 2,000 km altitude), your mission duration is under 5 years, and you don't involve nuclear power sources, propulsive stages, or proximity operations. The Light Regime offers reduced documentation requirements, faster 45-day processing (vs. 90 days standard), and lower insurance minimums. CubeSat operators, university missions, and technology demonstrators often qualify.",
    category: "eu-space-act",
  },
  {
    id: "eu-space-act-penalties",
    question:
      "What are the penalties for non-compliance with the EU Space Act?",
    answer:
      "Non-compliance with the EU Space Act can result in administrative fines up to €20 million or 4% of annual global turnover, whichever is higher. Additional consequences include authorization suspension or revocation, prohibition from conducting space activities, mandatory corrective actions, and potential criminal liability for willful violations. NCAs can also impose periodic penalty payments for ongoing non-compliance.",
    category: "eu-space-act",
  },
  {
    id: "authorization-timeline",
    question: "How long does the authorization process take?",
    answer:
      "Standard authorization applications must be processed within 90 days by the NCA. Light Regime applications have a 45-day timeline. Complex cases involving novel technologies or higher risk profiles may extend to 180 days. To expedite the process, ensure your application is complete with all required documentation: technical specifications, debris mitigation plan, insurance certificates, cybersecurity assessment, and financial capability proof.",
    category: "eu-space-act",
  },
  {
    id: "mutual-recognition",
    question:
      "Does an EU Space Act authorization work across all EU countries?",
    answer:
      "Yes, the EU Space Act establishes mutual recognition of authorizations. An authorization granted by one EU member state's NCA is valid across all EU member states. This enables true single market access for space operators, eliminating the need for multiple national authorizations. You only need to apply once through your designated NCA.",
    category: "eu-space-act",
  },
  {
    id: "existing-operators-transition",
    question:
      "How do existing space operators transition to EU Space Act compliance?",
    answer:
      "Existing operators have a transition period until 2030 to achieve full compliance. During this period, you should: (1) Register your existing space objects in the EU Space Registry, (2) Update your debris mitigation plans to meet the new 5-year deorbit requirement, (3) Implement required cybersecurity measures, (4) Obtain compliant insurance coverage, and (5) Submit authorization applications for ongoing operations. Early engagement with your NCA is recommended.",
    category: "eu-space-act",
  },

  // ============================================================================
  // NIS2 FAQs
  // ============================================================================
  {
    id: "nis2-space-applicability",
    question: "Does NIS2 apply to space operators?",
    answer:
      "Yes, the NIS2 Directive (EU 2022/2555) explicitly includes space as a critical infrastructure sector. Space operators may be classified as Essential Entities (large operators, critical services) or Important Entities (medium-sized operators). Covered activities include satellite communications, ground station operations, space data services, and launch services with digital dependencies. Space operators must implement cybersecurity risk management measures and report significant incidents.",
    category: "nis2",
  },
  {
    id: "nis2-incident-reporting",
    question:
      "What are the NIS2 incident reporting requirements for space operators?",
    answer:
      "Under NIS2, space operators must report significant cybersecurity incidents following strict timelines: Early warning within 24 hours of detection, Incident notification within 72 hours with initial assessment, Intermediate report if requested by authorities, and Final report within 1 month including root cause analysis and remediation measures. Reports go to your national CSIRT (Computer Security Incident Response Team).",
    category: "nis2",
  },
  {
    id: "nis2-essential-vs-important",
    question:
      "What's the difference between Essential and Important entities under NIS2?",
    answer:
      "Essential Entities face stricter requirements: proactive supervision, regular audits, and fines up to €10 million or 2% of global turnover. They include large space operators (250+ employees or €50M+ turnover) and critical infrastructure providers. Important Entities have reactive supervision (triggered by incidents) and lower fines up to €7 million or 1.4% of turnover. They include medium-sized operators (50-249 employees, €10-50M turnover).",
    category: "nis2",
  },
  {
    id: "nis2-security-measures",
    question:
      "What cybersecurity measures does NIS2 require for space operators?",
    answer:
      "NIS2 Article 21 requires comprehensive security measures: risk analysis and security policies, incident handling procedures, business continuity and crisis management, supply chain security assessment, security in network and system acquisition, vulnerability handling and disclosure, cybersecurity training and awareness, cryptography and encryption policies, access control and asset management, and multi-factor authentication where appropriate.",
    category: "nis2",
  },
  {
    id: "nis2-supply-chain",
    question: "What are NIS2 supply chain security requirements?",
    answer:
      "NIS2 requires space operators to address supply chain risks by: identifying and assessing supplier security capabilities, including security requirements in contracts, monitoring ongoing supplier compliance, ensuring subcontractor transparency, implementing component traceability, and having incident notification obligations with suppliers. This is particularly important for space systems given the long supply chains and critical nature of components.",
    category: "nis2",
  },

  // ============================================================================
  // LICENSING & AUTHORIZATION FAQs
  // ============================================================================
  {
    id: "which-jurisdiction",
    question: "Which jurisdiction should I choose for my space license?",
    answer:
      "Jurisdiction choice depends on several factors: processing time (Luxembourg and UK are typically fastest), fee structure (varies significantly), insurance minimums (range from €5M to €60M+), language requirements, and regulatory expertise. Key considerations include where your company is incorporated, where you plan to launch from, and your operational requirements. Our platform compares 11 jurisdictions to help you find the optimal choice.",
    category: "licensing",
  },
  {
    id: "insurance-requirements",
    question: "What insurance coverage do I need for space operations?",
    answer:
      "Insurance requirements vary by jurisdiction and mission type. EU Space Act mandates third-party liability insurance covering: property damage, personal injury, environmental damage, launch phase, in-orbit operations, and re-entry phase. Typical minimums range from €60 million for standard missions to €500 million for high-risk operations. Light Regime missions have reduced requirements. Coverage must be from approved insurers with EU law jurisdiction clauses.",
    category: "licensing",
  },
  {
    id: "registration-requirements",
    question: "How do I register my satellite with the EU Space Registry?",
    answer:
      "Registration involves submitting to the EU Space Registry (managed by EUSPA): space object designator/name, launching state and operator details, date and location of launch, basic orbital parameters, general function and purpose, operational status, and liability/insurance information. Registration must occur before launch for new missions. The EU coordinates submissions to the UN Register of Objects Launched into Outer Space.",
    category: "licensing",
  },
  {
    id: "frequency-coordination",
    question: "How does frequency coordination work for satellites?",
    answer:
      "Frequency coordination is managed through the ITU (International Telecommunication Union). The process involves: Advance Publication Information (API) as initial notification, Coordination Request with detailed technical parameters, Coordination Negotiations to resolve potential interference, Notification for formal registration, and Bringing into Use confirmation. This process can take 2-7 years depending on the orbital regime and potential interference issues. Your authorization cannot proceed without valid frequency assignments.",
    category: "licensing",
  },
  {
    id: "third-country-operators",
    question: "Can non-EU companies operate under EU Space Act?",
    answer:
      "Yes, Third Country Operators (TCOs) can obtain EU authorization if they: use EU launch facilities, operate ground stations in the EU, provide services to EU customers, or conduct activities affecting EU space assets. TCOs must designate an EU-based representative, submit equivalent documentation, demonstrate compliance with EU standards, and maintain EU-accessible insurance. The EU may recognize equivalent third-country regulatory regimes through bilateral agreements.",
    category: "licensing",
  },

  // ============================================================================
  // TECHNICAL COMPLIANCE FAQs
  // ============================================================================
  {
    id: "debris-mitigation-requirements",
    question: "What are the EU Space Act debris mitigation requirements?",
    answer:
      "The EU Space Act incorporates and strengthens IADC guidelines: LEO spacecraft must deorbit within 5 years post-mission (stricter than the IADC 25-year guideline), GEO spacecraft must insert into graveyard orbit 300+ km above GEO, all spacecraft must passivate at end-of-life (deplete propellant, discharge batteries, vent pressure vessels), design for demise is encouraged for uncontrolled re-entries, and collision avoidance capability is mandatory. Detailed debris mitigation plans must be submitted with authorization applications.",
    category: "technical",
  },
  {
    id: "deorbit-plan",
    question: "What must a deorbit plan include?",
    answer:
      "A compliant deorbit plan must include: orbital lifetime analysis showing natural decay timeline, disposal method selection (controlled vs. uncontrolled re-entry), propellant budget allocation for deorbit maneuver, timeline for end-of-life operations, passivation procedures for all energy sources, contingency procedures for system failures, casualty risk assessment for uncontrolled re-entry (must be <10⁻⁴), and verification method for successful disposal.",
    category: "technical",
  },
  {
    id: "collision-avoidance",
    question: "What collision avoidance capabilities are required?",
    answer:
      "Operators must maintain collision avoidance capability including: ability to receive and process Conjunction Data Messages (CDMs), maneuver capability to avoid predicted collisions, participation in SSA data sharing programs, response to conjunction warnings within required timeframes, reporting of avoidance maneuvers to NCAs, and coordination with other operators when possible. Conjunction assessment services are available through EU SST and commercial providers.",
    category: "technical",
  },
  {
    id: "passivation",
    question: "What does spacecraft passivation involve?",
    answer:
      "Passivation eliminates explosion risk from decommissioned spacecraft by addressing all energy sources: propellant must be vented or burned, batteries must be discharged and disconnected, pressure vessels must be vented, reaction wheels must be spun down, and solar arrays should be disconnected from the bus. Passivation should occur after final mission operations while ground contact is reliable, and must be documented and reported to your NCA.",
    category: "technical",
  },
  {
    id: "cubesat-compliance",
    question: "Do CubeSats need to comply with EU Space Act?",
    answer:
      "Yes, CubeSats must comply but typically qualify for Light Regime authorization due to their small size and lower risk profile. Requirements include: authorization from NCA (simplified process), registration in EU Space Registry, debris mitigation plan showing <5 year orbital lifetime, basic insurance coverage (reduced minimums), and trackability considerations. Deployable drag devices may be needed for higher orbits. University missions may have additional exemptions.",
    category: "technical",
  },

  // ============================================================================
  // PLATFORM FAQs
  // ============================================================================
  {
    id: "what-is-caelex",
    question: "What is Caelex and how does it help with space compliance?",
    answer:
      "Caelex is a comprehensive space compliance platform that helps satellite operators, launch providers, and space service companies navigate EU Space Act, NIS2, and national space laws. The platform features: AI-powered compliance assessment, 12 specialized compliance modules, coverage of 11 European jurisdictions, document management and deadline tracking, automated reporting, and expert guidance through ASTRA AI. We simplify complex regulations into actionable compliance roadmaps.",
    category: "platform",
  },
  {
    id: "compliance-assessment",
    question: "How does the Caelex compliance assessment work?",
    answer:
      "Our assessment takes 5-10 minutes and asks 8 key questions about your organization and mission. Based on your answers, we determine: which EU Space Act articles apply to you, your NIS2 classification (Essential, Important, or out-of-scope), which compliance modules you need, applicable national space laws, required documentation, and timeline to compliance. You receive a personalized compliance profile with actionable recommendations.",
    category: "platform",
  },
  {
    id: "astra-ai",
    question: "What can ASTRA AI help me with?",
    answer:
      "ASTRA is our AI compliance agent with 22+ specialized tools for space regulation questions. ASTRA can: search EU Space Act articles by topic, explain NIS2 requirements for your situation, compare national space laws across jurisdictions, help draft compliance documentation, calculate regulatory deadlines, identify applicable requirements for your operator type, and answer complex regulatory questions instantly. ASTRA is trained on the full EU Space Act, NIS2, and national space laws.",
    category: "platform",
  },
  {
    id: "compliance-modules",
    question: "What compliance modules does Caelex offer?",
    answer:
      "Caelex offers 12 compliance modules: Authorization (licensing process), Registration (EU Space Registry), Cybersecurity (NIS2 compliance), Debris Mitigation (end-of-life planning), Environmental (sustainability requirements), Insurance (coverage requirements), Supervision (ongoing compliance), Export Control (ITAR/EAR), Spectrum (ITU coordination), COPUOS (UN guidelines), US Regulatory (FCC/FAA/NOAA), and UK Space (post-Brexit requirements). Each module provides checklists, documentation templates, and progress tracking.",
    category: "platform",
  },
  {
    id: "jurisdiction-comparison",
    question: "How do I compare jurisdictions on Caelex?",
    answer:
      "Our jurisdiction comparison feature analyzes 11 European space jurisdictions across key factors: authorization processing time, fee structure, insurance minimums, language requirements, regulatory expertise, EU Space Act alignment, and track record. We score each jurisdiction's favorability for different mission types and provide recommendations based on your specific requirements. Covered jurisdictions include France, UK, Germany, Luxembourg, Netherlands, Belgium, Austria, Denmark, Italy, Norway, and the EU framework.",
    category: "platform",
  },
  {
    id: "pricing-plans",
    question: "What pricing plans does Caelex offer?",
    answer:
      "Caelex offers flexible pricing for operators of all sizes: Starter (free compliance assessment and basic resources), Professional (full module access, document management, deadline tracking), Enterprise (unlimited users, custom integrations, dedicated support, SSO). All plans include ASTRA AI access. Contact us for custom pricing for large constellations or government organizations. We offer monthly and annual billing with discounts for annual commitments.",
    category: "platform",
  },

  // ============================================================================
  // ADDITIONAL TECHNICAL FAQs
  // ============================================================================
  {
    id: "space-situational-awareness",
    question: "What is Space Situational Awareness and why does it matter?",
    answer:
      "Space Situational Awareness (SSA) is the comprehensive knowledge of the space environment including tracking of space objects, space weather monitoring, and near-Earth object surveillance. For operators, SSA is critical for: collision avoidance, regulatory compliance (participation required under EU Space Act), launch window planning, anomaly detection, and re-entry prediction. The EU operates an SST (Space Surveillance and Tracking) programme providing these services to European operators.",
    category: "technical",
  },
  {
    id: "leo-meo-geo-requirements",
    question: "How do requirements differ for LEO, MEO, and GEO operations?",
    answer:
      "Requirements vary by orbital regime: LEO (160-2,000 km) has the strictest debris rules with 5-year post-mission deorbit requirement, highest conjunction risk, and most trackability requirements. MEO (2,000-35,786 km) has case-by-case disposal assessment, lower debris density, but longer orbital lifetimes. GEO (~35,786 km) requires graveyard orbit insertion 300+ km above GEO, slot coordination through ITU, and station-keeping capability. Insurance and authorization complexity also varies by orbit.",
    category: "technical",
  },
  {
    id: "in-orbit-servicing",
    question: "What are the regulatory requirements for in-orbit servicing?",
    answer:
      "In-Space Service Operators (ISOS) face unique requirements under EU Space Act: enhanced debris mitigation obligations, special insurance minimums covering third-party spacecraft, coordination protocols with client operators, authorization for proximity operations, liability allocation agreements for end-of-life responsibility, and additional cybersecurity measures for cross-spacecraft communications. The regulatory framework for ISOS is still evolving as this market develops.",
    category: "technical",
  },
  {
    id: "active-debris-removal",
    question: "How is Active Debris Removal regulated?",
    answer:
      "Active Debris Removal (ADR) operations fall under ISOS regulation with additional considerations: ownership/jurisdiction questions over debris objects, authorization requirements for capture and deorbit operations, liability for removal attempts (what if capture fails?), international coordination requirements, and technology demonstration approvals. The EU Space Act includes provisions encouraging ADR development while establishing safety standards. Several European companies are pioneering this market.",
    category: "technical",
  },
  {
    id: "mega-constellation-compliance",
    question: "What special requirements apply to mega-constellations?",
    answer:
      "Large constellations face additional scrutiny: comprehensive spectrum coordination for thousands of satellites, cumulative debris risk assessment across the constellation, coordinated collision avoidance procedures, phased deployment authorization, fleet-wide insurance considerations, enhanced cybersecurity for networked systems, and environmental impact assessment for atmospheric effects. Regulators are developing specific guidelines for constellation operators given the scale of impact on the orbital environment.",
    category: "technical",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const allFaqs = [...faqs, ...additionalFaqs];

export function getAllFaqs(): FAQ[] {
  return allFaqs;
}

export function getFaqsByCategory(category: FAQ["category"]): FAQ[] {
  return allFaqs.filter((faq) => faq.category === category);
}

export function getFaqById(id: string): FAQ | undefined {
  return allFaqs.find((faq) => faq.id === id);
}

export function getAllCategories(): FAQ["category"][] {
  return [
    "eu-space-act",
    "nis2",
    "licensing",
    "compliance",
    "platform",
    "technical",
  ];
}

export function getCategoryLabel(category: FAQ["category"]): string {
  const labels: Record<FAQ["category"], string> = {
    "eu-space-act": "EU Space Act",
    nis2: "NIS2 Directive",
    licensing: "Licensing & Authorization",
    compliance: "Compliance",
    platform: "Caelex Platform",
    technical: "Technical Requirements",
  };
  return labels[category];
}

export function searchFaqs(query: string): FAQ[] {
  const lowerQuery = query.toLowerCase();
  return allFaqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(lowerQuery) ||
      faq.answer.toLowerCase().includes(lowerQuery),
  );
}
