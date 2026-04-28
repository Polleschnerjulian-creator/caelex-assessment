/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * FAQ data for each compliance module page.
 * Used with FAQPage JSON-LD schema for search engine rich results.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface ModuleFAQ {
  question: string;
  answer: string;
}

export const MODULE_FAQS: Record<string, ModuleFAQ[]> = {
  authorization: [
    {
      question: "What is space authorization under the EU Space Act?",
      answer:
        "Space authorization is the mandatory approval process required before conducting any space activity in the EU. Under COM(2025) 335, all operators must obtain authorization from their National Competent Authority (NCA) before launch, satellite operations, or providing space services.",
    },
    {
      question: "How long does the authorization process take?",
      answer:
        "Processing times vary by jurisdiction: France (CNES) typically takes 8-16 weeks, Germany (BNetzA) 12-20 weeks, and Luxembourg 6-10 weeks. Starting early and having complete documentation significantly reduces delays.",
    },
    {
      question: "Do I need authorization if I operate from outside the EU?",
      answer:
        "Yes, if you offer space services to EU customers or operate assets that affect EU interests, you may need authorization under the third-country operator provisions of the EU Space Act.",
    },
  ],

  cybersecurity: [
    {
      question: "Does NIS2 apply to space operators?",
      answer:
        "Yes. Space is classified as a high-criticality sector under NIS2 Annex I (Sector 11). Satellite operators, ground station operators, and SATCOM providers serving critical infrastructure are typically classified as essential or important entities.",
    },
    {
      question: "What are the NIS2 incident reporting deadlines?",
      answer:
        "NIS2 requires a 24-hour early warning, 72-hour notification with initial assessment, and a final report within one month of the incident. Space operators must have incident response procedures aligned with these timelines.",
    },
    {
      question: "How does NIS2 overlap with EU Space Act cybersecurity?",
      answer:
        "Articles 74-95 of the EU Space Act establish space-specific cybersecurity requirements that complement NIS2. Operators compliant with NIS2 can leverage their existing measures, potentially saving 3-6 weeks of implementation effort on overlapping requirements.",
    },
  ],

  "debris-mitigation": [
    {
      question: "What is the 25-year rule for space debris?",
      answer:
        "The 25-year rule requires that spacecraft in LEO must deorbit within 25 years after end of mission. The EU Space Act (Art. 58-72) and IADC guidelines enforce this as a mandatory requirement for all LEO operators.",
    },
    {
      question: "What must a Debris Mitigation Plan include?",
      answer:
        "A DMP must cover: end-of-life disposal strategy, collision avoidance capability, passivation measures (fuel venting, battery discharge), trackability requirements, fragmentation risk assessment, and orbit selection justification.",
    },
    {
      question: "Is collision avoidance mandatory?",
      answer:
        "Yes. Under the EU Space Act, all spacecraft operators must demonstrate collision avoidance capability. This includes maneuverability for active satellites and coordination with space surveillance systems.",
    },
  ],

  insurance: [
    {
      question: "What insurance do I need for space operations?",
      answer:
        "EU Space Act Articles 44-51 require third-party liability (TPL) insurance covering damage to persons, property, and the environment. Coverage amounts vary by jurisdiction: France requires a minimum of EUR 60 million, while other jurisdictions have negotiable thresholds based on mission risk.",
    },
    {
      question: "Can I use a financial guarantee instead of insurance?",
      answer:
        "Yes, Articles 47-48 allow alternative financial guarantees such as bank guarantees, letters of credit, or government-backed deposits. The guarantee must cover the same liability as traditional insurance.",
    },
    {
      question: "Does insurance need to cover the full mission duration?",
      answer:
        "Yes, TPL coverage must be maintained from launch through end-of-life disposal, including the deorbiting phase. Some jurisdictions require post-mission coverage for a specified period.",
    },
  ],

  nis2: [
    {
      question: "Am I an essential or important entity under NIS2?",
      answer:
        "Classification depends on your size and role: Large entities (more than 250 employees or more than EUR 50M turnover) in the space sector are typically essential. Medium entities or SATCOM providers for government or critical infrastructure are important. Micro entities (fewer than 10 employees, less than EUR 2M turnover) are generally out of scope unless designated by a member state.",
    },
    {
      question: "What security measures does NIS2 require?",
      answer:
        "Article 21(2) requires: risk analysis policies, incident handling procedures, business continuity, supply chain security, vulnerability management, cryptographic controls, access control, and personnel security training.",
    },
    {
      question: "What are the penalties for NIS2 non-compliance?",
      answer:
        "Essential entities face fines up to EUR 10M or 2% of global annual turnover. Important entities face fines up to EUR 7M or 1.4% of turnover. Member states may also impose additional administrative sanctions.",
    },
  ],

  environmental: [
    {
      question: "What is an Environmental Footprint Declaration?",
      answer:
        "The EFD (Art. 96-100) requires operators to declare the environmental impact of their space activities, including lifecycle assessment of the spacecraft, atmospheric pollution from launch and re-entry, and light pollution from satellite constellations.",
    },
    {
      question: "When is the EFD deadline?",
      answer:
        "The Environmental Footprint Declaration requirement takes effect December 31, 2031, as part of the EU Space Act implementation timeline.",
    },
    {
      question: "Does the EFD apply to all operators?",
      answer:
        "The EFD applies to all operators under the standard regime. Operators in the light regime (small enterprises, research institutions) may have simplified requirements.",
    },
  ],

  supervision: [
    {
      question: "What ongoing reporting is required?",
      answer:
        "Operators must submit regular compliance reports to their NCA, report any incidents within the NIS2 timelines, maintain audit trails, and provide updates on spacecraft status including orbital parameters and operational changes.",
    },
    {
      question: "How often are compliance audits conducted?",
      answer:
        "NCAs conduct supervisory reviews at intervals determined by the operator's risk profile. Essential entities under NIS2 face proactive supervision, while important entities are subject to reactive supervision based on incidents or complaints.",
    },
    {
      question: "What happens during an NCA inspection?",
      answer:
        "NCA inspections may include review of compliance documentation, technical audits of ground systems, cybersecurity assessments, verification of insurance coverage, and review of debris mitigation measures.",
    },
  ],
};
