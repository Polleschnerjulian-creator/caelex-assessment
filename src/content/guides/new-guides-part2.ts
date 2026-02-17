// ============================================================================
// NEW GUIDES PART 2 — Spectrum, Supervision, Registration
// ============================================================================

import { Guide } from "./guides";

export const newGuidesPart2: Guide[] = [
  {
    slug: "spectrum-management",
    title: "Spectrum Management & ITU Compliance for Space Operators",
    h1: "Spectrum Management & ITU Compliance for Space Operators",
    description:
      "Complete guide to spectrum management and ITU compliance for satellite operators. Covers frequency coordination, orbital slot allocation, API/CR/C filings, interference rules, European spectrum authorities, and EU Space Act Art. 15 provisions.",
    keywords: [
      "spectrum management",
      "ITU space",
      "frequency coordination",
      "satellite spectrum",
    ],
    author: "Caelex",
    publishedAt: "2025-02-09",
    readingTime: 22,
    content: `
Radio frequency spectrum is the lifeblood of every satellite mission. Without properly coordinated and registered frequencies, a spacecraft cannot lawfully communicate with the ground, relay data to users, or perform its intended function. The International Telecommunication Union (ITU) governs the global framework for spectrum allocation and orbital slot coordination, and European operators must navigate both ITU processes and national spectrum regulations to secure their rights. This guide provides a comprehensive walkthrough of the regulatory landscape, filing procedures, coordination obligations, and practical strategies for successful spectrum management.

## Executive Summary

Spectrum management for space operators involves a layered regulatory environment spanning international treaty obligations, ITU Radio Regulations, regional coordination, and national licensing. Getting it wrong can mean years of delay, loss of orbital filing priority, harmful interference disputes, or even inability to operate.

**Key facts:**
- ITU Radio Regulations are a binding international treaty
- Advance Publication Information (API) must be filed 2-7 years before launch
- Coordination requests (CR/C) trigger bilateral negotiation with affected administrations
- GEO orbital slots are a finite, contested resource governed by the ITU
- NGSO systems must coordinate with GSO networks to protect incumbent services
- EU Space Act Art. 15 introduces new spectrum-related obligations for European operators
- National spectrum authorities issue the actual licenses that permit transmission
- Filing costs can range from tens of thousands to several million euros over a mission lifetime

## Part 1: The ITU Radio Regulations Framework

### What the ITU Does

The International Telecommunication Union, a specialized agency of the United Nations, maintains the Radio Regulations (RR) — an international treaty that governs the use of the radio-frequency spectrum and satellite orbital positions. The Radio Regulations are updated every 3-4 years at World Radiocommunication Conferences (WRCs), with the most recent being WRC-23.

For space operators, the ITU serves three critical functions:

1. **Frequency allocation**: Defining which frequency bands are available for which services (e.g., Fixed-Satellite Service, Mobile-Satellite Service, Earth Exploration-Satellite Service)
2. **Coordination**: Managing the process by which new satellite networks avoid harmful interference with existing or planned systems
3. **Registration**: Recording satellite network filings in the Master International Frequency Register (MIFR), which provides international recognition and protection

### ITU Organizational Structure

The ITU Radiocommunication Sector (ITU-R) handles all spectrum and orbit matters:

- **Radiocommunication Bureau (BR)**: Processes filings, conducts examinations, maintains the MIFR
- **Radio Regulations Board (RRB)**: Adjudicates disputes and interprets regulations
- **World Radiocommunication Conference (WRC)**: Updates the Radio Regulations
- **Study Groups**: Develop technical recommendations (e.g., SG 4 for satellite services)

### Key Regulatory Concepts

**Table of Frequency Allocations (Article 5)**

The cornerstone of the Radio Regulations is the Table of Frequency Allocations, which divides the usable spectrum (9 kHz to 3000 GHz) among approximately 40 radiocommunication services across three ITU Regions. Satellite operators must select frequencies from bands allocated to the relevant satellite service with appropriate footnotes and conditions.

**Primary vs Secondary Allocation**

- **Primary services**: Have full protection rights; can claim interference protection from other primary services through coordination
- **Secondary services**: Must not cause harmful interference to primary services and cannot claim protection from them

**Planned vs Unplanned Bands**

- **Planned bands** (Appendices 30/30A/30B): GEO orbital positions and frequencies are pre-assigned to countries. Operators access these through their national administration's allotment.
- **Unplanned bands**: First-come, first-served through the coordination process under Article 9

## Part 2: The Frequency Coordination Process

### Overview of the Filing Lifecycle

The ITU coordination process for a new satellite network follows a structured sequence. Missing deadlines or procedural steps can result in loss of filing priority or cancellation of the filing entirely.

**Step 1: Advance Publication Information (API)**

The API is the first formal notification to the ITU and the global community that a new satellite network is being planned. It contains basic parameters:

- Satellite network name
- Orbital position (GEO) or orbital parameters (NGSO)
- Frequency bands
- Service area coverage
- Anticipated date of bringing into use

**Filing window**: The API must be received by the ITU Radiocommunication Bureau between 2 and 7 years before the planned date of bringing the network into use. Filing earlier within this window establishes earlier priority.

**Step 2: Coordination Request (CR/C)**

After the API has been published (typically in the BR International Frequency Information Circular, or BR IFIC), the filing administration submits a Coordination Request under Article 9 of the Radio Regulations. This triggers the formal coordination phase.

The CR/C contains detailed technical characteristics:

- Satellite antenna patterns and gain contours
- EIRP and power spectral density
- Channelization plans
- Earth station parameters
- Link budgets

**Key deadlines**: The CR/C must be submitted within the regulatory deadline (varies by service and band, typically 2 years after API receipt). The BR examines the filing and identifies potentially affected administrations within 4 months.

**Step 3: Bilateral Coordination**

Once the BR identifies affected administrations, the filing administration must seek agreement from each one. This is the most time-consuming phase and can take years for contested orbital positions or congested frequency bands.

Coordination involves:

- Technical analysis of interference scenarios
- Sharing of detailed system parameters
- Negotiation of operational constraints or power limits
- Exchange of coordination agreements (formal letters between administrations)

**Step 4: Notification and Recording**

After successful coordination (or after due diligence if coordination proves impossible), the administration submits a Notification filing to the BR. The BR examines the notification for conformity with the Radio Regulations and the Table of Frequency Allocations. If favorable, the frequency assignments are recorded in the Master International Frequency Register (MIFR).

**Step 5: Bringing Into Use**

The satellite network must be brought into use by the notified date. The ITU requires evidence that the satellite is actually operating on the filed frequencies from the filed orbital position. Failure to bring into use by the deadline results in cancellation of the filing.

### Timeline Summary

| Phase | Typical Duration | Key Deadline |
|-------|-----------------|--------------|
| API filing | Day 0 | 2-7 years before use |
| API publication | 3-6 months after filing | — |
| CR/C submission | Within regulatory period | Varies by band |
| BR examination | 4 months | — |
| Bilateral coordination | 6 months - 5 years | Before notification |
| Notification | After coordination | Before bringing into use |
| BR examination of notification | 4 months | — |
| Recording in MIFR | After favorable finding | — |
| Bringing into use | By notified date | Mandatory |

### Cost Considerations

Spectrum filing and coordination is not cheap. Operators should budget for:

- **ITU cost recovery fees**: The ITU charges fees for processing filings. API fees are modest (hundreds of CHF), but CR/C and notification fees can reach tens of thousands of CHF depending on the number of frequency assignments.
- **Consultancy fees**: Most operators engage specialized spectrum engineering firms to prepare filings, conduct interference analyses, and manage coordination. Costs range from EUR 50,000 to EUR 500,000+ depending on complexity.
- **Administration fees**: Some national administrations charge additional fees for filing on behalf of operators.
- **Legal fees**: Disputes or complex coordination scenarios may require legal support.
- **Total lifecycle cost**: For a GEO satellite with multiple frequency bands, total spectrum-related costs over the filing lifecycle can exceed EUR 1 million.

## Part 3: Orbital Slot Allocation

### GEO Orbital Slots

Geostationary orbital slots are among the most valuable and contested resources in space. A GEO satellite occupies a fixed position relative to the Earth's surface, making it ideal for broadcasting, telecommunications, and meteorological observation. However, the number of usable positions is physically limited by spacing requirements to avoid interference between adjacent satellites.

**Planned bands (Appendices 30/30A/30B)**

For certain frequency bands (notably BSS and FSS downlinks), the ITU has pre-planned orbital positions and frequency assignments for every ITU member country. Countries access their national allotment through a modification procedure. This ensures equitable access but limits flexibility.

**Unplanned bands**

For most FSS and other service bands, orbital positions are obtained on a first-come, first-served basis through the Article 9 coordination process. Priority is established by the date of receipt of the API filing at the BR.

**Practical considerations for GEO operators:**
- Securing a desirable orbital position requires filing years in advance
- "Paper satellites" (filings without genuine satellite programs) are a persistent problem; the ITU has introduced due diligence requirements to combat this
- Coordination with adjacent satellites is essential and can be technically complex
- Operators may need to accept power limitations or frequency restrictions to reach agreement

### Non-GEO Orbital Slots

For non-geostationary systems (LEO, MEO, HEO), there is no concept of a fixed orbital slot. Instead, NGSO systems are characterized by their orbital parameters (altitude, inclination, number of satellites, phasing).

**Key regulatory considerations for NGSO:**
- NGSO systems in many bands must not cause unacceptable interference to GSO networks (Article 22)
- Large NGSO constellations face significant coordination burden due to the number of potentially affected GSO systems
- The milestone-based deployment schedule (introduced at WRC-19 and refined at WRC-23) requires NGSO operators to deploy a percentage of their constellation by specific deadlines or lose part of their filing
- Sharing between multiple NGSO systems in the same band is governed by Article 9.12 and associated regulatory provisions

### NGSO Milestone Requirements

To prevent spectrum warehousing, the ITU imposes deployment milestones for NGSO systems:

| Milestone | Requirement |
|-----------|------------|
| M1 (T+2 years) | 10% of constellation deployed |
| M2 (T+5 years) | 50% of constellation deployed |
| M3 (T+7 years) | 100% of constellation deployed |

Failure to meet milestones results in proportional reduction of the filing. These milestones apply from the end of the regulatory period for bringing into use.

## Part 4: Harmful Interference Rules

### Definition of Harmful Interference

The Radio Regulations define harmful interference as interference that "endangers the functioning of a radionavigation service or of other safety services or seriously degrades, obstructs or repeatedly interrupts a radiocommunication service" (RR No. 1.169).

### Interference Protection Hierarchy

The interference protection framework follows a clear hierarchy:

1. **Safety services** (radionavigation, distress) receive the highest protection
2. **Primary services** are protected from other primary services through coordination
3. **Secondary services** must protect primary services and cannot claim protection
4. **NGSO must protect GSO** in many shared bands (Article 22 limits)

### Resolving Interference

When harmful interference occurs:

1. **Identification**: The affected administration identifies the source of interference
2. **Notification**: The affected administration notifies the interfering administration through the BR
3. **Consultation**: Administrations consult to find a solution
4. **Resolution**: Technical or operational measures are implemented
5. **Escalation**: If unresolved, the matter may be referred to the RRB

### Practical Interference Mitigation

Operators should proactively manage interference risk through:

- Careful frequency planning to avoid congested bands
- Antenna sidelobe management and shaping
- Power control and dynamic power adjustment
- Geographic avoidance of sensitive areas
- Coordination agreements with specific technical constraints
- Real-time monitoring and rapid response capabilities

## Part 5: National Spectrum Authorities in Europe

### Role of National Administrations

While the ITU sets the international framework, national spectrum authorities are the entities that actually file at the ITU (on behalf of their operators), issue spectrum licenses, and enforce compliance. European operators must work through their national administration for all ITU filings.

### Key European Spectrum Authorities

| Country | Authority | Key Responsibilities |
|---------|-----------|---------------------|
| France | ANFR (Agence nationale des frequences) | ITU filings, national spectrum management, interference resolution |
| Germany | BNetzA (Bundesnetzagentur) | Spectrum licensing, ITU coordination, market surveillance |
| United Kingdom | Ofcom | Satellite licensing, ITU filings, spectrum management |
| Netherlands | Agentschap Telecom | Spectrum licensing, ITU filings, enforcement |
| Luxembourg | ILR (Institut Luxembourgeois de Regulation) | Satellite licensing, ITU coordination |
| Belgium | BIPT (Belgian Institute for Postal services and Telecommunications) | Spectrum management, ITU filings |
| Italy | MISE / AGCOM | Spectrum allocation, satellite licensing |
| Spain | CNMC / SETSI | Spectrum management, ITU filings |
| Denmark | Danish Energy Agency | Spectrum licensing, ITU coordination |
| Norway | Nkom (Norwegian Communications Authority) | Spectrum management, satellite licensing |

### National Licensing vs ITU Filing

It is essential to understand that ITU filing and national licensing are separate but related processes:

- **ITU filing** provides international recognition and interference protection
- **National license** provides the legal right to transmit within the jurisdiction
- Both are required for lawful satellite operations
- National licenses may impose conditions beyond ITU requirements (e.g., landing rights for foreign satellites, national security restrictions)

### Landing Rights

For satellite operators providing services into a country where they are not licensed, "landing rights" or equivalent authorizations are needed. In Europe, the regulatory approach varies:

- Some countries require explicit authorization for each foreign satellite system
- Others have streamlined processes or blanket authorizations for certain services
- EU harmonization is gradually simplifying cross-border satellite service provision
- The EU Space Act aims to further reduce barriers within the single market

## Part 6: EU Space Act Art. 15 Spectrum Provisions

### What Art. 15 Introduces

Article 15 of the EU Space Act addresses spectrum management in the context of space operations authorization. Key provisions include:

**Coordination with spectrum authorities**: NCAs must consult with national spectrum authorities when processing authorization applications that involve radio frequency use. This ensures that spectrum availability and coordination status are considered as part of the authorization decision.

**Spectrum as authorization condition**: Authorization may be conditioned on the operator holding valid frequency assignments, having completed ITU coordination, or demonstrating a credible path to spectrum rights.

**Information sharing**: Art. 15 facilitates information exchange between NCAs and spectrum authorities to avoid regulatory gaps or contradictory requirements.

**Interference obligations**: Operators authorized under the EU Space Act must comply with the Radio Regulations and may not cause harmful interference. Violation of interference rules can affect the space activity authorization, not just the spectrum license.

### Interaction with Existing Spectrum Regulation

Art. 15 does not replace existing European spectrum regulation. Instead, it creates a bridge between:

- The EU Space Act authorization process (administered by NCAs)
- The European Electronic Communications Code (EECC) spectrum framework
- National spectrum licensing regimes
- ITU filing processes

Operators must still obtain spectrum rights through the normal channels. Art. 15 ensures that the space authorization and spectrum licensing processes are coordinated rather than operating in silos.

### Implications for Operators

**Practical impact of Art. 15:**

1. Expect NCAs to ask about spectrum status during authorization
2. Authorization timelines may be affected by spectrum coordination progress
3. Spectrum-related conditions may be attached to space activity authorizations
4. Loss of spectrum rights could trigger review of the space activity authorization
5. Information you provide to the NCA may be shared with the spectrum authority and vice versa

## Part 7: NGSO Coordination with GSO Systems

### The Protection Principle

In many shared frequency bands, NGSO systems must operate without causing unacceptable interference to GSO networks. This principle, encoded in Article 22 of the Radio Regulations, reflects the historical priority and economic investment in GSO systems.

### Equivalent Power Flux Density (EPFD) Limits

Article 22 specifies EPFD limits that NGSO systems must not exceed at GSO satellite receivers, GSO earth stations, and on the Earth's surface. Compliance is assessed through:

- **Analytical verification**: Mathematical modeling of aggregate interference from the NGSO constellation into GSO receivers
- **Statistical assessment**: Evaluation over time, accounting for constellation dynamics
- **Software validation**: BR-approved software (e.g., EPFD tools) for compliance demonstration

### Operational Techniques for NGSO/GSO Coexistence

NGSO operators use several techniques to comply with EPFD limits:

- **Satellite switching**: Handing off traffic between NGSO satellites to avoid inline geometry with GSO arc
- **Power control**: Reducing transmit power when satellites pass through exclusion zones
- **Beam avoidance**: Steering NGSO beams away from the GSO arc
- **Band segmentation**: Using different frequency segments when interference risk is highest
- **Geographic avoidance**: Reducing service in areas where GSO interference coupling is strongest

### WRC-23 Developments

WRC-23 introduced several changes relevant to NGSO coordination:

- Refined EPFD methodologies for large constellations
- Updated milestone requirements for NGSO deployment
- New sharing frameworks for certain frequency bands
- Enhanced transparency requirements for NGSO system characteristics

## Part 8: Spectrum Filing Timeline and Costs

### Recommended Timeline for New Missions

For a typical commercial satellite mission, spectrum activities should begin well before spacecraft procurement:

**T-7 to T-5 years (before launch):**
- Frequency band selection and trade study
- Engage spectrum engineering consultant
- Prepare and submit API filing through national administration
- Begin preliminary interference analysis

**T-5 to T-3 years:**
- Prepare and submit CR/C filing
- Receive BR examination results and list of affected administrations
- Begin bilateral coordination campaigns
- Refine system parameters based on coordination feedback

**T-3 to T-1 years:**
- Continue and close bilateral coordination agreements
- Submit notification filing
- Obtain national spectrum license
- Finalize satellite transponder/payload design consistent with coordination constraints

**T-1 year to launch:**
- Confirm all coordination agreements in place
- Verify notification recorded in MIFR
- Ensure national license covers operational parameters
- Prepare for bringing-into-use demonstration

**Post-launch:**
- Demonstrate bringing into use within deadline
- Submit due diligence information to BR
- Begin operational interference monitoring
- Maintain coordination agreements with new filings in the area

### Budget Planning

| Cost Item | Typical Range (EUR) | Notes |
|-----------|-------------------|-------|
| Spectrum consultant (filing preparation) | 30,000 - 150,000 | Per filing set |
| ITU cost recovery fees | 5,000 - 50,000 | Depends on number of assignments |
| National administration fees | 2,000 - 20,000 | Varies by country |
| Bilateral coordination support | 20,000 - 200,000 | Depends on number of affected parties |
| Interference analysis tools/software | 10,000 - 50,000 | Annual license or one-time |
| Legal support | 10,000 - 100,000 | For disputes or complex negotiations |
| Ongoing monitoring and maintenance | 10,000 - 30,000/year | Operational phase |
| **Total lifecycle (simple mission)** | **100,000 - 300,000** | Single GEO or small NGSO |
| **Total lifecycle (complex constellation)** | **500,000 - 2,000,000+** | Large NGSO or multiple GEO |

## Part 9: Practical Guide — How to File

### Step-by-Step Filing Process

**1. Engage your national administration**

Contact your national spectrum authority early. Explain your mission concept and timeline. The administration will advise on:
- Which frequency bands are available and appropriate
- National priorities or constraints
- Filing strategy and timing
- Fees and administrative requirements

**2. Select frequency bands**

Work with your spectrum engineering consultant to select optimal bands considering:
- Service allocations in the Table of Frequency Allocations
- Existing filings and potential coordination burden
- Regulatory conditions and footnotes
- Payload/antenna design implications
- Market requirements and end-user equipment

**3. Prepare API filing**

The API filing is prepared using ITU-standard electronic formats (typically using SpaceCap software from the BR). Required data includes:
- Network name and administration
- Orbital characteristics (position for GEO; elements for NGSO)
- Frequency band(s) and bandwidth
- Service area
- Planned date of bringing into use
- Brief system description

**4. Submit through national administration**

All ITU filings must be submitted by the national administration, not directly by the operator. Your administration reviews the filing for completeness and consistency before forwarding to the BR.

**5. Monitor API publication**

The BR publishes received APIs in the BR IFIC (typically within 3-6 months). Monitor for comments from other administrations. Address any concerns raised.

**6. Prepare CR/C filing**

The CR/C filing requires substantially more detail than the API. Use SpaceCap and associated tools to prepare:
- Detailed satellite antenna patterns (gain contours)
- EIRP and power spectral density per carrier or beam
- Earth station characteristics (antenna size, location, G/T)
- Interference calculation parameters
- Compliance demonstrations (EPFD for NGSO)

**7. Manage bilateral coordination**

This is where the real work happens. For each affected administration:
- Prepare detailed interference analyses
- Provide technical data in standard formats
- Participate in coordination meetings (bilateral or multilateral)
- Negotiate operational constraints or sharing arrangements
- Document agreements in formal coordination letters

**8. Submit notification and secure recording**

Once coordination is complete (or after demonstrating due diligence), submit the notification filing. The BR examines it and, if favorable, records the assignments in the MIFR.

**9. Bring into use and maintain**

Demonstrate that the satellite is operating on the registered frequencies from the registered orbital position. Maintain your filing by responding to any new coordination requests from systems filed after yours.

### Required Documents Checklist

- [ ] API filing data (SpaceCap format)
- [ ] CR/C filing data (SpaceCap format)
- [ ] Satellite antenna pattern data
- [ ] Link budget analysis
- [ ] Interference analysis reports
- [ ] Coordination correspondence
- [ ] Coordination agreement letters
- [ ] Notification filing data
- [ ] National spectrum license application
- [ ] Bringing-into-use evidence
- [ ] Due diligence documentation

## Part 10: Common Pitfalls and Best Practices

### Common Pitfalls

**Starting too late**: Spectrum coordination is on the critical path for many missions. Beginning the process after spacecraft design is frozen can lead to costly redesigns or inability to use desired frequencies.

**Underestimating coordination complexity**: Bilateral coordination with dozens of administrations (common for GEO filings in popular bands) can take years. Budget time and resources accordingly.

**Ignoring NGSO/GSO coexistence**: NGSO operators who do not design for EPFD compliance from the start may find their constellation architecture fundamentally incompatible with regulatory requirements.

**Misunderstanding filing priority**: Priority is based on the date of receipt at the BR, not the date of filing at the national level. Delays at the national administration can cost priority.

**Neglecting national licensing**: Securing ITU recognition without a national license does not authorize transmission. Both are required.

**Paper satellite risk**: Filings without genuine programs create coordination burden for real operators. The ITU's due diligence and milestone requirements aim to address this, but it remains a challenge.

### Best Practices

1. **Start spectrum planning at mission concept phase** — not after spacecraft design
2. **Engage experienced spectrum consultants** — the ITU process is specialized and procedural
3. **Build strong relationships with your national administration** — they are your gateway to the ITU
4. **Monitor new filings in your frequency bands** — stay aware of the evolving coordination environment
5. **Document everything** — coordination agreements, meeting minutes, technical analyses
6. **Plan for contingencies** — have fallback frequency bands or orbital positions
7. **Participate in WRC preparations** — regulatory changes at WRC can fundamentally affect your business
8. **Budget realistically** — spectrum costs are a significant line item for any satellite mission

## How Caelex Helps

Caelex integrates spectrum management tracking into your overall compliance workflow:

- **Regulatory Mapping**: Identify which spectrum provisions of the EU Space Act apply to your mission alongside authorization, debris, and cybersecurity obligations
- **Deadline Tracking**: Monitor ITU filing deadlines, coordination milestones, and license renewals in a unified compliance timeline
- **NCA Coordination**: Track interactions with both your NCA (for space authorization) and your spectrum authority (for frequency licensing) in one place
- **Document Vault**: Store spectrum filings, coordination agreements, and license documents alongside all other compliance documentation
- **Gap Analysis**: Identify where spectrum-related obligations overlap with EU Space Act and NIS2 requirements

Start your compliance assessment to see how spectrum management fits into your overall regulatory obligations.

## Conclusion

Spectrum management is one of the most technically complex and procedurally demanding aspects of satellite operations. It requires early planning, specialized expertise, and sustained engagement with national and international authorities over many years. Operators who invest in a robust spectrum strategy from the outset avoid costly delays, protect their frequency rights, and position themselves for long-term operational success. As the EU Space Act introduces new linkages between space authorization and spectrum licensing, an integrated approach to compliance becomes more important than ever.
`,
  },
  {
    slug: "supervision-reporting",
    title: "Ongoing Supervision & Reporting for Space Operators",
    h1: "Ongoing Supervision & Reporting for Space Operators",
    description:
      "Comprehensive guide to ongoing supervision and reporting obligations for space operators under the EU Space Act. Covers NCA supervision framework, reporting types, inspections, sanctions, and best practices for regulatory compliance.",
    keywords: [
      "space supervision",
      "NCA reporting",
      "space operator obligations",
      "regulatory oversight",
    ],
    author: "Caelex",
    publishedAt: "2025-02-11",
    readingTime: 20,
    content: `
Obtaining authorization to conduct space activities is only the beginning of the regulatory journey. Once authorized, space operators enter a continuous regime of supervision and reporting that lasts for the entire lifecycle of their mission — and in some cases beyond. National Competent Authorities (NCAs) monitor compliance, require periodic and event-driven reports, conduct inspections, and have the power to impose sanctions up to and including revocation of authorization. This guide explains what operators should expect and how to maintain a productive relationship with their supervisory authority.

## Executive Summary

Ongoing supervision under the EU Space Act is designed to ensure that authorized operators continue to meet safety, sustainability, cybersecurity, and insurance requirements throughout their mission. The supervisory framework is risk-based, meaning that operators with higher risk profiles or past compliance issues will face more intensive oversight.

**Key facts:**
- Supervision begins immediately upon authorization and continues through end-of-life
- Operators must submit annual compliance reports, anomaly reports, incident reports, and end-of-life reports
- NCAs have inspection rights including access to premises, records, and operational data
- Notification is required for material changes including ownership transfer, orbit changes, and anomalies
- Sanctions range from formal warnings to authorization revocation
- Supervision fees are typically borne by the operator
- NCA cooperation mechanisms ensure consistent oversight across member states

## Part 1: The EU Space Act Supervision Framework

### Legal Basis (Articles 17-20)

The EU Space Act establishes a comprehensive supervision framework through several key articles:

**Article 17 — General Supervision Powers**

NCAs are empowered to monitor the ongoing compliance of authorized operators with the conditions of their authorization and the requirements of the Act. This includes the power to:

- Request information and documentation from operators
- Access operational data and telemetry records
- Conduct scheduled and unscheduled inspections
- Require corrective action when non-compliance is identified
- Coordinate with other NCAs and EUSPA for cross-border matters

**Article 18 — Reporting Obligations**

Operators must submit regular and event-driven reports to their NCA. The Article specifies minimum reporting requirements while allowing NCAs to impose additional obligations through authorization conditions.

**Article 19 — Inspections and Audits**

NCAs may conduct inspections of operator facilities, systems, and records. The scope of inspection authority covers both physical premises and digital systems. Operators must cooperate fully with inspections.

**Article 20 — Enforcement and Sanctions**

When non-compliance is identified, NCAs have a graduated enforcement toolkit. The principle of proportionality governs enforcement action — sanctions should be appropriate to the severity and nature of the non-compliance.

### Risk-Based Supervision

The EU Space Act adopts a risk-based approach to supervision intensity. Factors that influence the level of supervisory attention include:

| Factor | Higher Scrutiny | Lower Scrutiny |
|--------|----------------|----------------|
| Mission complexity | Mega-constellation, novel operations | Standard LEO mission |
| Operator track record | New entrant, past issues | Established, clean record |
| Orbital regime | Congested orbits, GEO | Low-traffic orbits |
| Payload type | Dual-use, sensitive | Commercial, standard |
| Entity classification | Essential entity (NIS2) | Light regime operator |
| Insurance status | Minimum coverage, claims history | Substantial coverage, no claims |

Operators with a strong compliance history and low-risk profile may benefit from lighter supervision, while those with compliance concerns or complex missions should expect more frequent engagement.

## Part 2: Reporting Types and Requirements

### Annual Compliance Reports

Every authorized operator must submit an annual compliance report to their NCA. This is the cornerstone of the ongoing supervision relationship. The report typically covers:

**Operational status:**
- Current orbital parameters for each spacecraft
- Operational health and performance metrics
- Any deviations from authorized parameters
- Fuel/propellant status and remaining lifetime estimates

**Compliance status:**
- Status of compliance with each authorization condition
- Updates to debris mitigation plans and end-of-life strategies
- Insurance coverage confirmation (current policy details, coverage amounts, expiry dates)
- Cybersecurity compliance status (if NIS2 applies)

**Changes during the reporting period:**
- Any changes to corporate structure or ownership
- Changes to key personnel
- Modifications to operational procedures
- New contracts or service agreements affecting compliance

**Forward look:**
- Planned activities for the upcoming year
- Anticipated changes to mission parameters
- Upcoming end-of-life activities
- Known compliance challenges or risks

**Submission deadline**: Typically within 90 days of the reporting period end (often aligned with the calendar year or the authorization anniversary). NCAs may specify a different deadline in the authorization conditions.

### Anomaly Reports

Anomaly reports must be submitted when unexpected events occur that may affect compliance, safety, or the orbital environment. These are event-driven and must be submitted promptly.

**What constitutes a reportable anomaly:**

- Spacecraft system failures or degradation affecting mission capability
- Loss of contact with the spacecraft
- Unplanned orbital maneuvers or attitude changes
- Debris release (intentional or unintentional)
- Near-miss conjunction events where the collision probability exceeded thresholds
- Propulsion anomalies or fuel leaks
- Unexpected end-of-life of a spacecraft component
- Ground segment failures affecting spacecraft control

**Reporting timeline:**

| Severity | Initial Notification | Detailed Report |
|----------|---------------------|-----------------|
| Critical (safety impact) | Within 4 hours | Within 48 hours |
| Significant (compliance impact) | Within 24 hours | Within 7 days |
| Minor (informational) | Within 72 hours | In next annual report |

**Report content:**
- Date, time, and circumstances of the anomaly
- Affected spacecraft and systems
- Impact on mission and compliance
- Immediate actions taken
- Root cause analysis (preliminary or final)
- Corrective actions planned or implemented
- Impact on other operators or the orbital environment

### Incident Reports

Incident reports overlap with anomaly reports but specifically address events with security, safety, or environmental implications that go beyond routine anomalies.

**Reportable incidents include:**

- Cybersecurity breaches affecting spacecraft or ground systems (also reportable under NIS2)
- Physical security incidents at ground stations or operations centers
- Unauthorized access to command and control systems
- Collision events or debris-generating events
- Re-entry events (controlled or uncontrolled)
- Insurance claims or third-party damage events
- Regulatory violations by the operator or its contractors

**For NIS2-classified operators, incident reporting follows the NIS2 timeline:**
- 24 hours: Early warning to CSIRT/NCA
- 72 hours: Incident notification with details
- 1 month: Final report with root cause analysis

The EU Space Act and NIS2 reporting requirements should be coordinated to avoid duplication while ensuring all authorities receive the information they need.

### End-of-Life Reports

When a spacecraft reaches end of life, operators must report on the decommissioning process:

**Pre-disposal report (before end-of-life operations begin):**
- Planned disposal method and timeline
- Current orbital status and fuel reserves
- Passivation procedures to be executed
- Expected post-disposal orbital parameters
- Casualty risk assessment (for re-entry)

**Post-disposal report (after disposal operations complete):**
- Confirmation of disposal execution
- Final orbital parameters achieved
- Passivation steps completed
- Any deviations from the plan
- Confirmation of compliance with 5-year disposal requirement (LEO)
- Evidence of successful graveyard orbit insertion (GEO)

**Deregistration request:**
- Following successful disposal and passivation, operators should request deregistration from the national and UN registries

## Part 3: Inspections and Audits

### Types of Inspections

NCAs may conduct several types of inspections:

**Scheduled inspections:**
- Announced in advance (typically 30 days notice)
- Scope defined in advance
- Focused on systematic compliance review
- May occur annually or at specified intervals per the authorization

**Unscheduled inspections:**
- May occur at any time with minimal or no notice
- Typically triggered by specific concerns (anomaly, complaint, intelligence)
- Broader scope than scheduled inspections
- Operators must provide immediate access and cooperation

**Document-based audits:**
- Remote review of operator records and documentation
- May precede or follow physical inspections
- Focus on compliance documentation, procedures, and records
- Operator submits requested documentation by specified deadline

**Technical audits:**
- Deep-dive into specific technical areas (debris mitigation, cybersecurity, tracking)
- May involve NCA-appointed technical experts
- May include access to operational systems and data
- Focus on verifying technical claims made in authorization application

### Inspection Scope

NCA inspectors may examine:

**Physical facilities:**
- Mission control centers and operations rooms
- Ground station equipment and security
- Data processing and storage facilities
- Office and document storage areas

**Systems and data:**
- Spacecraft telemetry and command logs
- Conjunction assessment records
- Anomaly and incident logs
- Cybersecurity systems and logs
- Insurance documentation

**Personnel and processes:**
- Qualifications and training records of key personnel
- Operational procedures and their implementation
- Change management processes
- Emergency response procedures

**Documentation:**
- Authorization compliance records
- Reporting history and completeness
- Contractual arrangements with subcontractors
- Quality management system records

### Operator Rights During Inspections

While operators must cooperate with inspections, they also have rights:

- **Right to be informed** of the legal basis and scope of the inspection
- **Right to legal representation** during the inspection
- **Right to claim confidentiality** for commercially sensitive information (NCA must protect it)
- **Right to receive inspection findings** in writing
- **Right to respond** to findings before enforcement action is taken
- **Right to appeal** enforcement decisions through administrative or judicial review

## Part 4: Notification Requirements

### Changes Requiring Prior Approval

Certain changes to an authorized operation require NCA approval before they can be implemented:

**Ownership or control changes:**
- Transfer of the spacecraft or the operating entity
- Change of controlling shareholder
- Merger or acquisition affecting the authorized entity
- Change of the entity's jurisdiction or place of incorporation

**Mission parameter changes:**
- Significant orbit changes (altitude, inclination, slot)
- New operational capabilities or services
- Extension of mission beyond authorized duration
- Addition of new spacecraft to an authorized constellation

**Insurance changes:**
- Reduction of insurance coverage below authorization conditions
- Change of insurer
- Material changes to policy terms

### Changes Requiring Notification Only

Some changes need only be notified to the NCA (typically within 30 days):

- Change of key personnel (responsible persons, safety officers)
- Change of ground station locations
- Update to contact information
- Non-material changes to operational procedures
- Change of subcontractors (unless affecting critical functions)

### Notification Process

Notifications should be made in writing to the designated NCA contact:

1. Describe the change clearly and completely
2. Explain the rationale for the change
3. Assess the impact on compliance with authorization conditions
4. Provide updated documentation as needed
5. Request approval (for changes requiring it) or confirm notification
6. Await NCA response before implementing changes requiring approval

## Part 5: Supervision Fees and Costs

### Fee Structures

Most NCAs charge fees to cover the costs of supervision. Fee structures vary by jurisdiction:

**Annual supervision fees:**
- Fixed annual fee per authorization
- Typically ranges from EUR 1,000 to EUR 50,000 depending on jurisdiction and mission complexity
- May be scaled by number of spacecraft, revenue, or risk profile
- Usually invoiced annually with payment due within 30-60 days

**Inspection fees:**
- Some NCAs charge separately for inspections
- Scheduled inspections may be included in the annual fee
- Unscheduled inspections triggered by operator non-compliance may incur additional fees
- Technical expert costs may be passed through to the operator

**Application and modification fees:**
- One-time fees for new authorization applications
- Fees for modification requests
- Fees for transfer of authorization

### Cost Management Strategies

Operators can manage supervision costs through:

1. **Maintaining clean compliance records** — reduces risk of unscheduled inspections
2. **Proactive reporting** — addresses concerns before they trigger formal investigation
3. **Efficient documentation** — makes scheduled inspections faster and less costly
4. **Automation** — compliance management platforms reduce manual effort
5. **Engaging early** — discussing planned changes informally before formal notification saves time

## Part 6: Sanctions and Enforcement

### Graduated Enforcement

NCAs follow a graduated enforcement approach, starting with less severe measures and escalating as needed:

**Level 1 — Informal engagement:**
- Discussion of concerns during routine supervision
- Informal recommendations for improvement
- Guidance on best practices
- No formal record (unless the operator fails to respond)

**Level 2 — Formal warning:**
- Written notification of non-compliance
- Specified deadline for corrective action
- Recorded in the operator's compliance file
- May include specific remediation requirements

**Level 3 — Conditions and restrictions:**
- Imposition of additional authorization conditions
- Operational restrictions (reduced operations, orbit limitations)
- Enhanced reporting requirements
- Mandatory third-party audits at operator expense

**Level 4 — Suspension:**
- Temporary suspension of authorization
- Operator must cease or limit activities
- Reinstatement conditional on demonstrated compliance
- May be partial (affecting specific activities) or full

**Level 5 — Revocation:**
- Permanent revocation of authorization
- Most severe sanction, reserved for serious or persistent non-compliance
- Operator must safely terminate operations (end-of-life obligations remain)
- May include referral for administrative penalties

### Administrative Penalties

In addition to authorization-related sanctions, NCAs may impose administrative penalties (fines):

- Penalty amounts defined by national implementing legislation
- Must be effective, proportionate, and dissuasive
- May be imposed alongside other enforcement measures
- Subject to appeal and judicial review

### Factors Affecting Sanctions

NCAs consider several factors when determining appropriate sanctions:

- **Severity** of the non-compliance
- **Duration** of the non-compliance
- **Intent** (deliberate vs negligent vs accidental)
- **Cooperation** of the operator in addressing the issue
- **Impact** on safety, environment, or third parties
- **Track record** of the operator
- **Mitigating actions** taken by the operator
- **Deterrent effect** for the industry

## Part 7: NCA Cooperation Across Member States

### Cross-Border Supervision

Space activities are inherently cross-border. A satellite authorized by one NCA may:
- Serve customers in multiple member states
- Use ground stations in different countries
- Share orbit with spacecraft authorized by other NCAs
- Be part of a constellation with entities in multiple jurisdictions

### EUSPA Coordination Role

The EU Agency for the Space Programme (EUSPA) plays a coordination role in supervision:

- Facilitating information exchange between NCAs
- Developing common supervision practices and standards
- Providing technical support and guidance
- Maintaining the EU Space Registry
- Coordinating with ESA on technical matters

### Mutual Recognition

Under the EU Space Act's mutual recognition principle:

- Authorization by one NCA is recognized across all member states
- The authorizing NCA remains the primary supervisor
- Other NCAs may raise concerns through coordination mechanisms
- Disputes between NCAs are resolved through EUSPA or Commission processes

### Information Sharing

NCAs share information about:

- Authorized operators and their activities
- Supervision findings and enforcement actions
- Best practices and common challenges
- Emerging risks and regulatory developments
- Incident and anomaly data (anonymized where appropriate)

## Part 8: Best Practices for Maintaining Good NCA Relations

### Building a Productive Relationship

The NCA is not an adversary — it is a partner in ensuring safe and sustainable space operations. Operators who invest in a constructive relationship with their NCA benefit from:

- Faster processing of modification requests
- More predictable supervision outcomes
- Early warning of regulatory changes
- Access to guidance and best practices
- Benefit of the doubt in ambiguous situations

### Communication Best Practices

**Be proactive:**
- Report issues before the NCA discovers them
- Provide context and analysis, not just facts
- Propose solutions alongside problem identification
- Keep the NCA informed of developments (even positive ones)

**Be responsive:**
- Respond to NCA queries within the requested timeframe
- Acknowledge receipt even if a full response takes time
- Provide complete and accurate information
- Follow up on commitments made to the NCA

**Be transparent:**
- Do not hide problems or provide misleading information
- Disclose material facts even if not specifically asked
- Explain the reasoning behind operational decisions
- Share lessons learned from anomalies and incidents

**Be organized:**
- Maintain clear and accessible compliance records
- Designate a primary NCA contact within your organization
- Keep documentation up to date
- Prepare thoroughly for inspections and audits

### Compliance Management System

Operators should implement a formal compliance management system that includes:

1. **Compliance register**: Tracking all authorization conditions and their status
2. **Reporting calendar**: Deadlines for all required reports
3. **Change management**: Process for identifying and managing reportable changes
4. **Audit readiness**: Standing preparation for inspections
5. **Training program**: Ensuring all relevant personnel understand supervision obligations
6. **Continuous improvement**: Learning from supervision feedback and industry developments

### Preparing for Inspections

**Before a scheduled inspection:**
- Review the inspection scope and prepare relevant documentation
- Brief key personnel on what to expect
- Ensure facilities are accessible and organized
- Identify any known issues and prepare explanations
- Have legal counsel available if needed

**During the inspection:**
- Designate a single point of contact for the inspectors
- Be cooperative and professional
- Take notes on inspector questions and observations
- Do not volunteer information beyond what is asked
- Request clarification if questions are ambiguous

**After the inspection:**
- Review inspection findings promptly
- Develop a corrective action plan for any issues identified
- Implement corrective actions within the specified timeline
- Document all remediation activities
- Confirm completion with the NCA

## Part 9: Supervision Under NIS2

### Additional Supervision for Essential Entities

Operators classified as essential entities under NIS2 face additional supervision requirements:

- **Proactive supervision**: NCAs may conduct cybersecurity audits without specific cause
- **Regular assessments**: Periodic review of cybersecurity measures
- **Management accountability**: Board-level responsibility for cybersecurity compliance
- **Incident supervision**: NCA involvement in significant cybersecurity incidents

### Coordination Between Space and Cyber Authorities

For NIS2-classified space operators, supervision involves multiple authorities:

- The space NCA (for space activity authorization)
- The NIS2 competent authority (for cybersecurity compliance)
- The national CSIRT (for incident handling)

These authorities should coordinate to avoid:
- Duplicative reporting requirements
- Contradictory supervision expectations
- Gaps in oversight
- Excessive burden on operators

The EU Space Act's Art. 16 encourages such coordination and the European Commission may issue guidance on supervisory cooperation.

## Part 10: Practical Reporting Templates

### Annual Report Structure

A well-structured annual compliance report should follow this outline:

**1. Executive Summary** (1 page)
- Overall compliance status
- Key events during the reporting period
- Material changes or concerns

**2. Operator Information** (1-2 pages)
- Updated corporate information
- Key personnel changes
- Organizational developments

**3. Mission Status** (3-5 pages per spacecraft)
- Orbital parameters and health
- Operational performance metrics
- Fuel status and lifetime estimates
- Conjunction events and responses

**4. Compliance Assessment** (5-10 pages)
- Authorization condition-by-condition review
- Debris mitigation compliance
- Insurance status
- Cybersecurity compliance (if applicable)

**5. Anomalies and Incidents** (2-5 pages)
- Summary of all anomalies during the period
- Status of open investigations
- Corrective actions implemented

**6. Forward Look** (1-2 pages)
- Planned activities
- Anticipated changes
- Known risks or challenges

**7. Appendices**
- Insurance certificates
- Updated documentation
- Technical data as required

## How Caelex Helps

Caelex provides comprehensive supervision and reporting support:

- **Compliance Dashboard**: Real-time visibility into your compliance status across all authorization conditions
- **Reporting Automation**: Pre-built templates for annual, anomaly, incident, and end-of-life reports that align with NCA expectations
- **Deadline Management**: Automated reminders for reporting deadlines, insurance renewals, and supervisory milestones
- **Document Vault**: Centralized storage for all compliance documentation, inspection records, and NCA correspondence
- **Audit Trail**: Complete history of all compliance activities, changes, and communications for inspection readiness
- **ASTRA AI Assistant**: On-demand guidance on reporting requirements, notification obligations, and best practices

Start your compliance assessment to establish your supervision baseline and ensure you are ready for ongoing NCA oversight.

## Conclusion

Ongoing supervision is an inherent part of being an authorized space operator. It is not a burden to be minimized but a framework to be embraced. Operators who invest in robust compliance management, maintain transparent relationships with their NCAs, and treat supervision as a continuous improvement opportunity position themselves for long-term success. As the EU Space Act matures and NCAs gain experience, supervision practices will evolve — and operators who are well-prepared will adapt most smoothly. The key message is simple: compliance does not end at authorization. It is a permanent commitment to safe, sustainable, and responsible space operations.
`,
  },
  {
    slug: "space-registration",
    title: "Space Object Registration: UN Convention & National Requirements",
    h1: "Space Object Registration: UN Convention & National Requirements",
    description:
      "Complete guide to space object registration under the UN Registration Convention, EU Space Act, and national laws. Covers registration requirements, UNOOSA processes, national registries, SST data sharing, and deregistration procedures.",
    keywords: [
      "space registration",
      "UN registration convention",
      "satellite registry",
      "UNOOSA",
    ],
    author: "Caelex",
    publishedAt: "2025-02-13",
    readingTime: 18,
    content: `
Every object launched into outer space must be registered. This obligation, rooted in international treaty law and reinforced by national legislation and the EU Space Act, serves fundamental purposes: identifying who is responsible for a space object, establishing which state bears international liability, and maintaining awareness of what is in orbit. Despite its importance, registration is often treated as an afterthought by operators focused on technical and commercial challenges. This guide provides a thorough treatment of registration obligations, procedures, and best practices.

## Executive Summary

Space object registration operates on two levels: national registration (maintained by each launching state) and international registration (maintained by the United Nations Office for Outer Space Affairs, UNOOSA). The EU Space Act adds a European dimension through the EU Space Registry. Operators must comply with all applicable registration requirements as a condition of authorization.

**Key facts:**
- The UN Registration Convention (1976) requires launching states to register space objects
- UNOOSA maintains the international Register of Objects Launched into Outer Space
- National registries are maintained by each state that conducts or authorizes space activities
- The EU Space Act establishes an EU Space Registry coordinated by EUSPA
- Registration must occur promptly after launch (specific timelines vary by jurisdiction)
- Registration information includes orbital parameters, ownership, function, and state of registry
- Changes to registered information (orbit, ownership, status) must be updated
- Deregistration is required at end of life after successful disposal
- Failure to register can affect authorization status and international liability allocation

## Part 1: The UN Registration Convention (1976)

### Historical Context

The Convention on Registration of Objects Launched into Outer Space was adopted by the UN General Assembly in 1975 and entered into force in 1976. It builds on the earlier Outer Space Treaty (1967) and Liability Convention (1972) by establishing a mechanism for identifying space objects and their responsible states.

The Registration Convention was motivated by several concerns:

1. **Identification**: As the number of objects in orbit grew, the ability to identify who owned and controlled each object became essential for safety and liability purposes
2. **Liability implementation**: The Liability Convention establishes state liability for damage caused by space objects, but it requires being able to identify the "launching state" — registration serves this function
3. **Transparency**: Registration provides the international community with information about what is being placed in orbit and by whom
4. **Conflict resolution**: Registration helps resolve questions about jurisdiction and control over space objects

### Key Provisions

**Article II — National Registration**

Each launching state must maintain a national registry of space objects. The registry must be established at the state's discretion but must contain the information specified in Article IV.

A "launching state" is defined as:
- A state that launches or procures the launching of a space object
- A state from whose territory or facility a space object is launched

This means that a single space object may have multiple launching states. In practice, the states agree among themselves which one will register the object.

**Article III — UN Registration**

The launching state that registers the object must also furnish information to the Secretary-General of the United Nations for inclusion in the international register. This must be done "as soon as practicable" after launch.

**Article IV — Registration Information**

The following information must be provided for each registered space object:

| Data Element | Description |
|-------------|-------------|
| Launching state(s) | Name of the state(s) responsible |
| Designator or registration number | National registry identifier |
| Date and territory/facility of launch | When and from where the object was launched |
| Basic orbital parameters | Nodal period, inclination, apogee, perigee |
| General function | Purpose of the space object |

**Article VI — Updates**

States should notify the Secretary-General of any space objects that have returned to Earth, been deorbited, or otherwise changed status. This is the basis for deregistration.

### Current Status

As of 2025:
- 72 states and international organizations have ratified or acceded to the Convention
- Most major space-faring nations are parties
- UNOOSA registers approximately 2,000-3,000 new objects per year
- The register contains over 15,000 entries for objects launched since 1957
- Compliance with notification timelines remains uneven

### Limitations

The Registration Convention has several recognized limitations:

- **No enforcement mechanism**: Non-compliance carries no direct penalty
- **Vague timelines**: "As soon as practicable" is not a defined deadline
- **Limited information**: The required data elements are minimal by modern standards
- **No updates mandate**: Article VI uses "should" rather than "shall" for status updates
- **Single registrar model**: Only one state registers each object, which can be ambiguous for multi-state ventures
- **No transfer provisions**: The Convention does not explicitly address transfer of registration between states

## Part 2: EU Space Act Registration Requirements

### The EU Space Registry

The EU Space Act establishes an EU Space Registry, coordinated by EUSPA. This is a significant development because it creates a unified European registration framework that goes beyond the minimal requirements of the UN Convention.

**Key features of the EU Space Registry:**

- **Centralized database**: Single EU-wide registry accessible to all NCAs
- **Enhanced information**: More detailed data than the UN Convention requires
- **Real-time updates**: Designed for more timely information than the traditional UN process
- **Integration with authorization**: Registration is linked to the authorization process
- **Interoperability**: Designed to feed information to the UN Register and national registries

### What Must Be Registered

Under the EU Space Act, the following must be registered:

**Space objects:**
- Spacecraft (operational and non-operational)
- Launch vehicle upper stages remaining in orbit
- Mission-related objects deliberately released
- Debris generated by EU-authorized operations (to the extent trackable)

**Associated information:**
- All UN Convention data elements
- Additional technical parameters (mass, dimensions, cross-section)
- Operator identification and authorization reference
- Cybersecurity classification status
- Insurance details
- Debris mitigation plan reference
- End-of-life plan status

### Registration Timeline Under the EU Space Act

| Event | Registration Action | Deadline |
|-------|-------------------|----------|
| Authorization granted | Pre-registration of planned objects | At authorization |
| Launch | Update with actual launch data | Within 7 days |
| Orbit achieved | Confirm orbital parameters | Within 30 days |
| Operational changes | Update registration data | Within 30 days of change |
| End of life | Update status to decommissioned | Within 30 days |
| Disposal complete | Request deregistration | Within 90 days |

### Relationship with National Registries

The EU Space Registry supplements rather than replaces national registries. Member states continue to maintain their own national registries as required by the UN Convention. The EU Registry:

- Receives data from national registries
- Provides a consolidated European view
- Feeds information to UNOOSA for the international register
- Supports EUSST (EU Space Surveillance and Tracking) operations

## Part 3: National Registries Across 10 Jurisdictions

### Overview

Each European state with a national space law maintains a registry of space objects launched under its jurisdiction. The detail and sophistication of these registries varies significantly.

### France

**Registry maintained by**: CNES (on behalf of the Ministry)

**Scope**: All objects launched from French territory (including Kourou) or by French operators

**Key features:**
- Most comprehensive European national registry
- Integrated with CNES technical databases
- Includes detailed technical and orbital data
- Publicly accessible (partial information)
- Updated regularly through CNES operations

**Registration requirements:**
- Pre-launch notification with planned orbital parameters
- Post-launch confirmation within 30 days
- Ongoing updates for orbit changes, anomalies, or status changes
- End-of-life notification and deregistration request

### United Kingdom

**Registry maintained by**: UK Space Agency

**Scope**: Objects licensed under the Outer Space Act 1986 or Space Industry Act 2018

**Key features:**
- Publicly available register
- Linked to UK licensing process
- Updated following launch and status changes
- Includes historical UK-registered objects

**Registration requirements:**
- Registration as condition of license
- Post-launch data submission
- Status updates for significant changes
- Deregistration upon verified disposal

### Germany

**Registry maintained by**: Federal Ministry for Economic Affairs

**Scope**: German-licensed space objects

**Key features:**
- Focused on operational data
- Integrated with SatDSiG licensing for EO satellites
- Less publicly detailed than France or UK
- Being modernized under EU Space Act preparation

### Luxembourg

**Registry maintained by**: Ministry of the Economy

**Scope**: Objects authorized under Luxembourg Space Law (2020)

**Key features:**
- Relatively new registry
- Streamlined data requirements
- English-language submissions accepted
- Growing as Luxembourg's space sector expands

### Netherlands

**Registry maintained by**: Ministry of Economic Affairs

**Scope**: Objects authorized under the Space Activities Act (2007)

**Key features:**
- Well-established registry
- Linked to authorization process
- Regular UNOOSA notifications
- Public access to basic information

### Belgium

**Registry maintained by**: Federal Science Policy Office (BELSPO)

**Scope**: Belgian-authorized space objects

**Key features:**
- Established under the 2005 Space Law
- Comprehensive for a smaller registry
- Regular UNOOSA submissions
- Integrated with authorization tracking

### Austria

**Registry maintained by**: Federal Ministry (BMK)

**Scope**: Austrian-authorized space objects

**Key features:**
- Established under the 2011 Space Law
- Clear registration requirements
- Timely UNOOSA notifications
- German-language primary documentation

### Denmark

**Registry maintained by**: Danish Ministry of Higher Education and Science

**Scope**: Danish-authorized space objects

**Key features:**
- Established under 2016 Space Act
- Efficient administration
- English-language capability
- Growing with Danish space industry

### Italy

**Registry maintained by**: ASI (Italian Space Agency)

**Scope**: Italian-authorized space objects

**Key features:**
- Substantial registry reflecting Italy's space heritage
- Integrated with ASI technical databases
- Regular UNOOSA submissions
- Italian-language primary process

### Norway

**Registry maintained by**: Norwegian Space Agency

**Scope**: Norwegian-authorized space objects

**Key features:**
- Covers Andoya and Svalbard launches
- Practical, efficient process
- English widely accepted
- Growing with Andoya Spaceport development

### Comparative Summary

| Country | Registry Maturity | Public Access | Language | UNOOSA Notification Timeliness |
|---------|------------------|--------------|----------|-------------------------------|
| France | High | Partial | French | Good |
| UK | High | Yes | English | Good |
| Germany | Medium | Limited | German | Moderate |
| Luxembourg | Developing | Limited | EN/FR | Good |
| Netherlands | High | Partial | Dutch/EN | Good |
| Belgium | Medium | Limited | FR/NL | Good |
| Austria | Medium | Limited | German | Good |
| Denmark | Medium | Limited | Danish/EN | Good |
| Italy | High | Limited | Italian | Moderate |
| Norway | Medium | Limited | Norwegian/EN | Good |

## Part 4: What Must Be Registered

### Mandatory Registration Data

At minimum, registration must include the data elements specified in the UN Registration Convention (Article IV), supplemented by any additional requirements of the applicable national law and the EU Space Act:

**Identity and ownership:**
- Name and designation of the space object
- International designator (COSPAR ID, assigned post-launch)
- Owner/operator name and contact information
- Authorizing state and authorization reference number
- Manufacturer (if different from operator)

**Launch information:**
- Date and time of launch (UTC)
- Launch vehicle and configuration
- Launch site (name and country)
- Co-passengers on the launch (if shared ride)

**Orbital parameters:**
- Nodal period (minutes)
- Inclination (degrees)
- Apogee altitude (km)
- Perigee altitude (km)
- For GEO: assigned orbital longitude

**Mission information:**
- General function/purpose of the space object
- Planned operational lifetime
- Frequency bands used (cross-reference to ITU filings)
- Payload description (general)

**Physical characteristics (EU Space Act enhanced):**
- Mass at launch and dry mass
- Physical dimensions
- Radar cross-section (if known)
- Distinguishing features or markings

**Compliance information (EU Space Act enhanced):**
- Debris mitigation plan reference
- End-of-life disposal plan
- Insurance policy reference
- NIS2 classification (if applicable)

### Constellation Registration

For satellite constellations, registration presents specific challenges:

- Each satellite must be individually registered
- Common orbital parameters may be used for identical satellites in the same orbital plane
- Updates are required as satellites are deployed, repositioned, or decommissioned
- Batch registration processes may be available for large constellations
- The EU Space Act anticipates constellation-level registration with individual satellite identifiers

## Part 5: Registration Timeline

### Pre-Launch Registration

Registration activities begin well before launch:

**At authorization:**
- Pre-register the planned space object(s) in the national registry
- Provide preliminary orbital parameters based on mission design
- Assign national registration number(s)

**Pre-launch (T-6 to T-1 months):**
- Update registration with final launch details (date, vehicle, site)
- Confirm orbital parameters based on latest mission analysis
- Provide co-passenger information for shared launches
- Coordinate with launch state if different from registering state

### Post-Launch Registration

After launch, registration must be updated with actual data:

**Immediately post-launch (within 7 days):**
- Confirm successful launch and separation
- Provide actual launch date and time
- Report initial orbital elements
- Assign or confirm COSPAR international designator

**After orbit stabilization (within 30 days):**
- Provide operational orbital parameters
- Confirm satellite health and functionality
- Update any parameters that differ from pre-launch registration
- Initiate UNOOSA notification process

### Ongoing Registration Updates

Registration is not a one-time event. Updates are required for:

- **Orbit changes**: Station-keeping maneuvers that change mean orbital elements, orbit-raising or lowering, plane changes
- **Ownership changes**: Transfer of the space object to a new operator or state
- **Status changes**: Transition from operational to non-operational, safe mode, or disposal phase
- **Physical changes**: If the object separates into parts (intentional or unintentional)

### Post-Mission Registration

At end of life:

**Disposal phase:**
- Notify registry of end-of-life operations commencing
- Update orbital parameters during disposal maneuvers
- Report final orbital state after disposal complete

**Deregistration:**
- For objects that re-enter: Report re-entry date and location (if known)
- For objects in graveyard orbit: Update status to "passivated/disposed"
- Request deregistration from national registry
- UNOOSA notification of change in status

## Part 6: UNOOSA Registry and Notification Process

### How UNOOSA Registration Works

The United Nations Office for Outer Space Affairs maintains the Register of Objects Launched into Outer Space under General Assembly Resolution 1721B (XVI) and the Registration Convention.

**Submission process:**

1. The registering state prepares a notification using the standard UNOOSA format
2. The notification is transmitted to the Secretary-General (via UNOOSA)
3. UNOOSA reviews the notification for completeness
4. The information is recorded in the UN Register
5. The registration is published in the UNOOSA online index

**Standard notification format:**

Notifications follow the format established by General Assembly Resolution 62/101, which recommends additional voluntary information beyond the Convention minimum:

- Enhanced orbital parameters
- Web links to operator information
- Change of status notifications
- Geostationary position information

### UNOOSA Online Index

UNOOSA maintains a publicly accessible Online Index of Objects Launched into Outer Space at:
- Database searchable by launching state, date, designator, or object name
- Contains registration data for all notified objects since 1957
- Updated as new notifications are received
- Accessible to anyone without registration or fee

### Practical Considerations

**Timeliness**: Many states are slow to notify UNOOSA. The "as soon as practicable" standard in the Convention means that some notifications arrive months or even years after launch. The EU Space Act aims to improve this for European operators by setting specific deadlines.

**Completeness**: Not all launched objects are registered. While major space-faring nations have generally good compliance, gaps exist particularly for:
- Objects launched by states that are not parties to the Convention
- Secondary payloads and rideshare objects where registration responsibility is unclear
- Debris from launch vehicles or separation events

**Updates**: Status updates (end of life, re-entry, disposal) are often not submitted, leading to an accumulation of entries for objects that no longer exist. UNOOSA has encouraged states to improve notification practices.

## Part 7: Space Surveillance and Tracking (SST) Data Sharing

### The EU SST Partnership

The EU Space Surveillance and Tracking (EU SST) partnership provides independent European capability for tracking space objects. Registration and SST are complementary:

- **Registration** tells you what should be in orbit (ownership, purpose, planned parameters)
- **SST** tells you what actually is in orbit (observed position, trajectory, status)

### Operator Obligations for SST

Under the EU Space Act, authorized operators must:

**Provide data to EUSST:**
- Pre-launch orbital predictions
- Operational ephemeris data (planned and actual positions)
- Maneuver plans and execution data
- Anomaly information
- End-of-life disposal data

**Respond to EUSST services:**
- Conjunction warnings: Assess and respond to collision risk
- Re-entry predictions: Provide information for objects under their control
- Fragmentation alerts: Cooperate in identifying debris sources

### SST and Registration Integration

The EU Space Act envisions close integration between the EU Space Registry and EUSST:

- Registered objects are cross-referenced with tracked objects
- Discrepancies (unregistered objects, untracked registered objects) trigger investigation
- Operational data from operators enriches SST products
- SST observations validate registration information

### International SST Cooperation

European SST data sharing extends beyond the EU:

- **US Space Surveillance Network**: Data sharing agreements for conjunction assessment
- **18th Space Defense Squadron**: Provides publicly available Two-Line Element sets
- **Combined Space Operations (CSpO)**: Multinational SST cooperation
- **International cooperation**: Bilateral agreements with non-EU space-faring nations

## Part 8: Deregistration at End of Life

### When Deregistration Occurs

Deregistration is the formal removal of a space object from the national and international registries. It typically occurs when:

1. **Controlled re-entry**: The object has been intentionally de-orbited and has re-entered the atmosphere
2. **Natural re-entry**: The object has naturally decayed and re-entered
3. **Transfer of registration**: Ownership and registration responsibility transfer to another state
4. **Object no longer in space**: The object has been captured, serviced, or otherwise removed from orbit

### Deregistration Process

**Step 1: Confirm end-of-life status**
- Verify that the space object has completed its mission
- Confirm disposal operations are complete (deorbit, graveyard orbit, passivation)
- Obtain SST confirmation that the object is no longer in its operational orbit (for re-entry) or has reached its disposal orbit

**Step 2: Notify national registry**
- Submit deregistration request to the national registry authority
- Provide evidence of disposal (telemetry, tracking data, operator confirmation)
- Include final orbital state and disposal date

**Step 3: Notify UNOOSA**
- The registering state submits a status change notification to UNOOSA
- Notification includes the date of re-entry or disposal and final status
- UNOOSA updates the international register

**Step 4: Update EU Space Registry**
- Under the EU Space Act, update the EU Space Registry with disposal status
- NCA confirms deregistration in coordination with EUSPA

### Challenges in Deregistration

**Objects in graveyard orbits**: GEO satellites moved to graveyard orbits are not "removed" from space but are no longer operational. They may be marked as "disposed/passivated" rather than fully deregistered.

**Uncontrolled re-entries**: When an object re-enters without precise control, the exact time and location of re-entry may be uncertain. EUSST and other SST providers can help determine the re-entry window.

**Legacy objects**: Many historical space objects were never properly registered or have incomplete records. Identifying and updating these records is an ongoing challenge.

**Debris from registered objects**: If a registered object generates debris (through collision or breakup), the fragments may need to be registered separately or noted in the parent object's record.

## Part 9: Transfer of Registration Between States

### Why Transfers Occur

Space objects are increasingly traded as commercial assets. A satellite may be:
- Sold to an operator in a different state
- Transferred as part of a corporate acquisition
- Reassigned within a multinational corporate group
- Leased to an operator under a different jurisdiction

### Legal Framework for Transfer

The UN Registration Convention does not explicitly address transfer of registration. However, General Assembly Resolution 62/101 (2007) recommends practices for transfer scenarios:

- The original registering state and the new state of registry should agree on the transfer
- Both states should notify the Secretary-General
- The new state should provide updated registration information
- The original state should note the transfer in its registry

### EU Space Act Transfer Provisions

The EU Space Act provides a more structured approach to transfer within the EU:

**Between EU member states:**
- Transfer of authorization must be approved by both the original and new NCAs
- Registration transfers automatically with the authorization
- The EU Space Registry is updated to reflect the new registering state
- UNOOSA is notified by the new registering state

**From EU to non-EU state:**
- The operator must comply with end-of-authorization obligations
- The NCA must be satisfied that the new state will assume registration and supervision
- Export control considerations may apply
- The EU Space Registry entry is updated to reflect the transfer

**From non-EU state to EU:**
- The new EU operator must obtain authorization from their NCA
- Registration in the national registry and EU Space Registry follows authorization
- Previous registration history should be documented

### Practical Considerations for Transfer

Operators involved in transfers should:

1. Engage both the original and new NCAs early in the process
2. Ensure continuity of insurance coverage during the transfer
3. Address spectrum and frequency coordination transfer
4. Update all relevant registries (national, EU, UNOOSA, ITU)
5. Coordinate with SST providers to maintain tracking continuity
6. Document the transfer comprehensively for liability purposes

## Part 10: Step-by-Step Registration Process

### For a New Mission

Here is a practical step-by-step guide for registering a new space object:

**Phase 1: Pre-Authorization**
1. Identify the registering state (based on launching state criteria and operator nationality)
2. Confirm the registering state is party to the Registration Convention
3. Review national registration requirements of the registering state
4. Include registration plan in authorization application

**Phase 2: Authorization to Launch**
5. Receive authorization from NCA (registration pre-conditions should be met)
6. Pre-register the planned space object in the national registry
7. Obtain national registration number/designator
8. Pre-register in the EU Space Registry (if EU operator)

**Phase 3: Launch and Early Operations**
9. Confirm successful launch and provide actual launch data within 7 days
10. Receive COSPAR international designator
11. Provide confirmed orbital parameters within 30 days
12. Update national registry with operational data

**Phase 4: International Registration**
13. National administration prepares UNOOSA notification
14. Notification submitted to the Secretary-General
15. UNOOSA records the information in the international register
16. Verify the entry appears in the UNOOSA Online Index

**Phase 5: Operational Maintenance**
17. Update registration for any significant orbital changes
18. Notify registry of status changes (operational issues, safe mode, etc.)
19. Update for ownership or operator changes
20. Maintain consistency between national, EU, and UNOOSA records

**Phase 6: End of Life**
21. Notify registry of end-of-life operations commencing
22. Update with disposal status upon completion
23. Submit deregistration request (for re-entered objects) or status update (graveyard orbit)
24. Confirm UNOOSA notification of status change
25. Archive all registration documentation

### Required Documents Checklist

- [ ] Authorization application (includes registration plan)
- [ ] Pre-registration form for national registry
- [ ] Launch notification with orbital parameters
- [ ] Post-launch confirmation with actual data
- [ ] COSPAR designator assignment confirmation
- [ ] UNOOSA notification form
- [ ] Status change notifications (as needed)
- [ ] Transfer documentation (if applicable)
- [ ] End-of-life disposal confirmation
- [ ] Deregistration request

## How Caelex Helps

Caelex streamlines the registration process as part of your overall compliance management:

- **Registration Tracking**: Monitor the status of registration across national, EU, and UN registries for all your space objects in a unified dashboard
- **Deadline Reminders**: Automated alerts for post-launch registration deadlines, update requirements, and UNOOSA notification timelines
- **Document Generation**: Pre-populate registration forms and notification templates with data from your authorization application
- **Multi-Object Management**: Track registration for entire constellations with batch update capabilities
- **Compliance Integration**: Link registration status to authorization conditions, ensuring registration gaps do not affect your authorization
- **Transfer Support**: Guided workflows for transferring registration between states during asset sales or corporate restructuring

Start your compliance assessment to see how registration fits into your overall regulatory obligations.

## Conclusion

Space object registration is a foundational obligation that connects international treaty law, European regulation, and national licensing requirements. While it may seem like administrative paperwork compared to the technical excitement of building and launching satellites, proper registration is essential for establishing legal responsibility, enabling space surveillance, and maintaining the international order that allows space activities to proceed peacefully. The EU Space Act raises the bar for European operators by requiring more detailed and timely registration, integrated with the authorization and supervision framework. Operators who build registration into their compliance processes from the outset will find it straightforward and painless. Those who treat it as an afterthought risk gaps that can complicate authorization, insurance, and international liability. Register early, register completely, and keep your registrations current.
`,
  },
];
