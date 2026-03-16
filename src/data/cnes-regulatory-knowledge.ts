/**
 * CNES Regulatory Knowledge Base
 *
 * Extracted from official CNES documents:
 * - GBP SO-NG v3.0 (Guide des Bonnes Pratiques LOS, CNES 2025, 124 pages)
 * - Guide d'Hygiène Cybersécurité des Systèmes Orbitaux (CNES 2025, 36 pages)
 * - RT 2024 (Réglementation Technique, Arrêté du 31 mars 2011, modifié 28 juin 2024)
 * - IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)
 * - Notice Générale de Conformité Technique Template (CNES)
 * - Matrice de Conformité RT 2024 Template (CNES)
 * - Déclaration de Fait Technique Template (CNES)
 *
 * This knowledge is injected into generation prompts when CNES is selected as target NCA.
 */

// ─── RT Article to GBP Chapter Mapping ───────────────────────────────────────
// Source: GBP SO-NG v3.0, Tableau 1 (pages 15-16)

export interface RTArticleMapping {
  rtArticle: string;
  rtTitle: string;
  gbpSection: string;
  gbpPage: number;
  euSpaceActRef: string;
  category:
    | "operations"
    | "fragmentation"
    | "collision"
    | "orbit_saturation"
    | "reentry"
    | "service"
    | "constellation"
    | "extension"
    | "cyber"
    | "rf";
}

export const RT_TO_GBP_MAPPING: RTArticleMapping[] = [
  // ── Obligations liées à la conduite des opérations ──
  {
    rtArticle: "Art. 38-1",
    rtTitle: "Plan de contrôle durant la maîtrise en orbite",
    gbpSection: "3.7.2",
    gbpPage: 52,
    euSpaceActRef: "Art. 58-63",
    category: "operations",
  },
  {
    rtArticle: "Art. 38-2",
    rtTitle: "Validation des procédures",
    gbpSection: "3.7.1",
    gbpPage: 48,
    euSpaceActRef: "Art. 58",
    category: "operations",
  },
  {
    rtArticle: "Art. 39",
    rtTitle: "Capacité de maîtrise de l'objet spatial",
    gbpSection: "3.7.1",
    gbpPage: 48,
    euSpaceActRef: "Art. 58",
    category: "operations",
  },
  {
    rtArticle: "Art. 39-1",
    rtTitle: "Identification des objets spatiaux",
    gbpSection: "3.6.2",
    gbpPage: 43,
    euSpaceActRef: "Art. 67(1)(e)",
    category: "operations",
  },
  {
    rtArticle: "Art. 39-2",
    rtTitle: "Gestion des ergols",
    gbpSection: "3.9",
    gbpPage: 56,
    euSpaceActRef: "Art. 67(1)(d)",
    category: "operations",
  },
  {
    rtArticle: "Art. 39-3",
    rtTitle: "Cybersécurité",
    gbpSection: "6.1",
    gbpPage: 81,
    euSpaceActRef: "Art. 74-95",
    category: "cyber",
  },

  // ── Prévention des fragmentations ──
  {
    rtArticle: "Art. 40.1",
    rtTitle: "Libération intentionnelle d'un débris",
    gbpSection: "3.2",
    gbpPage: 18,
    euSpaceActRef: "Art. 60",
    category: "fragmentation",
  },
  {
    rtArticle: "Art. 40.2",
    rtTitle: "Désintégration accidentelle",
    gbpSection: "3.2.1",
    gbpPage: 19,
    euSpaceActRef: "Art. 59",
    category: "fragmentation",
  },
  {
    rtArticle: "Art. 40.3",
    rtTitle: "Passivation",
    gbpSection: "3.3",
    gbpPage: 21,
    euSpaceActRef: "Art. 67(1)(d)",
    category: "fragmentation",
  },
  {
    rtArticle: "Art. 40-2",
    rtTitle: "Dispositif pour le retrait actif de débris",
    gbpSection: "3.2.2",
    gbpPage: 20,
    euSpaceActRef: "Art. 65-66",
    category: "fragmentation",
  },

  // ── Prévention des collisions ──
  {
    rtArticle: "Art. 41",
    rtTitle: "Prévention des risques de collision avec les objets habités",
    gbpSection: "3.6.2",
    gbpPage: 43,
    euSpaceActRef: "Art. 64",
    category: "collision",
  },
  {
    rtArticle: "Art. 41-1",
    rtTitle: "Capacité anti-collision",
    gbpSection: "3.6.2",
    gbpPage: 43,
    euSpaceActRef: "Art. 64(3)",
    category: "collision",
  },
  {
    rtArticle: "Art. 41-2",
    rtTitle: "Disponibilité des manœuvres anti-collision",
    gbpSection: "3.6.2",
    gbpPage: 43,
    euSpaceActRef: "Art. 64(2)",
    category: "collision",
  },
  {
    rtArticle: "Art. 41-3",
    rtTitle: "Probabilité de collision avec un objet spatial",
    gbpSection: "3.5",
    gbpPage: 32,
    euSpaceActRef: "Art. 64(1)",
    category: "collision",
  },
  {
    rtArticle: "Art. 41-4",
    rtTitle: "Prévention des collisions à la séparation depuis un lanceur",
    gbpSection: "3.6.2",
    gbpPage: 43,
    euSpaceActRef: "Art. 64(4)",
    category: "collision",
  },
  {
    rtArticle: "Art. 41-5",
    rtTitle: "Coordination entre opérateurs en cas d'alerte collision",
    gbpSection: "3.6.2",
    gbpPage: 43,
    euSpaceActRef: "Art. 64(5)",
    category: "collision",
  },
  {
    rtArticle: "Art. 41-6",
    rtTitle: "Seuil de déclenchement des manœuvres anti-collision",
    gbpSection: "3.6.2",
    gbpPage: 43,
    euSpaceActRef: "Art. 64(1)",
    category: "collision",
  },
  {
    rtArticle: "Art. 41-7",
    rtTitle: "Partage de données",
    gbpSection: "3.6.2",
    gbpPage: 43,
    euSpaceActRef: "Art. 63",
    category: "collision",
  },

  // ── Prévention de la saturation des orbites ──
  {
    rtArticle: "Art. 41-8",
    rtTitle: "Obligation de retrait de service",
    gbpSection: "3.8",
    gbpPage: 53,
    euSpaceActRef: "Art. 72(1)",
    category: "orbit_saturation",
  },
  {
    rtArticle: "Art. 41-9",
    rtTitle: "Durée de vie orbitale maximum avant rentrée atmosphérique",
    gbpSection: "3.8",
    gbpPage: 53,
    euSpaceActRef: "Art. 72(2)",
    category: "orbit_saturation",
  },
  {
    rtArticle: "Art. 41-10",
    rtTitle: "Caractéristiques orbite cimetière entre région A et B",
    gbpSection: "3.8",
    gbpPage: 53,
    euSpaceActRef: "Art. 72(3)",
    category: "orbit_saturation",
  },
  {
    rtArticle: "Art. 41-11",
    rtTitle: "Caractéristiques orbite cimetière au-dessus de la région B",
    gbpSection: "3.8",
    gbpPage: 53,
    euSpaceActRef: "Art. 72(3)",
    category: "orbit_saturation",
  },
  {
    rtArticle: "Art. 41-12",
    rtTitle: "Fiabilité des opérations de retrait de service",
    gbpSection: "3.10",
    gbpPage: 57,
    euSpaceActRef: "Art. 72(5)",
    category: "orbit_saturation",
  },
  {
    rtArticle: "Art. 41-13",
    rtTitle: "Limitation de l'orbite des objets non manœuvrants",
    gbpSection: "3.4",
    gbpPage: 31,
    euSpaceActRef: "Art. 72(2)",
    category: "orbit_saturation",
  },
  {
    rtArticle: "Art. 41-14",
    rtTitle: "Emissions radioélectriques",
    gbpSection: "6.2",
    gbpPage: 81,
    euSpaceActRef: "Art. 68-71",
    category: "rf",
  },

  // ── Retour sur terre ──
  {
    rtArticle: "Art. 44",
    rtTitle:
      "Objectifs quantitatifs sécurité des personnes pour retour sur Terre",
    gbpSection: "4",
    gbpPage: 61,
    euSpaceActRef: "Art. 72(4)",
    category: "reentry",
  },
  {
    rtArticle: "Art. 45",
    rtTitle: "Exigences rentrée non contrôlée en fin de vie",
    gbpSection: "5",
    gbpPage: 79,
    euSpaceActRef: "Art. 72(4)",
    category: "reentry",
  },
  {
    rtArticle: "Art. 46",
    rtTitle: "Prévention risques désorbitation et retombée (rentrée contrôlée)",
    gbpSection: "4.7",
    gbpPage: 72,
    euSpaceActRef: "Art. 72(4)",
    category: "reentry",
  },
  {
    rtArticle: "Art. 46-1",
    rtTitle: "Rentrée contrôlée sur site",
    gbpSection: "4.9",
    gbpPage: 76,
    euSpaceActRef: "Art. 72(4)",
    category: "reentry",
  },
  {
    rtArticle: "Art. 47",
    rtTitle: "Rentrées non nominales",
    gbpSection: "4.8",
    gbpPage: 74,
    euSpaceActRef: "Art. 72(4)",
    category: "reentry",
  },

  // ── Constellations ──
  {
    rtArticle: "Art. 48-1",
    rtTitle:
      "Probabilité de retrait de service des satellites d'une constellation",
    gbpSection: "8.1",
    gbpPage: 95,
    euSpaceActRef: "Art. 72",
    category: "constellation",
  },
  {
    rtArticle: "Art. 48-2",
    rtTitle: "Probabilité de victime au sol pour méga-constellations",
    gbpSection: "8.2",
    gbpPage: 97,
    euSpaceActRef: "Art. 72(4)",
    category: "constellation",
  },
  {
    rtArticle: "Art. 48-3",
    rtTitle: "Intégration du retour d'expérience",
    gbpSection: "8.1",
    gbpPage: 95,
    euSpaceActRef: "Art. 72",
    category: "constellation",
  },
  {
    rtArticle: "Art. 48-4",
    rtTitle: "Collision intra-constellation après retrait de service",
    gbpSection: "8.1",
    gbpPage: 95,
    euSpaceActRef: "Art. 64",
    category: "constellation",
  },
  {
    rtArticle: "Art. 48-5",
    rtTitle: "Capacité anti-collision pour méga-constellations",
    gbpSection: "8.2",
    gbpPage: 97,
    euSpaceActRef: "Art. 64",
    category: "constellation",
  },
  {
    rtArticle: "Art. 48-6",
    rtTitle:
      "Essais système vitaux avant orbite opérationnelle (méga-constellations)",
    gbpSection: "8.2",
    gbpPage: 97,
    euSpaceActRef: "Art. 58",
    category: "constellation",
  },
  {
    rtArticle: "Art. 48-7",
    rtTitle: "Durée maximale de retrait de service (méga-constellation)",
    gbpSection: "8.2",
    gbpPage: 97,
    euSpaceActRef: "Art. 72(2)",
    category: "constellation",
  },
  {
    rtArticle: "Art. 48-8",
    rtTitle: "Séparation des plans intra-constellation",
    gbpSection: "8.1",
    gbpPage: 95,
    euSpaceActRef: "Art. 64",
    category: "constellation",
  },
  {
    rtArticle: "Art. 48-9",
    rtTitle: "Séparation entre mégaconstellations",
    gbpSection: "8.2",
    gbpPage: 97,
    euSpaceActRef: "Art. 64",
    category: "constellation",
  },
  {
    rtArticle: "Art. 48-10",
    rtTitle: "Limitation perturbations optiques (méga-constellation)",
    gbpSection: "8.2",
    gbpPage: 97,
    euSpaceActRef: "Art. 68",
    category: "constellation",
  },

  // ── Extension de mission ──
  {
    rtArticle: "Art. 49-1",
    rtTitle: "Conditions d'extension de mission",
    gbpSection: "9",
    gbpPage: 100,
    euSpaceActRef: "Art. 18",
    category: "extension",
  },
];

// ─── CNES Passivation Requirements (from GBP v3.0 Section 3.3) ──────────────
// Key knowledge extracted from pages 21-30

export const CNES_PASSIVATION_KNOWLEDGE = `
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

// ─── CNES Re-Entry Risk Requirements (from GBP v3.0 Chapter 4) ──────────────
// Key knowledge extracted from pages 61-80

export const CNES_REENTRY_KNOWLEDGE = `
## CNES Re-Entry Risk Requirements (GBP SO-NG v3.0, Chapter 4, RT Art. 44-47)

### Quantitative Safety Objective
RT Art. 44: Maximum admissible probability of causing at least one casualty (collective risk) is 10⁻⁴ (1:10,000).

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
   - Output: Probability of ≥1 casualty, geographic risk distribution

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

// ─── CNES Tools Configuration (from GBP v3.0 Chapter 10) ────────────────────

export const CNES_TOOLS_KNOWLEDGE = `
## CNES Software Tools (GBP SO-NG v3.0, Chapter 10)

All tools available at: https://www.connectbycnes.fr/los

### STELA (Semi-analytic Tool for End of Life Analysis)
- Purpose: Long-term orbit evolution verification for LEO (<2000km) and GEO compliance
- Method: Semi-analytical orbit propagation with averaged equations of motion
- Physical Constants:
  - Earth radius (LOS criteria): 6378 km
  - Gravity model: Grim5-S1
  - Solar radiation pressure at 1AU: 0.45605 × 10⁻⁵ N/m²
- Required outputs in LOS dossier:
  - "_sim.txt" synthesis file (orbit propagation description, inputs/outputs, LOS criteria compliance)
  - "_sim.xml" corresponding file
  - "_shap.xml" file if STELA average surface calculator was used
- Must run with mean, +2σ, and -2σ solar activity scenarios
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

// ─── CNES Cybersecurity Requirements (from Guide d'Hygiène 2025) ─────────────

export const CNES_CYBER_KNOWLEDGE = `
## CNES Cybersecurity Requirements (Guide d'Hygiène Cybersécurité des Systèmes Orbitaux, 2025)

### Framework
- Primary methodology: EBIOS RM (Expression des Besoins et Identification des Objectifs de Sécurité — Risk Manager)
- Governing authority: ANSSI (Agence Nationale de la Sécurité des Systèmes d'Information)
- Reference standard: CCSDS 350.1-G-3 (Security threats against space missions)
- Applicable to both IT (Information Technology) and OT (Operational Technology) segments

### Key CNES Cyber Terminology
- PSSI: Politique de Sécurité des Systèmes d'Information (Information Systems Security Policy)
- PGSC: Politique Générale de Sécurité et de Cybersécurité (General Security and Cybersecurity Policy)
- PCA: Plan de Continuité d'Activité (Business Continuity Plan)
- PRA: Plan de Reprise d'Activité (Recovery Plan)
- PAS: Plan Assurance Sécurité (Security Assurance Plan)
- ISP: Instruction de Sécurité Programme (Program Security Instruction)
- RSSI: Responsable Sécurité des Systèmes d'Information (CISO equivalent)
- MCS: Maintien en Condition de Sécurité (Security Maintenance)
- MCO: Maintien en Condition Opérationelle (Operational Maintenance)

### Families of Best Practices (per Guide Figure 2)
1. **Governance & Organization**: PSSI, RSSI designation, security committee, ISP
2. **Risk Management**: EBIOS RM analysis, threat landscape, CTI (Cyber Threat Intelligence)
3. **Protection**: Access control (MFA mandatory for critical operations), encryption (TT&C TRANSEC), key management (HSM, PKI, OTAR)
4. **Detection**: SOC (Security Operation Center), SIEM, IDPS, IoC monitoring
5. **Response**: CSIRT/CERT coordination, incident procedures, ANSSI notification
6. **Recovery**: PCA/PRA, MCO/MCS, RETEX (lessons learned)

### Space-Specific Cybersecurity Concerns
- TT&C (Telecommand/Telemetry) link security: command authentication, encryption, TRANSEC
- Ground segment security: SCC (Satellite Control Center) hardening, VPN, physical access (ZRR — Zone à Régime Restrictif)
- Supply chain: COTS risk assessment, SBOM (Software Bill of Materials), SDR/SDS security
- Post-Quantum Cryptography (PQC) considerations for long-duration missions
- ITAR/EAR export control compliance for encryption technologies
- TEMPEST (emanation security) for ground segment facilities

### Incident Reporting to CNES
- RT Art. 36 / Décret Art. 7: Operator must inform Bureau LOS "sans délai" (without delay) of any technical or organizational fact affecting authorized space operations
- Déclaration de Fait Technique template fields:
  - Impact on mission continuation
  - Impact on satellite control capability
  - Impact on passivation capability
  - Impact on maneuverability (especially for RdS — Retrait de Service)
  - Impact on RdS resource availability
  - Ground casualty risk impact
  - Debris generation risk (faible/modéré/élevé)
  - Analysis status (terminée/comprise/en cours d'investigation)
  - Short-term risk reduction measures
  - Work plan and timeline
`;

// ─── CNES Notice Générale Format (from template) ─────────────────────────────

export const CNES_NOTICE_GENERALE_KNOWLEDGE = `
## CNES Notice Générale de Conformité Technique Format

### Regulatory Basis
Art. 13 of Arrêté du 23 février 2022 modifié: Mandatory master document for all LOS submissions.

### Required Structure
1. **Objet du document** (Art. 13): State this is the Notice Générale for mission [NAME] under LOS authorization
2. **Documents applicables**: Table with columns [DA | Réf/Titre | Version]
   - DA1: LOI n° 2008-518 (LOS)
   - DA2: Décret n° 2009-643
   - DA3: Arrêté du 23 février 2022 (composition du dossier)
   - DA4: Arrêté du 31 mars 2011 (RT)
3. **Documents de référence**: Table listing all annexe documents provided
4. **Matrice de Conformité**: Two compliance matrices:
   - Tableau 3-1: Exigences de composition du dossier (Art. 12-17)
   - Tableau 3-2: Exigences techniques (RT Art. 35-48)
5. **État des recommandations** (if preliminary attestation)
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

// ─── CNES Compliance Matrix Format Override ──────────────────────────────────

export const CNES_COMPLIANCE_MATRIX_KNOWLEDGE = `
## CNES Compliance Matrix Format (OVERRIDES generic compliance matrix format)

CRITICAL: When generating for CNES, ALL compliance matrices MUST follow the official CNES template format.
This REPLACES the generic compliance matrix format from the Quality Rules.

### Two Compliance Matrices Required

**Matrix 1: Exigences de composition du dossier (Arrêté du 23 février 2022, Art. 12-17)**

| Article | Objet de l'exigence dans l'arrêté de composition documentaire | C / NC / PC / NA | Paragraphe du dossier technique | Commentaire |
|---------|---------------------------------------------------------------|------------------|-------------------------------|-------------|
| 12 | Description de l'opération spatiale et des systèmes | | | |
| 13 | Notice générale de conformité à la RT | | | |
| 14 | Normes internes et dispositions de gestion de la qualité | | | |
| 15 | Etude des dangers | | | |
| 16 | Etude d'impact environnemental | | | |
| 17 | Mesures de maîtrise des risques | | | |

**Matrix 2: Exigences techniques (RT Art. 35-48)**

| Article RT | Objet de l'exigence dans la RT du 28 juin 2024 | C / NC / PC / NA | Paragraphe du dossier technique | Commentaire |
|-----------|------------------------------------------------|------------------|-------------------------------|-------------|
| Art. 38-1 | Plan de contrôle durant la maîtrise en orbite | | | |
| Art. 38-2 | Validation des procédures | | | |
| Art. 39 | Capacité de maîtrise de l'objet spatial | | | |
| Art. 39-1 | Identification des objets spatiaux | | | |
| Art. 39-2 | Gestion des ergols | | | |
| Art. 39-3 | Cybersécurité | | | |
| Art. 40.1 | Libération intentionnelle d'un débris | | | |
| Art. 40.2 | Désintégration accidentelle | | | |
| Art. 40.3 | Passivation | | | |
| Art. 41 | Prévention collisions objets habités | | | |
| Art. 41-1 | Capacité anti-collision | | | |
| Art. 41-2 | Disponibilité manœuvres anti-collision | | | |
| Art. 41-3 | Probabilité de collision | | | |
| Art. 41-6 | Seuil déclenchement manœuvres | | | |
| Art. 41-7 | Partage de données | | | |
| Art. 41-8 | Obligation de retrait de service | | | |
| Art. 41-9 | Durée vie orbitale max (25 ans LEO) | | | |
| Art. 41-12 | Fiabilité retrait de service | | | |
| Art. 44 | Objectifs sécurité personnes retour sur Terre | | | |
| Art. 45 | Rentrée non contrôlée | | | |
| Art. 46 | Rentrée contrôlée | | | |
| Art. 47 | Rentrées non nominales | | | |

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

// ─── Consolidated CNES Knowledge for Prompt Injection ────────────────────────

/**
 * Returns the full CNES regulatory knowledge block for prompt injection.
 * Called when targetNCA === "cnes" to give Claude deep CNES-specific context.
 */
export function getCNESRegulatoryKnowledge(): string {
  return [
    "## CNES-SPECIFIC REGULATORY KNOWLEDGE",
    "",
    "The following knowledge is extracted from official CNES documents and must be used",
    "to ensure this document meets CNES Bureau LOS expectations. Reference these sources",
    "throughout the document where applicable.",
    "",
    CNES_COMPLIANCE_MATRIX_KNOWLEDGE,
    CNES_PASSIVATION_KNOWLEDGE,
    CNES_REENTRY_KNOWLEDGE,
    CNES_TOOLS_KNOWLEDGE,
    CNES_CYBER_KNOWLEDGE,
    CNES_NOTICE_GENERALE_KNOWLEDGE,
  ].join("\n");
}

/**
 * Returns RT articles relevant to a specific document category.
 * Used to build CNES-specific compliance matrices.
 */
export function getRTArticlesForCategory(
  category: "debris" | "cybersecurity" | "general" | "safety",
): RTArticleMapping[] {
  const categoryMap: Record<string, string[]> = {
    debris: ["fragmentation", "collision", "orbit_saturation", "operations"],
    cybersecurity: ["cyber"],
    general: ["operations", "reentry", "constellation", "extension"],
    safety: ["reentry"],
  };
  const categories = categoryMap[category] || [];
  return RT_TO_GBP_MAPPING.filter((m) => categories.includes(m.category));
}
