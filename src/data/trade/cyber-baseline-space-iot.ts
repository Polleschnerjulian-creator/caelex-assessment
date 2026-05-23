/**
 * Cyber Baseline for Satellite IoT + Space-Asset Cybersecurity
 * — first-class regulatory dataset.
 *
 * Covers the cyber regulatory layer that gates every commercial + government
 * satellite operation: the consumer-IoT baseline (ETSI EN 303 645), the EU
 * Critical-Infrastructure cyber regime (NIS2 Directive 2022/2555), the US
 * federal cyber baseline (NIST SP 800-53 Rev. 5 + space-specific overlays),
 * the US Government space-cyber directive (SPD-5), EU advisory threat
 * landscape (ENISA), German federal cyber baseline (BSI IT-Grundschutz
 * SYS.4), US best-practice guidance (CISA Space SCC), and the cross-cutting
 * industry-consensus standards (SAE AS5553, IEC 62443, ESA TEC-S).
 *
 * The cyber layer is the **trade-side companion** to launch insurance /
 * export controls: every TT&C link to a satellite is a NIS2-reportable
 * critical-infrastructure dependency, every spaceborne IoT sensor is an
 * ETSI EN 303 645 baseline-conformity candidate, and every US-government
 * mission carries SPD-5 cybersecurity obligations through the contractor
 * chain. The cross-walk to Caelex Comply NIS2 incident-reporting routes
 * is encoded via the SPACE_SEGMENT / GROUND_SEGMENT / USER_SEGMENT /
 * LINK_SEGMENT / SUPPLY_CHAIN scoping below.
 *
 * **Major regulatory shifts (2020-2026):**
 *   - ETSI EN 303 645 v3.1.3 (Sep 2024) consolidated the 13 categories of
 *     IoT cyber-baseline provisions (33 mandatory, 28 recommended), now
 *     referenced as the de-facto consumer-IoT cyber-baseline standard
 *     across the EU + UK (PSTI Act 2022 references it) + Singapore CLS.
 *   - NIS2 Directive (EU 2022/2555) transposed by Member States by
 *     17 Oct 2024; satellite operators classified as "important entities"
 *     under Annex II.6 (digital infrastructure) or by national designation.
 *   - SPD-5 (Memorandum on Space Policy Directive-5, "Cybersecurity
 *     Principles for Space Systems") issued 4 Sep 2020; binding on every
 *     US Government space mission via FAR / DFARS contractor flow-down.
 *   - NIST IR 8270 (Foundational PNT Profile) issued Apr 2023 — first
 *     PNT-specific cyber profile invoked under NIST CSF 2.0.
 *   - ENISA Threat Landscape for Space Sector (Dec 2023, updated 2024) —
 *     mapped 81 cyber threats across 4 segments + supply chain.
 *   - BSI IT-Grundschutz module SYS.4 (Weltraumsysteme + Bodenstationen)
 *     consolidated in 2023 IT-Grundschutz-Kompendium; now mandatory for
 *     German federal space missions + critical-infrastructure operators
 *     under IT-SiG 2.0.
 *   - CISA Space SCC "Space Systems Cybersecurity Coordinating Group"
 *     guidance (May 2024) — interpretive guidance bridging SPD-5 to
 *     CSF 2.0 + JADC2 cyber posture.
 *
 * **Quantitative thresholds that appear repeatedly:**
 *   - **24 hours** — NIS2 Art. 23(4)(a) early-warning notification to
 *     CSIRT for significant incidents.
 *   - **72 hours** — NIS2 Art. 23(4)(b) follow-up incident notification.
 *   - **1 month** — NIS2 Art. 23(4)(d) final incident report due.
 *   - **€10 million OR 2 % global turnover** — NIS2 Art. 32 maximum
 *     administrative fine for important entities (Art. 34 essential
 *     entities: €10M OR 2 %; whichever higher).
 *   - **33 mandatory provisions** — ETSI EN 303 645 v3.1.3 counts 33 M
 *     provisions + 28 R recommended (categories 5.1-5.13).
 *   - **12 months** — Typical SPD-5 contractor cyber-risk-management
 *     plan refresh cycle.
 *   - **TLS 1.2+** — ETSI § 5.5 secure-communications baseline (TLS 1.3
 *     recommended; TLS 1.0/1.1 prohibited).
 *
 * Sources (accessed 2026-05-23):
 *   - ETSI EN 303 645 V3.1.3 — Cyber Security for Consumer Internet of Things
 *     https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf
 *   - Directive (EU) 2022/2555 of the European Parliament and of the
 *     Council of 14 December 2022 (NIS2 Directive)
 *     https://eur-lex.europa.eu/eli/dir/2022/2555/oj
 *   - NIST SP 800-53 Rev. 5 — Security and Privacy Controls for
 *     Information Systems and Organizations
 *     https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf
 *   - NIST SP 800-160 Vol. 2 Rev. 1 — Developing Cyber-Resilient Systems
 *     https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-160v2r1.pdf
 *   - NIST IR 8270 — Introduction to Cybersecurity for Commercial
 *     Satellite Operations + PNT profile
 *     https://nvlpubs.nist.gov/nistpubs/ir/2023/NIST.IR.8270.pdf
 *   - SPD-5 — Memorandum on Space Policy Directive-5 (Cybersecurity
 *     Principles for Space Systems), 4 Sep 2020
 *     https://trumpwhitehouse.archives.gov/presidential-actions/memorandum-space-policy-directive-5-cybersecurity-principles-space-systems/
 *   - ENISA Threat Landscape for the Space Sector (Dec 2023, 2024 update)
 *     https://www.enisa.europa.eu/publications/enisa-threat-landscape-for-the-space-sector
 *   - BSI IT-Grundschutz-Kompendium Edition 2023, SYS.4 family
 *     https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/IT-Grundschutz/IT-Grundschutz-Kompendium/itgrundschutzKompendium_node.html
 *   - CISA Space Systems Cybersecurity Coordinating Group guidance
 *     https://www.cisa.gov/topics/critical-infrastructure-security-and-resilience/critical-infrastructure-sectors/government-facilities-sector/space-systems
 *   - NASA-STD-1006B — Space Asset Protection Standard
 *     https://standards.nasa.gov/standard/nasa/nasa-std-1006
 *   - SAE AS5553D — Counterfeit Electronic Parts; Avoidance, Detection,
 *     Mitigation, and Disposition
 *     https://www.sae.org/standards/content/as5553d/
 *   - IEC 62443 series — Industrial communication networks - Network
 *     and system security
 *     https://webstore.iec.ch/publication/7029
 *   - ESA TEC-S Cybersecurity for Galileo Mission Operations
 *     https://www.esa.int/Applications/Navigation/Galileo/Galileo_Security
 *   - PSTI Act 2022 (UK Product Security and Telecommunications
 *     Infrastructure Act) — references ETSI EN 303 645 baseline
 *     https://www.legislation.gov.uk/ukpga/2022/46/contents
 *
 * NOT a verbatim transcription. Descriptions are paraphrased compliance-
 * level summaries; authoritative interpretation requires the specific
 * regulator's review (national NIS2 CSIRT designation, FedRAMP / DoD
 * cyber-survey, BSI IT-Grundschutz audit, ETSI EN 303 645 conformity
 * assessment).
 */

/** As-of date for the file as a whole. */
export const CYBER_BASELINE_AS_OF = "2026-05-23";

/** Regime — the issuer of the cyber requirement. */
export type CyberRegime =
  | "ETSI-EN-303-645" // ETSI EN 303 645 v3.1.3 (IoT cyber baseline)
  | "NIS2" // EU 2022/2555 (Critical-Infrastructure cyber)
  | "NIST-SP-800-53" // NIST SP 800-53 Rev. 5 + 800-160 + IR 8270 overlays
  | "US-SPD-5" // US Space Policy Directive 5 (USG space cyber)
  | "ENISA-THREAT-LANDSCAPE" // ENISA Threat Landscape for Space (advisory)
  | "BSI-IT-GRUNDSCHUTZ" // BSI IT-Grundschutz SYS.4 (DE federal)
  | "CISA-SSCC" // CISA Space Sector Coordinating Council guidance
  | "INDUSTRY-CONSENSUS"; // SAE AS5553 / IEC 62443 / ESA TEC-S etc.

/** Functional category of a cyber requirement. */
export type CyberCategory =
  | "PASSWORD_MGMT" // No universal default passwords (§ 5.1)
  | "VULNERABILITY_DISCLOSURE" // Vulnerability reporting + handling (§ 5.2)
  | "SOFTWARE_UPDATES" // Patchable software, signed updates (§ 5.3)
  | "KEY_STORAGE" // Secure storage of sensitive parameters (§ 5.4)
  | "SECURE_COMMS" // TLS, signed firmware, encrypted channels (§ 5.5)
  | "ATTACK_SURFACE_REDUCTION" // Minimise exposed surfaces (§ 5.6)
  | "INTEGRITY_VERIFICATION" // Software integrity verification (§ 5.7)
  | "DATA_PROTECTION" // Personal-data protection (§ 5.8)
  | "RESILIENCE" // Resilience to outages (§ 5.9)
  | "TELEMETRY_MONITORING" // Telemetry data examination (§ 5.10)
  | "USER_DATA_DELETION" // Easy personal-data deletion (§ 5.11)
  | "INSTALLATION_MAINTENANCE" // Easy installation + maintenance (§ 5.12)
  | "INPUT_VALIDATION" // Input data validation (§ 5.13)
  | "INCIDENT_REPORTING" // NIS2 24h/72h/1mo reporting timeline
  | "RISK_MGMT" // NIS2 Art. 21 risk-management measures
  | "SUPPLY_CHAIN" // SPD-5 supply-chain risk management + counterfeit prevention
  | "COMSEC" // Communications security / cryptographic protection
  | "PNT_INTEGRITY" // Position/Navigation/Timing spoofing detection
  | "PENALTIES" // NIS2 fines / administrative sanctions
  | "REGISTRATION" // ENISA registry / CSIRT designation
  | "ACCESS_CONTROL" // NIST AC family
  | "AUDIT_LOGGING" // NIST AU family
  | "CONFIG_MGMT" // NIST CM family
  | "CONTINGENCY" // NIST CP family + business continuity
  | "IDENTIFICATION_AUTH" // NIST IA family
  | "INCIDENT_RESPONSE" // NIST IR family
  | "PHYSICAL_PROTECTION" // NIST PE family + ground-station physical
  | "SYSTEM_INTEGRITY" // NIST SI family
  | "GROUND_STATION_PROTECTION" // BSI SYS.4.2 ground-segment specifics
  | "TT_AND_C_SECURITY" // BSI SYS.4.3 telemetry + telecommand
  | "THREAT_INTEL"; // ENISA advisory threat categorisation

/** Space-system segment the rule scopes to. */
export type SpaceSegment =
  | "SPACE_SEGMENT" // Satellite / spacecraft itself
  | "GROUND_SEGMENT" // Ground stations + mission ops centres
  | "USER_SEGMENT" // End-user terminals + apps
  | "LINK_SEGMENT" // Uplink / downlink / inter-satellite link
  | "SUPPLY_CHAIN"; // Hardware + software supply chain

/** Binding nature — how strict the rule is. */
export type CyberBindingNature =
  | "MANDATORY" // National / EU statute or directive (binding)
  | "HARMONISED" // Harmonised European standard (presumption of conformity)
  | "BASELINE" // Federal baseline (NIST SP 800-53, BSI IT-Grundschutz)
  | "GUIDELINE"; // Non-binding guidance / advisory / industry consensus

/** Operator scope categories — who the rule applies to. */
export type CyberOperatorScope =
  | "COMMERCIAL"
  | "GOVERNMENT"
  | "ACADEMIC"
  | "CRITICAL_INFRA"
  | "ALL";

/** One entry — a single cyber requirement from one regime. */
export interface CyberRequirementEntry {
  /** Unique code, e.g. "ETSI-303-645-5-1", "NIS2-ART-23-EARLY-WARN". */
  code: string;

  /** Regulator or standard issuer. */
  regime: CyberRegime;

  /** Functional category. */
  category: CyberCategory;

  /** Headline (≤120 chars). */
  title: string;

  /** Paraphrased compliance-level description. */
  description: string;

  /** Effective-from date (ISO). */
  effectiveFrom: string;

  /** Citation — exact rule reference. */
  citation: string;

  /** Source URL. */
  sourceUrl: string;

  /** Space-system segments the rule applies to. */
  applicableSegments: ReadonlyArray<SpaceSegment>;

  /** Quantitative threshold, if any. */
  threshold?: {
    /** Parameter name (e.g. "incidentReportingPlannedHours"). */
    parameter: string;
    /** Comparison operator. */
    operator: "<=" | ">=" | "<" | ">" | "=";
    /** Numeric value. */
    value: number;
    /** Unit (hours, months, percent, etc.). */
    unit: string;
  };

  /** Binding nature. */
  bindingNature: CyberBindingNature;

  /** Operator scope this applies to. */
  operatorScope: ReadonlyArray<CyberOperatorScope>;

  /** Related codes in this dataset (cross-references). */
  relatedCodes?: ReadonlyArray<string>;

  /** Clarification notes. */
  notes?: string;
}

// ============================================================================
// ETSI EN 303 645 v3.1.3 — Cyber Security for Consumer Internet of Things
// ============================================================================

const ETSI_303_645_ENTRIES: ReadonlyArray<CyberRequirementEntry> = [
  {
    code: "ETSI-303-645-5-1",
    regime: "ETSI-EN-303-645",
    category: "PASSWORD_MGMT",
    title:
      "ETSI EN 303 645 § 5.1 — No universal default passwords for IoT devices",
    description:
      "Section 5.1 of ETSI EN 303 645 v3.1.3 prohibits the use of " +
      "universal default credentials in any consumer IoT device. Per-" +
      "device unique passwords must be generated using a mechanism " +
      "free from obvious regularities + with resistance to automated " +
      "attack. Where pre-installed default values are used, they must " +
      "be unique per device and cryptographically generated. The " +
      "provision is MANDATORY (M) and applies to satellite-IoT ground " +
      "terminals + commercial constellation user terminals (Starlink, " +
      "OneWeb, etc.) marketed in EU + UK (PSTI Act 2022).",
    effectiveFrom: "2024-09-01",
    citation: "ETSI EN 303 645 v3.1.3 § 5.1 (Provision 5.1-1)",
    sourceUrl:
      "https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf",
    applicableSegments: ["USER_SEGMENT", "GROUND_SEGMENT"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL", "ACADEMIC", "CRITICAL_INFRA"],
    relatedCodes: ["ETSI-303-645-5-2", "ETSI-303-645-5-4"],
    notes:
      "Universal default passwords (e.g. admin/admin) on a satellite " +
      "user terminal are the most common entry vector for botnet " +
      "recruitment of ground-segment devices.",
  },
  {
    code: "ETSI-303-645-5-2",
    regime: "ETSI-EN-303-645",
    category: "VULNERABILITY_DISCLOSURE",
    title: "ETSI EN 303 645 § 5.2 — Vulnerability disclosure policy + handling",
    description:
      "Section 5.2 requires manufacturers to make a vulnerability " +
      "disclosure policy publicly available (Provision 5.2-1, M), to " +
      "ensure vulnerabilities are acted on in a timely manner (M), and " +
      "to continuously monitor for, identify, and rectify security " +
      "vulnerabilities (R). The policy must specify points of contact, " +
      "expected acknowledgement timeline, and resolution-status " +
      "communication. ISO/IEC 29147 + 30111 are referenced.",
    effectiveFrom: "2024-09-01",
    citation: "ETSI EN 303 645 v3.1.3 § 5.2",
    sourceUrl:
      "https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT", "USER_SEGMENT"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL", "ACADEMIC", "CRITICAL_INFRA"],
    relatedCodes: ["ETSI-303-645-5-3", "NIS2-ART-21-RISK-MGMT"],
  },
  {
    code: "ETSI-303-645-5-3",
    regime: "ETSI-EN-303-645",
    category: "SOFTWARE_UPDATES",
    title: "ETSI EN 303 645 § 5.3 — Keep software updated (patchable, signed)",
    description:
      "Section 5.3 requires that software components in IoT devices " +
      "be securely updateable (Provision 5.3-1, M), that updates be " +
      "delivered via a secure mechanism (M), that update integrity be " +
      "verifiable (M), and that the device clearly states support " +
      "lifetime to consumers (M). Update verification must use " +
      "cryptographic signature (Provision 5.3-13). For satellite-IoT " +
      "ground terminals, this means signed firmware via OTA secure " +
      "boot + secure-boot chain validation at startup.",
    effectiveFrom: "2024-09-01",
    citation: "ETSI EN 303 645 v3.1.3 § 5.3",
    sourceUrl:
      "https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT", "USER_SEGMENT"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL", "ACADEMIC", "CRITICAL_INFRA"],
    relatedCodes: ["ETSI-303-645-5-7", "NIST-CM-3-CONFIG-CHANGE"],
  },
  {
    code: "ETSI-303-645-5-4",
    regime: "ETSI-EN-303-645",
    category: "KEY_STORAGE",
    title:
      "ETSI EN 303 645 § 5.4 — Securely store sensitive security parameters",
    description:
      "Section 5.4 requires sensitive security parameters (private " +
      "keys, certificates, credentials, session tokens) to be stored " +
      "securely on the device using mechanisms commensurate with the " +
      "risk + the parameter sensitivity. Provision 5.4-1 (M) prohibits " +
      "hardcoded passwords / keys in source code or readable storage; " +
      "Provision 5.4-3 (M) recommends use of secure-element / TPM / " +
      "TEE hardware roots-of-trust where available. Critical for " +
      "satellite user-terminal commissioning keys + COMSEC seeds.",
    effectiveFrom: "2024-09-01",
    citation: "ETSI EN 303 645 v3.1.3 § 5.4",
    sourceUrl:
      "https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT", "USER_SEGMENT"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL", "ACADEMIC", "CRITICAL_INFRA"],
    relatedCodes: ["ETSI-303-645-5-5", "NIST-IA-5-AUTHENTICATOR-MGMT"],
  },
  {
    code: "ETSI-303-645-5-5",
    regime: "ETSI-EN-303-645",
    category: "SECURE_COMMS",
    title:
      "ETSI EN 303 645 § 5.5 — Communicate securely (TLS, signed firmware)",
    description:
      "Section 5.5 requires all device-to-cloud + device-to-device + " +
      "device-to-user communications to be encrypted using best-practice " +
      "cryptography. Specifically: TLS 1.2 minimum (TLS 1.3 recommended; " +
      "TLS 1.0 / 1.1 / unencrypted prohibited), DTLS for UDP channels, " +
      "and certificate validation must be enforced by default. Provision " +
      "5.5-1 (M) mandates the use of best-practice cryptography; " +
      "Provision 5.5-7 (M) prohibits the use of broken / weak crypto. " +
      "For satellite uplinks: encrypted command channel mandatory.",
    effectiveFrom: "2024-09-01",
    citation: "ETSI EN 303 645 v3.1.3 § 5.5",
    sourceUrl:
      "https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf",
    applicableSegments: ["LINK_SEGMENT", "GROUND_SEGMENT", "USER_SEGMENT"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL", "ACADEMIC", "CRITICAL_INFRA"],
    relatedCodes: ["ETSI-303-645-5-4", "BSI-SYS-4-3-TTC-SEC"],
  },
  {
    code: "ETSI-303-645-5-6",
    regime: "ETSI-EN-303-645",
    category: "ATTACK_SURFACE_REDUCTION",
    title: "ETSI EN 303 645 § 5.6 — Minimise exposed attack surfaces",
    description:
      "Section 5.6 requires unused services, network interfaces, debug " +
      "ports, and software components to be disabled or removed (M). " +
      "Provision 5.6-1 (M) requires that only necessary network + " +
      "logical interfaces be exposed; Provision 5.6-3 (M) requires " +
      "device-specific configuration to disable debug interfaces in " +
      "production firmware. For satellite-IoT, this means production " +
      "firmware MUST disable JTAG / serial-debug + close unused TCP/UDP " +
      "ports on the user terminal.",
    effectiveFrom: "2024-09-01",
    citation: "ETSI EN 303 645 v3.1.3 § 5.6",
    sourceUrl:
      "https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT", "USER_SEGMENT"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL", "ACADEMIC", "CRITICAL_INFRA"],
    relatedCodes: ["ETSI-303-645-5-3", "NIST-SC-7-BOUNDARY-PROTECTION"],
  },
  {
    code: "ETSI-303-645-5-7",
    regime: "ETSI-EN-303-645",
    category: "INTEGRITY_VERIFICATION",
    title:
      "ETSI EN 303 645 § 5.7 — Ensure software integrity (secure boot chain)",
    description:
      "Section 5.7 requires devices to verify the integrity of their " +
      "software using secure-boot mechanisms (M); the bootloader and " +
      "all software components must be authenticated against a hardware-" +
      "anchored root-of-trust. Provision 5.7-1 (M) mandates verification " +
      "at boot; Provision 5.7-2 (R) recommends remote attestation. For " +
      "satellite-IoT this is the bridge to NASA-STD-1006B + ESA TEC-S " +
      "secure-boot requirements for on-board computers.",
    effectiveFrom: "2024-09-01",
    citation: "ETSI EN 303 645 v3.1.3 § 5.7",
    sourceUrl:
      "https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT", "USER_SEGMENT"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL", "ACADEMIC", "CRITICAL_INFRA"],
    relatedCodes: ["ETSI-303-645-5-3", "INDUSTRY-NASA-STD-1006B"],
  },
  {
    code: "ETSI-303-645-5-8",
    regime: "ETSI-EN-303-645",
    category: "DATA_PROTECTION",
    title:
      "ETSI EN 303 645 § 5.8 — Ensure personal data is protected (GDPR alignment)",
    description:
      "Section 5.8 requires that personal data processed by the IoT " +
      "device be protected in accordance with applicable data-protection " +
      "law (GDPR, UK DPA 2018). Provision 5.8-1 (M) requires encryption " +
      "of personal data in transit + at rest; Provision 5.8-3 (M) " +
      "requires that personal data be processed for declared purposes " +
      "only. For commercial satellite-IoT services, this aligns with " +
      "GDPR Art. 5 + Art. 32 (security of processing).",
    effectiveFrom: "2024-09-01",
    citation: "ETSI EN 303 645 v3.1.3 § 5.8",
    sourceUrl:
      "https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf",
    applicableSegments: ["GROUND_SEGMENT", "USER_SEGMENT"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL", "ACADEMIC", "CRITICAL_INFRA"],
    relatedCodes: ["ETSI-303-645-5-4", "NIS2-ART-21-RISK-MGMT"],
  },
  {
    code: "ETSI-303-645-5-9",
    regime: "ETSI-EN-303-645",
    category: "RESILIENCE",
    title: "ETSI EN 303 645 § 5.9 — Make systems resilient to outages",
    description:
      "Section 5.9 requires the device + service to remain functioning " +
      "+ recover from disruption (M). Provision 5.9-1 (M) requires " +
      "graceful degradation when network connectivity is lost; " +
      "Provision 5.9-3 (R) recommends automatic recovery after power " +
      "loss without operator intervention. For satellite-IoT user " +
      "terminals, must continue local operation + buffer telemetry " +
      "during link outage.",
    effectiveFrom: "2024-09-01",
    citation: "ETSI EN 303 645 v3.1.3 § 5.9",
    sourceUrl:
      "https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf",
    applicableSegments: ["GROUND_SEGMENT", "USER_SEGMENT"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL", "ACADEMIC", "CRITICAL_INFRA"],
    relatedCodes: ["ETSI-303-645-5-10", "CISA-SSCC-CSF-RECOVER"],
  },
  {
    code: "ETSI-303-645-5-10",
    regime: "ETSI-EN-303-645",
    category: "TELEMETRY_MONITORING",
    title:
      "ETSI EN 303 645 § 5.10 — Examine system telemetry data for anomalies",
    description:
      "Section 5.10 requires that telemetry data collected from devices " +
      "be examined for security anomalies (M when telemetry collection " +
      "is enabled). Provision 5.10-1 (M) requires examination for " +
      "security-relevant patterns; Provision 5.10-2 (R) recommends " +
      "automated anomaly detection. For satellite operators, this is " +
      "the bridge to ENISA threat-intel sharing + NIS2 Art. 21(2)(g) " +
      "anomaly-monitoring obligations.",
    effectiveFrom: "2024-09-01",
    citation: "ETSI EN 303 645 v3.1.3 § 5.10",
    sourceUrl:
      "https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf",
    applicableSegments: ["GROUND_SEGMENT", "SPACE_SEGMENT"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL", "ACADEMIC", "CRITICAL_INFRA"],
    relatedCodes: ["NIST-SI-4-SYSTEM-MONITORING", "ENISA-LANDSCAPE-GROUND"],
  },
  {
    code: "ETSI-303-645-5-13",
    regime: "ETSI-EN-303-645",
    category: "INPUT_VALIDATION",
    title:
      "ETSI EN 303 645 § 5.13 — Validate input data (defence against injection)",
    description:
      "Section 5.13 requires that data input to the device via APIs, " +
      "network interfaces, or user interfaces be validated (M). " +
      "Provision 5.13-1 (M) requires input validation against expected " +
      "format + length + value range. Critical for satellite user " +
      "terminals' command APIs + ground-station-facing protocols where " +
      "malformed-input attacks (CCSDS-spoofing, AOS-frame injection) " +
      "are a documented threat vector (ENISA Space Threat #41-43).",
    effectiveFrom: "2024-09-01",
    citation: "ETSI EN 303 645 v3.1.3 § 5.13",
    sourceUrl:
      "https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT", "LINK_SEGMENT"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL", "ACADEMIC", "CRITICAL_INFRA"],
    relatedCodes: ["BSI-SYS-4-3-TTC-SEC", "NIST-SI-4-SYSTEM-MONITORING"],
  },
  {
    code: "ETSI-303-645-PROVISION-COUNT",
    regime: "ETSI-EN-303-645",
    category: "RISK_MGMT",
    title:
      "ETSI EN 303 645 v3.1.3 — 33 mandatory + 28 recommended provisions (M + R count)",
    description:
      "ETSI EN 303 645 v3.1.3 codifies 33 mandatory (M) provisions and " +
      "28 recommended (R) provisions across the 13 sections § 5.1-5.13. " +
      "Conformity to all 33 M provisions is required to claim baseline " +
      "compliance. Conformity assessment may be self-attestation, " +
      "third-party test (ETSI TS 103 701), or sectoral certification. " +
      "The 33-M count is a quantitative compliance gate referenced by " +
      "PSTI Act 2022 (UK) + Singapore IMDA CLS schemes.",
    effectiveFrom: "2024-09-01",
    citation: "ETSI EN 303 645 v3.1.3 — Provision count summary",
    sourceUrl:
      "https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT", "USER_SEGMENT"],
    threshold: {
      parameter: "etsiMandatoryProvisionsImplemented",
      operator: ">=",
      value: 33,
      unit: "mandatory provisions (out of 33 M)",
    },
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL", "ACADEMIC", "CRITICAL_INFRA"],
    relatedCodes: ["ETSI-303-645-5-1", "ETSI-303-645-5-5", "ETSI-303-645-5-7"],
  },
];

// ============================================================================
// NIS2 Directive — EU 2022/2555 (Critical-Infrastructure Cyber)
// ============================================================================

const NIS2_ENTRIES: ReadonlyArray<CyberRequirementEntry> = [
  {
    code: "NIS2-ART-21-RISK-MGMT",
    regime: "NIS2",
    category: "RISK_MGMT",
    title:
      "NIS2 Art. 21 — Cybersecurity risk-management measures for essential / important entities",
    description:
      "Article 21 of Directive (EU) 2022/2555 requires essential + " +
      "important entities to take appropriate and proportionate " +
      "technical, operational, and organisational measures to manage " +
      "cybersecurity risks. The 10 categories include: risk-analysis " +
      "policies, incident-handling, business-continuity, supply-chain " +
      "security, vulnerability-handling, cyber-hygiene + training, " +
      "cryptographic policies, HR security + access controls, multi-" +
      "factor authentication, and secured communications. Satellite " +
      "operators classified as 'important entities' under Annex II.6 " +
      "(digital infrastructure) are bound by Art. 21.",
    effectiveFrom: "2024-10-17",
    citation: "Directive (EU) 2022/2555 Art. 21",
    sourceUrl: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
    applicableSegments: [
      "SPACE_SEGMENT",
      "GROUND_SEGMENT",
      "LINK_SEGMENT",
      "SUPPLY_CHAIN",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA"],
    relatedCodes: [
      "NIS2-ART-23-EARLY-WARN",
      "NIS2-ART-23-72H",
      "NIS2-ART-32-PENALTIES",
    ],
    notes:
      "EU Member State transposition (e.g. DE NIS2-Umsetzungs- und " +
      "Cybersicherheitsstärkungsgesetz, FR loi 2024) determines whether " +
      "a given satellite operator is essential vs. important; both " +
      "categories are bound by Art. 21 but penalty caps differ.",
  },
  {
    code: "NIS2-ART-23-EARLY-WARN",
    regime: "NIS2",
    category: "INCIDENT_REPORTING",
    title:
      "NIS2 Art. 23(4)(a) — 24-hour early-warning notification of significant incidents",
    description:
      "Article 23(4)(a) of the NIS2 Directive requires essential + " +
      "important entities to submit an EARLY-WARNING notification to " +
      "the relevant CSIRT / competent authority WITHIN 24 HOURS of " +
      "becoming aware of a significant incident. The early warning " +
      "must indicate whether the incident is suspected to be caused " +
      "by unlawful or malicious acts, or could have cross-border " +
      "impact. For satellite operators: ANY loss of TT&C link integrity " +
      "or unauthorised command-channel access triggers the 24h clock.",
    effectiveFrom: "2024-10-17",
    citation: "Directive (EU) 2022/2555 Art. 23(4)(a)",
    sourceUrl: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
    applicableSegments: [
      "SPACE_SEGMENT",
      "GROUND_SEGMENT",
      "LINK_SEGMENT",
      "USER_SEGMENT",
    ],
    threshold: {
      parameter: "incidentReportingPlannedHours",
      operator: "<=",
      value: 24,
      unit: "hours from awareness (early warning)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA"],
    relatedCodes: [
      "NIS2-ART-21-RISK-MGMT",
      "NIS2-ART-23-72H",
      "NIS2-ART-23-1MO",
    ],
  },
  {
    code: "NIS2-ART-23-72H",
    regime: "NIS2",
    category: "INCIDENT_REPORTING",
    title: "NIS2 Art. 23(4)(b) — 72-hour incident-notification follow-up",
    description:
      "Article 23(4)(b) requires entities to submit a FOLLOW-UP " +
      "incident notification within 72 hours of becoming aware of " +
      "a significant incident. The notification must update or " +
      "complete the 24h early warning, provide an initial impact " +
      "assessment + indicators of compromise. For satellite TT&C " +
      "incidents, the 72h report typically includes orbital-state " +
      "indicators, affected ground-station IDs, and provisional " +
      "root-cause hypotheses.",
    effectiveFrom: "2024-10-17",
    citation: "Directive (EU) 2022/2555 Art. 23(4)(b)",
    sourceUrl: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
    applicableSegments: [
      "SPACE_SEGMENT",
      "GROUND_SEGMENT",
      "LINK_SEGMENT",
      "USER_SEGMENT",
    ],
    threshold: {
      parameter: "incidentFollowupPlannedHours",
      operator: "<=",
      value: 72,
      unit: "hours from awareness (follow-up)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA"],
    relatedCodes: ["NIS2-ART-23-EARLY-WARN", "NIS2-ART-23-1MO"],
  },
  {
    code: "NIS2-ART-23-1MO",
    regime: "NIS2",
    category: "INCIDENT_REPORTING",
    title: "NIS2 Art. 23(4)(d) — 1-month final incident report",
    description:
      "Article 23(4)(d) requires entities to submit a FINAL REPORT " +
      "not later than 1 MONTH (or, when the incident is still ongoing, " +
      "an intermediate report at one month + a final report once the " +
      "incident has been handled). The final report must include a " +
      "detailed description of the incident, its severity + impact, " +
      "the type of threat or root cause, applied + ongoing mitigation " +
      "measures, and where applicable the cross-border impact.",
    effectiveFrom: "2024-10-17",
    citation: "Directive (EU) 2022/2555 Art. 23(4)(d)",
    sourceUrl: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
    applicableSegments: [
      "SPACE_SEGMENT",
      "GROUND_SEGMENT",
      "LINK_SEGMENT",
      "USER_SEGMENT",
    ],
    threshold: {
      parameter: "incidentFinalReportPlannedMonths",
      operator: "<=",
      value: 1,
      unit: "months from awareness (final report)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA"],
    relatedCodes: ["NIS2-ART-23-EARLY-WARN", "NIS2-ART-23-72H"],
  },
  {
    code: "NIS2-ART-24-REGISTRY",
    regime: "NIS2",
    category: "REGISTRATION",
    title: "NIS2 Art. 27 — ENISA registry + national CSIRT coordination",
    description:
      "Article 27 (read with Recital 76) requires entities under the " +
      "Directive's scope to provide identifying information to the " +
      "national CSIRT + ENISA registry: legal entity, contact details, " +
      "list of Member States in which they provide services, IP " +
      "ranges + ASNs used, and DNS service identifiers. The registry " +
      "supports cross-border coordination + cyber-crisis response. " +
      "Satellite operators with EU users must designate an EU " +
      "representative + register accordingly.",
    effectiveFrom: "2024-10-17",
    citation: "Directive (EU) 2022/2555 Art. 27",
    sourceUrl: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
    applicableSegments: [
      "GROUND_SEGMENT",
      "LINK_SEGMENT",
      "USER_SEGMENT",
      "SUPPLY_CHAIN",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA"],
    relatedCodes: ["NIS2-ART-21-RISK-MGMT", "NIS2-ART-23-EARLY-WARN"],
  },
  {
    code: "NIS2-ART-32-PENALTIES",
    regime: "NIS2",
    category: "PENALTIES",
    title:
      "NIS2 Art. 34 — Penalties up to €10M or 2 % global turnover (essential entities)",
    description:
      "Article 34 of the NIS2 Directive sets administrative fine " +
      "ceilings for ESSENTIAL ENTITIES at a maximum of €10 MILLION or " +
      "2 % of TOTAL WORLDWIDE ANNUAL TURNOVER (global turnover, " +
      "preceding fiscal year), WHICHEVER IS HIGHER. Article 35 " +
      "(important entities) sets the ceiling at €7M or 1.4 % of " +
      "turnover. Penalties are imposed by national competent " +
      "authorities (BSI/BfDI/BSI für IT-Sicherheit in DE; ANSSI in FR; " +
      "NCSC + ICO in IE) and must be effective, proportionate, and " +
      "dissuasive.",
    effectiveFrom: "2024-10-17",
    citation:
      "Directive (EU) 2022/2555 Art. 34 (essential) + Art. 35 (important)",
    sourceUrl: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
    applicableSegments: [
      "SPACE_SEGMENT",
      "GROUND_SEGMENT",
      "LINK_SEGMENT",
      "USER_SEGMENT",
    ],
    threshold: {
      parameter: "nis2PenaltyCapPercent",
      operator: "<=",
      value: 2,
      unit: "percent of global turnover (essential entities, ≥€10M floor)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA"],
    relatedCodes: ["NIS2-ART-21-RISK-MGMT", "NIS2-ART-23-EARLY-WARN"],
    notes:
      "The 2 %/€10M penalty cap is the highest in EU cyber regulation " +
      "outside GDPR; satellite operators classified as essential carry " +
      "the full Art. 34 exposure. The German IT-SiG 2.0 transposition " +
      "adds further sector-specific fines under § 14 BSIG.",
  },
  {
    code: "NIS2-ANNEX-II-DIGITAL-INFRA",
    regime: "NIS2",
    category: "REGISTRATION",
    title:
      "NIS2 Annex II.6 — Digital infrastructure includes satellite-link operators",
    description:
      "Annex II.6 of the NIS2 Directive classifies the following as " +
      "'IMPORTANT ENTITIES' in the digital-infrastructure sector: " +
      "providers of public electronic communications networks, " +
      "providers of trust services, top-level-domain (TLD) name " +
      "registries, DNS service providers, and (under national " +
      "transposition) operators of satellite communications + earth-" +
      "observation services serving EU users. National competent " +
      "authorities may elevate operators to 'essential' status based " +
      "on systemic importance.",
    effectiveFrom: "2024-10-17",
    citation: "Directive (EU) 2022/2555 Annex II.6",
    sourceUrl: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
    applicableSegments: ["LINK_SEGMENT", "GROUND_SEGMENT", "USER_SEGMENT"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA"],
    relatedCodes: ["NIS2-ART-21-RISK-MGMT", "NIS2-ART-24-REGISTRY"],
  },
];

// ============================================================================
// NIST SP 800-53 Rev. 5 + Space-Specific Overlays (NASA-STD-1006B, IR 8270)
// ============================================================================

const NIST_800_53_ENTRIES: ReadonlyArray<CyberRequirementEntry> = [
  {
    code: "NIST-AC-2-ACCOUNT-MGMT",
    regime: "NIST-SP-800-53",
    category: "ACCESS_CONTROL",
    title:
      "NIST SP 800-53 AC-2 — Account management for ground-segment + ops systems",
    description:
      "Control AC-2 (Account Management) of NIST SP 800-53 Rev. 5 " +
      "requires organisations to define + document account types, " +
      "assign account managers, establish conditions for account " +
      "creation + modification + disabling + removal, monitor account " +
      "usage, and notify managers of changes. For ground-segment + " +
      "mission-ops systems supporting USG missions, AC-2 is a baseline " +
      "moderate-impact control under FIPS-199 categorisation.",
    effectiveFrom: "2020-09-23",
    citation: "NIST SP 800-53 Rev. 5 AC-2",
    sourceUrl:
      "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf",
    applicableSegments: ["GROUND_SEGMENT", "USER_SEGMENT", "SUPPLY_CHAIN"],
    bindingNature: "BASELINE",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["NIST-IA-5-AUTHENTICATOR-MGMT", "US-SPD-5-PRINCIPLE-4D"],
  },
  {
    code: "NIST-IA-5-AUTHENTICATOR-MGMT",
    regime: "NIST-SP-800-53",
    category: "IDENTIFICATION_AUTH",
    title:
      "NIST SP 800-53 IA-5 — Authenticator management (MFA + cryptographic auth)",
    description:
      "Control IA-5 (Authenticator Management) requires the verification " +
      "of authenticators (passwords, tokens, biometrics, cryptographic " +
      "keys) before use, change of default content, lifetime enforcement, " +
      "and protection from unauthorised disclosure. IA-5(11) (hardware " +
      "tokens) is recommended for moderate + high baselines. Multi-" +
      "factor authentication for privileged ground-segment access is " +
      "mandatory for USG missions per SPD-5 Principle 4.",
    effectiveFrom: "2020-09-23",
    citation: "NIST SP 800-53 Rev. 5 IA-5",
    sourceUrl:
      "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf",
    applicableSegments: ["GROUND_SEGMENT", "USER_SEGMENT"],
    bindingNature: "BASELINE",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["ETSI-303-645-5-4", "US-SPD-5-PRINCIPLE-4D"],
  },
  {
    code: "NIST-SI-4-SYSTEM-MONITORING",
    regime: "NIST-SP-800-53",
    category: "SYSTEM_INTEGRITY",
    title:
      "NIST SP 800-53 SI-4 — System monitoring for anomalies + intrusion detection",
    description:
      "Control SI-4 (System Monitoring) requires the deployment of " +
      "monitoring devices to detect attacks + indicators of potential " +
      "compromise, identify unauthorised use, monitor inbound + outbound " +
      "communications, and report alerts to designated personnel. " +
      "Combined with NIST IR 8270, SI-4 is the foundation for satellite " +
      "telemetry anomaly detection + ground-station IDS deployment.",
    effectiveFrom: "2020-09-23",
    citation: "NIST SP 800-53 Rev. 5 SI-4",
    sourceUrl:
      "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf",
    applicableSegments: ["GROUND_SEGMENT", "SPACE_SEGMENT", "LINK_SEGMENT"],
    bindingNature: "BASELINE",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["ETSI-303-645-5-10", "CISA-SSCC-CSF-DETECT"],
  },
  {
    code: "NIST-SC-7-BOUNDARY-PROTECTION",
    regime: "NIST-SP-800-53",
    category: "SYSTEM_INTEGRITY",
    title:
      "NIST SP 800-53 SC-7 — Boundary protection (segmentation of ground network)",
    description:
      "Control SC-7 (Boundary Protection) requires the monitoring + " +
      "control of communications at the external boundary of the " +
      "system + at key internal boundaries. For satellite ground " +
      "segments, this means: segmentation of the TT&C network from " +
      "the corporate network, DMZ for external interfaces, deny-by-" +
      "default ingress rules, and traffic-flow allowlists for the " +
      "spacecraft-control LAN. Critical for closing supply-chain + " +
      "lateral-movement attack paths.",
    effectiveFrom: "2020-09-23",
    citation: "NIST SP 800-53 Rev. 5 SC-7",
    sourceUrl:
      "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf",
    applicableSegments: ["GROUND_SEGMENT", "LINK_SEGMENT"],
    bindingNature: "BASELINE",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["BSI-SYS-4-2-GROUND-SEC", "ETSI-303-645-5-6"],
  },
  {
    code: "NIST-CM-3-CONFIG-CHANGE",
    regime: "NIST-SP-800-53",
    category: "CONFIG_MGMT",
    title:
      "NIST SP 800-53 CM-3 — Configuration change control for mission systems",
    description:
      "Control CM-3 (Configuration Change Control) requires that " +
      "configuration changes to the system be reviewed + approved + " +
      "tested + documented prior to implementation. For satellite " +
      "ground-segment + on-board software, this is the gate that " +
      "prevents unauthorised firmware uploads + uplink-command-table " +
      "modifications. Cross-references with NASA-STD-1006B SAP-AOP-A " +
      "(authorised operations procedures).",
    effectiveFrom: "2020-09-23",
    citation: "NIST SP 800-53 Rev. 5 CM-3",
    sourceUrl:
      "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT"],
    bindingNature: "BASELINE",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: [
      "ETSI-303-645-5-3",
      "INDUSTRY-NASA-STD-1006B",
      "BSI-SYS-4-3-TTC-SEC",
    ],
  },
  {
    code: "NIST-IR-8270-PNT",
    regime: "NIST-SP-800-53",
    category: "PNT_INTEGRITY",
    title:
      "NIST IR 8270 — Foundational PNT profile (SBAS-aided + cross-source correlation)",
    description:
      "NIST Internal Report 8270 establishes the Foundational PNT " +
      "(Position, Navigation, Timing) Profile under NIST CSF 2.0 — " +
      "the first PNT-specific cyber profile. Key controls: deploy " +
      "anti-spoofing receivers, cross-correlate PNT signals across " +
      "≥2 sources (GNSS + SBAS / WAAS / EGNOS or alternate-PNT), " +
      "monitor C/N0 + signal-quality indicators for spoof patterns, " +
      "and implement RAIM (Receiver Autonomous Integrity Monitoring). " +
      "Applies to USG missions consuming PNT data + commercial " +
      "satellite operators offering PNT services.",
    effectiveFrom: "2023-04-12",
    citation: "NIST IR 8270 — Foundational PNT Profile",
    sourceUrl: "https://nvlpubs.nist.gov/nistpubs/ir/2023/NIST.IR.8270.pdf",
    applicableSegments: ["SPACE_SEGMENT", "LINK_SEGMENT", "USER_SEGMENT"],
    bindingNature: "BASELINE",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["US-SPD-5-PRINCIPLE-4E", "NIST-SI-4-SYSTEM-MONITORING"],
  },
  {
    code: "NIST-800-160-CYBER-RESILIENT",
    regime: "NIST-SP-800-53",
    category: "RESILIENCE",
    title:
      "NIST SP 800-160 Vol. 2 — Cyber-resilient systems engineering for spacecraft",
    description:
      "NIST SP 800-160 Vol. 2 Rev. 1 establishes the cyber-resilient " +
      "systems-engineering framework: anticipate, withstand, recover, " +
      "adapt. For spacecraft, this means designing the on-board flight " +
      "software with: safe-mode triggers on suspected command-channel " +
      "compromise, redundant time sources to detect spoofing, " +
      "deterministic-failover bus architectures, and cyber-physical " +
      "resilience analysis as part of mission-assurance review.",
    effectiveFrom: "2021-12-09",
    citation: "NIST SP 800-160 Vol. 2 Rev. 1",
    sourceUrl:
      "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-160v2r1.pdf",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT"],
    bindingNature: "BASELINE",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: [
      "ETSI-303-645-5-9",
      "INDUSTRY-NASA-STD-1006B",
      "CISA-SSCC-CSF-RECOVER",
    ],
  },
];

// ============================================================================
// US SPD-5 — Cybersecurity Principles for Space Systems (Sept 2020)
// ============================================================================

const SPD_5_ENTRIES: ReadonlyArray<CyberRequirementEntry> = [
  {
    code: "US-SPD-5-PRINCIPLE-4A",
    regime: "US-SPD-5",
    category: "RISK_MGMT",
    title:
      "SPD-5 § 4(a) — Cybersecurity plans + risk-based + threat-informed for space",
    description:
      "Section 4(a) of Space Policy Directive 5 requires that space " +
      "system operators develop or contractually require the development " +
      "of cybersecurity plans for their space systems. Plans must be " +
      "RISK-BASED and informed by threat intelligence, and must address " +
      "the integrity, confidentiality, and availability of mission " +
      "operations + data. Binding on US Government missions through " +
      "FAR / DFARS contractor flow-down clauses.",
    effectiveFrom: "2020-09-04",
    citation: "Space Policy Directive 5 § 4(a)",
    sourceUrl:
      "https://trumpwhitehouse.archives.gov/presidential-actions/memorandum-space-policy-directive-5-cybersecurity-principles-space-systems/",
    applicableSegments: [
      "SPACE_SEGMENT",
      "GROUND_SEGMENT",
      "LINK_SEGMENT",
      "SUPPLY_CHAIN",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["GOVERNMENT", "COMMERCIAL", "CRITICAL_INFRA"],
    relatedCodes: [
      "US-SPD-5-PRINCIPLE-4D",
      "US-SPD-5-PRINCIPLE-4F-SUPPLY-CHAIN",
      "NIS2-ART-21-RISK-MGMT",
    ],
    notes:
      "SPD-5 binds USG missions directly; commercial operators are " +
      "bound by SPD-5 only when their system is incorporated into a " +
      "USG mission via FAR / DFARS clauses (e.g. NASA NSC + DoD " +
      "DFARS 252.204-7012).",
  },
  {
    code: "US-SPD-5-PRINCIPLE-4D",
    regime: "US-SPD-5",
    category: "COMSEC",
    title:
      "SPD-5 § 4(d) — Protection against unauthorised access to command + control",
    description:
      "Section 4(d) requires space systems to be protected against " +
      "unauthorised access to critical space-system functions. This " +
      "shall include safeguarding command, control, and telemetry " +
      "links using ENCRYPTION, AUTHENTICATION, OR TRANSMISSION SECURITY " +
      "measures designed to significantly increase the difficulty of " +
      "unauthorised access. For commercial integrators, this maps to " +
      "DFARS-mandated COMSEC modules + NSA-approved Type-1 cryptography " +
      "where classified data crosses the link.",
    effectiveFrom: "2020-09-04",
    citation: "Space Policy Directive 5 § 4(d)",
    sourceUrl:
      "https://trumpwhitehouse.archives.gov/presidential-actions/memorandum-space-policy-directive-5-cybersecurity-principles-space-systems/",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT", "LINK_SEGMENT"],
    bindingNature: "MANDATORY",
    operatorScope: ["GOVERNMENT", "COMMERCIAL", "CRITICAL_INFRA"],
    relatedCodes: [
      "US-SPD-5-PRINCIPLE-4A",
      "NIST-IA-5-AUTHENTICATOR-MGMT",
      "BSI-SYS-4-3-TTC-SEC",
    ],
  },
  {
    code: "US-SPD-5-PRINCIPLE-4E",
    regime: "US-SPD-5",
    category: "PNT_INTEGRITY",
    title: "SPD-5 § 4(e) — Protection against PNT interference + spoofing",
    description:
      "Section 4(e) requires that USG space systems implement " +
      "protection against COMMUNICATIONS JAMMING + SPOOFING, such as " +
      "signal-strength monitoring tools, secured + authenticated " +
      "communications, jam-resistant antennas, and on-orbit signal-" +
      "quality monitoring. Cross-references NIST IR 8270 PNT Profile.",
    effectiveFrom: "2020-09-04",
    citation: "Space Policy Directive 5 § 4(e)",
    sourceUrl:
      "https://trumpwhitehouse.archives.gov/presidential-actions/memorandum-space-policy-directive-5-cybersecurity-principles-space-systems/",
    applicableSegments: ["SPACE_SEGMENT", "LINK_SEGMENT", "USER_SEGMENT"],
    bindingNature: "MANDATORY",
    operatorScope: ["GOVERNMENT", "COMMERCIAL", "CRITICAL_INFRA"],
    relatedCodes: ["NIST-IR-8270-PNT", "US-SPD-5-PRINCIPLE-4D"],
  },
  {
    code: "US-SPD-5-PRINCIPLE-4F-SUPPLY-CHAIN",
    regime: "US-SPD-5",
    category: "SUPPLY_CHAIN",
    title: "SPD-5 § 4(f) — Supply-chain risk-management for space systems",
    description:
      "Section 4(f) requires the management of supply-chain risks " +
      "that affect cybersecurity of the space system through tracking " +
      "manufactured products + requiring high-quality sources for " +
      "critical components. Contractors must demonstrate a SUPPLY-" +
      "CHAIN RISK-MANAGEMENT PLAN covering: known-pedigree component " +
      "sourcing, anti-counterfeit measures (per SAE AS5553D), software-" +
      "bill-of-materials (SBOM) for embedded software, and chain-of-" +
      "custody for cryptographic seed material.",
    effectiveFrom: "2020-09-04",
    citation: "Space Policy Directive 5 § 4(f)",
    sourceUrl:
      "https://trumpwhitehouse.archives.gov/presidential-actions/memorandum-space-policy-directive-5-cybersecurity-principles-space-systems/",
    applicableSegments: ["SUPPLY_CHAIN", "SPACE_SEGMENT", "GROUND_SEGMENT"],
    bindingNature: "MANDATORY",
    operatorScope: ["GOVERNMENT", "COMMERCIAL", "CRITICAL_INFRA"],
    relatedCodes: ["INDUSTRY-SAE-AS5553D", "NIS2-ART-21-RISK-MGMT"],
  },
  {
    code: "US-SPD-5-PRINCIPLE-4G-INCIDENT",
    regime: "US-SPD-5",
    category: "INCIDENT_RESPONSE",
    title:
      "SPD-5 § 4(g) — Incident reporting + information sharing for USG missions",
    description:
      "Section 4(g) requires the reporting of cybersecurity incidents " +
      "affecting space systems + the sharing of cyber threat " +
      "information to enable broader awareness across the US " +
      "Government + commercial space ecosystem. Incidents must be " +
      "reported to the responsible federal sponsor + (where applicable) " +
      "to CISA via the US Cybersecurity + Infrastructure Security " +
      "Agency reporting channels.",
    effectiveFrom: "2020-09-04",
    citation: "Space Policy Directive 5 § 4(g)",
    sourceUrl:
      "https://trumpwhitehouse.archives.gov/presidential-actions/memorandum-space-policy-directive-5-cybersecurity-principles-space-systems/",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT", "LINK_SEGMENT"],
    bindingNature: "MANDATORY",
    operatorScope: ["GOVERNMENT", "COMMERCIAL", "CRITICAL_INFRA"],
    relatedCodes: ["NIS2-ART-23-EARLY-WARN", "CISA-SSCC-CSF-RESPOND"],
  },
];

// ============================================================================
// ENISA Threat Landscape for Space (2023, 2024 update) — EU Advisory
// ============================================================================

const ENISA_THREAT_LANDSCAPE_ENTRIES: ReadonlyArray<CyberRequirementEntry> = [
  {
    code: "ENISA-LANDSCAPE-GROUND",
    regime: "ENISA-THREAT-LANDSCAPE",
    category: "THREAT_INTEL",
    title:
      "ENISA Threat Landscape § 5 — Ground-segment threat catalogue + controls",
    description:
      "ENISA Threat Landscape for the Space Sector (Dec 2023, 2024 " +
      "update) catalogues 24 threats against the GROUND SEGMENT " +
      "(mission ops centres, ground stations, network operations " +
      "centres). Recommended controls: network segmentation, MFA for " +
      "privileged access, endpoint detection + response (EDR), " +
      "physical-access controls (visitor logs, badge readers, mantraps " +
      "for restricted areas), and supply-chain audits of " +
      "telecommunications + IT vendors.",
    effectiveFrom: "2023-12-01",
    citation: "ENISA Threat Landscape for the Space Sector (2023, 2024 update)",
    sourceUrl:
      "https://www.enisa.europa.eu/publications/enisa-threat-landscape-for-the-space-sector",
    applicableSegments: ["GROUND_SEGMENT"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["NIS2-ART-21-RISK-MGMT", "BSI-SYS-4-2-GROUND-SEC"],
  },
  {
    code: "ENISA-LANDSCAPE-SPACE",
    regime: "ENISA-THREAT-LANDSCAPE",
    category: "THREAT_INTEL",
    title:
      "ENISA Threat Landscape § 6 — Space-segment threat catalogue + controls",
    description:
      "ENISA catalogues 18 threats against the SPACE SEGMENT " +
      "(satellites + spacecraft): malware injection via uplink, " +
      "unauthorised command sequences, on-board software " +
      "vulnerabilities, hardware tampering pre-launch, supply-chain " +
      "compromise of flight components, and physical-layer jamming. " +
      "Recommended controls: signed firmware updates, on-board IDS " +
      "for command stream, hardware-rooted secure boot, and quantum-" +
      "resistant key wrapping for long-mission satellites.",
    effectiveFrom: "2023-12-01",
    citation: "ENISA Threat Landscape for the Space Sector (2023, 2024 update)",
    sourceUrl:
      "https://www.enisa.europa.eu/publications/enisa-threat-landscape-for-the-space-sector",
    applicableSegments: ["SPACE_SEGMENT"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["ETSI-303-645-5-7", "INDUSTRY-NASA-STD-1006B"],
  },
  {
    code: "ENISA-LANDSCAPE-LINK",
    regime: "ENISA-THREAT-LANDSCAPE",
    category: "THREAT_INTEL",
    title:
      "ENISA Threat Landscape § 7 — Link-segment threats (jamming + spoofing + eavesdropping)",
    description:
      "ENISA catalogues 21 threats against the LINK SEGMENT (uplink, " +
      "downlink, inter-satellite link): denial-of-service jamming, " +
      "spoofing of GNSS + telemetry, eavesdropping on unencrypted " +
      "downlinks, replay attacks on telecommand frames, and frequency-" +
      "shifted impersonation. Recommended controls: frequency-hopping " +
      "spread-spectrum, encrypted + authenticated command channel, " +
      "anti-replay nonces, link-budget monitoring + automated " +
      "switchover to backup ground stations.",
    effectiveFrom: "2023-12-01",
    citation: "ENISA Threat Landscape for the Space Sector (2023, 2024 update)",
    sourceUrl:
      "https://www.enisa.europa.eu/publications/enisa-threat-landscape-for-the-space-sector",
    applicableSegments: ["LINK_SEGMENT"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: [
      "US-SPD-5-PRINCIPLE-4D",
      "US-SPD-5-PRINCIPLE-4E",
      "BSI-SYS-4-3-TTC-SEC",
    ],
  },
  {
    code: "ENISA-LANDSCAPE-USER",
    regime: "ENISA-THREAT-LANDSCAPE",
    category: "THREAT_INTEL",
    title:
      "ENISA Threat Landscape § 8 — User-segment threats + supply-chain compromise",
    description:
      "ENISA catalogues 18 threats against the USER SEGMENT + " +
      "associated SUPPLY CHAIN: phishing campaigns against operator " +
      "staff, supply-chain insertion of malicious components, default-" +
      "credential abuse on user terminals (mass-recruited into " +
      "botnets), insider threats, and weak cryptographic protocols " +
      "on consumer satellite-IoT gateways. Recommended controls: " +
      "ETSI EN 303 645 baseline conformity, MFA, security-awareness " +
      "training, vendor-risk assessments, SBOM verification.",
    effectiveFrom: "2023-12-01",
    citation: "ENISA Threat Landscape for the Space Sector (2023, 2024 update)",
    sourceUrl:
      "https://www.enisa.europa.eu/publications/enisa-threat-landscape-for-the-space-sector",
    applicableSegments: ["USER_SEGMENT", "SUPPLY_CHAIN"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["ETSI-303-645-5-1", "INDUSTRY-SAE-AS5553D"],
  },
];

// ============================================================================
// BSI IT-Grundschutz SYS.4 — German Federal Cyber Baseline (Space + Ground)
// ============================================================================

const BSI_GRUNDSCHUTZ_ENTRIES: ReadonlyArray<CyberRequirementEntry> = [
  {
    code: "BSI-SYS-4-1-SPACE-BASELINE",
    regime: "BSI-IT-GRUNDSCHUTZ",
    category: "RISK_MGMT",
    title:
      "BSI IT-Grundschutz SYS.4.1 — General space-segment protection (Weltraumsysteme)",
    description:
      "Module SYS.4.1 of the IT-Grundschutz-Kompendium (Edition 2023) " +
      "establishes the general protection requirements for space " +
      "segments operated under German jurisdiction or by German " +
      "federal agencies. Key requirements (Anforderungen): SYS.4.1.A1 " +
      "(Sicherheitsrichtlinie für Weltraumsysteme), SYS.4.1.A2 " +
      "(Risikoanalyse vor Missionsbeginn), SYS.4.1.A3 (Härtung der " +
      "On-Board-Software), SYS.4.1.A4 (Sicheres Kommandieren). Binding " +
      "on federal missions + critical-infrastructure operators under " +
      "IT-SiG 2.0.",
    effectiveFrom: "2023-02-01",
    citation: "BSI IT-Grundschutz-Kompendium Edition 2023 — SYS.4.1",
    sourceUrl:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/IT-Grundschutz/IT-Grundschutz-Kompendium/itgrundschutzKompendium_node.html",
    applicableSegments: ["SPACE_SEGMENT"],
    bindingNature: "BASELINE",
    operatorScope: ["GOVERNMENT", "CRITICAL_INFRA", "COMMERCIAL"],
    relatedCodes: [
      "BSI-SYS-4-2-GROUND-SEC",
      "BSI-SYS-4-3-TTC-SEC",
      "NIS2-ART-21-RISK-MGMT",
    ],
  },
  {
    code: "BSI-SYS-4-2-GROUND-SEC",
    regime: "BSI-IT-GRUNDSCHUTZ",
    category: "GROUND_STATION_PROTECTION",
    title:
      "BSI IT-Grundschutz SYS.4.2 — Ground-segment baseline (Bodenstationen)",
    description:
      "Module SYS.4.2 establishes the protection requirements for " +
      "ground stations + mission operations centres: SYS.4.2.A1 " +
      "(Zugangsschutz zum Kontrollzentrum / physical access), " +
      "SYS.4.2.A2 (Netzwerksegmentierung TT&C / corporate), SYS.4.2.A3 " +
      "(Härtung der Bodenstations-IT), SYS.4.2.A4 (Notfallplanung / " +
      "BCM), SYS.4.2.A5 (Personalsicherheit + Schulung). Aligns with " +
      "NIST SC-7 boundary protection + NIS2 Art. 21 measures.",
    effectiveFrom: "2023-02-01",
    citation: "BSI IT-Grundschutz-Kompendium Edition 2023 — SYS.4.2",
    sourceUrl:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/IT-Grundschutz/IT-Grundschutz-Kompendium/itgrundschutzKompendium_node.html",
    applicableSegments: ["GROUND_SEGMENT"],
    bindingNature: "BASELINE",
    operatorScope: ["GOVERNMENT", "CRITICAL_INFRA", "COMMERCIAL"],
    relatedCodes: [
      "BSI-SYS-4-1-SPACE-BASELINE",
      "NIST-SC-7-BOUNDARY-PROTECTION",
      "ENISA-LANDSCAPE-GROUND",
    ],
  },
  {
    code: "BSI-SYS-4-3-TTC-SEC",
    regime: "BSI-IT-GRUNDSCHUTZ",
    category: "TT_AND_C_SECURITY",
    title: "BSI IT-Grundschutz SYS.4.3 — Telemetry + telecommand security",
    description:
      "Module SYS.4.3 establishes the protection requirements for the " +
      "TT&C (Telemetry, Tracking, and Command) link: SYS.4.3.A1 " +
      "(Authentisierte Kommandos), SYS.4.3.A2 (Verschlüsselung der " +
      "Up-/Downlink), SYS.4.3.A3 (Anti-Replay-Mechanismen), SYS.4.3.A4 " +
      "(Monitoring of link integrity + jamming detection), SYS.4.3.A5 " +
      "(Schlüsselmanagement-Verfahren für COMSEC-Material). Key for " +
      "the cross-walk to NIS2 incident-reporting on TT&C compromise.",
    effectiveFrom: "2023-02-01",
    citation: "BSI IT-Grundschutz-Kompendium Edition 2023 — SYS.4.3",
    sourceUrl:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/IT-Grundschutz/IT-Grundschutz-Kompendium/itgrundschutzKompendium_node.html",
    applicableSegments: ["LINK_SEGMENT", "SPACE_SEGMENT", "GROUND_SEGMENT"],
    bindingNature: "BASELINE",
    operatorScope: ["GOVERNMENT", "CRITICAL_INFRA", "COMMERCIAL"],
    relatedCodes: [
      "US-SPD-5-PRINCIPLE-4D",
      "ETSI-303-645-5-5",
      "NIS2-ART-23-EARLY-WARN",
    ],
    notes:
      "BSI SYS.4.3 cross-references the NIS2 Art. 23 incident-" +
      "reporting timeline for any TT&C compromise event under the " +
      "German IT-SiG 2.0 transposition.",
  },
  {
    code: "BSI-IT-SIG-2-NIS2-XREF",
    regime: "BSI-IT-GRUNDSCHUTZ",
    category: "REGISTRATION",
    title:
      "IT-Sicherheitsgesetz 2.0 — German NIS2 transposition for space operators",
    description:
      "The IT-Sicherheitsgesetz 2.0 (§§ 8-14 BSIG) transposes NIS2 " +
      "Directive into German law + designates the BSI as the " +
      "competent authority for the digital-infrastructure sector + " +
      "extends to satellite operators under Annex II.6. Operators " +
      "must register with the BSI within 3 months of qualifying " +
      "for the regime + comply with the BSI's notification + audit " +
      "requirements. Sectoral fines under § 14 BSIG layer on top of " +
      "the NIS2 Art. 34 / 35 ceilings.",
    effectiveFrom: "2024-10-17",
    citation: "IT-Sicherheitsgesetz 2.0 §§ 8-14 BSIG (NIS2-Umsetzungsgesetz)",
    sourceUrl: "https://www.gesetze-im-internet.de/bsig_2009/",
    applicableSegments: ["GROUND_SEGMENT", "LINK_SEGMENT", "USER_SEGMENT"],
    bindingNature: "MANDATORY",
    operatorScope: ["CRITICAL_INFRA", "COMMERCIAL"],
    relatedCodes: [
      "NIS2-ART-21-RISK-MGMT",
      "NIS2-ART-24-REGISTRY",
      "BSI-SYS-4-1-SPACE-BASELINE",
    ],
  },
];

// ============================================================================
// CISA Space SCC Guidance — US Best Practices (CSF 2.0 + JADC2)
// ============================================================================

const CISA_SSCC_ENTRIES: ReadonlyArray<CyberRequirementEntry> = [
  {
    code: "CISA-SSCC-CSF-IDENTIFY",
    regime: "CISA-SSCC",
    category: "RISK_MGMT",
    title:
      "CISA SSCC — CSF 2.0 IDENTIFY function for space-system asset inventory",
    description:
      "CISA Space Systems Cybersecurity Coordinating Group guidance " +
      "(May 2024) maps SPD-5 + NIST CSF 2.0 to commercial space " +
      "operators. Under the IDENTIFY function, operators must " +
      "maintain an asset inventory of ground-segment + space-segment " +
      "systems, document data flows between segments, identify " +
      "regulatory + contractual requirements, and conduct risk " +
      "assessments at planned cadence (typically 12-month).",
    effectiveFrom: "2024-05-15",
    citation: "CISA Space SCC Guidance — CSF 2.0 IDENTIFY",
    sourceUrl:
      "https://www.cisa.gov/topics/critical-infrastructure-security-and-resilience/critical-infrastructure-sectors/government-facilities-sector/space-systems",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT", "SUPPLY_CHAIN"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA", "GOVERNMENT"],
    relatedCodes: ["US-SPD-5-PRINCIPLE-4A", "NIST-CM-3-CONFIG-CHANGE"],
  },
  {
    code: "CISA-SSCC-CSF-DETECT",
    regime: "CISA-SSCC",
    category: "TELEMETRY_MONITORING",
    title:
      "CISA SSCC — CSF 2.0 DETECT function for space-system anomalies + IOCs",
    description:
      "Under the DETECT function, operators must implement continuous " +
      "monitoring of ground-segment networks (SIEM + EDR), correlate " +
      "telemetry anomalies with cyber-indicators of compromise, " +
      "participate in threat-intel sharing through the Space-ISAC, " +
      "and maintain detection capabilities for: command-channel " +
      "anomalies, unexpected configuration changes, network-traffic " +
      "deviations, and supply-chain alerts.",
    effectiveFrom: "2024-05-15",
    citation: "CISA Space SCC Guidance — CSF 2.0 DETECT",
    sourceUrl:
      "https://www.cisa.gov/topics/critical-infrastructure-security-and-resilience/critical-infrastructure-sectors/government-facilities-sector/space-systems",
    applicableSegments: ["GROUND_SEGMENT", "SPACE_SEGMENT", "LINK_SEGMENT"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA", "GOVERNMENT"],
    relatedCodes: ["NIST-SI-4-SYSTEM-MONITORING", "ETSI-303-645-5-10"],
  },
  {
    code: "CISA-SSCC-CSF-RESPOND",
    regime: "CISA-SSCC",
    category: "INCIDENT_RESPONSE",
    title: "CISA SSCC — CSF 2.0 RESPOND function + JADC2-aligned cyber posture",
    description:
      "Under the RESPOND function, operators must maintain incident-" +
      "response plans aligned with Joint All-Domain Command and " +
      "Control (JADC2) cyber posture, share incident information " +
      "with CISA + Space-ISAC, coordinate response with affected " +
      "Member State CSIRTs (for EU-touching operators) + sector " +
      "regulators, and conduct quarterly tabletop exercises against " +
      "the ENISA + CISA threat scenarios.",
    effectiveFrom: "2024-05-15",
    citation: "CISA Space SCC Guidance — CSF 2.0 RESPOND",
    sourceUrl:
      "https://www.cisa.gov/topics/critical-infrastructure-security-and-resilience/critical-infrastructure-sectors/government-facilities-sector/space-systems",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT", "LINK_SEGMENT"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA", "GOVERNMENT"],
    relatedCodes: ["US-SPD-5-PRINCIPLE-4G-INCIDENT", "NIS2-ART-23-EARLY-WARN"],
  },
  {
    code: "CISA-SSCC-CSF-RECOVER",
    regime: "CISA-SSCC",
    category: "CONTINGENCY",
    title: "CISA SSCC — CSF 2.0 RECOVER function + cyber-resilient mission ops",
    description:
      "Under the RECOVER function, operators must maintain recovery " +
      "plans for ground-segment systems (RTO + RPO targets per system " +
      "criticality), implement spacecraft safe-mode procedures " +
      "triggered by cyber events, document lessons-learned + update " +
      "controls, and validate recovery procedures through annual " +
      "exercises. Cross-references NIST SP 800-160 Vol. 2 cyber-" +
      "resilient systems framework.",
    effectiveFrom: "2024-05-15",
    citation: "CISA Space SCC Guidance — CSF 2.0 RECOVER",
    sourceUrl:
      "https://www.cisa.gov/topics/critical-infrastructure-security-and-resilience/critical-infrastructure-sectors/government-facilities-sector/space-systems",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA", "GOVERNMENT"],
    relatedCodes: ["NIST-800-160-CYBER-RESILIENT", "ETSI-303-645-5-9"],
  },
];

// ============================================================================
// Industry-Consensus Standards (SAE AS5553D, IEC 62443, ESA TEC-S, NASA-STD-1006B)
// ============================================================================

const INDUSTRY_CONSENSUS_ENTRIES: ReadonlyArray<CyberRequirementEntry> = [
  {
    code: "INDUSTRY-SAE-AS5553D",
    regime: "INDUSTRY-CONSENSUS",
    category: "SUPPLY_CHAIN",
    title:
      "SAE AS5553D — Counterfeit electronic parts: avoidance + detection + disposition",
    description:
      "SAE AS5553D (2022) establishes the consensus standard for " +
      "counterfeit electronic-part avoidance, detection, mitigation, " +
      "and disposition in aerospace + defence supply chains. " +
      "Requirements include: trusted-source sourcing (OCM / OEM / " +
      "OCM-authorised), counterfeit-component awareness training, " +
      "inspection + test programmes for higher-risk components, " +
      "supplier-quality monitoring, and disposition of confirmed " +
      "counterfeit parts. Increasingly required for SPD-5 § 4(f) " +
      "supply-chain risk-management compliance.",
    effectiveFrom: "2022-06-15",
    citation: "SAE AS5553D — Counterfeit Electronic Parts (2022)",
    sourceUrl: "https://www.sae.org/standards/content/as5553d/",
    applicableSegments: ["SUPPLY_CHAIN", "SPACE_SEGMENT", "GROUND_SEGMENT"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: [
      "US-SPD-5-PRINCIPLE-4F-SUPPLY-CHAIN",
      "INDUSTRY-IEC-62443",
      "ENISA-LANDSCAPE-USER",
    ],
  },
  {
    code: "INDUSTRY-IEC-62443",
    regime: "INDUSTRY-CONSENSUS",
    category: "GROUND_STATION_PROTECTION",
    title: "IEC 62443 — Industrial cyber for ground-control SCADA systems",
    description:
      "The IEC 62443 series establishes the consensus standard for " +
      "industrial communication networks + system security. Key " +
      "parts: 62443-2-1 (security management system), 62443-3-2 " +
      "(security risk assessment for system design), 62443-3-3 " +
      "(system security requirements + levels SL1-SL4), 62443-4-1 " +
      "(secure product development lifecycle). For satellite ground-" +
      "control SCADA systems running flight-dynamics + spacecraft-" +
      "ops applications, IEC 62443-3-3 SL2/SL3 is the target maturity.",
    effectiveFrom: "2018-08-15",
    citation: "IEC 62443 series (62443-2-1, 62443-3-2, 62443-3-3, 62443-4-1)",
    sourceUrl: "https://webstore.iec.ch/publication/7029",
    applicableSegments: ["GROUND_SEGMENT", "LINK_SEGMENT"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL", "CRITICAL_INFRA", "GOVERNMENT"],
    relatedCodes: [
      "BSI-SYS-4-2-GROUND-SEC",
      "NIST-SC-7-BOUNDARY-PROTECTION",
      "ENISA-LANDSCAPE-GROUND",
    ],
  },
  {
    code: "INDUSTRY-ESA-TEC-S-GALILEO",
    regime: "INDUSTRY-CONSENSUS",
    category: "COMSEC",
    title:
      "ESA TEC-S Cybersecurity — Galileo Mission Operations + GMS protection",
    description:
      "ESA TEC-S Cybersecurity programme establishes the cybersecurity " +
      "requirements for Galileo Mission Operations + the Galileo " +
      "Security Monitoring Centre (GSMC). Requirements include: " +
      "encryption of the Galileo Public Regulated Service (PRS) signal, " +
      "anti-spoofing measures for the Open Service (OS), authenticated " +
      "navigation messages (OSNMA), and dedicated COMSEC procedures " +
      "for ground-segment + space-segment commanding. Sets the bar " +
      "for European GNSS cybersecurity assurance.",
    effectiveFrom: "2022-01-01",
    citation: "ESA TEC-S Cybersecurity — Galileo Mission Operations",
    sourceUrl:
      "https://www.esa.int/Applications/Navigation/Galileo/Galileo_Security",
    applicableSegments: [
      "SPACE_SEGMENT",
      "LINK_SEGMENT",
      "GROUND_SEGMENT",
      "USER_SEGMENT",
    ],
    bindingNature: "GUIDELINE",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: [
      "NIST-IR-8270-PNT",
      "US-SPD-5-PRINCIPLE-4E",
      "BSI-SYS-4-3-TTC-SEC",
    ],
  },
  {
    code: "INDUSTRY-NASA-STD-1006B",
    regime: "INDUSTRY-CONSENSUS",
    category: "RISK_MGMT",
    title:
      "NASA-STD-1006B — Space Asset Protection overlay for mission systems",
    description:
      "NASA Standard 1006B (Space Asset Protection Standard) is the " +
      "NASA overlay to NIST SP 800-53 for NASA mission systems. Key " +
      "requirements: SAP-IDM (identity management for mission " +
      "operators), SAP-AOP (authorised operations procedures + " +
      "command-table change management), SAP-CRY (cryptographic " +
      "key-management for telecommand encryption), and SAP-SEC " +
      "(spacecraft-security configuration baseline). Binding on " +
      "NASA-sponsored missions + flow-down to NASA contractors.",
    effectiveFrom: "2019-08-30",
    citation: "NASA-STD-1006B — Space Asset Protection Standard",
    sourceUrl: "https://standards.nasa.gov/standard/nasa/nasa-std-1006",
    applicableSegments: ["SPACE_SEGMENT", "GROUND_SEGMENT", "LINK_SEGMENT"],
    bindingNature: "GUIDELINE",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: [
      "US-SPD-5-PRINCIPLE-4A",
      "US-SPD-5-PRINCIPLE-4D",
      "NIST-800-160-CYBER-RESILIENT",
    ],
  },
];

// ============================================================================
// CONSOLIDATED EXPORT
// ============================================================================

/** All cyber-baseline requirements across all regimes. */
export const CYBER_BASELINE_REQUIREMENTS: ReadonlyArray<CyberRequirementEntry> =
  [
    ...ETSI_303_645_ENTRIES,
    ...NIS2_ENTRIES,
    ...NIST_800_53_ENTRIES,
    ...SPD_5_ENTRIES,
    ...ENISA_THREAT_LANDSCAPE_ENTRIES,
    ...BSI_GRUNDSCHUTZ_ENTRIES,
    ...CISA_SSCC_ENTRIES,
    ...INDUSTRY_CONSENSUS_ENTRIES,
  ];

/** Coverage metadata. */
export const CYBER_BASELINE_COVERAGE = {
  totalEntries: CYBER_BASELINE_REQUIREMENTS.length,
  byRegime: {
    "ETSI-EN-303-645": CYBER_BASELINE_REQUIREMENTS.filter(
      (e) => e.regime === "ETSI-EN-303-645",
    ).length,
    NIS2: CYBER_BASELINE_REQUIREMENTS.filter((e) => e.regime === "NIS2").length,
    "NIST-SP-800-53": CYBER_BASELINE_REQUIREMENTS.filter(
      (e) => e.regime === "NIST-SP-800-53",
    ).length,
    "US-SPD-5": CYBER_BASELINE_REQUIREMENTS.filter(
      (e) => e.regime === "US-SPD-5",
    ).length,
    "ENISA-THREAT-LANDSCAPE": CYBER_BASELINE_REQUIREMENTS.filter(
      (e) => e.regime === "ENISA-THREAT-LANDSCAPE",
    ).length,
    "BSI-IT-GRUNDSCHUTZ": CYBER_BASELINE_REQUIREMENTS.filter(
      (e) => e.regime === "BSI-IT-GRUNDSCHUTZ",
    ).length,
    "CISA-SSCC": CYBER_BASELINE_REQUIREMENTS.filter(
      (e) => e.regime === "CISA-SSCC",
    ).length,
    "INDUSTRY-CONSENSUS": CYBER_BASELINE_REQUIREMENTS.filter(
      (e) => e.regime === "INDUSTRY-CONSENSUS",
    ).length,
  },
  asOf: CYBER_BASELINE_AS_OF,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Find a single requirement by its code. */
export function findCyberEntry(
  code: string,
): CyberRequirementEntry | undefined {
  return CYBER_BASELINE_REQUIREMENTS.find((entry) => entry.code === code);
}

/** Find all entries for a given regime. */
export function findCyberByRegime(
  regime: CyberRegime,
): ReadonlyArray<CyberRequirementEntry> {
  return CYBER_BASELINE_REQUIREMENTS.filter((entry) => entry.regime === regime);
}

/** Find all entries for a given category. */
export function findCyberByCategory(
  category: CyberCategory,
): ReadonlyArray<CyberRequirementEntry> {
  return CYBER_BASELINE_REQUIREMENTS.filter(
    (entry) => entry.category === category,
  );
}

/**
 * Find all entries that apply to a given space segment.
 * Entries whose applicableSegments include the queried segment are
 * returned.
 */
export function findCyberBySegment(
  segment: SpaceSegment,
): ReadonlyArray<CyberRequirementEntry> {
  return CYBER_BASELINE_REQUIREMENTS.filter((entry) =>
    entry.applicableSegments.includes(segment),
  );
}

/** Find all entries by binding nature. */
export function findCyberByBindingNature(
  bindingNature: CyberBindingNature,
): ReadonlyArray<CyberRequirementEntry> {
  return CYBER_BASELINE_REQUIREMENTS.filter(
    (entry) => entry.bindingNature === bindingNature,
  );
}

/**
 * Find mandatory + harmonised + baseline cyber requirements applicable
 * to a specific jurisdiction. EU Member States see NIS2 + ETSI; UK
 * sees ETSI (via PSTI) + GB-transposed NIS2; US sees NIST + SPD-5;
 * DE additionally sees BSI; Japan sees industry-consensus only.
 */
export function findMandatoryCyberForJurisdiction(
  jurisdiction: string,
): ReadonlyArray<CyberRequirementEntry> {
  const jurisdictionRegimes: Record<string, ReadonlyArray<CyberRegime>> = {
    US: ["NIST-SP-800-53", "US-SPD-5", "CISA-SSCC", "INDUSTRY-CONSENSUS"],
    GB: [
      "ETSI-EN-303-645",
      "NIS2", // UK has equivalent regime (NIS Regulations 2018 + 2024 amendments)
      "INDUSTRY-CONSENSUS",
    ],
    UK: ["ETSI-EN-303-645", "NIS2", "INDUSTRY-CONSENSUS"],
    DE: [
      "ETSI-EN-303-645",
      "NIS2",
      "BSI-IT-GRUNDSCHUTZ",
      "ENISA-THREAT-LANDSCAPE",
      "INDUSTRY-CONSENSUS",
    ],
    FR: [
      "ETSI-EN-303-645",
      "NIS2",
      "ENISA-THREAT-LANDSCAPE",
      "INDUSTRY-CONSENSUS",
    ],
    IT: [
      "ETSI-EN-303-645",
      "NIS2",
      "ENISA-THREAT-LANDSCAPE",
      "INDUSTRY-CONSENSUS",
    ],
    ES: [
      "ETSI-EN-303-645",
      "NIS2",
      "ENISA-THREAT-LANDSCAPE",
      "INDUSTRY-CONSENSUS",
    ],
    NL: [
      "ETSI-EN-303-645",
      "NIS2",
      "ENISA-THREAT-LANDSCAPE",
      "INDUSTRY-CONSENSUS",
    ],
    BE: [
      "ETSI-EN-303-645",
      "NIS2",
      "ENISA-THREAT-LANDSCAPE",
      "INDUSTRY-CONSENSUS",
    ],
    SE: [
      "ETSI-EN-303-645",
      "NIS2",
      "ENISA-THREAT-LANDSCAPE",
      "INDUSTRY-CONSENSUS",
    ],
    PL: [
      "ETSI-EN-303-645",
      "NIS2",
      "ENISA-THREAT-LANDSCAPE",
      "INDUSTRY-CONSENSUS",
    ],
    AT: [
      "ETSI-EN-303-645",
      "NIS2",
      "ENISA-THREAT-LANDSCAPE",
      "INDUSTRY-CONSENSUS",
    ],
    FI: [
      "ETSI-EN-303-645",
      "NIS2",
      "ENISA-THREAT-LANDSCAPE",
      "INDUSTRY-CONSENSUS",
    ],
    DK: [
      "ETSI-EN-303-645",
      "NIS2",
      "ENISA-THREAT-LANDSCAPE",
      "INDUSTRY-CONSENSUS",
    ],
    CH: ["ETSI-EN-303-645", "INDUSTRY-CONSENSUS"],
    NO: ["ETSI-EN-303-645", "INDUSTRY-CONSENSUS"],
    JP: ["INDUSTRY-CONSENSUS"],
  };
  const regimes = jurisdictionRegimes[jurisdiction.toUpperCase()] ?? [];
  return CYBER_BASELINE_REQUIREMENTS.filter(
    (entry) =>
      regimes.includes(entry.regime) &&
      (entry.bindingNature === "MANDATORY" ||
        entry.bindingNature === "HARMONISED" ||
        entry.bindingNature === "BASELINE"),
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
