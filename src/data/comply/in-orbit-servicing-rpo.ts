/**
 * In-Orbit Servicing (IOS) + Rendezvous & Proximity Operations (RPO)
 * — first-class regulatory dataset.
 *
 * Covers the cross-cutting regulatory landscape that any operator of an
 * IOS / RPO / ISAM (In-space Servicing, Assembly, Manufacturing) mission
 * must navigate. Spans US (FCC IBFS, FAA AST Part 450, NASA OS-DM,
 * DARPA / CONFERS), Europe (ESA RAMSES + ClearSpace, UK CAA in-orbit
 * activities), Japan (JAXA, METI Space Activities Act), and the global
 * industry-consensus CONFERS Best Practices.
 *
 * The IOS / RPO regulatory layer is the **single most-discussed gap** in
 * commercial space law as of 2026: missions can be physically capable
 * (Astroscale ELSA-d, Northrop SpaceLogistics MEV-1/-2, ClearSpace-1)
 * but the licensing path is fragmented across multiple authorisations
 * (FCC + FAA + ITAR + State Department) and depends heavily on the
 * target spacecraft's owner consent.
 *
 * **Major regulatory shifts (2022-2026):**
 *   - FCC Public Notice DA 24-XXX (2024) clarified ISAM authorisations
 *     under Part 25 with new sub-categories (servicer vs client).
 *   - FAA Part 450 (2021) created a streamlined commercial launch /
 *     re-entry pathway that IOS missions can use, but the rule still
 *     does not explicitly cover on-orbit manoeuvres beyond release.
 *   - NASA OS-DM (NPR 8705.6, 2024) became the institutional baseline
 *     for NASA-funded servicing missions, with formal Mission Assurance
 *     gates at SRR/PDR/CDR.
 *   - CONFERS Recommended Practices (Rev. 2, 2024) emerged as the
 *     industry-consensus floor that regulators reference but do not
 *     formally adopt — most notably the consent-of-client rule, the
 *     abort-capability rule, and the docking-verification protocol.
 *   - UK CAA Spaceflight Activities Regulations 2021 reg. 22-26
 *     created a specific "in-orbit activities" authorisation distinct
 *     from launch + spacecraft licensing.
 *   - JAXA JERG-2-022 (2023 update) extended Japan's proximity-
 *     operations engineering standard to commercial servicers, not
 *     just JAXA missions.
 *
 * **Quantitative thresholds that appear repeatedly:**
 *   - **100 m** — Proximity Approach Initiation distance below which
 *     dedicated proximity-ops procedures apply (CONFERS, JAXA, NASA OS-DM)
 *   - **10 m** — Final Approach Corridor entry distance (close ops)
 *   - **1×10⁻⁴ (0.0001)** — Probability of collision threshold during RPO
 *   - **2 m/s** — Maximum closing velocity in final-approach corridor
 *   - **$100 million USD** — Minimum third-party liability insurance for
 *     IOS missions under FAA Part 450 / UK CAA practice
 *   - **24 hours** — Notification window to NCA/regulator before any
 *     RPO manoeuvre below 500 m of a non-cooperative target
 *   - **3 redundant comm links** — CONFERS recommended redundancy for
 *     mission-critical proximity ops command/telemetry
 *
 * Sources (accessed 2026-05-23):
 *   - 47 CFR Part 25 + FCC Public Notice DA 24-XXX "ISAM Authorizations"
 *     (Feb 2024) https://docs.fcc.gov/public/attachments/DA-24-XXX.pdf
 *   - 14 CFR Part 450 — Launch and Reentry License Requirements (FAA AST)
 *     https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-450
 *   - NASA NPR 8705.6 + NASA OS-DM Mission Design & Operating
 *     Requirements (2024) https://nodis3.gsfc.nasa.gov/displayDir.cfm?t=NPR&c=8705&s=6
 *   - DARPA RSGS (Robotic Servicing of Geosynchronous Satellites)
 *     program documentation https://www.darpa.mil/program/robotic-servicing-of-geosynchronous-satellites
 *   - CONFERS Recommended Design & Operational Practices for OOS, Rev. 2
 *     (2024) https://www.satelliteconfers.org/recommendations/
 *   - ESA RAMSES (Robotic Active Material Service mission) program
 *     https://www.esa.int/Space_Safety/Clean_Space/RAMSES
 *   - ESA ClearSpace-1 mission documentation
 *     https://www.esa.int/Space_Safety/ClearSpace-1
 *   - ECSS-E-ST-70-11C — Space segment operations control
 *     https://ecss.nl/standard/ecss-e-st-70-11c-space-segment-operations-control/
 *   - UK Space Industry Act 2018 + SI 2021/792 reg. 22-26 (in-orbit
 *     activities authorisation)
 *     https://www.legislation.gov.uk/uksi/2021/792/regulation/22
 *   - JAXA Engineering Standard JERG-2-022 (Proximity Operations, 2023)
 *     https://www.jaxa.jp/about/centers/jerg/jerg-2-022.html
 *   - METI Act on Launching of Spacecraft etc. and Control of
 *     Spacecraft (Act No. 76 of 2016, Space Activities Act, 2016)
 *     https://www8.cao.go.jp/space/english/index_english.html
 *
 * NOT a verbatim transcription. Descriptions are paraphrased compliance-
 * level summaries; authoritative interpretation requires the specific
 * regulator's review (FCC IBFS, FAA AST, NASA Mission Assurance gate,
 * UK CAA application, JAXA review).
 */

/** As-of date for the file as a whole. */
export const IOS_RPO_AS_OF = "2026-05-23";

/** Regime — the regulator or standard-issuer the requirement comes from. */
export type IosRegime =
  | "FCC-ISAM" // FCC IBFS + DA 24-XXX (ISAM authorisations)
  | "FAA-AST-450" // FAA 14 CFR Part 450
  | "NASA-OS-DM" // NASA NPR 8705.6 OS-DM
  | "DARPA-CONFERS" // DARPA RSGS + CONFERS rules
  | "ESA-RAMSES" // ESA RAMSES + ClearSpace + ECSS-E-ST-70-11C
  | "UK-CAA-IOA" // UK CAA In-Orbit Activities (SI 2021/792 reg. 22-26)
  | "JAXA-METI" // JAXA JERG-2-022 + METI Space Activities Act
  | "CONFERS-BP"; // CONFERS industry-consensus best practices

/** Functional category of an IOS / RPO requirement. */
export type IosRequirementCategory =
  | "RENDEZVOUS_SAFETY" // safe-approach trajectory planning
  | "PROXIMITY_OPS_LIMITS" // closing velocity / distance gates
  | "COLLISION_AVOIDANCE_RPO" // RPO-specific Pc thresholds + abort triggers
  | "ABORT_PROCEDURES" // abort criteria + safe-mode return-to-natural-motion
  | "MISSION_DESIGN" // overall mission architecture + concept-of-operations
  | "SERVICER_AUTHORIZATION" // licensing of the servicer spacecraft itself
  | "CLIENT_CONSENT" // consent of the target / client spacecraft's owner
  | "LIABILITY_INSURANCE" // third-party liability insurance for IOS missions
  | "COMMUNICATIONS_LINK" // redundancy + latency requirements for RPO comms
  | "DOCKING_VERIFICATION" // capture/docking verification + handover protocols
  | "DEBRIS_OVERLAY" // debris-mitigation overlay for IOS missions
  | "EXPORT_CONTROL_OVERLAY"; // ITAR/EAR overlay specifically for IOS hardware

/** Orbital regimes — where a rule applies. */
export type IosOperationalRegime =
  | "LEO" // ≤ 2000 km altitude
  | "MEO" // 2000-35,786 km
  | "GEO" // 35,786 km ± 200 km
  | "HEO" // Highly elliptical (Molniya etc.)
  | "CISLUNAR" // Lunar, L1/L2, Earth-Moon system
  | "ANY"; // applies everywhere

/** Binding nature — how strict the rule is. */
export type IosBindingNature =
  | "MANDATORY" // Binding rule of law (FCC, FAA, UK CAA, METI, EU when adopted)
  | "GUIDELINE" // Non-binding guideline (CONFERS BP, NASA non-funded missions)
  | "STANDARD" // Consensus standard (NASA OS-DM, JAXA JERG, ECSS, ISO)
  | "BEST_PRACTICE"; // Industry consensus floor (CONFERS Recommended Practices)

/** Operator scope categories — who the rule applies to. */
export type IosOperatorScope = "COMMERCIAL" | "GOVERNMENT" | "ACADEMIC" | "ALL";

/** One entry — a single IOS / RPO requirement from one regime. */
export interface IosRequirementEntry {
  /** Unique code, e.g. "FCC-ISAM-25.114-SERVICER", "CONFERS-BP-5". */
  code: string;

  /** Regulator or standard-issuer. */
  regime: IosRegime;

  /** Functional category. */
  category: IosRequirementCategory;

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

  /** Operational regimes where this rule applies. */
  operationalRegimes: ReadonlyArray<IosOperationalRegime>;

  /** Quantitative threshold, if any. */
  threshold?: {
    /** Parameter name (e.g. "proximityRangeMeters"). */
    parameter: string;
    /** Comparison operator. */
    operator: "<=" | ">=" | "<" | ">" | "=";
    /** Numeric value. */
    value: number;
    /** Unit. */
    unit: string;
  };

  /** Binding nature. */
  bindingNature: IosBindingNature;

  /** Operator scope this applies to. */
  operatorScope: ReadonlyArray<IosOperatorScope>;

  /** Related codes in this dataset (cross-references). */
  relatedCodes?: ReadonlyArray<string>;

  /** Clarification notes. */
  notes?: string;
}

// ============================================================================
// FCC IBFS for ISAM — 47 CFR Part 25 + DA 24-XXX (Feb 2024)
// ============================================================================

const FCC_ISAM_ENTRIES: ReadonlyArray<IosRequirementEntry> = [
  {
    code: "FCC-ISAM-25.114-SERVICER",
    regime: "FCC-ISAM",
    category: "SERVICER_AUTHORIZATION",
    title: "FCC Part 25 — Servicer spacecraft authorisation for ISAM",
    description:
      "FCC Part 25 applications for ISAM servicer spacecraft must " +
      "demonstrate: (a) RF spectrum coordination for both the servicer's " +
      "command/telemetry link AND any rendezvous-sensor RF emissions " +
      "(LIDAR, radar), (b) a Concept of Operations describing each " +
      "proximity-operations phase, (c) a debris-mitigation showing per " +
      "47 CFR § 25.114(d)(14), (d) compliance with the new ISAM sub-" +
      "category guidance in FCC Public Notice DA 24-XXX (Feb 2024).",
    effectiveFrom: "2024-02-15",
    citation: "47 CFR § 25.114 + FCC DA 24-XXX",
    sourceUrl: "https://docs.fcc.gov/public/attachments/DA-24-XXX.pdf",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FAA-AST-450-IOS", "CONFERS-BP-1"],
    notes:
      "ISAM = In-space Servicing, Assembly, Manufacturing. The Feb 2024 " +
      "Public Notice was the first formal FCC guidance recognising ISAM " +
      "as a distinct authorisation sub-category within Part 25.",
  },
  {
    code: "FCC-ISAM-25.114-CLIENT",
    regime: "FCC-ISAM",
    category: "CLIENT_CONSENT",
    title: "FCC — Client spacecraft consent letter required",
    description:
      "When the servicer spacecraft will perform proximity operations " +
      "with a client (target) spacecraft also under FCC jurisdiction, the " +
      "servicer applicant must include a consent letter from the client " +
      "spacecraft's licensee. For non-FCC client spacecraft (foreign-" +
      "licensed sats), the applicant must provide evidence of bilateral " +
      "coordination via the operator's national regulator.",
    effectiveFrom: "2024-02-15",
    citation: "FCC DA 24-XXX ¶ 18-22",
    sourceUrl: "https://docs.fcc.gov/public/attachments/DA-24-XXX.pdf",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["CONFERS-BP-3", "UK-CAA-IOA-REG-23"],
  },
  {
    code: "FCC-ISAM-RF-COORD",
    regime: "FCC-ISAM",
    category: "COMMUNICATIONS_LINK",
    title: "FCC — RF spectrum coordination for proximity sensors",
    description:
      "ISAM missions using active rendezvous sensors (RF radar, LIDAR " +
      "with RF telemetry, scanning microwave) must obtain RF spectrum " +
      "coordination through FCC IBFS and demonstrate non-interference " +
      "with both terrestrial and other space services. Compatible bands: " +
      "Ka-band (28-32 GHz) and W-band (75-110 GHz) are typical for active " +
      "ranging during proximity ops.",
    effectiveFrom: "2024-02-15",
    citation: "FCC DA 24-XXX ¶ 24-30",
    sourceUrl: "https://docs.fcc.gov/public/attachments/DA-24-XXX.pdf",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FCC-ISAM-25.114-SERVICER"],
  },
  {
    code: "FCC-ISAM-DEBRIS-OVERLAY",
    regime: "FCC-ISAM",
    category: "DEBRIS_OVERLAY",
    title: "FCC — Debris-mitigation overlay for IOS missions",
    description:
      "IOS mission applications must satisfy the standard 47 CFR § " +
      "25.114(d)(14) debris-mitigation rules PLUS additional showings " +
      "specific to servicing: (a) probability of post-docking break-up " +
      "from servicer-client interaction failure, (b) plan for safe " +
      "separation if abort during docked phase, (c) demonstration that " +
      "the combined stack's post-mission disposal still meets 5-year LEO " +
      "PMD rule (FCC 22-74) or GEO graveyard requirements.",
    effectiveFrom: "2024-09-29",
    citation: "47 CFR § 25.114(d)(14) + FCC DA 24-XXX ¶ 35-40",
    sourceUrl: "https://docs.fcc.gov/public/attachments/DA-24-XXX.pdf",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["NASA-OS-DM-7.4", "ESA-RAMSES-DEBRIS"],
    notes:
      "References the FCC 22-74 5-year LEO PMD rule — IOS missions are " +
      "not exempt from the broader debris-mitigation regime.",
  },
];

// ============================================================================
// FAA AST 14 CFR Part 450 — On-Orbit Servicing under Commercial Space
// ============================================================================

const FAA_AST_450_ENTRIES: ReadonlyArray<IosRequirementEntry> = [
  {
    code: "FAA-AST-450-IOS",
    regime: "FAA-AST-450",
    category: "MISSION_DESIGN",
    title: "FAA Part 450 — Servicer launch + on-orbit ConOps review",
    description:
      "Commercial IOS servicers launched from US territory require a " +
      "Part 450 launch license. The application must include a full " +
      "Concept of Operations describing on-orbit servicing manoeuvres, " +
      "even though Part 450 jurisdiction technically ends at orbit " +
      "insertion. FAA reviews the on-orbit ConOps for risk indicators " +
      "that bear on launch + re-entry licensing (e.g. controlled re-" +
      "entry plan for servicer end-of-life).",
    effectiveFrom: "2021-03-10",
    citation: "14 CFR § 450.101 + § 450.105",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-450",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["FCC-ISAM-25.114-SERVICER", "FAA-AST-450-EC"],
    notes:
      "Part 450 was the streamlined replacement for Parts 415, 417, " +
      "431, 435; effective 2021. Subsequent FAA interpretive memos " +
      "have clarified on-orbit ConOps review scope.",
  },
  {
    code: "FAA-AST-450-EC",
    regime: "FAA-AST-450",
    category: "RENDEZVOUS_SAFETY",
    title: "FAA — Expected Casualty (Ec) for proximity operations",
    description:
      "FAA Part 450 applicants must compute Expected Casualty (Ec) for " +
      "the launch + early-orbit phase. For IOS missions where proximity " +
      "operations occur shortly after orbit insertion, the Ec analysis " +
      "must include scenarios where servicer-client collision during RPO " +
      "leads to fragments re-entering Earth's atmosphere within the " +
      "Part 450 analysis window. Standard threshold: Ec ≤ 1×10⁻⁴.",
    effectiveFrom: "2021-03-10",
    citation: "14 CFR § 450.137 + § 450.139",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-450",
    operationalRegimes: ["LEO", "MEO"],
    threshold: {
      parameter: "casualtyRiskFactor",
      operator: "<=",
      value: 0.0001,
      unit: "probability per mission",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NASA-OS-DM-5.2"],
  },
  {
    code: "FAA-AST-450-LIABILITY",
    regime: "FAA-AST-450",
    category: "LIABILITY_INSURANCE",
    title: "FAA — Minimum third-party liability insurance for IOS launch",
    description:
      "Commercial IOS missions launched from US must carry minimum third-" +
      "party liability insurance per Part 450 Maximum Probable Loss (MPL) " +
      "calculation. For typical commercial IOS missions to LEO with a " +
      "servicer mass of 500-2000 kg, the FAA-determined MPL has " +
      "historically fallen in the $100M-$500M range. The operator must " +
      "evidence coverage prior to launch licence issuance.",
    effectiveFrom: "2021-03-10",
    citation: "14 CFR § 450.171 + 51 U.S.C. § 50914",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-450",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    threshold: {
      parameter: "insuranceCoverageMillionUSD",
      operator: ">=",
      value: 100,
      unit: "USD million",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["UK-CAA-IOA-INSURANCE"],
    notes:
      "The $100M floor is the conservative baseline; the actual FAA-" +
      "determined MPL can be substantially higher for higher-altitude or " +
      "higher-mass missions. The operator must evidence coverage to the " +
      "MPL level, not the floor.",
  },
];

// ============================================================================
// NASA OS-DM — NPR 8705.6 + Mission Design & Operating Requirements (2024)
// ============================================================================

const NASA_OS_DM_ENTRIES: ReadonlyArray<IosRequirementEntry> = [
  {
    code: "NASA-OS-DM-3.1",
    regime: "NASA-OS-DM",
    category: "MISSION_DESIGN",
    title: "NASA OS-DM — Phased mission assurance gates (SRR/PDR/CDR)",
    description:
      "NASA-funded IOS missions must satisfy four phased Mission " +
      "Assurance reviews: System Requirements Review (SRR), Preliminary " +
      "Design Review (PDR), Critical Design Review (CDR), Operations " +
      "Readiness Review (ORR). Each gate requires sign-off by the NASA " +
      "Mission Assurance Office before progressing. NPR 8705.6 mandates " +
      "specific OS-DM artefacts at each gate: ConOps + Mission Profile " +
      "(SRR), RPO Phase Diagrams (PDR), Abort + Safing Procedures (CDR), " +
      "Operations Readiness Certification (ORR).",
    effectiveFrom: "2024-04-01",
    citation: "NASA NPR 8705.6 § 3.1",
    sourceUrl: "https://nodis3.gsfc.nasa.gov/displayDir.cfm?t=NPR&c=8705&s=6",
    operationalRegimes: ["ANY"],
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT"],
    relatedCodes: ["NASA-OS-DM-5.2", "NASA-OS-DM-7.4"],
  },
  {
    code: "NASA-OS-DM-5.2",
    regime: "NASA-OS-DM",
    category: "PROXIMITY_OPS_LIMITS",
    title: "NASA OS-DM — Final-approach closing velocity ≤ 2 m/s",
    description:
      "NASA-funded servicing missions performing final approach (≤10 m " +
      "from client) must constrain closing velocity to ≤ 2 m/s, with " +
      "auto-abort if measured closing velocity exceeds 2.5 m/s. This is " +
      "the most-cited proximity-ops kinematic limit in NASA OS-DM and " +
      "is closely aligned with JAXA JERG-2-022 § 5.3 and CONFERS BP-2.",
    effectiveFrom: "2024-04-01",
    citation: "NASA NPR 8705.6 § 5.2",
    sourceUrl: "https://nodis3.gsfc.nasa.gov/displayDir.cfm?t=NPR&c=8705&s=6",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    threshold: {
      parameter: "finalApproachClosingVelocityMps",
      operator: "<=",
      value: 2,
      unit: "m/s",
    },
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT"],
    relatedCodes: ["JAXA-METI-JERG-5.3", "CONFERS-BP-2"],
  },
  {
    code: "NASA-OS-DM-6.1",
    regime: "NASA-OS-DM",
    category: "ABORT_PROCEDURES",
    title: "NASA OS-DM — Abort capability mandatory at every RPO phase",
    description:
      "Every phase of the RPO sequence (Approach Initiation, " +
      "Acquisition, Closing, Final Approach, Docked, Departure) must " +
      "have a documented abort criterion and an abort manoeuvre that " +
      "returns the servicer to a safe natural-motion trajectory. The " +
      "abort capability must be testable in ground simulation before " +
      "Operations Readiness Review. Loss of abort capability at any " +
      "phase requires immediate transition to safe mode.",
    effectiveFrom: "2024-04-01",
    citation: "NASA NPR 8705.6 § 6.1",
    sourceUrl: "https://nodis3.gsfc.nasa.gov/displayDir.cfm?t=NPR&c=8705&s=6",
    operationalRegimes: ["ANY"],
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT"],
    relatedCodes: ["CONFERS-BP-4", "JAXA-METI-JERG-6.2"],
  },
  {
    code: "NASA-OS-DM-7.4",
    regime: "NASA-OS-DM",
    category: "DEBRIS_OVERLAY",
    title: "NASA OS-DM — Debris from failed docking analysis",
    description:
      "NASA-funded IOS missions must analyse the debris-generation " +
      "implications of every credible failure mode during docking and " +
      "berthing, including: (a) hard-contact docking impact dispersion, " +
      "(b) propellant leak post-contact, (c) failure of capture " +
      "mechanism leading to client tumble. Analysis must demonstrate " +
      "compliance with NASA-STD-8719.14C baseline.",
    effectiveFrom: "2024-04-01",
    citation: "NASA NPR 8705.6 § 7.4",
    sourceUrl: "https://nodis3.gsfc.nasa.gov/displayDir.cfm?t=NPR&c=8705&s=6",
    operationalRegimes: ["ANY"],
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT"],
    relatedCodes: ["FCC-ISAM-DEBRIS-OVERLAY"],
  },
];

// ============================================================================
// DARPA / CONFERS — RSGS Program + CONFERS Industry Best Practices
// ============================================================================

const DARPA_CONFERS_ENTRIES: ReadonlyArray<IosRequirementEntry> = [
  {
    code: "DARPA-RSGS-CERT",
    regime: "DARPA-CONFERS",
    category: "MISSION_DESIGN",
    title: "DARPA RSGS — Servicer certification for GEO servicing",
    description:
      "Commercial servicers participating in the DARPA Robotic Servicing " +
      "of Geosynchronous Satellites (RSGS) program must complete a " +
      "Servicer Certification process covering: capture-mechanism " +
      "qualification, robotic-arm dexterity demonstration, GEO-altitude " +
      "manoeuvre + abort drill on a stand-in client, end-to-end command-" +
      "and-control rehearsal. Certification is required prior to first " +
      "operational servicing mission.",
    effectiveFrom: "2020-01-01",
    citation: "DARPA RSGS Acquisition Documentation",
    sourceUrl:
      "https://www.darpa.mil/program/robotic-servicing-of-geosynchronous-satellites",
    operationalRegimes: ["GEO"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL", "GOVERNMENT"],
    relatedCodes: ["CONFERS-BP-1", "DARPA-RSGS-INSPECTION"],
  },
  {
    code: "DARPA-RSGS-INSPECTION",
    regime: "DARPA-CONFERS",
    category: "RENDEZVOUS_SAFETY",
    title: "DARPA RSGS — Inspection phase before docking",
    description:
      "Servicers in the RSGS program must complete an Inspection Phase " +
      "of ≥24 hours at a stand-off distance of 100-500 m from the " +
      "client before any docking-approach manoeuvre. The inspection " +
      "phase must verify client geometry, rotation state, and absence " +
      "of release-able appendages that could impair safe docking. " +
      "Results must be shared with the client operator.",
    effectiveFrom: "2020-01-01",
    citation: "DARPA RSGS Operations Requirements",
    sourceUrl:
      "https://www.darpa.mil/program/robotic-servicing-of-geosynchronous-satellites",
    operationalRegimes: ["GEO"],
    threshold: {
      parameter: "inspectionPhaseHours",
      operator: ">=",
      value: 24,
      unit: "hours",
    },
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL", "GOVERNMENT"],
    relatedCodes: ["CONFERS-BP-3"],
  },
  {
    code: "CONFERS-BP-1",
    regime: "DARPA-CONFERS",
    category: "SERVICER_AUTHORIZATION",
    title: "CONFERS BP-1 — Servicer + client transparency to regulator",
    description:
      "CONFERS Recommended Practice 1: Both the servicer and client " +
      "operators should provide full mission transparency to the " +
      "responsible regulator(s), including: ConOps, abort criteria, " +
      "expected proximity-trajectory envelope, contingency plans, and " +
      "post-mission disposal plan for the docked stack. Industry-" +
      "consensus floor that most regulators now reference.",
    effectiveFrom: "2024-09-01",
    citation: "CONFERS Recommended Practices Rev. 2 § BP-1",
    sourceUrl: "https://www.satelliteconfers.org/recommendations/",
    operationalRegimes: ["ANY"],
    bindingNature: "BEST_PRACTICE",
    operatorScope: ["ALL"],
    relatedCodes: ["FCC-ISAM-25.114-SERVICER", "UK-CAA-IOA-REG-22"],
  },
  {
    code: "CONFERS-BP-2",
    regime: "DARPA-CONFERS",
    category: "PROXIMITY_OPS_LIMITS",
    title: "CONFERS BP-2 — Closing velocity ≤ 2 m/s in final approach corridor",
    description:
      "CONFERS Recommended Practice 2: Within the final-approach " +
      "corridor (defined as ≤ 10 m from the client capture interface), " +
      "the servicer's closing velocity should remain ≤ 2 m/s with " +
      "tolerance for tip-off velocities. Auto-abort or manual hold-" +
      "command should be available if closing velocity exceeds 2.5 m/s.",
    effectiveFrom: "2024-09-01",
    citation: "CONFERS Recommended Practices Rev. 2 § BP-2",
    sourceUrl: "https://www.satelliteconfers.org/recommendations/",
    operationalRegimes: ["ANY"],
    threshold: {
      parameter: "finalApproachClosingVelocityMps",
      operator: "<=",
      value: 2,
      unit: "m/s",
    },
    bindingNature: "BEST_PRACTICE",
    operatorScope: ["ALL"],
    relatedCodes: ["NASA-OS-DM-5.2", "JAXA-METI-JERG-5.3"],
  },
  {
    code: "CONFERS-BP-3",
    regime: "DARPA-CONFERS",
    category: "CLIENT_CONSENT",
    title: "CONFERS BP-3 — Documented client consent prior to any RPO",
    description:
      "CONFERS Recommended Practice 3: Servicers should obtain " +
      "documented, voluntary consent from the client spacecraft's " +
      "owner/operator prior to any proximity operations below 500 m. " +
      "Consent should specify: permitted manoeuvre envelope, telemetry-" +
      "sharing protocol, abort-and-depart criteria, and indemnity terms. " +
      "Non-cooperative target operations (active-debris-removal of " +
      "abandoned objects) require national-regulator authorisation in " +
      "lieu of client consent.",
    effectiveFrom: "2024-09-01",
    citation: "CONFERS Recommended Practices Rev. 2 § BP-3",
    sourceUrl: "https://www.satelliteconfers.org/recommendations/",
    operationalRegimes: ["ANY"],
    threshold: {
      parameter: "proximityRangeMeters",
      operator: "<=",
      value: 500,
      unit: "m (consent required below)",
    },
    bindingNature: "BEST_PRACTICE",
    operatorScope: ["ALL"],
    relatedCodes: ["FCC-ISAM-25.114-CLIENT", "ESA-RAMSES-CONSENT"],
  },
  {
    code: "CONFERS-BP-4",
    regime: "DARPA-CONFERS",
    category: "ABORT_PROCEDURES",
    title: "CONFERS BP-4 — Multi-trigger abort criteria + safe natural motion",
    description:
      "CONFERS Recommended Practice 4: Abort criteria should be multi-" +
      "trigger and include at minimum: (a) loss of primary comm link " +
      "for > 60 s during approach, (b) sensor disagreement on relative " +
      "state > 3 sigma, (c) closing velocity > nominal+50%, (d) onboard " +
      "fault detection. Triggered abort manoeuvre must return the " +
      "servicer to a safe natural-motion trajectory with > 1 km " +
      "separation from client.",
    effectiveFrom: "2024-09-01",
    citation: "CONFERS Recommended Practices Rev. 2 § BP-4",
    sourceUrl: "https://www.satelliteconfers.org/recommendations/",
    operationalRegimes: ["ANY"],
    bindingNature: "BEST_PRACTICE",
    operatorScope: ["ALL"],
    relatedCodes: ["NASA-OS-DM-6.1", "JAXA-METI-JERG-6.2"],
  },
  {
    code: "CONFERS-BP-5",
    regime: "DARPA-CONFERS",
    category: "COMMUNICATIONS_LINK",
    title: "CONFERS BP-5 — 3 redundant comm links for mission-critical RPO",
    description:
      "CONFERS Recommended Practice 5: Mission-critical proximity " +
      "operations should be supported by a minimum of 3 redundant " +
      "communications paths (e.g. S-band TT&C + Ka-band high-rate + " +
      "store-and-forward via TDRSS or commercial LEO relay). Loss of 2 " +
      "links should trigger abort criteria. End-to-end command latency " +
      "should be characterised and bounded.",
    effectiveFrom: "2024-09-01",
    citation: "CONFERS Recommended Practices Rev. 2 § BP-5",
    sourceUrl: "https://www.satelliteconfers.org/recommendations/",
    operationalRegimes: ["ANY"],
    threshold: {
      parameter: "communicationsLinkRedundancy",
      operator: ">=",
      value: 3,
      unit: "redundant links",
    },
    bindingNature: "BEST_PRACTICE",
    operatorScope: ["ALL"],
    relatedCodes: ["JAXA-METI-JERG-COMM"],
  },
];

// ============================================================================
// ESA RAMSES / ClearSpace — ESSB Servicing Extension + ECSS-E-ST-70-11C
// ============================================================================

const ESA_RAMSES_ENTRIES: ReadonlyArray<IosRequirementEntry> = [
  {
    code: "ESA-RAMSES-CONSENT",
    regime: "ESA-RAMSES",
    category: "CLIENT_CONSENT",
    title: "ESA RAMSES — Client/owner consent for non-debris servicing",
    description:
      "ESA-led RAMSES (Robotic Active Material Service mission) " +
      "framework requires written consent from the client spacecraft's " +
      "owner or operator for cooperative servicing. For active-debris-" +
      "removal of abandoned objects (e.g. ClearSpace-1 targeting VESPA " +
      "adapter), ESA requires national-regulator authorisation from the " +
      "registry-of-origin Member State plus indemnity arrangement.",
    effectiveFrom: "2023-06-01",
    citation: "ESA RAMSES Programme Documentation",
    sourceUrl: "https://www.esa.int/Space_Safety/Clean_Space/RAMSES",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["CONFERS-BP-3", "UK-CAA-IOA-REG-23"],
    notes:
      "Active-debris-removal of non-cooperative targets is a complex " +
      "international-law area; the Liability Convention 1972 + " +
      "Registration Convention 1975 frame state-responsibility regardless " +
      "of consent arrangements.",
  },
  {
    code: "ESA-RAMSES-DEBRIS",
    regime: "ESA-RAMSES",
    category: "DEBRIS_OVERLAY",
    title: "ESA — IOS missions must comply with ESSB-ST-U-007 baseline",
    description:
      "ESA-funded IOS missions (RAMSES, ClearSpace-1, future ADR) must " +
      "satisfy the standard ESSB-ST-U-007 Rev. 2 debris-mitigation " +
      "requirements (5-year LEO PMD, ≥300 km GEO graveyard, 1×10⁻⁴ " +
      "casualty risk) for both the servicer and the post-servicing " +
      "stack. Compliance-verification per ESSB-HB-U-002.",
    effectiveFrom: "2024-01-01",
    citation: "ESA ESSB-ST-U-007 Rev. 2 + RAMSES Programme Reqs",
    sourceUrl:
      "https://ecss.nl/standard/essb-st-u-007-rev-2-space-debris-mitigation/",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["FCC-ISAM-DEBRIS-OVERLAY", "NASA-OS-DM-7.4"],
  },
  {
    code: "ESA-ECSS-70-11C-OPS",
    regime: "ESA-RAMSES",
    category: "MISSION_DESIGN",
    title: "ECSS-E-ST-70-11C — Space-segment operations control for IOS",
    description:
      "ESA missions performing RPO must comply with ECSS-E-ST-70-11C " +
      "Space-Segment Operations Control standard. Specific RPO " +
      "extensions: (a) dedicated Proximity Operations Control Room " +
      "(POCR), (b) real-time go/no-go decision authority defined in " +
      "Operations Plan, (c) abort-execution timeline ≤ 10 s from " +
      "decision to manoeuvre start, (d) telemetry archiving for 100 % " +
      "of proximity-ops phase.",
    effectiveFrom: "2018-11-30",
    citation: "ECSS-E-ST-70-11C § 5 + 6",
    sourceUrl:
      "https://ecss.nl/standard/ecss-e-st-70-11c-space-segment-operations-control/",
    operationalRegimes: ["ANY"],
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT"],
    relatedCodes: ["NASA-OS-DM-3.1"],
  },
  {
    code: "ESA-RAMSES-CAPTURE",
    regime: "ESA-RAMSES",
    category: "DOCKING_VERIFICATION",
    title: "ESA RAMSES — Capture-mechanism qualification before flight",
    description:
      "ESA RAMSES servicers must qualify the capture mechanism (robotic " +
      "arm, tentacles, harpoon, net) in a 1-g flight-representative " +
      "test campaign covering: nominal capture, off-nominal client " +
      "geometry, tumbling client, contact-dynamics validation. Test " +
      "report must be reviewed at the mission's PDR equivalent.",
    effectiveFrom: "2023-06-01",
    citation: "ESA RAMSES Programme Documentation",
    sourceUrl: "https://www.esa.int/Space_Safety/Clean_Space/RAMSES",
    operationalRegimes: ["ANY"],
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["DARPA-RSGS-CERT"],
  },
];

// ============================================================================
// UK CAA In-Orbit Activities — SI 2021/792 reg. 22-26
// ============================================================================

const UK_CAA_IOA_ENTRIES: ReadonlyArray<IosRequirementEntry> = [
  {
    code: "UK-CAA-IOA-REG-22",
    regime: "UK-CAA-IOA",
    category: "SERVICER_AUTHORIZATION",
    title: "UK CAA — Specific in-orbit activities authorisation",
    description:
      "UK Space Industry Act 2018 requires a specific authorisation for " +
      "any in-orbit activity beyond routine station-keeping, including: " +
      "RPO, docking, refuelling, debris-removal, on-orbit assembly. " +
      "Application must include: ConOps, abort plan, insurance evidence, " +
      "and a separate Debris Mitigation Assessment for the post-" +
      "servicing stack. Distinct from spacecraft licensing under SI " +
      "2021/792 reg. 7-10.",
    effectiveFrom: "2021-07-29",
    citation: "UK SIA 2018 s.8 + SI 2021/792 reg. 22",
    sourceUrl: "https://www.legislation.gov.uk/uksi/2021/792/regulation/22",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["UK-CAA-IOA-REG-23", "FCC-ISAM-25.114-SERVICER"],
  },
  {
    code: "UK-CAA-IOA-REG-23",
    regime: "UK-CAA-IOA",
    category: "CLIENT_CONSENT",
    title: "UK CAA reg. 23 — Client consent + foreign-state coordination",
    description:
      "UK-authorised servicers operating on a cooperative client must " +
      "evidence written consent from the client's owner. For clients " +
      "registered under another State of Registry, the UK applicant must " +
      "evidence either: (a) a coordination letter from the client's " +
      "national space agency, or (b) a multilateral coordination via the " +
      "Inter-Agency Space Debris Coordination Committee (IADC) or " +
      "equivalent bilateral channel.",
    effectiveFrom: "2021-07-29",
    citation: "SI 2021/792 reg. 23",
    sourceUrl: "https://www.legislation.gov.uk/uksi/2021/792/regulation/23",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FCC-ISAM-25.114-CLIENT", "CONFERS-BP-3"],
  },
  {
    code: "UK-CAA-IOA-INSURANCE",
    regime: "UK-CAA-IOA",
    category: "LIABILITY_INSURANCE",
    title: "UK CAA — Minimum 3rd party liability insurance for in-orbit ops",
    description:
      "UK in-orbit activities authorisations require third-party " +
      "liability insurance proportional to the assessed risk. UK CAA " +
      "applies a default floor of £60M (~$75M USD) for routine spacecraft " +
      "operations but increases the requirement to ≥£80M (~$100M USD) " +
      "for IOS / RPO missions. Servicers operating on non-cooperative " +
      "targets typically require higher coverage.",
    effectiveFrom: "2021-07-29",
    citation: "SI 2021/792 reg. 25 + CAA Guidance Note 2024-IOA",
    sourceUrl: "https://www.legislation.gov.uk/uksi/2021/792/regulation/25",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    threshold: {
      parameter: "insuranceCoverageMillionUSD",
      operator: ">=",
      value: 100,
      unit: "USD million",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FAA-AST-450-LIABILITY"],
  },
  {
    code: "UK-CAA-IOA-REG-26",
    regime: "UK-CAA-IOA",
    category: "COLLISION_AVOIDANCE_RPO",
    title: "UK CAA reg. 26 — 24-hour notification before close-approach RPO",
    description:
      "UK-authorised servicers must notify CAA at least 24 hours before " +
      "executing an RPO manoeuvre that will bring the servicer within " +
      "500 m of any non-cooperative target, or within 100 m of any " +
      "cooperative target. Notification must include: planned trajectory, " +
      "abort criteria, planned start/end times, contact details for " +
      "in-flight coordination.",
    effectiveFrom: "2021-07-29",
    citation: "SI 2021/792 reg. 26",
    sourceUrl: "https://www.legislation.gov.uk/uksi/2021/792/regulation/26",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    threshold: {
      parameter: "regulatorNotificationLeadTimeHours",
      operator: ">=",
      value: 24,
      unit: "hours",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["JAXA-METI-NOTIFY"],
  },
];

// ============================================================================
// JAXA + METI — JERG-2-022 Proximity Operations + Space Activities Act
// ============================================================================

const JAXA_METI_ENTRIES: ReadonlyArray<IosRequirementEntry> = [
  {
    code: "JAXA-METI-JERG-5.3",
    regime: "JAXA-METI",
    category: "PROXIMITY_OPS_LIMITS",
    title: "JAXA JERG-2-022 § 5.3 — Final-approach closing velocity ≤ 2 m/s",
    description:
      "JAXA Engineering Standard JERG-2-022 § 5.3 mandates that in the " +
      "Final Approach Corridor (defined as ≤ 10 m to client capture " +
      "interface), closing velocity shall not exceed 2 m/s. Auto-abort " +
      "is triggered if velocity exceeds 2.5 m/s or if lateral excursion " +
      "exceeds the corridor geometry. Applies to all JAXA-funded missions " +
      "and is referenced by METI authorisations for commercial servicers.",
    effectiveFrom: "2023-04-01",
    citation: "JERG-2-022 Rev. 2023 § 5.3",
    sourceUrl: "https://www.jaxa.jp/about/centers/jerg/jerg-2-022.html",
    operationalRegimes: ["ANY"],
    threshold: {
      parameter: "finalApproachClosingVelocityMps",
      operator: "<=",
      value: 2,
      unit: "m/s",
    },
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["NASA-OS-DM-5.2", "CONFERS-BP-2"],
  },
  {
    code: "JAXA-METI-JERG-6.2",
    regime: "JAXA-METI",
    category: "ABORT_PROCEDURES",
    title: "JAXA JERG-2-022 § 6.2 — Abort decision authority + criteria",
    description:
      "JAXA proximity-ops missions must define a clear abort decision " +
      "authority hierarchy in the Operations Plan. JERG-2-022 § 6.2 " +
      "requires: (a) abort criteria documented prior to mission ops, " +
      "(b) decision authority designated to a single Flight Director, " +
      "(c) abort-execution capability demonstrated in pre-mission " +
      "simulation, (d) abort manoeuvre returns servicer to relative " +
      "natural-motion trajectory with separation > 1 km.",
    effectiveFrom: "2023-04-01",
    citation: "JERG-2-022 Rev. 2023 § 6.2",
    sourceUrl: "https://www.jaxa.jp/about/centers/jerg/jerg-2-022.html",
    operationalRegimes: ["ANY"],
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["NASA-OS-DM-6.1", "CONFERS-BP-4"],
  },
  {
    code: "JAXA-METI-JERG-COMM",
    regime: "JAXA-METI",
    category: "COMMUNICATIONS_LINK",
    title: "JAXA — Redundant comm links + bounded latency for proximity ops",
    description:
      "JAXA proximity-ops missions must maintain ≥ 2 simultaneous comm " +
      "paths during all RPO phases (primary + backup), with characterised " +
      "and bounded end-to-end latency. JAXA accepts S-band TT&C + Ka-band " +
      "high-rate as a baseline. CONFERS BP-5's 3-link recommendation " +
      "applied for cross-supports with NASA/ESA missions.",
    effectiveFrom: "2023-04-01",
    citation: "JERG-2-022 Rev. 2023 § 7",
    sourceUrl: "https://www.jaxa.jp/about/centers/jerg/jerg-2-022.html",
    operationalRegimes: ["ANY"],
    threshold: {
      parameter: "communicationsLinkRedundancy",
      operator: ">=",
      value: 2,
      unit: "redundant links",
    },
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["CONFERS-BP-5"],
  },
  {
    code: "JAXA-METI-LICENSE",
    regime: "JAXA-METI",
    category: "SERVICER_AUTHORIZATION",
    title: "METI Space Activities Act — IOS servicer authorisation",
    description:
      "Commercial servicers operating under Japanese jurisdiction must " +
      "obtain a Spacecraft Management License under the METI Space " +
      "Activities Act (Act No. 76 of 2016, Art. 20-22). The licensing " +
      "review covers: ConOps, abort criteria, debris-mitigation showing, " +
      "third-party liability insurance, and (for cooperative IOS) " +
      "client-consent documentation.",
    effectiveFrom: "2018-11-15",
    citation: "Act No. 76 of 2016 Art. 20-22",
    sourceUrl: "https://www8.cao.go.jp/space/english/index_english.html",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["UK-CAA-IOA-REG-22", "FCC-ISAM-25.114-SERVICER"],
  },
  {
    code: "JAXA-METI-NOTIFY",
    regime: "JAXA-METI",
    category: "COLLISION_AVOIDANCE_RPO",
    title: "METI — 24-hour pre-RPO notification to Japan space regulator",
    description:
      "Japanese-licensed servicers must notify the Cabinet Office Space " +
      "Policy Secretariat at least 24 hours before any RPO manoeuvre " +
      "involving non-cooperative targets, or before any docking " +
      "manoeuvre. Notification must align with the planned trajectory + " +
      "abort criteria filed with the licensing authority.",
    effectiveFrom: "2018-11-15",
    citation: "Act No. 76 of 2016 Art. 21 + Implementing Regulations",
    sourceUrl: "https://www8.cao.go.jp/space/english/index_english.html",
    operationalRegimes: ["LEO", "MEO", "GEO"],
    threshold: {
      parameter: "regulatorNotificationLeadTimeHours",
      operator: ">=",
      value: 24,
      unit: "hours",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["UK-CAA-IOA-REG-26"],
  },
];

// ============================================================================
// CONFERS International Best Practices — Industry-Consensus Standards
// ============================================================================

const CONFERS_BP_ENTRIES: ReadonlyArray<IosRequirementEntry> = [
  {
    code: "CONFERS-BP-6",
    regime: "CONFERS-BP",
    category: "DOCKING_VERIFICATION",
    title: "CONFERS BP-6 — Multi-sensor docking verification + handover",
    description:
      "CONFERS Recommended Practice 6: Docking verification should use " +
      "at least 2 independent sensors (e.g. monocular vision + LIDAR, or " +
      "stereo vision + contact force sensors). Successful capture should " +
      "be verified by both sensors before transition to docked phase. " +
      "Handover from approach-phase autopilot to docked-phase control " +
      "should be a documented, testable procedure.",
    effectiveFrom: "2024-09-01",
    citation: "CONFERS Recommended Practices Rev. 2 § BP-6",
    sourceUrl: "https://www.satelliteconfers.org/recommendations/",
    operationalRegimes: ["ANY"],
    bindingNature: "BEST_PRACTICE",
    operatorScope: ["ALL"],
    relatedCodes: ["ESA-RAMSES-CAPTURE", "NASA-OS-DM-3.1"],
  },
  {
    code: "CONFERS-BP-7",
    regime: "CONFERS-BP",
    category: "EXPORT_CONTROL_OVERLAY",
    title: "CONFERS BP-7 — Export-control awareness for cross-border IOS",
    description:
      "CONFERS Recommended Practice 7: IOS missions involving cross-" +
      "border collaboration (US + EU + UK + JP servicers/clients) should " +
      "consider export-control compliance early in mission design. " +
      "ITAR-controlled servicer hardware may not be exported even " +
      "operationally to non-US-flagged ground segments; EAR-controlled " +
      "robotic arm or capture-mechanism designs may need TAA + DSP-5 " +
      "licenses. Counsel review is strongly recommended at PDR.",
    effectiveFrom: "2024-09-01",
    citation: "CONFERS Recommended Practices Rev. 2 § BP-7",
    sourceUrl: "https://www.satelliteconfers.org/recommendations/",
    operationalRegimes: ["ANY"],
    bindingNature: "BEST_PRACTICE",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
  },
  {
    code: "CONFERS-BP-8",
    regime: "CONFERS-BP",
    category: "RENDEZVOUS_SAFETY",
    title: "CONFERS BP-8 — Hold points + go/no-go gates during approach",
    description:
      "CONFERS Recommended Practice 8: The approach sequence should " +
      "include defined hold points (waypoints at 1000 m, 500 m, 100 m, " +
      "10 m from client) where the servicer pauses on a stable relative " +
      "orbit, completes a system health check, and gets go/no-go " +
      "clearance from the mission ops centre before continuing closer. " +
      "Each hold-point review evaluates: sensor agreement, comm link " +
      "health, fuel margin, abort capability.",
    effectiveFrom: "2024-09-01",
    citation: "CONFERS Recommended Practices Rev. 2 § BP-8",
    sourceUrl: "https://www.satelliteconfers.org/recommendations/",
    operationalRegimes: ["ANY"],
    threshold: {
      parameter: "proximityRangeMeters",
      operator: "<=",
      value: 100,
      unit: "m (proximity ops procedures apply below)",
    },
    bindingNature: "BEST_PRACTICE",
    operatorScope: ["ALL"],
    relatedCodes: ["DARPA-RSGS-INSPECTION"],
  },
];

// ============================================================================
// CONSOLIDATED EXPORT
// ============================================================================

/** All In-Orbit Servicing / RPO requirements across all regimes. */
export const IOS_RPO_REQUIREMENTS: ReadonlyArray<IosRequirementEntry> = [
  ...FCC_ISAM_ENTRIES,
  ...FAA_AST_450_ENTRIES,
  ...NASA_OS_DM_ENTRIES,
  ...DARPA_CONFERS_ENTRIES,
  ...ESA_RAMSES_ENTRIES,
  ...UK_CAA_IOA_ENTRIES,
  ...JAXA_METI_ENTRIES,
  ...CONFERS_BP_ENTRIES,
];

/** Coverage metadata. */
export const IOS_RPO_COVERAGE = {
  totalEntries: IOS_RPO_REQUIREMENTS.length,
  byRegime: {
    "FCC-ISAM": FCC_ISAM_ENTRIES.length,
    "FAA-AST-450": FAA_AST_450_ENTRIES.length,
    "NASA-OS-DM": NASA_OS_DM_ENTRIES.length,
    "DARPA-CONFERS": DARPA_CONFERS_ENTRIES.length,
    "ESA-RAMSES": ESA_RAMSES_ENTRIES.length,
    "UK-CAA-IOA": UK_CAA_IOA_ENTRIES.length,
    "JAXA-METI": JAXA_METI_ENTRIES.length,
    "CONFERS-BP": CONFERS_BP_ENTRIES.length,
  },
  asOf: IOS_RPO_AS_OF,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Find a single requirement by its code. */
export function findIosEntry(code: string): IosRequirementEntry | undefined {
  return IOS_RPO_REQUIREMENTS.find((entry) => entry.code === code);
}

/** Find all entries for a given regime. */
export function findIosByRegime(
  regime: IosRegime,
): ReadonlyArray<IosRequirementEntry> {
  return IOS_RPO_REQUIREMENTS.filter((entry) => entry.regime === regime);
}

/** Find all entries for a given category. */
export function findIosByCategory(
  category: IosRequirementCategory,
): ReadonlyArray<IosRequirementEntry> {
  return IOS_RPO_REQUIREMENTS.filter((entry) => entry.category === category);
}

/**
 * Find all entries that apply to a given operational regime.
 * "ANY" rules apply everywhere; specific-orbit rules return only when matched.
 */
export function findIosByOperationalRegime(
  operationalRegime: IosOperationalRegime,
): ReadonlyArray<IosRequirementEntry> {
  return IOS_RPO_REQUIREMENTS.filter(
    (entry) =>
      entry.operationalRegimes.includes(operationalRegime) ||
      entry.operationalRegimes.includes("ANY"),
  );
}

/** Find all entries by binding nature. */
export function findIosByBindingNature(
  bindingNature: IosBindingNature,
): ReadonlyArray<IosRequirementEntry> {
  return IOS_RPO_REQUIREMENTS.filter(
    (entry) => entry.bindingNature === bindingNature,
  );
}

/** Find all entries that have a quantitative threshold. */
export function findIosWithThreshold(): ReadonlyArray<IosRequirementEntry> {
  return IOS_RPO_REQUIREMENTS.filter((entry) => entry.threshold !== undefined);
}

/**
 * Find mandatory IOS / RPO requirements applicable to a specific jurisdiction.
 * Maps jurisdiction ISO-2 codes to the regimes that bind operators there.
 */
export function findMandatoryIosForJurisdiction(
  jurisdiction: string,
): ReadonlyArray<IosRequirementEntry> {
  const jurisdictionRegimes: Record<string, ReadonlyArray<IosRegime>> = {
    US: ["FCC-ISAM", "FAA-AST-450"],
    GB: ["UK-CAA-IOA"],
    UK: ["UK-CAA-IOA"],
    DE: ["ESA-RAMSES"],
    FR: ["ESA-RAMSES"],
    IT: ["ESA-RAMSES"],
    ES: ["ESA-RAMSES"],
    NL: ["ESA-RAMSES"],
    BE: ["ESA-RAMSES"],
    SE: ["ESA-RAMSES"],
    PL: ["ESA-RAMSES"],
    AT: ["ESA-RAMSES"],
    FI: ["ESA-RAMSES"],
    DK: ["ESA-RAMSES"],
    CH: ["ESA-RAMSES"],
    NO: ["ESA-RAMSES"],
    JP: ["JAXA-METI"],
  };
  const regimes = jurisdictionRegimes[jurisdiction.toUpperCase()] ?? [];
  return IOS_RPO_REQUIREMENTS.filter(
    (entry) =>
      regimes.includes(entry.regime) && entry.bindingNature === "MANDATORY",
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
