// ============================================================================
// GLOSSARY TERMS - Space Compliance Terminology
// ============================================================================

import { additionalTerms } from "./additional-terms";
import { moreTerms } from "./more-terms";

export interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string;
  longDescription: string;
  category: "regulation" | "operator" | "technical" | "legal" | "cybersecurity";
  relatedTerms: string[];
  relatedArticles?: string[];
  acronym?: string;
}

export const glossaryTerms: GlossaryTerm[] = [
  // ============================================================================
  // REGULATION TERMS
  // ============================================================================
  {
    slug: "eu-space-act",
    term: "EU Space Act",
    acronym: "EUSA",
    definition:
      "The comprehensive European Union regulation (COM(2025) 335) establishing a unified framework for space activities across all EU member states.",
    longDescription: `The EU Space Act represents a landmark piece of legislation that harmonizes space regulations across the European Union. Published as COM(2025) 335, this regulation establishes common rules for authorization, registration, and supervision of space activities.

Key aspects of the EU Space Act include:

**Scope and Application**
The regulation applies to all space activities conducted by EU entities, including satellite operations, launch services, in-orbit services, and ground-based space infrastructure. It covers both commercial and governmental space activities.

**Authorization Framework**
All space operators must obtain authorization before conducting space activities. The Act introduces a single authorization valid across all EU member states, reducing regulatory burden and promoting the internal market.

**Registration Requirements**
Space objects must be registered in the EU Space Registry, ensuring transparency and enabling effective space traffic management. This aligns with international obligations under the UN Registration Convention.

**Compliance Timeline**
Existing operators have until 2030 to fully comply with the new requirements. New operators must comply from the regulation's entry into force.

**Penalties**
Non-compliance can result in administrative fines up to €20 million or 4% of annual global turnover, whichever is higher.`,
    category: "regulation",
    relatedTerms: [
      "spacecraft-operator",
      "authorization",
      "eu-space-registry",
      "nca",
    ],
    relatedArticles: ["Art. 1-5", "Art. 10-15", "Art. 45-50"],
  },
  {
    slug: "nis2-directive",
    term: "NIS2 Directive",
    acronym: "NIS2",
    definition:
      "The EU Directive 2022/2555 on measures for a high common level of cybersecurity across the Union, applicable to space infrastructure operators.",
    longDescription: `The NIS2 Directive (EU 2022/2555) is the updated European cybersecurity framework that significantly expands the scope of cybersecurity obligations. For space operators, NIS2 introduces mandatory security requirements for critical infrastructure.

**Space Sector Coverage**
Space is explicitly listed as a critical sector under NIS2. This includes:
- Satellite communication providers
- Ground station operators
- Space data service providers
- Launch service providers with digital dependencies

**Entity Classification**
Space operators are classified as either:
- **Essential Entities**: Large operators or those providing critical services
- **Important Entities**: Medium-sized operators or those with significant impact

**Key Requirements**
1. Risk management measures (Art. 21)
2. Incident reporting within 24 hours (Art. 23)
3. Supply chain security
4. Business continuity planning
5. Encryption and access controls

**Penalties**
- Essential entities: Up to €10 million or 2% of global turnover
- Important entities: Up to €7 million or 1.4% of global turnover

**Implementation Deadline**
Member states must transpose NIS2 by October 17, 2024.`,
    category: "regulation",
    relatedTerms: [
      "cybersecurity-assessment",
      "incident-reporting",
      "essential-entity",
    ],
    relatedArticles: ["Art. 21", "Art. 23", "Art. 27"],
  },
  {
    slug: "space-debris-mitigation",
    term: "Space Debris Mitigation",
    definition:
      "Technical and operational measures to minimize the creation of orbital debris and ensure sustainable use of outer space.",
    longDescription: `Space debris mitigation encompasses all measures taken to limit the generation of space debris and preserve the orbital environment for future generations. Under the EU Space Act and international guidelines, operators must implement comprehensive debris mitigation strategies.

**Regulatory Framework**
The EU Space Act incorporates IADC (Inter-Agency Space Debris Coordination Committee) guidelines and ISO 24113 standards into binding requirements.

**Key Mitigation Measures**

*Design Phase:*
- Minimize release of mission-related objects
- Design for demise (atmospheric burn-up)
- Collision avoidance capability
- Passivation at end of life

*Operational Phase:*
- Active debris tracking and avoidance
- Conjunction assessment participation
- Anomaly reporting

*End-of-Life Phase:*
- 25-year deorbit rule for LEO (5 years under new EU rules)
- Graveyard orbit insertion for GEO
- Controlled re-entry when possible

**Compliance Documentation**
Operators must submit debris mitigation plans as part of their authorization application, including:
- Orbital lifetime analysis
- Collision probability assessment
- End-of-life disposal plan
- Passivation procedures`,
    category: "technical",
    relatedTerms: [
      "deorbit-plan",
      "passivation",
      "conjunction-assessment",
      "iadc-guidelines",
    ],
    relatedArticles: ["Art. 25-30"],
  },
  {
    slug: "authorization",
    term: "Authorization",
    definition:
      "The formal approval required from a National Competent Authority before conducting space activities within the EU.",
    longDescription: `Authorization is the central compliance requirement under the EU Space Act. No space activity may be conducted without prior authorization from the relevant National Competent Authority (NCA).

**Types of Authorization**
1. **Standard Authorization**: For commercial operators
2. **Light Regime Authorization**: Simplified process for small satellites, research missions, and academic projects
3. **Temporary Authorization**: For testing and experimental activities

**Application Requirements**
- Technical documentation of spacecraft/launch vehicle
- Financial capability proof
- Insurance certificates
- Debris mitigation plan
- Cybersecurity assessment
- Environmental impact assessment

**Processing Timeline**
NCAs must process applications within 90 days (standard) or 45 days (light regime). Complex cases may extend to 180 days.

**Validity and Renewal**
Authorizations are typically valid for the mission duration plus end-of-life phase. Significant changes require re-authorization.

**Mutual Recognition**
An authorization granted by one EU member state is valid across all member states, enabling true single market access.`,
    category: "legal",
    relatedTerms: [
      "nca",
      "light-regime",
      "spacecraft-operator",
      "eu-space-act",
    ],
    relatedArticles: ["Art. 10-18"],
  },
  {
    slug: "nca",
    term: "National Competent Authority",
    acronym: "NCA",
    definition:
      "The designated governmental body in each EU member state responsible for space activity authorization and supervision.",
    longDescription: `National Competent Authorities (NCAs) are the primary regulatory bodies for space activities in each EU member state. Under the EU Space Act, NCAs are responsible for implementing and enforcing the common European framework while maintaining national oversight.

**Core Responsibilities**
1. Processing authorization applications
2. Issuing, modifying, and revoking authorizations
3. Supervising ongoing space activities
4. Enforcing compliance requirements
5. Maintaining national space registries
6. Coordinating with EUSPA and other NCAs

**Examples of NCAs**
- **France**: CNES (Centre National d'Études Spatiales)
- **Germany**: DLR (Deutsches Zentrum für Luft- und Raumfahrt)
- **Luxembourg**: LSA (Luxembourg Space Agency)
- **Netherlands**: NSO (Netherlands Space Office)
- **UK**: UK Space Agency (post-Brexit, not EU NCA)

**Coordination Mechanisms**
NCAs participate in the EU Space Council and coordinate through EUSPA on cross-border issues, ensuring consistent application of EU rules.

**Operator Obligations**
Operators must:
- Submit applications to their designated NCA
- Report significant events and changes
- Allow inspections and audits
- Respond to NCA requests within specified timeframes`,
    category: "legal",
    relatedTerms: ["authorization", "euspa", "supervision", "eu-space-act"],
  },
  {
    slug: "euspa",
    term: "EU Agency for the Space Programme",
    acronym: "EUSPA",
    definition:
      "The European Union agency responsible for managing EU space programmes and coordinating space policy implementation.",
    longDescription: `The European Union Agency for the Space Programme (EUSPA) is the EU agency headquartered in Prague, Czech Republic, responsible for managing and operating EU space programmes and supporting the implementation of EU space policy.

**Key Programmes Managed**
- **Galileo**: European Global Navigation Satellite System
- **EGNOS**: European Geostationary Navigation Overlay Service
- **Copernicus**: Earth observation programme
- **GOVSATCOM**: Governmental satellite communications

**Role Under EU Space Act**
EUSPA plays a coordinating role in the implementation of the EU Space Act:
- Maintaining the EU Space Registry
- Coordinating between NCAs
- Providing technical standards and guidelines
- Supporting market surveillance
- Managing the EU Space Surveillance and Tracking (SST) programme

**Services Provided**
- Space situational awareness data
- Collision warning services
- Re-entry analysis
- Fragmentation detection

**Relationship with ESA**
EUSPA focuses on operational aspects and market development, while ESA (European Space Agency) handles research and development. The two agencies work closely together.`,
    category: "regulation",
    relatedTerms: ["eu-space-act", "nca", "eu-space-registry", "galileo"],
  },
  {
    slug: "eu-space-registry",
    term: "EU Space Registry",
    definition:
      "The centralized European database of registered space objects, fulfilling UN Registration Convention obligations.",
    longDescription: `The EU Space Registry is the official European register of space objects, mandated by the EU Space Act. It serves both domestic regulatory purposes and fulfills international obligations under the UN Registration Convention of 1975.

**Registration Requirements**
All space objects authorized under EU jurisdiction must be registered, including:
- Satellites (operational and non-operational)
- Launch vehicles and upper stages
- Released mission-related objects
- Planned space objects (pre-launch registration)

**Information Recorded**
- Designator/name of space object
- Launching state and operator
- Date and location of launch
- Basic orbital parameters
- General function and purpose
- Status (operational, decommissioned, re-entered)
- Liability and insurance information

**Access and Transparency**
The registry includes:
- Public section: Basic information accessible to all
- Restricted section: Sensitive information for NCAs only

**Integration with UN Registry**
EUSPA coordinates the submission of EU space object data to the UN Secretary-General for inclusion in the UN Register of Objects Launched into Outer Space.`,
    category: "legal",
    relatedTerms: ["euspa", "un-registration-convention", "authorization"],
    relatedArticles: ["Art. 35-40"],
  },

  // ============================================================================
  // OPERATOR TYPES
  // ============================================================================
  {
    slug: "spacecraft-operator",
    term: "Spacecraft Operator",
    acronym: "SCO",
    definition:
      "An entity responsible for the command and control of a spacecraft during its mission, from launch through end-of-life.",
    longDescription: `A Spacecraft Operator (SCO) is defined under the EU Space Act as any natural or legal person responsible for the operation of one or more spacecraft. This includes command and control functions throughout the spacecraft's lifecycle.

**Responsibilities**
- Pre-launch: Authorization, registration, insurance
- Launch: Coordination with launch provider
- Operations: Command and control, collision avoidance
- End-of-life: Deorbiting or graveyard maneuvers

**Regulatory Requirements**
SCOs must obtain authorization and comply with:
- Technical standards (spacecraft design, reliability)
- Operational requirements (tracking, telemetry)
- Debris mitigation obligations
- Cybersecurity measures (NIS2 if applicable)
- Insurance minimums

**Types of SCOs**
1. Commercial operators (telecom, EO, navigation)
2. Governmental operators
3. Scientific/research operators
4. Academic operators

**Light Regime Eligibility**
Small satellite operators may qualify for simplified authorization under the light regime if they meet size and risk criteria.`,
    category: "operator",
    relatedTerms: [
      "authorization",
      "light-regime",
      "debris-mitigation",
      "collision-avoidance",
    ],
  },
  {
    slug: "launch-operator",
    term: "Launch Operator",
    acronym: "LO",
    definition:
      "An entity responsible for the preparation and execution of space launch activities, including launch vehicle operations.",
    longDescription: `A Launch Operator (LO) is responsible for all activities related to launching space objects into orbit. This includes launch vehicle preparation, launch execution, and early orbit operations until spacecraft handover.

**Scope of Activities**
- Launch vehicle integration
- Launch countdown and execution
- Early orbit phase operations
- Spacecraft deployment/separation
- Upper stage disposal

**Authorization Requirements**
Launch operators require specific authorization covering:
- Launch vehicle technical approval
- Launch trajectory and safety analysis
- Third-party liability insurance
- Environmental impact assessment
- Debris mitigation plan for upper stages

**Safety Obligations**
- Flight safety systems
- Range safety coordination
- Emergency procedures
- Public safety measures

**European Launch Operators**
- Arianespace (France)
- Rocket Factory Augsburg (Germany)
- PLD Space (Spain)
- Isar Aerospace (Germany)`,
    category: "operator",
    relatedTerms: [
      "launch-site-operator",
      "authorization",
      "space-debris-mitigation",
    ],
  },
  {
    slug: "launch-site-operator",
    term: "Launch Site Operator",
    acronym: "LSO",
    definition:
      "An entity responsible for managing and operating a facility from which space launch vehicles are launched.",
    longDescription: `A Launch Site Operator (LSO) manages the ground infrastructure required for space launches. This includes the launch pad, integration facilities, range safety systems, and support infrastructure.

**Infrastructure Components**
- Launch pads and platforms
- Vehicle integration facilities
- Propellant storage and handling
- Tracking and telemetry systems
- Range safety systems
- Mission control facilities

**Authorization Requirements**
LSOs require authorization addressing:
- Site safety and security
- Environmental permits
- Emergency response plans
- Public exclusion zones
- Coordination with aviation authorities

**European Launch Sites**
- **Kourou, French Guiana**: Europe's primary spaceport (CSG)
- **Andøya, Norway**: Small satellite launches
- **Esrange, Sweden**: Sounding rockets and small satellites
- **Planned**: North Sea platforms, Portugal, Scotland

**Liability Considerations**
LSOs may share liability with launch operators depending on the cause of any incident.`,
    category: "operator",
    relatedTerms: ["launch-operator", "authorization", "range-safety"],
  },
  {
    slug: "in-space-service-operator",
    term: "In-Space Service Operator",
    acronym: "ISOS",
    definition:
      "An entity providing services to other spacecraft in orbit, including refueling, repair, debris removal, or life extension.",
    longDescription: `In-Space Service Operators (ISOS) represent an emerging category under the EU Space Act, covering entities that provide on-orbit services to other spacecraft or space objects.

**Types of Services**
1. **Life Extension**: Attaching service modules to extend satellite operations
2. **Refueling**: Replenishing propellant in orbit
3. **Repair and Maintenance**: Fixing malfunctioning components
4. **Inspection**: Close-proximity assessment of space objects
5. **Active Debris Removal**: Capturing and deorbiting debris

**Regulatory Challenges**
ISOS operations raise unique regulatory questions:
- Liability for damage during servicing
- Authorization for proximity operations
- Insurance requirements for third-party spacecraft
- Cybersecurity for cross-spacecraft communications

**EU Space Act Provisions**
The Act includes specific provisions for ISOS:
- Enhanced debris mitigation requirements
- Special insurance minimums
- Coordination protocols with client operators
- End-of-life responsibility allocation

**Market Growth**
The in-space servicing market is projected to grow significantly as satellite life extension becomes economically attractive.`,
    category: "operator",
    relatedTerms: [
      "active-debris-removal",
      "proximity-operations",
      "authorization",
    ],
  },
  {
    slug: "collision-avoidance-provider",
    term: "Collision Avoidance Provider",
    acronym: "CAP",
    definition:
      "An entity providing space situational awareness services including conjunction assessment and collision avoidance support.",
    longDescription: `Collision Avoidance Providers (CAPs) offer critical services for space safety, helping operators avoid collisions with other space objects and debris.

**Services Provided**
- Conjunction data messages (CDMs)
- Collision probability assessment
- Maneuver planning support
- Post-maneuver verification
- Anomaly detection and alerting

**Data Sources**
CAPs typically aggregate data from:
- Space surveillance networks (US SSN, EU SST)
- Commercial tracking providers
- Operator-provided ephemeris data
- Radar and optical observations

**Regulatory Status**
Under the EU Space Act, CAPs are recognized as essential service providers. Requirements include:
- Data quality standards
- Service level agreements
- Coordination with EUSPA SST
- Cybersecurity measures

**Key Providers**
- EU SST (governmental)
- LeoLabs (commercial)
- ExoAnalytic Solutions (commercial)
- Privateer (commercial)`,
    category: "operator",
    relatedTerms: [
      "conjunction-assessment",
      "space-situational-awareness",
      "euspa",
    ],
  },
  {
    slug: "positional-data-provider",
    term: "Positional Data Provider",
    acronym: "PDP",
    definition:
      "An entity that collects, processes, and distributes space object tracking data and orbital information.",
    longDescription: `Positional Data Providers (PDPs) form the backbone of space situational awareness by tracking space objects and providing accurate positional data to operators and regulatory authorities.

**Data Types**
- Two-Line Elements (TLEs)
- Precise ephemeris data
- Covariance information
- State vectors
- Orbital predictions

**Collection Methods**
- Ground-based radar (phased array, dish)
- Optical telescopes
- Space-based sensors
- RF signal detection
- Laser ranging

**Quality Standards**
The EU Space Act establishes minimum data quality standards:
- Position accuracy requirements
- Update frequency minimums
- Latency limits
- Availability targets

**Use Cases**
- Collision avoidance
- Launch window analysis
- Regulatory compliance verification
- Insurance claims investigation
- Conjunction forensics`,
    category: "operator",
    relatedTerms: [
      "collision-avoidance-provider",
      "space-situational-awareness",
      "tle",
    ],
  },
  {
    slug: "third-country-operator",
    term: "Third Country Operator",
    acronym: "TCO",
    definition:
      "A space operator based outside the EU that conducts space activities affecting EU interests or using EU infrastructure.",
    longDescription: `Third Country Operators (TCOs) are non-EU entities that fall under EU Space Act jurisdiction due to their activities affecting the European Union.

**Jurisdictional Triggers**
A TCO requires EU authorization if:
- Using EU launch facilities
- Operating ground stations in the EU
- Providing services to EU customers
- Conducting activities that may affect EU space assets

**Authorization Process**
TCOs must:
1. Designate an EU-based representative
2. Submit equivalent documentation to an NCA
3. Demonstrate compliance with EU standards
4. Maintain EU-accessible insurance

**Equivalence Recognition**
The EU may recognize third-country regulatory regimes as equivalent, simplifying authorization for TCOs from those jurisdictions.

**Key Considerations**
- Data localization requirements
- Export control compliance
- Technology transfer restrictions
- Liability and insurance coordination

**Examples**
- US operators launching from Kourou
- Japanese operators with EU ground stations
- Indian operators serving EU customers`,
    category: "operator",
    relatedTerms: ["authorization", "nca", "eu-space-act"],
  },

  // ============================================================================
  // TECHNICAL TERMS
  // ============================================================================
  {
    slug: "conjunction-assessment",
    term: "Conjunction Assessment",
    definition:
      "The process of evaluating potential close approaches between space objects to determine collision risk and inform avoidance decisions.",
    longDescription: `Conjunction assessment is a critical space safety process that identifies and evaluates close approaches between space objects, enabling operators to take collision avoidance action when necessary.

**Process Steps**
1. **Screening**: Identify potential close approaches from catalog data
2. **Refinement**: Improve accuracy with additional observations
3. **Risk Assessment**: Calculate collision probability
4. **Decision**: Determine if avoidance maneuver is needed
5. **Coordination**: Communicate with other operators if applicable
6. **Execution**: Perform maneuver if required
7. **Verification**: Confirm post-maneuver safety

**Key Metrics**
- Time of Closest Approach (TCA)
- Miss distance
- Collision probability (Pc)
- Mahalanobis distance

**Thresholds**
Typical action thresholds:
- Pc > 10⁻⁴: Maneuver recommended
- Pc > 10⁻³: Maneuver strongly advised
- Miss distance < 1 km (LEO): Close monitoring

**Regulatory Requirements**
Under the EU Space Act, operators must:
- Participate in conjunction data sharing
- Respond to conjunction warnings
- Report avoidance maneuvers
- Maintain maneuver capability`,
    category: "technical",
    relatedTerms: [
      "collision-avoidance-provider",
      "space-situational-awareness",
      "cdm",
    ],
  },
  {
    slug: "deorbit-plan",
    term: "Deorbit Plan",
    definition:
      "A documented strategy for removing a spacecraft from orbit at the end of its operational life, either through controlled re-entry or natural decay.",
    longDescription: `A deorbit plan is a mandatory component of space mission planning under the EU Space Act, ensuring spacecraft are removed from congested orbital regimes after their mission ends.

**Plan Components**
1. **Orbital Lifetime Analysis**: Natural decay timeline without intervention
2. **Disposal Method**: Controlled or uncontrolled re-entry
3. **Propellant Budget**: Reserved fuel for deorbit maneuver
4. **Timeline**: Sequence of end-of-life operations
5. **Contingencies**: Backup plans for system failures

**Regulatory Requirements**
- LEO missions: Maximum 5 years post-mission orbital lifetime (EU)
- GEO missions: Graveyard orbit insertion (300+ km above GEO)
- MEO missions: Case-by-case assessment

**Controlled vs. Uncontrolled**
*Controlled Re-entry:*
- Targeted impact zone (ocean)
- Lower casualty risk
- Requires more propellant

*Uncontrolled Re-entry:*
- Natural atmospheric decay
- Acceptable if casualty risk < 10⁻⁴
- Requires "design for demise"

**Documentation**
Deorbit plans must be submitted with authorization applications and updated if mission parameters change.`,
    category: "technical",
    relatedTerms: [
      "space-debris-mitigation",
      "passivation",
      "design-for-demise",
    ],
  },
  {
    slug: "passivation",
    term: "Passivation",
    definition:
      "The process of removing all stored energy from a spacecraft at end of life to prevent accidental explosions that could create debris.",
    longDescription: `Passivation is a critical debris mitigation measure that eliminates explosion risk from decommissioned spacecraft by depleting or safing all energy sources.

**Energy Sources to Address**
1. **Propellant**: Vent or burn remaining fuel
2. **Batteries**: Discharge and disconnect
3. **Pressure Vessels**: Vent pressurants
4. **Reaction Wheels**: Spin down
5. **Solar Arrays**: Disconnect from bus (optional)

**Regulatory Requirement**
The EU Space Act mandates passivation for all space objects at end of life. Failure to passivate has been a major source of debris-generating events historically.

**Timing**
Passivation should occur:
- After final mission operations
- Before loss of attitude control
- While ground contact is reliable
- Prior to deorbit maneuver (if applicable)

**Verification**
Operators must:
- Document passivation procedures
- Confirm passivation execution
- Report to NCA upon completion

**Historical Context**
Numerous debris-generating events have resulted from unpassivated upper stages and spacecraft, making this requirement essential for long-term orbital sustainability.`,
    category: "technical",
    relatedTerms: ["deorbit-plan", "space-debris-mitigation", "end-of-life"],
  },
  {
    slug: "light-regime",
    term: "Light Regime",
    definition:
      "A simplified authorization pathway under the EU Space Act for small satellites and low-risk space activities.",
    longDescription: `The Light Regime is a streamlined authorization process introduced by the EU Space Act to reduce regulatory burden for small satellites and low-risk missions while maintaining safety standards.

**Eligibility Criteria**
Missions may qualify for light regime if:
- Satellite mass < 500 kg
- Operating in LEO (< 2,000 km)
- Limited debris generation potential
- Standard mission profile
- Short mission duration (< 5 years)
- Non-critical infrastructure

**Simplified Requirements**
- Reduced documentation
- Faster processing (45 days vs. 90 days)
- Lower insurance minimums
- Simplified debris mitigation plan
- Self-certification for some requirements

**Exclusions**
Light regime does NOT apply to:
- Nuclear power sources
- Propulsive stages
- Deployables that could become debris
- Proximity operations
- Critical national infrastructure

**Application Process**
1. Self-assessment of eligibility
2. Simplified application form
3. Declaration of compliance
4. NCA verification
5. Authorization issuance

**Benefits**
The light regime particularly benefits:
- CubeSat operators
- University missions
- Technology demonstrations
- Startup companies`,
    category: "legal",
    relatedTerms: ["authorization", "spacecraft-operator", "cubesat"],
  },
  {
    slug: "space-situational-awareness",
    term: "Space Situational Awareness",
    acronym: "SSA",
    definition:
      "The comprehensive knowledge of the space environment including tracking of space objects, space weather monitoring, and near-Earth object surveillance.",
    longDescription: `Space Situational Awareness (SSA) encompasses all activities to monitor and understand the space environment, essential for safe and sustainable space operations.

**SSA Components**

*Space Surveillance and Tracking (SST):*
- Cataloging space objects
- Tracking debris and active satellites
- Conjunction assessment
- Re-entry prediction

*Space Weather:*
- Solar activity monitoring
- Geomagnetic storm prediction
- Radiation environment
- Atmospheric density forecasting

*Near-Earth Objects (NEO):*
- Asteroid detection
- Impact risk assessment
- Planetary defense

**EU SST Programme**
The EU operates a Space Surveillance and Tracking programme providing:
- Collision avoidance services
- Re-entry analysis
- Fragmentation detection
- Data sharing with operators

**Data Sources**
- Ground-based radar
- Optical telescopes
- Space-based sensors
- Operator-provided data
- International partnerships

**Regulatory Integration**
Under the EU Space Act, SSA services are integrated with authorization and supervision processes.`,
    category: "technical",
    relatedTerms: [
      "collision-avoidance-provider",
      "conjunction-assessment",
      "euspa",
    ],
  },
  {
    slug: "tle",
    term: "Two-Line Element Set",
    acronym: "TLE",
    definition:
      "A standardized data format for describing the orbital elements of Earth-orbiting objects, enabling position prediction.",
    longDescription: `Two-Line Element Sets (TLEs) are the standard format for distributing orbital data for space objects. Despite limitations in accuracy, TLEs remain widely used for space operations.

**Format Structure**
TLEs consist of two 69-character lines containing:
- Satellite catalog number
- Classification
- International designator
- Epoch (date and time)
- Mean motion derivatives
- BSTAR drag term
- Inclination
- Right ascension of ascending node
- Eccentricity
- Argument of perigee
- Mean anomaly
- Mean motion (revolutions per day)

**Propagation**
TLEs use SGP4/SDP4 propagators:
- SGP4: Near-Earth objects (period < 225 minutes)
- SDP4: Deep-space objects (period > 225 minutes)

**Accuracy Limitations**
- Position errors grow over time
- ~1-3 km accuracy at epoch
- ~10+ km after several days
- Better data available (but often restricted)

**Sources**
- Space-Track.org (US Space Force)
- Celestrak (aggregator)
- EU SST (European data)
- Commercial providers`,
    category: "technical",
    relatedTerms: [
      "positional-data-provider",
      "space-situational-awareness",
      "sgp4",
    ],
  },
  {
    slug: "cdm",
    term: "Conjunction Data Message",
    acronym: "CDM",
    definition:
      "A standardized message format providing detailed information about a predicted close approach between two space objects.",
    longDescription: `Conjunction Data Messages (CDMs) are the standard format for communicating collision risk information between space operators and conjunction service providers.

**Message Contents**
- Object identifications (both objects)
- Time of closest approach (TCA)
- Miss distance vector
- Relative velocity
- State vectors with covariance
- Collision probability
- Screening volume details

**CCSDS Standard**
CDMs follow the Consultative Committee for Space Data Systems (CCSDS) standard, ensuring interoperability between different systems and organizations.

**CDM Workflow**
1. Initial CDM: Several days before TCA
2. Updates: As tracking data improves
3. Final CDM: ~24-48 hours before TCA
4. Post-event: Confirmation of safe passage

**Response Actions**
Upon receiving a CDM, operators should:
- Assess collision probability
- Evaluate maneuver options
- Coordinate with other operator if possible
- Execute avoidance if warranted
- Report actions to regulatory authorities

**Quality Metrics**
CDM quality depends on:
- Tracking data accuracy
- Covariance realism
- Update frequency`,
    category: "technical",
    relatedTerms: [
      "conjunction-assessment",
      "collision-avoidance-provider",
      "ccsds",
    ],
  },
  {
    slug: "cubesat",
    term: "CubeSat",
    definition:
      "A standardized small satellite format using 10cm cubic units (1U = 10×10×10 cm), enabling cost-effective space access.",
    longDescription: `CubeSats are miniaturized satellites built to standard dimensions, revolutionizing access to space for universities, startups, and developing nations.

**Standard Sizes**
- 1U: 10×10×10 cm (~1-2 kg)
- 2U: 10×10×20 cm (~2-4 kg)
- 3U: 10×10×30 cm (~3-6 kg)
- 6U: 10×20×30 cm (~6-12 kg)
- 12U: 20×20×30 cm (~12-24 kg)

**Regulatory Status**
CubeSats typically qualify for:
- Light regime authorization (EU Space Act)
- Simplified licensing procedures
- Reduced insurance requirements
- Academic exemptions (in some jurisdictions)

**Debris Considerations**
Despite small size, CubeSats must:
- Comply with debris mitigation guidelines
- Ensure timely deorbit (< 5 years under EU rules)
- Consider deployable drag devices
- Avoid trackability concerns

**Deployment Methods**
- ISS deployment (JAXA, NanoRacks)
- Dedicated small satellite launchers
- Rideshare on larger missions
- Orbital transfer vehicles

**Capabilities**
Modern CubeSats can perform:
- Earth observation
- Communications relay
- Technology demonstration
- Scientific research
- IoT connectivity`,
    category: "technical",
    relatedTerms: ["light-regime", "spacecraft-operator", "small-satellite"],
  },
  {
    slug: "frequency-coordination",
    term: "Frequency Coordination",
    definition:
      "The process of obtaining and protecting radio frequency assignments for space communications through national and international regulatory bodies.",
    longDescription: `Frequency coordination is essential for satellite operations, ensuring non-interference with other radio services and compliance with international telecommunications regulations.

**Regulatory Framework**
- ITU Radio Regulations (international)
- National spectrum authorities
- EU coordination through CEPT

**ITU Filing Process**
1. **Advance Publication Information (API)**: Initial notification
2. **Coordination Request**: Detailed technical parameters
3. **Coordination Negotiations**: Resolve interference issues
4. **Notification**: Formal registration
5. **Bringing into Use**: Operational confirmation

**Frequency Bands**
Common satellite bands:
- L-band: 1-2 GHz (mobile, navigation)
- S-band: 2-4 GHz (telemetry, mobile)
- C-band: 4-8 GHz (broadcast, data)
- X-band: 8-12 GHz (military, weather)
- Ku-band: 12-18 GHz (broadcast, data)
- Ka-band: 26-40 GHz (broadband)
- V-band: 40-75 GHz (emerging)

**EU Space Act Integration**
Frequency coordination status is verified during authorization. Operations cannot commence without valid frequency assignments.`,
    category: "technical",
    relatedTerms: ["itu", "spectrum-management", "authorization"],
  },
  {
    slug: "itu",
    term: "International Telecommunication Union",
    acronym: "ITU",
    definition:
      "The United Nations specialized agency responsible for global coordination of radio spectrum and satellite orbital positions.",
    longDescription: `The International Telecommunication Union (ITU) is the UN agency that coordinates global use of the radio spectrum and satellite orbits, essential for all space communications.

**Space-Related Functions**
- Radio Regulations administration
- Frequency coordination and registration
- Orbital slot coordination (GEO)
- Technical standards development
- Capacity building assistance

**Key Instruments**
- ITU Radio Regulations
- ITU Constitution and Convention
- Resolutions and Recommendations
- Regional agreements

**Coordination Process**
The ITU facilitates coordination between administrations to:
- Prevent harmful interference
- Ensure equitable spectrum access
- Register frequency assignments
- Resolve disputes

**Satellite Filings**
Space networks must be filed through ITU for:
- GSO (geostationary) networks
- Non-GSO (LEO/MEO) systems
- Earth stations
- Space-to-space links

**EU Coordination**
EU member states coordinate ITU positions through CEPT and the European Commission to ensure unified European representation.`,
    category: "regulation",
    relatedTerms: ["frequency-coordination", "spectrum-management", "gso"],
  },

  // ============================================================================
  // CYBERSECURITY TERMS
  // ============================================================================
  {
    slug: "cybersecurity-assessment",
    term: "Cybersecurity Assessment",
    definition:
      "A systematic evaluation of a space system's security posture against cyber threats, required under NIS2 and EU Space Act.",
    longDescription: `Cybersecurity assessment evaluates the security of space systems against cyber threats, a mandatory requirement under both NIS2 Directive and EU Space Act provisions.

**Assessment Scope**
- Ground segment (mission control, data centers)
- Space segment (spacecraft, payloads)
- User segment (terminals, applications)
- Link segment (communications)
- Supply chain (components, software)

**Framework Alignment**
Assessments typically align with:
- NIS2 Article 21 measures
- NIST Cybersecurity Framework
- ISO 27001
- ECSS-E-ST-80C (space-specific)

**Key Evaluation Areas**
1. Risk management processes
2. Incident detection and response
3. Access control and authentication
4. Encryption and key management
5. Supply chain security
6. Physical security
7. Business continuity

**Reporting Requirements**
- Self-assessment documentation
- Third-party audit (for essential entities)
- Continuous monitoring evidence
- Incident history and lessons learned

**Frequency**
- Initial assessment before authorization
- Periodic reassessment (typically annual)
- Triggered reassessment after significant changes`,
    category: "cybersecurity",
    relatedTerms: ["nis2-directive", "incident-reporting", "essential-entity"],
  },
  {
    slug: "incident-reporting",
    term: "Incident Reporting",
    definition:
      "The mandatory notification of cybersecurity incidents and space safety events to relevant authorities within specified timeframes.",
    longDescription: `Incident reporting obligations require space operators to promptly notify authorities of significant events affecting safety, security, or operations.

**Cybersecurity Incidents (NIS2)**
Timeline for significant incidents:
- **Early Warning**: Within 24 hours of detection
- **Incident Notification**: Within 72 hours
- **Intermediate Report**: If requested
- **Final Report**: Within 1 month

**Space Safety Events (EU Space Act)**
Reportable events include:
- Anomalies affecting control
- Collision avoidance maneuvers
- Debris-generating events
- Re-entry incidents
- Loss of spacecraft

**Reporting Channels**
- National CSIRT (cybersecurity)
- NCA (space safety)
- EUSPA (significant events)
- Insurance providers

**Content Requirements**
Reports must include:
- Event timeline
- Impact assessment
- Root cause (when known)
- Mitigation measures taken
- Lessons learned

**Confidentiality**
Incident information is protected but may be anonymized and shared to improve sector-wide security.`,
    category: "cybersecurity",
    relatedTerms: ["nis2-directive", "cybersecurity-assessment", "csirt"],
  },
  {
    slug: "essential-entity",
    term: "Essential Entity",
    definition:
      "Under NIS2, a large organization or critical infrastructure operator subject to enhanced cybersecurity obligations and supervision.",
    longDescription: `Essential entities under NIS2 face the strictest cybersecurity requirements due to their importance to society and the economy.

**Classification Criteria (Space Sector)**
An entity is essential if it:
- Provides critical space infrastructure services
- Is a large enterprise (250+ employees or €50M+ turnover)
- Operates systems designated as critical by member states
- Provides services essential to public safety

**Enhanced Obligations**
Essential entities must:
- Implement comprehensive risk management
- Report incidents within 24/72 hours
- Undergo regular security audits
- Ensure supply chain security
- Participate in coordinated vulnerability disclosure

**Supervision Regime**
- Proactive supervision by authorities
- Regular audits and inspections
- Security scanning
- Information requests

**Penalties**
Non-compliance can result in:
- Fines up to €10 million or 2% of global turnover
- Management liability
- Temporary service prohibition
- Public disclosure of violations

**Space Sector Examples**
- Satellite communication providers (large)
- Critical ground station operators
- Navigation system providers
- Space traffic management services`,
    category: "cybersecurity",
    relatedTerms: [
      "nis2-directive",
      "important-entity",
      "cybersecurity-assessment",
    ],
  },
  {
    slug: "important-entity",
    term: "Important Entity",
    definition:
      "Under NIS2, a medium-sized organization in covered sectors subject to cybersecurity obligations with reactive supervision.",
    longDescription: `Important entities under NIS2 have significant but less stringent obligations than essential entities, with supervision primarily triggered by incidents or complaints.

**Classification Criteria**
An entity is important if it:
- Operates in a covered sector (including space)
- Is medium-sized (50-249 employees or €10-50M turnover)
- Does not qualify as essential
- Provides services with significant impact

**Obligations**
Important entities must:
- Implement appropriate security measures
- Report significant incidents
- Address security risks
- Maintain incident response capability

**Supervision Regime**
- Reactive (ex-post) supervision
- Triggered by incidents or evidence of non-compliance
- Lighter audit requirements
- Self-assessment acceptable

**Penalties**
Non-compliance can result in:
- Fines up to €7 million or 1.4% of global turnover
- Management recommendations
- Compliance orders

**Space Sector Examples**
- Medium-sized satellite operators
- Ground station service providers
- Space data processors
- Launch service companies`,
    category: "cybersecurity",
    relatedTerms: [
      "nis2-directive",
      "essential-entity",
      "cybersecurity-assessment",
    ],
  },
  {
    slug: "supply-chain-security",
    term: "Supply Chain Security",
    definition:
      "The protection of space systems through security requirements and assessment of suppliers, vendors, and service providers.",
    longDescription: `Supply chain security addresses risks introduced through third-party components, software, and services used in space systems.

**NIS2 Requirements**
Article 21(2)(d) requires entities to address:
- Supply chain security policies
- Supplier assessment procedures
- Security requirements in contracts
- Ongoing supplier monitoring

**Space-Specific Concerns**
- Counterfeit electronic parts
- Malicious code in software
- Compromised ground equipment
- Untrusted launch services
- Third-party data handling

**Assessment Elements**
1. Supplier identification and classification
2. Security capability evaluation
3. Contractual requirements
4. Ongoing compliance verification
5. Incident notification obligations
6. Subcontractor transparency

**Best Practices**
- Component traceability
- Secure software development requirements
- Background checks for personnel
- Physical security of facilities
- Diversification of critical suppliers

**Coordination**
ENISA provides sector-specific guidance on supply chain security for space operators.`,
    category: "cybersecurity",
    relatedTerms: [
      "nis2-directive",
      "cybersecurity-assessment",
      "essential-entity",
    ],
  },

  // ============================================================================
  // LEGAL AND LIABILITY TERMS
  // ============================================================================
  {
    slug: "liability-convention",
    term: "Liability Convention",
    definition:
      "The 1972 UN Convention on International Liability for Damage Caused by Space Objects, establishing state liability for space activities.",
    longDescription: `The Liability Convention (formally the Convention on International Liability for Damage Caused by Space Objects) establishes international rules for compensation when space objects cause damage.

**Key Principles**
- **Absolute Liability**: Launching state is absolutely liable for damage on Earth's surface or to aircraft
- **Fault Liability**: Liability based on fault for damage in space
- **Joint Liability**: Multiple launching states may be jointly liable

**Launching State Definition**
A state is a "launching state" if it:
- Launches the space object
- Procures the launch
- Provides territory or facilities for launch

**Claims Process**
1. Claim presented through diplomatic channels
2. One-year presentation deadline
3. Claims Commission if no agreement
4. Binding decision within one year

**Historic Claims**
- Cosmos 954 (1978): Soviet nuclear satellite debris in Canada
- Settlement: CAD 3 million

**EU Space Act Integration**
The Act ensures EU compliance with Liability Convention by:
- Requiring operator insurance
- Establishing national recovery mechanisms
- Coordinating between member states`,
    category: "legal",
    relatedTerms: [
      "insurance-requirements",
      "launching-state",
      "outer-space-treaty",
    ],
  },
  {
    slug: "outer-space-treaty",
    term: "Outer Space Treaty",
    definition:
      "The 1967 Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, the foundational international space law.",
    longDescription: `The Outer Space Treaty (OST) is the cornerstone of international space law, establishing fundamental principles for space activities that all subsequent regulations build upon.

**Core Principles**
- Space exploration for benefit of all countries
- No national appropriation of celestial bodies
- Freedom of exploration and use
- No weapons of mass destruction in space
- International responsibility for national activities
- State liability for damage
- Astronaut assistance and return

**State Responsibility (Article VI)**
States bear international responsibility for national space activities, whether by governmental or non-governmental entities. This requires:
- Authorization of private activities
- Continuing supervision
- Compliance with international law

**Article VII: Liability**
Launching states are internationally liable for damage caused by their space objects, forming the basis for the Liability Convention.

**Registration (Article VIII)**
States retain jurisdiction and control over registered space objects, implemented through the Registration Convention.

**EU Implementation**
The EU Space Act ensures member state compliance with OST obligations through the authorization and supervision framework.`,
    category: "legal",
    relatedTerms: [
      "liability-convention",
      "registration-convention",
      "authorization",
    ],
  },
  {
    slug: "insurance-requirements",
    term: "Insurance Requirements",
    definition:
      "Mandatory third-party liability insurance coverage that space operators must maintain as a condition of authorization.",
    longDescription: `Insurance requirements ensure that space operators can cover damages arising from their activities, protecting both third parties and taxpayers from bearing losses.

**EU Space Act Requirements**
Minimum coverage levels (subject to final adoption):
- Standard missions: €60 million
- High-risk missions: Up to €500 million
- Light regime: Reduced minimums

**Coverage Scope**
Insurance must cover:
- Third-party property damage
- Personal injury
- Environmental damage
- Launch phase
- In-orbit operations
- Re-entry phase

**Policy Requirements**
- Approved insurers
- EU law jurisdiction clause
- Direct action rights for victims
- Notification of changes to NCA

**Risk Considerations**
Premium factors:
- Spacecraft value
- Orbital parameters
- Mission duration
- Operator track record
- Collision avoidance capability

**Market**
Key space insurers:
- AXA XL
- Allianz
- Munich Re
- Swiss Re
- Lloyd's syndicates`,
    category: "legal",
    relatedTerms: ["authorization", "liability-convention", "nca"],
  },
  {
    slug: "registration-convention",
    term: "Registration Convention",
    definition:
      "The 1975 UN Convention on Registration of Objects Launched into Outer Space, requiring states to register space objects with the UN.",
    longDescription: `The Registration Convention creates a system for identifying space objects and their owners, essential for determining liability and maintaining space safety.

**Registration Obligations**
Launching states must:
- Maintain national registries
- Notify UN Secretary-General of launches
- Provide specified information

**Information Required**
- Name of launching state(s)
- Appropriate designator or registration number
- Date and location of launch
- Basic orbital parameters
- General function of space object

**Purpose**
Registration enables:
- Identification of objects
- Determination of jurisdiction
- Liability attribution
- Space traffic management

**UN Register**
The UN Office for Outer Space Affairs (UNOOSA) maintains the international register, accessible online.

**EU Implementation**
The EU Space Registry coordinates member state compliance, aggregating national registrations for UN notification while maintaining the European catalog.`,
    category: "legal",
    relatedTerms: [
      "eu-space-registry",
      "outer-space-treaty",
      "liability-convention",
    ],
  },
  {
    slug: "launching-state",
    term: "Launching State",
    definition:
      "A state that launches or procures the launch of a space object, or from whose territory or facility a launch occurs.",
    longDescription: `The concept of "launching state" is central to international space law liability and registration frameworks, determining which states bear responsibility for space objects.

**Definition Sources**
Both the Liability Convention and Registration Convention define launching state as a state that:
1. Launches the space object
2. Procures the launching of the space object
3. Provides territory from which the launch occurs
4. Provides facilities for the launch

**Multiple Launching States**
A single space object may have multiple launching states:
- Operator's state (procuring)
- Launch provider's state (launching)
- Launch site state (territory)

**Implications**
Launching state status means:
- International liability for damage
- Registration obligations
- Jurisdiction over personnel and objects
- Responsibility for authorization

**EU Context**
Under the EU Space Act:
- Member states remain launching states
- EU coordination for international obligations
- Intra-EU liability allocation rules

**Practical Examples**
- French Guiana launch of German satellite: France and Germany are launching states
- UK-procured launch from New Zealand: UK and New Zealand are launching states`,
    category: "legal",
    relatedTerms: [
      "liability-convention",
      "registration-convention",
      "authorization",
    ],
  },

  // ============================================================================
  // ADDITIONAL TECHNICAL TERMS
  // ============================================================================
  {
    slug: "active-debris-removal",
    term: "Active Debris Removal",
    acronym: "ADR",
    definition:
      "Technologies and missions designed to capture and remove existing debris objects from orbit.",
    longDescription: `Active Debris Removal (ADR) refers to technologies and missions that physically remove debris from orbit, complementing passive debris mitigation measures.

**Removal Methods**
1. **Capture and Deorbit**: Grab debris and perform controlled re-entry
2. **Drag Enhancement**: Attach device to accelerate natural decay
3. **Laser Ablation**: Ground or space-based lasers to alter orbits
4. **Ion Beam Shepherd**: Contactless pushing using ion beams

**Capture Technologies**
- Robotic arms
- Nets
- Harpoons
- Tentacles
- Electromagnetic docking

**Current Missions**
- ESA ClearSpace-1 (planned)
- Astroscale ELSA-d (demonstration)
- RemoveDEBRIS (completed demonstration)

**Regulatory Challenges**
ADR raises complex legal questions:
- Ownership/jurisdiction over debris
- Authorization for proximity operations
- Liability for removal attempts
- International coordination

**EU Space Act Provisions**
The Act includes provisions for ADR operators (ISOS category) with requirements for:
- Technical capability demonstration
- Insurance for serviced objects
- Coordination protocols
- End-of-life for ADR spacecraft`,
    category: "technical",
    relatedTerms: [
      "space-debris-mitigation",
      "in-space-service-operator",
      "deorbit-plan",
    ],
  },
  {
    slug: "design-for-demise",
    term: "Design for Demise",
    acronym: "D4D",
    definition:
      "Spacecraft design approach ensuring complete or near-complete destruction during atmospheric re-entry to minimize ground casualty risk.",
    longDescription: `Design for Demise (D4D) is a spacecraft design philosophy that ensures the vehicle breaks up and burns up during re-entry, minimizing the risk of debris reaching Earth's surface.

**Design Principles**
- Use materials with low melting points
- Avoid monolithic structures
- Enable early structural breakup
- Minimize protected components
- External mounting of hazardous materials

**Key Techniques**
1. **Material Selection**: Aluminum over titanium, polymers over metals
2. **Joint Design**: Connections that fail early in re-entry
3. **Thermal Management**: Exposure of internal components
4. **Propellant Management**: Designs ensuring tank rupture

**Casualty Risk Threshold**
Uncontrolled re-entries require casualty expectation < 1 in 10,000 (10⁻⁴), achievable through D4D.

**Analysis Tools**
- ESA DRAMA (Debris Risk Assessment and Mitigation Analysis)
- NASA DAS (Debris Assessment Software)
- Commercial re-entry simulation tools

**EU Space Act Compliance**
D4D is encouraged for spacecraft not capable of controlled re-entry, particularly for:
- Small satellites
- CubeSats
- Constellations
- Technology demonstrators`,
    category: "technical",
    relatedTerms: ["deorbit-plan", "space-debris-mitigation", "casualty-risk"],
  },
  {
    slug: "iadc-guidelines",
    term: "IADC Guidelines",
    definition:
      "The Inter-Agency Space Debris Coordination Committee guidelines representing international best practices for debris mitigation.",
    longDescription: `The IADC Space Debris Mitigation Guidelines are the internationally recognized best practices for reducing the creation of space debris, incorporated into regulatory frameworks worldwide.

**IADC Members**
- ASI (Italy)
- CNES (France)
- CNSA (China)
- CSA (Canada)
- DLR (Germany)
- ESA
- ISRO (India)
- JAXA (Japan)
- KARI (South Korea)
- NASA (USA)
- Roscosmos (Russia)
- UKSA (UK)

**Key Guidelines**
1. Limit debris released during normal operations
2. Minimize potential for on-orbit break-ups
3. Post-mission disposal (25-year rule)
4. Collision avoidance
5. Design for passivation

**Regulatory Adoption**
The guidelines are incorporated into:
- UN COPUOS Guidelines
- ISO 24113 standard
- National space laws
- EU Space Act

**Evolution**
The IADC guidelines are regularly updated to reflect technological advances and orbital environment changes. The EU Space Act goes beyond IADC in some areas (5-year vs. 25-year deorbit).`,
    category: "technical",
    relatedTerms: ["space-debris-mitigation", "deorbit-plan", "passivation"],
  },
  {
    slug: "gso",
    term: "Geostationary Orbit",
    acronym: "GEO/GSO",
    definition:
      "A circular orbit at approximately 35,786 km altitude where satellites appear stationary relative to Earth's surface.",
    longDescription: `Geostationary orbit (GEO or GSO) is a unique orbital regime where satellites maintain a fixed position relative to Earth, ideal for communications and weather monitoring.

**Orbital Characteristics**
- Altitude: ~35,786 km
- Period: 23 hours 56 minutes 4 seconds
- Inclination: 0° (equatorial)
- Eccentricity: 0 (circular)

**Advantages**
- Fixed ground antenna pointing
- Continuous coverage of hemisphere
- No handover between satellites
- Ideal for broadcast services

**Limitations**
- Limited orbital slots (separated by ~2°)
- High latency (~250ms round-trip)
- Requires more powerful satellites
- No polar coverage

**Debris Mitigation**
GEO satellites cannot deorbit economically. Instead:
- Graveyard orbit: 300+ km above GEO
- Passivation required
- Fuel reservation for disposal

**ITU Coordination**
GEO slots are a limited resource coordinated through ITU to prevent interference and ensure equitable access.

**EU Space Act Provisions**
GEO operators face specific requirements for:
- End-of-life disposal
- Slot coordination
- Station-keeping capability`,
    category: "technical",
    relatedTerms: ["leo", "meo", "frequency-coordination", "itu"],
  },
  {
    slug: "leo",
    term: "Low Earth Orbit",
    acronym: "LEO",
    definition:
      "Orbital regime from approximately 160 km to 2,000 km altitude, the most congested region of space and primary focus of debris mitigation efforts.",
    longDescription: `Low Earth Orbit (LEO) is the most utilized and congested orbital regime, hosting the majority of operational satellites, space stations, and debris.

**Orbital Characteristics**
- Altitude: 160-2,000 km
- Period: 88-127 minutes
- Typical lifetimes: Months to decades (depending on altitude)

**Applications**
- Earth observation
- Communications constellations
- Scientific research
- Human spaceflight
- Technology demonstration

**Debris Environment**
LEO contains the highest concentration of:
- Tracked objects (~70% of catalog)
- Small untracked debris
- Collision risk

**EU Space Act Requirements**
LEO operators must:
- Deorbit within 5 years post-mission (stricter than IADC 25-year)
- Maintain collision avoidance capability
- Submit debris mitigation plans
- Participate in SST data sharing

**Mega-Constellations**
LEO is seeing unprecedented growth with constellations like:
- Starlink (SpaceX)
- OneWeb
- Amazon Kuiper
- EU IRIS²

This drives urgent need for updated debris mitigation requirements.`,
    category: "technical",
    relatedTerms: [
      "gso",
      "meo",
      "space-debris-mitigation",
      "conjunction-assessment",
    ],
  },
  {
    slug: "meo",
    term: "Medium Earth Orbit",
    acronym: "MEO",
    definition:
      "Orbital regime between LEO and GEO, approximately 2,000 km to 35,786 km altitude, primarily used for navigation satellites.",
    longDescription: `Medium Earth Orbit (MEO) lies between LEO and GEO, primarily used for navigation satellite constellations due to favorable coverage and signal geometry.

**Orbital Characteristics**
- Altitude: 2,000-35,786 km
- Period: 2-24 hours
- Common altitudes: ~20,000 km (navigation)

**Primary Uses**
- Navigation (GPS, Galileo, GLONASS, BeiDou)
- Communications (some constellations)
- Scientific satellites

**Navigation Constellation Orbits**
- GPS: ~20,200 km, 55° inclination
- Galileo: ~23,222 km, 56° inclination
- GLONASS: ~19,130 km, 64.8° inclination

**Debris Considerations**
MEO has lower debris density than LEO but longer orbital lifetimes:
- Natural decay takes centuries
- Disposal options limited
- Graveyard orbits possible but not standard

**EU Space Act Application**
MEO operators follow standard authorization requirements with case-by-case disposal assessment.`,
    category: "technical",
    relatedTerms: ["leo", "gso", "galileo", "space-debris-mitigation"],
  },
  {
    slug: "galileo",
    term: "Galileo",
    definition:
      "The European Union's global navigation satellite system providing precise positioning services independent of GPS.",
    longDescription: `Galileo is the EU's flagship space infrastructure project, providing global navigation satellite services under civilian control.

**System Overview**
- 30 satellites planned (24 operational + 6 spares)
- MEO constellation (~23,222 km altitude)
- Three orbital planes at 56° inclination
- Global coverage

**Services**
1. **Open Service**: Free, ~1m accuracy
2. **High Accuracy Service**: Sub-meter precision
3. **Public Regulated Service**: Encrypted, for government use
4. **Search and Rescue**: Distress signal relay

**Governance**
- EUSPA: Operations and service provision
- ESA: Development and procurement
- European Commission: Political oversight

**Key Features**
- Civilian control (unlike GPS/GLONASS)
- Interoperable with GPS
- Authentication services
- Higher accuracy than competitors

**EU Space Act Integration**
Galileo infrastructure is protected under EU Space Act provisions for critical space infrastructure, with specific cybersecurity and continuity requirements.`,
    category: "technical",
    relatedTerms: ["euspa", "meo", "gnss"],
  },
  {
    slug: "supervision",
    term: "Supervision",
    definition:
      "The ongoing regulatory oversight of authorized space activities by National Competent Authorities to ensure continued compliance.",
    longDescription: `Supervision refers to the continuous regulatory oversight that NCAs exercise over authorized space activities, ensuring ongoing compliance throughout the mission lifecycle.

**Supervision Activities**
1. **Monitoring**: Tracking compliance status
2. **Reporting**: Receiving and reviewing operator reports
3. **Inspections**: On-site and remote audits
4. **Investigations**: Following incidents or complaints
5. **Enforcement**: Taking corrective actions

**Operator Obligations**
Supervised operators must:
- Submit periodic status reports
- Notify significant changes
- Allow inspections
- Provide requested information
- Implement corrective measures

**Trigger Events**
Enhanced supervision may be triggered by:
- Anomalies or incidents
- Changes in mission parameters
- Compliance concerns
- Transfer of operations
- End-of-life approach

**EU Coordination**
NCAs coordinate supervision through:
- Information sharing
- Joint inspections
- Mutual assistance
- EUSPA data exchange

**Enforcement Powers**
NCAs can:
- Issue warnings
- Require corrective action
- Impose fines
- Suspend authorization
- Revoke authorization`,
    category: "legal",
    relatedTerms: [
      "authorization",
      "nca",
      "eu-space-act",
      "incident-reporting",
    ],
  },
  {
    slug: "end-of-life",
    term: "End-of-Life",
    acronym: "EOL",
    definition:
      "The final phase of a space mission when operational activities cease and disposal procedures are implemented.",
    longDescription: `End-of-Life (EOL) is a critical mission phase addressing the transition from operations to disposal, with significant regulatory requirements under the EU Space Act.

**EOL Planning Requirements**
Authorization applications must include:
- Disposal method selection
- Propellant budget allocation
- Timeline for disposal operations
- Contingency procedures

**EOL Activities**
1. Final mission operations
2. Payload decommissioning
3. Data archive and transfer
4. Orbit lowering (if applicable)
5. Passivation
6. Final telemetry
7. Disposal verification

**Disposal Options by Orbit**
- **LEO**: Atmospheric re-entry (controlled or uncontrolled)
- **GEO**: Graveyard orbit insertion
- **MEO**: Case-by-case assessment
- **HEO**: Generally, re-entry or long-term orbit

**Regulatory Timeline**
- LEO: 5 years post-mission (EU requirement)
- GEO: Immediate graveyard insertion
- Notification: 30 days before EOL operations

**Challenges**
- System failures preventing disposal
- Insufficient propellant
- Loss of communication
- Tumbling spacecraft`,
    category: "technical",
    relatedTerms: ["passivation", "deorbit-plan", "space-debris-mitigation"],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Combine base terms with additional terms
const allTermsArray = [...glossaryTerms, ...additionalTerms, ...moreTerms];

export function getAllTerms(): GlossaryTerm[] {
  return allTermsArray.sort((a, b) => a.term.localeCompare(b.term));
}

export function getTermBySlug(slug: string): GlossaryTerm | undefined {
  return allTermsArray.find((term) => term.slug === slug);
}

export function getTermsByCategory(
  category: GlossaryTerm["category"],
): GlossaryTerm[] {
  return allTermsArray
    .filter((term) => term.category === category)
    .sort((a, b) => a.term.localeCompare(b.term));
}

export function getAllCategories(): GlossaryTerm["category"][] {
  return ["regulation", "operator", "technical", "legal", "cybersecurity"];
}

export function getRelatedTerms(term: GlossaryTerm): GlossaryTerm[] {
  return term.relatedTerms
    .map((slug) => getTermBySlug(slug))
    .filter((t): t is GlossaryTerm => t !== undefined);
}

export function searchTerms(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase();
  return glossaryTerms.filter(
    (term) =>
      term.term.toLowerCase().includes(lowerQuery) ||
      term.definition.toLowerCase().includes(lowerQuery) ||
      term.acronym?.toLowerCase().includes(lowerQuery),
  );
}

export function getTermsStartingWith(letter: string): GlossaryTerm[] {
  return glossaryTerms.filter((term) =>
    term.term.toLowerCase().startsWith(letter.toLowerCase()),
  );
}

export function getAlphabetWithTerms(): string[] {
  const letters = new Set<string>();
  glossaryTerms.forEach((term) => {
    letters.add(term.term[0].toUpperCase());
  });
  return Array.from(letters).sort();
}
