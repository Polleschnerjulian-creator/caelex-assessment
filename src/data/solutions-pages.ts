import type { FooterPageData } from "@/components/landing/FooterPageTemplate";

export const solutionPages: FooterPageData[] = [
  {
    slug: "regulatory-compliance",
    title: "Regulatory Compliance",
    tagline:
      "End-to-end compliance management across the EU Space Act, NIS2, and 10 national space laws.",
    description:
      "Caelex maps your mission profile against 119 articles of the EU Space Act (COM(2025) 335), the full NIS2 Directive, and national space legislation across 10 European jurisdictions. The platform identifies applicable requirements, scores your compliance posture, and generates actionable remediation plans. Operators maintain a single source of truth for every regulatory obligation from pre-launch authorization through end-of-life disposal.",
    features: [
      {
        title: "Multi-Regulation Mapping",
        description:
          "Automatically cross-references your operator profile against the EU Space Act, NIS2, and national laws to surface every applicable requirement in one unified view.",
      },
      {
        title: "Continuous Compliance Scoring",
        description:
          "Real-time scoring across all regulatory domains with drill-down to individual article-level compliance status and gap identification.",
      },
      {
        title: "Remediation Planning",
        description:
          "Prioritized action items with deadlines, responsible parties, and direct links to the regulatory text driving each obligation.",
      },
    ],
  },
  {
    slug: "authorization-licensing",
    title: "Authorization & Licensing",
    tagline:
      "Guided workflows for space activity authorization applications to National Competent Authorities.",
    description:
      "Caelex walks operators through the full authorization lifecycle required by the EU Space Act and national space laws. The platform pre-populates application forms from your mission profile, validates completeness against NCA requirements, and packages submissions with all supporting documentation. Each application is tracked from draft through NCA review to final approval.",
    features: [
      {
        title: "Application Builder",
        description:
          "Step-by-step guided workflows pre-populated from your mission data, ensuring every field and attachment required by the target NCA is addressed.",
      },
      {
        title: "Completeness Validation",
        description:
          "Automated checks against jurisdiction-specific requirements flag missing documents, incomplete fields, and formatting issues before submission.",
      },
      {
        title: "Lifecycle Tracking",
        description:
          "Track each authorization from initial application through NCA review, information requests, conditional approvals, and final issuance.",
      },
    ],
  },
  {
    slug: "cybersecurity-nis2",
    title: "Cybersecurity & NIS2",
    tagline:
      "NIS2 Directive compliance with 51 requirements, gap analysis, and incident response planning.",
    description:
      "Caelex implements the full NIS2 Directive (EU 2022/2555) scoped specifically for space operators. The platform classifies your entity as essential or important, maps all 51 cybersecurity requirements to your operations, and identifies gaps against ENISA space-specific controls. Incident response playbooks enforce the 24-hour, 72-hour, and one-month notification timelines mandated by NIS2.",
    features: [
      {
        title: "Entity Classification",
        description:
          "Automated classification as essential or important entity based on operator type, revenue thresholds, and criticality criteria defined in NIS2 Annex I/II.",
      },
      {
        title: "Gap Analysis Engine",
        description:
          "Maps your current security posture against all 51 NIS2 requirements and ENISA space-specific controls, scoring each with evidence-based compliance levels.",
      },
      {
        title: "Incident Response Playbooks",
        description:
          "Pre-built response workflows aligned to NIS2 notification timelines with automated escalation paths and CSIRT reporting templates.",
      },
    ],
  },
  {
    slug: "debris-mitigation",
    title: "Debris Mitigation",
    tagline:
      "Debris mitigation planning per EU Space Act Art. 58-73 and IADC guidelines with orbital lifetime analysis.",
    description:
      "Caelex generates debris mitigation plans that satisfy EU Space Act Articles 58 through 73 and align with IADC Space Debris Mitigation Guidelines. The platform integrates orbital mechanics models to compute post-mission disposal timelines, collision avoidance maneuver budgets, and passivation sequences. Operators demonstrate compliance with the 25-year rule and upcoming zero-debris targets through auditable, regulator-ready documentation.",
    features: [
      {
        title: "Disposal Planning",
        description:
          "Computes orbital decay timelines, delta-v budgets for controlled deorbit, and graveyard orbit insertion parameters using SGP4/SDP4 propagation models.",
      },
      {
        title: "IADC Alignment",
        description:
          "Tracks compliance against all IADC guideline categories including collision avoidance, passivation, post-mission disposal, and design-for-demise measures.",
      },
      {
        title: "Regulator-Ready DMPs",
        description:
          "Auto-generates Debris Mitigation Plans formatted for NCA submission with full traceability to EU Space Act articles and COPUOS guidelines.",
      },
    ],
  },
  {
    slug: "environmental-impact",
    title: "Environmental Impact",
    tagline:
      "Environmental Footprint Declaration per ISO 14040/14044 lifecycle assessment standards.",
    description:
      "Caelex produces Environmental Footprint Declarations as required by the EU Space Act's environmental provisions. The platform applies ISO 14040/14044 lifecycle assessment methodology across launch emissions, orbital operations, and end-of-life disposal. Operators quantify their environmental impact with auditable data and demonstrate compliance with emerging sustainability requirements in European space regulation.",
    features: [
      {
        title: "Lifecycle Assessment",
        description:
          "Full ISO 14040/14044-compliant LCA covering manufacturing, launch, orbital operations, and disposal phases with quantified impact categories.",
      },
      {
        title: "Footprint Declaration",
        description:
          "Generates standardized Environmental Footprint Declarations ready for regulatory submission and stakeholder disclosure.",
      },
      {
        title: "Sustainability Benchmarking",
        description:
          "Compares your mission's environmental impact against industry baselines and identifies reduction opportunities across the lifecycle.",
      },
    ],
  },
  {
    slug: "insurance-requirements",
    title: "Insurance Requirements",
    tagline:
      "Third-party liability insurance analysis, coverage gap detection, and jurisdiction-specific obligations.",
    description:
      "Caelex analyzes your insurance obligations under EU Space Act Articles 47 through 50 and applicable national space laws. The platform evaluates your third-party liability coverage against regulatory minimums, detects gaps in policy terms, and models exposure across launch, in-orbit, and re-entry phases. Operators receive jurisdiction-specific guidance on mandatory insurance levels and evidence packaging for NCA submissions.",
    features: [
      {
        title: "Coverage Gap Detection",
        description:
          "Compares your current TPL insurance policies against regulatory minimums for each mission phase and jurisdiction, highlighting shortfalls and exclusion risks.",
      },
      {
        title: "Exposure Modeling",
        description:
          "Models third-party liability exposure across launch, in-orbit operations, and re-entry based on orbital parameters, population density, and mission architecture.",
      },
      {
        title: "Jurisdiction Mapping",
        description:
          "Maps insurance requirements across all 10 supported European jurisdictions with specific thresholds, accepted insurers, and evidence formats for each NCA.",
      },
    ],
  },
  {
    slug: "spectrum-itu-filing",
    title: "Spectrum & ITU Filing",
    tagline:
      "ITU frequency filings, spectrum licensing, and RF coordination for space operations.",
    description:
      "Caelex manages the end-to-end spectrum licensing process from ITU Advance Publication Information through coordination and notification filings. The platform tracks filing deadlines, manages RF coordination with affected administrations, and ensures compliance with ITU Radio Regulations and national frequency allocation requirements. Operators maintain a complete record of all spectrum rights and obligations.",
    features: [
      {
        title: "Filing Management",
        description:
          "Tracks ITU API, coordination, and notification filings with automated deadline monitoring and status updates through each stage of the filing process.",
      },
      {
        title: "RF Coordination",
        description:
          "Manages bilateral coordination with affected administrations including interference analysis documentation and coordination agreement tracking.",
      },
      {
        title: "Spectrum Compliance",
        description:
          "Monitors ongoing compliance with ITU Radio Regulations and national frequency allocation tables, flagging potential conflicts or expiring authorizations.",
      },
    ],
  },
  {
    slug: "export-control",
    title: "Export Control (ITAR/EAR)",
    tagline:
      "ITAR, EAR, and EU dual-use export control compliance for space technology.",
    description:
      "Caelex classifies your space technology against ITAR's US Munitions List, EAR's Commerce Control List, and the EU Dual-Use Regulation. The platform screens transactions against denied-party lists, manages Technology Assistance Agreements and Technical Data Packages, and generates compliance documentation for each export. Teams maintain full audit trails for every controlled item, technology transfer, and end-user certification.",
    features: [
      {
        title: "Classification Engine",
        description:
          "Classifies components and technology against USML categories, ECCN codes, and EU Dual-Use Annex entries with reasoning chains for each determination.",
      },
      {
        title: "Denied Party Screening",
        description:
          "Real-time screening against consolidated restricted party lists including OFAC SDN, BIS Entity List, and EU sanctions with continuous monitoring for changes.",
      },
      {
        title: "License & Agreement Tracking",
        description:
          "Manages TAAs, MLAs, license applications, and exemption determinations with expiration tracking and usage reporting against license terms.",
      },
    ],
  },
  {
    slug: "document-generation",
    title: "Document Generation",
    tagline:
      "AI-powered regulatory documents generated from your compliance data using Claude.",
    description:
      "Caelex generates NCA-submission-ready documents directly from your compliance data using Claude. The platform produces Debris Mitigation Plans, cybersecurity policies, Environmental Footprint Declarations, insurance certificates, and full compliance reports. Each document is pre-formatted to NCA specifications, populated with data from your assessments, and includes regulatory cross-references to the applicable articles and requirements.",
    features: [
      {
        title: "Claude-Powered Drafting",
        description:
          "Generates complete regulatory documents from your assessment data and mission profile using Claude, with domain-specific prompts tuned to each document type.",
      },
      {
        title: "NCA-Ready Formatting",
        description:
          "Outputs documents in the exact formats and structures expected by National Competent Authorities, eliminating manual reformatting and reducing rejection risk.",
      },
      {
        title: "Regulatory Traceability",
        description:
          "Every generated section includes citations to the specific EU Space Act articles, NIS2 requirements, or national law provisions it addresses.",
      },
    ],
  },
  {
    slug: "compliance-monitoring",
    title: "Compliance Monitoring",
    tagline:
      "Continuous compliance scoring with drift detection and automated alerts.",
    description:
      "Caelex monitors your compliance posture around the clock. The platform computes daily compliance snapshots across all regulatory domains, detects score drift from configuration changes or regulatory updates, and triggers automated alerts when thresholds are breached. Teams receive early warning of emerging gaps before they become findings, with full historical trending for board reporting and NCA inquiries.",
    features: [
      {
        title: "Daily Compliance Snapshots",
        description:
          "Automated daily scoring across every regulatory domain with historical trending, enabling operators to track compliance trajectory over time.",
      },
      {
        title: "Drift Detection",
        description:
          "Identifies compliance score changes caused by configuration updates, new regulatory requirements, or expiring documentation and flags them for review.",
      },
      {
        title: "Threshold Alerts",
        description:
          "Configurable alerting rules that notify teams via email and in-app notifications when compliance scores drop below defined thresholds.",
      },
    ],
  },
  {
    slug: "nca-submissions",
    title: "NCA Submissions",
    tagline:
      "Prepare, package, and track National Competent Authority submissions end to end.",
    description:
      "Caelex manages the full NCA submission pipeline from document preparation through authority review and final disposition. The platform assembles submission packages with all required attachments, validates them against jurisdiction-specific checklists, and tracks correspondence with the authority. Operators have complete visibility into submission status, information requests, and approval conditions across all active applications.",
    features: [
      {
        title: "Package Assembly",
        description:
          "Assembles complete submission packages from your document vault, validates against NCA checklists, and flags missing or outdated materials before dispatch.",
      },
      {
        title: "Correspondence Tracking",
        description:
          "Logs all NCA communications with timestamps, links correspondence to specific submission items, and tracks response deadlines for information requests.",
      },
      {
        title: "Status Pipeline",
        description:
          "Visual pipeline view of all active submissions across jurisdictions with stage-by-stage tracking from draft through NCA review to final disposition.",
      },
    ],
  },
  {
    slug: "audit-evidence",
    title: "Audit & Evidence",
    tagline:
      "SHA-256 hash-chain audit trail with tamper-evident logging and evidence collection.",
    description:
      "Caelex maintains a cryptographically verifiable audit trail of every compliance action, document change, and system event. Each audit entry is linked to the previous via SHA-256 hash chain, making tampering mathematically detectable. The platform collects and organizes evidence against specific regulatory requirements, producing audit-ready packages that satisfy both internal governance and external regulatory examination.",
    features: [
      {
        title: "Hash-Chain Integrity",
        description:
          "Every audit log entry includes a SHA-256 hash linking it to the previous entry, creating a tamper-evident chain that can be independently verified.",
      },
      {
        title: "Evidence Collection",
        description:
          "Maps collected evidence — documents, screenshots, system logs, attestations — directly to the regulatory requirements they satisfy.",
      },
      {
        title: "Audit-Ready Packages",
        description:
          "Generates comprehensive evidence packages organized by regulatory domain, ready for internal auditors or NCA examination with integrity verification reports.",
      },
    ],
  },
  {
    slug: "stakeholder-network",
    title: "Stakeholder Network",
    tagline:
      "Supply chain attestations, data rooms, and stakeholder engagement for space compliance.",
    description:
      "Caelex connects operators with their supply chain partners, subcontractors, and regulatory stakeholders in a shared compliance environment. The platform manages supplier attestations against specific regulatory requirements, hosts secure data rooms for document exchange, and provides a stakeholder portal for external parties to submit evidence and track their obligations. Every interaction is logged with full audit traceability.",
    features: [
      {
        title: "Compliance Attestations",
        description:
          "Suppliers and subcontractors submit attestations against specific regulatory requirements with evidence uploads, validated against your compliance framework.",
      },
      {
        title: "Secure Data Rooms",
        description:
          "Token-gated data rooms with granular access controls, document watermarking, and activity logging for sharing sensitive compliance materials.",
      },
      {
        title: "Stakeholder Portal",
        description:
          "External-facing portal where supply chain partners view their obligations, upload evidence, and track attestation status without requiring a full platform license.",
      },
    ],
  },
  {
    slug: "mission-timeline",
    title: "Mission Timeline Planning",
    tagline:
      "Mission milestones, regulatory deadlines, and compliance deliverable tracking in one timeline.",
    description:
      "Caelex integrates mission milestones with regulatory deadlines and compliance deliverable due dates into a unified timeline. The platform automatically schedules regulatory submissions based on your mission phases, sends reminders as deadlines approach, and identifies scheduling conflicts between technical milestones and compliance obligations. Teams plan with full visibility into when each regulatory deliverable must be completed relative to mission-critical dates.",
    features: [
      {
        title: "Unified Timeline",
        description:
          "Combines mission phases, technical milestones, regulatory deadlines, and compliance deliverables into a single Gantt-style view with dependency tracking.",
      },
      {
        title: "Automated Scheduling",
        description:
          "Calculates regulatory submission deadlines from your mission timeline and NCA processing windows, automatically adjusting as milestones shift.",
      },
      {
        title: "Deadline Alerts",
        description:
          "Configurable reminders at multiple intervals before each deadline with escalation paths when deliverables remain incomplete.",
      },
    ],
  },
  {
    slug: "incident-management",
    title: "Incident Management",
    tagline:
      "NIS2-compliant incident response with 24-hour, 72-hour, and one-month notification workflows.",
    description:
      "Caelex implements the NIS2 Directive's three-phase incident notification framework for space operators. The platform guides teams through initial assessment, early warning submission within 24 hours, detailed notification within 72 hours, and final report within one month. Each phase includes pre-built templates, approval workflows, and CSIRT submission tracking. Historical incidents are catalogued for pattern analysis and reporting to management bodies.",
    features: [
      {
        title: "Three-Phase Workflow",
        description:
          "Structured incident response following NIS2's 24-hour early warning, 72-hour incident notification, and one-month final report timeline with countdown tracking.",
      },
      {
        title: "CSIRT Reporting",
        description:
          "Pre-formatted notification templates for Computer Security Incident Response Teams with auto-populated fields from your incident assessment data.",
      },
      {
        title: "Incident Catalogue",
        description:
          "Historical incident database with classification, root cause analysis, and pattern detection to identify systemic risks and improve response procedures.",
      },
    ],
  },
  {
    slug: "authorization-workflow",
    title: "Authorization Workflow",
    tagline:
      "State-machine driven authorization tracking from initial application to final approval.",
    description:
      "Caelex models the authorization process as a formal state machine with defined transitions between application stages. The platform enforces that all prerequisites are met before advancing to the next state, tracks conditions attached to approvals, and manages the full lifecycle including modifications, renewals, and revocations. Every state transition is logged with the responsible party, timestamp, and supporting documentation.",
    features: [
      {
        title: "State Machine Engine",
        description:
          "Formal state-machine model with validated transitions ensures authorizations progress through the correct sequence with all prerequisites satisfied.",
      },
      {
        title: "Condition Management",
        description:
          "Tracks conditions attached to authorizations with evidence requirements, compliance deadlines, and automated status monitoring for each condition.",
      },
      {
        title: "Lifecycle Management",
        description:
          "Manages the full authorization lifecycle including initial grant, modifications, renewals, suspensions, and revocations with complete transition history.",
      },
    ],
  },
  {
    slug: "registration-management",
    title: "Registration Management",
    tagline:
      "UNOOSA registration and national registry compliance for space objects.",
    description:
      "Caelex manages space object registration with UNOOSA and national registries as required by the Registration Convention and EU Space Act. The platform prepares registration submissions with all required orbital parameters, tracks registration status across multiple jurisdictions, and monitors for changes that require registry updates. Operators maintain full traceability from launch notification through registry confirmation.",
    features: [
      {
        title: "UNOOSA Submissions",
        description:
          "Prepares Registration Convention-compliant submissions with orbital parameters, launching state information, and general function descriptions in the required format.",
      },
      {
        title: "National Registry Tracking",
        description:
          "Tracks registration status across all applicable national registries with jurisdiction-specific requirements and submission formats for each registry.",
      },
      {
        title: "Change Management",
        description:
          "Monitors orbital changes, ownership transfers, and status updates that require registry amendments, automatically flagging events that trigger notification obligations.",
      },
    ],
  },
  {
    slug: "compliance-forecasting",
    title: "Compliance Forecasting",
    tagline:
      "Predictive compliance modeling using orbital mechanics and subsystem degradation data.",
    description:
      "Caelex forecasts future compliance states by combining orbital mechanics propagation with subsystem degradation models. The platform predicts when debris mitigation timelines will be breached, when fuel reserves will drop below deorbit thresholds, and when subsystem failures could trigger regulatory non-compliance. Operators see compliance forecast curves extending months ahead, enabling proactive remediation before regulatory violations materialize.",
    features: [
      {
        title: "Orbital Decay Forecasting",
        description:
          "Propagates orbital trajectories using atmospheric density models and solar flux data to predict 25-year rule compliance and disposal timeline adherence.",
      },
      {
        title: "Subsystem Degradation Models",
        description:
          "Models fuel depletion, battery capacity loss, solar panel degradation, and thruster wear to predict when operational constraints will impact compliance.",
      },
      {
        title: "What-If Simulation",
        description:
          "Simulates the compliance impact of maneuver decisions, orbit changes, and mission extensions before committing to operational changes.",
      },
    ],
  },
  {
    slug: "supply-chain-security",
    title: "Supply Chain Security",
    tagline:
      "NIS2 Article 78 supply chain risk assessment and supplier compliance scoring.",
    description:
      "Caelex implements NIS2 Article 78 supply chain security requirements for space operators. The platform assesses cybersecurity risks across your supplier network, scores each supplier against NIS2 controls, and monitors for changes in supplier risk posture. Operators can enforce minimum security standards through contractual requirement templates and track supplier attestation completeness across the entire supply chain.",
    features: [
      {
        title: "Supplier Risk Scoring",
        description:
          "Scores each supplier against NIS2 cybersecurity requirements with weighted risk factors including criticality, access level, and geographic jurisdiction.",
      },
      {
        title: "Continuous Monitoring",
        description:
          "Tracks changes in supplier risk posture including security incident disclosures, certification lapses, and attestation expirations across your supply chain.",
      },
      {
        title: "Contractual Templates",
        description:
          "NIS2-aligned contract clauses and security requirement templates that can be enforced as prerequisites for supplier onboarding and renewal.",
      },
    ],
  },
  {
    slug: "satellite-tracking",
    title: "Satellite Tracking",
    tagline:
      "3D orbital visualization, conjunction assessment, and compliance state monitoring.",
    description:
      "Caelex provides real-time 3D visualization of your satellite constellation with compliance state overlays. The platform ingests TLE data from CelesTrak, propagates orbits using SGP4, and performs conjunction assessment against the public catalog. Each object's compliance state — authorization status, debris mitigation adherence, registration completeness — is displayed directly on the orbital view, giving operators immediate situational awareness.",
    features: [
      {
        title: "3D Orbital Visualization",
        description:
          "Interactive Three.js globe with real-time satellite positions, orbit traces, and ground tracks rendered from current TLE data and SGP4 propagation.",
      },
      {
        title: "Conjunction Assessment",
        description:
          "Screens your objects against the public catalog for close approaches, computes probability of collision, and logs conjunction events with response actions.",
      },
      {
        title: "Compliance Overlay",
        description:
          "Projects compliance state directly onto each tracked object — authorization status, debris plan adherence, registration completeness — for immediate visual assessment.",
      },
    ],
  },
  {
    slug: "regulatory-arbitrage",
    title: "Regulatory Arbitrage",
    tagline:
      "Compare requirements across 10 European jurisdictions to optimize your authorization strategy.",
    description:
      "Caelex analyzes regulatory requirements across all 10 supported European jurisdictions to identify the most favorable authorization pathway for your mission. The platform compares insurance thresholds, debris mitigation standards, cybersecurity obligations, and processing timelines jurisdiction by jurisdiction. Operators make data-driven decisions about where to seek authorization based on quantified regulatory burden, cost implications, and timeline impact.",
    features: [
      {
        title: "Jurisdiction Comparison",
        description:
          "Side-by-side comparison of regulatory requirements across 10 European jurisdictions covering authorization, insurance, debris, cybersecurity, and registration domains.",
      },
      {
        title: "Favorability Scoring",
        description:
          "Quantified scoring of each jurisdiction's regulatory burden for your specific mission profile, weighted by cost, complexity, and processing timeline.",
      },
      {
        title: "Authorization Strategy",
        description:
          "Recommends optimal jurisdiction selection with detailed rationale, cross-reference analysis, and identification of requirements unique to each jurisdiction.",
      },
    ],
  },
];
