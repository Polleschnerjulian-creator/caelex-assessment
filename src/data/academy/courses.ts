/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Academy course definitions with full educational content.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface CourseDefinition {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  category:
    | "EU_SPACE_ACT"
    | "NIS2"
    | "NATIONAL_SPACE_LAW"
    | "CROSS_REGULATORY"
    | "FUNDAMENTALS"
    | "ADVANCED_TOPICS";
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  estimatedMinutes: number;
  isPremium: boolean;
  tags: string[];
  relatedComplianceModules: string[];
  modules: CourseModuleDefinition[];
}

export interface CourseModuleDefinition {
  title: string;
  description: string;
  lessons: LessonDefinition[];
}

export interface LessonDefinition {
  slug: string;
  title: string;
  type:
    | "THEORY"
    | "INTERACTIVE"
    | "QUIZ"
    | "SIMULATION"
    | "CASE_STUDY"
    | "SANDBOX";
  estimatedMinutes: number;
  content?: ContentBlock[];
  simulationConfig?: SimulationConfig;
  questions?: QuestionDefinition[];
}

export interface ContentBlock {
  type:
    | "heading"
    | "paragraph"
    | "regulation_quote"
    | "key_concept"
    | "list"
    | "callout"
    | "article_reference"
    | "comparison_table"
    | "timeline";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface SimulationConfig {
  scenarioId: string;
  description: string;
  expectedOutcome: Record<string, unknown>;
}

export interface QuestionDefinition {
  questionText: string;
  questionType:
    | "MULTIPLE_CHOICE"
    | "MULTIPLE_SELECT"
    | "TRUE_FALSE"
    | "ARTICLE_LOOKUP"
    | "OPERATOR_CLASSIFY"
    | "SCENARIO_DECISION"
    | "JURISDICTION_COMPARE";
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation: string;
  hint?: string;
  relatedArticles?: string[];
  scenarioContext?: Record<string, unknown>;
}

// ─── Course Definitions ───

export const academyCourses: CourseDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // Course 1: EU Space Act Fundamentals
  // ═══════════════════════════════════════════════════════════════
  {
    slug: "eu-space-act-fundamentals",
    title: "EU Space Act Fundamentals",
    subtitle: "Master the essentials of COM(2025) 335",
    description:
      "A comprehensive introduction to the EU Space Act, covering its structure, the 7 operator types, standard vs. light regime, and all 8 compliance modules. Ideal for compliance officers, legal teams, and space industry professionals new to the regulation.",
    icon: "BookOpen",
    category: "EU_SPACE_ACT",
    level: "BEGINNER",
    estimatedMinutes: 90,
    isPremium: false,
    tags: ["eu-space-act", "fundamentals", "compliance"],
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
      // ── Module 1: Why the EU Space Act Exists ──
      {
        title: "Why the EU Space Act Exists",
        description:
          "Understand the historical context, regulatory gap, and policy objectives behind the EU Space Act.",
        lessons: [
          // Lesson 1.1
          {
            slug: "the-regulatory-gap",
            title: "The Regulatory Gap",
            type: "THEORY",
            estimatedMinutes: 15,
            content: [
              {
                type: "heading",
                content: "The Evolution of Space Regulation",
              },
              {
                type: "paragraph",
                content:
                  "The governance of outer space began with the Outer Space Treaty (OST) of 1967, which established the foundational principles of space law. Its key provisions include Article I on the freedom of exploration, Article II prohibiting national appropriation, Article III requiring activities to be conducted in accordance with international law, Article VI establishing state responsibility for national activities in outer space (whether carried out by governmental agencies or non-governmental entities), and Article VII defining liability for damage caused by space objects. This treaty framework was designed for a world with roughly 10 state-run space programmes and a handful of satellites.",
              },
              {
                type: "key_concept",
                content:
                  "State Responsibility (Art. VI OST): States bear international responsibility for national activities in outer space, whether carried out by governmental agencies or non-governmental entities. This means every private satellite operator creates an obligation on its home state.",
              },
              {
                type: "paragraph",
                content:
                  "By 2025, over 10,000 active satellites orbit Earth, operated by thousands of private companies across dozens of countries. The original treaty framework, designed for government space agencies, cannot adequately address the challenges of: mega-constellations such as Starlink with 6,000+ satellites, commercial launch services from dozens of providers, in-orbit servicing and manufacturing, space tourism, and the exponential growth of space debris now tracked at over 36,000 objects larger than 10 cm.",
              },
              {
                type: "regulation_quote",
                content:
                  "The EU Space Act (COM(2025) 335) establishes a comprehensive regulatory framework for space activities within the Union, ensuring safety, sustainability, and security of space operations.",
                metadata: { source: "COM(2025) 335, Recital 1" },
              },
              {
                type: "paragraph",
                content:
                  "The EU Space Act introduces 119 articles across 8 compliance domains, creating the first comprehensive supranational space regulation. It applies to all operators conducting space activities within EU jurisdiction or providing services to EU customers. Unlike fragmented national approaches, the Act creates a harmonized internal market for space services while maintaining safety, sustainability, and security standards.",
              },
              {
                type: "callout",
                content:
                  "The EU is the first supranational body to propose a comprehensive space regulation covering the full lifecycle of space operations \u2014 from authorization through end-of-life disposal.",
                metadata: { variant: "info" },
              },
            ],
          },
          // Lesson 1.2
          {
            slug: "structure-of-the-eu-space-act",
            title: "Structure of the EU Space Act",
            type: "THEORY",
            estimatedMinutes: 15,
            content: [
              {
                type: "heading",
                content: "119 Articles, 8 Compliance Domains",
              },
              {
                type: "paragraph",
                content:
                  "The EU Space Act is structured around 8 core compliance modules that cover the full lifecycle of space operations. Each module maps to specific articles and imposes distinct obligations depending on the operator type and regime (standard or light).",
              },
              {
                type: "list",
                content:
                  "1. Authorization & Licensing (Art. 6\u201316) \u2014 No space activity without NCA authorization\n2. Registration (Art. 32\u201339) \u2014 Union Register of Space Objects (URSO)\n3. Cybersecurity (Art. 40\u201348) \u2014 NIS2-aligned security requirements\n4. Space Debris Mitigation (Art. 49\u201358) \u2014 End-of-life and collision avoidance\n5. Environmental Protection (Art. 59\u201365) \u2014 Environmental Footprint Declarations\n6. Insurance & Liability (Art. 66\u201372) \u2014 Third-party liability coverage\n7. NIS2 Overlay \u2014 Directive (EU) 2022/2555 cybersecurity layer\n8. Supervision & Enforcement (Art. 73\u201382) \u2014 Ongoing monitoring and penalties",
              },
              {
                type: "key_concept",
                content:
                  "Regulatory Stack: The EU Space Act does not replace national space laws or NIS2 \u2014 it creates an additional EU-level layer that harmonizes requirements across member states while coexisting with existing frameworks. Operators must comply with all applicable layers simultaneously.",
              },
              {
                type: "paragraph",
                content:
                  "The regulation interacts with the NIS2 Directive (EU 2022/2555) for cybersecurity, which lists space as a sector of high criticality in its Annex I, Sector 11. It also coexists with national space laws across 10 European jurisdictions (France, Germany, UK, Belgium, Netherlands, Luxembourg, Austria, Denmark, Italy, and Norway) and with international obligations under the five UN space treaties.",
              },
              {
                type: "comparison_table",
                content:
                  "EU Space Act vs National Laws: The Act creates harmonized EU-wide requirements while National Competent Authorities (NCAs) retain implementation and enforcement powers. National laws may impose stricter requirements but cannot lower the EU baseline. For example, the French LOS (2008) will continue to apply alongside the EU Space Act for operators under French jurisdiction.",
                metadata: {
                  columns: ["Aspect", "EU Space Act", "National Laws"],
                  rows: [
                    ["Scope", "EU-wide harmonized", "Jurisdiction-specific"],
                    [
                      "Enforcement",
                      "NCAs per member state",
                      "National authorities",
                    ],
                    [
                      "Baseline",
                      "Sets minimum EU standard",
                      "May exceed EU requirements",
                    ],
                    ["Coexistence", "Additional layer", "Existing framework"],
                  ],
                },
              },
              {
                type: "article_reference",
                content:
                  "Art. 1\u20135 set out the subject matter, scope, free movement principles, national security carve-outs, and key definitions that underpin the entire regulation.",
                metadata: { articles: ["1", "2", "3", "4", "5"] },
              },
            ],
          },
          // Lesson 1.3
          {
            slug: "check-your-understanding-intro",
            title: "Check Your Understanding",
            type: "QUIZ",
            estimatedMinutes: 10,
            questions: [
              {
                questionText: "When was the Outer Space Treaty signed?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "1957", isCorrect: false },
                  { id: "b", text: "1967", isCorrect: true },
                  { id: "c", text: "1972", isCorrect: false },
                  { id: "d", text: "1979", isCorrect: false },
                ],
                explanation:
                  "The Outer Space Treaty was opened for signature on 27 January 1967 and entered into force on 10 October 1967.",
              },
              {
                questionText:
                  "How many articles does the EU Space Act contain?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "67", isCorrect: false },
                  { id: "b", text: "82", isCorrect: false },
                  { id: "c", text: "99", isCorrect: false },
                  { id: "d", text: "119", isCorrect: true },
                ],
                explanation:
                  "The EU Space Act contains 119 articles organized across 8 compliance domains.",
              },
              {
                questionText:
                  "Which article of the Outer Space Treaty establishes state responsibility for national space activities?",
                questionType: "ARTICLE_LOOKUP",
                options: [
                  { id: "a", text: "Article III", isCorrect: false },
                  { id: "b", text: "Article VI", isCorrect: true },
                  { id: "c", text: "Article VII", isCorrect: false },
                  { id: "d", text: "Article IX", isCorrect: false },
                ],
                explanation:
                  "Article VI OST states that States Parties bear international responsibility for national activities in outer space.",
                relatedArticles: ["OST Art. VI"],
              },
              {
                questionText:
                  "The EU Space Act replaces existing national space laws.",
                questionType: "TRUE_FALSE",
                options: [
                  { id: "a", text: "True", isCorrect: false },
                  { id: "b", text: "False", isCorrect: true },
                ],
                explanation:
                  "The EU Space Act creates an additional EU-level layer that coexists with national space laws and harmonizes requirements.",
              },
              {
                questionText:
                  "How many compliance domains does the EU Space Act cover?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "5", isCorrect: false },
                  { id: "b", text: "6", isCorrect: false },
                  { id: "c", text: "8", isCorrect: true },
                  { id: "d", text: "10", isCorrect: false },
                ],
                explanation:
                  "The 8 domains are: Authorization, Registration, Cybersecurity, Debris, Environmental, Insurance, NIS2, and Supervision.",
              },
              {
                questionText:
                  "Which EU directive does the Space Act interact with for cybersecurity requirements?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "GDPR", isCorrect: false },
                  { id: "b", text: "NIS2 (EU 2022/2555)", isCorrect: true },
                  { id: "c", text: "AI Act", isCorrect: false },
                  { id: "d", text: "DORA", isCorrect: false },
                ],
                explanation:
                  "The NIS2 Directive provides the cybersecurity framework that the EU Space Act builds upon for space operators. Space is listed in NIS2 Annex I, Sector 11.",
              },
              {
                questionText:
                  "Approximately how many active satellites were in orbit by 2025?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "About 1,000", isCorrect: false },
                  { id: "b", text: "About 5,000", isCorrect: false },
                  { id: "c", text: "Over 10,000", isCorrect: true },
                  { id: "d", text: "Over 50,000", isCorrect: false },
                ],
                explanation:
                  "By 2025, over 10,000 active satellites orbit Earth, a dramatic increase from the few hundred in the 1990s.",
              },
              {
                questionText:
                  "The EU Space Act applies only to EU-headquartered companies.",
                questionType: "TRUE_FALSE",
                options: [
                  { id: "a", text: "True", isCorrect: false },
                  { id: "b", text: "False", isCorrect: true },
                ],
                explanation:
                  "The Act applies to operators conducting space activities within EU jurisdiction or providing services to EU customers, including third-country operators (TCO).",
              },
              {
                questionText:
                  "Which article range covers Space Debris Mitigation?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "Art. 6\u201316", isCorrect: false },
                  { id: "b", text: "Art. 40\u201348", isCorrect: false },
                  { id: "c", text: "Art. 49\u201358", isCorrect: true },
                  { id: "d", text: "Art. 66\u201372", isCorrect: false },
                ],
                explanation:
                  "Articles 49\u201358 cover space debris mitigation requirements including end-of-life disposal and collision avoidance.",
                relatedArticles: [
                  "49",
                  "50",
                  "51",
                  "52",
                  "53",
                  "54",
                  "55",
                  "56",
                  "57",
                  "58",
                ],
              },
              {
                questionText:
                  "Who retains implementation and enforcement powers under the EU Space Act?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "European Commission", isCorrect: false },
                  { id: "b", text: "ESA", isCorrect: false },
                  {
                    id: "c",
                    text: "National Competent Authorities (NCAs)",
                    isCorrect: true,
                  },
                  { id: "d", text: "EUSPA", isCorrect: false },
                ],
                explanation:
                  "While the EU Space Act creates harmonized requirements, NCAs retain implementation and enforcement powers within their respective member states.",
              },
            ],
          },
        ],
      },

      // ── Module 2: Operator Types & Classification ──
      {
        title: "Operator Types & Classification",
        description:
          "Learn to identify and classify the 7 operator types defined by the EU Space Act.",
        lessons: [
          // Lesson 2.1
          {
            slug: "the-7-operator-types",
            title: "The 7 Operator Types",
            type: "THEORY",
            estimatedMinutes: 15,
            content: [
              {
                type: "heading",
                content: "Understanding Operator Classification",
              },
              {
                type: "paragraph",
                content:
                  "The EU Space Act defines 7 distinct operator types, each with tailored compliance obligations. Correct classification is the critical first step in any compliance assessment, as it determines which articles apply and what level of regulatory burden the operator faces.",
              },
              {
                type: "key_concept",
                content:
                  "SCO \u2014 Spacecraft Operator: Entities that operate spacecraft in orbit. Examples include OHB SE (Germany), Planet Labs, and Eutelsat. SCOs face the broadest set of obligations covering authorization, registration, debris mitigation, cybersecurity, environmental footprint, and insurance.",
              },
              {
                type: "key_concept",
                content:
                  "LO \u2014 Launch Operator: Entities that conduct launch operations. Examples include Isar Aerospace, Arianespace, and RFA (Rocket Factory Augsburg). LOs must obtain launch authorization, maintain insurance, and comply with safety and debris requirements.",
              },
              {
                type: "key_concept",
                content:
                  "LSO \u2014 Launch Site Operator: Entities that operate launch facilities. Examples include Esrange Space Center (Sweden) and Centre Spatial Guyanais (CSG, French Guiana). LSOs have specific site safety, environmental, and authorization obligations.",
              },
              {
                type: "key_concept",
                content:
                  "ISOS \u2014 In-Space Operations & Services Provider: Entities performing in-orbit servicing, debris removal, or satellite manufacturing. Examples include ClearSpace (debris removal), Astroscale (end-of-life services), and D-Orbit (last-mile delivery). This is a novel category reflecting the emerging in-space economy.",
              },
              {
                type: "key_concept",
                content:
                  "CAP \u2014 Collision Avoidance Provider: Entities providing space situational awareness and collision avoidance services. This includes operators of tracking networks and providers of conjunction assessment data.",
              },
              {
                type: "key_concept",
                content:
                  "PDP \u2014 Primary Data Provider: Entities that generate and distribute space-based data as a primary product. Examples include Airbus Defence & Space (Earth observation imagery), ICEYE (SAR data), and Spire Global (AIS/weather data).",
              },
              {
                type: "key_concept",
                content:
                  "TCO \u2014 Third Country Operator: Non-EU operators that provide space services to EU customers or conduct activities affecting EU space infrastructure. TCOs must comply with relevant EU Space Act provisions to access the EU market, similar to GDPR's extraterritorial scope.",
              },
              {
                type: "callout",
                content:
                  "An operator can hold multiple classifications simultaneously. For example, a company that builds, launches, and operates its own satellites could be classified as both SCO and LO, inheriting the combined obligations of both types.",
                metadata: { variant: "warning" },
              },
            ],
          },
          // Lesson 2.2
          {
            slug: "classify-the-operator",
            title: "Classify the Operator",
            type: "INTERACTIVE",
            estimatedMinutes: 15,
            content: [
              {
                type: "heading",
                content: "Operator Classification Exercise",
              },
              {
                type: "paragraph",
                content:
                  "Review each company profile below and determine the correct operator classification. Consider the primary activity, service offering, and customer base.",
              },
              {
                type: "paragraph",
                content:
                  "Profile 1: SkyView GmbH \u2014 A Berlin-based company operating a constellation of 40 Earth observation microsatellites in LEO, providing imagery data to EU government agencies.",
                metadata: {
                  correctClassification: "SCO",
                  companyId: "skyview",
                },
              },
              {
                type: "paragraph",
                content:
                  "Profile 2: NovaLaunch S.A. \u2014 A French startup developing a small launch vehicle capable of placing 300 kg payloads into LEO from a mobile launch platform.",
                metadata: {
                  correctClassification: "LO",
                  companyId: "novalaunch",
                },
              },
              {
                type: "paragraph",
                content:
                  "Profile 3: Arctic Spaceport AB \u2014 A Swedish company operating a polar launch facility in northern Sweden with two launch pads and ground infrastructure.",
                metadata: {
                  correctClassification: "LSO",
                  companyId: "arctic-spaceport",
                },
              },
              {
                type: "paragraph",
                content:
                  "Profile 4: OrbitFix Ltd \u2014 A UK company providing in-orbit satellite refueling and life-extension services using a fleet of servicing spacecraft.",
                metadata: {
                  correctClassification: "ISOS",
                  companyId: "orbitfix",
                },
              },
              {
                type: "paragraph",
                content:
                  "Profile 5: SpaceTrack Analytics \u2014 A Dutch company operating a global network of optical and radar sensors for space object tracking and conjunction assessment.",
                metadata: {
                  correctClassification: "CAP",
                  companyId: "spacetrack",
                },
              },
              {
                type: "paragraph",
                content:
                  "Profile 6: TerraSight Inc. \u2014 A US company generating and selling high-resolution SAR imagery data from its constellation to European agricultural monitoring agencies.",
                metadata: {
                  correctClassification: "TCO",
                  companyId: "terrasight",
                },
              },
              {
                type: "paragraph",
                content:
                  "Profile 7: DataOrbit S.r.l. \u2014 An Italian company operating 12 weather monitoring satellites and directly distributing meteorological data products to EU customers.",
                metadata: {
                  correctClassification: "PDP",
                  companyId: "dataorbit",
                },
              },
              {
                type: "paragraph",
                content:
                  "Profile 8: CleanSpace AG \u2014 A Swiss company developing and deploying spacecraft designed to capture and deorbit defunct satellites and large debris objects.",
                metadata: {
                  correctClassification: "ISOS",
                  companyId: "cleanspace",
                },
              },
            ],
          },
          // Lesson 2.3
          {
            slug: "operator-classification-challenge",
            title: "Operator Classification Challenge",
            type: "QUIZ",
            estimatedMinutes: 10,
            questions: [
              {
                questionText:
                  "A startup building and operating a fleet of 20 LEO Earth observation satellites. What is the correct classification?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "SCO", isCorrect: true },
                  { id: "b", text: "LO", isCorrect: false },
                  { id: "c", text: "PDP", isCorrect: false },
                  { id: "d", text: "ISOS", isCorrect: false },
                ],
                explanation:
                  "Operating spacecraft in orbit is the defining activity of a Spacecraft Operator (SCO). While they may also distribute data, their primary classification is SCO.",
                scenarioContext: {
                  activity: "spacecraft_operation",
                  orbit: "LEO",
                  constellation: true,
                },
              },
              {
                questionText:
                  "A company providing satellite servicing including refueling and orbit adjustment. What is the correct classification?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "SCO", isCorrect: false },
                  { id: "b", text: "ISOS", isCorrect: true },
                  { id: "c", text: "CAP", isCorrect: false },
                  { id: "d", text: "LO", isCorrect: false },
                ],
                explanation:
                  "In-orbit servicing (refueling, orbit adjustment, life extension) is the defining activity of an In-Space Operations & Services (ISOS) provider.",
              },
              {
                questionText:
                  "A Japanese company selling synthetic aperture radar (SAR) imagery to EU defence contractors. What is the correct classification?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "PDP", isCorrect: false },
                  { id: "b", text: "SCO", isCorrect: false },
                  { id: "c", text: "TCO", isCorrect: true },
                  { id: "d", text: "CAP", isCorrect: false },
                ],
                explanation:
                  "As a non-EU entity serving EU customers, this company is classified as a Third Country Operator (TCO). Note that defence activities may be partially excluded under Art. 4.",
                hint: "Consider the company's country of establishment and its customer base.",
              },
              {
                questionText:
                  "A company operating a spaceport with two launch pads in Portugal. What is the correct classification?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "LO", isCorrect: false },
                  { id: "b", text: "LSO", isCorrect: true },
                  { id: "c", text: "SCO", isCorrect: false },
                  { id: "d", text: "ISOS", isCorrect: false },
                ],
                explanation:
                  "Operating a launch facility (spaceport) is the defining activity of a Launch Site Operator (LSO), distinct from the Launch Operator (LO) who conducts the actual launches.",
              },
              {
                questionText:
                  "A German company developing a micro-launcher for small satellite deployment. What is the correct classification?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "SCO", isCorrect: false },
                  { id: "b", text: "LSO", isCorrect: false },
                  { id: "c", text: "LO", isCorrect: true },
                  { id: "d", text: "ISOS", isCorrect: false },
                ],
                explanation:
                  "Developing and conducting launch operations with a launch vehicle is the defining activity of a Launch Operator (LO).",
              },
              {
                questionText:
                  "A company operating a network of ground-based telescopes providing conjunction warnings to satellite operators. What is the correct classification?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "PDP", isCorrect: false },
                  { id: "b", text: "CAP", isCorrect: true },
                  { id: "c", text: "SCO", isCorrect: false },
                  { id: "d", text: "ISOS", isCorrect: false },
                ],
                explanation:
                  "Providing space situational awareness and collision avoidance services is the defining activity of a Collision Avoidance Provider (CAP).",
              },
              {
                questionText:
                  "An Italian company operating a constellation of communication satellites and selling bandwidth to EU telecom companies. What is the correct classification?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "SCO", isCorrect: true },
                  { id: "b", text: "PDP", isCorrect: false },
                  { id: "c", text: "TCO", isCorrect: false },
                  { id: "d", text: "CAP", isCorrect: false },
                ],
                explanation:
                  "Operating communication satellites makes this a Spacecraft Operator (SCO). PDP specifically refers to entities generating and distributing space-based data as a primary product.",
              },
              {
                questionText:
                  "A Luxembourg company generating and distributing high-resolution multispectral imagery from its own satellite constellation. What is the correct classification?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "PDP", isCorrect: true },
                  { id: "b", text: "SCO", isCorrect: false },
                  { id: "c", text: "TCO", isCorrect: false },
                  { id: "d", text: "ISOS", isCorrect: false },
                ],
                explanation:
                  "When an entity's primary business is generating and distributing space-based data products, they are classified as a Primary Data Provider (PDP). They may also hold SCO classification for the spacecraft operations aspect.",
              },
              {
                questionText:
                  "A US company that wants to provide debris removal services to EU satellite operators using its robotic capture spacecraft. What is the correct classification?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "ISOS", isCorrect: false },
                  { id: "b", text: "TCO", isCorrect: true },
                  { id: "c", text: "SCO", isCorrect: false },
                  { id: "d", text: "CAP", isCorrect: false },
                ],
                explanation:
                  "While the activity itself is in-space servicing, the company is a non-EU entity serving EU customers, so the primary classification for EU Space Act purposes is Third Country Operator (TCO).",
              },
              {
                questionText:
                  "A Belgian university operating a single CubeSat for atmospheric research. What is the correct classification?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "SCO", isCorrect: true },
                  { id: "b", text: "PDP", isCorrect: false },
                  { id: "c", text: "CAP", isCorrect: false },
                  { id: "d", text: "Not within scope", isCorrect: false },
                ],
                explanation:
                  "Even a university operating a single CubeSat is classified as a Spacecraft Operator (SCO). However, as a research entity they would likely qualify for the light regime under Art. 10.",
                hint: "Consider the activity type, not the organization's nature.",
              },
              {
                questionText:
                  "A company developing an in-orbit 3D printing facility for manufacturing spacecraft components in microgravity. What is the correct classification?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "SCO", isCorrect: false },
                  { id: "b", text: "ISOS", isCorrect: true },
                  { id: "c", text: "LO", isCorrect: false },
                  { id: "d", text: "PDP", isCorrect: false },
                ],
                explanation:
                  "In-orbit manufacturing is classified as an In-Space Operations & Services (ISOS) activity. This is one of the novel categories in the EU Space Act reflecting the emerging in-space economy.",
              },
              {
                questionText:
                  "A Norwegian company operating a Svalbard ground station providing TT&C services to multiple satellite operators. What is the most likely classification?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "SCO", isCorrect: false },
                  { id: "b", text: "PDP", isCorrect: false },
                  { id: "c", text: "CAP", isCorrect: false },
                  {
                    id: "d",
                    text: "None of the above \u2014 ground-only operators may fall under NIS2 instead",
                    isCorrect: true,
                  },
                ],
                explanation:
                  "Ground station operators that do not operate spacecraft themselves are not directly classified under the EU Space Act\u2019s 7 operator types. However, they may fall under NIS2 as providers of critical infrastructure supporting space operations.",
              },
            ],
          },
        ],
      },

      // ── Module 3: Standard vs. Light Regime ──
      {
        title: "Standard vs. Light Regime",
        description:
          "Understand who qualifies for simplified requirements under Art. 10 and how the two regimes differ.",
        lessons: [
          // Lesson 3.1
          {
            slug: "who-gets-simplified-requirements",
            title: "Who Gets Simplified Requirements?",
            type: "THEORY",
            estimatedMinutes: 10,
            content: [
              {
                type: "heading",
                content: "The Light Regime Under Art. 10",
              },
              {
                type: "paragraph",
                content:
                  "The EU Space Act recognizes that a one-size-fits-all regulatory approach would be disproportionate for smaller operators. Article 10 introduces a light regime with simplified requirements for qualifying entities, reducing administrative burden while maintaining essential safety standards.",
              },
              {
                type: "key_concept",
                content:
                  "Light Regime Eligibility: To qualify for the light regime, an entity must meet at least one of the following criteria: (1) Small enterprise with fewer than 50 employees and annual turnover below EUR 10 million, or (2) Research entity conducting non-commercial space activities primarily for scientific purposes.",
              },
              {
                type: "regulation_quote",
                content:
                  "Article 10 provides for a simplified pre-authorization procedure for small enterprises and research entities, with reduced documentation requirements and expedited review timelines.",
                metadata: { source: "COM(2025) 335, Art. 10" },
              },
              {
                type: "list",
                content:
                  "Key differences under the light regime:\n\u2022 Simplified pre-authorization process with reduced documentation\n\u2022 Expedited NCA review timeline\n\u2022 Reduced ongoing reporting frequency\n\u2022 Simplified environmental footprint assessment\n\u2022 Lower minimum insurance thresholds (where applicable)\n\u2022 Streamlined cybersecurity self-assessment instead of full audit",
              },
              {
                type: "callout",
                content:
                  "Important: The light regime does NOT exempt operators from core safety requirements. Debris mitigation, basic cybersecurity, and registration obligations still apply in full. The light regime only simplifies HOW compliance is demonstrated.",
                metadata: { variant: "warning" },
              },
              {
                type: "paragraph",
                content:
                  "Operators must self-assess their eligibility for the light regime and declare this in their authorization application. The NCA retains the right to require standard regime compliance if the operator's activities pose elevated risk, such as operating in congested orbital regions or handling sensitive data.",
              },
            ],
          },
          // Lesson 3.2
          {
            slug: "your-first-compliance-assessment",
            title: "Your First Compliance Assessment",
            type: "SIMULATION",
            estimatedMinutes: 20,
            simulationConfig: {
              scenarioId: "first-assessment",
              description:
                "Walk through a side-by-side comparison of standard vs. light regime compliance requirements for a small Earth observation startup operating 3 CubeSats in LEO. Compare the documentation, timelines, and reporting obligations under each regime.",
              expectedOutcome: {
                regime: "light",
                eligibilityBasis: "small_enterprise",
                reducedRequirements: [
                  "simplified_pre_authorization",
                  "reduced_reporting",
                  "simplified_environmental_assessment",
                  "streamlined_cybersecurity",
                ],
                unchangedRequirements: [
                  "debris_mitigation",
                  "registration",
                  "basic_cybersecurity",
                  "authorization_required",
                ],
              },
            },
            content: [
              {
                type: "heading",
                content: "Simulation: Standard vs. Light Regime Comparison",
              },
              {
                type: "paragraph",
                content:
                  "In this simulation, you will assess a small Earth observation startup and determine which regime applies. You will then compare the compliance requirements under each regime to understand the practical differences.",
              },
              {
                type: "key_concept",
                content:
                  "Scenario: StellarSense GmbH is a Munich-based startup with 12 employees and EUR 2.3M annual turnover. They plan to operate 3 CubeSats (6U form factor) in a 550 km sun-synchronous orbit for agricultural monitoring.",
              },
              {
                type: "paragraph",
                content:
                  "Step 1: Determine the operator type. StellarSense operates spacecraft, so they are classified as SCO (Spacecraft Operator).\nStep 2: Check light regime eligibility. With 12 employees and EUR 2.3M turnover, they qualify as a small enterprise under Art. 10.\nStep 3: Compare the requirements side by side to understand what is simplified and what remains unchanged.",
              },
            ],
          },
          // Lesson 3.3
          {
            slug: "regime-determination-quiz",
            title: "Regime Determination",
            type: "QUIZ",
            estimatedMinutes: 8,
            questions: [
              {
                questionText:
                  "A company with 45 employees and EUR 8M turnover operating a single GEO communication satellite. Which regime applies?",
                questionType: "SCENARIO_DECISION",
                options: [
                  { id: "a", text: "Standard regime", isCorrect: false },
                  { id: "b", text: "Light regime", isCorrect: true },
                  { id: "c", text: "Exempt from regulation", isCorrect: false },
                  {
                    id: "d",
                    text: "Depends on NCA decision",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "With fewer than 50 employees and turnover below EUR 10M, this company qualifies as a small enterprise under Art. 10 light regime. However, GEO operations may cause the NCA to apply stricter requirements.",
              },
              {
                questionText:
                  "A university research lab with 8 staff operating a CubeSat for ionosphere research. Which regime applies?",
                questionType: "SCENARIO_DECISION",
                options: [
                  { id: "a", text: "Standard regime", isCorrect: false },
                  { id: "b", text: "Light regime", isCorrect: true },
                  { id: "c", text: "Fully exempt", isCorrect: false },
                  { id: "d", text: "NIS2 only", isCorrect: false },
                ],
                explanation:
                  "Research entities conducting non-commercial space activities qualify for the light regime under Art. 10.",
              },
              {
                questionText:
                  "A company with 200 employees operating a mega-constellation of 500 LEO satellites. Which regime applies?",
                questionType: "SCENARIO_DECISION",
                options: [
                  { id: "a", text: "Standard regime", isCorrect: true },
                  { id: "b", text: "Light regime", isCorrect: false },
                  { id: "c", text: "Enhanced regime", isCorrect: false },
                  {
                    id: "d",
                    text: "Light regime with NCA override",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "With 200 employees, this company exceeds the small enterprise threshold and must comply under the standard regime.",
              },
              {
                questionText:
                  "The light regime exempts qualifying operators from space debris mitigation requirements.",
                questionType: "TRUE_FALSE",
                options: [
                  { id: "a", text: "True", isCorrect: false },
                  { id: "b", text: "False", isCorrect: true },
                ],
                explanation:
                  "The light regime does NOT exempt operators from core safety requirements. Debris mitigation obligations apply in full regardless of regime.",
              },
              {
                questionText:
                  "What is the maximum number of employees for light regime eligibility as a small enterprise?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "10", isCorrect: false },
                  { id: "b", text: "25", isCorrect: false },
                  { id: "c", text: "50", isCorrect: true },
                  { id: "d", text: "250", isCorrect: false },
                ],
                explanation:
                  "Small enterprises must have fewer than 50 employees and annual turnover below EUR 10 million to qualify for the light regime.",
              },
              {
                questionText:
                  "What is the maximum annual turnover for light regime eligibility?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "EUR 2 million", isCorrect: false },
                  { id: "b", text: "EUR 5 million", isCorrect: false },
                  { id: "c", text: "EUR 10 million", isCorrect: true },
                  { id: "d", text: "EUR 50 million", isCorrect: false },
                ],
                explanation:
                  "The light regime threshold is EUR 10 million annual turnover, combined with fewer than 50 employees.",
              },
              {
                questionText:
                  "A small research startup (15 employees, EUR 1M turnover) wants to launch a constellation of 80 satellites. Can they use the light regime?",
                questionType: "SCENARIO_DECISION",
                options: [
                  {
                    id: "a",
                    text: "Yes, they meet the size criteria",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "Yes, but the NCA may override to standard",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "No, constellation operators are excluded",
                    isCorrect: false,
                  },
                  {
                    id: "d",
                    text: "No, only research entities qualify",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "While the company meets the size criteria, the NCA retains the right to require standard regime compliance if activities pose elevated risk. An 80-satellite constellation in LEO represents significant collision risk.",
              },
              {
                questionText:
                  "Which of the following is simplified under the light regime?",
                questionType: "MULTIPLE_SELECT",
                options: [
                  {
                    id: "a",
                    text: "Pre-authorization documentation",
                    isCorrect: true,
                  },
                  {
                    id: "b",
                    text: "Ongoing reporting frequency",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "Debris mitigation obligations",
                    isCorrect: false,
                  },
                  {
                    id: "d",
                    text: "Environmental footprint assessment",
                    isCorrect: true,
                  },
                ],
                explanation:
                  "Pre-authorization documentation, reporting frequency, and environmental footprint assessment are all simplified under the light regime. Debris mitigation obligations remain unchanged.",
              },
            ],
          },
        ],
      },

      // ── Module 4: The 8 Compliance Modules ──
      {
        title: "The 8 Compliance Modules",
        description:
          "Deep dive into each of the 8 compliance domains defined by the EU Space Act.",
        lessons: [
          // Lesson 4.1
          {
            slug: "authorization-and-registration",
            title: "Authorization & Registration",
            type: "THEORY",
            estimatedMinutes: 10,
            content: [
              {
                type: "heading",
                content: "Module 1: Authorization & Licensing (Art. 6\u201316)",
              },
              {
                type: "paragraph",
                content:
                  "Authorization is the foundational gate-keeping obligation of the EU Space Act. Article 6 establishes that no space activity may be conducted without prior authorization from the relevant National Competent Authority (NCA). The application procedure (Art. 7) requires submission of a comprehensive technical file, and the NCA must issue its decision (Art. 8) within the prescribed timeline.",
              },
              {
                type: "regulation_quote",
                content:
                  "No natural or legal person shall carry out space activities within the scope of this Regulation without having obtained an authorization from the competent national authority.",
                metadata: { source: "COM(2025) 335, Art. 6(1)" },
              },
              {
                type: "key_concept",
                content:
                  "The authorization application must include: operator identification, technical description of the space activity, mission plan, risk assessment, insurance evidence, debris mitigation plan, cybersecurity measures, and environmental footprint declaration.",
              },
              {
                type: "paragraph",
                content:
                  "Art. 9 covers conditions and amendments, Art. 11\u201316 address transfer, suspension, revocation, and mutual recognition between member states. The mutual recognition provision (Art. 16) is significant: an authorization granted by one EU member state is recognized across the Union, supporting the internal market principle.",
              },
              {
                type: "heading",
                content: "Module 2: Registration (Art. 32\u201339)",
              },
              {
                type: "paragraph",
                content:
                  "The EU Space Act establishes the Union Register of Space Objects (URSO) under Art. 32. All authorized space objects must be registered, creating a comprehensive EU-level registry that complements the UN Register maintained under the Registration Convention (1975). Articles 33\u201339 detail registration procedures, data requirements, updates for orbital changes, and deregistration upon end of life.",
              },
              {
                type: "key_concept",
                content:
                  "URSO Registration: Operators must register each space object within 30 days of launch, providing orbital parameters, mission purpose, operator details, and expected operational lifetime. Any significant orbital changes must be reported within 72 hours.",
              },
            ],
          },
          // Lesson 4.2
          {
            slug: "cybersecurity-debris-environmental",
            title: "Cybersecurity, Debris & Environmental",
            type: "THEORY",
            estimatedMinutes: 12,
            content: [
              {
                type: "heading",
                content: "Module 3: Cybersecurity (Art. 40\u201348)",
              },
              {
                type: "paragraph",
                content:
                  "The cybersecurity module aligns with the NIS2 Directive (EU 2022/2555), which lists space as a sector of high criticality in Annex I. Articles 40\u201348 require operators to implement risk-based cybersecurity measures covering the ground segment, space segment, and communication links. This includes encryption of TT&C (telemetry, tracking, and command) links, secure software update mechanisms for on-orbit assets, and incident reporting within 24 hours for early warning and 72 hours for full notification.",
              },
              {
                type: "key_concept",
                content:
                  "Cybersecurity Triad for Space: Operators must secure three segments simultaneously \u2014 (1) Ground Segment: mission control, ground stations, data processing; (2) Space Segment: spacecraft bus, payload, inter-satellite links; (3) Link Segment: uplink/downlink, TT&C, data relay.",
              },
              {
                type: "article_reference",
                content:
                  "Art. 40\u201348 map to NIS2 Art. 21(2) measures (a)\u2013(j), requiring policies on risk analysis, incident handling, business continuity, supply chain security, network security, vulnerability disclosure, encryption, access control, and multi-factor authentication.",
                metadata: {
                  articles: [
                    "40",
                    "41",
                    "42",
                    "43",
                    "44",
                    "45",
                    "46",
                    "47",
                    "48",
                  ],
                },
              },
              {
                type: "heading",
                content: "Module 4: Space Debris Mitigation (Art. 49\u201358)",
              },
              {
                type: "paragraph",
                content:
                  "The debris mitigation module codifies IADC (Inter-Agency Space Debris Coordination Committee) guidelines and COPUOS long-term sustainability guidelines into binding EU law. Key requirements include: design for demisability, passivation at end of mission, the 5-year post-mission disposal rule for LEO (reduced from the traditional 25-year guideline), and collision avoidance manoeuvre capability for all spacecraft in congested orbits.",
              },
              {
                type: "key_concept",
                content:
                  "5-Year Rule: The EU Space Act adopts a more stringent 5-year post-mission disposal timeline for LEO objects, significantly more ambitious than the traditional 25-year guideline from the IADC. This reflects the urgency of the debris problem with over 36,000 tracked objects above 10 cm.",
              },
              {
                type: "heading",
                content: "Module 5: Environmental Protection (Art. 59\u201365)",
              },
              {
                type: "paragraph",
                content:
                  "The environmental module introduces Environmental Footprint Declarations (EFD) for space activities, a first in space regulation. Operators must assess and report the lifecycle environmental impact of their missions, including launch emissions (CO2, black carbon, alumina from solid rocket motors), manufacturing footprint, ground infrastructure energy consumption, and re-entry environmental effects.",
              },
              {
                type: "callout",
                content:
                  "The environmental module is forward-looking. While current launch rates are small relative to aviation, the projected exponential growth of launch activities makes early regulation essential to establish baselines and drive green technology adoption.",
                metadata: { variant: "info" },
              },
            ],
          },
          // Lesson 4.3
          {
            slug: "insurance-nis2-supervision",
            title: "Insurance, NIS2 & Supervision",
            type: "THEORY",
            estimatedMinutes: 10,
            content: [
              {
                type: "heading",
                content: "Module 6: Insurance & Liability (Art. 66\u201372)",
              },
              {
                type: "paragraph",
                content:
                  "The insurance module requires operators to maintain third-party liability insurance covering potential damage from their space activities. This implements the state's obligation under the Liability Convention (1972) at the operator level. Insurance requirements are calibrated by operator type, mission risk profile, and orbital regime. GEO operators and mega-constellation operators face higher coverage minimums.",
              },
              {
                type: "key_concept",
                content:
                  "Liability Chain: Under the Liability Convention, the launching state bears absolute liability for damage on Earth and fault-based liability for damage in space. The EU Space Act requires operators to carry sufficient insurance to cover these liabilities, protecting both the state and third parties.",
              },
              {
                type: "heading",
                content: "Module 7: NIS2 Overlay",
              },
              {
                type: "paragraph",
                content:
                  "The NIS2 Directive (EU 2022/2555) applies to space operators as entities in a sector of high criticality. The EU Space Act creates an overlay that ensures coherent application of NIS2 requirements to the specific context of space operations. Space operators classified as essential entities (large operators, SATCOM providers, ground infrastructure) face the strictest NIS2 obligations, including penalties up to EUR 10 million or 2% of global annual turnover.",
              },
              {
                type: "regulation_quote",
                content:
                  "Operators of ground-based infrastructure enabling the provision of space-based services, including operators of satellite communications networks, shall be deemed essential entities under Directive (EU) 2022/2555.",
                metadata: { source: "NIS2 Directive, Annex I, Sector 11" },
              },
              {
                type: "heading",
                content:
                  "Module 8: Supervision & Enforcement (Art. 73\u201382)",
              },
              {
                type: "paragraph",
                content:
                  "The supervision module establishes ongoing monitoring and enforcement mechanisms. NCAs have the power to conduct inspections, request documentation, issue binding instructions, impose administrative fines, and in severe cases suspend or revoke authorizations. The enforcement framework includes graduated sanctions to ensure proportionality.",
              },
              {
                type: "key_concept",
                content:
                  "Graduated Enforcement: NCAs follow a proportionate approach \u2014 (1) Information requests, (2) Compliance notices, (3) Binding instructions, (4) Administrative fines, (5) Suspension, (6) Revocation of authorization. This mirrors the enforcement approach used in NIS2 and other EU regulatory frameworks.",
              },
            ],
          },
          // Lesson 4.4
          {
            slug: "full-compliance-assessment-simulation",
            title: "Full Compliance Assessment",
            type: "SIMULATION",
            estimatedMinutes: 20,
            simulationConfig: {
              scenarioId: "full-assessment-geo",
              description:
                "Conduct a complete compliance assessment for EuroComSat S.A., a medium-sized operator (120 employees, EUR 85M turnover) planning to launch and operate a GEO communication satellite providing broadband services across the EU. Walk through all 8 compliance modules and determine the full set of applicable requirements.",
              expectedOutcome: {
                operatorType: "SCO",
                regime: "standard",
                applicableModules: [
                  "authorization",
                  "registration",
                  "cybersecurity",
                  "debris",
                  "environmental",
                  "insurance",
                  "nis2",
                  "supervision",
                ],
                nis2Classification: "essential",
                keyRisks: [
                  "GEO_orbital_slot",
                  "SATCOM_critical_infrastructure",
                  "high_insurance_requirement",
                ],
              },
            },
            content: [
              {
                type: "heading",
                content: "Simulation: Full GEO Operator Assessment",
              },
              {
                type: "paragraph",
                content:
                  "In this simulation, you will conduct a comprehensive compliance assessment for a GEO communication satellite operator. This exercise covers all 8 compliance modules and illustrates how the requirements interact for a real-world scenario.",
              },
              {
                type: "key_concept",
                content:
                  "Scenario: EuroComSat S.A. is a Paris-based operator with 120 employees and EUR 85M annual turnover. They plan to launch a GEO communication satellite providing broadband services to EU member states. The satellite will have a 15-year design lifetime and carry both commercial and government (Galileo backhaul) payloads.",
              },
              {
                type: "paragraph",
                content:
                  "As a SATCOM provider, EuroComSat is classified as an essential entity under NIS2, triggering the highest level of cybersecurity obligations. The GEO orbit means stricter debris mitigation requirements (graveyard orbit disposal rather than atmospheric re-entry). Government payload involvement adds national security considerations under Art. 4.",
              },
            ],
          },
          // Lesson 4.5
          {
            slug: "module-mastery-quiz",
            title: "Module Mastery",
            type: "QUIZ",
            estimatedMinutes: 15,
            questions: [
              {
                questionText:
                  "Which article establishes the core authorization requirement?",
                questionType: "ARTICLE_LOOKUP",
                options: [
                  { id: "a", text: "Article 1", isCorrect: false },
                  { id: "b", text: "Article 6", isCorrect: true },
                  { id: "c", text: "Article 32", isCorrect: false },
                  { id: "d", text: "Article 73", isCorrect: false },
                ],
                explanation:
                  "Article 6 establishes that no space activity may be conducted without prior authorization from the NCA.",
                relatedArticles: ["6"],
              },
              {
                questionText: "What does URSO stand for?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "Union Registry for Space Operations",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "Union Register of Space Objects",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "Unified Registry for Satellite Operators",
                    isCorrect: false,
                  },
                  {
                    id: "d",
                    text: "Union Register of Supervised Operators",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "URSO is the Union Register of Space Objects, established under Art. 32.",
              },
              {
                questionText:
                  "What is the post-mission disposal timeline for LEO objects under the EU Space Act?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "1 year", isCorrect: false },
                  { id: "b", text: "5 years", isCorrect: true },
                  { id: "c", text: "10 years", isCorrect: false },
                  { id: "d", text: "25 years", isCorrect: false },
                ],
                explanation:
                  "The EU Space Act adopts a 5-year post-mission disposal rule for LEO, more stringent than the traditional IADC 25-year guideline.",
              },
              {
                questionText:
                  "Under NIS2, what is the early warning notification deadline after a significant incident?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "12 hours", isCorrect: false },
                  { id: "b", text: "24 hours", isCorrect: true },
                  { id: "c", text: "48 hours", isCorrect: false },
                  { id: "d", text: "72 hours", isCorrect: false },
                ],
                explanation:
                  "NIS2 requires a 24-hour early warning, followed by a 72-hour full incident notification, and a 1-month final report.",
              },
              {
                questionText:
                  "What penalty can essential entities face under NIS2?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "EUR 1M or 0.5% of turnover",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "EUR 7M or 1.4% of turnover",
                    isCorrect: false,
                  },
                  {
                    id: "c",
                    text: "EUR 10M or 2% of turnover",
                    isCorrect: true,
                  },
                  {
                    id: "d",
                    text: "EUR 20M or 4% of turnover",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "Essential entities face penalties up to EUR 10 million or 2% of global annual turnover, whichever is higher. Important entities face EUR 7M or 1.4%.",
              },
              {
                questionText:
                  "What is an Environmental Footprint Declaration (EFD)?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "A voluntary environmental reporting initiative",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "A mandatory lifecycle environmental impact assessment for space missions",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "An ESA environmental certification programme",
                    isCorrect: false,
                  },
                  {
                    id: "d",
                    text: "A carbon offset requirement for launch providers",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "The EFD is a mandatory lifecycle environmental impact assessment introduced by Art. 59\u201365 of the EU Space Act.",
              },
              {
                questionText:
                  "How must GEO satellites be disposed of at end of life?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "Atmospheric re-entry within 5 years",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "Transfer to a graveyard orbit above GEO",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "Controlled deorbit into the Pacific Ocean",
                    isCorrect: false,
                  },
                  {
                    id: "d",
                    text: "No specific requirement for GEO satellites",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "GEO satellites cannot practically re-enter the atmosphere. They must be moved to a graveyard orbit at least 300 km above the GEO belt at end of life.",
              },
              {
                questionText:
                  "An authorization granted by France's CNES is recognized by which other member states?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "Only neighbouring member states",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "Only member states with bilateral agreements",
                    isCorrect: false,
                  },
                  {
                    id: "c",
                    text: "All EU member states (mutual recognition)",
                    isCorrect: true,
                  },
                  {
                    id: "d",
                    text: "None \u2014 separate authorization required in each state",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "Art. 16 provides for mutual recognition: an authorization granted by one member state's NCA is recognized across the entire EU.",
                relatedArticles: ["16"],
              },
              {
                questionText:
                  "What three segments must be covered by space cybersecurity measures?",
                questionType: "MULTIPLE_SELECT",
                options: [
                  { id: "a", text: "Ground segment", isCorrect: true },
                  { id: "b", text: "Space segment", isCorrect: true },
                  { id: "c", text: "Link segment", isCorrect: true },
                  { id: "d", text: "User segment", isCorrect: false },
                ],
                explanation:
                  "Space cybersecurity covers three segments: ground (mission control, ground stations), space (spacecraft, payloads), and link (TT&C uplink/downlink, data relay).",
              },
              {
                questionText:
                  "Within how many days of launch must a space object be registered in URSO?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "7 days", isCorrect: false },
                  { id: "b", text: "14 days", isCorrect: false },
                  { id: "c", text: "30 days", isCorrect: true },
                  { id: "d", text: "90 days", isCorrect: false },
                ],
                explanation:
                  "Operators must register each space object in URSO within 30 days of launch.",
              },
              {
                questionText:
                  "Which entity type has absolute liability for damage caused on Earth's surface?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "The spacecraft operator",
                    isCorrect: false,
                  },
                  { id: "b", text: "The launch operator", isCorrect: false },
                  { id: "c", text: "The launching state", isCorrect: true },
                  { id: "d", text: "The insurance provider", isCorrect: false },
                ],
                explanation:
                  "Under the Liability Convention (1972), the launching state bears absolute liability for damage caused on Earth's surface. The EU Space Act's insurance requirements help cover this state liability at the operator level.",
              },
              {
                questionText:
                  "Which NCA enforcement action is the most severe?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "Compliance notice", isCorrect: false },
                  { id: "b", text: "Administrative fine", isCorrect: false },
                  {
                    id: "c",
                    text: "Revocation of authorization",
                    isCorrect: true,
                  },
                  { id: "d", text: "Binding instruction", isCorrect: false },
                ],
                explanation:
                  "Revocation of authorization is the most severe enforcement action, effectively requiring the operator to cease all space activities.",
              },
              {
                questionText:
                  "What must be reported to the NCA within 72 hours of occurrence?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "Annual compliance report",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "Significant orbital change of a registered space object",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "Change of company address",
                    isCorrect: false,
                  },
                  {
                    id: "d",
                    text: "Scheduled end-of-life manoeuvre",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "Significant orbital changes must be reported within 72 hours to maintain the accuracy of the URSO registry.",
              },
              {
                questionText:
                  "The Liability Convention applies which standard for damage in space (between space objects)?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "Absolute liability", isCorrect: false },
                  { id: "b", text: "Fault-based liability", isCorrect: true },
                  { id: "c", text: "No liability", isCorrect: false },
                  { id: "d", text: "Shared liability", isCorrect: false },
                ],
                explanation:
                  "The Liability Convention applies absolute liability for damage on Earth's surface but fault-based liability for damage in outer space (between space objects).",
              },
              {
                questionText:
                  "How many graduated enforcement steps does the NCA supervision framework include?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "3", isCorrect: false },
                  { id: "b", text: "4", isCorrect: false },
                  { id: "c", text: "6", isCorrect: true },
                  { id: "d", text: "8", isCorrect: false },
                ],
                explanation:
                  "The 6 graduated steps are: information requests, compliance notices, binding instructions, administrative fines, suspension, and revocation of authorization.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // Course 2: NIS2 for Space Operators
  // ═══════════════════════════════════════════════════════════════
  {
    slug: "nis2-for-space-operators",
    title: "NIS2 for Space Operators",
    subtitle: "Cybersecurity compliance under Directive (EU) 2022/2555",
    description:
      "An intermediate course covering the NIS2 Directive as it applies to space operators. Learn entity classification, the 10 cybersecurity measures of Art. 21(2), incident reporting timelines, and study real-world incidents including the Viasat KA-SAT attack.",
    icon: "Shield",
    category: "NIS2",
    level: "INTERMEDIATE",
    estimatedMinutes: 75,
    isPremium: true,
    tags: ["nis2", "cybersecurity", "space"],
    relatedComplianceModules: ["cybersecurity", "nis2"],
    modules: [
      // ── Module 1: NIS2 Basics for Space ──
      {
        title: "NIS2 Basics for Space",
        description:
          "Understand why NIS2 applies to space operators and how entities are classified.",
        lessons: [
          // Lesson 1.1
          {
            slug: "why-nis2-applies-to-space",
            title: "Why NIS2 Applies to Space",
            type: "THEORY",
            estimatedMinutes: 12,
            content: [
              {
                type: "heading",
                content: "Space as Critical Infrastructure",
              },
              {
                type: "paragraph",
                content:
                  "The NIS2 Directive (EU 2022/2555) replaced the original NIS Directive in January 2023, significantly expanding the scope of EU cybersecurity regulation. Critically for the space industry, NIS2 explicitly lists space as a sector of high criticality in Annex I, Sector 11, covering three sub-sectors: operators of ground-based infrastructure, providers of space-based services, and operators of satellite communications networks.",
              },
              {
                type: "regulation_quote",
                content:
                  "Annex I \u2014 Sectors of High Criticality, Sector 11: Space. Sub-sectors include operators of ground-based infrastructure enabling the provision of space-based services, and undertakings providing space-based services.",
                metadata: { source: "Directive (EU) 2022/2555, Annex I" },
              },
              {
                type: "paragraph",
                content:
                  "This inclusion reflects the growing dependence of critical societal functions on space infrastructure. GPS/Galileo enables navigation, timing for financial transactions, and emergency services. SATCOM provides connectivity for remote areas, maritime, and aviation. Earth observation supports agriculture, disaster response, and climate monitoring. A cyberattack on these systems could have cascading effects across multiple sectors.",
              },
              {
                type: "key_concept",
                content:
                  "NIS2 Transposition Deadline: EU member states were required to transpose NIS2 into national law by 17 October 2024. The directive applies to medium and large entities in listed sectors, with some smaller entities included if they provide critical services.",
              },
              {
                type: "callout",
                content:
                  "NIS2 is a directive, not a regulation. Unlike the EU Space Act (which is a regulation with direct effect), NIS2 must be transposed into each member state's national law, meaning implementation details may vary across jurisdictions.",
                metadata: { variant: "warning" },
              },
            ],
          },
          // Lesson 1.2
          {
            slug: "entity-classification",
            title: "Essential vs. Important Entities",
            type: "THEORY",
            estimatedMinutes: 10,
            content: [
              {
                type: "heading",
                content: "NIS2 Entity Classification for Space",
              },
              {
                type: "paragraph",
                content:
                  "NIS2 classifies entities into two tiers based on their size and criticality: essential entities and important entities. The classification determines the level of supervisory oversight and the maximum penalties for non-compliance.",
              },
              {
                type: "key_concept",
                content:
                  "Essential Entities: Large enterprises (250+ employees or EUR 50M+ turnover) in Annex I sectors, including large SATCOM operators, major ground infrastructure providers, and operators of Galileo/Copernicus infrastructure. Subject to proactive supervision and penalties up to EUR 10M or 2% of global turnover.",
              },
              {
                type: "key_concept",
                content:
                  "Important Entities: Medium enterprises (50\u2013249 employees or EUR 10\u201350M turnover) in Annex I sectors, including mid-size satellite operators, smaller ground station networks, and space data providers. Subject to reactive supervision (ex-post) and penalties up to EUR 7M or 1.4% of global turnover.",
              },
              {
                type: "comparison_table",
                content:
                  "Essential vs Important Entities comparison for space operators.",
                metadata: {
                  columns: ["Aspect", "Essential", "Important"],
                  rows: [
                    [
                      "Size threshold",
                      "250+ employees / EUR 50M+",
                      "50\u2013249 employees / EUR 10\u201350M",
                    ],
                    [
                      "Supervision",
                      "Proactive (ex-ante)",
                      "Reactive (ex-post)",
                    ],
                    [
                      "Max penalty",
                      "EUR 10M or 2% of turnover",
                      "EUR 7M or 1.4% of turnover",
                    ],
                    [
                      "Audit requirements",
                      "Regular security audits",
                      "Audits upon request",
                    ],
                    [
                      "Incident reporting",
                      "24h / 72h / 1 month",
                      "24h / 72h / 1 month",
                    ],
                  ],
                },
              },
              {
                type: "paragraph",
                content:
                  "Small enterprises (under 50 employees and under EUR 10M turnover) are generally excluded from NIS2, unless they are designated as critical by a member state. However, note that the EU Space Act light regime and NIS2 size thresholds use slightly different criteria, so an entity could qualify for the light regime under the Space Act while still being captured by NIS2 if designated as critical.",
              },
            ],
          },
          // Lesson 1.3
          {
            slug: "nis2-basics-quiz",
            title: "NIS2 Basics Assessment",
            type: "QUIZ",
            estimatedMinutes: 8,
            questions: [
              {
                questionText:
                  "In which NIS2 annex is space listed as a sector of high criticality?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "Annex I", isCorrect: true },
                  { id: "b", text: "Annex II", isCorrect: false },
                  { id: "c", text: "Annex III", isCorrect: false },
                  { id: "d", text: "Annex IV", isCorrect: false },
                ],
                explanation:
                  "Space is listed in NIS2 Annex I (Sectors of High Criticality), Sector 11.",
              },
              {
                questionText:
                  "What was the NIS2 transposition deadline for EU member states?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "17 January 2024", isCorrect: false },
                  { id: "b", text: "17 October 2024", isCorrect: true },
                  { id: "c", text: "17 January 2025", isCorrect: false },
                  { id: "d", text: "17 October 2025", isCorrect: false },
                ],
                explanation:
                  "EU member states were required to transpose NIS2 into national law by 17 October 2024.",
              },
              {
                questionText:
                  "NIS2 is a regulation with direct effect across all EU member states.",
                questionType: "TRUE_FALSE",
                options: [
                  { id: "a", text: "True", isCorrect: false },
                  { id: "b", text: "False", isCorrect: true },
                ],
                explanation:
                  "NIS2 is a directive, not a regulation. It must be transposed into each member state's national law, unlike the EU Space Act which is a regulation with direct effect.",
              },
              {
                questionText:
                  "What is the maximum penalty for essential entities under NIS2?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "EUR 5M or 1% of turnover",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "EUR 7M or 1.4% of turnover",
                    isCorrect: false,
                  },
                  {
                    id: "c",
                    text: "EUR 10M or 2% of turnover",
                    isCorrect: true,
                  },
                  {
                    id: "d",
                    text: "EUR 20M or 4% of turnover",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "Essential entities face penalties up to EUR 10 million or 2% of global annual turnover, whichever is higher.",
              },
              {
                questionText:
                  "A satellite operator with 300 employees and EUR 120M turnover would be classified as which NIS2 entity type?",
                questionType: "OPERATOR_CLASSIFY",
                options: [
                  { id: "a", text: "Essential entity", isCorrect: true },
                  { id: "b", text: "Important entity", isCorrect: false },
                  { id: "c", text: "Out of scope", isCorrect: false },
                  {
                    id: "d",
                    text: "Depends on member state designation",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "With 300 employees and EUR 120M turnover, this operator exceeds the essential entity thresholds (250+ employees or EUR 50M+).",
              },
              {
                questionText:
                  "Which type of NIS2 supervision applies to important entities?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "Proactive (ex-ante)", isCorrect: false },
                  { id: "b", text: "Reactive (ex-post)", isCorrect: true },
                  { id: "c", text: "No supervision", isCorrect: false },
                  { id: "d", text: "Continuous monitoring", isCorrect: false },
                ],
                explanation:
                  "Important entities are subject to reactive (ex-post) supervision, meaning authorities investigate only after an incident or upon evidence of non-compliance.",
              },
            ],
          },
        ],
      },

      // ── Module 2: Cybersecurity Measures in Practice ──
      {
        title: "Cybersecurity Measures in Practice",
        description:
          "Learn the 10 Art. 21(2) cybersecurity measures, incident reporting procedures, and study the Viasat KA-SAT cyberattack.",
        lessons: [
          // Lesson 2.1
          {
            slug: "the-10-cybersecurity-measures",
            title: "Art. 21(2) Cybersecurity Measures",
            type: "THEORY",
            estimatedMinutes: 12,
            content: [
              {
                type: "heading",
                content: "The 10 Minimum Cybersecurity Measures",
              },
              {
                type: "paragraph",
                content:
                  "Article 21(2) of NIS2 defines 10 categories of cybersecurity risk-management measures that essential and important entities must implement. For space operators, each measure must address the unique characteristics of space systems including the ground segment, space segment, and communication links.",
              },
              {
                type: "list",
                content:
                  "(a) Policies on risk analysis and information system security \u2014 Documented security policies covering all space system segments, approved by senior management, reviewed annually\n(b) Incident handling \u2014 Procedures for detecting, reporting, and responding to cybersecurity incidents across ground and space segments\n(c) Business continuity and crisis management \u2014 Backup management, disaster recovery, and crisis response plans including loss-of-spacecraft scenarios\n(d) Supply chain security \u2014 Security requirements for suppliers and service providers, particularly for ground segment components and launcher integration\n(e) Security in network and information systems acquisition, development and maintenance \u2014 Secure development lifecycle for spacecraft software, ground systems, and firmware updates\n(f) Policies and procedures for assessing cybersecurity risk-management effectiveness \u2014 Regular testing, audits, and vulnerability assessments\n(g) Basic cyber hygiene practices and cybersecurity training \u2014 Training programmes for mission controllers, ground station operators, and engineering staff\n(h) Policies and procedures regarding the use of cryptography and encryption \u2014 Encryption of TT&C links, data downlinks, and inter-satellite links\n(i) Human resources security, access control policies and asset management \u2014 Role-based access to mission-critical systems, background checks for key personnel\n(j) Use of multi-factor authentication, secured communication, and emergency communication systems \u2014 MFA for all mission-critical access, encrypted command channels",
              },
              {
                type: "key_concept",
                content:
                  "Space-Specific Application: Unlike traditional IT systems, space systems have unique constraints including limited bandwidth for security updates, radiation-hardened processors with limited computing power, latency in GEO communications, and the impossibility of physical access for patching once in orbit.",
              },
              {
                type: "callout",
                content:
                  "ENISA has published specific guidance for the space sector mapping these 10 measures to space system architectures. The Caelex platform maps 51 NIS2 requirements to specific ENISA space controls.",
                metadata: { variant: "info" },
              },
            ],
          },
          // Lesson 2.2
          {
            slug: "incident-reporting-timeline",
            title: "Incident Reporting Requirements",
            type: "THEORY",
            estimatedMinutes: 10,
            content: [
              {
                type: "heading",
                content: "NIS2 Incident Reporting Timeline",
              },
              {
                type: "paragraph",
                content:
                  "NIS2 Article 23 establishes a strict multi-phase incident reporting framework for significant cybersecurity incidents. Space operators must be prepared to report incidents affecting any segment of their operations \u2014 a cyberattack on a ground station, interference with TT&C links, or compromise of spacecraft systems.",
              },
              {
                type: "timeline",
                content:
                  "Phase 1 \u2014 Early Warning (24 hours): Within 24 hours of becoming aware of a significant incident, the entity must submit an early warning to the competent authority (CSIRT or NCA). This must indicate whether the incident is suspected of being caused by unlawful or malicious acts and whether it could have cross-border impact.\n\nPhase 2 \u2014 Incident Notification (72 hours): Within 72 hours, a more detailed notification must be submitted, including an initial assessment of the incident's severity and impact, indicators of compromise (IoCs), and initial containment measures taken.\n\nPhase 3 \u2014 Intermediate Report (upon request): The competent authority may request an intermediate status update at any time.\n\nPhase 4 \u2014 Final Report (1 month): Within one month of the incident notification, a comprehensive final report must detail the root cause, impact assessment, remediation measures, and lessons learned.",
                metadata: {
                  phases: [
                    { name: "Early Warning", deadline: "24 hours" },
                    { name: "Incident Notification", deadline: "72 hours" },
                    { name: "Intermediate Report", deadline: "Upon request" },
                    { name: "Final Report", deadline: "1 month" },
                  ],
                },
              },
              {
                type: "key_concept",
                content:
                  "Significant Incident: An incident is considered significant if it has caused or is capable of causing severe operational disruption or financial loss, or if it has affected or is capable of affecting other natural or legal persons by causing considerable material or non-material damage.",
              },
              {
                type: "paragraph",
                content:
                  "For space operators, examples of significant incidents include: unauthorized access to mission control systems, jamming or spoofing of TT&C links, ransomware affecting ground station operations, supply chain compromise of spacecraft firmware, and data breaches involving sensitive orbital or imaging data.",
              },
            ],
          },
          // Lesson 2.3
          {
            slug: "viasat-ka-sat-case-study",
            title: "Case Study: The Viasat KA-SAT Attack",
            type: "CASE_STUDY",
            estimatedMinutes: 15,
            content: [
              {
                type: "heading",
                content:
                  "The Viasat KA-SAT Cyberattack \u2014 24 February 2022",
              },
              {
                type: "paragraph",
                content:
                  "On 24 February 2022 \u2014 the day of Russia's invasion of Ukraine \u2014 Viasat's KA-SAT satellite broadband network suffered one of the most significant cyberattacks in space history. The attack demonstrated the vulnerability of space-based communications infrastructure and became a catalyst for strengthening space cybersecurity regulation, including NIS2's explicit inclusion of the space sector.",
              },
              {
                type: "key_concept",
                content:
                  "Attack Vector: The attackers exploited a misconfigured VPN appliance in the KA-SAT ground segment network to gain access to the management segment. From there, they deployed AcidRain \u2014 a destructive wiper malware specifically designed to target Surfbeam2 modems \u2014 via a legitimate firmware update mechanism.",
              },
              {
                type: "paragraph",
                content:
                  "The AcidRain malware overwrote key data in the modems' flash memory, rendering approximately 30,000 broadband terminals across Europe permanently inoperable. The devices could not be recovered remotely and had to be physically replaced. The attack's impacts extended far beyond direct Viasat customers.",
              },
              {
                type: "list",
                content:
                  "Cascading impacts of the KA-SAT attack:\n\u2022 ~30,000 broadband modems bricked across Europe (Germany, France, Italy, Poland, Czech Republic, Greece, and others)\n\u2022 Enercon wind turbine monitoring: ~5,800 wind turbines in Germany lost remote monitoring and control capability via satellite link\n\u2022 Ukrainian military communications disrupted at a critical moment\n\u2022 Emergency services in parts of France lost satellite-based backup communications\n\u2022 Physical replacement of all affected modems required \u2014 months of remediation",
              },
              {
                type: "heading",
                content: "What NIS2 Would Have Required",
              },
              {
                type: "paragraph",
                content:
                  "The Viasat attack occurred before NIS2 took effect, but analyzing it through the NIS2 lens illustrates exactly why the directive's requirements matter for space operators.",
              },
              {
                type: "list",
                content:
                  "NIS2 requirements that could have mitigated or improved response to the KA-SAT attack:\n\u2022 Art. 21(2)(a) \u2014 Risk analysis policies: A comprehensive risk assessment would have identified the VPN appliance as a critical single point of failure in the ground segment\n\u2022 Art. 21(2)(d) \u2014 Supply chain security: Security vetting of the VPN vendor and modem firmware update mechanism would have been mandatory\n\u2022 Art. 21(2)(e) \u2014 Secure acquisition and maintenance: The firmware update mechanism used to deploy AcidRain should have included integrity verification and code signing\n\u2022 Art. 21(2)(h) \u2014 Cryptography: Encrypted and authenticated firmware updates would have prevented the malware deployment\n\u2022 Art. 21(2)(i) \u2014 Access control: Network segmentation between the management network and the customer-facing modem network was insufficient\n\u2022 Art. 23 \u2014 24h early warning: Viasat would have been required to notify authorities within 24 hours\n\u2022 Art. 23 \u2014 72h incident notification: A detailed notification with IoCs within 72 hours would have enabled faster coordinated response across affected member states",
              },
              {
                type: "callout",
                content:
                  "The Viasat attack is now cited in EU policy documents as a key example of why space must be treated as critical infrastructure. It demonstrated that an attack on a single commercial SATCOM provider can have cascading effects across energy, defence, emergency services, and civilian communications.",
                metadata: { variant: "critical" },
              },
            ],
          },
          // Lesson 2.4
          {
            slug: "nis2-cybersecurity-quiz",
            title: "Cybersecurity Measures Assessment",
            type: "QUIZ",
            estimatedMinutes: 10,
            questions: [
              {
                questionText:
                  "How many minimum cybersecurity measures does NIS2 Art. 21(2) define?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "5", isCorrect: false },
                  { id: "b", text: "8", isCorrect: false },
                  { id: "c", text: "10", isCorrect: true },
                  { id: "d", text: "12", isCorrect: false },
                ],
                explanation:
                  "NIS2 Art. 21(2) defines 10 categories of minimum cybersecurity measures, labelled (a) through (j).",
              },
              {
                questionText:
                  "What malware was used in the Viasat KA-SAT attack?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "NotPetya", isCorrect: false },
                  { id: "b", text: "AcidRain", isCorrect: true },
                  { id: "c", text: "Stuxnet", isCorrect: false },
                  { id: "d", text: "WannaCry", isCorrect: false },
                ],
                explanation:
                  "AcidRain was a destructive wiper malware specifically designed to target Surfbeam2 satellite modems, bricking approximately 30,000 devices.",
              },
              {
                questionText:
                  "How many broadband modems were bricked in the Viasat attack?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "About 5,000", isCorrect: false },
                  { id: "b", text: "About 10,000", isCorrect: false },
                  { id: "c", text: "About 30,000", isCorrect: true },
                  { id: "d", text: "About 100,000", isCorrect: false },
                ],
                explanation:
                  "Approximately 30,000 broadband terminals across Europe were permanently rendered inoperable by the AcidRain wiper malware.",
              },
              {
                questionText:
                  "What was the initial attack vector in the Viasat KA-SAT incident?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "Phishing email to Viasat employees",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "Compromised VPN appliance credentials",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "Direct RF interference with the satellite",
                    isCorrect: false,
                  },
                  {
                    id: "d",
                    text: "Physical intrusion at a ground station",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "The attackers exploited a misconfigured VPN appliance in the KA-SAT ground segment network to gain initial access.",
              },
              {
                questionText:
                  "Which NIS2 Art. 21(2) measure addresses supply chain security?",
                questionType: "ARTICLE_LOOKUP",
                options: [
                  { id: "a", text: "Art. 21(2)(a)", isCorrect: false },
                  { id: "b", text: "Art. 21(2)(b)", isCorrect: false },
                  { id: "c", text: "Art. 21(2)(d)", isCorrect: true },
                  { id: "d", text: "Art. 21(2)(h)", isCorrect: false },
                ],
                explanation:
                  "Art. 21(2)(d) addresses supply chain security, including security-related aspects concerning relationships between entities and their direct suppliers or service providers.",
                relatedArticles: ["NIS2 Art. 21(2)(d)"],
              },
              {
                questionText:
                  "Which non-Viasat system was significantly disrupted as a cascading effect of the KA-SAT attack?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "Galileo navigation satellites",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "Enercon wind turbine remote monitoring",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "Eumetsat weather satellites",
                    isCorrect: false,
                  },
                  {
                    id: "d",
                    text: "European air traffic control",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "Approximately 5,800 Enercon wind turbines in Germany lost remote monitoring and control capability because they relied on KA-SAT for satellite communications.",
              },
              {
                questionText:
                  "What is the deadline for the NIS2 final incident report?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "1 week", isCorrect: false },
                  { id: "b", text: "2 weeks", isCorrect: false },
                  { id: "c", text: "1 month", isCorrect: true },
                  { id: "d", text: "3 months", isCorrect: false },
                ],
                explanation:
                  "NIS2 Art. 23 requires a comprehensive final report within 1 month of the incident notification, detailing root cause, impact, and remediation.",
              },
              {
                questionText:
                  "The Viasat KA-SAT attack occurred on the same day as which geopolitical event?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "Brexit referendum", isCorrect: false },
                  {
                    id: "b",
                    text: "Russian invasion of Ukraine",
                    isCorrect: true,
                  },
                  { id: "c", text: "EU Space Act proposal", isCorrect: false },
                  { id: "d", text: "NIS2 adoption", isCorrect: false },
                ],
                explanation:
                  "The Viasat KA-SAT attack occurred on 24 February 2022, the same day as Russia's invasion of Ukraine, and is widely attributed to Russian state-sponsored actors.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // Course 3: National Space Laws Compared
  // ═══════════════════════════════════════════════════════════════
  {
    slug: "national-space-laws-compared",
    title: "National Space Laws Compared",
    subtitle: "Navigate 10 European jurisdictions",
    description:
      "Compare national space laws across 10 European jurisdictions. Understand licensing requirements, liability regimes, and competitive advantages of each jurisdiction. Includes a deep dive into Luxembourg as a case study.",
    icon: "Globe",
    category: "NATIONAL_SPACE_LAW",
    level: "INTERMEDIATE",
    estimatedMinutes: 60,
    isPremium: true,
    tags: ["national-space-law", "jurisdiction", "comparison"],
    relatedComplianceModules: ["authorization", "insurance", "supervision"],
    modules: [
      // ── Module 1: The European Patchwork ──
      {
        title: "The European Patchwork",
        description:
          "Survey the 10 national space laws, understand their origins, and compare key provisions.",
        lessons: [
          // Lesson 1.1
          {
            slug: "10-jurisdictions-overview",
            title: "10 Jurisdictions at a Glance",
            type: "THEORY",
            estimatedMinutes: 12,
            content: [
              {
                type: "heading",
                content: "The European National Space Law Landscape",
              },
              {
                type: "paragraph",
                content:
                  "Before the EU Space Act, space activities in Europe were governed entirely by national legislation. Ten European countries have enacted dedicated space laws, each reflecting their unique space heritage, industrial base, and policy priorities. Understanding these laws remains essential because the EU Space Act creates an additional layer that coexists with \u2014 rather than replaces \u2014 national frameworks.",
              },
              {
                type: "list",
                content:
                  "The 10 European jurisdictions with dedicated space legislation:\n1. France (FR) \u2014 Loi relative aux op\u00e9rations spatiales (LOS), 2008, amended 2019. Authority: CNES. Europe's most comprehensive space law with detailed technical regulations.\n2. United Kingdom (UK) \u2014 Space Industry Act, 2018. Authority: UK Space Agency / CAA. Modern law designed for commercial space, covering launch from UK territory.\n3. Belgium (BE) \u2014 Law on Activities in Outer Space, 2005. Authority: Belgian Science Policy Office (BELSPO). One of Europe's earliest modern space laws.\n4. Netherlands (NL) \u2014 Space Activities Act, 2007. Authority: Ministry of Economic Affairs. Known for pragmatic and business-friendly approach.\n5. Luxembourg (LU) \u2014 Law on Space Activities, 2020 + Space Resources Act, 2017. Authority: Luxembourg Space Agency (LSA). Pioneer in space resources framework.\n6. Austria (AT) \u2014 Austrian Outer Space Act, 2011. Authority: FFG (Austrian Research Promotion Agency). Straightforward licensing regime.\n7. Denmark (DK) \u2014 Outer Space Act, 2016. Authority: Danish Ministry of Higher Education and Science. Covers Greenland launch activities.\n8. Germany (DE) \u2014 No dedicated space act yet (draft in progress). Relies on regulatory framework of DLR and aviation law analogy.\n9. Italy (IT) \u2014 Space Economy Strategic Plan, with ASI (Italian Space Agency) as regulatory body. Legislative framework under development.\n10. Norway (NO) \u2014 Act on Launching Objects from Norwegian Territory into Outer Space, 1969, amended. Authority: Norwegian Space Agency.",
              },
              {
                type: "callout",
                content:
                  "Germany and Italy currently lack comprehensive dedicated space laws, relying instead on general regulatory frameworks and space agency oversight. The EU Space Act will establish a harmonized baseline that is particularly significant for these jurisdictions.",
                metadata: { variant: "info" },
              },
              {
                type: "paragraph",
                content:
                  "Key variations across jurisdictions include: licensing timeframes (from 30 days in Luxembourg to 6+ months in France), liability caps (capped in some jurisdictions like France, uncapped in others), insurance requirements (minimum coverage ranging from EUR 50M to EUR 500M), and whether the jurisdiction covers space resource activities.",
              },
            ],
          },
          // Lesson 1.2
          {
            slug: "key-differences",
            title: "Key Regulatory Differences",
            type: "THEORY",
            estimatedMinutes: 10,
            content: [
              {
                type: "heading",
                content: "Comparing Licensing, Liability, and Insurance",
              },
              {
                type: "comparison_table",
                content:
                  "Side-by-side comparison of critical regulatory dimensions across 5 key jurisdictions.",
                metadata: {
                  columns: [
                    "Dimension",
                    "France",
                    "UK",
                    "Luxembourg",
                    "Netherlands",
                    "Belgium",
                  ],
                  rows: [
                    ["Year enacted", "2008", "2018", "2020", "2007", "2005"],
                    [
                      "License timeline",
                      "6\u201312 months",
                      "3\u20136 months",
                      "1\u20133 months",
                      "3\u20136 months",
                      "3\u20136 months",
                    ],
                    [
                      "Liability cap",
                      "EUR 60M (capped)",
                      "Varies (can be capped)",
                      "No statutory cap",
                      "Government indemnity option",
                      "No statutory cap",
                    ],
                    [
                      "Insurance minimum",
                      "EUR 60M",
                      "Case-by-case",
                      "Case-by-case",
                      "EUR 2\u2013500M",
                      "Risk-based",
                    ],
                    [
                      "Space resources",
                      "No specific law",
                      "No specific law",
                      "Yes (2017 Act)",
                      "No specific law",
                      "No specific law",
                    ],
                    [
                      "Technical regulations",
                      "Very detailed (CNES)",
                      "Moderate",
                      "Streamlined",
                      "Moderate",
                      "Moderate",
                    ],
                  ],
                },
              },
              {
                type: "key_concept",
                content:
                  "Liability Cap: France stands out with a statutory liability cap of EUR 60 million, above which the French state assumes liability. This provides significant risk reduction for operators. Most other jurisdictions either have no cap or negotiate limits case by case.",
              },
              {
                type: "paragraph",
                content:
                  "The interaction between national laws and the EU Space Act creates a layered compliance landscape. An operator under French jurisdiction must comply with both the French LOS and the EU Space Act. Where the EU Act sets a higher standard, the EU standard prevails. Where the French law sets a higher standard (e.g., more detailed technical regulations from CNES), the national law prevails. This \u2018maximum harmonization from below\u2019 approach ensures safety while supporting the internal market.",
              },
              {
                type: "key_concept",
                content:
                  "Favorability Scoring: The Caelex platform calculates a favorability score for each jurisdiction based on weighted factors including licensing speed, liability regime, insurance costs, regulatory certainty, space resources framework, tax environment, and EU Space Act alignment.",
              },
            ],
          },
          // Lesson 1.3
          {
            slug: "jurisdiction-favorability-explorer",
            title: "Jurisdiction Favorability Explorer",
            type: "INTERACTIVE",
            estimatedMinutes: 10,
            content: [
              {
                type: "heading",
                content: "Interactive: Find Your Optimal Jurisdiction",
              },
              {
                type: "paragraph",
                content:
                  "Use this interactive tool to explore how different factors affect jurisdiction favorability for various operator types. Adjust the weights for each factor to see how the ranking changes based on your priorities.",
              },
              {
                type: "paragraph",
                content:
                  "Factor 1: Licensing Speed \u2014 How quickly can you obtain authorization? Luxembourg and the Netherlands score highest.\nFactor 2: Liability Regime \u2014 Does the jurisdiction offer liability caps or government indemnity? France scores highest with its EUR 60M cap.\nFactor 3: Insurance Costs \u2014 What are the minimum coverage requirements? Jurisdictions with risk-based (rather than fixed minimum) approaches score higher for small operators.\nFactor 4: Regulatory Certainty \u2014 How mature and predictable is the regulatory framework? France and Belgium score highest with established track records.\nFactor 5: Space Resources \u2014 Does the jurisdiction support space resource utilization? Luxembourg is the clear leader.\nFactor 6: Tax Environment \u2014 How favorable is the tax regime for space companies? Luxembourg and the Netherlands score highest.\nFactor 7: EU Space Act Alignment \u2014 How well-prepared is the jurisdiction for EU Space Act implementation? Jurisdictions with existing comprehensive laws (France, Belgium) have an advantage.",
                metadata: {
                  factors: [
                    "licensing_speed",
                    "liability_regime",
                    "insurance_costs",
                    "regulatory_certainty",
                    "space_resources",
                    "tax_environment",
                    "eu_space_act_alignment",
                  ],
                },
              },
              {
                type: "callout",
                content:
                  "This explorer uses the same favorability algorithm as the Caelex compliance engine. The results are indicative and should be validated with legal counsel for specific operational contexts.",
                metadata: { variant: "info" },
              },
            ],
          },
        ],
      },
      // ── Module 2: Choosing the Right Jurisdiction ──
      {
        title: "Choosing the Right Jurisdiction",
        description:
          "Strategic guidance on jurisdiction selection, including a deep-dive case study on Luxembourg.",
        lessons: [
          // Lesson 2.1
          {
            slug: "jurisdiction-selection-strategy",
            title: "Jurisdiction Selection Strategy",
            type: "THEORY",
            estimatedMinutes: 8,
            content: [
              {
                type: "heading",
                content: "Strategic Factors in Jurisdiction Choice",
              },
              {
                type: "paragraph",
                content:
                  "Choosing the right jurisdiction is one of the most consequential decisions for a space operator. It determines your regulatory burden, liability exposure, insurance costs, and competitive positioning. With the EU Space Act's mutual recognition provision (Art. 16), an authorization in one member state provides access to the entire EU market, making the choice of home jurisdiction even more strategically important.",
              },
              {
                type: "key_concept",
                content:
                  "Forum Shopping: The EU Space Act's mutual recognition provision means operators can strategically choose the most favorable member state for their authorization while operating across the entire EU. This creates competitive dynamics between member states to attract space companies through favorable national implementation.",
              },
              {
                type: "list",
                content:
                  "Key strategic considerations:\n\u2022 Operational presence: Where are your ground stations, mission control, and engineering teams?\n\u2022 Launch access: Proximity to launch sites and launch state agreements\n\u2022 Liability protection: Liability caps and government indemnification\n\u2022 Insurance market: Local insurance market depth for space risk\n\u2022 Regulatory expertise: NCA capacity and space regulatory track record\n\u2022 Talent pool: Access to space engineering and regulatory expertise\n\u2022 Tax incentives: R&D credits, IP regimes, and corporate tax rates\n\u2022 ESA membership: Participation in ESA programmes and procurement",
              },
              {
                type: "paragraph",
                content:
                  "The EU Space Act changes the calculus by harmonizing baseline requirements. Before the Act, operators might choose Belgium for its light-touch regime or France for its comprehensive framework providing legal certainty. Post-Act, the differences between jurisdictions narrow, but advantages in licensing speed, liability caps, and supplementary incentives remain meaningful differentiators.",
              },
            ],
          },
          // Lesson 2.2
          {
            slug: "luxembourg-case-study",
            title: "Case Study: Luxembourg \u2014 Europe's Space Hub",
            type: "CASE_STUDY",
            estimatedMinutes: 15,
            content: [
              {
                type: "heading",
                content: "Luxembourg: From Steel to Satellites",
              },
              {
                type: "paragraph",
                content:
                  "Luxembourg has deliberately positioned itself as one of Europe's most attractive jurisdictions for space companies. Despite its small size (population ~660,000), the Grand Duchy hosts the headquarters of SES \u2014 the world's second-largest commercial satellite operator \u2014 and has built a sophisticated ecosystem for space business.",
              },
              {
                type: "key_concept",
                content:
                  "The 2017 Space Resources Act: Luxembourg was one of the first countries globally (after the United States with its 2015 Commercial Space Launch Competitiveness Act) to establish a legal framework for the exploration and use of space resources. The law provides legal certainty for companies engaged in asteroid mining, in-situ resource utilization, and space manufacturing.",
              },
              {
                type: "paragraph",
                content:
                  "Luxembourg's space strategy rests on four pillars: (1) a progressive regulatory framework with the 2020 Law on Space Activities providing streamlined licensing and the 2017 Space Resources Act enabling future activities; (2) a dedicated Luxembourg Space Agency (LSA) providing one-stop-shop regulatory services; (3) competitive financial incentives including favorable tax regime, R&D grants, and government co-investment through the Luxembourg Future Fund; and (4) strong EU institutional presence, hosting the European Investment Bank and acting as a platform for EU space policy.",
              },
              {
                type: "list",
                content:
                  "Companies attracted to Luxembourg's space ecosystem:\n\u2022 SES \u2014 Global SATCOM operator, headquartered in Betzdorf since 1985, operates O3b mPOWER MEO constellation\n\u2022 ispace \u2014 Japanese lunar exploration company, established European headquarters in Luxembourg\n\u2022 Kleos Space \u2014 RF reconnaissance satellite operator, incorporated in Luxembourg\n\u2022 OQ Technology \u2014 5G IoT satellite constellation operator\n\u2022 Euro-Composites \u2014 Advanced materials for space structures\n\u2022 Numerous fintech and space-adjacent startups leveraging Luxembourg's regulatory sandbox",
              },
              {
                type: "callout",
                content:
                  "Luxembourg invested over EUR 200 million in its SpaceResources.lu initiative, signalling long-term commitment to the space economy. The country's GDP per capita (highest in the EU) and AAA credit rating provide a stable financial environment for space ventures.",
                metadata: { variant: "info" },
              },
              {
                type: "paragraph",
                content:
                  "Under the EU Space Act, Luxembourg's advantages are expected to persist: its streamlined licensing process (1\u20133 months vs. 6\u201312 months in France), progressive space resources framework, and established institutional ecosystem provide competitive differentiation even within a harmonized EU framework.",
              },
            ],
          },
          // Lesson 2.3
          {
            slug: "multi-jurisdiction-compliance",
            title: "Multi-Jurisdiction Compliance",
            type: "THEORY",
            estimatedMinutes: 8,
            content: [
              {
                type: "heading",
                content: "Operating Across Multiple Jurisdictions",
              },
              {
                type: "paragraph",
                content:
                  "Many space operators have presence in multiple European countries. A company might be incorporated in Luxembourg, operate ground stations in Sweden and Spain, and launch from French Guiana. This multi-jurisdiction footprint creates layered compliance obligations that require careful navigation.",
              },
              {
                type: "key_concept",
                content:
                  "Primary Jurisdiction: Under the EU Space Act, an operator's primary jurisdiction is determined by establishment (where the entity is legally established). The primary NCA handles authorization and serves as the main supervisory contact. However, NCAs in countries where the operator has significant physical presence may have concurrent oversight authority.",
              },
              {
                type: "paragraph",
                content:
                  "The EU Space Act's mutual recognition provision (Art. 16) simplifies multi-jurisdiction operations but does not eliminate all complexity. Operators must still comply with host-country requirements for ground infrastructure, local environmental regulations, spectrum licensing (which remains nationally managed), and any security-related conditions imposed by countries where ground stations are located.",
              },
              {
                type: "list",
                content:
                  "Multi-jurisdiction compliance checklist:\n\u2022 Identify primary jurisdiction based on legal establishment\n\u2022 Map all countries with operational presence (ground stations, offices, launch sites)\n\u2022 Determine applicable national space laws for each jurisdiction\n\u2022 Identify NIS2 transposition differences across relevant member states\n\u2022 Verify spectrum licensing requirements in each ground station country\n\u2022 Assess data sovereignty and export control implications\n\u2022 Establish relationships with relevant NCAs and CSIRTs",
              },
            ],
          },
          // Lesson 2.4
          {
            slug: "national-laws-quiz",
            title: "Jurisdiction Knowledge Check",
            type: "QUIZ",
            estimatedMinutes: 8,
            questions: [
              {
                questionText:
                  "Which country enacted the first Space Resources Act in Europe?",
                questionType: "JURISDICTION_COMPARE",
                options: [
                  { id: "a", text: "France", isCorrect: false },
                  { id: "b", text: "Luxembourg", isCorrect: true },
                  { id: "c", text: "Belgium", isCorrect: false },
                  { id: "d", text: "United Kingdom", isCorrect: false },
                ],
                explanation:
                  "Luxembourg enacted its Space Resources Act in 2017, making it one of the first countries globally to establish a legal framework for space resource utilization.",
              },
              {
                questionText:
                  "Which country has a statutory liability cap of EUR 60M for space operators?",
                questionType: "JURISDICTION_COMPARE",
                options: [
                  { id: "a", text: "Germany", isCorrect: false },
                  { id: "b", text: "Netherlands", isCorrect: false },
                  { id: "c", text: "France", isCorrect: true },
                  { id: "d", text: "Belgium", isCorrect: false },
                ],
                explanation:
                  "France's Loi relative aux op\u00e9rations spatiales (LOS) includes a statutory liability cap of EUR 60 million, above which the French state assumes liability.",
              },
              {
                questionText:
                  "Which European country currently lacks a comprehensive dedicated space act?",
                questionType: "JURISDICTION_COMPARE",
                options: [
                  { id: "a", text: "France", isCorrect: false },
                  { id: "b", text: "Belgium", isCorrect: false },
                  { id: "c", text: "Germany", isCorrect: true },
                  { id: "d", text: "Luxembourg", isCorrect: false },
                ],
                explanation:
                  "Germany currently lacks a comprehensive dedicated space act and relies on regulatory framework of DLR and aviation law analogy. A draft is in progress.",
              },
              {
                questionText:
                  "What year was the French Space Operations Act (LOS) enacted?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "2005", isCorrect: false },
                  { id: "b", text: "2008", isCorrect: true },
                  { id: "c", text: "2012", isCorrect: false },
                  { id: "d", text: "2018", isCorrect: false },
                ],
                explanation:
                  "The French LOS was enacted in 2008 and later amended in 2019.",
              },
              {
                questionText:
                  "Which global satellite operator is headquartered in Luxembourg?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "Eutelsat", isCorrect: false },
                  { id: "b", text: "Inmarsat", isCorrect: false },
                  { id: "c", text: "SES", isCorrect: true },
                  { id: "d", text: "Telesat", isCorrect: false },
                ],
                explanation:
                  "SES, the world's second-largest commercial satellite operator, is headquartered in Betzdorf, Luxembourg since 1985.",
              },
              {
                questionText:
                  "Under the EU Space Act, an authorization from one member state is valid across the entire EU.",
                questionType: "TRUE_FALSE",
                options: [
                  { id: "a", text: "True", isCorrect: true },
                  { id: "b", text: "False", isCorrect: false },
                ],
                explanation:
                  "Art. 16 of the EU Space Act provides for mutual recognition of authorizations across all EU member states.",
                relatedArticles: ["16"],
              },
              {
                questionText:
                  "Which authority acts as the NCA for space activities in France?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "ESA", isCorrect: false },
                  { id: "b", text: "CNES", isCorrect: true },
                  { id: "c", text: "ANSSI", isCorrect: false },
                  { id: "d", text: "DGA", isCorrect: false },
                ],
                explanation:
                  "CNES (Centre National d'\u00c9tudes Spatiales) serves as the licensing authority for space activities in France under the LOS.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // Course 4: Cross-Regulatory Compliance
  // ═══════════════════════════════════════════════════════════════
  {
    slug: "cross-regulatory-compliance",
    title: "Cross-Regulatory Compliance",
    subtitle:
      "Mastering the intersection of EU Space Act, NIS2, and national laws",
    description:
      "An advanced course exploring how the EU Space Act, NIS2 Directive, and national space laws interact. Learn to navigate overlapping requirements, resolve conflicts, and build a unified compliance strategy.",
    icon: "Layers",
    category: "CROSS_REGULATORY",
    level: "ADVANCED",
    estimatedMinutes: 90,
    isPremium: true,
    tags: ["cross-regulatory", "compliance-strategy", "advanced"],
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
      // ── Module 1: How Regulations Interact ──
      {
        title: "How Regulations Interact",
        description:
          "Understand the layered regulatory architecture and how to identify overlapping, complementary, and conflicting requirements.",
        lessons: [
          // Lesson 1.1
          {
            slug: "the-regulatory-stack",
            title: "The Three-Layer Regulatory Stack",
            type: "THEORY",
            estimatedMinutes: 15,
            content: [
              {
                type: "heading",
                content:
                  "International \u2192 EU \u2192 National: The Compliance Pyramid",
              },
              {
                type: "paragraph",
                content:
                  "Space operators face a unique regulatory challenge: compliance with three distinct layers of law that must be satisfied simultaneously. At the base sits international space law (the five UN treaties and ITU Radio Regulations). The middle layer is EU legislation (EU Space Act and NIS2). The top layer is national space law of the operator's home jurisdiction. Each layer adds requirements; none can be ignored.",
              },
              {
                type: "key_concept",
                content:
                  "Regulatory Hierarchy: International treaties set floor obligations on states. The EU Space Act harmonizes implementation across member states. National laws may exceed EU requirements but cannot fall below them. An operator must satisfy the highest applicable standard at each point in the stack.",
              },
              {
                type: "list",
                content:
                  "Layer 1 \u2014 International Space Law:\n\u2022 Outer Space Treaty (1967): Freedom of exploration, non-appropriation, state responsibility (Art. VI), liability (Art. VII)\n\u2022 Liability Convention (1972): Absolute liability on Earth, fault-based in space\n\u2022 Registration Convention (1975): Registration of space objects with the UN Secretary-General\n\u2022 ITU Radio Regulations: Spectrum coordination and orbital slot allocation\n\nLayer 2 \u2014 EU Legislation:\n\u2022 EU Space Act (COM(2025) 335): 119 articles, 8 compliance modules, harmonized authorization\n\u2022 NIS2 Directive (EU 2022/2555): Cybersecurity for entities in sectors of high criticality\n\u2022 GDPR: Data protection for Earth observation and positioning data\n\u2022 EU Dual-Use Regulation: Export controls for space technology\n\nLayer 3 \u2014 National Space Law:\n\u2022 10 European jurisdictions with dedicated space legislation\n\u2022 National implementation of NIS2 (transposition may vary)\n\u2022 National spectrum authorities (ITU coordination at national level)\n\u2022 National export control authorities",
              },
              {
                type: "comparison_table",
                content:
                  "How requirements overlap across the three layers for key compliance areas.",
                metadata: {
                  columns: [
                    "Compliance Area",
                    "International",
                    "EU Space Act",
                    "National (Example: FR)",
                  ],
                  rows: [
                    [
                      "Authorization",
                      "State must supervise (OST Art. VI)",
                      "Art. 6\u201316: NCA authorization required",
                      "LOS: CNES licensing with detailed technical review",
                    ],
                    [
                      "Registration",
                      "Registration Convention: UN register",
                      "Art. 32\u201339: URSO registry",
                      "LOS: French national registry + UN notification",
                    ],
                    [
                      "Liability",
                      "Liability Convention: state liable",
                      "Art. 66\u201372: operator insurance",
                      "LOS: EUR 60M cap, state indemnity above",
                    ],
                    [
                      "Debris",
                      "IADC guidelines (voluntary)",
                      "Art. 49\u201358: 5-year LEO disposal",
                      "LOS: CNES technical regulations (binding)",
                    ],
                    [
                      "Cybersecurity",
                      "ITU (limited)",
                      "Art. 40\u201348 + NIS2",
                      "ANSSI (NIS2 transposition) + CNES requirements",
                    ],
                  ],
                },
              },
              {
                type: "callout",
                content:
                  "The Caelex platform maintains 47 cross-reference mappings between the EU Space Act and national space laws, helping operators identify where national requirements exceed the EU baseline.",
                metadata: { variant: "info" },
              },
            ],
          },
          // Lesson 1.2
          {
            slug: "overlap-and-conflict-resolution",
            title: "Overlap & Conflict Resolution",
            type: "THEORY",
            estimatedMinutes: 15,
            content: [
              {
                type: "heading",
                content: "Managing Overlapping and Conflicting Requirements",
              },
              {
                type: "paragraph",
                content:
                  "When multiple regulatory frameworks apply simultaneously, requirements may overlap (addressing the same topic), complement each other (addressing different aspects), or potentially conflict. Operators need a systematic approach to identify and resolve these interactions.",
              },
              {
                type: "key_concept",
                content:
                  "Three Types of Interaction: (1) Overlap \u2014 Both frameworks require the same thing (e.g., EU Space Act Art. 40\u201348 and NIS2 Art. 21 both require cybersecurity measures). Comply once, document for both. (2) Complement \u2014 Frameworks address different aspects (e.g., EU Space Act covers debris, NIS2 covers cybersecurity). Comply with each independently. (3) Conflict \u2014 Frameworks impose incompatible requirements (rare but possible, e.g., different reporting timelines). Apply the stricter standard.",
              },
              {
                type: "paragraph",
                content:
                  "The most significant overlap exists between the EU Space Act cybersecurity module (Art. 40\u201348) and NIS2 Art. 21. The EU Space Act explicitly states that compliance with its cybersecurity requirements shall be considered as fulfilling the corresponding NIS2 obligations, reducing duplication. However, NIS2 may impose additional requirements through national transposition that go beyond the EU Space Act baseline.",
              },
              {
                type: "regulation_quote",
                content:
                  "Compliance with the cybersecurity requirements laid down in this Regulation shall be considered as fulfilling the corresponding obligations under Directive (EU) 2022/2555 for the space activities covered.",
                metadata: {
                  source: "COM(2025) 335, recital on NIS2 coherence",
                },
              },
              {
                type: "key_concept",
                content:
                  "Practical Resolution Strategy: (1) Map all applicable requirements from all layers. (2) Group by topic (cybersecurity, reporting, insurance, etc.). (3) Identify the strictest requirement in each group. (4) Build compliance processes around the strictest standard. (5) Document compliance against each framework separately for audit purposes.",
              },
              {
                type: "paragraph",
                content:
                  "For incident reporting, the timelines can vary: NIS2 requires 24h early warning and 72h notification for cybersecurity incidents. The EU Space Act requires 72h notification for significant orbital changes. National laws may have their own timelines. Operators should implement a unified incident response process that satisfies the shortest deadline across all applicable frameworks.",
              },
            ],
          },
          // Lesson 1.3
          {
            slug: "cross-regulatory-quiz",
            title: "Cross-Regulatory Knowledge Check",
            type: "QUIZ",
            estimatedMinutes: 10,
            questions: [
              {
                questionText:
                  "An operator satisfying EU Space Act cybersecurity requirements (Art. 40\u201348) is considered compliant with which other framework?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "GDPR", isCorrect: false },
                  {
                    id: "b",
                    text: "NIS2 (for space activities)",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "All national space laws",
                    isCorrect: false,
                  },
                  { id: "d", text: "ITU Radio Regulations", isCorrect: false },
                ],
                explanation:
                  "The EU Space Act explicitly states that compliance with its cybersecurity requirements fulfils the corresponding NIS2 obligations for covered space activities.",
              },
              {
                questionText:
                  "When EU Space Act and national law both address the same requirement, which standard applies?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "Always the EU standard", isCorrect: false },
                  {
                    id: "b",
                    text: "Always the national standard",
                    isCorrect: false,
                  },
                  { id: "c", text: "The stricter of the two", isCorrect: true },
                  {
                    id: "d",
                    text: "The operator may choose",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "The regulatory hierarchy requires compliance with the highest applicable standard. National laws may exceed EU requirements but cannot fall below them.",
              },
              {
                questionText:
                  "How many cross-reference mappings does the Caelex platform maintain between EU Space Act and national space laws?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "12", isCorrect: false },
                  { id: "b", text: "27", isCorrect: false },
                  { id: "c", text: "47", isCorrect: true },
                  { id: "d", text: "119", isCorrect: false },
                ],
                explanation:
                  "The Caelex space law engine maintains 47 cross-reference mappings between the EU Space Act and the 10 national space laws.",
              },
              {
                questionText:
                  "Which international treaty establishes the basis for state responsibility that the EU Space Act implements?",
                questionType: "ARTICLE_LOOKUP",
                options: [
                  {
                    id: "a",
                    text: "Liability Convention (1972)",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "Outer Space Treaty Art. VI (1967)",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "Registration Convention (1975)",
                    isCorrect: false,
                  },
                  { id: "d", text: "Moon Agreement (1979)", isCorrect: false },
                ],
                explanation:
                  "Article VI of the Outer Space Treaty (1967) establishes state responsibility for national space activities, which the EU Space Act implements through its authorization and supervision framework.",
                relatedArticles: ["OST Art. VI"],
              },
              {
                questionText:
                  "For an operator with ground stations in three EU countries, how many NCAs might have oversight authority?",
                questionType: "SCENARIO_DECISION",
                options: [
                  { id: "a", text: "Only the primary NCA", isCorrect: false },
                  { id: "b", text: "Up to 3 NCAs", isCorrect: true },
                  { id: "c", text: "All 27 EU NCAs", isCorrect: false },
                  {
                    id: "d",
                    text: "Only the European Commission",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "While the primary NCA handles authorization, NCAs in countries where the operator has significant physical presence (like ground stations) may have concurrent oversight authority.",
              },
              {
                questionText:
                  "Which compliance approach is recommended when facing overlapping requirements from multiple frameworks?",
                questionType: "SCENARIO_DECISION",
                options: [
                  {
                    id: "a",
                    text: "Comply with the least demanding standard to minimize costs",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "Build processes around the strictest standard and document for each framework",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "Comply with each framework separately with dedicated processes",
                    isCorrect: false,
                  },
                  {
                    id: "d",
                    text: "Request a waiver from the less demanding framework",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "The recommended approach is to comply with the strictest standard (which automatically satisfies less demanding ones) and maintain documentation that maps compliance to each applicable framework.",
              },
            ],
          },
        ],
      },
      // ── Module 2: The Complete Assessment ──
      {
        title: "The Complete Assessment",
        description:
          "Apply cross-regulatory knowledge to complex real-world scenarios.",
        lessons: [
          // Lesson 2.1
          {
            slug: "building-a-unified-strategy",
            title: "Building a Unified Compliance Strategy",
            type: "THEORY",
            estimatedMinutes: 12,
            content: [
              {
                type: "heading",
                content: "From Fragmented Compliance to Integrated Strategy",
              },
              {
                type: "paragraph",
                content:
                  "The most mature approach to cross-regulatory compliance is building a unified strategy that addresses all applicable frameworks through integrated processes. Rather than maintaining separate compliance programmes for the EU Space Act, NIS2, and national law, an integrated strategy identifies common controls and maps them to all applicable requirements simultaneously.",
              },
              {
                type: "key_concept",
                content:
                  "Unified Compliance Framework: A single set of internal policies, procedures, and controls designed to satisfy the highest applicable standard across all regulatory layers. Each control is tagged with the specific articles and requirements it addresses, enabling efficient audit responses across frameworks.",
              },
              {
                type: "list",
                content:
                  "Steps to build a unified compliance strategy:\n1. Regulatory Mapping: Identify all applicable frameworks (EU Space Act, NIS2, national laws, international treaties)\n2. Requirement Extraction: Extract all individual requirements from each framework\n3. Consolidation: Group overlapping requirements and identify the strictest standard in each group\n4. Control Design: Design internal controls that meet the strictest standard\n5. Evidence Framework: Map each control to all requirements it satisfies for audit traceability\n6. Gap Analysis: Identify any requirements not covered by existing controls\n7. Implementation: Deploy controls, train staff, establish monitoring\n8. Continuous Monitoring: Regular review as regulations evolve",
              },
              {
                type: "paragraph",
                content:
                  "The Caelex platform automates steps 1\u20133 and supports 4\u20138 through its compliance dashboard, cross-reference engine, and document vault. This reduces the manual effort from months to days for initial assessment and provides ongoing monitoring as regulations are updated.",
              },
            ],
          },
          // Lesson 2.2
          {
            slug: "cross-regulatory-scenarios",
            title: "Cross-Regulatory Scenarios",
            type: "INTERACTIVE",
            estimatedMinutes: 15,
            content: [
              {
                type: "heading",
                content: "Complex Compliance Scenarios",
              },
              {
                type: "paragraph",
                content:
                  "Work through these scenarios to practice applying cross-regulatory analysis. For each scenario, identify all applicable frameworks, the strictest requirements, and any potential conflicts.",
              },
              {
                type: "paragraph",
                content:
                  "Scenario A: A German SCO operating 50 LEO satellites detects a cybersecurity breach in its ground station. The breach has compromised TT&C credentials. Identify all applicable reporting obligations and their timelines.",
                metadata: {
                  applicableFrameworks: [
                    "EU Space Act Art. 40-48",
                    "NIS2 Art. 23",
                    "German NIS2 transposition",
                  ],
                  strictestTimeline: "24 hours (NIS2 early warning)",
                  additionalActions: [
                    "72h NIS2 notification",
                    "NCA notification per EU Space Act",
                    "BSI notification per German law",
                  ],
                },
              },
              {
                type: "paragraph",
                content:
                  "Scenario B: A Luxembourg-incorporated ISOS provider with ground stations in Sweden wants to provide debris removal services to a French satellite operator. Map the full regulatory landscape.",
                metadata: {
                  applicableFrameworks: [
                    "EU Space Act (all modules)",
                    "Luxembourg Law on Space Activities 2020",
                    "Swedish regulatory requirements for ground stations",
                    "French law implications (service to French operator)",
                    "NIS2 via Luxembourg transposition",
                  ],
                  primaryNCA: "Luxembourg Space Agency (LSA)",
                  additionalAuthorities: [
                    "Swedish Post and Telecom Authority (PTS)",
                    "CNES (advisory)",
                  ],
                },
              },
              {
                type: "paragraph",
                content:
                  "Scenario C: A Belgian PDP selling Earth observation data discovers that its imagery inadvertently captured a military installation in high resolution. Identify all applicable regulatory considerations.",
                metadata: {
                  applicableFrameworks: [
                    "EU Space Act (PDP obligations)",
                    "Belgian Space Law 2005",
                    "GDPR (if personal data in imagery)",
                    "EU Dual-Use Regulation",
                    "National security provisions (EU Space Act Art. 4)",
                  ],
                },
              },
            ],
          },
          // Lesson 2.3
          {
            slug: "ultimate-compliance-challenge",
            title: "Ultimate Compliance Challenge",
            type: "SIMULATION",
            estimatedMinutes: 25,
            simulationConfig: {
              scenarioId: "ultimate-compliance-challenge",
              description:
                "Complete a full cross-regulatory compliance assessment for AstroConnect S.A., a medium-large operator (180 employees, EUR 65M turnover) incorporated in the Netherlands. AstroConnect operates a 30-satellite MEO communication constellation, operates ground stations in the Netherlands, Italy, and Norway, provides broadband services to EU maritime and aviation customers, and plans to offer in-orbit servicing capabilities starting next year. Navigate all three regulatory layers and build a unified compliance strategy.",
              expectedOutcome: {
                operatorTypes: ["SCO", "ISOS"],
                regime: "standard",
                nis2Classification: "essential",
                primaryNCA: "Netherlands (Ministry of Economic Affairs)",
                additionalNCAs: ["Italy (ASI)", "Norway (NSA)"],
                applicableNationalLaws: [
                  "Netherlands Space Activities Act 2007",
                  "Italian framework",
                  "Norwegian Space Act 1969",
                ],
                criticalRequirements: 87,
                crossReferencesMapped: 23,
              },
            },
            content: [
              {
                type: "heading",
                content: "Simulation: The Ultimate Cross-Regulatory Challenge",
              },
              {
                type: "paragraph",
                content:
                  "This simulation tests your ability to conduct a comprehensive cross-regulatory compliance assessment. You will navigate all three regulatory layers for a complex operator with multi-jurisdiction presence and multiple operator classifications.",
              },
              {
                type: "key_concept",
                content:
                  "Scenario: AstroConnect S.A. is a Netherlands-incorporated operator with 180 employees and EUR 65M turnover. They operate a 30-satellite MEO communication constellation serving EU maritime and aviation customers. Ground stations are located in the Netherlands, Italy, and Norway. Next year, they plan to expand into in-orbit servicing, adding ISOS to their SCO classification.",
              },
              {
                type: "paragraph",
                content:
                  "This scenario requires you to consider: dual operator classification (SCO + ISOS), NIS2 essential entity classification (SATCOM provider with 180 employees), multi-jurisdiction compliance (NL, IT, NO), future-proofing for the ISOS expansion, and the interaction between the Netherlands Space Activities Act, Italian regulatory framework, and Norwegian Space Act with the EU Space Act.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // Course 5: Compliance Simulation Lab
  // ═══════════════════════════════════════════════════════════════
  {
    slug: "compliance-simulation-lab",
    title: "Compliance Simulation Lab",
    subtitle: "Hands-on compliance scenarios from startup to enterprise",
    description:
      "Practice compliance assessment in realistic scenarios spanning the full lifecycle of a space company. From a pre-seed startup launching its first CubeSat to an enterprise managing a mega-constellation, each simulation tests your ability to apply regulatory knowledge to real-world situations.",
    icon: "FlaskConical",
    category: "ADVANCED_TOPICS",
    level: "ADVANCED",
    estimatedMinutes: 120,
    isPremium: true,
    tags: ["simulation", "hands-on", "scenarios", "advanced"],
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
      // ── Module 1: Startup Scenarios ──
      {
        title: "Startup Scenarios",
        description:
          "Navigate compliance for early-stage space companies with limited resources.",
        lessons: [
          // Lesson 1.1
          {
            slug: "cubesat-startup-simulation",
            title: "CubeSat Startup: First Authorization",
            type: "SIMULATION",
            estimatedMinutes: 20,
            simulationConfig: {
              scenarioId: "cubesat-startup",
              description:
                "You are the compliance officer for NanoSat GmbH, a Berlin-based startup with 8 employees and EUR 500K in seed funding. The company plans to launch a 3U CubeSat for IoT data relay in a 520 km LEO sun-synchronous orbit. Guide the company through its first authorization process under the EU Space Act, determine the applicable regime, and prepare the compliance roadmap.",
              expectedOutcome: {
                operatorType: "SCO",
                regime: "light",
                eligibilityBasis: "small_enterprise",
                primaryNCA: "Germany (pending national implementation)",
                requiredDocuments: [
                  "authorization_application",
                  "technical_file",
                  "debris_mitigation_plan",
                  "cybersecurity_self_assessment",
                  "insurance_evidence",
                  "environmental_footprint_declaration_simplified",
                ],
                estimatedTimeline: "3-6 months",
                estimatedCost: "EUR 15,000-30,000 (insurance + fees)",
              },
            },
            content: [
              {
                type: "heading",
                content: "Simulation: Your First Space Authorization",
              },
              {
                type: "paragraph",
                content:
                  "NanoSat GmbH is a typical early-stage European space startup. With limited resources and no regulatory experience, they need to navigate the EU Space Act efficiently. This simulation walks you through the key decisions and documents required for a light-regime authorization.",
              },
              {
                type: "key_concept",
                content:
                  "Company Profile: NanoSat GmbH \u2014 8 employees, EUR 500K seed funding, Berlin-based. Mission: 3U CubeSat (4 kg) for IoT data relay. Orbit: 520 km SSO. Design lifetime: 3 years. Launch: rideshare on Falcon 9 (Transporter mission). Ground station: leased from SSC (Esrange).",
              },
              {
                type: "paragraph",
                content:
                  "Key challenges for this scenario include: Germany's lack of a dedicated space act (requiring creative regulatory navigation), qualifying for and applying under the light regime, securing affordable insurance for a CubeSat mission, meeting debris mitigation requirements (passive deorbit within 5 years from 520 km is feasible via atmospheric drag), and establishing basic cybersecurity measures on a startup budget.",
              },
              {
                type: "callout",
                content:
                  "This is one of the most common real-world scenarios in European space. Dozens of startups face this exact situation each year. The EU Space Act aims to make this process predictable and manageable.",
                metadata: { variant: "info" },
              },
            ],
          },
          // Lesson 1.2
          {
            slug: "eo-constellation-startup-simulation",
            title: "EO Constellation: Scaling Up",
            type: "SIMULATION",
            estimatedMinutes: 20,
            simulationConfig: {
              scenarioId: "eo-constellation-startup",
              description:
                "SightLine S.A., a Luxembourg-incorporated startup (25 employees, EUR 4M Series A), plans to deploy a constellation of 12 Earth observation microsatellites in 600 km SSO. They intend to sell multispectral imagery data to agricultural monitoring customers across the EU. Navigate the dual SCO/PDP classification, constellation-specific requirements, and data distribution obligations.",
              expectedOutcome: {
                operatorTypes: ["SCO", "PDP"],
                regime: "light",
                eligibilityBasis: "small_enterprise",
                primaryNCA: "Luxembourg Space Agency (LSA)",
                constellationRequirements: [
                  "constellation_management_plan",
                  "collision_avoidance_capability",
                  "coordinated_deorbit_plan",
                  "inter_satellite_link_security",
                ],
                dataObligations: [
                  "data_quality_standards",
                  "gdpr_compliance_for_imagery",
                  "dual_use_screening",
                ],
                estimatedTimeline: "2-4 months (Luxembourg fast-track)",
                estimatedCost:
                  "EUR 150,000-300,000 (insurance for 12 satellites)",
              },
            },
            content: [
              {
                type: "heading",
                content: "Simulation: Scaling to a Constellation",
              },
              {
                type: "paragraph",
                content:
                  "The jump from a single satellite to a constellation introduces significant regulatory complexity. Constellation operators face additional requirements around fleet management, collision avoidance, coordinated end-of-life disposal, and (for EO constellations) data handling obligations.",
              },
              {
                type: "key_concept",
                content:
                  "Company Profile: SightLine S.A. \u2014 25 employees, EUR 4M Series A, Luxembourg-incorporated. Mission: 12 EO microsatellites (50 kg each) for multispectral agricultural monitoring. Orbit: 600 km SSO in 3 orbital planes. Ground stations: Luxembourg (primary), Svalbard (polar pass). Data customers: EU agricultural agencies, commercial agritech companies.",
              },
              {
                type: "paragraph",
                content:
                  "This scenario explores: dual classification as SCO (spacecraft operations) and PDP (data distribution as primary business), Luxembourg's streamlined licensing process, constellation management requirements under the EU Space Act, GDPR implications for high-resolution Earth observation imagery, and the transition from light to standard regime as the company grows.",
              },
            ],
          },
        ],
      },
      // ── Module 2: Growth Scenarios ──
      {
        title: "Growth Scenarios",
        description:
          "Handle compliance challenges during company growth, including regime transitions and international expansion.",
        lessons: [
          // Lesson 2.1
          {
            slug: "regime-transition-simulation",
            title: "Regime Transition: Light to Standard",
            type: "SIMULATION",
            estimatedMinutes: 20,
            simulationConfig: {
              scenarioId: "regime-transition",
              description:
                "OrbitTech B.V. started as a small company qualifying for the light regime (30 employees, EUR 8M turnover). After a successful Series B, they now have 65 employees and EUR 14M turnover, pushing them above the light regime thresholds. They also plan to expand their constellation from 8 to 30 satellites. Navigate the transition from light to standard regime, including the additional documentation, enhanced cybersecurity audit, and increased insurance requirements.",
              expectedOutcome: {
                previousRegime: "light",
                newRegime: "standard",
                triggerFactors: [
                  "employee_count_above_50",
                  "turnover_above_10M",
                ],
                additionalRequirements: [
                  "full_cybersecurity_audit",
                  "enhanced_environmental_footprint_declaration",
                  "increased_insurance_coverage",
                  "quarterly_supervision_reports",
                  "full_debris_mitigation_plan_update",
                ],
                transitionTimeline: "6 months recommended",
                complianceGapCount: 12,
              },
            },
            content: [
              {
                type: "heading",
                content: "Simulation: Navigating Regime Transition",
              },
              {
                type: "paragraph",
                content:
                  "Growth is positive, but crossing the light regime thresholds triggers significant compliance changes. This simulation explores the practical challenges of transitioning from light to standard regime while maintaining operational continuity.",
              },
              {
                type: "key_concept",
                content:
                  "Company Profile: OrbitTech B.V. \u2014 Netherlands-incorporated, previously 30 employees / EUR 8M turnover (light regime). After Series B: 65 employees, EUR 14M turnover, constellation expanding from 8 to 30 LEO satellites for maritime IoT.",
              },
              {
                type: "paragraph",
                content:
                  "Key transition challenges include: identifying the 12 compliance gaps between light and standard regime, budgeting for a full cybersecurity audit (typically EUR 50,000\u2013100,000), updating the environmental footprint declaration from simplified to full format, renegotiating insurance coverage for the expanded constellation, and implementing quarterly reporting processes that were previously annual under the light regime.",
              },
              {
                type: "callout",
                content:
                  "Pro tip: Many growing companies proactively adopt standard regime practices before crossing the threshold. This avoids a disruptive compliance sprint and demonstrates maturity to investors and customers.",
                metadata: { variant: "info" },
              },
            ],
          },
          // Lesson 2.2
          {
            slug: "international-expansion-simulation",
            title: "International Expansion: Adding Jurisdictions",
            type: "SIMULATION",
            estimatedMinutes: 20,
            simulationConfig: {
              scenarioId: "international-expansion",
              description:
                "SpaceLink S.r.l., an Italian SATCOM operator (80 employees, EUR 25M turnover), is expanding its ground station network to France and establishing a sales office in the UK (post-Brexit). Navigate the multi-jurisdiction compliance requirements, including NIS2 transposition differences between Italy and France, UK Space Industry Act requirements for the UK presence, and the interaction between Italian, French, and EU Space Act requirements.",
              expectedOutcome: {
                primaryJurisdiction: "Italy",
                additionalJurisdictions: ["France", "UK (non-EU)"],
                italianRequirements: [
                  "ASI oversight",
                  "Italian NIS2 transposition",
                ],
                frenchRequirements: [
                  "CNES ground station approval",
                  "ANSSI cybersecurity",
                  "French spectrum licensing",
                ],
                ukRequirements: [
                  "UK Space Agency notification",
                  "UK telecom licensing",
                  "UK-specific data protection",
                ],
                keyComplexities: [
                  "NIS2 transposition differences between IT and FR",
                  "UK post-Brexit regulatory divergence",
                  "Data transfer UK-EU adequacy",
                  "Triple spectrum licensing",
                ],
              },
            },
            content: [
              {
                type: "heading",
                content: "Simulation: Expanding Across Borders",
              },
              {
                type: "paragraph",
                content:
                  "International expansion introduces multi-jurisdiction complexity. This simulation covers a SATCOM operator expanding from Italy to France (within the EU) and the UK (post-Brexit third country), requiring navigation of three distinct regulatory environments.",
              },
              {
                type: "key_concept",
                content:
                  "Company Profile: SpaceLink S.r.l. \u2014 Italian SATCOM operator, 80 employees, EUR 25M turnover. Currently operates GEO and MEO satellites with ground stations in Sicily. Expansion: new ground stations in Toulouse (France) and sales office in London (UK).",
              },
              {
                type: "paragraph",
                content:
                  "This scenario highlights the ongoing importance of national regulatory differences even under the harmonized EU Space Act, the specific challenges of UK engagement post-Brexit, and the practical complexity of managing spectrum licensing, cybersecurity compliance, and data handling across three jurisdictions.",
              },
            ],
          },
        ],
      },
      // ── Module 3: Enterprise Scenarios ──
      {
        title: "Enterprise Scenarios",
        description:
          "Tackle compliance for large-scale operators with complex regulatory footprints.",
        lessons: [
          // Lesson 3.1
          {
            slug: "mega-constellation-simulation",
            title: "Mega-Constellation Compliance",
            type: "SIMULATION",
            estimatedMinutes: 20,
            simulationConfig: {
              scenarioId: "mega-constellation",
              description:
                "EuroNet Communications AG (500 employees, EUR 200M turnover) operates a 200-satellite LEO broadband constellation and plans to expand to 600 satellites. As an essential entity under NIS2, they face the highest level of regulatory scrutiny. Navigate constellation management, spectrum coordination with ITU, enhanced debris mitigation for a congested orbital regime, and supply chain cybersecurity for hundreds of satellites from multiple manufacturers.",
              expectedOutcome: {
                operatorType: "SCO",
                regime: "standard",
                nis2Classification: "essential",
                constellationChallenges: [
                  "600_satellite_debris_plan",
                  "multi_orbital_plane_collision_avoidance",
                  "supply_chain_security_multiple_manufacturers",
                  "itu_spectrum_coordination",
                  "environmental_footprint_at_scale",
                ],
                estimatedComplianceBudget: "EUR 2-5M annually",
                dedicatedComplianceTeam: "8-12 FTE",
              },
            },
            content: [
              {
                type: "heading",
                content: "Simulation: Managing a Mega-Constellation",
              },
              {
                type: "paragraph",
                content:
                  "Mega-constellations represent the most complex compliance challenge in the space industry. With hundreds of satellites, multiple orbital planes, and critical infrastructure designation, operators must maintain compliance at industrial scale.",
              },
              {
                type: "key_concept",
                content:
                  "Company Profile: EuroNet Communications AG \u2014 Frankfurt-based, 500 employees, EUR 200M turnover. Current: 200 LEO broadband satellites at 550 km in 10 orbital planes. Planned: expansion to 600 satellites across 20 planes. Ground stations in Germany, Spain, Chile, Australia. Essential entity under NIS2.",
              },
              {
                type: "paragraph",
                content:
                  "Key enterprise-scale challenges include: debris mitigation for 600 objects (statistical collision analysis required, coordinated deorbit planning, on-orbit spare management), cybersecurity for a distributed ground network spanning four continents, environmental footprint of 30+ launches required for deployment, insurance for a constellation valued at EUR 3+ billion, and supply chain security when sourcing satellite buses from multiple manufacturers across different jurisdictions.",
              },
              {
                type: "callout",
                content:
                  "At this scale, compliance is not a one-time exercise but a continuous operational function. EuroNet would need a dedicated compliance team of 8\u201312 FTE with an annual budget of EUR 2\u20135 million for regulatory compliance alone.",
                metadata: { variant: "warning" },
              },
            ],
          },
          // Lesson 3.2
          {
            slug: "isos-provider-simulation",
            title: "In-Space Services: Regulatory Frontier",
            type: "SIMULATION",
            estimatedMinutes: 20,
            simulationConfig: {
              scenarioId: "isos-regulatory-frontier",
              description:
                "ClearOrbit S.A. (45 employees, EUR 12M turnover) is a French company developing active debris removal (ADR) spacecraft. They plan to capture and deorbit 5 defunct satellites per year using robotic capture technology. Navigate the novel regulatory challenges of ISOS operations, including proximity operations authorization, liability for ADR missions (who is responsible if the capture damages the target?), international coordination with the target satellite's registering state, and the evolving regulatory framework for in-space servicing.",
              expectedOutcome: {
                operatorType: "ISOS",
                regime: "standard",
                uniqueChallenges: [
                  "proximity_operations_authorization",
                  "target_debris_liability_allocation",
                  "international_coordination_with_registering_state",
                  "novel_risk_assessment_for_capture",
                  "insurance_for_third_party_objects",
                ],
                regulatoryGaps: [
                  "No standardized ADR authorization procedure yet",
                  "Liability allocation between ADR provider and target owner unclear",
                  "Insurance market still developing pricing models for ADR",
                ],
                primaryNCA: "CNES (France)",
              },
            },
            content: [
              {
                type: "heading",
                content: "Simulation: The Regulatory Frontier of ADR",
              },
              {
                type: "paragraph",
                content:
                  "Active debris removal (ADR) represents the cutting edge of both space technology and space regulation. The EU Space Act introduces the ISOS category partly to address these emerging activities, but many regulatory details are still evolving. This simulation explores the unique compliance challenges of ADR operations.",
              },
              {
                type: "key_concept",
                content:
                  "Company Profile: ClearOrbit S.A. \u2014 Toulouse-based, 45 employees, EUR 12M turnover. Technology: robotic capture spacecraft with nets and grappling arms. Mission: capture and deorbit 5 defunct satellites per year from LEO orbits. First target: a defunct ESA satellite at 800 km altitude.",
              },
              {
                type: "paragraph",
                content:
                  "This scenario highlights regulatory challenges that do not yet have clear answers: Who is liable if the capture manoeuvre damages the target object or creates additional debris? Does ClearOrbit need authorization from the state that registered the target object? How is insurance priced for ADR when there is no actuarial history? What proximity operations standards apply? These questions are at the frontier of space law development.",
              },
              {
                type: "callout",
                content:
                  "ADR is a strategic priority for the EU and ESA, with missions like ClearSpace-1 paving the way. The EU Space Act's ISOS framework provides a starting point, but operators should expect significant regulatory evolution in this area over the next 5 years.",
                metadata: { variant: "info" },
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // Course 6: Space Law Fundamentals
  // ═══════════════════════════════════════════════════════════════
  {
    slug: "space-law-fundamentals",
    title: "Space Law Fundamentals",
    subtitle: "From the Outer Space Treaty to modern regulation",
    description:
      "A beginner-friendly course covering the foundations of international space law and the modern regulatory landscape. Learn the 5 UN space treaties, key principles, and how they connect to contemporary European space regulation.",
    icon: "Scale",
    category: "FUNDAMENTALS",
    level: "BEGINNER",
    estimatedMinutes: 60,
    isPremium: false,
    tags: ["space-law", "fundamentals", "international", "treaties"],
    relatedComplianceModules: ["authorization", "registration", "insurance"],
    modules: [
      // ── Module 1: International Space Law 101 ──
      {
        title: "International Space Law 101",
        description:
          "Learn the foundational treaties and principles that govern all human activities in outer space.",
        lessons: [
          // Lesson 1.1
          {
            slug: "the-5-un-space-treaties",
            title: "The 5 UN Space Treaties",
            type: "THEORY",
            estimatedMinutes: 15,
            content: [
              {
                type: "heading",
                content: "The Foundation of Space Law",
              },
              {
                type: "paragraph",
                content:
                  "International space law is built on five United Nations treaties negotiated between 1967 and 1979. These treaties were developed under the auspices of the UN Committee on the Peaceful Uses of Outer Space (COPUOS) and establish the fundamental principles governing human activities in outer space. While these treaties were designed for a different era, they remain the bedrock upon which all modern space regulation \u2014 including the EU Space Act \u2014 is built.",
              },
              {
                type: "timeline",
                content:
                  "1967 \u2014 Outer Space Treaty (OST): The \u2018Magna Carta\u2019 of space law. Establishes freedom of exploration (Art. I), non-appropriation of outer space (Art. II), peaceful use (Art. IV), state responsibility for national activities (Art. VI), state liability for damage (Art. VII), jurisdiction over space objects (Art. VIII), duty to avoid harmful contamination (Art. IX). Ratified by 114 states.\n\n1968 \u2014 Rescue Agreement: Requires states to assist astronauts in distress and return them promptly to the launching state. Also requires return of space objects found on foreign territory. Operationalizes OST Art. V.\n\n1972 \u2014 Liability Convention: Establishes a dual liability regime. Absolute liability for damage caused on Earth\u2019s surface or to aircraft in flight (no need to prove fault). Fault-based liability for damage in outer space (between space objects). Enables states to claim compensation on behalf of their nationals.\n\n1975 \u2014 Registration Convention: Requires launching states to register space objects with the UN Secretary-General, providing orbital parameters and general function. Creates a public UN Register of Objects Launched into Outer Space. Establishes the concept of \u2018State of Registry\u2019 which retains jurisdiction and control (OST Art. VIII).\n\n1979 \u2014 Moon Agreement: Declares the Moon and its natural resources as the \u2018common heritage of mankind\u2019. Envisions an international regime for resource exploitation. Notably, it has very limited ratification (18 states) \u2014 no major space-faring nation has ratified it, making it largely ineffective.",
                metadata: {
                  events: [
                    {
                      year: 1967,
                      name: "Outer Space Treaty",
                      ratifications: 114,
                    },
                    { year: 1968, name: "Rescue Agreement", ratifications: 99 },
                    {
                      year: 1972,
                      name: "Liability Convention",
                      ratifications: 98,
                    },
                    {
                      year: 1975,
                      name: "Registration Convention",
                      ratifications: 72,
                    },
                    { year: 1979, name: "Moon Agreement", ratifications: 18 },
                  ],
                },
              },
              {
                type: "callout",
                content:
                  "The declining number of ratifications from 114 (OST) to 18 (Moon Agreement) reflects growing divergence in state interests as space activities became more commercial and strategically significant.",
                metadata: { variant: "info" },
              },
            ],
          },
          // Lesson 1.2
          {
            slug: "core-principles-of-space-law",
            title: "Core Principles of Space Law",
            type: "THEORY",
            estimatedMinutes: 12,
            content: [
              {
                type: "heading",
                content: "The Fundamental Principles",
              },
              {
                type: "paragraph",
                content:
                  "The five UN treaties establish several core principles that underpin all space law. Understanding these principles is essential because modern regulations like the EU Space Act are designed to implement and operationalize them at the national and supranational level.",
              },
              {
                type: "key_concept",
                content:
                  "Freedom of Exploration and Use (OST Art. I): Outer space, including the Moon and other celestial bodies, shall be free for exploration and use by all states without discrimination of any kind. This principle ensures that space remains accessible to all nations and is the legal basis for commercial space activities.",
              },
              {
                type: "key_concept",
                content:
                  "Non-Appropriation (OST Art. II): Outer space, including the Moon and other celestial bodies, is not subject to national appropriation by claim of sovereignty, by means of use or occupation, or by any other means. This prohibits states from claiming territory in space but does not address private property rights in space resources \u2014 a gap that Luxembourg's 2017 Space Resources Act and the US CSLCA 2015 attempt to address.",
              },
              {
                type: "key_concept",
                content:
                  "Peaceful Purposes (OST Art. IV): The Moon and other celestial bodies shall be used exclusively for peaceful purposes. Military bases, weapons testing, and military manoeuvres on celestial bodies are prohibited. However, the treaty does not ban all military activity in outer space (e.g., reconnaissance satellites are permitted).",
              },
              {
                type: "key_concept",
                content:
                  "State Responsibility (OST Art. VI): States bear international responsibility for national activities in outer space, whether carried out by governmental agencies or non-governmental entities. Activities of non-governmental entities require authorization and continuing supervision by the appropriate state. This article is the legal foundation for ALL national space licensing laws and the EU Space Act's authorization requirement.",
              },
              {
                type: "key_concept",
                content:
                  "State Liability (OST Art. VII + Liability Convention): A launching state is internationally liable for damage caused by its space objects. This creates a direct financial incentive for states to regulate and supervise their operators \u2014 and is the legal basis for national insurance requirements and the EU Space Act's insurance module.",
              },
              {
                type: "paragraph",
                content:
                  "These principles create a chain of accountability: states are responsible for their nationals' space activities (Art. VI), states must authorize and supervise those activities, and states are liable for damage (Art. VII). The EU Space Act translates this state-level obligation into an operator-level compliance framework, requiring operators to obtain authorization, maintain insurance, and comply with safety standards.",
              },
            ],
          },
          // Lesson 1.3
          {
            slug: "treaty-knowledge-quiz",
            title: "Treaty Knowledge Check",
            type: "QUIZ",
            estimatedMinutes: 8,
            questions: [
              {
                questionText:
                  "Which treaty is known as the 'Magna Carta' of space law?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "Rescue Agreement (1968)",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "Outer Space Treaty (1967)",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "Liability Convention (1972)",
                    isCorrect: false,
                  },
                  {
                    id: "d",
                    text: "Registration Convention (1975)",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "The Outer Space Treaty (1967) is widely referred to as the 'Magna Carta' of space law because it establishes the foundational principles upon which all other space law is built.",
              },
              {
                questionText:
                  "How many states have ratified the Moon Agreement?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "18", isCorrect: true },
                  { id: "b", text: "72", isCorrect: false },
                  { id: "c", text: "98", isCorrect: false },
                  { id: "d", text: "114", isCorrect: false },
                ],
                explanation:
                  "Only 18 states have ratified the Moon Agreement, and no major space-faring nation has done so, making it largely ineffective.",
              },
              {
                questionText:
                  "Which article of the OST prohibits national appropriation of outer space?",
                questionType: "ARTICLE_LOOKUP",
                options: [
                  { id: "a", text: "Article I", isCorrect: false },
                  { id: "b", text: "Article II", isCorrect: true },
                  { id: "c", text: "Article IV", isCorrect: false },
                  { id: "d", text: "Article VI", isCorrect: false },
                ],
                explanation:
                  "Article II of the Outer Space Treaty states that outer space is not subject to national appropriation by claim of sovereignty, use, occupation, or any other means.",
                relatedArticles: ["OST Art. II"],
              },
              {
                questionText:
                  "The Liability Convention establishes absolute liability for all space-related damage.",
                questionType: "TRUE_FALSE",
                options: [
                  { id: "a", text: "True", isCorrect: false },
                  { id: "b", text: "False", isCorrect: true },
                ],
                explanation:
                  "The Liability Convention establishes a DUAL regime: absolute liability for damage on Earth's surface, but fault-based liability for damage in outer space between space objects.",
              },
              {
                questionText:
                  "Which treaty requires launching states to register space objects with the UN?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "Outer Space Treaty", isCorrect: false },
                  { id: "b", text: "Rescue Agreement", isCorrect: false },
                  { id: "c", text: "Liability Convention", isCorrect: false },
                  { id: "d", text: "Registration Convention", isCorrect: true },
                ],
                explanation:
                  "The Registration Convention (1975) requires launching states to register space objects with the UN Secretary-General.",
              },
              {
                questionText:
                  "OST Article VI is the legal foundation for which type of modern regulation?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "Cybersecurity regulations",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "National space licensing laws and the EU Space Act authorization requirement",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "Environmental protection regulations",
                    isCorrect: false,
                  },
                  { id: "d", text: "Spectrum allocation", isCorrect: false },
                ],
                explanation:
                  "OST Art. VI requires states to authorize and continuously supervise non-governmental space activities, providing the legal foundation for all national space licensing laws and the EU Space Act's authorization framework.",
                relatedArticles: ["OST Art. VI"],
              },
              {
                questionText:
                  "What year was the Registration Convention adopted?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "1967", isCorrect: false },
                  { id: "b", text: "1972", isCorrect: false },
                  { id: "c", text: "1975", isCorrect: true },
                  { id: "d", text: "1979", isCorrect: false },
                ],
                explanation:
                  "The Registration Convention was adopted in 1975 and has been ratified by 72 states.",
              },
              {
                questionText:
                  "Which principle allows commercial space activities to exist legally?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "Non-appropriation (Art. II)",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "Freedom of exploration and use (Art. I)",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "Peaceful purposes (Art. IV)",
                    isCorrect: false,
                  },
                  {
                    id: "d",
                    text: "Duty to avoid contamination (Art. IX)",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "Art. I of the Outer Space Treaty establishes that outer space is free for exploration and use by all states, which serves as the legal basis for commercial space activities.",
                relatedArticles: ["OST Art. I"],
              },
            ],
          },
        ],
      },
      // ── Module 2: The Modern Regulatory Landscape ──
      {
        title: "The Modern Regulatory Landscape",
        description:
          "Understand how international treaty obligations translate into modern national and EU regulation.",
        lessons: [
          // Lesson 2.1
          {
            slug: "from-treaties-to-national-laws",
            title: "From Treaties to National Laws",
            type: "THEORY",
            estimatedMinutes: 10,
            content: [
              {
                type: "heading",
                content: "Implementing Treaty Obligations",
              },
              {
                type: "paragraph",
                content:
                  "International space treaties create obligations on states, not on private companies. To fulfil their treaty obligations \u2014 particularly Art. VI (authorization and supervision) and Art. VII (liability) of the Outer Space Treaty \u2014 states must create national legislation that regulates private space activities. This is why national space laws exist, and it is the fundamental reason why the EU Space Act was proposed.",
              },
              {
                type: "key_concept",
                content:
                  "The Implementation Chain: International Treaty \u2192 State Obligation \u2192 National Legislation \u2192 Operator Compliance. The EU Space Act adds a supranational layer between state obligation and national legislation, harmonizing how member states implement their treaty obligations for space activities.",
              },
              {
                type: "paragraph",
                content:
                  "By 2025, over 30 countries had enacted some form of national space legislation. In Europe, 10 countries have dedicated space laws, ranging from France's comprehensive 2008 LOS to Norway's minimal 1969 Act. The variation in national approaches created an uneven regulatory landscape within the EU, with different licensing requirements, liability regimes, and oversight mechanisms. This fragmentation hampered the EU internal market for space services.",
              },
              {
                type: "list",
                content:
                  "Why national implementation varies:\n\u2022 Different space industrial bases (France has Arianespace and Thales; Luxembourg has SES; Germany has OHB and launch startups)\n\u2022 Different risk appetites and liability approaches\n\u2022 Different administrative traditions (centralized vs. delegated authority)\n\u2022 Different levels of space activity (France launches rockets; Denmark does not)\n\u2022 Different geopolitical considerations (some countries host ESA facilities, others do not)",
              },
              {
                type: "paragraph",
                content:
                  "The EU Space Act aims to resolve this fragmentation by establishing a harmonized baseline that all member states must meet. National laws can exceed this baseline (as France's CNES technical regulations do) but cannot fall below it. This preserves national sovereignty while creating a level playing field for the internal market.",
              },
            ],
          },
          // Lesson 2.2
          {
            slug: "the-rise-of-commercial-space",
            title: "The Rise of Commercial Space",
            type: "THEORY",
            estimatedMinutes: 10,
            content: [
              {
                type: "heading",
                content: "New Space and the Regulatory Challenge",
              },
              {
                type: "paragraph",
                content:
                  "The space industry has undergone a dramatic transformation since the turn of the millennium. What was once the exclusive domain of government agencies and a handful of prime contractors has become a dynamic ecosystem of startups, mid-caps, and tech giants. This \u2018New Space\u2019 revolution has outpaced the evolution of space regulation, creating the urgency behind the EU Space Act.",
              },
              {
                type: "key_concept",
                content:
                  "The Numbers: Global space economy revenues exceeded USD 460 billion in 2024. Over 10,000 active satellites in orbit (up from ~1,000 in 2010). SpaceX alone has launched over 6,000 Starlink satellites. Europe hosts over 1,500 space companies and startups. The EU space industry employs over 230,000 people.",
              },
              {
                type: "list",
                content:
                  "Key trends driving regulatory reform:\n\u2022 Mega-constellations: Thousands of satellites from single operators (Starlink, OneWeb, Kuiper)\n\u2022 Miniaturization: CubeSats and microsatellites lowering the barrier to entry\n\u2022 Commercial launch: Multiple European launch startups (Isar Aerospace, RFA, PLD Space)\n\u2022 In-space economy: Servicing, manufacturing, debris removal as new business models\n\u2022 Space tourism: Suborbital and orbital flights with paying customers\n\u2022 Dual-use concerns: Military and civilian applications increasingly intertwined\n\u2022 Space sustainability: Growing urgency around debris, environmental impact, and spectrum congestion",
              },
              {
                type: "paragraph",
                content:
                  "The EU Space Act responds to these trends by creating a framework that is both comprehensive (covering all operator types and activities) and proportionate (light regime for small operators). It aims to foster European space industry competitiveness while ensuring safety, sustainability, and security \u2014 the three pillars of modern space governance.",
              },
              {
                type: "callout",
                content:
                  "Europe's share of the global space economy is approximately 10%. The EU Space Act is partly an industrial policy tool, aiming to create regulatory certainty that attracts investment and enables European space companies to compete globally.",
                metadata: { variant: "info" },
              },
            ],
          },
          // Lesson 2.3
          {
            slug: "modern-landscape-quiz",
            title: "Modern Regulatory Landscape Quiz",
            type: "QUIZ",
            estimatedMinutes: 8,
            questions: [
              {
                questionText: "Why do states need national space laws?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  {
                    id: "a",
                    text: "International treaties directly regulate private companies",
                    isCorrect: false,
                  },
                  {
                    id: "b",
                    text: "To implement treaty obligations (especially OST Art. VI) requiring authorization and supervision of national space activities",
                    isCorrect: true,
                  },
                  {
                    id: "c",
                    text: "The UN requires all countries to have space laws",
                    isCorrect: false,
                  },
                  {
                    id: "d",
                    text: "ESA membership requires national space legislation",
                    isCorrect: false,
                  },
                ],
                explanation:
                  "International space treaties create obligations on states, not private entities. National laws implement these obligations \u2014 particularly Art. VI OST requiring authorization and supervision of non-governmental space activities.",
              },
              {
                questionText:
                  "Approximately how many active satellites were in orbit by 2024?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "About 1,000", isCorrect: false },
                  { id: "b", text: "About 5,000", isCorrect: false },
                  { id: "c", text: "Over 10,000", isCorrect: true },
                  { id: "d", text: "Over 100,000", isCorrect: false },
                ],
                explanation:
                  "Over 10,000 active satellites were in orbit by 2024, a dramatic increase from approximately 1,000 in 2010.",
              },
              {
                questionText:
                  "The EU Space Act allows national laws to set lower standards than the EU baseline.",
                questionType: "TRUE_FALSE",
                options: [
                  { id: "a", text: "True", isCorrect: false },
                  { id: "b", text: "False", isCorrect: true },
                ],
                explanation:
                  "National laws may exceed the EU Space Act baseline (setting stricter requirements) but cannot fall below it.",
              },
              {
                questionText:
                  "How many countries in Europe have dedicated national space legislation?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "5", isCorrect: false },
                  { id: "b", text: "10", isCorrect: true },
                  { id: "c", text: "15", isCorrect: false },
                  { id: "d", text: "27", isCorrect: false },
                ],
                explanation:
                  "10 European countries have enacted dedicated space laws: France, UK, Belgium, Netherlands, Luxembourg, Austria, Denmark, Germany (draft), Italy (framework), and Norway.",
              },
              {
                questionText:
                  "What is the approximate size of the global space economy?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "USD 100 billion", isCorrect: false },
                  { id: "b", text: "USD 250 billion", isCorrect: false },
                  { id: "c", text: "Over USD 460 billion", isCorrect: true },
                  { id: "d", text: "Over USD 1 trillion", isCorrect: false },
                ],
                explanation:
                  "Global space economy revenues exceeded USD 460 billion in 2024, encompassing satellite services, manufacturing, launch, and ground equipment.",
              },
              {
                questionText:
                  "What are the three pillars of the EU Space Act's approach to governance?",
                questionType: "MULTIPLE_SELECT",
                options: [
                  { id: "a", text: "Safety", isCorrect: true },
                  { id: "b", text: "Sustainability", isCorrect: true },
                  { id: "c", text: "Security", isCorrect: true },
                  { id: "d", text: "Sovereignty", isCorrect: false },
                ],
                explanation:
                  "The three pillars of the EU Space Act are safety, sustainability, and security \u2014 reflecting the comprehensive approach to modern space governance.",
              },
              {
                questionText:
                  "What is Europe's approximate share of the global space economy?",
                questionType: "MULTIPLE_CHOICE",
                options: [
                  { id: "a", text: "About 5%", isCorrect: false },
                  { id: "b", text: "About 10%", isCorrect: true },
                  { id: "c", text: "About 25%", isCorrect: false },
                  { id: "d", text: "About 40%", isCorrect: false },
                ],
                explanation:
                  "Europe's share of the global space economy is approximately 10%, which the EU Space Act aims to grow by creating regulatory certainty and a unified internal market for space services.",
              },
            ],
          },
        ],
      },
    ],
  },
];
