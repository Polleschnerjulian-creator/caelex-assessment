// ============================================================================
// MORE GLOSSARY TERMS - Final Expansion to 100+
// ============================================================================

import { GlossaryTerm } from "./terms";

export const moreTerms: GlossaryTerm[] = [
  // ============================================================================
  // SPACE AGENCIES & ORGANIZATIONS
  // ============================================================================
  {
    slug: "cnes",
    term: "Centre National d'Études Spatiales",
    acronym: "CNES",
    definition:
      "The French national space agency responsible for space policy and technical evaluation under the LOS.",
    longDescription: `CNES is France's space agency, playing a key role in European space activities and serving as technical evaluator for French space law compliance.

**Key Roles**
- Technical evaluation for LOS authorization
- Launcher development (Ariane)
- Earth observation programs
- Space science missions

**Regulatory Function**
Under the French Space Operations Act, CNES evaluates technical conformity of space operations before authorization is granted by the Ministry.`,
    category: "regulation",
    relatedTerms: ["french-los", "esa", "authorization"],
  },
  {
    slug: "dlr",
    term: "German Aerospace Center",
    acronym: "DLR",
    definition:
      "Germany's national research center for aeronautics and space, supporting regulatory functions.",
    longDescription: `DLR conducts research and development in aeronautics, space, energy, and transportation, supporting German space policy.

**Functions**
- Space research and development
- Technical advisory to government
- Support for SatDSiG implementation
- International cooperation`,
    category: "regulation",
    relatedTerms: ["german-satdsig", "esa"],
  },
  {
    slug: "nasa",
    term: "National Aeronautics and Space Administration",
    acronym: "NASA",
    definition:
      "The US space agency, whose standards and practices often influence international space regulation.",
    longDescription: `NASA is the US civilian space agency, whose technical standards and debris guidelines influence global practices.

**Regulatory Influence**
- NASA-STD-8719.14 debris requirements
- Conjunction assessment services
- Technical standards development
- International cooperation frameworks`,
    category: "regulation",
    relatedTerms: ["iadc-guidelines", "conjunction-assessment"],
  },
  {
    slug: "jaxa",
    term: "Japan Aerospace Exploration Agency",
    acronym: "JAXA",
    definition:
      "Japan's national aerospace agency and IADC member contributing to international debris guidelines.",
    longDescription: `JAXA is Japan's national space agency, active in IADC and international debris mitigation efforts.

**Contributions**
- IADC debris guidelines
- Space situational awareness
- ISS operations
- Debris removal technology development`,
    category: "regulation",
    relatedTerms: ["iadc-guidelines", "esa"],
  },

  // ============================================================================
  // US REGULATORY BODIES
  // ============================================================================
  {
    slug: "fcc",
    term: "Federal Communications Commission",
    acronym: "FCC",
    definition:
      "US agency regulating satellite communications, including spectrum licensing and debris mitigation rules.",
    longDescription: `The FCC regulates US satellite communications and has increasingly stringent debris requirements.

**Satellite Regulation**
- Spectrum licensing
- Orbital debris mitigation rules (5-year rule adopted)
- Market access for non-US satellites
- Interference resolution

**Key Requirements**
- Debris mitigation plan
- Post-mission disposal
- Collision avoidance capability`,
    category: "regulation",
    relatedTerms: ["frequency-coordination", "space-debris-mitigation"],
  },
  {
    slug: "faa",
    term: "Federal Aviation Administration",
    acronym: "FAA",
    definition:
      "US agency responsible for commercial space launch and re-entry licensing.",
    longDescription: `The FAA's Office of Commercial Space Transportation licenses US launch and re-entry operations.

**Licensing Scope**
- Launch licenses
- Re-entry licenses
- Spaceport licenses
- Safety approvals

**Key Considerations**
- Public safety
- Property damage prevention
- Foreign policy compliance`,
    category: "regulation",
    relatedTerms: ["launch-operator", "authorization"],
  },
  {
    slug: "noaa",
    term: "National Oceanic and Atmospheric Administration",
    acronym: "NOAA",
    definition:
      "US agency licensing commercial remote sensing (Earth observation) satellites.",
    longDescription: `NOAA licenses US commercial Earth observation satellites under the Land Remote Sensing Policy Act.

**Licensing Requirements**
- Technical capabilities review
- Data handling procedures
- National security assessment
- Foreign access limitations`,
    category: "regulation",
    relatedTerms: ["earth-observation", "authorization"],
  },

  // ============================================================================
  // INSURANCE & LIABILITY
  // ============================================================================
  {
    slug: "tpl",
    term: "Third-Party Liability",
    acronym: "TPL",
    definition:
      "Insurance coverage for damage caused to parties other than the insured operator.",
    longDescription: `Third-party liability insurance is mandatory under most space regulations.

**Coverage Scope**
- Property damage
- Personal injury
- Environmental damage

**EU Space Act Requirements**
- Minimum €60M for standard missions
- Higher for high-risk operations
- Coverage from launch through disposal`,
    category: "legal",
    relatedTerms: ["insurance-requirements", "liability-convention"],
  },
  {
    slug: "cross-waiver",
    term: "Cross-Waiver of Liability",
    definition:
      "Mutual agreement between parties to not seek damages from each other for space-related losses.",
    longDescription: `Cross-waivers are common in space contracts, reducing litigation risk.

**Application**
- Launch service agreements
- ISS partner agreements
- Collaborative missions

**Effect**
Each party bears its own losses regardless of fault, except for willful misconduct.`,
    category: "legal",
    relatedTerms: ["liability-convention", "insurance-requirements"],
  },

  // ============================================================================
  // TECHNICAL STANDARDS
  // ============================================================================
  {
    slug: "iso-24113",
    term: "ISO 24113",
    definition:
      "The international standard for space debris mitigation requirements.",
    longDescription: `ISO 24113 provides technical requirements for debris mitigation, translating IADC guidelines into auditable standards.

**Key Requirements**
- Debris release limitation
- Passivation measures
- Post-mission disposal
- Collision avoidance

**EU Space Act Reference**
The EU Space Act incorporates ISO 24113 principles with stricter timelines (5 years vs 25 years for LEO).`,
    category: "technical",
    relatedTerms: ["iadc-guidelines", "space-debris-mitigation"],
  },
  {
    slug: "ccsds",
    term: "Consultative Committee for Space Data Systems",
    acronym: "CCSDS",
    definition:
      "International forum developing standards for space data and information systems.",
    longDescription: `CCSDS develops technical standards used across the space industry.

**Key Standards**
- Telemetry and telecommand protocols
- Conjunction Data Messages (CDM)
- Orbit data formats
- Communications protocols

**Compliance Relevance**
CDM format is standard for conjunction assessment data exchange.`,
    category: "technical",
    relatedTerms: ["cdm", "conjunction-assessment", "telemetry"],
  },
  {
    slug: "sgp4",
    term: "Simplified General Perturbations 4",
    acronym: "SGP4",
    definition:
      "The standard propagation model used with TLE data to predict satellite positions.",
    longDescription: `SGP4 is the mathematical model for propagating TLE orbital data.

**Characteristics**
- Used with Two-Line Elements
- Accounts for atmospheric drag, J2, etc.
- Accuracy degrades over time
- Free and widely available

**Limitations**
Position accuracy ~1-3 km at epoch, degrading to ~10+ km over days.`,
    category: "technical",
    relatedTerms: ["tle", "conjunction-assessment"],
  },

  // ============================================================================
  // MISSION PHASES
  // ============================================================================
  {
    slug: "leop",
    term: "Launch and Early Orbit Phase",
    acronym: "LEOP",
    definition:
      "The critical initial phase after launch when spacecraft systems are activated and checked.",
    longDescription: `LEOP is the high-risk period immediately following launch.

**Activities**
- Spacecraft separation confirmation
- Initial acquisition by ground stations
- Solar array deployment
- Attitude stabilization
- System checkouts

**Duration**
Typically 3-7 days depending on spacecraft complexity.`,
    category: "technical",
    relatedTerms: ["launch-operator", "spacecraft-operator"],
  },
  {
    slug: "commissioning",
    term: "Commissioning Phase",
    definition:
      "The period after LEOP when spacecraft and payload are fully tested before operational handover.",
    longDescription: `Commissioning verifies all spacecraft systems meet performance requirements.

**Activities**
- Payload activation and testing
- Performance verification
- Calibration procedures
- Operational procedure validation

**Regulatory Relevance**
Authorization typically requires successful commissioning before operational use.`,
    category: "technical",
    relatedTerms: ["leop", "spacecraft-operator"],
  },
  {
    slug: "nominal-operations",
    term: "Nominal Operations",
    definition:
      "The routine operational phase when a spacecraft performs its primary mission.",
    longDescription: `Nominal operations represent the main mission phase.

**Characteristics**
- Normal mission activities
- Routine maintenance
- Regular reporting to NCA
- Conjunction monitoring

**Duration**
Can span months to decades depending on mission design.`,
    category: "technical",
    relatedTerms: ["spacecraft-operator", "supervision"],
  },

  // ============================================================================
  // REGULATORY CONCEPTS
  // ============================================================================
  {
    slug: "dual-use",
    term: "Dual-Use",
    definition:
      "Technology or items that have both civilian and military applications, subject to export controls.",
    longDescription: `Dual-use classification triggers export control requirements.

**Space Examples**
- Satellite components
- Propulsion technology
- Imaging systems
- Encryption

**Regulatory Framework**
- EU Dual-Use Regulation
- US EAR
- Wassenaar Arrangement`,
    category: "legal",
    relatedTerms: ["itar-ear", "export-control"],
  },
  {
    slug: "deemed-export",
    term: "Deemed Export",
    definition:
      "The release of controlled technology to foreign nationals, treated as an export under US law.",
    longDescription: `Deemed exports occur when controlled information is shared with foreign persons, even within the US.

**Implications**
- License may be required
- Applies to employees, visitors
- Technology control plans needed
- Training and awareness essential`,
    category: "legal",
    relatedTerms: ["itar-ear", "dual-use"],
  },
  {
    slug: "technology-transfer",
    term: "Technology Transfer",
    definition:
      "The sharing of controlled technical data or defense services, regulated under ITAR/EAR.",
    longDescription: `Technology transfer is heavily regulated for space items.

**Forms**
- Technical data sharing
- Training foreign nationals
- Manufacturing abroad
- Joint development

**Authorization**
May require licenses or agreements (TAA, MLA).`,
    category: "legal",
    relatedTerms: ["itar-ear", "deemed-export"],
  },

  // ============================================================================
  // SPACE ENVIRONMENT
  // ============================================================================
  {
    slug: "van-allen-belts",
    term: "Van Allen Radiation Belts",
    definition:
      "Zones of energetic charged particles trapped by Earth's magnetic field, affecting spacecraft design.",
    longDescription: `The Van Allen belts influence spacecraft design and orbital selection.

**Regions**
- Inner belt: ~1,000-6,000 km
- Outer belt: ~13,000-60,000 km

**Implications**
- Radiation hardening requirements
- MEO constellation challenges
- Shielding considerations`,
    category: "technical",
    relatedTerms: ["meo", "leo", "gso"],
  },
  {
    slug: "space-weather",
    term: "Space Weather",
    definition:
      "Conditions in space affecting spacecraft and ground systems, including solar activity effects.",
    longDescription: `Space weather affects spacecraft operations and is part of SSA.

**Phenomena**
- Solar flares
- Coronal mass ejections
- Geomagnetic storms
- Radiation events

**Operational Impact**
- Communication disruptions
- Attitude disturbances
- Electronics damage
- Orbit prediction uncertainty`,
    category: "technical",
    relatedTerms: ["space-situational-awareness", "orbital-lifetime"],
  },
  {
    slug: "atmospheric-drag",
    term: "Atmospheric Drag",
    definition:
      "The force that slows spacecraft in low orbits, causing gradual altitude decay.",
    longDescription: `Atmospheric drag is the primary natural deorbit mechanism for LEO spacecraft.

**Factors**
- Altitude (exponential effect)
- Solar activity (heats atmosphere)
- Spacecraft area-to-mass ratio
- Atmospheric density variations

**Compliance Relevance**
Determines natural orbital lifetime and disposal capability requirements.`,
    category: "technical",
    relatedTerms: ["orbital-lifetime", "deorbit-plan", "leo"],
  },

  // ============================================================================
  // OPERATIONAL CONCEPTS
  // ============================================================================
  {
    slug: "maneuver-planning",
    term: "Maneuver Planning",
    definition:
      "The process of designing orbital maneuvers for station-keeping, collision avoidance, or disposal.",
    longDescription: `Maneuver planning is essential for spacecraft operations.

**Types**
- Station-keeping
- Collision avoidance
- Orbit raising/lowering
- Deorbit maneuvers

**Requirements**
Must maintain capability for conjunction response and end-of-life disposal.`,
    category: "technical",
    relatedTerms: ["delta-v", "collision-avoidance", "station-keeping"],
  },
  {
    slug: "ground-track",
    term: "Ground Track",
    definition:
      "The path traced on Earth's surface by the point directly below a satellite.",
    longDescription: `Ground track determines coverage and regulatory jurisdiction.

**Characteristics**
- Varies with inclination
- Repeating patterns for some orbits
- Important for Earth observation
- Affects re-entry impact prediction`,
    category: "technical",
    relatedTerms: ["inclination", "sso", "earth-observation"],
  },
  {
    slug: "coverage",
    term: "Coverage",
    definition:
      "The geographical area or time period during which a satellite can provide service.",
    longDescription: `Coverage is a key mission design parameter.

**Types**
- Continuous (GEO)
- Intermittent (LEO single sat)
- Global (LEO constellation)
- Regional (HEO)

**Regulatory Considerations**
Affects frequency coordination and service area licensing.`,
    category: "technical",
    relatedTerms: ["gso", "leo", "frequency-coordination"],
  },

  // ============================================================================
  // CYBERSECURITY CONCEPTS
  // ============================================================================
  {
    slug: "attack-surface",
    term: "Attack Surface",
    definition:
      "The sum of all points where an unauthorized user could attempt to enter or extract data from a space system.",
    longDescription: `Understanding attack surface is essential for space cybersecurity.

**Space System Attack Vectors**
- Ground station networks
- Command uplinks
- Data downlinks
- Supply chain
- User terminals

**NIS2 Relevance**
Risk assessment must identify and mitigate attack surface exposure.`,
    category: "cybersecurity",
    relatedTerms: ["cybersecurity-assessment", "nis2-directive"],
  },
  {
    slug: "defense-in-depth",
    term: "Defense in Depth",
    definition:
      "A cybersecurity strategy using multiple layers of security controls throughout a system.",
    longDescription: `Defense in depth is a best practice for space system security.

**Layers**
- Physical security
- Network security
- Application security
- Data encryption
- Access controls
- Monitoring

**Implementation**
Multiple independent security measures so failure of one doesn't compromise the system.`,
    category: "cybersecurity",
    relatedTerms: ["cybersecurity-assessment", "nis2-directive", "iso-27001"],
  },
  {
    slug: "encryption",
    term: "Encryption",
    definition:
      "The process of encoding data so only authorized parties can access it, critical for space communications.",
    longDescription: `Encryption protects space system communications and data.

**Applications**
- Command link protection
- Telemetry confidentiality
- Data at rest
- Authentication

**Standards**
AES-256 commonly used; government systems may require specific algorithms.`,
    category: "cybersecurity",
    relatedTerms: ["telecommand", "telemetry", "nis2-directive"],
  },

  // ============================================================================
  // BUSINESS & COMMERCIAL
  // ============================================================================
  {
    slug: "launch-services-agreement",
    term: "Launch Services Agreement",
    acronym: "LSA",
    definition:
      "Contract between a satellite operator and launch provider for launch services.",
    longDescription: `LSAs define the terms of launch services.

**Key Elements**
- Launch window
- Orbit parameters
- Risk allocation
- Insurance requirements
- Liability provisions
- Regulatory compliance responsibilities`,
    category: "legal",
    relatedTerms: [
      "launch-operator",
      "spacecraft-operator",
      "insurance-requirements",
    ],
  },
  {
    slug: "hosted-payload",
    term: "Hosted Payload",
    definition:
      "A payload carried on another operator's satellite, sharing the spacecraft platform.",
    longDescription: `Hosted payloads enable cost-effective space access.

**Considerations**
- Separate authorization may be needed
- Liability allocation
- Frequency coordination
- Data rights

**Regulatory Aspects**
Host and payload operators may have separate regulatory obligations.`,
    category: "technical",
    relatedTerms: ["payload", "spacecraft-operator", "authorization"],
  },
  {
    slug: "rideshare",
    term: "Rideshare",
    definition:
      "Launch arrangement where multiple satellites share a single launch vehicle to reduce costs.",
    longDescription: `Rideshare has democratized space access.

**Types**
- Dedicated rideshare missions
- Auxiliary payloads on primary missions
- Deployer services (ISS, orbital transfer)

**Regulatory Considerations**
Each satellite requires its own authorization; launch provider handles launch licensing.`,
    category: "technical",
    relatedTerms: ["launch-operator", "small-satellite", "cubesat"],
  },
];
