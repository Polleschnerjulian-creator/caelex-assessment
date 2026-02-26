/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary regulatory compliance simulation scenarios
 * that represent significant research and development investment.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Simulation Scenario Types ───

export interface SimulationScenario {
  id: string;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  category: string;
  estimatedMinutes: number;
  briefing: {
    companyName: string;
    companyDescription: string;
    headquarters: string;
    employees: number;
    founded: string;
    mission: string;
    orbit: string;
    services: string[];
    customers: string[];
    currentStatus: string;
  };
  expectedAnswers: {
    operatorType: string;
    activityType: string;
    entitySize: string;
    establishment: string;
    regime: string;
    jurisdiction: string;
    primaryOrbit: string;
    operatesConstellation: boolean;
    constellationSize: number | null;
    isDefenseOnly: boolean;
    offersEUServices: boolean;
    keyArticles: string[];
    criticalModules: string[];
    nis2Classification: string;
    keyRisks: string[];
  };
  scoringCriteria: {
    category: string;
    weight: number;
    description: string;
  }[];
  debrief: {
    keyInsights: string[];
    commonMistakes: string[];
    furtherReading: string[];
  };
}

// ─── Shared Scoring Criteria ───

const standardScoringCriteria: SimulationScenario["scoringCriteria"] = [
  {
    category: "Operator Classification",
    weight: 20,
    description:
      "Correctly identify the operator type (SCO/LO/LSO/ISOS/PDP/TCO)",
  },
  {
    category: "Regime Determination",
    weight: 15,
    description: "Accurately determine standard vs. light regime applicability",
  },
  {
    category: "Article Identification",
    weight: 20,
    description:
      "Identify the most relevant articles for this operator's situation",
  },
  {
    category: "Module Prioritization",
    weight: 15,
    description: "Rank compliance modules by urgency and relevance",
  },
  {
    category: "Cross-Regulatory Awareness",
    weight: 15,
    description:
      "Identify NIS2 classification and cross-regulatory obligations",
  },
  {
    category: "Remediation Planning",
    weight: 15,
    description:
      "Propose practical compliance steps with appropriate prioritization",
  },
];

// ─── Simulation Scenarios ───

export const simulationScenarios: SimulationScenario[] = [
  // ═══════════════════════════════════════════════════════════════════
  // COURSE 5 SCENARIOS (1-6)
  // ═══════════════════════════════════════════════════════════════════

  // ── Scenario 1: Berlin IoT Constellation ──────────────────────────
  {
    id: "course5-berlin-iot",
    title: "Berlin IoT Constellation",
    difficulty: "beginner",
    category: "course5",
    estimatedMinutes: 20,
    briefing: {
      companyName: "StellarConnect GmbH",
      companyDescription:
        "A Berlin-based NewSpace startup operating a small LEO nanosatellite constellation to provide narrowband IoT connectivity for maritime vessel tracking, logistics fleet management, and industrial sensor networks across Europe.",
      headquarters: "Berlin, Germany",
      employees: 25,
      founded: "2023",
      mission:
        "Deliver affordable, low-latency IoT connectivity to maritime and logistics operators using a constellation of 12 nanosatellites in low Earth orbit.",
      orbit: "LEO (550 km, 53 deg inclination)",
      services: [
        "Narrowband IoT data relay",
        "Maritime AIS augmentation",
        "Logistics asset tracking",
        "Industrial sensor telemetry",
      ],
      customers: [
        "DHL Supply Chain",
        "Maersk Line",
        "Deutsche Bahn Cargo",
        "European logistics SMEs",
      ],
      currentStatus:
        "First 4 satellites launched Q2 2025. Full constellation of 12 nanosats expected by Q4 2026. Currently seeking EU Space Act authorization from BNetzA (German NCA).",
    },
    expectedAnswers: {
      operatorType: "SCO",
      activityType: "spacecraft",
      entitySize: "small",
      establishment: "eu",
      regime: "light",
      jurisdiction: "DE",
      primaryOrbit: "LEO",
      operatesConstellation: true,
      constellationSize: 12,
      isDefenseOnly: false,
      offersEUServices: true,
      keyArticles: [
        "Art. 6",
        "Art. 7",
        "Art. 10",
        "Art. 24",
        "Art. 58",
        "Art. 59",
        "Art. 96",
      ],
      criticalModules: ["authorization", "debris", "registration"],
      nis2Classification: "out_of_scope",
      keyRisks: [
        "Constellation debris obligations escalate with fleet size",
        "Nanosatellite passivation requirements under Art. 58-59",
        "Potential reclassification if serving critical infrastructure clients",
        "Frequency coordination (ITU) required for each satellite",
      ],
    },
    scoringCriteria: standardScoringCriteria,
    debrief: {
      keyInsights: [
        "Light regime under Art. 10 significantly reduces the compliance burden for small entities operating spacecraft, including simplified authorization and reporting.",
        "Even small constellations of 12 satellites trigger debris mitigation obligations under Art. 58-59, including end-of-life disposal plans for each spacecraft.",
        "IoT connectivity for maritime and logistics does not currently qualify as critical infrastructure under NIS2 Annex I, keeping this operator out of scope.",
        "The German BNetzA serves as the National Competent Authority (NCA) for spacecraft operators headquartered in Germany under the EU Space Act.",
      ],
      commonMistakes: [
        "Assuming small entities are exempt from debris obligations \u2014 Art. 58 applies regardless of entity size.",
        "Classifying narrowband IoT as SATCOM critical infrastructure under NIS2 \u2014 it does not meet the threshold for essential or important entity classification.",
        "Overlooking that constellation growth beyond certain thresholds may require updated authorization and additional debris mitigation measures.",
      ],
      furtherReading: ["course1-lesson3", "course2-lesson2", "course3-lesson1"],
    },
  },

  // ── Scenario 2: Vienna Earth Observation ──────────────────────────
  {
    id: "course5-vienna-eo",
    title: "Vienna Earth Observation",
    difficulty: "beginner",
    category: "course5",
    estimatedMinutes: 25,
    briefing: {
      companyName: "AlpineView Raumfahrt GmbH",
      companyDescription:
        "An Austrian space startup specializing in high-resolution multispectral Earth observation imagery for precision agriculture. The company operates a small fleet of SSO satellites providing seasonal crop health assessments to farming cooperatives across Central Europe.",
      headquarters: "Vienna, Austria",
      employees: 18,
      founded: "2022",
      mission:
        "Provide affordable, timely agricultural imagery to European farmers cooperatives, enabling precision agriculture and supporting the EU Common Agricultural Policy (CAP) monitoring requirements.",
      orbit: "SSO (600 km, sun-synchronous)",
      services: [
        "Multispectral crop health imagery",
        "Vegetation index analysis (NDVI)",
        "Seasonal agricultural monitoring reports",
        "Copernicus Contributing Mission data feeds",
      ],
      customers: [
        "Austrian Farmers Cooperative (Raiffeisen Agrar)",
        "EU Copernicus Contributing Missions programme",
        "Bavarian Agricultural Ministry",
        "Croatian Agricultural Agency",
      ],
      currentStatus:
        "2 satellites operational since Q1 2025. 2 additional satellites scheduled for launch Q3 2026. Accepted as a Copernicus Contributing Mission, which adds EU-level data delivery obligations.",
    },
    expectedAnswers: {
      operatorType: "SCO",
      activityType: "spacecraft",
      entitySize: "small",
      establishment: "eu",
      regime: "light",
      jurisdiction: "AT",
      primaryOrbit: "LEO",
      operatesConstellation: true,
      constellationSize: 4,
      isDefenseOnly: false,
      offersEUServices: true,
      keyArticles: [
        "Art. 6",
        "Art. 7",
        "Art. 10",
        "Art. 24",
        "Art. 96",
        "Art. 97",
        "Art. 98",
      ],
      criticalModules: ["authorization", "environmental", "registration"],
      nis2Classification: "out_of_scope",
      keyRisks: [
        "Copernicus Contributing Mission obligations may impose additional data quality and availability requirements",
        "Environmental footprint declaration required under Art. 96-100 for all operators",
        "Austrian national space law (Weltraumgesetz) interacts with EU Space Act authorization",
        "Data policy obligations if providing EO data to government programmes",
      ],
    },
    scoringCriteria: standardScoringCriteria,
    debrief: {
      keyInsights: [
        "Even small Earth observation operators qualify for the light regime under Art. 10, but Copernicus Contributing Mission status adds EU-level data delivery and quality obligations on top of baseline compliance.",
        "The Environmental Footprint Declaration (Art. 96-100) applies to all spacecraft operators, including small EO startups \u2014 lifecycle assessment of the satellite and launch must be documented.",
        "Austrian national space law (Weltraumgesetz, BGBl. I Nr. 132/2011) requires a separate national authorization that will need to be reconciled with the EU Space Act authorization once the regulation enters into force.",
        "Earth observation data providers serving government programmes face additional data handling and distribution obligations that go beyond standard spacecraft operator requirements.",
        "The AT jurisdiction means the Austrian FFG (Forschungsfoerderungsgesellschaft) currently handles national space authorization, but the EU Space Act will designate a formal NCA.",
      ],
      commonMistakes: [
        "Forgetting that SSO orbits are a subset of LEO \u2014 the primary orbit classification is LEO, not a separate category.",
        "Assuming Copernicus participation exempts the operator from national authorization requirements \u2014 both EU and national obligations apply concurrently.",
        "Classifying EO imagery for agriculture as critical infrastructure under NIS2 \u2014 agricultural monitoring does not meet the NIS2 Annex I/II threshold.",
      ],
      furtherReading: ["course1-lesson3", "course3-lesson2", "course4-lesson1"],
    },
  },

  // ── Scenario 3: Dutch SATCOM Provider ─────────────────────────────
  {
    id: "course5-dutch-satcom",
    title: "Dutch SATCOM Provider",
    difficulty: "intermediate",
    category: "course5",
    estimatedMinutes: 35,
    briefing: {
      companyName: "NorthStar Communications BV",
      companyDescription:
        "A well-established Dutch satellite communications company operating GEO transponder satellites to provide secure, high-bandwidth communication services to EU institutions, NATO partners, and European government agencies. The company holds significant institutional contracts and is a key supplier for the EU strategic communications autonomy.",
      headquarters: "The Hague, Netherlands",
      employees: 120,
      founded: "2018",
      mission:
        "Provide sovereign, secure satellite communication capacity to European government entities and allied organizations, ensuring strategic communication independence for the EU.",
      orbit: "GEO (35,786 km, 13 deg E and 28.5 deg E orbital slots)",
      services: [
        "Secure government SATCOM capacity",
        "NATO SATCOM transponder leasing",
        "EU institutional communication links",
        "Maritime government vessel connectivity",
        "Disaster response communication backhaul",
      ],
      customers: [
        "European Commission (DG DEFIS)",
        "NATO Communications and Information Agency (NCIA)",
        "Dutch Ministry of Defence",
        "French Direction Generale de l'Armement (DGA)",
        "EU Emergency Response Coordination Centre (ERCC)",
      ],
      currentStatus:
        "3 operational GEO satellites. Contracted for GOVSATCOM pool participation. Undergoing NIS2 pre-assessment due to classification as essential entity providing SATCOM to critical infrastructure. Insurance renewal pending for 2026.",
    },
    expectedAnswers: {
      operatorType: "SCO",
      activityType: "spacecraft",
      entitySize: "medium",
      establishment: "eu",
      regime: "standard",
      jurisdiction: "NL",
      primaryOrbit: "GEO",
      operatesConstellation: false,
      constellationSize: null,
      isDefenseOnly: false,
      offersEUServices: true,
      keyArticles: [
        "Art. 6",
        "Art. 7",
        "Art. 8",
        "Art. 24",
        "Art. 44",
        "Art. 45",
        "Art. 74",
        "Art. 75",
        "Art. 76",
        "Art. 96",
      ],
      criticalModules: ["authorization", "cybersecurity", "nis2", "insurance"],
      nis2Classification: "essential",
      keyRisks: [
        "NIS2 essential entity classification triggers full Art. 21 cybersecurity measures and Art. 23 incident reporting",
        "GOVSATCOM pool participation adds additional security certification requirements",
        "GEO orbital slot management carries long-term liability and end-of-life graveyard orbit obligations",
        "Insurance costs for GEO assets are significantly higher than LEO \u2014 Art. 44-51 financial guarantee requirements",
        "Dual-use concerns with NATO contracts may trigger additional export control and security clearance requirements",
      ],
    },
    scoringCriteria: standardScoringCriteria,
    debrief: {
      keyInsights: [
        "GEO SATCOM operators serving government and critical infrastructure clients face the maximum compliance burden under both the EU Space Act and NIS2 Directive \u2014 this is the highest-complexity profile for a spacecraft operator.",
        "NIS2 classifies SATCOM providers serving government entities as essential entities under Annex I (Sector 11: Space), triggering full Art. 21(2)(a)-(j) cybersecurity measures and 24-hour incident reporting under Art. 23.",
        "GOVSATCOM pool participation under the EU Space Programme Regulation adds a separate layer of security accreditation requirements beyond standard EU Space Act authorization.",
        "Three GEO satellites do not constitute a constellation under the EU Space Act definition \u2014 constellation status requires coordinated operation of multiple satellites in a common orbital plane or architecture for a shared service.",
        "Insurance requirements under Art. 44-51 are proportional to risk, and GEO operations carry higher third-party liability exposure due to orbital longevity and collision risk in the GEO belt.",
      ],
      commonMistakes: [
        "Classifying 3 GEO satellites as a constellation \u2014 they are individual assets in separate orbital slots, not a coordinated constellation.",
        "Assuming NATO contracts make this operator defense-only \u2014 the company also serves EU civilian institutions, so it is not exempt under the defense exclusion.",
        "Underestimating the NIS2 compliance burden \u2014 essential entities face board-level accountability (Art. 20), mandatory incident reporting within 24 hours (Art. 23), and potential fines of up to EUR 10M or 2% of global turnover.",
        "Overlooking that the NL jurisdiction means the Dutch Radiocommunications Agency (Agentschap Telecom) may serve as the NIS2 competent authority alongside the space NCA.",
      ],
      furtherReading: ["course2-lesson3", "course3-lesson3", "course4-lesson2"],
    },
  },

  // ── Scenario 4: French Launch Vehicle ─────────────────────────────
  {
    id: "course5-french-launch",
    title: "French Launch Vehicle",
    difficulty: "intermediate",
    category: "course5",
    estimatedMinutes: 35,
    briefing: {
      companyName: "Vega Propulsion SAS",
      companyDescription:
        "A French NewSpace launch provider developing and operating a small launch vehicle capable of delivering up to 500 kg to low Earth orbit. The company conducts launches from the Centre Spatial Guyanais (CSG) in Kourou, French Guiana, under a commercial launch agreement with CNES. It primarily serves European small satellite operators seeking dedicated rideshare and dedicated launch services.",
      headquarters: "Toulouse, France",
      employees: 85,
      founded: "2020",
      mission:
        "Provide responsive, affordable dedicated launch access to LEO for European small satellite operators, reducing dependency on non-European launch providers and supporting EU launch autonomy.",
      orbit: "LEO delivery (400-800 km target orbits)",
      services: [
        "Dedicated small launch vehicle (500 kg to LEO)",
        "Rideshare launch integration",
        "Payload deployment services",
        "Launch-on-demand for EU institutional missions",
        "Third-party payload integration and testing",
      ],
      customers: [
        "European small satellite operators",
        "ESA institutional missions",
        "EU Space Programme (Galileo secondary payloads)",
        "German and Italian CubeSat universities",
      ],
      currentStatus:
        "Completed 2 successful demonstration launches in 2024-2025. First commercial launch scheduled Q1 2026. CNES launch license active. Seeking alignment with EU Space Act launch operator requirements ahead of regulation entry into force.",
    },
    expectedAnswers: {
      operatorType: "LO",
      activityType: "launch_vehicle",
      entitySize: "medium",
      establishment: "eu",
      regime: "standard",
      jurisdiction: "FR",
      primaryOrbit: "LEO",
      operatesConstellation: false,
      constellationSize: null,
      isDefenseOnly: false,
      offersEUServices: true,
      keyArticles: [
        "Art. 6",
        "Art. 8",
        "Art. 24",
        "Art. 44",
        "Art. 45",
        "Art. 58",
        "Art. 59",
        "Art. 96",
        "Art. 101",
        "Art. 102",
      ],
      criticalModules: [
        "authorization",
        "debris",
        "insurance",
        "environmental",
      ],
      nis2Classification: "important",
      keyRisks: [
        "Launch safety requirements under Art. 101-103 are among the most stringent in the EU Space Act",
        "Third-party liability insurance for launch operations (Art. 44-51) carries the highest premiums in the space sector",
        "Environmental footprint for launch operations includes atmospheric emissions, ground contamination, and marine debris",
        "CSG (Kourou) operations add French national space law (Loi relative aux operations spatiales, 2008) compliance layer",
        "Payload integration creates shared liability scenarios with third-party satellite operators",
      ],
    },
    scoringCriteria: standardScoringCriteria,
    debrief: {
      keyInsights: [
        "Launch operators (LO) face unique regulatory challenges not shared by spacecraft operators \u2014 including launch safety assessments (Art. 101-103), environmental impact from propellant use, and higher third-party liability insurance requirements.",
        "French national space law (Loi n. 2008-518 du 3 juin 2008) is one of the most comprehensive national frameworks in Europe, and CSG operations are regulated by CNES under French law \u2014 the EU Space Act will add an additional regulatory layer without replacing French requirements.",
        "NIS2 classifies launch service providers as important entities under the space sector, which triggers Art. 21 cybersecurity measures but with lower penalty thresholds than essential entities (EUR 7M or 1.4% turnover).",
        "Debris mitigation for launch operators focuses on upper stage passivation and controlled deorbiting \u2014 different from the satellite-focused debris obligations that spacecraft operators face.",
        "Environmental footprint requirements (Art. 96-100) for launch vehicles are particularly demanding, encompassing propellant toxicity, atmospheric deposition, marine debris from fairing separation, and ground-level noise and air quality impacts.",
      ],
      commonMistakes: [
        "Confusing launch operator (LO) with launch site operator (LSO) \u2014 Vega Propulsion operates the vehicle, not the CSG launch site itself (which is operated by CNES/Arianespace).",
        "Assuming the company qualifies for light regime because it has fewer than 100 employees \u2014 medium entities (50-249 employees or EUR 10-50M turnover) are subject to the standard regime.",
        "Overlooking the dual jurisdiction layer: French national space law continues to apply alongside the EU Space Act, creating a two-tier compliance requirement.",
      ],
      furtherReading: ["course1-lesson4", "course2-lesson3", "course3-lesson2"],
    },
  },

  // ── Scenario 5: Pan-European Constellation ────────────────────────
  {
    id: "course5-pan-european-constellation",
    title: "Pan-European Constellation",
    difficulty: "advanced",
    category: "course5",
    estimatedMinutes: 50,
    briefing: {
      companyName: "EuroSat Networks SA",
      companyDescription:
        "A large Luxembourg-headquartered satellite broadband operator building and operating one of Europe's largest LEO constellations. The company provides high-speed internet connectivity to underserved and rural regions across the EU, and is a key industrial partner in the IRIS2 programme. With ground stations in four countries and over 200 operational satellites, EuroSat represents the most complex compliance profile in the European space sector.",
      headquarters: "Luxembourg City, Luxembourg",
      employees: 520,
      founded: "2019",
      mission:
        "Bridge the digital divide across Europe by providing affordable, high-speed satellite broadband to underserved communities, while contributing to the EU strategic communications sovereignty through the IRIS2 programme.",
      orbit: "LEO (1,200 km, multi-plane Walker constellation)",
      services: [
        "Consumer satellite broadband internet",
        "Enterprise connectivity for rural businesses",
        "Government connectivity (IRIS2 programme)",
        "Maritime and aviation broadband",
        "EU institutional communications backbone",
        "Emergency response connectivity",
      ],
      customers: [
        "EU Commission (IRIS2 programme partner)",
        "Rural internet service providers (20+ EU countries)",
        "European maritime shipping companies",
        "National emergency services (DE, FR, ES, IT)",
        "European airline connectivity providers",
      ],
      currentStatus:
        "200+ satellites operational in LEO. Ground stations active in Germany (Weilheim), France (Toulouse), Spain (Maspalomas), and Norway (Svalbard). IRIS2 contract signed. Full constellation of 400 satellites planned by 2028. Currently undergoing NIS2 essential entity designation and comprehensive EU Space Act compliance programme.",
    },
    expectedAnswers: {
      operatorType: "SCO",
      activityType: "spacecraft",
      entitySize: "large",
      establishment: "eu",
      regime: "standard",
      jurisdiction: "LU",
      primaryOrbit: "LEO",
      operatesConstellation: true,
      constellationSize: 200,
      isDefenseOnly: false,
      offersEUServices: true,
      keyArticles: [
        "Art. 6",
        "Art. 7",
        "Art. 8",
        "Art. 24",
        "Art. 26",
        "Art. 27",
        "Art. 44",
        "Art. 45",
        "Art. 58",
        "Art. 59",
        "Art. 60",
        "Art. 74",
        "Art. 75",
        "Art. 76",
        "Art. 96",
        "Art. 104",
      ],
      criticalModules: [
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
        "200+ satellite constellation creates massive debris mitigation obligations with per-satellite disposal plans",
        "Multi-jurisdiction ground stations (DE, FR, ES, NO) create overlapping national regulatory obligations",
        "IRIS2 programme participation imposes EU-level security accreditation and data sovereignty requirements",
        "NIS2 essential entity designation triggers full Art. 21 measures, Art. 23 reporting, and Art. 32 supervision",
        "Large entity status means maximum exposure to EU Space Act enforcement (fines up to 4% global turnover)",
        "Constellation growth to 400 satellites will require updated authorization and additional debris assessments",
        "Insurance portfolio for 200+ LEO satellites represents a significant and complex financial undertaking",
      ],
    },
    scoringCriteria: [
      {
        category: "Operator Classification",
        weight: 15,
        description:
          "Correctly identify the operator type (SCO/LO/LSO/ISOS/PDP/TCO)",
      },
      {
        category: "Regime Determination",
        weight: 10,
        description:
          "Accurately determine standard vs. light regime applicability",
      },
      {
        category: "Article Identification",
        weight: 20,
        description:
          "Identify the most relevant articles for this operator's situation",
      },
      {
        category: "Module Prioritization",
        weight: 15,
        description: "Rank compliance modules by urgency and relevance",
      },
      {
        category: "Cross-Regulatory Awareness",
        weight: 20,
        description:
          "Identify NIS2 classification, IRIS2 obligations, and multi-jurisdiction complexities",
      },
      {
        category: "Remediation Planning",
        weight: 20,
        description:
          "Propose a phased compliance roadmap addressing all 8+ modules with appropriate sequencing",
      },
    ],
    debrief: {
      keyInsights: [
        "This scenario represents the maximum compliance complexity under the EU Space Act \u2014 all 8+ compliance modules are applicable, and the operator faces obligations under every title of the regulation.",
        "A 200+ satellite constellation triggers the highest tier of debris mitigation obligations, including fleet-level collision avoidance coordination, per-satellite end-of-life disposal plans, and aggregate orbital debris risk assessments.",
        "Multi-jurisdiction ground stations do not change the primary jurisdiction (LU), but each ground station country's national space law may impose additional local requirements for ground segment operations.",
        "IRIS2 programme participation creates a separate compliance track with EU-level security accreditation, data sovereignty requirements, and service-level obligations that go beyond standard EU Space Act compliance.",
        "NIS2 essential entity designation for a large SATCOM operator triggers the most stringent cybersecurity regime: board-level governance (Art. 20), full Art. 21(2)(a)-(j) measures, 24h incident reporting (Art. 23), and maximum penalties (EUR 10M or 2% turnover).",
      ],
      commonMistakes: [
        "Assuming ground station locations change the primary jurisdiction \u2014 the operator's establishment (LU) determines jurisdiction, not ground station locations.",
        "Underestimating the scale of debris obligations for a 200+ satellite constellation \u2014 this is not simply 200x the single-satellite requirement, but requires fleet-level coordination and risk management.",
        "Treating IRIS2 obligations as identical to standard EU Space Act requirements \u2014 IRIS2 adds a separate compliance layer with its own security and service-level requirements.",
        "Failing to account for the phased nature of compliance \u2014 with 400 satellites planned, the compliance programme must be designed to scale.",
      ],
      furtherReading: ["course2-lesson4", "course3-lesson3", "course4-lesson3"],
    },
  },

  // ── Scenario 6: The Regulatory Crisis ─────────────────────────────
  {
    id: "course5-regulatory-crisis",
    title: "The Regulatory Crisis",
    difficulty: "expert",
    category: "course5",
    estimatedMinutes: 60,
    briefing: {
      companyName: "OrbitDynamics AG",
      companyDescription:
        "A German satellite operator running a MEO navigation augmentation constellation. The company provides precision timing and positioning services to European critical infrastructure operators, including energy grid synchronization, financial transaction timestamping, and autonomous vehicle navigation augmentation. The company is facing a simultaneous convergence of regulatory crises that require immediate triage and action.",
      headquarters: "Munich, Germany",
      employees: 180,
      founded: "2021",
      mission:
        "Augment European GNSS capabilities with a dedicated MEO constellation providing centimetre-level positioning accuracy and nanosecond timing for critical infrastructure applications.",
      orbit: "MEO (8,000 km, 3 orbital planes at 56 deg inclination)",
      services: [
        "GNSS augmentation (centimetre-level accuracy)",
        "Precision timing for energy grid synchronization",
        "Financial transaction timestamping",
        "Autonomous vehicle navigation augmentation",
        "Critical infrastructure timing backup",
      ],
      customers: [
        "European energy grid operators (ENTSO-E members)",
        "Frankfurt Stock Exchange (Deutsche Boerse)",
        "Autonomous vehicle development consortia",
        "European railway operators (ERTMS augmentation)",
        "EU Agency for the Space Programme (EUSPA)",
      ],
      currentStatus:
        "45 MEO satellites operational across 3 orbital planes. CRISIS SITUATION: (1) New delegated act published last week changes debris passivation requirements for MEO orbits, requiring updated compliance within 6 months. (2) NIS2 audit scheduled in 3 weeks by BSI (German Federal Office for Information Security). (3) Insurance renewal deadline in 45 days \u2014 insurer is requesting an updated risk assessment reflecting the new delegated act. (4) BNetzA (German NCA) has requested full EU Space Act compliance documentation within 30 days following a routine supervisory review. All four events are converging simultaneously.",
    },
    expectedAnswers: {
      operatorType: "SCO",
      activityType: "spacecraft",
      entitySize: "medium",
      establishment: "eu",
      regime: "standard",
      jurisdiction: "DE",
      primaryOrbit: "MEO",
      operatesConstellation: true,
      constellationSize: 45,
      isDefenseOnly: false,
      offersEUServices: true,
      keyArticles: [
        "Art. 6",
        "Art. 8",
        "Art. 24",
        "Art. 26",
        "Art. 27",
        "Art. 28",
        "Art. 44",
        "Art. 45",
        "Art. 52",
        "Art. 53",
        "Art. 58",
        "Art. 59",
        "Art. 74",
        "Art. 75",
        "Art. 76",
        "Art. 104",
      ],
      criticalModules: [
        "supervision",
        "nis2",
        "insurance",
        "debris",
        "cybersecurity",
        "regulatory",
        "authorization",
        "registration",
      ],
      nis2Classification: "essential",
      keyRisks: [
        "NIS2 audit in 3 weeks \u2014 non-compliance findings could trigger enforcement action and fines up to EUR 10M or 2% turnover",
        "Insurance renewal at risk if updated risk assessment is not delivered on time \u2014 lapse in coverage violates Art. 44",
        "BNetzA documentation request must be satisfied within 30 days or supervisory escalation may follow",
        "New delegated act on MEO debris passivation requires technical and operational updates across all 45 satellites",
        "Navigation augmentation for critical infrastructure (energy, finance, transport) means maximum NIS2 scrutiny",
        "Simultaneous pressure across 4 regulatory fronts requires careful triage and resource allocation",
      ],
    },
    scoringCriteria: [
      {
        category: "Operator Classification",
        weight: 10,
        description:
          "Correctly identify the operator type (SCO/LO/LSO/ISOS/PDP/TCO)",
      },
      {
        category: "Regime Determination",
        weight: 10,
        description:
          "Accurately determine standard vs. light regime applicability",
      },
      {
        category: "Article Identification",
        weight: 15,
        description:
          "Identify the most relevant articles for this operator's crisis situation",
      },
      {
        category: "Module Prioritization",
        weight: 20,
        description:
          "Correctly triage and sequence the four simultaneous regulatory crises by urgency",
      },
      {
        category: "Cross-Regulatory Awareness",
        weight: 20,
        description:
          "Demonstrate understanding of how NIS2 audit, delegated acts, insurance, and NCA supervision interact",
      },
      {
        category: "Remediation Planning",
        weight: 25,
        description:
          "Propose a crisis management plan with week-by-week prioritization across all four fronts",
      },
    ],
    debrief: {
      keyInsights: [
        "Compliance is not a one-time exercise \u2014 it is an ongoing operational requirement that demands continuous monitoring, adaptation, and resource allocation across multiple regulatory fronts simultaneously.",
        "The correct triage order for this crisis is: (1) NIS2 audit preparation (3 weeks, immovable deadline), (2) BNetzA documentation (30 days, NCA request), (3) Insurance renewal risk assessment (45 days, contractual), (4) Delegated act compliance (6 months, regulatory transition).",
        "Navigation augmentation for energy grids, financial markets, and transport constitutes critical infrastructure under multiple NIS2 sectors (energy, financial market, transport), making this operator essential under NIS2 even before considering the space sector classification.",
        "MEO orbits present unique debris challenges \u2014 unlike LEO (where atmospheric drag assists deorbiting) or GEO (where graveyard orbits are standard), MEO debris mitigation requires active disposal strategies with longer timelines.",
        "The Regulatory Intelligence module (Module 08) is critical for operators at this scale \u2014 early detection of delegated acts and implementing acts prevents crisis situations like this one.",
      ],
      commonMistakes: [
        "Prioritizing the delegated act compliance (6-month deadline) over the NIS2 audit (3-week deadline) \u2014 always triage by urgency, not by perceived importance.",
        "Treating the four regulatory events as independent problems \u2014 they are interconnected (e.g., the delegated act affects the insurance risk assessment, and both affect the BNetzA documentation).",
        "Assuming medium entity size means reduced NIS2 obligations \u2014 medium entities providing critical infrastructure services are classified as essential, triggering maximum NIS2 requirements.",
        "Overlooking that BNetzA 30-day documentation request, while appearing routine, is a supervisory power under Art. 26-31 and non-compliance can escalate to formal enforcement.",
      ],
      furtherReading: ["course3-lesson4", "course4-lesson3", "course4-lesson4"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // FREE-PLAY SCENARIOS (7-10)
  // ═══════════════════════════════════════════════════════════════════

  // ── Scenario 7: Nordic Space Startup ──────────────────────────────
  {
    id: "freeplay-nordic-startup",
    title: "Nordic Space Startup",
    difficulty: "beginner",
    category: "freeplay",
    estimatedMinutes: 15,
    briefing: {
      companyName: "AuroraSpace AS",
      companyDescription:
        "A tiny Norwegian research startup founded by three PhD students from the University of Tromso. The company is developing experimental CubeSats for high-latitude aurora borealis monitoring and space weather research. Operating on a shoestring budget with grant funding from the Norwegian Space Agency and the Research Council of Norway.",
      headquarters: "Tromso, Norway",
      employees: 8,
      founded: "2024",
      mission:
        "Advance scientific understanding of aurora phenomena and space weather effects on polar communications through dedicated CubeSat observations from low Earth orbit.",
      orbit: "LEO (500 km, 87 deg near-polar orbit)",
      services: [
        "Aurora borealis imaging and spectroscopy",
        "Space weather particle measurements",
        "Ionospheric scintillation monitoring",
        "Open-access scientific data for the research community",
      ],
      customers: [
        "University of Tromso (UiT) Arctic Geophysics Department",
        "Norwegian Space Agency (NOSA)",
        "ESA Space Weather Programme",
        "International auroral research community (open data)",
      ],
      currentStatus:
        "First CubeSat (AuroraSat-1) launched as a secondary payload in Q4 2025. Second CubeSat (AuroraSat-2) manifested for launch in Q2 2026. Operating under Norwegian Space Activities Act with NOSA oversight.",
    },
    expectedAnswers: {
      operatorType: "SCO",
      activityType: "spacecraft",
      entitySize: "research",
      establishment: "eu",
      regime: "light",
      jurisdiction: "NO",
      primaryOrbit: "LEO",
      operatesConstellation: false,
      constellationSize: null,
      isDefenseOnly: false,
      offersEUServices: false,
      keyArticles: ["Art. 6", "Art. 7", "Art. 10", "Art. 24", "Art. 58"],
      criticalModules: ["authorization", "registration", "debris"],
      nis2Classification: "out_of_scope",
      keyRisks: [
        "Research entities must still comply with debris mitigation basics (Art. 58) even for CubeSats",
        "Norwegian Space Activities Act (Lov om romvirksomhet) requires national authorization alongside EU Space Act",
        "CubeSat end-of-life compliance \u2014 even small spacecraft need deorbit plans",
        "Grant-funded entities may lack resources for compliance; light regime alleviates but does not eliminate obligations",
      ],
    },
    scoringCriteria: standardScoringCriteria,
    debrief: {
      keyInsights: [
        "This is the simplest possible compliance profile under the EU Space Act \u2014 a research entity operating non-commercial CubeSats qualifies for the maximum simplification under the light regime (Art. 10).",
        "Norway, as an EEA member, falls within the EU Space Act scope. Norwegian operators are treated as EU-established entities for the purposes of the regulation.",
        "Even research CubeSats must comply with basic debris mitigation requirements \u2014 the 25-year deorbit guideline (or the stricter 5-year target in emerging guidelines) applies to all LEO spacecraft regardless of size or purpose.",
        "Research entities benefit from the most favorable entity size classification, with simplified authorization procedures, reduced reporting obligations, and lower financial guarantee requirements.",
        "Two independently operated CubeSats do not constitute a constellation \u2014 there must be coordinated operation for a shared service or mission objective.",
      ],
      commonMistakes: [
        "Classifying Norway as a third country \u2014 Norway is an EEA member and is treated as EU-established under the EU Space Act.",
        "Assuming research CubeSats are exempt from all compliance \u2014 the light regime simplifies but does not eliminate core obligations.",
        "Thinking two CubeSats form a constellation \u2014 they are separate research missions, not a coordinated constellation.",
      ],
      furtherReading: ["course1-lesson2", "course1-lesson3", "course2-lesson1"],
    },
  },

  // ── Scenario 8: Belgian Debris Removal ────────────────────────────
  {
    id: "freeplay-belgian-adr",
    title: "Belgian Debris Removal",
    difficulty: "intermediate",
    category: "freeplay",
    estimatedMinutes: 35,
    briefing: {
      companyName: "CleanOrbit SA",
      companyDescription:
        "A Belgian space technology company specializing in active debris removal (ADR) services. The company has developed a proprietary robotic capture mechanism for deorbiting defunct satellites and large debris objects in LEO. CleanOrbit operates its own servicer spacecraft that rendezvous with, capture, and deorbit target objects. This is a novel operational category that challenges traditional regulatory frameworks.",
      headquarters: "Liege, Belgium",
      employees: 45,
      founded: "2021",
      mission:
        "Clean up Earth's orbital environment by providing commercial active debris removal services, making low Earth orbit safer and more sustainable for all operators.",
      orbit:
        "LEO (variable \u2014 matches target debris orbits, typically 600-1,000 km)",
      services: [
        "Active debris removal (capture and deorbit)",
        "Defunct satellite deorbiting",
        "End-of-life spacecraft disposal assistance",
        "Pre-launch debris risk assessment consulting",
        "Orbital environment sustainability auditing",
      ],
      customers: [
        "ESA Clean Space initiative",
        "European constellation operators (post-mission disposal contracts)",
        "National space agencies (legacy debris remediation)",
        "Insurance companies (debris collision risk reduction)",
      ],
      currentStatus:
        "First demonstration mission (CleanSweep-1) completed in Q3 2025, successfully capturing and deorbiting a defunct ESA satellite. Two commercial ADR contracts signed for 2026-2027. Seeking EU Space Act authorization \u2014 regulatory classification is uncertain because ADR is not a traditional operator category.",
    },
    expectedAnswers: {
      operatorType: "SCO",
      activityType: "isos",
      entitySize: "small",
      establishment: "eu",
      regime: "standard",
      jurisdiction: "BE",
      primaryOrbit: "LEO",
      operatesConstellation: false,
      constellationSize: null,
      isDefenseOnly: false,
      offersEUServices: true,
      keyArticles: [
        "Art. 6",
        "Art. 8",
        "Art. 24",
        "Art. 44",
        "Art. 45",
        "Art. 58",
        "Art. 59",
        "Art. 60",
        "Art. 101",
      ],
      criticalModules: ["authorization", "debris", "insurance", "supervision"],
      nis2Classification: "out_of_scope",
      keyRisks: [
        "ADR operations involve deliberate proximity operations and physical contact with uncontrolled objects \u2014 creating unique liability scenarios",
        "Regulatory classification is ambiguous: ADR operators may be classified as ISOS providers, SCO, or a novel category depending on interpretation",
        "Standard regime applies despite small entity size because in-orbit servicing activities are inherently complex and high-risk",
        "Insurance for ADR operations is extremely difficult to obtain \u2014 the risk profile (deliberately approaching debris) is unprecedented",
        "Belgian national space law (Loi du 17 septembre 2005) must be reconciled with EU Space Act requirements for this novel activity type",
      ],
    },
    scoringCriteria: standardScoringCriteria,
    debrief: {
      keyInsights: [
        "Active debris removal is one of the most challenging regulatory classification scenarios under the EU Space Act \u2014 the activity type could be classified as ISOS (in-orbit servicing), SCO (spacecraft operator), or potentially a new category. The EU Space Act ISOS framework (in-orbit servicing and support) is the best fit.",
        "Despite being a small entity with only 45 employees, ADR operators should expect standard regime application because in-orbit proximity operations and debris capture represent inherently high-risk activities that are not suitable for simplified compliance.",
        "Insurance for ADR operations is a frontier challenge in space law \u2014 deliberately approaching and contacting uncontrolled objects inverts the normal liability framework, and insurers have limited actuarial data for this activity type.",
        "Belgian space law (Loi du 17 septembre 2005 relative aux activites de lancement, d'operation de vol ou de guidage d'objets spatiaux) is one of the earliest European national space laws and provides a solid domestic framework, but it was not designed for ADR activities.",
        "ADR operators play a critical role in the sustainability of the orbital environment and may benefit from future regulatory incentives or simplified procedures as the EU Space Act delegated acts are developed.",
      ],
      commonMistakes: [
        "Assuming small entity status automatically grants light regime \u2014 the nature of the activity (high-risk proximity operations) overrides entity size for regime determination.",
        "Classifying ADR as a standard spacecraft operation \u2014 the rendezvous, capture, and deliberate deorbit of third-party objects creates fundamentally different regulatory obligations than operating one's own spacecraft.",
        "Overlooking the unprecedented insurance challenges \u2014 ADR operators cannot use standard spacecraft insurance products and need bespoke coverage.",
        "Assuming the operator is out of NIS2 scope solely because it is small \u2014 while correct here, the reasoning should focus on the nature of services (ADR is not critical infrastructure), not just entity size.",
      ],
      furtherReading: ["course2-lesson2", "course2-lesson4", "course3-lesson2"],
    },
  },

  // ── Scenario 9: Italian Earth Station Network ─────────────────────
  {
    id: "freeplay-italian-ground",
    title: "Italian Earth Station Network",
    difficulty: "intermediate",
    category: "freeplay",
    estimatedMinutes: 30,
    briefing: {
      companyName: "TerraLink SpA",
      companyDescription:
        "An established Italian space infrastructure company operating a network of 12 ground stations across the Mediterranean basin. TerraLink provides telemetry, tracking, and command (TT&C) services, data downlink reception, and mission control support for a wide range of European satellite operators. The company does not own or operate any satellites but is a critical enabler of space operations for dozens of clients.",
      headquarters: "Rome, Italy",
      employees: 150,
      founded: "2015",
      mission:
        "Provide reliable, high-availability ground segment infrastructure across the Mediterranean, enabling European satellite operators to maintain continuous communication with their orbital assets.",
      orbit:
        "N/A (ground infrastructure \u2014 serves LEO, MEO, and GEO clients)",
      services: [
        "Telemetry, Tracking & Command (TT&C)",
        "Data downlink and reception",
        "Mission control centre hosting",
        "Ground station as a service (GSaaS)",
        "Satellite frequency coordination support",
        "Emergency satellite recovery operations",
      ],
      customers: [
        "European LEO constellation operators",
        "ESA for legacy mission TT&C",
        "Italian Space Agency (ASI) missions",
        "Commercial GEO satellite operators",
        "EU Space Surveillance and Tracking (EU SST) consortium",
      ],
      currentStatus:
        "12 ground stations operational across Italy (Matera, Fucino, Sardinia), Greece, Tunisia, and Spain. Pursuing EU Space Act compliance \u2014 classification is unclear as the company does not operate spacecraft. NIS2 pre-assessment underway given the critical nature of ground infrastructure for space operations.",
    },
    expectedAnswers: {
      operatorType: "SCO",
      activityType: "isos",
      entitySize: "medium",
      establishment: "eu",
      regime: "standard",
      jurisdiction: "IT",
      primaryOrbit: "LEO",
      operatesConstellation: false,
      constellationSize: null,
      isDefenseOnly: false,
      offersEUServices: true,
      keyArticles: [
        "Art. 6",
        "Art. 8",
        "Art. 24",
        "Art. 74",
        "Art. 75",
        "Art. 76",
        "Art. 44",
      ],
      criticalModules: [
        "authorization",
        "cybersecurity",
        "nis2",
        "insurance",
        "supervision",
      ],
      nis2Classification: "important",
      keyRisks: [
        "Ground station operators classification under the EU Space Act is nuanced \u2014 TT&C services may be classified as ISOS or as a supporting activity",
        "NIS2 classifies ground infrastructure operators as important entities under the space sector (Annex I)",
        "Multi-country ground station network creates data handling and cybersecurity obligations across multiple jurisdictions",
        "Critical dependency: if TerraLink ground stations go down, dozens of client satellites lose communication \u2014 systemic risk to the space sector",
        "Third-country ground stations (Tunisia) add export control and data sovereignty considerations",
      ],
    },
    scoringCriteria: standardScoringCriteria,
    debrief: {
      keyInsights: [
        "Ground segment classification under the EU Space Act is one of the most nuanced areas of the regulation \u2014 TT&C service providers may be classified as ISOS providers, as supporting infrastructure, or potentially as a separate category depending on the scope of delegated acts.",
        "NIS2 is arguably more impactful for ground station operators than the EU Space Act itself \u2014 ground infrastructure is explicitly listed under the space sector in NIS2 Annex I, and the critical nature of TT&C services (loss of which can render satellites uncontrollable) drives a high NIS2 classification.",
        "The cybersecurity module (Module 04) and NIS2 module (Module 09) are the highest-priority compliance areas for ground station operators \u2014 far more so than debris or environmental, which are primarily relevant to orbital operations.",
        "Multi-country ground station operations do not change the primary EU Space Act jurisdiction (IT), but each country's national cybersecurity authority may assert NIS2 jurisdiction over locally-operated ground stations.",
        "Ground station operators represent a systemic risk to the European space ecosystem \u2014 a successful cyberattack on a major TT&C provider could affect dozens of satellite missions simultaneously, which is why NIS2 classification is particularly important.",
      ],
      commonMistakes: [
        "Assuming ground station operators are outside the EU Space Act scope because they do not operate satellites \u2014 the regulation's definition of space activities includes ground-based supporting infrastructure.",
        "Focusing on debris and environmental modules for a ground station operator \u2014 these modules are primarily relevant to orbital operations, not ground infrastructure.",
        "Overlooking the systemic risk dimension \u2014 ground station operators are not assessed in isolation but as critical infrastructure for the entire space sector.",
        "Confusing primary orbit with the orbits served \u2014 TerraLink serves LEO, MEO, and GEO clients, but the operator itself does not have a primary orbit. LEO is selected as the default for ground-based operations.",
      ],
      furtherReading: ["course2-lesson1", "course3-lesson3", "course4-lesson2"],
    },
  },

  // ── Scenario 10: UK-Based Global Operator ─────────────────────────
  {
    id: "freeplay-uk-global",
    title: "UK-Based Global Operator",
    difficulty: "advanced",
    category: "freeplay",
    estimatedMinutes: 45,
    briefing: {
      companyName: "GalacticBridge Ltd",
      companyDescription:
        "A large UK-headquartered satellite communications operator running a GEO constellation that provides maritime broadband and VSAT services to customers across Europe, the Mediterranean, and the North Atlantic. Post-Brexit, the company finds itself in a complex regulatory position: it is established outside the EU but derives over 60% of its revenue from EU-based maritime customers and holds contracts with multiple EU government agencies for maritime safety communications.",
      headquarters: "London, United Kingdom",
      employees: 300,
      founded: "2012",
      mission:
        "Deliver ubiquitous, high-reliability maritime satellite communications across the Atlantic and Mediterranean, supporting both commercial shipping and maritime safety operations.",
      orbit: "GEO (35,786 km, 1 deg W and 25.5 deg W orbital slots)",
      services: [
        "Maritime broadband VSAT",
        "Fleet management and tracking",
        "Maritime safety communications (GMDSS adjacent services)",
        "EU fisheries monitoring system (FMS) connectivity",
        "Offshore energy platform communications",
        "Government maritime surveillance data relay",
      ],
      customers: [
        "Major European shipping lines (MSC, CMA CGM, Hapag-Lloyd)",
        "EU Fisheries Control Agency (EFCA)",
        "European Maritime Safety Agency (EMSA)",
        "Offshore energy operators (North Sea, Mediterranean)",
        "UK Maritime and Coastguard Agency (MCA)",
        "French Marine Nationale",
      ],
      currentStatus:
        "4 GEO satellites operational, providing coverage from 60 deg N to 30 deg S across the Atlantic and Mediterranean. Post-Brexit regulatory strategy under development. The company has established a small EU subsidiary in Dublin (GalacticBridge EU DAC, 15 employees) to maintain EU market access, but the question of whether this triggers full EU Space Act applicability is unresolved. UK Outer Space Act 1986 license held. Seeking clarity on dual regulatory requirements.",
    },
    expectedAnswers: {
      operatorType: "SCO",
      activityType: "spacecraft",
      entitySize: "large",
      establishment: "third_country_eu_services",
      regime: "standard",
      jurisdiction: "GB",
      primaryOrbit: "GEO",
      operatesConstellation: false,
      constellationSize: null,
      isDefenseOnly: false,
      offersEUServices: true,
      keyArticles: [
        "Art. 6",
        "Art. 8",
        "Art. 32",
        "Art. 33",
        "Art. 34",
        "Art. 35",
        "Art. 36",
        "Art. 37",
        "Art. 38",
        "Art. 39",
        "Art. 44",
        "Art. 74",
        "Art. 75",
      ],
      criticalModules: [
        "authorization",
        "cybersecurity",
        "nis2",
        "insurance",
        "supervision",
      ],
      nis2Classification: "essential",
      keyRisks: [
        "Third country operator (TCO) status under Art. 32-39 creates specific EU compliance obligations for operators offering services in the EU",
        "Dublin subsidiary raises complex questions: does a small EU entity trigger full EU establishment, or does the UK parent remain the primary regulated entity?",
        "Dual regulatory burden: UK Outer Space Act 1986 + EU Space Act TCO requirements apply simultaneously",
        "NIS2 applies to entities providing services in the EU regardless of establishment \u2014 SATCOM for EU maritime is essential",
        "Maritime safety communications adjacent to GMDSS carry additional regulatory scrutiny under both maritime and space law",
        "GEO orbital slots licensed under UK Ofcom \u2014 post-Brexit ITU filing coordination adds complexity",
        "Insurance requirements under both UK and EU regimes may overlap, creating dual financial guarantee obligations",
      ],
    },
    scoringCriteria: [
      {
        category: "Operator Classification",
        weight: 20,
        description:
          "Correctly identify TCO status and the implications of the Dublin subsidiary",
      },
      {
        category: "Regime Determination",
        weight: 15,
        description:
          "Accurately determine standard regime applicability for a third-country operator",
      },
      {
        category: "Article Identification",
        weight: 20,
        description:
          "Identify the TCO-specific articles (Art. 32-39) and general obligations",
      },
      {
        category: "Module Prioritization",
        weight: 15,
        description:
          "Rank compliance modules considering dual UK/EU regulatory requirements",
      },
      {
        category: "Cross-Regulatory Awareness",
        weight: 15,
        description:
          "Identify NIS2 extraterritorial application and UK Outer Space Act interactions",
      },
      {
        category: "Remediation Planning",
        weight: 15,
        description:
          "Propose a dual-compliance strategy addressing both UK and EU requirements",
      },
    ],
    debrief: {
      keyInsights: [
        "Post-Brexit UK operators serving EU markets face the most complex jurisdictional scenario under the EU Space Act \u2014 they must comply with both the UK Outer Space Act 1986 (and its successor legislation) and the EU Space Act third country operator (TCO) provisions under Art. 32-39.",
        "The Dublin subsidiary creates a critical strategic decision: if GalacticBridge EU DAC is deemed the EU establishment, the company could be regulated as an EU operator (potentially more predictable), but this would trigger full EU Space Act compliance rather than the TCO-specific regime.",
        "NIS2 extraterritorial reach means that even a UK-established SATCOM operator providing services to EU customers must comply with NIS2 cybersecurity requirements \u2014 the directive applies based on where services are provided, not solely where the entity is established.",
        "Maritime SATCOM operators face a unique cross-regulatory intersection: the EU Space Act, NIS2, maritime safety regulations (SOLAS/GMDSS), and potentially the EU Fisheries Control Regulation all impose obligations on maritime communications providers.",
        "Four GEO satellites in separate orbital slots do not constitute a constellation \u2014 similar to Scenario 3, these are independently positioned assets, not a coordinated multi-satellite architecture.",
      ],
      commonMistakes: [
        "Classifying GalacticBridge as an EU operator because of the Dublin subsidiary \u2014 the primary establishment and operational control remain in the UK, making this a TCO scenario unless the subsidiary is deliberately restructured as the primary operating entity.",
        "Assuming the UK is entirely outside the EU Space Act scope \u2014 the TCO provisions (Art. 32-39) specifically address third-country operators offering services in the EU single market.",
        "Overlooking NIS2 extraterritorial application \u2014 many analysts incorrectly assume NIS2 only applies to EU-established entities.",
        "Treating the 4 GEO satellites as a constellation \u2014 they are separate GEO assets in different orbital positions.",
      ],
      furtherReading: ["course1-lesson5", "course3-lesson4", "course4-lesson3"],
    },
  },
];
