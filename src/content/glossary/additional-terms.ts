// ============================================================================
// ADDITIONAL GLOSSARY TERMS - Extended Coverage
// ============================================================================

import { GlossaryTerm } from "./terms";

export const additionalTerms: GlossaryTerm[] = [
  // ============================================================================
  // REGULATORY & INSTITUTIONAL
  // ============================================================================
  {
    slug: "esa",
    term: "European Space Agency",
    acronym: "ESA",
    definition:
      "The intergovernmental organization responsible for European space research, development, and exploration activities.",
    longDescription: `ESA is Europe's gateway to space, coordinating financial and intellectual resources of its 22 member states to pursue programs beyond the scope of individual countries.

**Key Programs**
- Launcher development (Ariane, Vega)
- Earth observation (Copernicus contribution)
- Human spaceflight (ISS participation)
- Science missions
- Navigation (Galileo development)

**Relationship with EU**
- ESA is separate from the EU
- Many EU states are ESA members
- Cooperation through framework agreements
- EUSPA handles EU operational programs`,
    category: "regulation",
    relatedTerms: ["euspa", "copuos", "galileo"],
  },
  {
    slug: "copuos",
    term: "Committee on Peaceful Uses of Outer Space",
    acronym: "COPUOS",
    definition:
      "The UN committee responsible for international space law development and governance of outer space activities.",
    longDescription: `COPUOS is the primary international forum for developing space governance norms and treaties.

**Structure**
- Legal Subcommittee: Treaty development
- Scientific and Technical Subcommittee: Technical matters
- Plenary: Policy decisions

**Key Treaties Developed**
- Outer Space Treaty (1967)
- Rescue Agreement (1968)
- Liability Convention (1972)
- Registration Convention (1975)
- Moon Agreement (1979)

**Recent Work**
- Long-term Sustainability Guidelines
- Space debris guidelines
- Space resource activities`,
    category: "regulation",
    relatedTerms: [
      "outer-space-treaty",
      "liability-convention",
      "registration-convention",
    ],
  },
  {
    slug: "enisa",
    term: "EU Agency for Cybersecurity",
    acronym: "ENISA",
    definition:
      "The EU agency providing cybersecurity expertise and supporting NIS2 implementation across member states.",
    longDescription: `ENISA plays a key role in EU cybersecurity policy, directly relevant for space operators under NIS2.

**Key Functions**
- Cybersecurity policy development
- Incident response coordination
- Standards and certification
- Threat intelligence sharing

**Space Sector Support**
- Sector-specific guidance
- Best practices development
- Risk assessment frameworks
- Training and awareness`,
    category: "cybersecurity",
    relatedTerms: ["nis2-directive", "cybersecurity-assessment", "csirt"],
  },
  {
    slug: "csirt",
    term: "Computer Security Incident Response Team",
    acronym: "CSIRT",
    definition:
      "National teams responsible for receiving and coordinating cybersecurity incident reports under NIS2.",
    longDescription: `CSIRTs are the primary contact points for incident reporting under NIS2.

**Functions**
- Incident notification receipt
- Coordination with affected parties
- Technical analysis support
- Information sharing

**Reporting Timelines**
- 24 hours: Early warning
- 72 hours: Incident notification
- 1 month: Final report`,
    category: "cybersecurity",
    relatedTerms: ["nis2-directive", "incident-reporting", "enisa"],
  },

  // ============================================================================
  // TECHNICAL ORBITAL
  // ============================================================================
  {
    slug: "heo",
    term: "Highly Elliptical Orbit",
    acronym: "HEO",
    definition:
      "An orbit with high eccentricity, providing extended dwell time over specific regions.",
    longDescription: `HEO orbits combine characteristics of different orbital regimes through their elliptical nature.

**Common Types**
- Molniya orbit: 12-hour period, high latitude coverage
- Tundra orbit: 24-hour period, quasi-stationary

**Applications**
- Communications at high latitudes
- Early warning systems
- Intelligence gathering

**Debris Considerations**
- Complex disposal requirements
- May transit multiple orbital regimes
- Case-by-case assessment under EU Space Act`,
    category: "technical",
    relatedTerms: ["leo", "meo", "gso", "space-debris-mitigation"],
  },
  {
    slug: "sso",
    term: "Sun-Synchronous Orbit",
    acronym: "SSO",
    definition:
      "A near-polar orbit where the satellite passes over any given point on Earth's surface at the same local solar time.",
    longDescription: `SSO is critical for Earth observation, providing consistent lighting conditions.

**Characteristics**
- Altitude: typically 600-800 km
- Inclination: ~98° (retrograde)
- Period: ~100 minutes

**Applications**
- Earth observation
- Weather satellites
- Environmental monitoring

**Regulatory Aspects**
- Standard LEO debris rules apply
- 5-year post-mission disposal under EU Space Act`,
    category: "technical",
    relatedTerms: ["leo", "earth-observation", "space-debris-mitigation"],
  },
  {
    slug: "delta-v",
    term: "Delta-V",
    acronym: "ΔV",
    definition:
      "The change in velocity required for orbital maneuvers, a key metric for spacecraft propulsion budgets.",
    longDescription: `Delta-V determines spacecraft maneuverability and is critical for compliance planning.

**Key Maneuvers**
- Orbit raising/lowering
- Inclination changes
- Station-keeping
- Collision avoidance
- End-of-life deorbit

**Compliance Implications**
- Must budget for collision avoidance
- Reserve for end-of-life disposal
- Passivation considerations`,
    category: "technical",
    relatedTerms: ["deorbit-plan", "collision-avoidance", "passivation"],
  },
  {
    slug: "apogee",
    term: "Apogee",
    definition:
      "The point in an orbit where the spacecraft is farthest from Earth.",
    longDescription: `Apogee is a key orbital parameter for mission design and debris assessment.

**Importance**
- Defines maximum altitude
- Affects orbital lifetime
- Influences debris environment

For GEO transfer orbits, the apogee is at GEO altitude (~35,786 km).`,
    category: "technical",
    relatedTerms: ["perigee", "gso", "orbital-parameters"],
  },
  {
    slug: "perigee",
    term: "Perigee",
    definition:
      "The point in an orbit where the spacecraft is closest to Earth.",
    longDescription: `Perigee affects atmospheric drag and orbital decay rates.

**Importance**
- Determines minimum altitude
- Critical for LEO debris assessment
- Affects orbital lifetime

Low perigee increases atmospheric drag, accelerating natural decay.`,
    category: "technical",
    relatedTerms: ["apogee", "leo", "orbital-lifetime"],
  },
  {
    slug: "inclination",
    term: "Orbital Inclination",
    definition:
      "The angle between a spacecraft's orbital plane and Earth's equatorial plane.",
    longDescription: `Inclination determines the latitudes a satellite can observe or serve.

**Common Values**
- 0°: Equatorial (GEO)
- 28.5°: Minimum from Cape Canaveral
- 51.6°: ISS orbit
- ~98°: Sun-synchronous
- 90°: Polar

**Regulatory Considerations**
- Affects debris environment exposure
- Influences re-entry ground track`,
    category: "technical",
    relatedTerms: ["sso", "gso", "leo"],
  },

  // ============================================================================
  // DEBRIS & SUSTAINABILITY
  // ============================================================================
  {
    slug: "kessler-syndrome",
    term: "Kessler Syndrome",
    definition:
      "A theoretical scenario where debris collisions create more debris in a cascading chain reaction.",
    longDescription: `Named after NASA scientist Donald Kessler, this scenario drives debris mitigation urgency.

**Concept**
- Each collision creates more debris
- More debris increases collision probability
- Potential for runaway cascade

**Current Status**
- Not yet occurring
- Some altitude bands at elevated risk
- Active mitigation essential

**Regulatory Response**
- Stricter debris rules (5-year disposal)
- Active debris removal development
- Enhanced tracking requirements`,
    category: "technical",
    relatedTerms: [
      "space-debris-mitigation",
      "active-debris-removal",
      "conjunction-assessment",
    ],
  },
  {
    slug: "fragmentation-event",
    term: "Fragmentation Event",
    definition:
      "An in-orbit breakup of a spacecraft or rocket body creating multiple debris objects.",
    longDescription: `Fragmentation events are major debris sources, highlighting passivation importance.

**Causes**
- Residual propellant explosion
- Battery rupture
- Collision
- Deliberate destruction

**Prevention**
- Passivation requirements
- Design standards
- Collision avoidance`,
    category: "technical",
    relatedTerms: [
      "passivation",
      "space-debris-mitigation",
      "kessler-syndrome",
    ],
  },
  {
    slug: "orbital-lifetime",
    term: "Orbital Lifetime",
    definition:
      "The time a spacecraft or debris remains in orbit before naturally decaying into the atmosphere.",
    longDescription: `Orbital lifetime is crucial for debris assessment and compliance planning.

**Factors**
- Altitude (primary)
- Area-to-mass ratio
- Solar activity (affects atmospheric density)
- Orbital shape

**EU Space Act Requirement**
- Maximum 5 years post-mission for LEO
- Shorter than IADC 25-year guideline`,
    category: "technical",
    relatedTerms: ["deorbit-plan", "space-debris-mitigation", "leo"],
  },
  {
    slug: "drag-device",
    term: "Drag Augmentation Device",
    definition:
      "A deployable device that increases a spacecraft's cross-sectional area to accelerate orbital decay.",
    longDescription: `Drag devices offer passive deorbit capability for small satellites.

**Types**
- Drag sails
- Inflatable structures
- Electrodynamic tethers

**Application**
- Small satellites lacking propulsion
- Backup deorbit mechanism
- Compliance with disposal requirements`,
    category: "technical",
    relatedTerms: ["deorbit-plan", "small-satellite", "cubesat"],
  },

  // ============================================================================
  // SPACECRAFT SYSTEMS
  // ============================================================================
  {
    slug: "telemetry",
    term: "Telemetry",
    acronym: "TM",
    definition:
      "Downlink data from a spacecraft providing status information about its systems and payload.",
    longDescription: `Telemetry is essential for spacecraft monitoring and anomaly detection.

**Content**
- Power system status
- Thermal conditions
- Attitude data
- Payload status
- Health monitoring

**Compliance Relevance**
- Supports anomaly reporting
- Enables conjunction response
- Documents mission status`,
    category: "technical",
    relatedTerms: ["telecommand", "ground-segment", "spacecraft-operator"],
  },
  {
    slug: "telecommand",
    term: "Telecommand",
    acronym: "TC",
    definition:
      "Uplink commands sent from ground stations to control a spacecraft.",
    longDescription: `Telecommand capability is essential for spacecraft operation and compliance.

**Functions**
- System configuration
- Payload operation
- Orbit maneuvers
- Emergency response

**Security Considerations**
- Authentication required
- Encryption recommended
- NIS2 cybersecurity applies`,
    category: "technical",
    relatedTerms: ["telemetry", "ground-segment", "cybersecurity-assessment"],
  },
  {
    slug: "ground-segment",
    term: "Ground Segment",
    definition:
      "The Earth-based infrastructure supporting spacecraft operations, including ground stations and control centers.",
    longDescription: `Ground segment is critical infrastructure subject to multiple regulatory frameworks.

**Components**
- Mission control center
- Ground stations
- Data processing facilities
- Network infrastructure

**Regulatory Aspects**
- NIS2 cybersecurity requirements
- Physical security
- Frequency licensing
- Environmental permits`,
    category: "technical",
    relatedTerms: ["telemetry", "telecommand", "nis2-directive"],
  },
  {
    slug: "payload",
    term: "Payload",
    definition:
      "The mission-specific equipment carried by a spacecraft to perform its primary function.",
    longDescription: `Payload characteristics affect many regulatory aspects.

**Types**
- Communications transponders
- Earth observation sensors
- Scientific instruments
- Navigation signals

**Regulatory Considerations**
- Export control classification
- Frequency coordination
- Earth observation licensing
- Dual-use assessment`,
    category: "technical",
    relatedTerms: [
      "spacecraft-operator",
      "frequency-coordination",
      "earth-observation",
    ],
  },

  // ============================================================================
  // LEGAL CONCEPTS
  // ============================================================================
  {
    slug: "state-responsibility",
    term: "State Responsibility",
    definition:
      "The international law principle that states bear responsibility for all national space activities.",
    longDescription: `Article VI of the Outer Space Treaty establishes state responsibility for national space activities.

**Implications**
- States must authorize private activities
- States must supervise ongoing operations
- States bear international responsibility

**Implementation**
- National space legislation
- Authorization requirements
- Supervision mechanisms`,
    category: "legal",
    relatedTerms: ["outer-space-treaty", "authorization", "supervision"],
  },
  {
    slug: "jurisdiction",
    term: "Jurisdiction",
    definition:
      "The legal authority of a state over space activities and objects based on registration or other criteria.",
    longDescription: `Jurisdiction determines which national law applies to space activities.

**Bases for Jurisdiction**
- Registration of space object
- Nationality of operator
- Territory of launch
- Location of control

**EU Space Act Approach**
- Harmonized rules across EU
- NCA determines applicable jurisdiction
- Mutual recognition of authorizations`,
    category: "legal",
    relatedTerms: [
      "launching-state",
      "registration-convention",
      "authorization",
    ],
  },
  {
    slug: "indemnification",
    term: "Indemnification",
    definition:
      "Legal arrangements whereby one party agrees to compensate another for potential losses.",
    longDescription: `Indemnification provisions allocate risk between operators and states.

**Common Arrangements**
- Operator indemnifies state above insurance
- State provides capped indemnity for catastrophic events
- Cross-waivers between parties

**EU Space Act**
- Insurance required up to specified limits
- State liability provisions for excess`,
    category: "legal",
    relatedTerms: [
      "liability-convention",
      "insurance-requirements",
      "authorization",
    ],
  },

  // ============================================================================
  // STANDARDS & FRAMEWORKS
  // ============================================================================
  {
    slug: "iso-27001",
    term: "ISO 27001",
    definition:
      "The international standard for information security management systems.",
    longDescription: `ISO 27001 provides a framework for managing cybersecurity risks, relevant for NIS2 compliance.

**Key Elements**
- Risk assessment
- Security controls
- Continuous improvement
- Certification available

**NIS2 Relevance**
- Supports Article 21 compliance
- Framework for security measures
- Audit evidence`,
    category: "cybersecurity",
    relatedTerms: [
      "nis2-directive",
      "cybersecurity-assessment",
      "essential-entity",
    ],
  },
  {
    slug: "ecss",
    term: "European Cooperation for Space Standardization",
    acronym: "ECSS",
    definition:
      "The system of technical standards for European space projects.",
    longDescription: `ECSS provides standardized requirements for spacecraft development.

**Key Standards**
- ECSS-E-ST-80C: Space cybersecurity
- ECSS-U-AS-10C: Adoption for EU Space Act
- Quality and management standards

**Regulatory Role**
- Referenced in authorization
- Technical compliance baseline
- Industry best practices`,
    category: "technical",
    relatedTerms: [
      "authorization",
      "spacecraft-operator",
      "cybersecurity-assessment",
    ],
  },

  // ============================================================================
  // ADDITIONAL OPERATIONAL TERMS
  // ============================================================================
  {
    slug: "safe-mode",
    term: "Safe Mode",
    definition:
      "A minimal functionality state a spacecraft enters automatically when anomalies are detected.",
    longDescription: `Safe mode is critical for spacecraft recovery and has compliance implications.

**Characteristics**
- Minimal power consumption
- Sun-pointing for power
- Awaiting ground command

**Compliance Relevance**
- Must report anomaly entry
- Affects collision avoidance capability
- May trigger NCA notification`,
    category: "technical",
    relatedTerms: ["telemetry", "spacecraft-operator", "incident-reporting"],
  },
  {
    slug: "station-keeping",
    term: "Station-Keeping",
    definition:
      "Orbital maneuvers performed to maintain a spacecraft in its assigned position.",
    longDescription: `Station-keeping maintains operational position and has debris implications.

**Types**
- East-West (GEO longitude)
- North-South (GEO inclination)
- LEO altitude maintenance

**Propellant Budget**
- Must reserve for end-of-life disposal
- Station-keeping efficiency affects disposal capability`,
    category: "technical",
    relatedTerms: ["gso", "delta-v", "deorbit-plan"],
  },
  {
    slug: "de-tumble",
    term: "De-tumble",
    definition:
      "The process of stabilizing a tumbling spacecraft to regain attitude control.",
    longDescription: `De-tumbling is essential for spacecraft commissioning and recovery.

**Relevance**
- Required before normal operations
- May be needed after anomaly
- Critical for disposal execution`,
    category: "technical",
    relatedTerms: ["safe-mode", "passivation", "end-of-life"],
  },
  {
    slug: "earth-observation",
    term: "Earth Observation",
    acronym: "EO",
    definition:
      "The gathering of information about Earth's surface and atmosphere from space.",
    longDescription: `Earth observation satellites face specific regulatory requirements.

**Applications**
- Environmental monitoring
- Agriculture
- Disaster response
- Security

**Regulatory Considerations**
- Resolution-based licensing (SatDSiG)
- Data distribution controls
- Dual-use assessment`,
    category: "technical",
    relatedTerms: ["sso", "payload", "frequency-coordination"],
  },
  {
    slug: "satcom",
    term: "Satellite Communications",
    acronym: "SATCOM",
    definition:
      "Communication services provided via satellite, including broadcast, mobile, and fixed services.",
    longDescription: `SATCOM is a major space application with significant regulatory requirements.

**Types**
- Fixed Satellite Service (FSS)
- Mobile Satellite Service (MSS)
- Broadcast Satellite Service (BSS)

**Regulatory Aspects**
- Frequency coordination essential
- Ground segment licensing
- NIS2 for critical infrastructure`,
    category: "technical",
    relatedTerms: ["frequency-coordination", "itu", "nis2-directive"],
  },
  {
    slug: "gnss",
    term: "Global Navigation Satellite System",
    acronym: "GNSS",
    definition:
      "Satellite constellations providing positioning, navigation, and timing services globally.",
    longDescription: `GNSS systems include GPS, Galileo, GLONASS, and BeiDou.

**Key Systems**
- GPS (US)
- Galileo (EU)
- GLONASS (Russia)
- BeiDou (China)

**Regulatory Status**
- Critical infrastructure under NIS2
- Essential for many applications
- Interference protection`,
    category: "technical",
    relatedTerms: ["galileo", "meo", "nis2-directive"],
  },
  {
    slug: "proximity-operations",
    term: "Proximity Operations",
    definition:
      "Spacecraft operations conducted in close range to another space object.",
    longDescription: `Proximity operations include servicing, inspection, and debris removal.

**Types**
- Rendezvous and docking
- Inspection
- Servicing
- Debris capture

**Regulatory Requirements**
- Special authorization needed
- Enhanced safety requirements
- Liability considerations`,
    category: "technical",
    relatedTerms: [
      "in-space-service-operator",
      "active-debris-removal",
      "authorization",
    ],
  },
  {
    slug: "space-traffic-management",
    term: "Space Traffic Management",
    acronym: "STM",
    definition:
      "The planning, coordination, and control of space activities to ensure safety and sustainability.",
    longDescription: `STM is an emerging regulatory area addressing orbital congestion.

**Elements**
- Conjunction assessment
- Collision avoidance
- Coordination rules
- Right-of-way concepts

**Development**
- No binding international framework yet
- National approaches emerging
- EU developing position`,
    category: "regulation",
    relatedTerms: [
      "collision-avoidance-provider",
      "conjunction-assessment",
      "space-situational-awareness",
    ],
  },
  {
    slug: "re-entry",
    term: "Re-entry",
    definition: "The return of a space object to Earth through the atmosphere.",
    longDescription: `Re-entry is a critical end-of-life phase with safety implications.

**Types**
- Controlled: Targeted impact zone
- Uncontrolled: Natural decay

**Requirements**
- Casualty risk assessment
- Design for demise consideration
- Notification to authorities`,
    category: "technical",
    relatedTerms: ["deorbit-plan", "design-for-demise", "end-of-life"],
  },
  {
    slug: "casualty-risk",
    term: "Casualty Risk",
    definition:
      "The probability of a human casualty resulting from uncontrolled spacecraft re-entry.",
    longDescription: `Casualty risk assessment is required for uncontrolled re-entries.

**Threshold**
- Generally <1 in 10,000 (10⁻⁴)
- Higher thresholds require controlled re-entry

**Mitigation**
- Design for demise
- Material selection
- Early structural breakup`,
    category: "technical",
    relatedTerms: ["re-entry", "design-for-demise", "deorbit-plan"],
  },
];
