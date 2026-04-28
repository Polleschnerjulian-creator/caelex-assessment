/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Academy course definitions for the compliance training platform.
 * Contains 6 courses covering EU Space Act (COM(2025) 335), NIS2 (EU 2022/2555),
 * national space laws, cross-regulatory compliance, debris mitigation, and
 * advanced compliance strategies.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ───

export interface CourseDefinition {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  category: string;
  level: string;
  estimatedMinutes: number;
  isPublished: boolean;
  isPremium: boolean;
  sortOrder: number;
  tags: string[];
  relatedComplianceModules: string[];
  modules: ModuleDefinition[];
}

export interface ModuleDefinition {
  title: string;
  description: string;
  sortOrder: number;
  lessons: LessonDefinition[];
}

export interface LessonDefinition {
  slug: string;
  title: string;
  type: string;
  sortOrder: number;
  estimatedMinutes: number;
  content?: Record<string, unknown>;
  questions?: QuestionDefinition[];
}

export interface QuestionDefinition {
  sortOrder: number;
  questionText: string;
  questionType: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  hint?: string;
  relatedArticles?: string[];
}

// ─── Course Definitions ───

export const ACADEMY_COURSES: CourseDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // Course 1: EU Space Act Fundamentals
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: "eu-space-act-fundamentals",
    title: "EU Space Act Fundamentals",
    subtitle: "Master the foundational principles of EU space regulation",
    description:
      "A comprehensive introduction to the EU Space Act (COM(2025) 335) covering its scope, operator classification system, authorization framework, and ongoing obligations. This course provides the essential regulatory knowledge every space industry professional needs to navigate the new EU space regulatory landscape.",
    icon: "BookOpen",
    category: "EU_SPACE_ACT",
    level: "BEGINNER",
    estimatedMinutes: 120,
    isPublished: true,
    isPremium: false,
    sortOrder: 1,
    tags: ["eu-space-act", "regulation", "fundamentals"],
    relatedComplianceModules: ["authorization", "registration"],
    modules: [
      // ── Module 1: Introduction to the EU Space Act ──
      {
        title: "Introduction to the EU Space Act",
        description:
          "Understand the purpose, legal basis, and structure of the EU Space Act regulation (COM(2025) 335) and how it creates a harmonized European space regulatory framework.",
        sortOrder: 1,
        lessons: [
          {
            slug: "what-is-com-2025-335",
            title: "What is COM(2025) 335?",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "The EU Space Act: A New Regulatory Era",
                  paragraphs: [
                    "The EU Space Act, formally known as COM(2025) 335, represents the first comprehensive EU-level regulatory framework for space activities. Proposed by the European Commission, it aims to create a harmonized set of rules governing the authorization, supervision, and safety of space operations conducted by entities established in or providing services to the European Union.",
                    "Prior to this regulation, space activities within the EU were governed by a patchwork of national space laws that varied significantly across Member States. France enacted its Loi relative aux operations spatiales (LOS) in 2008, Belgium adopted its space law in 2005, and several other Member States have their own frameworks. This fragmentation created regulatory arbitrage opportunities, inconsistent safety standards, and barriers to the single market for space services.",
                    "The EU Space Act addresses this by establishing uniform requirements for operator authorization, space object registration, debris mitigation, cybersecurity, insurance, environmental obligations, and supervisory mechanisms. It builds upon the EU's existing competence in space affairs established by Article 189 TFEU and the EU Space Programme Regulation (2021/696).",
                  ],
                  keyPoints: [
                    "COM(2025) 335 is the first EU-level comprehensive space activities regulation",
                    "It harmonizes the fragmented landscape of national space laws across Member States",
                    "Legal basis: Article 189 TFEU (space policy) and internal market harmonization provisions",
                    "Covers authorization, registration, safety, cybersecurity, insurance, debris, and environmental obligations",
                  ],
                },
                {
                  heading: "Structure of the Regulation",
                  paragraphs: [
                    "The EU Space Act is organized into several titles covering distinct regulatory domains. Title I (Art. 1-5) establishes the subject matter, scope, and definitions. Title II (Art. 6-16) sets out the authorization framework including operator types, regime determination, and the application process. Title III (Art. 17-25) addresses the Union Register of Space Objects (URSO) and registration obligations.",
                    "Title IV (Art. 26-31) establishes the supervisory framework including NCA powers, inspections, and enforcement. Title V (Art. 32-43) covers launch safety and range operations. Title VI (Art. 44-57) addresses liability, insurance, and space situational awareness. Title VII (Art. 58-73) establishes debris mitigation and space sustainability requirements. Title VIII (Art. 74-95) covers cybersecurity requirements with explicit cross-references to NIS2 (EU 2022/2555). Title IX (Art. 96-103) addresses environmental footprint and launch environmental obligations. Title X (Art. 104-119) contains enforcement, delegated acts, transitional, and final provisions.",
                  ],
                  keyPoints: [
                    "Title I (Art. 1-5): Scope and definitions",
                    "Title II (Art. 6-16): Authorization framework",
                    "Title III (Art. 17-25): Registration (URSO)",
                    "Title IV (Art. 26-31): Supervision and enforcement",
                    "Titles V-IX: Launch safety, liability, debris, cybersecurity, environment",
                    "Title X (Art. 104-119): Enforcement, delegated acts, transitional provisions",
                  ],
                },
              ],
            },
          },
          {
            slug: "scope-and-territorial-application",
            title: "Scope & Territorial Application",
            type: "THEORY",
            sortOrder: 2,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading: "Who Does the EU Space Act Apply To?",
                  paragraphs: [
                    "Art. 2 defines the scope of the regulation with both a territorial and an extraterritorial dimension. The regulation applies to any natural or legal person that carries out space activities or provides space-based services, where the operator is: (a) established in a Member State, (b) established in a third country but carrying out space activities from the territory of a Member State, or (c) established in a third country but providing space-based services to natural or legal persons in the Union.",
                    "This extraterritorial reach is significant. It means that a satellite operator headquartered in Singapore, the United States, or any other third country that provides broadband, Earth observation, or other space-based services to customers in the EU falls within the regulation's scope under Art. 8 (third-country operator provisions). This approach mirrors the extraterritorial principles established in GDPR and NIS2.",
                    "The regulation excludes certain activities from its scope under Art. 3: purely military space operations conducted exclusively for national defence purposes, and activities already fully regulated under the EU Space Programme Regulation (2021/696) to avoid duplication. However, dual-use operations (serving both civilian and defence purposes) remain in scope.",
                  ],
                  keyPoints: [
                    "Art. 2 scope: EU-established operators + third-country operators serving the EU market",
                    "Extraterritorial application mirrors GDPR/NIS2 approach",
                    "Art. 3 exclusions: purely military and EU Space Programme-regulated activities",
                    "Dual-use operations remain in scope",
                    "EEA Member States (Norway, Iceland, Liechtenstein) are included",
                  ],
                },
                {
                  heading: "Territorial Application and NCA Jurisdiction",
                  paragraphs: [
                    "Art. 4-5 establish the jurisdictional framework. Each Member State must designate one or more National Competent Authorities (NCAs) responsible for authorization and supervision. The primary NCA for an operator is determined by the operator's place of establishment (registered office or principal place of business).",
                    "For third-country operators under Art. 8-9, the regulation establishes a specific framework: they must either obtain EU authorization through a designated NCA (designating an EU legal representative) or benefit from an equivalence recognition decision by the Commission under Art. 9, where the operator's home jurisdiction provides equivalent regulatory protection.",
                  ],
                  keyPoints: [
                    "Art. 4-5: Member States designate NCAs",
                    "Primary NCA determined by operator's place of establishment",
                    "Art. 8: Third-country operators must designate EU representative",
                    "Art. 9: Commission can recognize equivalent third-country frameworks",
                  ],
                },
              ],
            },
          },
          {
            slug: "key-definitions",
            title: "Key Definitions",
            type: "THEORY",
            sortOrder: 3,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading: "Essential Terminology (Art. 2-5)",
                  paragraphs: [
                    "The EU Space Act introduces several key definitions that form the foundation of the regulatory framework. Understanding these definitions is critical because they determine which obligations apply to which entities.",
                    "'Space activity' is broadly defined to include the launch, orbital operation, in-orbit servicing, re-entry, and disposal of space objects, as well as the operation of ground infrastructure essential for the conduct of these activities. This broad definition ensures comprehensive coverage.",
                    "'Operator' means any natural or legal person who carries out a space activity or provides a space-based service. The regulation distinguishes seven operator categories: Spacecraft Operator (SCO), Launch Operator (LO), Launch Site Operator (LSO), In-Space Operations and Services provider (ISOS), Collision Avoidance Provider (CAP), Primary Data Provider (PDP), and Third-Country Operator (TCO). Each category triggers specific regulatory requirements tailored to the nature of the activity.",
                    "'Space object' includes any object launched or intended to be launched into outer space, including spacecraft, launch vehicles, and their component parts. This definition is critical for registration (Art. 24) and debris mitigation (Art. 58-62) obligations.",
                  ],
                  keyPoints: [
                    "'Space activity': launch, operation, servicing, re-entry, disposal, and essential ground infrastructure",
                    "7 operator types: SCO, LO, LSO, ISOS, CAP, PDP, TCO",
                    "'Space object': any object launched or intended for outer space, including components",
                    "'Authorization': formal approval from NCA to conduct space activities",
                    "'Light regime' (Art. 10): simplified framework for small/micro enterprises with low-risk profiles",
                  ],
                },
                {
                  heading: "Entity Size Classifications",
                  paragraphs: [
                    "The regulation uses EU standard enterprise size definitions from Recommendation 2003/361/EC to determine regulatory proportionality. Micro-enterprises have fewer than 10 employees and annual turnover below EUR 2 million. Small enterprises have fewer than 50 employees and turnover below EUR 10 million. Medium enterprises have fewer than 250 employees and turnover below EUR 50 million. Large enterprises exceed these thresholds.",
                    "Entity size is significant because Art. 10 establishes a 'light regime' for small and micro enterprises conducting low-risk space activities, providing simplified authorization procedures, reduced documentation, and potentially lower fees. This proportionality principle ensures the regulation does not disproportionately burden small innovators and research entities.",
                  ],
                  keyPoints: [
                    "Micro: < 10 employees, < EUR 2M turnover",
                    "Small: < 50 employees, < EUR 10M turnover",
                    "Medium: < 250 employees, < EUR 50M turnover",
                    "Large: exceeds medium thresholds",
                    "Art. 10 light regime applies to small/micro entities with low-risk profiles",
                  ],
                },
              ],
            },
          },
        ],
      },

      // ── Module 2: Operator Types & Classification ──
      {
        title: "Operator Types & Classification",
        description:
          "Learn the seven operator categories defined by the EU Space Act and how to determine which classification applies to your organization, including light regime eligibility.",
        sortOrder: 2,
        lessons: [
          {
            slug: "the-7-operator-categories",
            title: "The 7 Operator Categories",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Operator Types Under the EU Space Act",
                  paragraphs: [
                    "The EU Space Act defines seven distinct operator categories, each with tailored regulatory obligations reflecting the specific risks and responsibilities of the activity.",
                    "Spacecraft Operator (SCO) -- Art. 6: The most common category, covering entities that operate satellites and spacecraft in orbit. This includes Earth observation operators, telecommunications satellite operators, scientific mission operators, and any entity exercising operational control over an orbital asset.",
                    "Launch Operator (LO) -- Art. 7: Entities that provide launch services, operating launch vehicles to deliver payloads to orbit. LO obligations are among the most stringent, including launch safety requirements (Art. 32-39), environmental impact of launch activities (Art. 101-103), and enhanced third-party liability insurance.",
                    "Launch Site Operator (LSO) -- Art. 7: Entities that operate spaceports or launch facilities. LSOs bear responsibility for ground safety, facility management, and range safety infrastructure.",
                  ],
                  keyPoints: [
                    "SCO (Spacecraft Operator): orbital asset operation -- most common category",
                    "LO (Launch Operator): launch vehicle operation -- stringent safety requirements",
                    "LSO (Launch Site Operator): spaceport/launch facility -- ground safety focus",
                  ],
                },
                {
                  heading: "Service and Third-Country Operator Categories",
                  paragraphs: [
                    "In-Space Operations and Services Provider (ISOS) -- Art. 6: Covers active debris removal, satellite servicing and repair, on-orbit refuelling, and space logistics. ISOS operators face unique requirements for proximity operations safety cases, liability allocation for multi-party operations, and enhanced debris plans.",
                    "Collision Avoidance Provider (CAP) -- Art. 6: Entities providing collision avoidance services, including conjunction assessment, manoeuvre recommendation, and space traffic coordination.",
                    "Primary Data Provider (PDP) -- Art. 6: Entities providing primary space-derived data, particularly Earth observation data providers. PDPs face data handling, distribution, and potentially data security obligations.",
                    "Third-Country Operator (TCO) -- Art. 8-9: Operators established outside the EU but providing services to the EU market. TCOs must either obtain EU authorization through a designated NCA with an EU legal representative, or benefit from a Commission equivalence recognition decision.",
                  ],
                  keyPoints: [
                    "ISOS: in-orbit servicing, ADR, refuelling -- proximity operations focus",
                    "CAP: collision avoidance and space traffic services",
                    "PDP: primary space data providers -- data governance focus",
                    "TCO: third-country operators serving the EU market -- Art. 8-9 framework",
                  ],
                },
              ],
            },
          },
          {
            slug: "classification-criteria",
            title: "Classification Criteria",
            type: "INTERACTIVE",
            sortOrder: 2,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading: "How to Determine Your Operator Classification",
                  paragraphs: [
                    "Correct operator classification requires analysing three factors: (1) the nature of your space activity, (2) where your entity is established, and (3) where your services are provided.",
                    "Start with the activity: if you operate spacecraft in orbit, you are likely an SCO. If you provide launch services, you are an LO. If you operate a launch facility, you are an LSO. If you perform proximity operations (servicing, ADR), you are an ISOS. If you provide conjunction assessment services, you are a CAP. If you generate primary EO or SATCOM data, you may be a PDP. If you are non-EU but serve EU customers, you are also a TCO.",
                    "An entity can hold multiple classifications simultaneously. For example, a company that operates its own spacecraft (SCO) and provides in-orbit servicing to other operators (ISOS) would need authorization under both categories. However, the NCA coordinates assessment to avoid duplication.",
                  ],
                  keyPoints: [
                    "Classification is based on: activity type + establishment + service market",
                    "Most operators fit a single category; complex cases may require multiple classifications",
                    "The NCA coordinates assessment for multi-category operators",
                    "Incorrect classification may lead to incomplete compliance or unnecessary burden",
                  ],
                },
              ],
            },
          },
          {
            slug: "light-regime-eligibility",
            title: "Light Regime Eligibility",
            type: "THEORY",
            sortOrder: 3,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading:
                    "Art. 10 Light Regime for Small and Micro Enterprises",
                  paragraphs: [
                    "Art. 10 establishes a proportionate authorization framework for small and micro enterprises conducting low-risk space activities. Eligibility requires meeting two cumulative criteria: (1) the operator qualifies as a small or micro enterprise under EU Recommendation 2003/361/EC (fewer than 50 employees and annual turnover below EUR 10 million), and (2) the space activity has a low-risk profile.",
                    "Low-risk indicators include: single satellite or small constellation in LEO, non-manoeuvrable CubeSats with short orbital lifetime, research or educational missions, and activities without critical infrastructure service dependencies.",
                    "The light regime does not eliminate regulatory obligations -- it scales them proportionately. Core safety requirements (debris mitigation, basic insurance, registration) still apply but with reduced documentation depth. Authorization processing may be expedited, fees may be reduced or waived, and reporting obligations are simplified.",
                  ],
                  keyPoints: [
                    "Art. 10 criteria: small/micro enterprise + low-risk activity profile",
                    "Small enterprise: < 50 employees, < EUR 10M turnover (Recommendation 2003/361/EC)",
                    "Low-risk indicators: single LEO satellite, short orbital lifetime, non-critical services",
                    "Simplifies but does not eliminate: debris plan, basic insurance, and registration still required",
                    "NCA retains discretion to require standard regime if warranted",
                  ],
                },
              ],
            },
          },
        ],
      },

      // ── Module 3: Authorization Framework ──
      {
        title: "Authorization Framework",
        description:
          "Understand the full EU Space Act authorization process from pre-authorization requirements through ongoing obligations, including Art. 11-15 procedures.",
        sortOrder: 3,
        lessons: [
          {
            slug: "pre-authorization-requirements",
            title: "Pre-Authorization Requirements",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Before You Apply: Art. 11-12 Prerequisites",
                  paragraphs: [
                    "Before filing an authorization application, operators must prepare a comprehensive dossier demonstrating compliance with all applicable requirements. Art. 12 specifies the information that must accompany the application.",
                    "The Art. 12 dossier includes: (1) Operator identification and evidence of establishment, (2) Technical dossier covering the space object's design, orbital parameters, and mission plan, (3) Debris mitigation plan per Art. 58-62, (4) Cybersecurity assessment per Art. 74, (5) Proof of third-party liability insurance per Art. 44-51, (6) Environmental footprint declaration per Art. 96-100, (7) Registration data for the Union Register per Art. 24, and (8) Evidence of financial standing sufficient to meet the operator's obligations.",
                    "Pre-application consultation with the NCA, while not mandatory, is strongly recommended. Many NCAs offer informal guidance sessions to help operators understand specific requirements before formal submission.",
                  ],
                  keyPoints: [
                    "Art. 12 requires a comprehensive dossier, not just technical specifications",
                    "Key components: technical dossier, debris plan, cybersecurity, insurance, environmental, registration, financial standing",
                    "Pre-application NCA consultation is recommended but not mandatory",
                    "Incomplete applications will be returned, delaying authorization",
                  ],
                },
              ],
            },
          },
          {
            slug: "authorization-process",
            title: "Authorization Process",
            type: "THEORY",
            sortOrder: 2,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "The Art. 13-14 Authorization Process",
                  paragraphs: [
                    "Once the complete dossier is submitted, the NCA initiates the authorization assessment. Art. 13 establishes the assessment framework: the NCA evaluates the application against safety (debris, launch safety), security (cybersecurity), financial responsibility (insurance, financial standing), and environmental (footprint declaration) criteria.",
                    "Art. 13 also introduces type-based authorization for constellation operators. Rather than requiring individual authorization for each satellite in a homogeneous constellation, the NCA can issue a type authorization covering the entire fleet.",
                    "Art. 14 establishes the authorization decision framework. The NCA may: (a) grant authorization unconditionally, (b) grant authorization with conditions, (c) request additional information before deciding, or (d) refuse authorization with a reasoned decision. Refused applicants have the right to appeal under national administrative law.",
                    "The authorization may specify a duration (typically aligned with mission lifetime) and conditions that must be maintained throughout the authorization period. Material changes to the authorized operations require authorization amendment.",
                  ],
                  keyPoints: [
                    "Art. 13: NCA assesses safety, security, financial responsibility, and environmental criteria",
                    "Type-based authorization available for constellation operators",
                    "Art. 14 outcomes: unconditional grant, conditional grant, information request, or refusal",
                    "Authorization may include duration and conditions",
                    "Material operational changes require authorization amendment",
                  ],
                },
              ],
            },
          },
          {
            slug: "ongoing-obligations",
            title: "Ongoing Obligations",
            type: "THEORY",
            sortOrder: 3,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading: "Art. 15 Ongoing Obligations After Authorization",
                  paragraphs: [
                    "Authorization is not the end of the compliance journey -- it is the beginning. Art. 15 establishes comprehensive ongoing obligations that authorized operators must maintain throughout the lifetime of their space activities.",
                    "Key ongoing obligations include: maintaining all conditions specified in the authorization, continuous compliance with debris mitigation requirements (Art. 58-62), maintaining valid third-party liability insurance (Art. 44-51), continuous cybersecurity compliance per Art. 74 and NIS2, notifying the NCA of any material changes to operations, participating in space situational awareness data sharing per Art. 52-57, maintaining accurate registration data in URSO per Art. 24, and submitting periodic compliance reports as specified by the NCA.",
                    "Art. 26-31 complements Art. 15 by establishing the NCA's supervisory powers. NCAs may conduct inspections, request information, issue directives, and ultimately suspend or revoke authorization for persistent non-compliance.",
                  ],
                  keyPoints: [
                    "Art. 15: ongoing obligations throughout the mission lifetime",
                    "Continuous compliance: debris mitigation, insurance, cybersecurity, registration",
                    "NCA notification required for material operational changes",
                    "Art. 26-31: NCA supervisory powers including inspections and authorization revocation",
                    "Proactive engagement generally results in cooperative supervision",
                  ],
                },
              ],
            },
          },
        ],
      },

      // ── Module 4: Knowledge Check ──
      {
        title: "Knowledge Check",
        description:
          "Test your understanding of EU Space Act fundamentals with a comprehensive quiz and a practical case study.",
        sortOrder: 4,
        lessons: [
          {
            slug: "eu-space-act-fundamentals-quiz",
            title: "EU Space Act Fundamentals Quiz",
            type: "QUIZ",
            sortOrder: 1,
            estimatedMinutes: 15,
            questions: [
              {
                sortOrder: 1,
                questionText:
                  "Under Art. 11 of the EU Space Act, where must an EU-established operator submit their authorization application?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "Directly to EUSPA in Prague", isCorrect: false },
                  {
                    text: "To the NCA of the Member State where the operator is established",
                    isCorrect: true,
                  },
                  {
                    text: "To any NCA in the EU of the operator's choosing",
                    isCorrect: false,
                  },
                  {
                    text: "To the European Commission's DG DEFIS",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "Art. 11 requires operators to submit authorization applications to the NCA of the Member State where they are established (registered office or principal place of business). The NCA then coordinates with EUSPA and other bodies as needed.",
                hint: "Think about the principle of establishment-based jurisdiction.",
                relatedArticles: ["Art. 11", "Art. 4", "Art. 5"],
              },
              {
                sortOrder: 2,
                questionText:
                  "Which of the following is NOT one of the seven operator categories defined by the EU Space Act?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    text: "In-Space Operations and Services Provider (ISOS)",
                    isCorrect: false,
                  },
                  {
                    text: "Ground Station Network Operator (GSNO)",
                    isCorrect: true,
                  },
                  { text: "Launch Operator (LO)", isCorrect: false },
                  {
                    text: "Collision Avoidance Provider (CAP)",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "The seven categories are: SCO, LO, LSO, ISOS, CAP, PDP, and TCO. 'Ground Station Network Operator' is not a defined category, although ground segment operations may fall under other categories depending on the activities.",
                hint: "The seven categories are: SCO, LO, LSO, ISOS, CAP, PDP, TCO.",
                relatedArticles: ["Art. 2", "Art. 6", "Art. 7", "Art. 8"],
              },
              {
                sortOrder: 3,
                questionText:
                  "Art. 10 establishes a 'light regime' for certain operators. What two cumulative criteria must be met?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    text: "EU establishment and less than 5 years of operations",
                    isCorrect: false,
                  },
                  {
                    text: "Small/micro enterprise size AND low-risk activity profile",
                    isCorrect: true,
                  },
                  {
                    text: "Annual turnover below EUR 50M and LEO operations only",
                    isCorrect: false,
                  },
                  {
                    text: "Research-only mission purpose and public funding",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "Art. 10 requires both: (1) small or micro enterprise status per EU Recommendation 2003/361/EC (< 50 employees, < EUR 10M turnover), AND (2) a low-risk activity profile. Both criteria must be met simultaneously.",
                hint: "The light regime uses standard EU enterprise size definitions combined with a risk assessment.",
                relatedArticles: ["Art. 10"],
              },
              {
                sortOrder: 4,
                questionText:
                  "True or False: The EU Space Act applies to a satellite operator headquartered in the United States that provides Earth observation services to customers in the EU.",
                questionType: "TRUE_FALSE",
                options: [
                  { text: "True", isCorrect: true },
                  { text: "False", isCorrect: false },
                ],
                explanation:
                  "True. Art. 2 extends the regulation's scope to third-country operators providing space-based services to persons in the Union. A US-based EO operator serving EU customers is a TCO under Art. 8.",
                relatedArticles: ["Art. 2", "Art. 8", "Art. 9"],
              },
              {
                sortOrder: 5,
                questionText:
                  "According to Art. 15, which of the following is an ongoing obligation for authorized operators?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    text: "Maintaining valid insurance and debris mitigation compliance continuously",
                    isCorrect: true,
                  },
                  {
                    text: "Resubmitting the full authorization dossier annually",
                    isCorrect: false,
                  },
                  {
                    text: "Paying an annual EU space activity tax",
                    isCorrect: false,
                  },
                  {
                    text: "Hosting NCA staff at the operator's premises permanently",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "Art. 15 ongoing obligations include maintaining all authorization conditions continuously: valid insurance (Art. 44-51), debris mitigation compliance (Art. 58-62), cybersecurity (Art. 74), and notifying the NCA of material changes.",
                hint: "Art. 15 requires continuous compliance, not periodic reapplication.",
                relatedArticles: [
                  "Art. 15",
                  "Art. 26",
                  "Art. 44",
                  "Art. 58",
                  "Art. 74",
                ],
              },
            ],
          },
          {
            slug: "authorization-case-study",
            title: "Authorization Case Study",
            type: "CASE_STUDY",
            sortOrder: 2,
            estimatedMinutes: 15,
            content: {
              sections: [
                {
                  heading: "Case Study: EuroSat GmbH Authorization",
                  paragraphs: [
                    "EuroSat GmbH is a German company with 35 employees and EUR 8M annual turnover. They have developed a 100 kg microsatellite for commercial Earth observation services, planned for deployment in a 500 km sun-synchronous orbit. Their customers include EU agricultural agencies and private sector clients across the EU.",
                    "Consider: (1) What operator category does EuroSat fall under? (2) Does EuroSat qualify for the Art. 10 light regime? (3) Which NCA should EuroSat apply to? (4) What must the authorization dossier contain? (5) What ongoing obligations will EuroSat face?",
                    "EuroSat is an SCO (Spacecraft Operator). With 35 employees and EUR 8M turnover, they qualify as a small enterprise. Their single LEO satellite with short natural decay at 500 km represents a low-risk profile, qualifying for the Art. 10 light regime. They should apply to the German NCA. Their dossier, while proportionately simplified, must still include a debris mitigation plan, basic insurance, environmental declaration, cybersecurity assessment, and registration data.",
                  ],
                  keyPoints: [
                    "Classification: SCO (Spacecraft Operator)",
                    "Regime: Art. 10 light regime (small enterprise + low-risk LEO mission)",
                    "Jurisdiction: German NCA (place of establishment)",
                    "Dossier: simplified but complete -- debris plan, insurance, environmental, cybersecurity, registration",
                    "Ongoing: continuous compliance with proportionate obligations",
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Course 2: NIS2 for Space Operators
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: "nis2-space-operators",
    title: "NIS2 for Space Operators",
    subtitle: "Understand NIS2 cybersecurity obligations for the space sector",
    description:
      "A focused course on the NIS2 Directive (EU 2022/2555) as it applies to space sector entities. Covers entity classification, Art. 21 security measures, the mandatory incident reporting timeline, SATCOM-specific considerations, and the intersection with EU Space Act Art. 74 cybersecurity requirements.",
    icon: "Shield",
    category: "NIS2",
    level: "INTERMEDIATE",
    estimatedMinutes: 90,
    isPublished: true,
    isPremium: false,
    sortOrder: 2,
    tags: ["nis2", "cybersecurity", "incident-reporting", "space-sector"],
    relatedComplianceModules: ["cybersecurity", "nis2"],
    modules: [
      {
        title: "NIS2 Directive Overview",
        description:
          "Understand NIS2 scope, entity classification, and how space is designated as Annex I Sector 11.",
        sortOrder: 1,
        lessons: [
          {
            slug: "nis2-scope-and-space-sector",
            title: "NIS2 Scope and Space Sector Classification",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "NIS2 and the Space Sector",
                  paragraphs: [
                    "The NIS2 Directive (EU 2022/2555) replaces the original NIS Directive and significantly expands EU cybersecurity requirements. Space is listed as a sector of high criticality in Annex I (Sector 11), meaning space operators may be classified as essential or important entities subject to comprehensive cybersecurity obligations.",
                    "NIS2 applies to entities meeting size thresholds: medium entities (50+ employees or EUR 10M+ turnover) and large entities automatically fall within scope if they operate in an Annex I or Annex II sector.",
                    "The space sector under NIS2 Annex I covers: operators of ground-based infrastructure supporting space-based services, operators of space-based services (SATCOM, EO, PNT), and entities operating critical space infrastructure.",
                  ],
                  keyPoints: [
                    "NIS2 (EU 2022/2555) lists space as Annex I Sector 11: high criticality",
                    "Essential entities: large operators -- penalties up to EUR 10M or 2% turnover",
                    "Important entities: medium operators -- penalties up to EUR 7M or 1.4% turnover",
                    "Scope includes satellite operators, ground segment operators, and service providers",
                  ],
                },
              ],
            },
          },
          {
            slug: "entity-classification-essential-vs-important",
            title: "Entity Classification: Essential vs. Important",
            type: "THEORY",
            sortOrder: 2,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading: "Essential and Important Entity Classification",
                  paragraphs: [
                    "NIS2 Art. 3 distinguishes between essential and important entities. Essential entities are large enterprises (250+ employees or EUR 50M+ turnover) in Annex I sectors. Important entities are medium enterprises (50-249 employees or EUR 10-50M turnover) in Annex I sectors.",
                    "For space, typical essential profiles include: large SATCOM operators serving critical infrastructure, GNSS augmentation operators, and large constellation operators. Important profiles include: medium EO operators, ground station networks, and medium SATCOM providers.",
                    "Essential entities face proactive supervision (authority-initiated audits), while important entities face reactive supervision (evidence-triggered). Both classifications require full Art. 21 cybersecurity measures.",
                  ],
                  keyPoints: [
                    "Essential: large entities (250+ employees or EUR 50M+) -- proactive supervision",
                    "Important: medium entities (50-249 employees or EUR 10-50M) -- reactive supervision",
                    "Both require full Art. 21(2)(a)-(j) cybersecurity measures",
                    "Penalty difference: essential = EUR 10M/2%, important = EUR 7M/1.4%",
                    "Art. 20: management body must approve and oversee cybersecurity measures",
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Space-Specific NIS2 Compliance",
        description:
          "Deep dive into Art. 21 measures, incident reporting timelines, and SATCOM exceptions for space operators.",
        sortOrder: 2,
        lessons: [
          {
            slug: "art-21-security-measures",
            title: "Art. 21 Security Measures for Space",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Art. 21(2) Mandatory Security Measures",
                  paragraphs: [
                    "NIS2 Art. 21(2) requires ten categories of cybersecurity measures: (a) risk analysis and IS security policies, (b) incident handling, (c) business continuity and crisis management, (d) supply chain security, (e) vulnerability handling, (f) effectiveness assessment, (g) cyber hygiene and training, (h) cryptography and encryption, (i) HR security, access control, asset management, and (j) MFA and secure communications.",
                    "For space operators, special attention is needed for: TT&C link encryption (measure h), supply chain security for satellite components (measure d), and incident handling accounting for real-time satellite operations (measure b). EU Space Act Art. 74 cross-references NIS2 and adds space-specific requirements including secure-by-design for spacecraft.",
                  ],
                  keyPoints: [
                    "Art. 21(2): 10 mandatory cybersecurity measure categories (a)-(j)",
                    "Space-specific focus areas: TT&C encryption, supply chain, incident handling",
                    "EU Space Act Art. 74 cross-references NIS2 and adds space-specific requirements",
                    "All measures must be proportionate to risk and entity size",
                    "Art. 20: management body has personal accountability",
                  ],
                },
              ],
            },
          },
          {
            slug: "incident-reporting-timeline",
            title: "Incident Reporting: 24h / 72h / 1 Month",
            type: "THEORY",
            sortOrder: 2,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading: "NIS2 Art. 23 Incident Reporting Timeline",
                  paragraphs: [
                    "Stage 1 -- Early Warning (24 hours): Within 24 hours of becoming aware of a significant incident, submit an early warning to the CSIRT indicating whether the incident is suspected malicious and whether it could have cross-border impact.",
                    "Stage 2 -- Incident Notification (72 hours): Update with initial severity and impact assessment, indicators of compromise, and measures taken or being taken.",
                    "Stage 3 -- Final Report (1 month): Detailed description, root cause, applied and ongoing mitigation measures, and cross-border impact. If investigation is ongoing, an intermediate status report may be submitted with the final report to follow.",
                  ],
                  keyPoints: [
                    "24 hours: early warning to CSIRT -- alert only, analysis not required",
                    "72 hours: incident notification -- severity, IoCs, measures taken",
                    "1 month: final report -- root cause, full impact, mitigation, cross-border effects",
                    "Reports go to the CSIRT, not just the sector NCA",
                    "Failure to meet deadlines is independently sanctionable",
                  ],
                },
              ],
            },
          },
          {
            slug: "satcom-exceptions-and-specifics",
            title: "SATCOM Exceptions and Space-Specific Considerations",
            type: "THEORY",
            sortOrder: 3,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading: "SATCOM and Space-Specific NIS2 Considerations",
                  paragraphs: [
                    "Space presents unique cybersecurity challenges: physical inaccessibility of space assets for patching, long hardware lifecycles (10-20 years for GEO), RF susceptibility to jamming/spoofing, and TT&C link criticality.",
                    "NIS2 Recital 82 acknowledges sectors may require specific implementing acts. For space, the Commission may adopt implementing acts specifying Art. 21 measures for space operators. ENISA provides guidance through the Space Threat Landscape publications.",
                    "Purely military SATCOM excluded under Art. 3 would also be excluded from NIS2 for those services. Dual-use SATCOM serving both civilian and military remains in scope for the civilian component.",
                  ],
                  keyPoints: [
                    "Space assets cannot be physically patched -- firmware updates must be pre-designed",
                    "Long hardware lifecycles (10-20 years) mean cybersecurity must be forward-looking",
                    "RF environment: susceptible to jamming, spoofing, and interception",
                    "Commission may adopt sector-specific implementing acts for space",
                    "Dual-use SATCOM: civilian component remains in NIS2 scope",
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "NIS2 Assessment",
        description:
          "Test your understanding with a quiz and practice incident response simulation.",
        sortOrder: 3,
        lessons: [
          {
            slug: "nis2-knowledge-quiz",
            title: "NIS2 for Space Operators Quiz",
            type: "QUIZ",
            sortOrder: 1,
            estimatedMinutes: 12,
            questions: [
              {
                sortOrder: 1,
                questionText:
                  "Under NIS2, space is listed in which Annex and as what type of sector?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    text: "Annex I -- sector of high criticality",
                    isCorrect: true,
                  },
                  {
                    text: "Annex II -- other critical sector",
                    isCorrect: false,
                  },
                  {
                    text: "Annex I -- essential services sector",
                    isCorrect: false,
                  },
                  {
                    text: "Not listed; space falls under generic ICT",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "Space is explicitly listed in NIS2 Annex I as Sector 11, classified as a sector of high criticality.",
                relatedArticles: ["NIS2 Annex I", "NIS2 Art. 2", "NIS2 Art. 3"],
              },
              {
                sortOrder: 2,
                questionText:
                  "What is the deadline for submitting an early warning to the CSIRT?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "12 hours", isCorrect: false },
                  { text: "24 hours", isCorrect: true },
                  { text: "48 hours", isCorrect: false },
                  { text: "72 hours", isCorrect: false },
                ],
                explanation:
                  "NIS2 Art. 23(4)(a) requires an early warning within 24 hours.",
                relatedArticles: ["NIS2 Art. 23(4)(a)"],
              },
              {
                sortOrder: 3,
                questionText:
                  "Maximum penalty for an essential entity breaching NIS2 Art. 21?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "EUR 5M or 1% of global turnover", isCorrect: false },
                  {
                    text: "EUR 7M or 1.4% of global turnover",
                    isCorrect: false,
                  },
                  { text: "EUR 10M or 2% of global turnover", isCorrect: true },
                  {
                    text: "EUR 20M or 4% of global turnover",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "NIS2 Art. 34: EUR 10M or 2% of total worldwide annual turnover (whichever is higher) for essential entities.",
                relatedArticles: ["NIS2 Art. 34"],
              },
              {
                sortOrder: 4,
                questionText:
                  "True or False: Under NIS2 Art. 20, the management body can fully delegate cybersecurity accountability to the CISO.",
                questionType: "TRUE_FALSE",
                options: [
                  { text: "True", isCorrect: false },
                  { text: "False", isCorrect: true },
                ],
                explanation:
                  "False. Art. 20 accountability is personal and cannot be fully delegated. Management must also undergo cybersecurity training.",
                relatedArticles: ["NIS2 Art. 20"],
              },
              {
                sortOrder: 5,
                questionText:
                  "Which Art. 21(2) measure is most critical for protecting satellite TT&C links?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "(d) Supply chain security", isCorrect: false },
                  { text: "(g) Basic cyber hygiene", isCorrect: false },
                  { text: "(h) Cryptography and encryption", isCorrect: true },
                  { text: "(i) Human resources security", isCorrect: false },
                ],
                explanation:
                  "Measure (h) -- cryptography/encryption -- is most directly relevant to TT&C link protection against unauthorized command injection.",
                hint: "Think about what protects the ground-to-space communication path.",
                relatedArticles: ["NIS2 Art. 21(2)(h)", "EU Space Act Art. 74"],
              },
            ],
          },
          {
            slug: "nis2-incident-simulation",
            title: "NIS2 Incident Response Simulation",
            type: "SIMULATION",
            sortOrder: 2,
            estimatedMinutes: 15,
            content: {
              sections: [
                {
                  heading: "Simulation: Ground Segment Cyber Incident",
                  paragraphs: [
                    "In this simulation, you will navigate a NIS2 incident response scenario. Your ground segment has detected anomalous data exfiltration from mission control databases. Make decisions about containment, reporting, and remediation per Art. 23 timelines.",
                    "This simulation maps to scenario 'sim-nis2-incident' in the Academy simulation engine.",
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Course 3: National Space Laws Compared
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: "national-space-laws-compared",
    title: "National Space Laws Compared",
    subtitle:
      "Navigate 10 European jurisdictions and their space regulatory frameworks",
    description:
      "A comparative analysis of national space laws across 10 European jurisdictions: France, United Kingdom, Belgium, Netherlands, Luxembourg, Austria, Denmark, Germany, Italy, and Norway. Covers licensing, liability, registration, and EU Space Act harmonization.",
    icon: "Globe",
    category: "NATIONAL_SPACE_LAW",
    level: "INTERMEDIATE",
    estimatedMinutes: 90,
    isPublished: true,
    isPremium: false,
    sortOrder: 3,
    tags: [
      "national-law",
      "jurisdictions",
      "licensing",
      "liability",
      "comparison",
    ],
    relatedComplianceModules: ["authorization", "insurance", "registration"],
    modules: [
      {
        title: "Western European Frameworks",
        description:
          "Compare France, Belgium, Netherlands, Luxembourg, and UK space laws.",
        sortOrder: 1,
        lessons: [
          {
            slug: "france-and-belgium",
            title: "France (LOS 2008) and Belgium (2005)",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading:
                    "France: Loi relative aux Operations Spatiales (2008)",
                  paragraphs: [
                    "France has the most comprehensive national space law in Europe. The LOS, enacted 2008, amended 2019, establishes detailed authorization, licensing, and supervision. CNES serves as the technical authority.",
                    "Key features: mandatory authorization for launch and orbital operations from French territory, CNES technical regulation, state guarantee above EUR 60M for launch activities (Art. 6 LOS), and criminal penalties for unauthorized activities. France's framework is critical because CSG in Kourou is Europe's primary launch site.",
                  ],
                  keyPoints: [
                    "LOS 2008: most comprehensive European framework, amended 2019",
                    "CNES: technical authority for authorization",
                    "State guarantee above EUR 60M for launch from French territory",
                    "CSG/Kourou: Europe's primary launch site under French jurisdiction",
                  ],
                },
                {
                  heading: "Belgium: Law of 17 September 2005",
                  paragraphs: [
                    "Belgium was the first EU Member State to adopt a national space law. BELSPO administers the authorization process. Belgium requires operators to maintain a register and imposes strict liability for ground damage. Insurance requirements set by Royal Decree.",
                  ],
                  keyPoints: [
                    "First EU Member State national space law (2005)",
                    "BELSPO: authorization authority",
                    "Strict liability for ground damage",
                    "Insurance requirements by Royal Decree",
                  ],
                },
              ],
            },
          },
          {
            slug: "netherlands-luxembourg-uk",
            title: "Netherlands, Luxembourg, and UK",
            type: "THEORY",
            sortOrder: 2,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Netherlands, Luxembourg, and UK",
                  paragraphs: [
                    "The Dutch Space Activities Act (2007) provides straightforward licensing through the Minister of Economic Affairs with EUR 3.5M insurance minimum. The Netherlands has become an important hub for satellite manufacturing.",
                    "Luxembourg enacted its space law in 2020, building on its SES heritage and the 2017 Space Resources Act. The Luxembourg Space Agency (LSA) administers a commercial-friendly licensing process that has attracted significant NewSpace investment.",
                    "The UK operates under the Outer Space Act 1986 and Space Industry Act 2018. Post-Brexit, UK operators are TCOs under the EU Space Act Art. 8-9 for EU market access. Many UK operators are establishing EU subsidiaries in Ireland, Luxembourg, or the Netherlands.",
                  ],
                  keyPoints: [
                    "Netherlands: straightforward licensing, EUR 3.5M insurance minimum",
                    "Luxembourg: modern commercial-friendly framework, Space Resources Act",
                    "UK: post-Brexit TCO status under EU Space Act Art. 8-9",
                    "UK operators establishing EU subsidiaries for market access",
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Central and Northern European Frameworks",
        description: "Examine Austria, Denmark, Germany, Italy, and Norway.",
        sortOrder: 2,
        lessons: [
          {
            slug: "austria-denmark-germany",
            title: "Austria, Denmark, and Germany",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Austria, Denmark, and Germany",
                  paragraphs: [
                    "Austria's Weltraumgesetz (2011) is administered by FFG. Denmark's Act No. 409 (2016) covers authorization by the Ministry of Higher Education and Science. Denmark is relevant through Greenlandic radar/ground station facilities.",
                    "Germany relies on sectoral laws rather than a single space act: the Satellite Data Security Act (SatDSiG, 2007) for EO data and the Federal Aviation Act for some launch aspects. DLR and BNetzA serve regulatory functions. Germany is developing comprehensive space legislation to complement the EU Space Act.",
                  ],
                  keyPoints: [
                    "Austria: Weltraumgesetz 2011, FFG as authority",
                    "Denmark: Act No. 409 (2016), Greenlandic facilities",
                    "Germany: fragmented framework (SatDSiG, LuftVG), DLR/BNetzA",
                    "Germany developing comprehensive space law",
                  ],
                },
              ],
            },
          },
          {
            slug: "italy-and-norway",
            title: "Italy and Norway",
            type: "THEORY",
            sortOrder: 2,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading: "Italy and Norway",
                  paragraphs: [
                    "Italy has a major industrial base (Leonardo, Thales Alenia Space Italy, Avio) with ASI as central authority. Italy hosts ESA's ESRIN facility in Frascati.",
                    "Norway, as an EEA member, is treated as EU-established under the EU Space Act. Norway's Space Activities Act (1969, amended) is one of the earliest globally. NOSA administers authorization. Norway hosts Andoya launch site and Svalbard ground station facilities.",
                  ],
                  keyPoints: [
                    "Italy: ASI authority, major industrial base, ESRIN",
                    "Norway: EEA member, treated as EU-established",
                    "Norway: Space Activities Act 1969 -- one of earliest",
                    "Both must align national frameworks with EU Space Act",
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Comparative Analysis",
        description:
          "Compare licensing, liability, registration across jurisdictions.",
        sortOrder: 3,
        lessons: [
          {
            slug: "licensing-comparison-matrix",
            title: "Licensing Requirements Comparison",
            type: "INTERACTIVE",
            sortOrder: 1,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Cross-Jurisdiction Licensing Comparison",
                  paragraphs: [
                    "Key comparison dimensions: application complexity, processing timelines, fee structures, insurance minimums, and renewal obligations. France has the most detailed technical assessment; Luxembourg offers commercial agility; the Netherlands provides a straightforward process.",
                    "The EU Space Act creates a uniform baseline, but during transition national specificities persist. Multi-jurisdiction operators must maintain compliance with both their primary NCA (EU Space Act) and applicable national requirements where they operate.",
                  ],
                  keyPoints: [
                    "France: most complex technical assessment (CNES regulation)",
                    "Luxembourg: commercial agility, LSA-administered",
                    "Netherlands: straightforward, EUR 3.5M insurance minimum",
                    "UK: separate post-Brexit framework, TCO for EU access",
                    "EU Space Act harmonizes baseline but national specificities persist",
                  ],
                },
              ],
            },
          },
          {
            slug: "jurisdiction-comparison-quiz",
            title: "National Space Laws Quiz",
            type: "QUIZ",
            sortOrder: 2,
            estimatedMinutes: 12,
            questions: [
              {
                sortOrder: 1,
                questionText:
                  "Which European country enacted the first national space law?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "France (2008)", isCorrect: false },
                  { text: "Belgium (2005)", isCorrect: false },
                  { text: "Norway (1969)", isCorrect: true },
                  { text: "United Kingdom (1986)", isCorrect: false },
                ],
                explanation:
                  "Norway enacted its Space Activities Act in 1969, one of the earliest globally. Belgium (2005) was the first EU Member State with a dedicated space law.",
                relatedArticles: [],
              },
              {
                sortOrder: 2,
                questionText:
                  "French state guarantee threshold for launch activities?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "EUR 10 million", isCorrect: false },
                  { text: "EUR 30 million", isCorrect: false },
                  { text: "EUR 60 million", isCorrect: true },
                  { text: "Unlimited", isCorrect: false },
                ],
                explanation:
                  "French LOS Art. 6 provides a state guarantee above EUR 60M. The operator insures up to the threshold; the state assumes residual liability.",
                relatedArticles: [],
              },
              {
                sortOrder: 3,
                questionText:
                  "Post-Brexit, UK operators' status under the EU Space Act?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "Fully exempt", isCorrect: false },
                  {
                    text: "TCOs under Art. 8-9 if serving the EU market",
                    isCorrect: true,
                  },
                  {
                    text: "Treated as EU-established through TCA",
                    isCorrect: false,
                  },
                  {
                    text: "Subject only for launch from EU territory",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "UK operators are TCOs under Art. 8-9 when providing services to the EU market.",
                relatedArticles: ["Art. 8", "Art. 9"],
              },
              {
                sortOrder: 4,
                questionText:
                  "True or False: Norway is treated as EU-established under the EU Space Act because it is an EEA member.",
                questionType: "TRUE_FALSE",
                options: [
                  { text: "True", isCorrect: true },
                  { text: "False", isCorrect: false },
                ],
                explanation:
                  "True. EEA members (Norway, Iceland, Liechtenstein) are treated as EU-established.",
                relatedArticles: ["Art. 2"],
              },
              {
                sortOrder: 5,
                questionText:
                  "Which German law addresses satellite EO data security classification?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "Federal Aviation Act (LuftVG)", isCorrect: false },
                  {
                    text: "Satellite Data Security Act (SatDSiG)",
                    isCorrect: true,
                  },
                  { text: "Telecommunications Act (TKG)", isCorrect: false },
                  {
                    text: "German Space Operations Act (RaumBG)",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "The SatDSiG (2007) addresses security classification of high-resolution satellite EO data.",
                relatedArticles: [],
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Course 4: Cross-Regulatory Compliance
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: "cross-regulatory-compliance",
    title: "Cross-Regulatory Compliance",
    subtitle:
      "Master the overlapping requirements between EU Space Act, NIS2, and national laws",
    description:
      "An advanced course examining how the EU Space Act, NIS2, and national space laws interact. Learn to identify synergies, avoid duplication, and build integrated compliance programmes.",
    icon: "Layers",
    category: "CROSS_REGULATORY",
    level: "ADVANCED",
    estimatedMinutes: 60,
    isPublished: true,
    isPremium: false,
    sortOrder: 4,
    tags: [
      "cross-regulatory",
      "integration",
      "eu-space-act",
      "nis2",
      "national-law",
    ],
    relatedComplianceModules: [
      "authorization",
      "cybersecurity",
      "nis2",
      "supervision",
    ],
    modules: [
      {
        title: "Regulatory Overlap Mapping",
        description:
          "Identify where EU Space Act, NIS2, and national laws overlap.",
        sortOrder: 1,
        lessons: [
          {
            slug: "eu-space-act-nis2-intersection",
            title: "EU Space Act and NIS2 Intersection",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Art. 74 Meets Art. 21: The Cybersecurity Nexus",
                  paragraphs: [
                    "Art. 74 explicitly cross-references NIS2 for cybersecurity. An integrated programme addresses both by implementing NIS2 Art. 21 measures with space-specific tailoring per Art. 74.",
                    "Key overlaps: risk analysis (NIS2 Art. 21(2)(a) + Art. 74), incident handling (NIS2 Art. 21(2)(b) + Art. 74 + NIS2 Art. 23), supply chain (NIS2 Art. 21(2)(d) + Art. 74), and encryption (NIS2 Art. 21(2)(h) + Art. 74 TT&C). Dual reporting: CSIRT under NIS2 Art. 23 and NCA under EU Space Act Art. 26-31.",
                  ],
                  keyPoints: [
                    "Art. 74 cross-references NIS2 -- integrated compliance expected",
                    "NIS2 Art. 21 baseline + Art. 74 space-specific additions",
                    "Dual reporting: CSIRT (NIS2) + NCA (EU Space Act)",
                    "One integrated programme can satisfy both frameworks",
                  ],
                },
              ],
            },
          },
          {
            slug: "national-law-eu-act-harmonization",
            title: "National Law and EU Space Act Harmonization",
            type: "THEORY",
            sortOrder: 2,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading:
                    "Harmonization, Transition, and Persistent National Requirements",
                  paragraphs: [
                    "The EU Space Act is directly applicable without transposition. However, Art. 104-119 transitional provisions govern how national authorizations transition. Certain matters remain national: NCA designation, enforcement, ground segment regulation, data security (SatDSiG), and liability details.",
                    "The practical implication is a multi-layer compliance matrix: EU Space Act (primary), NIS2 (cybersecurity overlay), national space law (persistent requirements), and other EU regulations (dual-use 2021/821, GDPR). Cross-regulatory programmes must map these layers.",
                  ],
                  keyPoints: [
                    "EU Regulation: directly applicable, no transposition",
                    "Art. 104-119: transitional provisions",
                    "Persistent national: NCA organization, enforcement, ground segment, data security",
                    "Multi-layer: EU Space Act + NIS2 + national + other EU regulations",
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Building Integrated Compliance Programmes",
        description:
          "Practical guidance on multi-framework compliance programme design.",
        sortOrder: 2,
        lessons: [
          {
            slug: "integrated-compliance-architecture",
            title: "Integrated Compliance Architecture",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Designing a Multi-Framework Compliance Programme",
                  paragraphs: [
                    "Five-step methodology: (1) Regulatory mapping, (2) Requirements consolidation, (3) Gap analysis, (4) Programme design, (5) Continuous monitoring.",
                    "Key synergies: cybersecurity risk assessment satisfies both NIS2 Art. 21(2)(a) and Art. 74; insurance certificates satisfy both Art. 44-51 and national requirements; debris plans satisfy both Art. 58-62 and national obligations; registration satisfies both URSO and national registries. Integrated programmes reduce cost by 30-40% vs parallel workstreams.",
                  ],
                  keyPoints: [
                    "Five-step: map, consolidate, gap-analyse, design, monitor",
                    "Synergies: cybersecurity, insurance, debris, registration",
                    "30-40% cost reduction vs parallel programmes",
                    "Continuous regulatory monitoring across all frameworks",
                  ],
                },
              ],
            },
          },
          {
            slug: "cross-regulatory-quiz",
            title: "Cross-Regulatory Compliance Quiz",
            type: "QUIZ",
            sortOrder: 2,
            estimatedMinutes: 10,
            questions: [
              {
                sortOrder: 1,
                questionText:
                  "Art. 74 cross-references which directive for cybersecurity?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "GDPR (EU 2016/679)", isCorrect: false },
                  { text: "NIS2 (EU 2022/2555)", isCorrect: true },
                  { text: "CER Directive (EU 2022/2557)", isCorrect: false },
                  { text: "Cyber Resilience Act", isCorrect: false },
                ],
                explanation:
                  "Art. 74 explicitly cross-references NIS2 (EU 2022/2555).",
                relatedArticles: ["Art. 74", "NIS2 Art. 21"],
              },
              {
                sortOrder: 2,
                questionText:
                  "During the EU Space Act transitional period, which is correct?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    text: "National laws are immediately repealed",
                    isCorrect: false,
                  },
                  {
                    text: "National laws continue for non-harmonized matters",
                    isCorrect: true,
                  },
                  {
                    text: "Operators choose either national or EU compliance",
                    isCorrect: false,
                  },
                  { text: "Only new operations are covered", isCorrect: false },
                ],
                explanation:
                  "National laws continue for non-harmonized matters during the Art. 104-119 transitional period.",
                relatedArticles: ["Art. 104", "Art. 114"],
              },
              {
                sortOrder: 3,
                questionText:
                  "For a cyber incident affecting satellite operations, which reporting channels must be activated?",
                questionType: "MULTIPLE_SELECT",
                options: [
                  { text: "CSIRT (under NIS2 Art. 23)", isCorrect: true },
                  {
                    text: "Space sector NCA (under EU Space Act Art. 26-31)",
                    isCorrect: true,
                  },
                  { text: "ENISA directly", isCorrect: false },
                  { text: "European Space Agency (ESA)", isCorrect: false },
                ],
                explanation:
                  "Dual reporting: CSIRT under NIS2 Art. 23 and NCA under EU Space Act Art. 26-31.",
                relatedArticles: ["NIS2 Art. 23", "Art. 26"],
              },
              {
                sortOrder: 4,
                questionText:
                  "Primary benefit of integrated cross-regulatory compliance?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    text: "Choose the least strict requirements",
                    isCorrect: false,
                  },
                  {
                    text: "Eliminate national law compliance",
                    isCorrect: false,
                  },
                  {
                    text: "Reduce duplication and cost with unified activities",
                    isCorrect: true,
                  },
                  { text: "Delay compliance deadlines", isCorrect: false },
                ],
                explanation:
                  "Integrated programmes leverage synergies to reduce duplication and cost by 30-40%.",
                relatedArticles: ["Art. 74", "NIS2 Art. 21"],
              },
              {
                sortOrder: 5,
                questionText:
                  "True or False: Germany's SatDSiG is fully replaced by the EU Space Act.",
                questionType: "TRUE_FALSE",
                options: [
                  { text: "True", isCorrect: false },
                  { text: "False", isCorrect: true },
                ],
                explanation:
                  "False. SatDSiG addresses satellite data security not fully harmonized by the EU Space Act.",
                relatedArticles: ["Art. 104"],
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Course 5: Space Debris Mitigation
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: "space-debris-mitigation",
    title: "Space Debris Mitigation",
    subtitle: "Master Art. 58-72 debris requirements and IADC guidelines",
    description:
      "A comprehensive course on space debris mitigation under the EU Space Act covering Art. 58-72, IADC Guidelines, ISO 24113, end-of-life planning, passivation, and constellation-specific debris management.",
    icon: "Satellite",
    category: "EU_SPACE_ACT",
    level: "INTERMEDIATE",
    estimatedMinutes: 75,
    isPublished: true,
    isPremium: false,
    sortOrder: 5,
    tags: ["debris", "mitigation", "iadc", "end-of-life", "passivation"],
    relatedComplianceModules: ["debris", "environmental", "authorization"],
    modules: [
      {
        title: "EU Space Act Debris Requirements",
        description:
          "Art. 58-72 debris mitigation obligations, disposal timelines, and strategies.",
        sortOrder: 1,
        lessons: [
          {
            slug: "art-58-62-overview",
            title: "Art. 58-62: Core Debris Mitigation Obligations",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Debris Mitigation Under the EU Space Act",
                  paragraphs: [
                    "Art. 58 establishes the general principle: all operators must take appropriate measures to mitigate debris creation throughout the lifecycle. Art. 59 limits intentional debris release during normal operations. Art. 60 addresses minimizing accidental break-up through passivation.",
                    "Art. 61-62 establish the disposal framework: 5-year post-mission disposal for LEO (with trajectory toward zero debris), and graveyard orbit requirements for GEO (at least 300 km above the protected zone). These articles implement IADC Guidelines and ISO 24113 as binding EU law.",
                  ],
                  keyPoints: [
                    "Art. 58: general debris mitigation principle covering full lifecycle",
                    "Art. 59: limit intentional debris release",
                    "Art. 60: minimize accidental break-up through passivation",
                    "Art. 61-62: 5-year LEO disposal, GEO graveyard orbit",
                    "Implements IADC Guidelines and ISO 24113 as binding law",
                  ],
                },
              ],
            },
          },
          {
            slug: "disposal-timelines-and-strategies",
            title: "Disposal Timelines and Strategies",
            type: "THEORY",
            sortOrder: 2,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading: "Post-Mission Disposal Requirements",
                  paragraphs: [
                    "For LEO (below 2,000 km): 5-year post-mission disposal through active deorbit or orbital lifetime ensuring natural decay. For GEO (~35,786 km): graveyard orbit at least 300 km above the protected zone. For MEO: case-by-case assessment required.",
                    "The regulation signals trajectory toward zero-debris through delegated acts. Future measures may tighten the 5-year timeline, mandate active deorbit, or impose constellation debris budgets. Design spacecraft with margin for tighter future requirements.",
                  ],
                  keyPoints: [
                    "LEO: 5-year post-mission disposal",
                    "GEO: graveyard orbit 300+ km above protected zone",
                    "MEO: case-by-case assessment",
                    "Zero-debris trajectory through delegated acts",
                    "Design with margin for tighter future requirements",
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "IADC Guidelines and International Standards",
        description:
          "IADC Guidelines, ISO 24113, COPUOS LTS Guidelines, and passivation requirements.",
        sortOrder: 2,
        lessons: [
          {
            slug: "iadc-guidelines",
            title: "IADC Space Debris Mitigation Guidelines",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading: "IADC Guidelines and EU Space Act Implementation",
                  paragraphs: [
                    "The IADC Guidelines cover four areas: (1) limit debris during operations, (2) minimize break-up potential, (3) post-mission disposal, (4) collision avoidance. The EU Space Act maps these: Guideline 1 to Art. 59, Guideline 2 to Art. 60/63-65, Guideline 3 to Art. 61-62, Guideline 4 to Art. 52-57.",
                    "ISO 24113:2024 provides the technical standard. COPUOS Long-Term Sustainability Guidelines (2019) provide 21 additional guidelines for sustainable space activities.",
                  ],
                  keyPoints: [
                    "IADC: 4 guideline areas mapped to EU Space Act articles",
                    "ISO 24113:2024: technical standard for compliance demonstration",
                    "COPUOS LTS Guidelines (2019): 21 sustainability guidelines",
                    "EU Space Act makes these international standards binding",
                  ],
                },
              ],
            },
          },
          {
            slug: "passivation-requirements",
            title: "Passivation and End-of-Life Planning",
            type: "THEORY",
            sortOrder: 2,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading: "Art. 63-65: Passivation Requirements",
                  paragraphs: [
                    "Passivation: vent propellant, discharge batteries, de-spin wheels, depressurize vessels, deactivate high-voltage systems, orient to minimize cross-section. Most trackable debris comes from on-orbit explosions of unpassivated objects.",
                    "End-of-life planning must be designed from Phase 0/A. The debris mitigation plan must include: EOL sequence, passivation procedures per energy source, estimated post-passivation orbital lifetime, re-entry casualty risk assessment, and contingency plans for primary disposal failure.",
                  ],
                  keyPoints: [
                    "Passivation: vent, discharge, de-spin, depressurize, deactivate",
                    "Most debris from accidental fragmentation -- passivation is critical",
                    "EOL planning embedded from Phase 0/A design",
                    "Contingency plans required for disposal method failure",
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Constellation and Advanced Debris Topics",
        description: "Constellation-specific debris management and assessment.",
        sortOrder: 3,
        lessons: [
          {
            slug: "constellation-debris-management",
            title: "Constellation Debris Management",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 10,
            content: {
              sections: [
                {
                  heading: "Fleet-Level Debris Obligations",
                  paragraphs: [
                    "Constellation operators face amplified obligations: fleet-level collision avoidance, coordinated disposal scheduling, spare/failed satellite management, and aggregate environmental impact assessment.",
                    "Future delegated acts may impose: aggregate debris budgets, mandatory active deorbit for all constellation satellites, enhanced financial guarantees, and mandatory ADR contingency contracts for non-responsive satellites.",
                  ],
                  keyPoints: [
                    "Aggregate debris risk exceeds sum of individual satellites",
                    "Fleet collision avoidance and coordinated disposal required",
                    "Failed satellite management procedures mandatory",
                    "Future delegated acts may add debris budgets and ADR requirements",
                  ],
                },
              ],
            },
          },
          {
            slug: "debris-mitigation-quiz",
            title: "Debris Mitigation Quiz",
            type: "QUIZ",
            sortOrder: 2,
            estimatedMinutes: 10,
            questions: [
              {
                sortOrder: 1,
                questionText: "Current post-mission disposal timeline for LEO?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "25 years", isCorrect: false },
                  { text: "5 years", isCorrect: true },
                  { text: "10 years", isCorrect: false },
                  { text: "No specific timeline", isCorrect: false },
                ],
                explanation:
                  "Art. 61-62: 5-year post-mission disposal for LEO, more stringent than the traditional 25-year guideline.",
                relatedArticles: ["Art. 61", "Art. 62"],
              },
              {
                sortOrder: 2,
                questionText:
                  "Primary purpose of passivation under Art. 63-65?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "Reduce radar cross-section", isCorrect: false },
                  {
                    text: "Prevent accidental fragmentation from stored energy",
                    isCorrect: true,
                  },
                  { text: "Disable communications", isCorrect: false },
                  { text: "Transfer ownership to NCA", isCorrect: false },
                ],
                explanation:
                  "Passivation depletes stored energy to prevent fragmentation -- the single most effective debris prevention measure.",
                relatedArticles: ["Art. 63", "Art. 64", "Art. 65"],
              },
              {
                sortOrder: 3,
                questionText: "Standard GEO disposal strategy?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "Active deorbit to re-entry", isCorrect: false },
                  {
                    text: "Graveyard orbit 300+ km above GEO protected zone",
                    isCorrect: true,
                  },
                  {
                    text: "Leave in GEO with passivation only",
                    isCorrect: false,
                  },
                  { text: "Transfer to ADR provider", isCorrect: false },
                ],
                explanation:
                  "GEO disposal uses graveyard orbit at least 300 km above the protected zone per IADC guidelines.",
                relatedArticles: ["Art. 62"],
              },
              {
                sortOrder: 4,
                questionText:
                  "True or False: Art. 10 light regime exempts small operators from all debris requirements.",
                questionType: "TRUE_FALSE",
                options: [
                  { text: "True", isCorrect: false },
                  { text: "False", isCorrect: true },
                ],
                explanation:
                  "False. Light regime simplifies but does not eliminate debris obligations. Even CubeSats need a proportionate debris plan.",
                relatedArticles: ["Art. 10", "Art. 58"],
              },
              {
                sortOrder: 5,
                questionText:
                  "Additional debris obligations for constellation operators?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "No additional obligations", isCorrect: false },
                  {
                    text: "Fleet-level collision avoidance, coordinated disposal, aggregate impact assessment",
                    isCorrect: true,
                  },
                  { text: "Only larger insurance policy", isCorrect: false },
                  {
                    text: "Mandatory ADR for all failed satellites",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "Constellation operators must address aggregate impact: fleet collision avoidance, coordinated disposal, failed satellite management.",
                relatedArticles: ["Art. 58", "Art. 59", "Art. 60"],
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Course 6: Advanced Compliance Strategies
  // ═══════════════════════════════════════════════════════════════════════
  {
    slug: "advanced-compliance-strategies",
    title: "Advanced Compliance Strategies",
    subtitle:
      "Design and implement enterprise-grade space regulatory compliance programmes",
    description:
      "An expert-level course for compliance professionals managing multi-jurisdiction, multi-framework space regulatory programmes. Covers strategic programme design, jurisdiction optimization, regulatory intelligence, and compliance as competitive advantage.",
    icon: "Rocket",
    category: "ADVANCED_TOPICS",
    level: "EXPERT",
    estimatedMinutes: 120,
    isPublished: true,
    isPremium: true,
    sortOrder: 6,
    tags: [
      "advanced",
      "strategy",
      "multi-jurisdiction",
      "programme-design",
      "premium",
    ],
    relatedComplianceModules: [
      "authorization",
      "registration",
      "cybersecurity",
      "debris",
      "environmental",
      "insurance",
      "nis2",
      "supervision",
    ],
    modules: [
      {
        title: "Multi-Jurisdiction Compliance Strategy",
        description:
          "Optimize NCA selection, manage national requirements, plan for harmonization.",
        sortOrder: 1,
        lessons: [
          {
            slug: "jurisdiction-optimization",
            title: "Jurisdiction Selection and Optimization",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 15,
            content: {
              sections: [
                {
                  heading: "Strategic Jurisdiction Selection",
                  paragraphs: [
                    "While the EU Space Act harmonizes, choice of primary jurisdiction still matters: NCA maturity, speed, fees, national overlay, and supervisory culture vary. Strategic selection is legitimate optimization, not regulatory arbitrage.",
                    "Assessment factors: NCA experience (France/UK have decades vs. newer nations), processing timelines, fee structures, insurance minimums (varying from EUR 3.5M in NL to risk-based in FR), and ecosystem factors (brokers, counsel, technical support). Multi-jurisdiction operators can optimize through corporate structuring.",
                  ],
                  keyPoints: [
                    "Primary NCA determined by establishment -- jurisdiction choice matters",
                    "Factors: NCA maturity, speed, fees, national overlay, ecosystem",
                    "Strategic selection is legitimate, not arbitrage",
                    "Corporate structuring can optimize multi-jurisdiction burden",
                  ],
                },
              ],
            },
          },
          {
            slug: "transitional-compliance-planning",
            title: "Transitional Period Compliance Planning",
            type: "THEORY",
            sortOrder: 2,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Planning for the National-to-EU Transition",
                  paragraphs: [
                    "Key planning: inventory current national authorizations, map national to EU equivalents, identify gaps (new EU requirements not covered nationally), align timelines with phased implementation, budget for transition.",
                    "Approximately 60-70% of national compliance translates directly to EU Space Act equivalents. The remaining 30-40% requires new processes, documentation, or capabilities.",
                  ],
                  keyPoints: [
                    "Art. 104-119: transitional provisions govern migration",
                    "Grandfathering for existing authorizations",
                    "60-70% national compliance translates to EU equivalents",
                    "Budget for 30-40% new processes during transition",
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Compliance Programme Design",
        description:
          "Enterprise governance, resource allocation, and technology enablement.",
        sortOrder: 2,
        lessons: [
          {
            slug: "governance-and-organization",
            title: "Compliance Governance and Organization",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 15,
            content: {
              sections: [
                {
                  heading: "Enterprise Compliance Governance",
                  paragraphs: [
                    "Governance structure: (1) Board/C-level oversight aligned with NIS2 Art. 20, (2) Compliance programme manager, (3) Module owners per domain, (4) Cross-functional committee (engineering + operations + legal + finance), (5) NCA liaison.",
                    "Key activities: quarterly status reviews, annual internal audits, risk register maintenance, regulatory change monitoring, incident tracking, and training programmes.",
                  ],
                  keyPoints: [
                    "Board-level accountability per NIS2 Art. 20",
                    "Module owners for each compliance domain",
                    "Cross-functional committee",
                    "Quarterly reviews, annual audits, continuous monitoring",
                  ],
                },
              ],
            },
          },
          {
            slug: "compliance-technology-enablement",
            title: "Technology-Enabled Compliance",
            type: "THEORY",
            sortOrder: 2,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Leveraging Technology for Compliance",
                  paragraphs: [
                    "Compliance platforms provide: centralized requirement tracking, automated deadline management, evidence/document management, real-time dashboards, and audit trails.",
                    "Technology supports NCA interactions (automated reporting, inspection evidence packaging), NIS2 incident reporting (templates, workflows, evidence preservation), and integration with operations systems for real-time compliance status.",
                  ],
                  keyPoints: [
                    "Technology essential for multi-framework compliance at scale",
                    "Platforms: requirements, deadlines, evidence, dashboards, audit trail",
                    "NIS2 incident reporting: templates and automated workflows",
                    "Operations integration for real-time compliance status",
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Regulatory Intelligence and Future Planning",
        description:
          "Anticipate evolving regulation, delegated acts, and build long-term roadmaps.",
        sortOrder: 3,
        lessons: [
          {
            slug: "regulatory-intelligence-framework",
            title: "Building a Regulatory Intelligence Capability",
            type: "THEORY",
            sortOrder: 1,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Regulatory Intelligence for Space Operators",
                  paragraphs: [
                    "Reg intel covers: EU Space Act delegated/implementing acts (Art. 114-119), NIS2 sector-specific acts, national amendments, international developments (IADC, ISO, COPUOS), and adjacent regulations (dual-use, GDPR, CER).",
                    "Five-step capability: (1) Source monitoring (Official Journal, consultations, ENISA, IADC, national gazettes), (2) Impact assessment, (3) Timeline planning, (4) Stakeholder communication, (5) Advocacy participation. Delegated acts under Art. 114-119 will significantly evolve the framework post-entry-into-force.",
                  ],
                  keyPoints: [
                    "Monitor delegated acts, NIS2 implementing acts, national amendments, international developments",
                    "Five-step: monitor, assess, plan, communicate, advocate",
                    "Art. 114-119 delegated acts will significantly evolve the framework",
                    "Early capability provides advance notice and preparation time",
                  ],
                },
              ],
            },
          },
          {
            slug: "compliance-roadmap-design",
            title: "Designing a Multi-Year Compliance Roadmap",
            type: "THEORY",
            sortOrder: 2,
            estimatedMinutes: 12,
            content: {
              sections: [
                {
                  heading: "Multi-Year Compliance Roadmap",
                  paragraphs: [
                    "3-5 year roadmap: Year 1 (preparation) -- gap analysis, governance setup, platform selection, training. Year 2 (transition) -- authorization application/transition, URSO registration, NIS2 implementation. Year 3 (operational) -- steady-state, first annual cycle. Years 4-5 (maturation) -- delegated act implementation, optimization.",
                    "Budget: 0.5-2% of annual revenue steady-state, 2-3% during initial transition. Technology investment ROI typically 18-24 months.",
                  ],
                  keyPoints: [
                    "Year 1: gap analysis, governance, platform, training",
                    "Year 2: authorization transition, URSO, NIS2",
                    "Years 3-5: steady-state, delegated acts, optimization",
                    "Budget: 0.5-2% revenue steady-state, 2-3% transition",
                  ],
                },
              ],
            },
          },
          {
            slug: "advanced-compliance-quiz",
            title: "Advanced Compliance Strategies Quiz",
            type: "QUIZ",
            sortOrder: 3,
            estimatedMinutes: 15,
            questions: [
              {
                sortOrder: 1,
                questionText:
                  "Which articles govern delegated acts that add regulatory detail?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "Art. 44-51 (Insurance)", isCorrect: false },
                  { text: "Art. 114-119 (Delegated Acts)", isCorrect: true },
                  { text: "Art. 26-31 (Supervision)", isCorrect: false },
                  { text: "Art. 58-62 (Debris)", isCorrect: false },
                ],
                explanation:
                  "Art. 114-119 govern delegated acts that progressively add detail to the framework.",
                relatedArticles: ["Art. 114", "Art. 115", "Art. 119"],
              },
              {
                sortOrder: 2,
                questionText:
                  "Under NIS2 Art. 20, who is personally accountable for cybersecurity?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "The CISO", isCorrect: false },
                  { text: "The DPO", isCorrect: false },
                  {
                    text: "The management body (board/executive)",
                    isCorrect: true,
                  },
                  { text: "The NCA-appointed auditor", isCorrect: false },
                ],
                explanation:
                  "NIS2 Art. 20: management body accountability is personal and non-delegable.",
                relatedArticles: ["NIS2 Art. 20"],
              },
              {
                sortOrder: 3,
                questionText:
                  "What percentage of national compliance translates to EU Space Act equivalents?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "10-20%", isCorrect: false },
                  { text: "30-40%", isCorrect: false },
                  { text: "60-70%", isCorrect: true },
                  { text: "90-100%", isCorrect: false },
                ],
                explanation:
                  "Approximately 60-70% translates directly, with 30-40% requiring new processes.",
                relatedArticles: ["Art. 104"],
              },
              {
                sortOrder: 4,
                questionText:
                  "True or False: Choosing a jurisdiction with lighter national overlay is legitimate optimization.",
                questionType: "TRUE_FALSE",
                options: [
                  { text: "True", isCorrect: true },
                  { text: "False", isCorrect: false },
                ],
                explanation:
                  "True. Strategic jurisdiction selection is legitimate provided genuine establishment exists.",
                relatedArticles: ["Art. 4", "Art. 5", "Art. 11"],
              },
              {
                sortOrder: 5,
                questionText: "Typical steady-state compliance programme cost?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { text: "0.01-0.1% of revenue", isCorrect: false },
                  { text: "0.5-2% of revenue", isCorrect: true },
                  { text: "5-10% of revenue", isCorrect: false },
                  { text: "15-20% of revenue", isCorrect: false },
                ],
                explanation:
                  "0.5-2% steady-state, 2-3% during transition. Technology ROI in 18-24 months.",
                relatedArticles: [],
              },
            ],
          },
        ],
      },
    ],
  },
];
