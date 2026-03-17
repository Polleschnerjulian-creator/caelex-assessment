/**
 * France / CNES — Consolidated Jurisdiction Data
 *
 * This file REPLACES and CONSOLIDATES:
 * - The CNES profile from src/data/nca-profiles.ts
 * - The full content of src/data/cnes-regulatory-knowledge.ts
 * - The France entry from src/data/national-space-laws.ts
 * - The France entry from src/data/insurance-requirements.ts
 *
 * Sources:
 * - GBP SO-NG v3.0 (Guide des Bonnes Pratiques LOS, CNES 2025, 124 pages)
 * - Guide d'Hygiene Cyberscurite des Systemes Orbitaux (CNES 2025, 36 pages)
 * - RT 2024 (Reglementation Technique, Arrete du 31 mars 2011, modifie 28 juin 2024)
 * - IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)
 * - Notice Generale de Conformite Technique Template (CNES)
 * - Matrice de Conformite RT 2024 Template (CNES)
 * - Declaration de Fait Technique Template (CNES)
 */

import type { JurisdictionData, NationalRequirement } from "../types";

// ─── National Requirements (RT Articles 35-48) ──────────────────────────────

const FR_REQUIREMENTS: NationalRequirement[] = [
  // ── Operations (Art. 38-39) ──
  {
    id: "FR-RT-38-1",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 38-1",
      title: "Plan de controle durant la maitrise en orbite",
      fullText:
        "The operator shall establish and maintain a control plan for the duration of orbital " +
        "mastery, defining monitoring procedures, anomaly detection, and corrective actions. " +
        "The plan must cover nominal operations, safe-mode contingencies, and end-of-life transition.",
    },
    standardsMapping: [
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.2",
        relationship: "implements",
      },
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.2.1",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 58-63",
      confidence: "direct",
    },
    category: "supervision",
  },
  {
    id: "FR-RT-38-2",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 38-2",
      title: "Validation des procedures",
      fullText:
        "All operational procedures shall be validated prior to execution. Validation must " +
        "include simulation or test evidence demonstrating correct execution under nominal " +
        "and degraded conditions.",
    },
    standardsMapping: [
      {
        framework: "ECSS-U-AS-10C",
        reference: "Section 5.3",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 58",
      confidence: "direct",
    },
    category: "supervision",
  },
  {
    id: "FR-RT-39",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 39",
      title: "Capacite de maitrise de l'objet spatial",
      fullText:
        "The operator must demonstrate the capacity to master the space object throughout " +
        "all mission phases, including orbital control, attitude determination, and " +
        "telecommand/telemetry link integrity.",
    },
    standardsMapping: [
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.1",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 58",
      confidence: "direct",
    },
    category: "supervision",
  },
  {
    id: "FR-RT-39-3",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 39-3",
      title: "Cybersecurite",
      fullText:
        "The operator shall implement cybersecurity measures for all systems involved in " +
        "the space operation, covering both information technology (IT) and operational " +
        "technology (OT) segments. Risk assessment must follow EBIOS RM methodology. " +
        "ANSSI guidelines and CCSDS 350.1-G-3 space-specific threat taxonomy apply.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive (EU) 2022/2555",
        reference: "Art. 21",
        relationship: "implements",
      },
      {
        framework: "CCSDS 350.1-G-3",
        reference: "Full document",
        relationship: "implements",
      },
      {
        framework: "ANSSI Guidelines",
        reference: "EBIOS RM",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74-95",
      confidence: "direct",
    },
    category: "cybersecurity",
  },

  // ── Fragmentation Prevention (Art. 40) ──
  {
    id: "FR-RT-40-1",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 40.1",
      title: "Liberation intentionnelle d'un debris",
      fullText:
        "Intentional release of debris is prohibited unless a justified derogation is granted. " +
        "Any intentional separation of objects must be tracked and registered. Released objects " +
        "must comply with 25-year orbital lifetime limit.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.2.2",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.2.1",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 60",
      confidence: "direct",
    },
    category: "debris",
  },
  {
    id: "FR-RT-40-2",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 40.2",
      title: "Desintegration accidentelle",
      fullText:
        "The operator must demonstrate that the spacecraft design minimizes the risk of " +
        "accidental fragmentation from all internal causes: battery failure, propellant " +
        "explosion, pressure vessel burst, and kinetic energy release from rotating components.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.2.1",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.2.2",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 59",
      confidence: "direct",
    },
    category: "debris",
  },
  {
    id: "FR-RT-40-3",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 40.3",
      title: "Passivation",
      fullText:
        "All energy sources must be permanently depleted or placed in a state that presents " +
        "no risk of debris generation. All energy production means must be permanently " +
        "deactivated. Covers batteries, propellant, pressure vessels, reaction wheels, " +
        "and RF emissions per GBP v3.0 Section 3.3.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.2.3",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.2.3",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 67(1)(d)",
      confidence: "direct",
    },
    category: "debris",
  },

  // ── Collision Prevention (Art. 41) ──
  {
    id: "FR-RT-41",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 41",
      title: "Prevention des risques de collision avec les objets habites",
      fullText:
        "The operator must implement measures to prevent collision with crewed space objects. " +
        "Priority avoidance for ISS and crewed vehicles. Coordination with relevant space " +
        "surveillance services (CAESAR, EU SST, CSpOC) is mandatory.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.2.2",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.3",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 64",
      confidence: "direct",
    },
    category: "debris",
  },
  {
    id: "FR-RT-41-3",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 41-3",
      title: "Probabilite de collision avec un objet spatial",
      fullText:
        "The operator must quantify the probability of collision (Pc) for the mission lifetime. " +
        "Explicit Pc thresholds for maneuver trigger decisions must be defined. CNES expects " +
        "reference to CAESAR (CNES/ESA) conjunction analysis service.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.2.2",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.3.1",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 64(1)",
      confidence: "direct",
    },
    category: "debris",
  },
  {
    id: "FR-RT-41-6",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 41-6",
      title: "Seuil de declenchement des manoeuvres anti-collision",
      fullText:
        "The operator must define explicit collision avoidance maneuver trigger thresholds " +
        "based on Pc values, time-to-closest-approach, and miss distance. Thresholds must " +
        "be documented and justified in the compliance dossier.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.2.2",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 64(1)",
      confidence: "direct",
    },
    category: "debris",
  },

  // ── Orbit Saturation Prevention (Art. 41-8 to 41-13) ──
  {
    id: "FR-RT-41-8",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 41-8",
      title: "Obligation de retrait de service",
      fullText:
        "The operator is obligated to perform end-of-life disposal (retrait de service) at " +
        "mission conclusion. Disposal must be executed within the allocated timeline and with " +
        "documented reliability analysis (PdR — Probabilite de Reussite).",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.3.1",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.3.3",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72(1)",
      confidence: "direct",
    },
    category: "debris",
  },
  {
    id: "FR-RT-41-9",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 41-9",
      title: "Duree de vie orbitale maximum avant rentree atmospherique",
      fullText:
        "Maximum orbital lifetime before atmospheric re-entry is 25 years for LEO objects. " +
        "Compliance must be demonstrated using CNES STELA tool with mean, +2sigma, and " +
        "-2sigma solar activity scenarios. Generic parametric estimates are not accepted.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.3.2",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.3.3.2",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72(2)",
      confidence: "direct",
    },
    category: "debris",
  },
  {
    id: "FR-RT-41-12",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 41-12",
      title: "Fiabilite des operations de retrait de service",
      fullText:
        "The reliability of end-of-life disposal operations must be quantified. CNES expects " +
        "a probability of success (PdR) analysis per GBP v3.0 DR6 methodology, including " +
        "delta-V budget with minimum 10% margin and contingency procedures for failed disposal.",
    },
    standardsMapping: [
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.3.3.4",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72(5)",
      confidence: "direct",
    },
    category: "debris",
  },

  // ── Re-Entry (Art. 44-47) ──
  {
    id: "FR-RT-44",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 44",
      title:
        "Objectifs quantitatifs securite des personnes pour retour sur Terre",
      fullText:
        "Maximum admissible probability of causing at least one casualty (collective risk) " +
        "is 10^-4 (1:10,000) per re-entry event. Evaluation must cover atmospheric re-entry " +
        "strategy, population at planned re-entry date, fragmentation scenario, ground " +
        "dispersion, and spacecraft reliability.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.3.3",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.3.4",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72(4)",
      confidence: "direct",
    },
    category: "debris",
  },
  {
    id: "FR-RT-45",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 45",
      title: "Exigences rentree non controlee en fin de vie",
      fullText:
        "For uncontrolled re-entry: casualty risk must be assessed using CNES DEBRISK for " +
        "demise analysis and ELECTRA for ground casualty estimation. Declared Material List " +
        "(DML) is mandatory input. Surviving fragment inventory must be documented.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.3.3",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.3.4.2",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72(4)",
      confidence: "direct",
    },
    category: "debris",
  },
  {
    id: "FR-RT-46",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 46",
      title: "Prevention risques desorbitation et retombee (rentree controlee)",
      fullText:
        "For controlled re-entry: SPOUA (South Pacific Ocean Uninhabited Area) targeting is " +
        "required. Monte Carlo trajectory simulation using ELECTRA RC mode is mandatory. " +
        "NOTAM/AVURNAV notification procedures must be documented. Contingency procedures " +
        "for failed deorbitation burn must be defined.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.3.3",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.3.4.3",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72(4)",
      confidence: "direct",
    },
    category: "debris",
  },
  {
    id: "FR-RT-47",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 47",
      title: "Rentrees non nominales",
      fullText:
        "Risk of non-nominal re-entry must be assessed (e.g., propulsion failure during " +
        "deorbit). Probability of each failure mode must be included in overall casualty " +
        "risk calculation. Environmental impact (propellant toxicity, debris contamination) " +
        "must be evaluated per INERIS methodology.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.3.3",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.3.4",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72(4)",
      confidence: "direct",
    },
    category: "debris",
  },

  // ── Constellation-specific (Art. 48) ──
  {
    id: "FR-RT-48-1",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 48-1",
      title:
        "Probabilite de retrait de service des satellites d'une constellation",
      fullText:
        "For constellations: individual satellite disposal probability of success must be " +
        "quantified. Fleet-level statistical assessment required, including impact of " +
        "failed disposal on constellation collision risk and orbital debris environment.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.3.2",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.3.3",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72",
      confidence: "partial",
    },
    category: "debris",
  },
  {
    id: "FR-RT-48-2",
    nationalRef: {
      law: "RT 2024",
      article: "Art. 48-2",
      title: "Probabilite de victime au sol pour mega-constellations",
      fullText:
        "For mega-constellations: aggregate ground casualty probability from fleet re-entry " +
        "must be assessed. Cumulative risk from multiple re-entries over constellation " +
        "lifetime must remain within acceptable thresholds.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.3.3",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72(4)",
      confidence: "partial",
    },
    category: "debris",
  },
];

// ─── Full Knowledge Base (5 blocks from cnes-regulatory-knowledge.ts) ────────

const KNOWLEDGE_RT_MAPPING = `
## RT Article to GBP Chapter Mapping (GBP SO-NG v3.0, Tableau 1, pages 15-16)

### Operations
- Art. 38-1: Plan de controle durant la maitrise en orbite → GBP 3.7.2 (p.52) → EU Art. 58-63
- Art. 38-2: Validation des procedures → GBP 3.7.1 (p.48) → EU Art. 58
- Art. 39: Capacite de maitrise de l'objet spatial → GBP 3.7.1 (p.48) → EU Art. 58
- Art. 39-1: Identification des objets spatiaux → GBP 3.6.2 (p.43) → EU Art. 67(1)(e)
- Art. 39-2: Gestion des ergols → GBP 3.9 (p.56) → EU Art. 67(1)(d)
- Art. 39-3: Cybersecurite → GBP 6.1 (p.81) → EU Art. 74-95

### Fragmentation Prevention
- Art. 40.1: Liberation intentionnelle d'un debris → GBP 3.2 (p.18) → EU Art. 60
- Art. 40.2: Desintegration accidentelle → GBP 3.2.1 (p.19) → EU Art. 59
- Art. 40.3: Passivation → GBP 3.3 (p.21) → EU Art. 67(1)(d)
- Art. 40-2: Dispositif pour le retrait actif de debris → GBP 3.2.2 (p.20) → EU Art. 65-66

### Collision Prevention
- Art. 41: Prevention collisions objets habites → GBP 3.6.2 (p.43) → EU Art. 64
- Art. 41-1: Capacite anti-collision → GBP 3.6.2 (p.43) → EU Art. 64(3)
- Art. 41-2: Disponibilite manoevres anti-collision → GBP 3.6.2 (p.43) → EU Art. 64(2)
- Art. 41-3: Probabilite de collision → GBP 3.5 (p.32) → EU Art. 64(1)
- Art. 41-4: Prevention collisions a la separation lanceur → GBP 3.6.2 (p.43) → EU Art. 64(4)
- Art. 41-5: Coordination entre operateurs alerte collision → GBP 3.6.2 (p.43) → EU Art. 64(5)
- Art. 41-6: Seuil de declenchement manoeuvres → GBP 3.6.2 (p.43) → EU Art. 64(1)
- Art. 41-7: Partage de donnees → GBP 3.6.2 (p.43) → EU Art. 63

### Orbit Saturation Prevention
- Art. 41-8: Obligation de retrait de service → GBP 3.8 (p.53) → EU Art. 72(1)
- Art. 41-9: Duree vie orbitale max (25 ans LEO) → GBP 3.8 (p.53) → EU Art. 72(2)
- Art. 41-10: Orbite cimetiere entre region A et B → GBP 3.8 (p.53) → EU Art. 72(3)
- Art. 41-11: Orbite cimetiere au-dessus region B → GBP 3.8 (p.53) → EU Art. 72(3)
- Art. 41-12: Fiabilite retrait de service → GBP 3.10 (p.57) → EU Art. 72(5)
- Art. 41-13: Limitation orbite objets non manoevrants → GBP 3.4 (p.31) → EU Art. 72(2)
- Art. 41-14: Emissions radioelectriques → GBP 6.2 (p.81) → EU Art. 68-71

### Re-Entry
- Art. 44: Objectifs securite personnes retour sur Terre → GBP 4 (p.61) → EU Art. 72(4)
- Art. 45: Rentree non controlee fin de vie → GBP 5 (p.79) → EU Art. 72(4)
- Art. 46: Rentree controlee → GBP 4.7 (p.72) → EU Art. 72(4)
- Art. 46-1: Rentree controlee sur site → GBP 4.9 (p.76) → EU Art. 72(4)
- Art. 47: Rentrees non nominales → GBP 4.8 (p.74) → EU Art. 72(4)

### Constellations
- Art. 48-1: Probabilite retrait de service satellites constellation → GBP 8.1 (p.95) → EU Art. 72
- Art. 48-2: Probabilite victime au sol mega-constellations → GBP 8.2 (p.97) → EU Art. 72(4)
- Art. 48-3: Integration retour d'experience → GBP 8.1 (p.95) → EU Art. 72
- Art. 48-4: Collision intra-constellation apres retrait → GBP 8.1 (p.95) → EU Art. 64
- Art. 48-5: Capacite anti-collision mega-constellations → GBP 8.2 (p.97) → EU Art. 64
- Art. 48-6: Essais systeme vitaux avant orbite operationnelle → GBP 8.2 (p.97) → EU Art. 58
- Art. 48-7: Duree maximale retrait de service mega-constellation → GBP 8.2 (p.97) → EU Art. 72(2)
- Art. 48-8: Separation plans intra-constellation → GBP 8.1 (p.95) → EU Art. 64
- Art. 48-9: Separation entre megaconstellations → GBP 8.2 (p.97) → EU Art. 64
- Art. 48-10: Limitation perturbations optiques mega-constellation → GBP 8.2 (p.97) → EU Art. 68

### Mission Extension
- Art. 49-1: Conditions d'extension de mission → GBP 9 (p.100) → EU Art. 18
`;

const KNOWLEDGE_PASSIVATION = `
## CNES Passivation Requirements (GBP SO-NG v3.0, Section 3.3, RT Art. 40.3)

### Regulatory Basis
RT Art. 40.3: All energy sources must be permanently depleted or placed in a state that presents no risk of debris generation. All energy production means must be permanently deactivated.

### Definition of "Permanent" (per CNES GBP)
- Long-term stable state (fault-tolerant), favoring solutions with best stability in the encountered environment (thermal, radiation) excluding collision
- With confirmation of process initiation (activation of drainage systems) or achievement of target thresholds/states

### Energy Sources to Address (ALL must be covered)
1. **Batteries**: Discharge to safe Depth of Discharge (DoD). Consider CID (Current Interrupt Device) and UVD (Under-Voltage Detector) behavior. Multiple passivation circuit designs documented in GBP Figures 3-1 through 3-6:
   - Solar array relay opening circuits
   - Solar array short-circuit relays
   - Battery disconnection relays (NOT recommended by CNES)
   - Battery discharge through equipment consumption
   - Battery discharge through purge resistance (fixed or switchable)

2. **Propellant**: Complete depletion via depletion burns or controlled venting. For hypergolic propellants (MMH/NTO): specific venting procedures required.

3. **Pressure Vessels**: Depressurization of all pressurized systems (tanks, accumulators). Use Leak-Before-Burst (LBB) design where possible.

4. **Reaction Wheels / Momentum Wheels**: Spin-down to zero speed.

5. **RF Emissions**: Permanent interruption of all platform and payload radio emissions.

### CNES-Specific Expectations
- Passivation procedures must be updated before end-of-life to account for any in-mission failures affecting passivation capability
- Passivation should be performed as early as possible — systems no longer needed should be passivated immediately
- For controlled re-entry missions: passivation not required by RT Art. 40.3, but STRONGLY RECOMMENDED as contingency if re-entry becomes impossible
- Residual energy must be insufficient to cause spontaneous fragmentation, considering long-term degradation of passivated components
`;

const KNOWLEDGE_REENTRY = `
## CNES Re-Entry Risk Requirements (GBP SO-NG v3.0, Chapter 4, RT Art. 44-47)

### Quantitative Safety Objective
RT Art. 44: Maximum admissible probability of causing at least one casualty (collective risk) is 10^-4 (1:10,000).

### What Must Be Evaluated (per RT Art. 44.2)
- Atmospheric re-entry strategy (controlled or uncontrolled)
- Population at planned re-entry date
- All phenomena generating catastrophic damage risk
- Pre-fragmentation trajectories
- Fragmentation scenario modeling and resulting debris
- Ground dispersion of debris and effect evaluation
- Spacecraft reliability

### CNES Tools (MANDATORY)
1. **DEBRISK** (GBP Section 10.2): Object-oriented demise analysis tool
   - Input: Declared Material List (DML) with component shapes, masses, dimensions, materials
   - Models aerothermodynamic flux, structural breakup, fragment trajectories
   - Output: Surviving fragment inventory (shape, mass, impact velocity, energy)
   - Provides "_sim.txt" synthesis file that MUST be included in LOS dossier

2. **ELECTRA** (GBP Section 10.3): Casualty risk computation tool
   - Uncontrolled re-entry mode: Uses population density models (GPW) and fragment inventory
   - Controlled re-entry mode: Monte Carlo simulations for impact footprint
   - Computes "casualty area" (surface meurtrie) for each fragment
   - Output: Probability of >=1 casualty, geographic risk distribution

### Re-Entry Decision Flowchart (GBP Figure 4-2)
1. If casualty area (all fragments) > threshold from Tableau 4 → controlled re-entry required
2. If uncontrolled re-entry acceptable → verify 25-year orbit lifetime compliance
3. If controlled re-entry → target SPOUA (South Pacific Ocean Uninhabited Area)

### Controlled Re-Entry Specific Requirements
- Define SPOUA targeting corridor
- File NOTAM (Notice to Airmen) and AVURNAV (Avis d'Urgence aux Navigateurs)
- Monte Carlo simulation of re-entry trajectories (using ELECTRA RC mode)
- Contingency procedures for failed deorbitation burn

### Non-Nominal Re-Entry (RT Art. 47)
- Must assess risk of non-nominal re-entry (e.g., propulsion failure during deorbit)
- Include probability of each failure mode in overall casualty risk calculation
`;

const KNOWLEDGE_TOOLS = `
## CNES Software Tools (GBP SO-NG v3.0, Chapter 10)

All tools available at: https://www.connectbycnes.fr/los

### STELA (Semi-analytic Tool for End of Life Analysis)
- Purpose: Long-term orbit evolution verification for LEO (<2000km) and GEO compliance
- Method: Semi-analytical orbit propagation with averaged equations of motion
- Physical Constants:
  - Earth radius (LOS criteria): 6378 km
  - Gravity model: Grim5-S1
  - Solar radiation pressure at 1AU: 0.45605 x 10^-5 N/m2
- Required outputs in LOS dossier:
  - "_sim.txt" synthesis file (orbit propagation description, inputs/outputs, LOS criteria compliance)
  - "_sim.xml" corresponding file
  - "_shap.xml" file if STELA average surface calculator was used
- Must run with mean, +2sigma, and -2sigma solar activity scenarios
- Iterative utilities available for end-of-life orbit determination

### DEBRISK
- Purpose: Identify surviving objects/fragments during atmospheric re-entry
- Method: Object-oriented thermal/mechanical decomposition modeling
- Input: Satellite geometry decomposition (DML — Declared Material List)
- Output: Surviving fragment catalog with physical properties
- Decomposition method: hierarchical object tree modeling structural/thermal breakup

### ELECTRA
- Purpose: Quantify ground casualty risk from re-entry fragments
- Modes:
  - Uncontrolled re-entry (RNC): Population-weighted casualty area calculation
  - Controlled re-entry (RC): Monte Carlo trajectory simulation
  - Final orbit risk: Risk during operational lifetime
- Uses GPW (Gridded Population of the World) population model
- Computes casualty area per fragment using fragment energy and dimensions

### MASTER (ESA tool)
- Purpose: Estimate collision probability with debris catalog
- Available at: https://sdup.esoc.esa.int
- Used for conjunction risk assessment during mission lifetime
`;

const KNOWLEDGE_CYBER = `
## CNES Cybersecurity Requirements (Guide d'Hygiene Cybersecurite des Systemes Orbitaux, 2025)

### Framework
- Primary methodology: EBIOS RM (Expression des Besoins et Identification des Objectifs de Securite — Risk Manager)
- Governing authority: ANSSI (Agence Nationale de la Securite des Systemes d'Information)
- Reference standard: CCSDS 350.1-G-3 (Security threats against space missions)
- Applicable to both IT (Information Technology) and OT (Operational Technology) segments

### Key CNES Cyber Terminology
- PSSI: Politique de Securite des Systemes d'Information (Information Systems Security Policy)
- PGSC: Politique Generale de Securite et de Cybersecurite (General Security and Cybersecurity Policy)
- PCA: Plan de Continuite d'Activite (Business Continuity Plan)
- PRA: Plan de Reprise d'Activite (Recovery Plan)
- PAS: Plan Assurance Securite (Security Assurance Plan)
- ISP: Instruction de Securite Programme (Program Security Instruction)
- RSSI: Responsable Securite des Systemes d'Information (CISO equivalent)
- MCS: Maintien en Condition de Securite (Security Maintenance)
- MCO: Maintien en Condition Operationelle (Operational Maintenance)

### Families of Best Practices (per Guide Figure 2)
1. **Governance & Organization**: PSSI, RSSI designation, security committee, ISP
2. **Risk Management**: EBIOS RM analysis, threat landscape, CTI (Cyber Threat Intelligence)
3. **Protection**: Access control (MFA mandatory for critical operations), encryption (TT&C TRANSEC), key management (HSM, PKI, OTAR)
4. **Detection**: SOC (Security Operation Center), SIEM, IDPS, IoC monitoring
5. **Response**: CSIRT/CERT coordination, incident procedures, ANSSI notification
6. **Recovery**: PCA/PRA, MCO/MCS, RETEX (lessons learned)

### Space-Specific Cybersecurity Concerns
- TT&C (Telecommand/Telemetry) link security: command authentication, encryption, TRANSEC
- Ground segment security: SCC (Satellite Control Center) hardening, VPN, physical access (ZRR — Zone a Regime Restrictif)
- Supply chain: COTS risk assessment, SBOM (Software Bill of Materials), SDR/SDS security
- Post-Quantum Cryptography (PQC) considerations for long-duration missions
- ITAR/EAR export control compliance for encryption technologies
- TEMPEST (emanation security) for ground segment facilities

### Incident Reporting to CNES
- RT Art. 36 / Decret Art. 7: Operator must inform Bureau LOS "sans delai" (without delay) of any technical or organizational fact affecting authorized space operations
- Declaration de Fait Technique template fields:
  - Impact on mission continuation
  - Impact on satellite control capability
  - Impact on passivation capability
  - Impact on maneuverability (especially for RdS — Retrait de Service)
  - Impact on RdS resource availability
  - Ground casualty risk impact
  - Debris generation risk (faible/modere/eleve)
  - Analysis status (terminee/comprise/en cours d'investigation)
  - Short-term risk reduction measures
  - Work plan and timeline
`;

const KNOWLEDGE_NOTICE_GENERALE = `
## CNES Notice Generale de Conformite Technique Format

### Regulatory Basis
Art. 13 of Arrete du 23 fevrier 2022 modifie: Mandatory master document for all LOS submissions.

### Required Structure
1. **Objet du document** (Art. 13): State this is the Notice Generale for mission [NAME] under LOS authorization
2. **Documents applicables**: Table with columns [DA | Ref/Titre | Version]
   - DA1: LOI n. 2008-518 (LOS)
   - DA2: Decret n. 2009-643
   - DA3: Arrete du 23 fevrier 2022 (composition du dossier)
   - DA4: Arrete du 31 mars 2011 (RT)
3. **Documents de reference**: Table listing all annexe documents provided
4. **Matrice de Conformite**: Two compliance matrices:
   - Tableau 3-1: Exigences de composition du dossier (Art. 12-17)
   - Tableau 3-2: Exigences techniques (RT Art. 35-48)
5. **Etat des recommandations** (if preliminary attestation)
6. **Fait Technique process** (per RT Art. 36)

### Compliance Matrix Format (CNES Template)
Columns: Article | Objet de l'exigence | C/NC/PC/NA | Paragraphe du dossier | Commentaire

Status values:
- C: Conforme (Compliant)
- NC: Non Conforme (Non-Compliant)
- PC: Partiellement Conforme (Partially Compliant)
- NA: Non Applicable

### Important Notes
- All documents must be conserved until end of space operation
- Updates affecting authorized operation conditions require Fait Technique declaration
- Document must respond point-by-point to Art. 12-17 (dossier composition) AND Art. 35-48 (RT)
`;

const KNOWLEDGE_COMPLIANCE_MATRIX = `
## CNES Compliance Matrix Format (OVERRIDES generic compliance matrix format)

CRITICAL: When generating for CNES, ALL compliance matrices MUST follow the official CNES template format.
This REPLACES the generic compliance matrix format from the Quality Rules.

### Two Compliance Matrices Required

**Matrix 1: Exigences de composition du dossier (Arrete du 23 fevrier 2022, Art. 12-17)**

| Article | Objet de l'exigence dans l'arrete de composition documentaire | C / NC / PC / NA | Paragraphe du dossier technique | Commentaire |
|---------|---------------------------------------------------------------|------------------|-------------------------------|-------------|
| 12 | Description de l'operation spatiale et des systemes | | | |
| 13 | Notice generale de conformite a la RT | | | |
| 14 | Normes internes et dispositions de gestion de la qualite | | | |
| 15 | Etude des dangers | | | |
| 16 | Etude d'impact environnemental | | | |
| 17 | Mesures de maitrise des risques | | | |

**Matrix 2: Exigences techniques (RT Art. 35-48)**

| Article RT | Objet de l'exigence dans la RT du 28 juin 2024 | C / NC / PC / NA | Paragraphe du dossier technique | Commentaire |
|-----------|------------------------------------------------|------------------|-------------------------------|-------------|
| Art. 38-1 | Plan de controle durant la maitrise en orbite | | | |
| Art. 38-2 | Validation des procedures | | | |
| Art. 39 | Capacite de maitrise de l'objet spatial | | | |
| Art. 39-1 | Identification des objets spatiaux | | | |
| Art. 39-2 | Gestion des ergols | | | |
| Art. 39-3 | Cybersecurite | | | |
| Art. 40.1 | Liberation intentionnelle d'un debris | | | |
| Art. 40.2 | Desintegration accidentelle | | | |
| Art. 40.3 | Passivation | | | |
| Art. 41 | Prevention collisions objets habites | | | |
| Art. 41-1 | Capacite anti-collision | | | |
| Art. 41-2 | Disponibilite manoeuvres anti-collision | | | |
| Art. 41-3 | Probabilite de collision | | | |
| Art. 41-6 | Seuil declenchement manoeuvres | | | |
| Art. 41-7 | Partage de donnees | | | |
| Art. 41-8 | Obligation de retrait de service | | | |
| Art. 41-9 | Duree vie orbitale max (25 ans LEO) | | | |
| Art. 41-12 | Fiabilite retrait de service | | | |
| Art. 44 | Objectifs securite personnes retour sur Terre | | | |
| Art. 45 | Rentree non controlee | | | |
| Art. 46 | Rentree controlee | | | |
| Art. 47 | Rentrees non nominales | | | |

(Include ALL applicable RT articles for the specific document type — the above is a representative subset.
For constellations, add Art. 48-1 through 48-10. For service en orbite, add Art. 47-1 through 47-21.)

### CNES Status Values
Use French abbreviations in the matrix columns, with English explanation in parentheses on first use:
- **C**: Conforme (Compliant)
- **NC**: Non Conforme (Non-Compliant)
- **PC**: Partiellement Conforme (Partially Compliant)
- **NA**: Non Applicable (with justification in Commentaire column)

### Cross-Reference Column
The "Paragraphe du dossier technique" column must reference the exact section/paragraph number in the current document or an annexe document where the compliance justification can be found.

### Additional EU Space Act Mapping
In addition to the RT matrix, include a secondary reference showing the correspondence between each RT article and the equivalent EU Space Act article. This can be a note at the bottom of the matrix or an additional column.
`;

/**
 * Builds the full consolidated knowledge base string for prompt injection.
 * This is the complete CNES regulatory knowledge — all 6 blocks.
 */
function buildKnowledgeBase(): string {
  return [
    "## CNES-SPECIFIC REGULATORY KNOWLEDGE",
    "",
    "The following knowledge is extracted from official CNES documents and must be used",
    "to ensure this document meets CNES Bureau LOS expectations. Reference these sources",
    "throughout the document where applicable.",
    "",
    KNOWLEDGE_COMPLIANCE_MATRIX,
    KNOWLEDGE_PASSIVATION,
    KNOWLEDGE_REENTRY,
    KNOWLEDGE_TOOLS,
    KNOWLEDGE_CYBER,
    KNOWLEDGE_NOTICE_GENERALE,
    KNOWLEDGE_RT_MAPPING,
  ].join("\n");
}

// ─── Jurisdiction Data ───────────────────────────────────────────────────────

const FRANCE_JURISDICTION: JurisdictionData = {
  code: "FR",
  name: "France",

  nca: {
    name: "CNES",
    fullName: "Centre National d'Etudes Spatiales",
    website: "https://cnes.fr",
    language: "fr",
    executiveSummaryLanguage: "fr",
  },

  spaceLaw: {
    name: "Loi relative aux Operations Spatiales (LOS) + Reglementation Technique (RT)",
    citation:
      "Loi n. 2008-518 du 3 juin 2008; " +
      "Arrete du 31 mars 2011 modifie le 28 juin 2024 (RT 2024)",
    yearEnacted: 2008,
    yearAmended: 2024,
    status: "enacted",
    url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000018931380",
  },

  additionalLaws: [],

  requirements: FR_REQUIREMENTS,

  insurance: {
    minimumTPL: 60_000_000,
    formula: null,
    cap: null,
    governmentGuarantee: true,
    legalBasis: "LOS Art. 6, Decret 2009-643 Art. 16",
  },

  complianceMatrixFormat: {
    statusValues: ["C", "NC", "PC", "NA"],
    columns: [
      "Article",
      "Objet de l'exigence",
      "C / NC / PC / NA",
      "Paragraphe du dossier technique",
      "Commentaire",
    ],
    language: "fr",
  },

  rigor: {
    debris: 5,
    cybersecurity: 4,
    general: 5,
    safety: 5,
  },

  requiredTools: [
    {
      name: "STELA",
      description:
        "Semi-analytic Tool for End of Life Analysis — long-term orbit evolution " +
        "verification for LEO (<2000km) and GEO compliance. Must run with mean, " +
        "+2sigma, and -2sigma solar activity scenarios. Mandatory for LEO missions. " +
        "Ref: GBP v3.0 DR5. Available at https://www.connectbycnes.fr/los",
      mandatory: true,
    },
    {
      name: "DEBRISK",
      description:
        "Object-oriented demise analysis tool — identifies surviving objects/fragments " +
        "during atmospheric re-entry. Requires Declared Material List (DML) input. " +
        "Provides '_sim.txt' synthesis file that MUST be included in LOS dossier. " +
        "Ref: GBP v3.0 DR3. Available at https://www.connectbycnes.fr/los",
      mandatory: true,
    },
    {
      name: "ELECTRA",
      description:
        "Ground casualty risk computation tool — quantifies casualty risk from " +
        "surviving re-entry fragments. Modes: uncontrolled re-entry (RNC) with " +
        "population-weighted casualty area, controlled re-entry (RC) with Monte Carlo " +
        "trajectory simulation. Uses GPW population model. " +
        "Ref: GBP v3.0 DR4. Available at https://www.connectbycnes.fr/los",
      mandatory: true,
    },
  ],

  acceptedEvidence: [
    {
      type: "STELA_REPORT",
      description:
        "CNES STELA tool output — orbital lifetime propagation with mean/+/-2sigma " +
        "solar scenarios. Mandatory for LEO missions. Ref: GBP v3.0 DR5.",
      acceptedAsShortcut: false,
    },
    {
      type: "DEBRISK_REPORT",
      description:
        "CNES DEBRISK tool output — spacecraft demise/survivability analysis during " +
        "re-entry. Required for casualty risk assessment. Ref: GBP v3.0 DR3.",
      acceptedAsShortcut: false,
    },
    {
      type: "ELECTRA_REPORT",
      description:
        "CNES ELECTRA tool output — ground casualty risk estimation from surviving " +
        "debris. Required for Art. 72(4) compliance. Ref: GBP v3.0 DR4.",
      acceptedAsShortcut: false,
    },
    {
      type: "DRAMA_OUTPUT",
      description:
        "ESA DRAMA suite output (alternative to DEBRISK for demise analysis)",
      acceptedAsShortcut: false,
    },
    {
      type: "NOTICE_GENERALE",
      description:
        "Notice Generale de Conformite Technique — master compliance document per " +
        "Art. 13 of Arrete du 23 fevrier 2022. CNES provides a template; all " +
        "technical documents are annexes to this notice.",
      acceptedAsShortcut: false,
    },
    {
      type: "MATRICE_CONFORMITE",
      description:
        "Matrice de Conformite RT 2024 — compliance matrix with columns: " +
        "Article | Exigence | C/NC/PC/NA | Paragraphe | Commentaire. " +
        "CNES provides official template. Must map to RT articles, not just EU Space Act.",
      acceptedAsShortcut: false,
    },
    {
      type: "FAIT_TECHNIQUE",
      description:
        "Declaration de Fait Technique — incident report template per RT Art. 36 / " +
        "Decret Art. 7. Must include: impact on mission, passivation capability, " +
        "maneuverability, debris risk, RdS capacity.",
      acceptedAsShortcut: false,
    },
  ],

  documentGuidance: {
    DMP: {
      depthExpectation: "extensive",
      specificRequirements: [
        "Include French-language executive summary (resume executif en francais)",
        "Reference the LOS (Loi n. 2008-518) and RT 2024 alongside the EU Space Act throughout",
        "Structure must follow GBP SO-NG v3.0 Chapter 3 (Limiter la generation de debris en orbite)",
        "CNES expects STELA tool output for orbital lifetime — generic parametric estimates are NOT accepted",
        "Quantify collision probability thresholds (Pc) explicitly, reference CAESAR/EU SST service",
        "Passivation analysis must cover ALL energy sources per GBP v3.0 Section 3.3: batteries, propellant, pressure vessels, reaction wheels",
        "Reference IADC Guidelines Rev.2 (IADC-02-01, 2020) Section 5 for debris mitigation measures",
        "Include a 'Matrice de Conformite' mapping to RT articles 35-48, not just EU Space Act articles",
        "Fait Technique (incident reporting) obligations per RT Art. 36 must be described",
      ],
      commonRejectionReasons: [
        "Insufficient orbital lifetime analysis — STELA output missing or only parametric estimate (34%)",
        "Missing FMECA reference for fragmentation/break-up prevention (22%)",
        "Passivation detail insufficient — not all energy sources covered (18%)",
        "No reference to French LOS/RT alongside EU Space Act (12%)",
        "Compliance matrix not mapped to RT articles (8%)",
      ],
    },
    ORBITAL_LIFETIME: {
      depthExpectation: "extensive",
      specificRequirements: [
        "MUST use CNES STELA tool (Semi-analytic Tool for End of Life Analysis) — ref GBP v3.0 DR5",
        "Include STELA propagation curves for mean, +2sigma, and -2sigma solar activity scenarios",
        "Show altitude vs. time plots for the full 25-year post-mission period",
        "Include drag coefficient (Cd) sensitivity analysis — CNES expects +/-20% variation study",
        "Reference RT Art. 43-44 for orbital lifetime and disposal requirements",
        "For constellations: individual satellite analysis + fleet-level statistical assessment",
        "Include atmospheric density model used (e.g., NRLMSISE-00, JB2008) and justify choice",
        "GBP v3.0 Chapter 4 defines the complete CNES methodology for lifetime analysis",
      ],
      commonRejectionReasons: [
        "No STELA validation — only generic/parametric estimate provided",
        "Missing solar cycle sensitivity (must show mean, +2sigma, -2sigma scenarios)",
        "No drag coefficient sensitivity analysis",
        "Atmospheric density model not specified or justified",
      ],
    },
    EOL_DISPOSAL: {
      depthExpectation: "extensive",
      specificRequirements: [
        "Reference RT Art. 43-44 for disposal requirements alongside EU Space Act Art. 72",
        "Use STELA to demonstrate post-disposal orbital lifetime compliance",
        "Include probability of success (PdR) analysis per GBP v3.0 DR6 methodology",
        "Delta-V budget must include margin (CNES expects >=10% margin documented)",
        "For controlled re-entry: use DEBRISK for demise analysis, ELECTRA for casualty risk",
        "Contingency procedures for failed disposal must be described in detail",
        "GBP v3.0 Section 4.4 covers end-of-life disposal best practices",
      ],
      commonRejectionReasons: [
        "No probability of success analysis for disposal maneuver",
        "Insufficient fuel margin documentation",
        "Missing DEBRISK/ELECTRA output for controlled re-entry cases",
      ],
    },
    PASSIVATION: {
      depthExpectation: "extensive",
      specificRequirements: [
        "Must cover ALL stored energy sources per RT Art. 42 and GBP v3.0 Section 3.3",
        "Battery passivation: discharge sequence, target DoD, CID/UVD behavior, thermal considerations",
        "Propulsion passivation: propellant depletion burns, tank venting procedures, pressure vessel depressurization",
        "Reaction wheel passivation: spin-down procedure and timeline",
        "Pressurant gas: controlled venting procedure for all pressure vessels",
        "Include timeline showing passivation sequence relative to end-of-life disposal maneuver",
        "Failure mode analysis: what happens if passivation commands fail? Autonomous passivation capability?",
      ],
      commonRejectionReasons: [
        "Not all energy sources addressed (e.g., missing pressure vessel or reaction wheel passivation)",
        "No failure mode analysis for passivation sequence",
        "Timeline unclear relative to disposal maneuver",
      ],
    },
    REENTRY_RISK: {
      depthExpectation: "extensive",
      specificRequirements: [
        "MUST use CNES DEBRISK tool for demise/survivability analysis — ref GBP v3.0 DR3",
        "MUST use CNES ELECTRA tool for ground casualty risk estimation — ref GBP v3.0 DR4",
        "Casualty risk threshold: < 1:10,000 per re-entry event (RT Art. 45-46, EU Space Act Art. 72(4))",
        "Include Declared Material List (DML) for DEBRISK input",
        "For controlled re-entry: define SPOUA (South Pacific Ocean Uninhabited Area) targeting",
        "Include NOTAM/AVURNAV notification procedures for re-entry corridor",
        "GBP v3.0 Chapter 5 defines the complete re-entry risk methodology",
      ],
      commonRejectionReasons: [
        "No DEBRISK analysis — only generic demise estimates",
        "No ELECTRA output for casualty risk quantification",
        "DML incomplete — not all components/materials listed",
      ],
    },
    COLLISION_AVOIDANCE: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference RT Art. 40 alongside EU Space Act Art. 64",
        "Describe use of CAESAR (CNES/ESA) or EU SST conjunction assessment services",
        "Define explicit Pc (probability of collision) thresholds for maneuver decisions",
        "For constellations: describe inter-satellite coordination and fleet-level CA management",
        "Include communication protocols with CSpOC/18th SDS and EU SST",
        "GBP v3.0 Section 3.4 covers collision avoidance best practices",
      ],
      commonRejectionReasons: [
        "No explicit Pc threshold defined for maneuver decisions",
        "Missing reference to CAESAR or EU SST services",
      ],
    },
    CYBER_POLICY: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference CNES 'Guide d'Hygiene Cybersecurite des Systemes Orbitaux' (2025, ref DCS-2024.0004634)",
        "Use EBIOS RM (Expression des Besoins et Identification des Objectifs de Securite) as risk methodology",
        "Reference ANSSI (Agence Nationale de la Securite des Systemes d'Information) guidelines",
        "Include PSSI (Politique de Securite des Systemes d'Information) aligned with ANSSI framework",
        "PCA (Plan de Continuite d'Activite) and PRA (Plan de Reprise d'Activite) are mandatory per CNES guide",
        "Address both IT (Information Technology) and OT (Operational Technology) segments",
        "Reference CCSDS 350.1-G-3 for space-specific threat taxonomy",
        "Include ISP (Instruction de Securite Programme) for classified/sensitive operations",
      ],
      commonRejectionReasons: [
        "No reference to CNES cybersecurity guide or ANSSI framework",
        "EBIOS RM methodology not used for risk assessment",
        "OT/space segment cybersecurity not adequately addressed",
      ],
    },
    CYBER_RISK_ASSESSMENT: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Use EBIOS RM methodology as primary risk assessment framework — CNES cybersecurity guide mandates this",
        "Include space-specific threat scenarios from CCSDS 350.1-G-3 taxonomy",
        "Address TT&C (telecommand/telemetry) link security: TRANSEC, command authentication, encryption",
        "Assess supply chain risks per CNES guide: COTS components, SBOM (Software Bill of Materials)",
        "Include PQC (Post-Quantum Cryptography) considerations for long-duration missions",
        "Reference ITAR/EAR export control implications for encryption technology",
      ],
      commonRejectionReasons: [
        "Risk methodology not aligned with EBIOS RM",
        "TT&C link security not adequately assessed",
        "Supply chain cyber risks not covered",
      ],
    },
    INCIDENT_RESPONSE: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Must align with CNES 'Declaration de Fait Technique' process (RT Art. 36, Decret Art. 7)",
        "Fait Technique declaration template: impact on mission, passivation capability, maneuverability, debris risk, RdS capacity",
        "Incident notification to Bureau LOS du CNES 'sans delai' (without delay) for any fact affecting authorized operations",
        "Include CSIRT/CERT coordination procedures",
        "Reference 24h/72h/1 month notification timelines per EU Space Act Art. 90-92",
        "Define interface with ANSSI for significant cyber incidents",
      ],
      commonRejectionReasons: [
        "Fait Technique process not described",
        "Bureau LOS notification procedure missing",
        "No interface with ANSSI defined",
      ],
    },
    AUTHORIZATION_APPLICATION: {
      depthExpectation: "extensive",
      specificRequirements: [
        "For CNES submission: structure must follow the 'Notice Generale de Conformite Technique' format",
        "Reference Arrete du 23 fevrier 2022 modifie (composition du dossier) Art. 12-17",
        "Include a complete Matrice de Conformite mapped to RT 2024 articles (not just EU Space Act)",
        "Matrix columns: Article | Objet de l'exigence | C/NC/PC/NA | Paragraphe du dossier | Commentaire",
        "All technical documents are annexes to the Notice Generale — provide document index table",
        "Include etat des recommandations if preliminary compliance attestation is provided",
        "Documents must be conserved until end of space operation per LOS requirements",
        "Fait Technique and organizational change reporting obligations must be described (RT Art. 36)",
      ],
      commonRejectionReasons: [
        "Notice Generale format not followed — CNES expects specific template structure",
        "Matrice de Conformite missing or not mapped to RT articles",
        "Document index incomplete — not all annexes listed",
        "Fait Technique obligations not described",
      ],
    },
    ENVIRONMENTAL_FOOTPRINT: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference RT Art. 47-48 for environmental requirements alongside EU Space Act Art. 44-46",
        "CNES expects INERIS methodology for terrestrial environmental impact assessment",
        "Include propellant toxicity analysis (VTR — Valeurs Toxicologiques de Reference) for re-entry debris",
        "PNEC (Predicted No Effect Concentration) analysis for aquatic/soil contamination",
        "GBP v3.0 Chapter 6 covers environmental impact methodology",
      ],
      commonRejectionReasons: [
        "No INERIS methodology referenced",
        "Propellant toxicity not assessed",
      ],
    },
    INSURANCE_COMPLIANCE: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference French LOS liability regime (operator strict liability per LOS Art. 6)",
        "Include Liability Convention 1972 obligations specific to France as launching state",
        "CNES expects quantified TPL exposure analysis based on mission parameters",
        "Insurance coverage must be demonstrated before authorization (LOS requirement)",
      ],
      commonRejectionReasons: [
        "French-specific liability regime not referenced",
        "TPL exposure not quantified",
      ],
    },
  },

  knowledgeBase: buildKnowledgeBase(),
};

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * Returns the complete France/CNES jurisdiction data.
 *
 * Consolidates:
 * - CNES NCA profile (rigor, focus areas, preferred standards, evidence, document guidance)
 * - Full CNES regulatory knowledge base (RT mapping, passivation, re-entry, tools, cyber, notice generale, compliance matrix)
 * - French space law (LOS 2008 + RT 2024)
 * - French insurance requirements (EUR 60M TPL, government guarantee)
 * - National requirements mapped from RT articles 35-48
 */
export function getFranceJurisdiction(): JurisdictionData {
  return FRANCE_JURISDICTION;
}
