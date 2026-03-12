import type { FooterPageData } from "@/components/landing/FooterPageTemplate";

export const capabilityPages: FooterPageData[] = [
  {
    slug: "ai-powered-analysis",
    title: "AI-Powered Analysis",
    tagline:
      "Claude-powered compliance analysis that identifies gaps, maps obligations, and generates actionable remediation paths.",
    description:
      "Caelex integrates Anthropic's Claude to perform deep semantic analysis of your operational profile against applicable regulatory frameworks. The engine parses operator type, mission parameters, and jurisdiction to identify which of 119 EU Space Act articles, 51 NIS2 requirements, and national obligations apply — then scores compliance across every dimension. Remediation recommendations are generated with specific evidence requirements and priority ordering based on regulatory deadlines and risk severity.",
    features: [
      {
        title: "Contextual Gap Identification",
        description:
          "Compares your operational data against regulation-specific requirement matrices to surface exactly which obligations are unmet, partially met, or at risk of lapsing.",
      },
      {
        title: "Structured Remediation Plans",
        description:
          "Generates prioritized action items with evidence requirements, responsible party assignments, and deadline-aware scheduling tied to your authorization timeline.",
      },
      {
        title: "Multi-Framework Reasoning",
        description:
          "Simultaneously evaluates compliance across EU Space Act, NIS2, national laws, and international standards — resolving conflicts and identifying overlapping obligations.",
      },
    ],
  },
  {
    slug: "real-time-monitoring",
    title: "Real-Time Monitoring",
    tagline:
      "Continuous compliance state tracking with automated alerts on orbital, operational, and regulatory changes.",
    description:
      "The monitoring system maintains a live compliance state for every registered spacecraft and operator profile. It ingests orbital data from CelesTrak, tracks regulatory feed updates, and monitors subsystem telemetry through Sentinel agents. When any input changes — a new TLE, an updated regulation, a lapsed document — the system recalculates affected compliance scores and triggers alerts through configurable notification channels.",
    features: [
      {
        title: "Orbital State Awareness",
        description:
          "Processes TLE updates and propagates orbits using SGP4/SDP4 to detect altitude decay, conjunction risks, and deorbit timeline deviations that affect debris compliance.",
      },
      {
        title: "Regulatory Change Detection",
        description:
          "Polls regulatory sources daily and maps changes against your active obligations, flagging requirements that are new, modified, or approaching enforcement dates.",
      },
      {
        title: "Configurable Alert Channels",
        description:
          "Routes compliance state changes through email, in-app notifications, and webhook integrations with severity-based filtering and escalation rules.",
      },
    ],
  },
  {
    slug: "document-automation",
    title: "Document Automation",
    tagline:
      "AI-generated, NCA-submission-ready documents built directly from your assessment and compliance data.",
    description:
      "The document generation studio transforms structured compliance data into formatted documents that meet National Competent Authority submission requirements. Templates cover authorization applications, incident reports, compliance certificates, supervision reports, and annual filings. Each generated document pulls live data from your compliance profile, embeds cryptographic attestation metadata, and follows the formatting conventions expected by regulators across 10 European jurisdictions.",
    features: [
      {
        title: "Template-Driven Generation",
        description:
          "Eight report types with jurisdiction-aware templates that adapt structure, language, and required fields to match the target NCA's submission format.",
      },
      {
        title: "Live Data Binding",
        description:
          "Documents pull directly from your compliance scores, assessment results, evidence vault, and organizational profile — eliminating manual data entry and copy errors.",
      },
      {
        title: "Dual-Format Rendering",
        description:
          "Server-side PDF generation via jsPDF for API consumers and client-side rendering via React-PDF for interactive preview, both producing identical output.",
      },
    ],
  },
  {
    slug: "cryptographic-attestation",
    title: "Cryptographic Attestation",
    tagline:
      "Ed25519 digital signatures and hash-chain verification for tamper-proof compliance certificates.",
    description:
      "The Verity subsystem issues compliance certificates that are cryptographically signed using Ed25519 key pairs bound to issuer identities. Each certificate includes a content hash, signature, issuer key fingerprint, and chain reference to the previous attestation. Verification is stateless — any party with the issuer's public key can validate a certificate's authenticity and integrity without contacting Caelex. Certificates reference specific compliance states at specific points in time, creating an auditable history of compliance claims.",
    features: [
      {
        title: "Ed25519 Digital Signatures",
        description:
          "Each compliance certificate is signed with the issuer's Ed25519 private key, producing a compact 64-byte signature that is computationally infeasible to forge.",
      },
      {
        title: "Issuer Key Management",
        description:
          "Issuer keys are generated per-organization, stored encrypted at rest, and support rotation with automatic re-signing of active certificates during key transitions.",
      },
      {
        title: "Stateless Verification",
        description:
          "Third parties verify certificate authenticity using only the public key and certificate data — no API call to Caelex required, enabling offline and air-gapped verification.",
      },
    ],
  },
  {
    slug: "zero-knowledge-proofs",
    title: "Zero-Knowledge Proofs",
    tagline:
      "Prove compliance status to third parties without revealing sensitive operational data.",
    description:
      "Caelex generates zero-knowledge proofs that allow operators to demonstrate compliance with specific regulatory requirements without disclosing the underlying evidence. An insurer can verify debris compliance without seeing orbital parameters. An NCA can confirm cybersecurity posture without accessing network architecture diagrams. The proof system operates over the cryptographic attestation layer, linking proofs to signed compliance states while revealing only the boolean compliance assertion and its validity period.",
    features: [
      {
        title: "Selective Disclosure",
        description:
          "Operators choose exactly which compliance dimensions to prove — module-level, requirement-level, or aggregate score — while keeping all supporting data private.",
      },
      {
        title: "Verifiable Claims",
        description:
          "Each proof is anchored to a Verity-signed compliance certificate, ensuring the proven state was independently attested and has not been modified since issuance.",
      },
      {
        title: "Third-Party Integration",
        description:
          "Proofs can be shared via stakeholder portal links, embedded in data room packages, or transmitted through the API for automated supply-chain compliance verification.",
      },
    ],
  },
  {
    slug: "orbital-mechanics-engine",
    title: "Orbital Mechanics Engine",
    tagline:
      "SGP4/SDP4 propagation, atmospheric drag modeling, and TLE processing for compliance-aware orbital analysis.",
    description:
      "The ephemeris subsystem processes Two-Line Element sets from CelesTrak and propagates orbits using the SGP4 model for near-Earth objects and SDP4 for deep-space objects via the satellite.js library. Atmospheric drag modeling incorporates solar flux data (F10.7) and geomagnetic indices to predict orbital decay trajectories. Fuel depletion analysis models remaining delta-v against required disposal maneuvers. These physics outputs feed directly into compliance engines — determining whether a spacecraft will meet its 25-year deorbit obligation, maintain authorized orbital parameters, and retain sufficient fuel reserves for end-of-life disposal.",
    features: [
      {
        title: "SGP4/SDP4 Propagation",
        description:
          "Ingests NORAD TLE data and propagates position and velocity states forward in time, accounting for J2 perturbations, atmospheric drag, and solar radiation pressure.",
      },
      {
        title: "Atmospheric Drag Modeling",
        description:
          "Incorporates daily solar flux polling and geomagnetic activity indices to model drag-induced orbital decay with uncertainty bounds across solar cycle predictions.",
      },
      {
        title: "Fuel Depletion Analysis",
        description:
          "Tracks remaining propellant against planned maneuver budgets and regulatory disposal requirements to predict when fuel reserves become compliance-critical.",
      },
    ],
  },
  {
    slug: "predictive-compliance",
    title: "Predictive Compliance",
    tagline:
      "Forecast compliance state using orbital decay, subsystem degradation, and regulatory timeline models.",
    description:
      "The forecast engine projects compliance state forward in time by combining physics models with regulatory timeline data. Orbital decay curves predict when altitude drops below authorized thresholds. Subsystem degradation models estimate when component lifetimes intersect reporting obligations. Regulatory timelines model upcoming enforcement dates, filing deadlines, and authorization renewals. The output is a compliance forecast curve — a time-series projection of your compliance score across every module, with confidence intervals and critical threshold crossings highlighted.",
    features: [
      {
        title: "Compliance Forecast Curves",
        description:
          "Time-series projections of per-module compliance scores with confidence intervals, showing exactly when and why compliance state is expected to change.",
      },
      {
        title: "Subsystem Degradation Models",
        description:
          "Models component wear, battery capacity loss, and thermal cycling effects to predict when hardware degradation triggers reporting or re-authorization requirements.",
      },
      {
        title: "Threshold Alerting",
        description:
          "Identifies future dates where projected compliance scores cross critical thresholds, giving operators weeks or months of lead time to take corrective action.",
      },
    ],
  },
  {
    slug: "hash-chain-audit-trail",
    title: "Hash-Chain Audit Trail",
    tagline:
      "SHA-256 linked audit entries creating a tamper-evident chain for every compliance action.",
    description:
      "Every state-changing action in Caelex — assessment submissions, document uploads, compliance score changes, user access events — is recorded as an AuditLog entry containing a SHA-256 hash of its contents concatenated with the previous entry's hash. This creates a linked chain where modifying any historical entry would invalidate all subsequent hashes. The audit system captures IP address, user agent, authenticated identity, entity type, and a structured diff of what changed. Chain integrity can be verified at any time by recomputing hashes from the genesis entry forward.",
    features: [
      {
        title: "Cryptographic Linking",
        description:
          "Each audit entry includes a SHA-256 hash computed over its payload plus the previous entry's hash, making retroactive tampering computationally detectable.",
      },
      {
        title: "Comprehensive Event Capture",
        description:
          "Records IP address, user agent, authenticated user, action type, affected entity, and structured before/after diffs for every state-changing operation.",
      },
      {
        title: "On-Demand Verification",
        description:
          "Chain integrity validation recomputes the full hash sequence from genesis, flagging any entry where the stored hash diverges from the computed value.",
      },
    ],
  },
  {
    slug: "anomaly-detection",
    title: "Anomaly Detection",
    tagline:
      "Behavioral analysis identifying unusual access patterns, data exfiltration, and policy violations.",
    description:
      "The anomaly detection engine analyzes user behavior patterns across authentication events, data access logs, and API usage to identify deviations from established baselines. It tracks login timing, geographic location, access frequency, data export volumes, and privilege escalation patterns. When activity deviates significantly from a user's historical profile or organizational norms, the system generates security events with severity classifications. Honey tokens placed in sensitive data fields provide high-confidence intrusion detection when accessed.",
    features: [
      {
        title: "Behavioral Baselining",
        description:
          "Builds per-user activity profiles from login patterns, access timing, and data interaction history to establish what constitutes normal behavior for each identity.",
      },
      {
        title: "Honey Token Detection",
        description:
          "Deploys decoy data fields across the platform that trigger immediate alerts when accessed, providing high-confidence indicators of unauthorized data access or exfiltration.",
      },
      {
        title: "Severity-Classified Events",
        description:
          "Generates structured security events with severity levels, affected entities, and recommended response actions routed to the audit center and notification system.",
      },
    ],
  },
  {
    slug: "risk-classification",
    title: "Risk Classification",
    tagline:
      "Automated risk scoring across debris, cybersecurity, environmental, and insurance domains.",
    description:
      "The risk classification engine evaluates operator risk across multiple regulatory domains using weighted scoring models. Each domain — debris mitigation, cybersecurity posture, environmental impact, insurance coverage, export control exposure — produces a normalized risk score derived from assessment responses, evidence availability, and compliance gap severity. Scores aggregate into the Regulatory Readiness Score (RRS) used by the Assure platform for investor due diligence, and the Regulatory Credit Rating (RCR) used for benchmarking against peer operators.",
    features: [
      {
        title: "Multi-Domain Scoring",
        description:
          "Computes independent risk scores across debris, cybersecurity, environmental, insurance, and export control domains, each using domain-specific weighting models.",
      },
      {
        title: "RRS and RCR Integration",
        description:
          "Risk scores feed into the Regulatory Readiness Score for investment assessment and the Regulatory Credit Rating for peer benchmarking and regulatory standing.",
      },
      {
        title: "Evidence-Weighted Confidence",
        description:
          "Risk scores incorporate evidence availability — a requirement backed by uploaded documentation scores differently than one relying solely on self-reported assertions.",
      },
    ],
  },
  {
    slug: "natural-language-processing",
    title: "Natural Language Processing",
    tagline:
      "AI extraction of regulatory requirements from legislation, guidance documents, and technical standards.",
    description:
      "Caelex uses large language models to parse regulatory texts — directives, regulations, national laws, guidance documents, and technical standards — and extract structured requirement objects. Each extracted requirement includes the source article, obligation type (mandatory, conditional, recommended), applicable operator types, compliance criteria, and cross-references to related provisions. This structured extraction powers the regulatory graph engine and ensures that the compliance assessment logic stays synchronized with the authoritative legal text as regulations evolve.",
    features: [
      {
        title: "Structured Requirement Extraction",
        description:
          "Transforms unstructured legal text into typed requirement objects with obligation levels, applicability conditions, and compliance acceptance criteria.",
      },
      {
        title: "Cross-Reference Resolution",
        description:
          "Identifies and links inter-article references, delegated act pointers, and standard incorporations to build a complete dependency map of regulatory obligations.",
      },
      {
        title: "Temporal Awareness",
        description:
          "Extracts effective dates, transition periods, and phase-in schedules from regulatory text to ensure compliance timelines reflect actual enforcement calendars.",
      },
    ],
  },
  {
    slug: "regulatory-graph-engine",
    title: "Regulatory Graph Engine",
    tagline:
      "Knowledge graph mapping regulations, requirements, articles, and compliance obligations into a queryable structure.",
    description:
      "The regulatory graph models the entire compliance landscape as a directed graph where nodes represent regulations, articles, requirements, operator types, and compliance actions. Edges encode relationships: 'requires', 'references', 'supersedes', 'exempts', 'applies_to'. This structure enables queries like 'which requirements apply to a LEO communications operator under French jurisdiction' to be resolved by graph traversal rather than hardcoded logic. The graph updates when new regulations are ingested or existing ones are amended, propagating changes to all affected compliance assessments.",
    features: [
      {
        title: "Relationship-Driven Queries",
        description:
          "Resolves complex compliance questions through graph traversal — following edges across regulations, jurisdictions, and operator types to determine applicable obligations.",
      },
      {
        title: "Change Propagation",
        description:
          "When a regulation is amended, the graph identifies all downstream requirements, assessments, and compliance scores affected, triggering targeted recalculation.",
      },
      {
        title: "Multi-Jurisdiction Resolution",
        description:
          "Maps overlapping and conflicting obligations across EU-level and national regulations, surfacing where jurisdictional requirements diverge or impose additional burdens.",
      },
    ],
  },
  {
    slug: "compliance-scoring",
    title: "Compliance Scoring",
    tagline:
      "Multi-dimensional scoring across 15 modules with weighted aggregation and trend analysis.",
    description:
      "The compliance scoring system computes per-module scores across all 15 compliance domains — authorization, registration, cybersecurity, debris, environmental, insurance, NIS2, supervision, COPUOS/IADC, export control, spectrum/ITU, UK Space Act, US regulatory, digital twin, and evidence. Each module score is a weighted function of requirement satisfaction, evidence strength, and gap severity. Module scores aggregate into an overall compliance posture score using configurable weights. Daily snapshots enable trend analysis, and the system detects score movements that indicate improving or deteriorating compliance trajectories.",
    features: [
      {
        title: "15-Module Coverage",
        description:
          "Independent scoring across every compliance domain — from debris mitigation to export control — with module-specific requirement weights and scoring rubrics.",
      },
      {
        title: "Weighted Aggregation",
        description:
          "Module scores combine into an overall compliance posture using configurable weights that can be adjusted to reflect organizational priorities or regulatory emphasis.",
      },
      {
        title: "Trend Detection",
        description:
          "Daily compliance snapshots power trend analysis that identifies score trajectories, flags deterioration patterns, and surfaces modules requiring immediate attention.",
      },
    ],
  },
  {
    slug: "automated-gap-analysis",
    title: "Automated Gap Analysis",
    tagline:
      "Detect missing evidence, incomplete requirements, and compliance gaps across all regulatory frameworks.",
    description:
      "The gap analysis engine continuously compares your current compliance state against the complete set of applicable requirements. It identifies three categories of gaps: missing evidence (a requirement exists but no supporting documentation is linked), incomplete requirements (partial compliance where some criteria are met but others are not), and unaddressed obligations (requirements that have not been assessed at all). Each gap is classified by severity, regulatory deadline proximity, and remediation complexity, producing a prioritized action queue that connects directly to the evidence collection and document generation workflows.",
    features: [
      {
        title: "Three-Tier Gap Classification",
        description:
          "Distinguishes between missing evidence, partially met requirements, and entirely unaddressed obligations — each requiring different remediation approaches.",
      },
      {
        title: "Priority Scoring",
        description:
          "Ranks gaps by regulatory deadline proximity, severity of non-compliance consequences, and estimated remediation effort to focus resources on highest-impact items.",
      },
      {
        title: "Workflow Integration",
        description:
          "Each identified gap links directly to evidence upload workflows, document generation templates, and Astra AI remediation guidance for streamlined resolution.",
      },
    ],
  },
  {
    slug: "cross-regulation-mapping",
    title: "Cross-Regulation Mapping",
    tagline:
      "Map overlapping requirements across EU Space Act, NIS2, national laws, and international standards.",
    description:
      "Space operators face overlapping obligations from multiple regulatory frameworks — the EU Space Act, NIS2 Directive, national authorization laws, COPUOS guidelines, ITU regulations, and export control regimes. The cross-regulation mapping engine maintains 47+ cross-references that link equivalent or related requirements across frameworks. When you satisfy a cybersecurity requirement under NIS2, the system identifies which EU Space Act and national law requirements are also partially or fully addressed. This eliminates duplicated compliance effort and ensures that evidence collected for one framework is automatically credited against overlapping obligations in others.",
    features: [
      {
        title: "Requirement Equivalence Detection",
        description:
          "Identifies where requirements across different frameworks address the same underlying obligation, enabling single-effort compliance across multiple regulations.",
      },
      {
        title: "Evidence Reuse",
        description:
          "Evidence linked to a requirement in one framework is automatically surfaced as applicable to equivalent requirements in other frameworks, eliminating redundant documentation.",
      },
      {
        title: "Conflict Identification",
        description:
          "Flags cases where requirements from different frameworks impose contradictory or incompatible obligations, surfacing conflicts that require jurisdiction-specific resolution.",
      },
    ],
  },
  {
    slug: "evidence-collection",
    title: "Evidence Collection",
    tagline:
      "Structured workflows linking evidence artifacts to specific regulatory requirements and compliance assertions.",
    description:
      "The evidence collection system provides structured workflows for uploading, categorizing, and linking documentary evidence to regulatory requirements. Each piece of evidence — documents, test reports, certifications, policies, procedures — is stored in an encrypted document vault with access logging, version tracking, and expiration monitoring. Evidence is linked to specific requirements through typed assertions that state what the evidence proves. The system tracks evidence coverage across all applicable requirements, surfacing gaps where obligations lack supporting documentation.",
    features: [
      {
        title: "Requirement-Linked Storage",
        description:
          "Every uploaded artifact is linked to one or more regulatory requirements through typed assertions, creating a traceable chain from obligation to supporting evidence.",
      },
      {
        title: "Encrypted Document Vault",
        description:
          "Evidence files are stored in S3-compatible storage with per-organization encryption keys, access logging, and configurable retention policies aligned to regulatory requirements.",
      },
      {
        title: "Coverage Tracking",
        description:
          "A real-time evidence coverage map shows which requirements have supporting documentation, which are partially evidenced, and which remain unsupported.",
      },
    ],
  },
  {
    slug: "deadline-cascade-modeling",
    title: "Deadline Cascade Modeling",
    tagline:
      "Model deadline dependencies and cascading impacts across authorization and reporting timelines.",
    description:
      "Space regulatory compliance involves deeply interdependent deadlines — an authorization application depends on a completed environmental assessment, which depends on orbital analysis, which depends on updated TLE data. The cascade modeling engine maps these dependency chains and computes critical path timelines. When one deadline slips, the system propagates the delay through all dependent milestones, recalculates downstream dates, and identifies which deadlines are now at risk. This gives operators visibility into the true impact of schedule changes before they propagate into regulatory non-compliance.",
    features: [
      {
        title: "Dependency Chain Mapping",
        description:
          "Models prerequisite relationships between deadlines, milestones, and deliverables across authorization workflows, reporting cycles, and renewal timelines.",
      },
      {
        title: "Slip Propagation Analysis",
        description:
          "When a deadline moves, the engine recalculates all downstream dates and flags which dependent milestones are now at risk of breaching their regulatory windows.",
      },
      {
        title: "Critical Path Identification",
        description:
          "Highlights the longest dependency chain determining your earliest possible compliance date, focusing attention on the tasks that actually control the timeline.",
      },
    ],
  },
  {
    slug: "scenario-simulation",
    title: "Scenario Simulation",
    tagline:
      "What-if analysis for orbital maneuvers, regulatory changes, and mission profile modifications.",
    description:
      "The what-if engine allows operators to simulate changes to their mission profile, orbital parameters, or regulatory environment and see the projected impact on compliance state before committing to any action. Simulate an orbit raise and see how it affects your debris compliance timeline. Model a regulatory amendment and understand which of your current obligations change. Evaluate a jurisdiction change and compare the compliance requirements of operating under French versus German space law. Each simulation runs the full compliance engine stack against modified inputs, producing a differential compliance report showing exactly what changes and why.",
    features: [
      {
        title: "Orbital Maneuver Simulation",
        description:
          "Model orbit raises, lowering, station-keeping changes, and disposal maneuvers to see their projected impact on debris compliance and deorbit timeline obligations.",
      },
      {
        title: "Regulatory Change Modeling",
        description:
          "Simulate proposed or upcoming regulation amendments against your current compliance profile to understand the gap impact before enforcement dates arrive.",
      },
      {
        title: "Differential Compliance Reports",
        description:
          "Each simulation produces a side-by-side comparison of current versus projected compliance state, highlighting every score change, new gap, and shifted deadline.",
      },
    ],
  },
];
