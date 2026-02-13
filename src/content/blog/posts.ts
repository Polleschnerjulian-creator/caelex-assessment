// ============================================================================
// BLOG POSTS DATA
// ============================================================================

import { additionalPosts } from "./additional-posts";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  category: string;
  tags: string[];
  readingTime: number;
  featured?: boolean;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "eu-space-act-explained",
    title: "What is the EU Space Act? Everything You Need to Know",
    description:
      "A comprehensive guide to the EU Space Act (COM(2025) 335), covering authorization requirements, compliance timelines, operator obligations, and what it means for satellite operators in Europe.",
    category: "EU Space Act",
    tags: ["EU Space Act", "Space Regulation", "Authorization", "Compliance"],
    author: "Caelex",
    publishedAt: "2025-01-15",
    readingTime: 12,
    featured: true,
    content: `
The EU Space Act represents the most significant regulatory development for European space operators in decades. Published as COM(2025) 335, this proposed regulation establishes a comprehensive framework for authorizing and supervising space activities conducted by operators under EU jurisdiction.

## Why the EU Space Act Matters

Until now, space regulation in Europe has been fragmented across national laws. France has the Loi relative aux opérations spatiales (LOS), Germany has the SatDSiG, and the UK (post-Brexit) operates under the Space Industry Act. This patchwork creates complexity for operators working across borders.

The EU Space Act changes this by creating a harmonized framework that:

- Establishes common authorization requirements across all EU member states
- Creates a single market for space services within the EU
- Implements consistent safety and sustainability standards
- Strengthens Europe's position in the global space economy

## Who Does the EU Space Act Apply To?

The regulation applies to seven categories of space operators:

1. **Spacecraft Operators (SCO)** - Entities operating satellites in orbit
2. **Launch Operators (LO)** - Companies conducting launch services
3. **Launch Site Operators (LSO)** - Spaceport operators within EU territory
4. **In-Space Service Operators (ISOS)** - On-orbit servicing, refueling, debris removal
5. **Collision Avoidance Providers (CAP)** - Space traffic management services
6. **Positional Data Providers (PDP)** - SSA data and tracking services
7. **Third Country Operators (TCO)** - Non-EU operators serving EU customers

## Key Requirements Under the EU Space Act

### Authorization (Articles 5-9)

Every operator must obtain authorization from a National Competent Authority (NCA) before commencing space activities. The authorization process assesses:

- Technical capability and expertise
- Financial capacity and insurance coverage
- Safety and sustainability measures
- Debris mitigation plans
- Cybersecurity provisions

### Safety and Sustainability (Articles 10-13)

The Act introduces binding requirements for:

- **Debris Mitigation**: Compliance with IADC guidelines and ISO 24113
- **End-of-Life Disposal**: Deorbit within 5 years for LEO satellites
- **Passivation**: Removal of stored energy sources at end of mission
- **Collision Avoidance**: Active maneuvering capability requirements

### Cybersecurity (Article 16)

Space operators classified as essential entities under NIS2 must implement:

- Risk management measures per Article 21(2) NIS2
- Incident reporting within 24 hours (early warning)
- Supply chain security measures
- Regular security assessments

### Supervision (Articles 17-20)

NCAs will conduct ongoing supervision including:

- Regular reporting requirements
- Inspection rights
- Power to suspend or revoke authorizations
- Coordination with EUSPA for EU-wide matters

## Timeline and Key Dates

The EU Space Act follows this indicative timeline:

- **2025**: Regulation proposed and legislative process begins
- **2026-2027**: Expected adoption by European Parliament and Council
- **2028**: Entry into force (20 days after publication)
- **2030**: Full compliance required for existing operators

Operators should begin preparing now, as authorization processes can take 6-12 months.

## How Caelex Helps

Caelex provides comprehensive EU Space Act compliance support through:

- **Automated Assessment**: Determine your operator category and applicable requirements in minutes
- **Compliance Tracking**: Monitor your progress across all 119 articles
- **Document Generation**: Auto-generate authorization applications and compliance reports
- **Deadline Management**: Never miss a regulatory milestone

## Key Takeaways

1. The EU Space Act creates a harmonized framework replacing fragmented national laws
2. All operators under EU jurisdiction need authorization from their NCA
3. Cybersecurity requirements align with NIS2 for essential entities
4. Debris mitigation and sustainability are mandatory, not optional
5. The 2030 deadline means preparation should start now

Start your free compliance assessment today to understand how the EU Space Act affects your operations.
`,
  },
  {
    slug: "nis2-space-operators",
    title: "How NIS2 Affects Space Operators: Complete Guide",
    description:
      "Understanding NIS2 cybersecurity requirements for space operators, including essential entity classification, security measures, incident reporting, and compliance obligations.",
    category: "NIS2",
    tags: ["NIS2", "Cybersecurity", "Space Security", "Essential Entities"],
    author: "Caelex",
    publishedAt: "2025-01-14",
    readingTime: 10,
    featured: true,
    content: `
The NIS2 Directive (EU 2022/2555) represents a significant expansion of cybersecurity obligations for critical infrastructure operators — including, for the first time, the space sector. Space operators providing essential services are now subject to comprehensive security requirements.

## Why Space is Now Covered by NIS2

Space infrastructure has become critical to European society. GPS/Galileo enables navigation, weather satellites support agriculture and disaster response, and satellite communications provide connectivity to remote areas. A cyber attack on space systems could have cascading effects across multiple sectors.

The original NIS Directive (2016) did not explicitly cover space. NIS2 changes this by including space operators in its scope under Annex I (essential entities) and Annex II (important entities).

## Essential vs Important Entities

Space operators may be classified as:

### Essential Entities (Annex I)
- Operators of Galileo and EGNOS infrastructure
- Satellite communication providers supporting critical services
- Space-based services essential to other critical sectors

Essential entities face:
- Maximum penalties: EUR 10 million or 2% of global turnover
- Proactive supervision by authorities
- Regular audits and inspections

### Important Entities (Annex II)
- General satellite operators
- Earth observation service providers
- Space data service companies

Important entities face:
- Maximum penalties: EUR 7 million or 1.4% of global turnover
- Reactive supervision (post-incident)
- Self-assessment requirements

## Security Measures Under Article 21(2)

All covered entities must implement measures addressing:

### (a) Risk Analysis and Security Policies
- Comprehensive risk assessment for space and ground segments
- Documented information security policies
- Regular review and updates

### (b) Incident Handling
- Incident detection and response procedures
- Coordination with national CSIRTs
- Post-incident analysis and lessons learned

### (c) Business Continuity
- Backup systems for mission-critical functions
- Crisis management procedures
- Recovery time objectives

### (d) Supply Chain Security
- Assessment of supplier security
- Contractual security requirements
- Third-party risk management

### (e) Network and System Security
- Secure development lifecycle
- Vulnerability management
- Patch management procedures

### (f) Effectiveness Assessment
- Regular security testing
- Penetration testing
- Security audits

### (g) Cyber Hygiene and Training
- Security awareness training
- Role-based access controls
- Regular training updates

### (h) Cryptography
- Encryption for data in transit and at rest
- Key management procedures
- Quantum-safe cryptography roadmap

### (i) Human Resources Security
- Background checks where appropriate
- Access management procedures
- Offboarding processes

### (j) Multi-Factor Authentication
- MFA for privileged access
- Secure communication channels
- Access logging and monitoring

## Incident Reporting Requirements

NIS2 establishes strict incident reporting timelines:

| Timeline | Requirement |
|----------|-------------|
| 24 hours | Early warning to CSIRT/authority |
| 72 hours | Incident notification with assessment |
| 1 month | Final report with root cause analysis |

For space operators, incidents include:
- Unauthorized access to spacecraft systems
- Command injection attempts
- Ground station breaches
- Data integrity compromises
- Service availability impacts

## Management Liability

A critical change in NIS2 is management body accountability. Senior management must:

- Approve cybersecurity measures
- Oversee implementation
- Undergo cybersecurity training
- Be held personally liable for non-compliance

This represents a significant shift from treating cybersecurity as purely an IT matter.

## Implementation Timeline

- **January 2023**: NIS2 entered into force
- **October 2024**: Member state transposition deadline
- **2025**: Enforcement begins
- **Ongoing**: Continuous compliance required

## How to Prepare

1. **Classification**: Determine if you're essential or important
2. **Gap Analysis**: Assess current security against Article 21(2)
3. **Governance**: Establish management oversight
4. **Supply Chain**: Review supplier security
5. **Incident Response**: Implement reporting procedures
6. **Training**: Ensure staff awareness

## Key Takeaways

1. Space operators are now explicitly covered by EU cybersecurity law
2. Essential entity classification brings highest obligations and penalties
3. Article 21(2) requires comprehensive security measures
4. Management is personally liable for compliance
5. Incident reporting must begin within 24 hours

Caelex provides automated NIS2 compliance assessment for space operators. Start your assessment to identify gaps and build your compliance roadmap.
`,
  },
  {
    slug: "space-debris-iadc-vs-iso",
    title: "IADC Guidelines vs ISO 24113: Space Debris Standards Compared",
    description:
      "A detailed comparison of IADC Space Debris Mitigation Guidelines and ISO 24113 for satellite operators. Understand the differences, requirements, and how to achieve compliance.",
    category: "Debris Mitigation",
    tags: ["Space Debris", "IADC", "ISO 24113", "Sustainability"],
    author: "Caelex",
    publishedAt: "2025-01-13",
    readingTime: 9,
    content: `
Space debris mitigation is no longer optional. With over 36,000 tracked objects in orbit and millions of smaller fragments, operators face both regulatory requirements and operational risks. Two frameworks dominate the landscape: the IADC Guidelines and ISO 24113.

## Understanding the IADC Guidelines

The Inter-Agency Space Debris Coordination Committee (IADC) published its Space Debris Mitigation Guidelines in 2002 (revised 2007, 2020). As a consensus document among 13 space agencies, the IADC Guidelines represent international best practice.

### Key IADC Requirements

**Limitation of Debris Released During Normal Operations**
- Minimize mission-related objects
- No intentional break-ups
- Secure all components against release

**Minimization of Break-Up Potential**
- Passivation at end of mission
- Removal of stored energy (propellant, batteries, pressure vessels)
- Safe design against accidental break-up

**Post-Mission Disposal**
- LEO: Deorbit within 25 years (IADC) / 5 years (new proposals)
- GEO: Raise to graveyard orbit 235+ km above GEO
- MEO: Case-by-case assessment

**Prevention of On-Orbit Collisions**
- Collision avoidance maneuvers
- Coordination with SSA providers
- Assessment of collision probability

## Understanding ISO 24113

ISO 24113:2019 "Space Systems — Space Debris Mitigation Requirements" translates IADC concepts into a formal standard suitable for contractual and regulatory use.

### Key ISO 24113 Requirements

The standard defines specific, measurable requirements:

**Debris Release**
- Maximum 1 object > 1mm released per 100 satellite-years
- Mission-related objects must decay within 25 years

**Casualty Risk**
- Ground casualty probability < 1:10,000 for uncontrolled re-entry
- Controlled re-entry preferred where feasible

**Post-Mission Disposal Reliability**
- 90% probability of successful disposal for LEO
- Consider failure modes in disposal planning

**Documentation**
- Debris mitigation plan required
- End-of-life plan required
- Disposal success reporting

## IADC vs ISO 24113: Key Differences

| Aspect | IADC Guidelines | ISO 24113 |
|--------|-----------------|-----------|
| **Nature** | Guidelines (voluntary) | Standard (contractual) |
| **Specificity** | General principles | Detailed requirements |
| **Metrics** | Qualitative guidance | Quantitative thresholds |
| **Enforcement** | Agency adoption | Contract/regulation |
| **Updates** | Committee consensus | ISO revision process |

## Regulatory Landscape

### EU Space Act
References both IADC and ISO 24113. Proposes reducing LEO disposal timeline to 5 years for new missions.

### National Laws
- **France (LOS)**: References IADC, requires 25-year rule
- **UK (Space Industry Act)**: Requires debris mitigation plan
- **Germany (SatDSiG)**: Less focused on debris (Earth observation focus)

### ESA
Zero Debris Policy by 2030 — goes beyond both IADC and ISO 24113.

## Which Standard Should You Follow?

The answer depends on your situation:

**Follow IADC if:**
- Working with government agencies
- Early mission planning phase
- Need flexibility in approach

**Follow ISO 24113 if:**
- Commercial contracts require it
- Seeking regulatory approval in strict jurisdictions
- Want clear, measurable compliance criteria

**Best Practice:**
Follow ISO 24113 as your baseline (it's more specific) while monitoring IADC updates for emerging best practices.

## 5-Year vs 25-Year Debate

A major change is underway. The traditional 25-year post-mission lifetime is increasingly seen as inadequate. New proposals include:

- **FCC (US)**: 5-year rule adopted for US-licensed satellites
- **EU Space Act**: 5-year rule proposed for LEO
- **ESA Zero Debris**: Immediate deorbit capability encouraged

Operators should plan for the 5-year timeline, even if 25 years is currently required.

## Compliance Checklist

1. Design for debris minimization (no release)
2. Include passivation capability
3. Plan end-of-life disposal (aim for 5 years)
4. Calculate casualty risk for re-entry
5. Document debris mitigation plan
6. Report disposal success

## Key Takeaways

1. IADC provides principles; ISO 24113 provides specifications
2. Both are increasingly referenced in regulations
3. The 25-year rule is becoming 5 years — plan accordingly
4. Passivation and disposal reliability are critical
5. Documentation is essential for licensing

Caelex automatically assesses your debris mitigation compliance against both IADC and ISO 24113 standards.
`,
  },
  {
    slug: "satellite-insurance-requirements-europe",
    title:
      "Satellite Insurance Requirements in Europe: Country-by-Country Guide",
    description:
      "Compare third-party liability insurance requirements for satellite operators across European jurisdictions. Understand minimum coverage amounts, policy types, and compliance strategies.",
    category: "Insurance",
    tags: ["Insurance", "Liability", "TPL", "Europe"],
    author: "Caelex",
    publishedAt: "2025-01-12",
    readingTime: 11,
    content: `
Third-party liability (TPL) insurance is mandatory for satellite operators in virtually every jurisdiction. However, requirements vary significantly across Europe. This guide compares insurance obligations to help operators plan their coverage strategy.

## Why Insurance Matters

The 1972 Liability Convention establishes that launching states bear international responsibility for damage caused by space objects. National space laws transfer this liability to operators through insurance requirements. Without adequate insurance, you cannot obtain a license.

## Country-by-Country Comparison

### France

**Requirement**: EUR 60 million (launch), EUR 20 million (in-orbit)

France has the most developed insurance framework through the LOS 2008. Key features:
- Mandatory minimum coverage levels
- State guarantee mechanism covers excess liability
- Government bears absolute liability above coverage caps
- Annual insurance certificate required

### Germany

**Requirement**: EUR 60 million minimum (case-by-case)

The SatDSiG focuses on Earth observation satellites but requires:
- Proof of third-party liability coverage
- Amount determined by risk assessment
- Coverage for data-related liabilities (unique to Germany)

### United Kingdom

**Requirement**: Determined by UKSA based on risk assessment

Post-Brexit, the UK Space Industry Act provides flexibility:
- No fixed minimum amount
- Risk-based determination by UKSA
- Government may provide indemnification for excess liability
- Policy must cover the full mission duration

### Luxembourg

**Requirement**: Case-by-case, typically EUR 20-60 million

Luxembourg offers a competitive insurance environment:
- Flexible requirements adapted to mission profile
- Government support for space sector
- Typically lower minimums for small satellites

### Netherlands

**Requirement**: EUR 65 million minimum

The Space Activities Act requires:
- Insurance for full mission lifecycle
- State guarantee for claims above coverage
- Annual proof of coverage

### Belgium

**Requirement**: Risk-based, minimum varies

BELSPO determines requirements through:
- Technical assessment of mission
- Liability exposure calculation
- State guarantee provisions available

### Austria

**Requirement**: Case-by-case determination

The Austrian approach:
- Flexible amounts based on mission type
- Lower requirements for research/academic missions
- Full commercial rates for commercial operators

## Insurance Types

### Third-Party Liability (TPL)
Covers damage to third parties from space operations. Required by all jurisdictions.

### Launch Insurance
Covers the launch phase, typically the highest-risk period. Usually separate from TPL.

### In-Orbit Insurance
Covers operational phase. May include first-party coverage for satellite damage.

### Re-Entry Insurance
Covers liability during controlled or uncontrolled re-entry. Increasingly important.

## State Guarantee Mechanisms

Several countries provide government backing for claims exceeding insurance coverage:

| Country | Mechanism | Cap |
|---------|-----------|-----|
| France | State guarantee | Unlimited (negotiated) |
| Netherlands | State guarantee | Defined by treaty |
| UK | Government indemnification | Case-by-case |
| Belgium | State backing | Case-by-case |

This reduces insurance costs by capping operator exposure.

## Practical Considerations

### Coverage Period
- Must cover entire mission lifecycle
- Renewal required if mission extends
- Some policies have aggregate limits

### Policy Language
- English generally accepted
- Some NCAs require local language summary
- Policy must name the state as beneficiary

### Proof of Insurance
- Certificate of Insurance required for license
- Annual renewal proof required
- 30-day notice of cancellation to NCA

### Multi-Jurisdictional Operations
- May need coverage satisfying multiple requirements
- Single policy can often meet multiple jurisdictions
- Coordinate with insurer on documentation

## Cost Factors

Insurance premiums depend on:
- Orbital regime (LEO vs GEO)
- Mission duration
- Satellite mass
- Operator track record
- Re-entry casualty risk
- Launch vehicle reliability

Typical ranges:
- Small LEO satellites: EUR 50,000-150,000/year
- GEO communications: EUR 500,000-2,000,000/year
- Launch campaigns: 5-15% of launch cost

## Key Takeaways

1. Insurance is mandatory in all European jurisdictions
2. Minimums range from EUR 20-65 million depending on country and mission
3. State guarantee mechanisms reduce operator exposure
4. Coverage must span the entire mission lifecycle
5. Multi-jurisdictional operations require careful coordination

Caelex helps you understand insurance requirements across all jurisdictions and generates compliance documentation for your license applications.
`,
  },
  {
    slug: "what-is-a-space-operator",
    title: "What Qualifies as a Space Operator Under EU Law?",
    description:
      "Defining 'space operator' under the EU Space Act and NIS2 Directive. Understand the seven operator categories and determine your classification for compliance purposes.",
    category: "EU Space Act",
    tags: ["Space Operator", "Classification", "EU Space Act", "Compliance"],
    author: "Caelex",
    publishedAt: "2025-01-10",
    readingTime: 8,
    content: `
One of the first questions for EU Space Act compliance is: "Am I a space operator?" The answer determines which regulations apply to you, which NCA you report to, and what obligations you face. This guide explains the operator categories.

## The Seven Operator Types

The EU Space Act defines seven categories of space operators:

### 1. Spacecraft Operator (SCO)

**Definition**: An entity that owns, operates, or controls a spacecraft in orbit or suborbital space.

**Includes**:
- Satellite constellation operators
- Single satellite operators
- Hosted payload operators
- Suborbital vehicle operators (when in space)

**Key Obligations**:
- Authorization before launch
- Registration and tracking
- Debris mitigation
- End-of-life disposal

### 2. Launch Operator (LO)

**Definition**: An entity that conducts launch activities to place objects in space.

**Includes**:
- Commercial launch service providers
- Government launch agencies
- Rideshare aggregators (if conducting launch)

**Key Obligations**:
- Launch license from NCA
- Range safety compliance
- Insurance coverage
- Environmental assessments

### 3. Launch Site Operator (LSO)

**Definition**: An entity that operates a facility from which space launches are conducted.

**Includes**:
- Spaceport operators
- Launch range operators
- Mobile launch platform operators

**Key Obligations**:
- Site license
- Safety perimeter management
- Environmental compliance
- Emergency response capability

### 4. In-Space Service Operator (ISOS)

**Definition**: An entity that provides services to spacecraft in orbit.

**Includes**:
- On-orbit servicing providers
- Satellite refueling services
- Active debris removal operators
- Life extension service providers

**Key Obligations**:
- Authorization for proximity operations
- Coordination with target operators
- Debris mitigation for service vehicle
- Enhanced liability considerations

### 5. Collision Avoidance Provider (CAP)

**Definition**: An entity that provides collision warning and avoidance services.

**Includes**:
- Commercial SSA providers
- Conjunction assessment services
- Maneuver planning services

**Key Obligations**:
- Data quality standards
- Service availability requirements
- Coordination with SST network
- Liability for service failures

### 6. Positional Data Provider (PDP)

**Definition**: An entity that provides space object tracking and positional data.

**Includes**:
- Ground-based tracking networks
- Optical observation services
- Radar tracking providers
- Orbit determination services

**Key Obligations**:
- Data accuracy standards
- Availability requirements
- Integration with EUSST
- Security measures for data

### 7. Third Country Operator (TCO)

**Definition**: A non-EU entity conducting space activities affecting EU interests.

**Includes**:
- Non-EU operators serving EU customers
- Non-EU satellites in EU spectrum filings
- Non-EU operators with EU subsidiaries

**Key Obligations**:
- Compliance with EU standards when serving EU market
- Registration requirements
- Potentially NIS2 obligations if serving critical sectors

## How to Determine Your Category

Many operators fall into multiple categories. A launch service provider might be:
- LO (conducting launches)
- SCO (operating upper stages)
- LSO (operating launch facility)

The EU Space Act requires authorization for each applicable category. Your primary category is typically the main activity you conduct.

## Jurisdictional Determination

Your "home" NCA depends on:

1. **Place of Incorporation**: Where your company is legally established
2. **Principal Place of Business**: Where key decisions are made
3. **Launch Location**: For launches from EU territory
4. **EU Nexus**: Significant EU activities or customers

## Why Classification Matters

Your operator category determines:
- Which articles of the EU Space Act apply
- Insurance requirements
- Reporting obligations
- Supervision intensity
- Applicable national laws

Incorrect classification can lead to:
- Incomplete compliance
- Licensing delays
- Unexpected obligations
- Enforcement actions

## Key Takeaways

1. The EU Space Act defines seven operator categories
2. Many operators fall into multiple categories
3. Each category has specific obligations
4. Third country operators may be subject to EU rules
5. Classification affects all downstream compliance

Use Caelex's free assessment to determine your operator classification and applicable requirements.
`,
  },
  {
    slug: "eu-space-act-timeline",
    title: "EU Space Act Timeline: Key Dates and Deadlines for Operators",
    description:
      "Complete timeline of EU Space Act implementation. From proposal to enforcement, understand key milestones and when to take action for compliance.",
    category: "EU Space Act",
    tags: ["EU Space Act", "Timeline", "Deadlines", "Compliance"],
    author: "Caelex",
    publishedAt: "2025-01-08",
    readingTime: 6,
    content: `
Understanding the EU Space Act timeline is crucial for compliance planning. This guide outlines key milestones from proposal to full enforcement.

## Legislative Timeline

### 2024: Preparation Phase

**Q4 2024**:
- Final consultation rounds
- Impact assessment completion
- Stakeholder feedback period

### 2025: Proposal and Deliberation

**Q1 2025**:
- Formal proposal publication (COM(2025) 335)
- European Parliament first reading begins

**Q2-Q3 2025**:
- Committee review and amendments
- Council position development

**Q4 2025**:
- Trilogue negotiations begin
- Key provisions finalized

### 2026: Adoption

**Q1-Q2 2026**:
- European Parliament final vote
- Council adoption

**Q3 2026**:
- Publication in Official Journal
- Entry into force (20 days after publication)

### 2027-2030: Implementation

**2027**:
- Member state NCA designation
- Implementing acts development
- Guidance publication

**2028**:
- Transition period begins
- New operators must comply immediately

**2029**:
- Existing operator notification requirement
- Compliance planning deadline

**2030**:
- Full compliance required for all operators
- Enforcement begins

## Operator Action Timeline

### Now (Pre-Adoption)

**What to do**:
- Assess your operator category
- Review current compliance status
- Identify gaps against draft requirements
- Begin planning authorization applications

### Upon Entry into Force

**Within 6 months**:
- Register with relevant NCA
- Submit preliminary notifications
- Begin formal compliance planning

### Transition Period

**18 months before compliance deadline**:
- Submit authorization applications
- Implement cybersecurity measures
- Complete debris mitigation planning

**12 months before**:
- Insurance arrangements finalized
- Documentation complete
- Staff training completed

**6 months before**:
- Authorization expected
- Final compliance review
- Reporting systems in place

## Key Deadlines Summary

| Date | Milestone | Action Required |
|------|-----------|-----------------|
| Q1 2025 | Proposal published | Begin assessment |
| Q3 2026 | Entry into force | NCA registration |
| 2028 | New operator compliance | Authorization required |
| 2030 | Full compliance | All operators authorized |

## Risk of Delay

Don't wait for final adoption. Authorization processes typically take:
- 6-12 months for straightforward cases
- 12-18 months for complex missions
- 18-24 months if issues arise

Starting early provides buffer for:
- NCA capacity constraints
- Documentation revisions
- Technical assessments
- Insurance arrangements

## Key Takeaways

1. Full compliance required by 2030
2. Authorization processes take 6-18 months
3. Early preparation is strongly advised
4. New operators face immediate compliance upon entry into force
5. NCA capacity may become constrained near deadline

Begin your compliance journey now with Caelex's automated assessment.
`,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getAllPosts(): BlogPost[] {
  const allPosts = [...blogPosts, ...additionalPosts];
  return allPosts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  const allPosts = [...blogPosts, ...additionalPosts];
  return allPosts.find((post) => post.slug === slug);
}

export function getFeaturedPosts(): BlogPost[] {
  const allPosts = [...blogPosts, ...additionalPosts];
  return allPosts.filter((post) => post.featured);
}

export function getPostsByCategory(category: string): BlogPost[] {
  const allPosts = [...blogPosts, ...additionalPosts];
  return allPosts.filter(
    (post) => post.category.toLowerCase() === category.toLowerCase(),
  );
}

export function getAllCategories(): string[] {
  const allPosts = [...blogPosts, ...additionalPosts];
  return [...new Set(allPosts.map((post) => post.category))];
}

export function getRelatedPosts(
  currentSlug: string,
  limit: number = 3,
): BlogPost[] {
  const allPosts = [...blogPosts, ...additionalPosts];
  const currentPost = getPostBySlug(currentSlug);
  if (!currentPost) return [];

  return allPosts
    .filter(
      (post) =>
        post.slug !== currentSlug &&
        (post.category === currentPost.category ||
          post.tags.some((tag) => currentPost.tags.includes(tag))),
    )
    .slice(0, limit);
}
