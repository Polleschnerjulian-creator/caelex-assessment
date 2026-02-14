// ============================================================================
// PILLAR GUIDES DATA
// ============================================================================

import { additionalGuides } from "./additional-guides";

export interface Guide {
  slug: string;
  title: string;
  h1: string;
  description: string;
  content: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  keywords: string[];
  readingTime: number;
}

export const guides: Guide[] = [
  {
    slug: "eu-space-act",
    title: "The Complete Guide to EU Space Act Compliance",
    h1: "The Complete Guide to EU Space Act Compliance",
    description:
      "Comprehensive guide to EU Space Act compliance for space operators. Covers all 119 articles, authorization requirements, operator categories, timelines, and step-by-step compliance strategies.",
    keywords: [
      "EU Space Act",
      "space compliance",
      "authorization",
      "satellite regulation",
    ],
    author: "Caelex",
    publishedAt: "2025-01-15",
    readingTime: 25,
    content: `
The EU Space Act (COM(2025) 335) represents a watershed moment for European space regulation. For the first time, the EU is establishing a comprehensive, harmonized framework for authorizing and supervising space activities. This guide covers everything you need to know to achieve compliance.

## Executive Summary

The EU Space Act creates a single regulatory framework for space activities across all EU member states. It applies to seven categories of operators, establishes authorization requirements through National Competent Authorities (NCAs), and sets binding standards for safety, sustainability, and cybersecurity.

**Key facts:**
- 119 articles covering all aspects of space activities
- 7 operator categories from spacecraft operators to data providers
- Mandatory authorization before commencing activities
- Compliance deadline: 2030 for existing operators
- Strong alignment with NIS2 for cybersecurity

## Part 1: Understanding the Regulatory Landscape

### Why the EU Space Act?

Europe's space sector has grown dramatically. With over 400 satellites operated by EU entities and plans for mega-constellations, the fragmented national regulatory landscape became untenable. The EU Space Act addresses:

1. **Regulatory Fragmentation**: 10+ national space laws with varying requirements
2. **Competitive Disadvantage**: Complexity deterring investment
3. **Safety Concerns**: Debris proliferation and collision risks
4. **Cybersecurity Gaps**: Space systems as critical infrastructure
5. **Strategic Autonomy**: Reducing dependence on non-EU frameworks

### Relationship with National Laws

The EU Space Act does not replace national space laws entirely. Instead:

- It sets **minimum standards** all operators must meet
- Member states may impose **stricter requirements** in certain areas
- National laws remain relevant for matters **outside EU scope**
- NCAs implement EU requirements **through national processes**

### Relationship with International Law

The Act operates within existing international frameworks:

- **Outer Space Treaty (1967)**: State responsibility remains
- **Liability Convention (1972)**: Damage liability framework
- **Registration Convention (1976)**: Object registration
- **ITU Radio Regulations**: Spectrum coordination

## Part 2: Operator Categories and Scope

### The Seven Operator Types

#### Spacecraft Operator (SCO)
Anyone who owns, operates, or controls a spacecraft. This is the most common category.

**Typical entities**: Satellite operators, constellation operators, hosted payload providers

**Key obligations**:
- Pre-launch authorization
- Registration and tracking
- Debris mitigation
- End-of-life disposal
- Cybersecurity (if essential entity)

#### Launch Operator (LO)
Entities conducting launch activities to place objects in space.

**Typical entities**: Arianespace, RocketLab Europe, emerging European launchers

**Key obligations**:
- Launch license per campaign
- Range safety compliance
- Insurance coverage
- Environmental assessments

#### Launch Site Operator (LSO)
Operators of facilities from which launches are conducted.

**Typical entities**: CSG (Kourou), Andøya, Esrange, SaxaVord

**Key obligations**:
- Site authorization
- Safety perimeter management
- Environmental compliance
- Emergency response

#### In-Space Service Operator (ISOS)
Providers of on-orbit services to other spacecraft.

**Typical entities**: ClearSpace, Astroscale Europe, D-Orbit

**Key obligations**:
- Proximity operations authorization
- Target coordination
- Enhanced debris mitigation
- Additional liability considerations

#### Collision Avoidance Provider (CAP)
Entities providing collision warning and avoidance services.

**Typical entities**: Commercial SSA providers, EUSST service providers

**Key obligations**:
- Data quality standards
- Service availability
- SST network integration
- Service failure liability

#### Positional Data Provider (PDP)
Providers of space object tracking and orbit determination.

**Typical entities**: Tracking networks, radar operators, optical observatories

**Key obligations**:
- Accuracy standards
- Availability requirements
- EUSST data sharing
- Security measures

#### Third Country Operator (TCO)
Non-EU operators with EU market presence.

**Typical entities**: US operators serving EU customers, non-EU satellites in EU spectrum

**Key obligations**:
- EU standard compliance for EU market access
- Registration requirements
- Potential NIS2 obligations

### Determining Your Category

Many operators fall into multiple categories. A launch service provider might be SCO (for upper stages), LO (for launches), and potentially LSO (if operating a spaceport).

**Assessment factors**:
1. What activities do you conduct?
2. What objects do you operate?
3. What services do you provide?
4. Who are your customers?

## Part 3: Authorization Requirements

### The Authorization Framework

All operators must obtain authorization from their NCA before commencing space activities. The process involves:

1. **Application Submission**: Complete dossier to NCA
2. **Technical Assessment**: NCA review of capabilities
3. **Safety Evaluation**: Debris, collision, re-entry risks
4. **Financial Review**: Insurance and guarantees
5. **Decision**: Authorization granted or denied
6. **Ongoing Compliance**: Supervision and reporting

### Who is Your NCA?

Your NCA is determined by:

1. **Place of incorporation** (primary factor)
2. **Principal place of business** (if different)
3. **Launch location** (for launches from EU)
4. **EU nexus** (for TCOs)

### Authorization Conditions

Authorizations typically include conditions such as:

- Mission parameters (orbit, duration)
- Technical requirements
- Insurance maintenance
- Reporting obligations
- Debris mitigation compliance
- Cybersecurity measures

### Timeline Expectations

Authorization processes typically take:

- **Straightforward cases**: 6-9 months
- **Complex missions**: 12-18 months
- **Novel activities**: 18-24 months

Start early to avoid launch delays.

## Part 4: Safety and Sustainability

### Debris Mitigation (Articles 10-12)

The Act imposes binding debris mitigation requirements:

**Design Phase**:
- Minimize release of mission-related objects
- No intentional fragmentations
- Secure all components

**Operational Phase**:
- Collision avoidance capability
- Tracking and identification
- Coordination with SST

**End of Life**:
- LEO: Deorbit within 5 years (new missions)
- GEO: Graveyard orbit (+235 km)
- Passivation of energy sources

### Re-entry Safety (Article 11)

For uncontrolled re-entry:
- Casualty probability < 1:10,000
- Use of demisable materials
- Assessment and documentation

Controlled re-entry is preferred where feasible.

### Space Situational Awareness (Article 15)

Operators must:
- Provide tracking data to EUSST
- Participate in conjunction assessments
- Execute avoidance maneuvers when necessary
- Share operational information

## Part 5: Cybersecurity Requirements

### NIS2 Integration (Article 16)

Space operators classified as essential or important entities under NIS2 must implement comprehensive cybersecurity measures.

**Essential entities** (typically larger operators):
- Maximum penalties: EUR 10M or 2% turnover
- Proactive supervision
- Regular audits

**Important entities**:
- Maximum penalties: EUR 7M or 1.4% turnover
- Reactive supervision
- Self-assessment

### Required Security Measures

Per NIS2 Article 21(2), operators must address:

1. Risk analysis and security policies
2. Incident handling
3. Business continuity
4. Supply chain security
5. Network security
6. Effectiveness assessment
7. Cyber hygiene and training
8. Cryptography
9. HR security
10. Access control and MFA

### Incident Reporting

Timeline for cyber incidents:
- **24 hours**: Early warning to authority
- **72 hours**: Incident notification
- **1 month**: Final report

### Space-Specific Considerations

Space systems face unique cybersecurity challenges:
- Command link security
- Telemetry protection
- Ground station security
- Software update integrity
- Supply chain attacks

## Part 6: Insurance and Liability

### Mandatory Insurance (Article 14)

Operators must maintain third-party liability insurance covering:
- Damage to third parties on Earth
- Damage to other space objects
- Full mission lifecycle

### Coverage Amounts

The EU Space Act establishes minimum coverage requirements, though member states may require higher amounts:

| Activity Type | Minimum Coverage |
|--------------|------------------|
| LEO satellites | EUR 20-60 million |
| GEO satellites | EUR 60+ million |
| Launches | EUR 60+ million |
| ISOS | Case-by-case |

### State Guarantee Mechanisms

Several member states provide government backing for claims exceeding insurance coverage, reducing operator costs while ensuring victim compensation.

## Part 7: Supervision and Enforcement

### Ongoing Supervision (Articles 17-20)

NCAs conduct ongoing supervision including:
- Regular reporting requirements
- Inspection rights
- Documentation reviews
- On-site audits

### Enforcement Powers

NCAs can:
- Issue warnings and orders
- Impose conditions on authorizations
- Suspend authorizations
- Revoke authorizations
- Impose administrative penalties

### EUSPA Coordination

For EU-wide matters, EUSPA coordinates between NCAs:
- Consistent implementation
- Information sharing
- Best practice development
- Technical guidance

## Part 8: Compliance Roadmap

### Phase 1: Assessment (Months 1-3)

1. Determine operator category
2. Identify applicable NCA
3. Map current status against requirements
4. Identify compliance gaps
5. Estimate resource needs

### Phase 2: Planning (Months 4-6)

1. Develop compliance timeline
2. Assign responsibilities
3. Budget for implementation
4. Engage with NCA
5. Procure insurance quotes

### Phase 3: Implementation (Months 7-18)

1. Implement technical measures
2. Develop documentation
3. Deploy cybersecurity controls
4. Establish reporting systems
5. Train personnel

### Phase 4: Authorization (Months 18-24)

1. Submit authorization application
2. Respond to NCA queries
3. Complete assessments
4. Finalize insurance
5. Receive authorization

### Phase 5: Operations (Ongoing)

1. Maintain compliance
2. Submit required reports
3. Update documentation
4. Respond to changes
5. Prepare for audits

## Key Takeaways

1. **Start now**: Authorization takes 6-18 months
2. **Know your category**: Determines your obligations
3. **Engage your NCA**: Build relationship early
4. **Address cybersecurity**: NIS2 integration is critical
5. **Plan for debris**: 5-year rule is coming
6. **Maintain insurance**: Continuous coverage required
7. **Document everything**: Evidence for audits

## How Caelex Helps

Caelex provides comprehensive EU Space Act compliance support:

- **Automated Assessment**: Determine your category and gaps in minutes
- **Compliance Tracking**: Monitor progress across all 119 articles
- **Document Generation**: Auto-generate authorization applications
- **Deadline Management**: Never miss a regulatory milestone
- **Expert Guidance**: AI-powered answers to compliance questions

Start your free assessment today.
`,
  },
  {
    slug: "nis2-space",
    title: "NIS2 Compliance for Space Operators: Complete Guide",
    h1: "NIS2 Compliance for Space Operators: Complete Guide",
    description:
      "Comprehensive guide to NIS2 Directive compliance for space operators. Covers essential entity classification, Article 21(2) security measures, incident reporting, and implementation strategies.",
    keywords: [
      "NIS2",
      "space cybersecurity",
      "essential entities",
      "cyber compliance",
    ],
    author: "Caelex",
    publishedAt: "2025-01-14",
    readingTime: 22,
    content: `
The NIS2 Directive (EU 2022/2555) represents the most significant expansion of cybersecurity obligations in EU history. For the first time, space operators are explicitly included in the scope, reflecting the sector's critical importance to European society and economy.

## Executive Summary

Space infrastructure has become essential to daily life. Navigation, communications, weather forecasting, and countless other services depend on satellites. The NIS2 Directive recognizes this by classifying space operators as critical infrastructure requiring robust cybersecurity measures.

**Key facts:**
- Space operators included in NIS2 Annex I/II
- Essential entity penalties up to EUR 10M or 2% turnover
- Management personally liable for compliance
- 24-hour incident reporting requirement
- October 2024 member state transposition deadline

## Part 1: Understanding NIS2 for Space

### Why Space is Now Covered

The original NIS Directive (2016) focused on traditional critical infrastructure. NIS2 expands scope to reflect evolving dependencies on digital and space-based services.

Space systems are vulnerable to:
- Command link hijacking
- Telemetry manipulation
- Ground station attacks
- Supply chain compromises
- Jamming and spoofing

### Essential vs Important Entities

NIS2 creates two tiers of obligations:

**Essential Entities (Annex I)**:
- Galileo/EGNOS infrastructure operators
- SATCOM serving critical sectors
- Space services essential to other sectors
- Penalties: EUR 10M or 2% global turnover
- Proactive supervision

**Important Entities (Annex II)**:
- General satellite operators
- Earth observation services
- Space data providers
- Penalties: EUR 7M or 1.4% turnover
- Reactive supervision

### Classification Criteria

Your classification depends on:

1. **Services provided**: Essential services to critical sectors
2. **Customer base**: Government, defense, critical infrastructure
3. **Market position**: Significant market share
4. **Interconnections**: Dependencies created by your services
5. **Size thresholds**: Employee count and turnover

## Part 2: Article 21(2) Security Measures

### Overview of Required Measures

Article 21(2) mandates risk-based cybersecurity measures across ten categories. Each must be addressed with appropriate controls.

### (a) Risk Analysis and Information Security Policies

**Requirements**:
- Comprehensive risk assessment methodology
- Regular risk assessment updates
- Documented security policies
- Policy review and approval processes

**Space-specific considerations**:
- Assess space and ground segments separately
- Consider RF link vulnerabilities
- Address supply chain risks
- Include lifecycle phases

### (b) Incident Handling

**Requirements**:
- Incident detection capabilities
- Response procedures
- Coordination mechanisms
- Post-incident analysis

**Space-specific considerations**:
- Command anomaly detection
- Telemetry anomaly monitoring
- Ground station incident response
- Coordination with SSA providers

### (c) Business Continuity and Crisis Management

**Requirements**:
- Backup management procedures
- Recovery strategies
- Crisis response plans
- Testing and exercises

**Space-specific considerations**:
- Redundant ground stations
- Backup command paths
- Satellite failover procedures
- Long-term degraded operations

### (d) Supply Chain Security

**Requirements**:
- Supplier security assessments
- Contractual security requirements
- Monitoring of supplier compliance
- Third-party risk management

**Space-specific considerations**:
- Component provenance
- Software bill of materials
- Launch service security
- Ground equipment suppliers

### (e) Network and Information System Security

**Requirements**:
- Secure acquisition and development
- Vulnerability handling
- Security testing
- Patch management

**Space-specific considerations**:
- Secure command protocols
- Encrypted telemetry
- Ground network segmentation
- Update integrity verification

### (f) Effectiveness Assessment

**Requirements**:
- Regular security testing
- Penetration testing
- Security audits
- Continuous improvement

**Space-specific considerations**:
- RF link testing
- Command injection testing
- Ground station audits
- Red team exercises

### (g) Cyber Hygiene and Training

**Requirements**:
- Security awareness programs
- Role-based training
- Regular updates
- Phishing resistance

**Space-specific considerations**:
- Mission operations training
- Incident recognition
- Command verification
- Social engineering awareness

### (h) Cryptographic Policies

**Requirements**:
- Encryption for sensitive data
- Key management procedures
- Cryptographic algorithm selection
- Post-quantum preparation

**Space-specific considerations**:
- Link encryption
- Command authentication
- Telemetry protection
- Long-term key management

### (i) Human Resources Security

**Requirements**:
- Background checks
- Access management
- Segregation of duties
- Termination procedures

**Space-specific considerations**:
- Mission-critical role identification
- Command authority controls
- Two-person integrity
- Insider threat mitigation

### (j) Multi-Factor Authentication

**Requirements**:
- MFA for privileged access
- MFA for remote access
- Secure authentication
- Access logging

**Space-specific considerations**:
- Mission operations console access
- Command authorization
- Ground station access
- Administrative interfaces

## Part 3: Incident Reporting

### Reporting Timeline

| Timeline | Requirement |
|----------|-------------|
| 24 hours | Early warning to CSIRT/NCA |
| 72 hours | Incident notification |
| 1 month | Final report |

### What Constitutes an Incident?

For space operators, reportable incidents include:

- Unauthorized access to spacecraft systems
- Command injection or anomalies
- Ground station security breaches
- Data integrity compromises
- Service availability impacts
- Supply chain compromises
- Ransomware affecting operations

### Reporting Content

**Early Warning (24h)**:
- Incident detected
- Initial assessment of severity
- Cross-border impact potential

**Incident Notification (72h)**:
- Detailed incident description
- Impact assessment
- Initial root cause
- Mitigation measures taken

**Final Report (1 month)**:
- Complete root cause analysis
- Full impact assessment
- Lessons learned
- Preventive measures implemented

### Coordination with Other Obligations

Space operators may have multiple reporting obligations:
- NIS2 to national CSIRT/NCA
- EU Space Act to NCA
- Sectoral regulations
- Contractual requirements

Coordinate to ensure consistency and avoid duplication.

## Part 4: Management Liability

### Personal Accountability

A critical change in NIS2 is management body accountability. This means:

- Management must approve security measures
- Management must oversee implementation
- Management must undergo training
- Management can be held personally liable

### Implications for Space Operators

Board members and senior executives should:
- Understand NIS2 obligations
- Review security reports regularly
- Approve security investments
- Participate in training
- Ensure adequate resources

### Demonstrating Compliance

To protect against liability:
- Document all security decisions
- Maintain board minutes
- Keep training records
- Conduct regular reviews
- Engage independent assessments

## Part 5: Implementation Strategy

### Phase 1: Assessment (Weeks 1-4)

1. Determine entity classification
2. Map current security posture
3. Gap analysis against Article 21(2)
4. Risk assessment
5. Resource estimation

### Phase 2: Planning (Weeks 5-8)

1. Prioritize gaps by risk
2. Develop implementation roadmap
3. Assign responsibilities
4. Budget allocation
5. Vendor selection

### Phase 3: Implementation (Months 3-12)

1. Deploy technical controls
2. Develop policies and procedures
3. Implement monitoring
4. Establish incident response
5. Train personnel

### Phase 4: Validation (Months 12-15)

1. Internal audits
2. Penetration testing
3. Tabletop exercises
4. Gap remediation
5. Documentation review

### Phase 5: Operations (Ongoing)

1. Continuous monitoring
2. Regular assessments
3. Incident management
4. Supplier reviews
5. Management reporting

## Key Takeaways

1. Space operators are now explicitly covered by NIS2
2. Management is personally accountable for compliance
3. Article 21(2) requires comprehensive security measures
4. Incident reporting must begin within 24 hours
5. Space systems face unique cybersecurity challenges
6. Supply chain security is particularly critical
7. Continuous compliance is required, not one-time

## How Caelex Helps

Caelex provides automated NIS2 compliance assessment for space operators:

- **Classification**: Determine essential vs important status
- **Gap Analysis**: Assess against all Article 21(2) measures
- **Roadmap**: Prioritized implementation plan
- **Documentation**: Policy and procedure templates
- **Monitoring**: Continuous compliance tracking

Start your free NIS2 assessment today.
`,
  },
  {
    slug: "space-debris-mitigation",
    title: "Space Debris Mitigation: Regulations, Standards & Compliance Guide",
    h1: "Space Debris Mitigation: Regulations, Standards & Compliance",
    description:
      "Complete guide to space debris mitigation compliance. Covers IADC guidelines, ISO 24113, EU Space Act requirements, national laws, and practical implementation strategies.",
    keywords: [
      "space debris",
      "debris mitigation",
      "IADC",
      "ISO 24113",
      "sustainability",
    ],
    author: "Caelex",
    publishedAt: "2025-01-13",
    readingTime: 20,
    content: `
Space debris represents one of the most pressing challenges for the space industry. With over 36,000 tracked objects and millions of smaller fragments, the orbital environment is increasingly congested. This guide covers the regulatory landscape and practical compliance strategies.

## Executive Summary

Space debris mitigation is no longer voluntary best practice—it's increasingly mandated by law. Operators must comply with international guidelines, national requirements, and emerging EU standards to obtain and maintain authorization.

**Key facts:**
- 36,000+ tracked objects in orbit
- Kessler syndrome risk growing
- 5-year disposal rule emerging (vs traditional 25 years)
- Passivation mandatory at end of life
- Design for demise increasingly required

## Part 1: The Debris Challenge

### Current State of the Orbital Environment

The space environment is increasingly crowded:

**Tracked objects (>10cm)**:
- ~36,000 total
- ~6,000 active satellites
- ~30,000 debris objects

**Untracked debris**:
- ~1 million objects 1-10cm
- ~130 million objects 1mm-1cm

### Kessler Syndrome

The Kessler syndrome describes a cascade where collisions create debris that causes more collisions. Key concerns:

- LEO particularly at risk
- Some regions may already be unstable
- Mega-constellations accelerating risk
- Active debris removal may be necessary

### Why Mitigation Matters

For operators, debris mitigation is essential for:

1. **Licensing**: Required for authorization
2. **Insurance**: Affects premiums and availability
3. **Operations**: Collision avoidance burden
4. **Reputation**: Sustainability expectations
5. **Long-term access**: Preserving orbital environment

## Part 2: International Guidelines

### IADC Space Debris Mitigation Guidelines

The Inter-Agency Space Debris Coordination Committee (IADC) comprises 13 space agencies. Its guidelines represent international consensus.

**Core Principles**:

1. **Limit debris release during normal operations**
   - Minimize mission-related objects
   - Secure all components
   - No intentional release

2. **Minimize break-up potential**
   - Passivation at end of life
   - Remove stored energy
   - Safe design

3. **Post-mission disposal**
   - LEO: 25-year lifetime limit
   - GEO: Graveyard orbit (+235km)
   - Controlled re-entry preferred

4. **Prevent on-orbit collisions**
   - Collision avoidance maneuvers
   - Coordination with SSA
   - Probability assessment

### UN COPUOS Long-Term Sustainability Guidelines

The UN Committee on the Peaceful Uses of Outer Space adopted LTS guidelines covering:

- Sharing space debris monitoring information
- Conjunction assessment and collision avoidance
- Registration and tracking
- Debris mitigation implementation
- International cooperation

### ISO 24113

ISO 24113:2019 translates IADC principles into a formal standard with specific, measurable requirements.

**Key requirements**:

- Debris release: <1 object/100 satellite-years
- Mission-related objects: Decay within 25 years
- Casualty risk: <1:10,000 for uncontrolled re-entry
- Disposal reliability: 90% success probability

## Part 3: Regional and National Requirements

### EU Space Act

The proposed EU Space Act incorporates and strengthens debris mitigation requirements:

- **Design phase**: Debris-minimizing design
- **Operations**: Tracking and conjunction assessment
- **End of life**: 5-year disposal for LEO
- **Passivation**: Energy removal mandatory
- **Re-entry**: Casualty risk assessment

### National Laws

#### France (LOS)
- Mandatory debris mitigation plan
- 25-year rule (under review)
- CNES technical standards
- Passivation required

#### United Kingdom
- Debris mitigation plan required
- Assessment by UKSA
- Alignment with IADC/ISO
- Active enforcement

#### Germany (SatDSiG)
- Less debris-focused
- Technical requirements apply
- Environmental considerations

#### United States
- FCC 5-year rule (adopted)
- FAA debris requirements
- ODMSP guidelines
- License conditions

### ESA Zero Debris Policy

ESA has committed to Zero Debris by 2030 for its missions:
- Immediate deorbit capability
- 100% compliance with guidelines
- Active debris removal development
- Leading by example

## Part 4: Practical Compliance

### Design Phase Measures

**Debris Prevention**:
- Captive fasteners
- Tethered components
- Robust structures
- No separation mechanisms (if possible)

**Passivation Design**:
- Propellant depletion capability
- Battery discharge systems
- Pressure vessel venting
- Solar array de-energizing

**Disposal Design**:
- Deorbit propulsion
- Drag augmentation devices
- Design for demise
- Controlled re-entry capability

### Operational Measures

**Tracking and Identification**:
- TLE accuracy requirements
- Operator-provided data
- Retroreflectors (optional)
- EUSST coordination

**Collision Avoidance**:
- Conjunction assessment participation
- Maneuvering capability
- Decision protocols
- Documentation

### End-of-Life Measures

**LEO Disposal**:
- Direct deorbit (preferred)
- Orbit lowering for natural decay
- Drag augmentation
- 5-year maximum (emerging)

**GEO Disposal**:
- Raise to graveyard orbit
- +235km minimum above GEO
- Passivation complete
- Stable final orbit

**Passivation Checklist**:
- Propellant depletion
- Pressurant venting
- Battery discharge
- Momentum wheel deactivation
- Solar array positioning

### Documentation Requirements

Typical debris mitigation documentation:

1. **Debris Mitigation Plan**
   - Design measures
   - Operational procedures
   - End-of-life plan

2. **End-of-Life Plan**
   - Disposal method
   - Timeline
   - Success criteria
   - Contingency

3. **Re-entry Assessment**
   - Casualty probability
   - Demisable analysis
   - Controlled vs uncontrolled

4. **Compliance Demonstration**
   - IADC assessment
   - ISO 24113 compliance
   - Regulatory requirements

## Part 5: The 25-Year to 5-Year Transition

### Current State

The 25-year rule has been the standard since IADC guidelines. However, it's increasingly seen as inadequate:

- Orbital population still growing
- 25 years allows significant collision risk
- Mega-constellations change the math
- More aggressive mitigation needed

### Emerging 5-Year Rule

**FCC (US)**: Adopted 5-year rule for US-licensed satellites in 2024

**EU Space Act**: Proposes 5-year rule for new LEO missions

**ESA**: Zero Debris targets immediate deorbit capability

**ITU**: Discussing alignment with 5-year standard

### Implications for Operators

**New missions**: Plan for 5-year compliance from the start

**Existing missions**: May be grandfathered, but expect pressure

**Design impact**: More propellant, active systems, or drag devices

**Cost impact**: Higher but increasingly necessary

### Compliance Strategies

For 5-year compliance:

1. **Propulsive deorbit**: Sufficient deltaV for direct deorbit
2. **Drag augmentation**: Deploy drag sail or balloon
3. **Low initial altitude**: Natural decay within 5 years
4. **Active debris removal**: Contract for removal

## Part 6: Future Developments

### Active Debris Removal

ADR is transitioning from concept to reality:

- ClearSpace-1 ESA mission
- Commercial ADR services emerging
- Regulatory frameworks developing
- Liability questions resolving

### Space Traffic Management

STM developments include:

- Enhanced tracking capabilities
- Automated conjunction services
- Coordination protocols
- International frameworks

### Design for Demise

Increasing focus on ensuring complete burn-up:

- Material selection
- Component design
- Testing and verification
- Standards development

## Key Takeaways

1. Debris mitigation is mandatory for authorization
2. 5-year disposal rule is emerging standard
3. Passivation required at end of life
4. Documentation essential for licensing
5. Design decisions have long-term implications
6. International guidelines inform national requirements
7. Active compliance monitoring expected

## How Caelex Helps

Caelex provides comprehensive debris mitigation compliance support:

- **Requirements Mapping**: IADC, ISO, national laws
- **Gap Analysis**: Assess current compliance
- **Documentation**: Plan templates and guidance
- **Tracking**: Compliance status monitoring
- **Updates**: Regulatory change alerts

Start your debris mitigation assessment today.
`,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const allGuides = [...guides, ...additionalGuides];

export function getAllGuides(): Guide[] {
  return allGuides.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getGuideBySlug(slug: string): Guide | undefined {
  return allGuides.find((guide) => guide.slug === slug);
}
