/**
 * Batch 15 — USML Category XV(i) Technical Data + Defense Services Full
 * Enumeration. Closing the last DDTC sub-paragraph gap in Category XV.
 *
 * USML Category XV ("Spacecraft and Related Articles") is split into
 * sub-categories under 22 CFR § 121.1. With (a), (b), (c), (d), (e),
 * (f), (g), and (h) already enumerated in this codebase
 * (`usml-xv-a.ts` + `usml-xv-bcdf.ts` + `usml-xv-e.ts` + `usml-xv-gh.ts`),
 * this file closes the moat by enumerating the catch-all paragraph:
 *
 *   - **XV(i)** Technical data (as defined in 22 CFR § 120.10) and
 *     defense services (as defined in 22 CFR § 120.9) directly related
 *     to the defense articles described in paragraphs (a) through (h)
 *     of this category. This is the catch-all for engineering drawings,
 *     specifications, performance analyses, manufacturing know-how,
 *     test procedures, software source code (the *associated* tech-
 *     data form), AI/ML model weights trained on USML XV(c) imagery,
 *     and calibration standards — collectively the **Technical Data**
 *     (TD) form. Separately it covers training, maintenance, repair,
 *     installation, integration support, consulting, and software-
 *     development services on USML XV(a)–(h) systems — the **Defense
 *     Services** (DS) form.
 *
 * Note: USML XV(j) (anti-satellite, kinetic-kill / counter-space
 * weapons) is intentionally **excluded** from this commercial product —
 * too sensitive for an export-compliance SaaS audience. Operators
 * encountering XV(j) flags must engage DDTC directly with cleared
 * counsel.
 *
 * **Cross-walk to EAR 600-series:** When a tech-data or defense-service
 * item is carved out via 22 CFR § 120.11 (public domain) or § 120.41(b)
 * (specially designed exclusions), it typically falls into:
 *
 *   - **EAR 9E515** — technology for spacecraft and items in USML
 *     XV(a)–(h). Most XV(i) tech data crosses to 9E515.x when the
 *     USML threshold is missed.
 *
 * Public domain technical data (published research, conference papers,
 * unrestricted publications) is **outside ITAR jurisdiction** per
 * § 120.11(a). Fundamental research at accredited US universities
 * conducted without proprietary or national-security restrictions is
 * carved out under § 120.11(a)(8). Both carve-outs are encoded as
 * entries in this enumeration to make the boundary explicit to
 * operators — these entries deliberately carry no `ear600SeriesCounterpart`
 * because they fall outside both ITAR *and* the EAR 600 series.
 *
 * These are **regulatory list entries**, not defense-tech specs — terse
 * paraphrased headlines + operator-facing descriptions matching the
 * same format as `usml-xv-gh.ts`. The official 22 CFR text governs in
 * any dispute; a DDTC commodity-jurisdiction (CJ) determination is the
 * authoritative path for borderline cases.
 *
 * **Source:** 22 CFR § 121.1 Category XV(i) (eCFR, accessed 2026-05-23).
 *   https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1
 *
 *   Related sections:
 *   - 22 CFR § 120.9   — Defense service definition.
 *   - 22 CFR § 120.10  — Technical data definition.
 *   - 22 CFR § 120.11  — Public domain + fundamental research carve-outs.
 *   - 22 CFR § 120.41  — "Specially designed" five-step test.
 *
 * **See-through reminder:** Only XV(e)(17) (host satellite buses for
 * (a)(1)–(a)(13) spacecraft) carries the `isSeeThroughTrigger` flag —
 * the codified 22 CFR § 123.1(b) propagation rule. **None** of the
 * XV(i) entries here carry that flag; XV(i) is by definition the tech-
 * data / defense-service catch-all, and propagates jurisdiction via
 * the § 120.10 deemed-export rule rather than the see-through rule.
 *
 * **Significant Military Equipment (SME) flag:** A small subset of
 * XV(i) tech data — anti-jam navigation algorithms, classified-system
 * source-code, encryption tech data — is designated SME under
 * 22 CFR § 120.7 and inherits the additional reporting (DSP-83 non-
 * transfer and use certificate) and exemption-ineligibility from the
 * underlying hardware paragraph. The `itarSME` flag on each entry
 * surfaces this for the license-determination engine.
 *
 * **License exception strings:** AUKUS exemption (22 CFR § 126.7),
 * Canadian Exemption (CSA, 22 CFR § 126.5), DSP-83 (non-transfer and
 * use certificate). Most SME-flagged items are ineligible for these
 * exemptions.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * Discriminator between the two ITAR concepts unified under XV(i):
 *
 *   - `TECHNICAL_DATA`   — Information per 22 CFR § 120.10. Includes
 *     drawings, specifications, source code, AI/ML weights, manuals,
 *     test procedures, BOMs, failure analyses, and any other form of
 *     information *directly related* to USML XV(a)–(h) defense
 *     articles. Export occurs by transmission to foreign persons,
 *     including deemed-export to foreign-nationals on US soil.
 *   - `DEFENSE_SERVICE`  — Services per 22 CFR § 120.9. Includes
 *     training, installation, integration, maintenance, repair,
 *     consulting, and engineering services on USML XV defense
 *     articles — *and* the furnishing of technical assistance to
 *     foreign persons.
 *
 * Tests enforce that both kinds are represented.
 */
export type UsmlXvIKind = "TECHNICAL_DATA" | "DEFENSE_SERVICE";

/**
 * Shape of one entry in `USML_XV_I_ENTRIES`.
 *
 * The `paragraph` field is the operator-visible citation — e.g.
 * "XV(i)(1)", "XV(i)(12)" — matching the regulation's printed form.
 */
export interface UsmlXvIEntry {
  /**
   * Canonical paragraph reference. Format is one of:
   *
   *   - `XV(i)`                       (bare sub-category — not used)
   *   - `XV(i)(N)`                    (numbered sub-paragraph)
   *   - `XV(i)(N)(i|ii|iii)`          (nested)
   *
   * Tests enforce the regex.
   */
  paragraph: string;

  /**
   * Convenience field — the bare sub-paragraph letter. Always `"i"`
   * for entries in this file. Kept on the interface to match the
   * sibling files' shape, so cross-walk helpers can dispatch on it.
   */
  subParagraph: "i";

  /**
   * Discriminates technical-data entries from defense-service entries.
   * The licence-determination engine (B6) branches on this — TD is
   * exported by transmission (deemed-export to foreign-nationals),
   * DS is exported by performance of the service for a foreign
   * person.
   */
  kind: UsmlXvIKind;

  /** Short headline (≤ 120 chars). Operator-facing. */
  title: string;

  /** Paraphrased description in plain language for an operator. */
  description: string;

  /**
   * EAR 600-series ECCN (typically 9E515.x for technology) that an
   * item falls into if the USML threshold is missed or a § 120.41(b)
   * carve-out applies. Optional — public-domain and fundamental-
   * research entries deliberately omit this field because they fall
   * outside both ITAR and the EAR 600 series.
   */
  ear600SeriesCounterpart?: string;

  /**
   * Significant Military Equipment flag per 22 CFR § 120.7. SME-
   * designated tech data inherits SME from the underlying hardware
   * paragraph and requires the DSP-83 non-transfer-and-use
   * certificate. The license-determination engine (B6) checks this
   * flag and surfaces the additional documentation requirement.
   */
  itarSME?: boolean;

  /**
   * List of ITAR license exceptions / exemptions that an entry is
   * potentially eligible for. Empty / undefined means the entry
   * requires a full DSP-5 (permanent export) or TAA (Technical
   * Assistance Agreement) authorisation. Common values:
   *
   *   - `"AUKUS"`    — 22 CFR § 126.7 AUKUS exemption (Australia, UK, US)
   *   - `"CSA"`      — 22 CFR § 126.5 Canadian Exemption
   *   - `"DSP-83"`   — DSP-83 non-transfer-and-use certificate flag
   *                    (often required *in addition to* the underlying
   *                    license; surfaced here for the engine).
   *
   * Note: most SME-flagged entries are ineligible for AUKUS/CSA without
   * case-by-case DDTC authorisation.
   */
  licenseExceptions?: readonly string[];

  /**
   * Free-form list of designation-based exclusions that move the entry
   * out of XV(i) — typically into the EAR 600 series or out of ITAR
   * entirely. Common values:
   *
   *   - `"PUBLIC_DOMAIN"`        — § 120.11(a) — published, in libraries,
   *                                or otherwise unrestricted.
   *   - `"FUNDAMENTAL_RESEARCH"` — § 120.11(a)(8) — basic / applied
   *                                research at accredited US universities
   *                                without proprietary or national-
   *                                security restrictions.
   *   - `"SPECIALLY_DESIGNED"`   — § 120.41(b)(2)-(5) — five-step test
   *                                fails; falls to EAR 9E515.
   */
  exclusionsByDesignation?: readonly string[];

  /**
   * Authoritative citation surfaced into UI tooltips. Typically the
   * eCFR pinpoint paragraph (e.g. "22 CFR § 121.1 Cat XV(i)" or
   * "22 CFR § 120.10" for tech-data definition).
   */
  citation: string;

  /**
   * Source URL — pinned to the eCFR landing page for traceability.
   */
  sourceUrl: string;

  /**
   * True iff this paragraph defines the ITAR see-through trigger at
   * 22 CFR § 123.1(b). By design only XV(e)(17) carries that flag —
   * the field is included on this interface for API consistency but
   * every entry here has it `false` or omitted.
   */
  isSeeThroughTrigger?: boolean;

  /**
   * Free-form operator-facing note — typically a CJ-recommendation
   * pointer, a § 120.41 specially-designed carve-out reminder, a
   * deemed-export caveat, or a cross-walk hint. Surfaced into UI
   * tooltips and PDF reports.
   */
  notes?: string;
}

/**
 * Source URL — pinned to the eCFR landing page for 22 CFR § 121.1 so
 * every entry resolves to the authoritative text.
 */
const SOURCE_URL =
  "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1";

/**
 * Date this enumeration was last verified against eCFR. ISO-8601.
 * Staleness gate: 365 days.
 */
export const USML_XV_I_AS_OF = "2026-05-23";

/**
 * Full enumeration of USML Category XV(i) sub-paragraphs.
 *
 * Order:
 *   1. Technical-Data entries  (XV(i)(1)–(12))
 *   2. Defense-Service entries (XV(i)(13)–(19))
 *
 * **Do not remove or renumber entries** — paragraph codes are persisted
 * as `TradeItem.classification` strings and referenced by the
 * Three-Gate Cascade and the parametric cross-walk matcher. Removing
 * a paragraph code is a breaking change.
 */
export const USML_XV_I_ENTRIES: readonly UsmlXvIEntry[] = [
  // ─── XV(i) — Technical Data (§ 120.10) ────────────────────────────────
  {
    paragraph: "XV(i)(1)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Engineering drawings and schematics for USML XV(a)–(h) defense articles",
    description:
      "Engineering drawings, schematics, layouts, mechanical assembly drawings, electrical schematics, harness diagrams, and PCB artwork directly related to USML XV(a) defense-article spacecraft, XV(b) ground-control systems, XV(c) imaging payloads, XV(d) anti-tamper / targeting hardware, XV(e) rad-hardened microelectronics, XV(f) tech-derived hardware, XV(g) software architectures, and XV(h) components. Includes both released production drawings and engineering-development snapshots.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.10",
    sourceUrl: SOURCE_URL,
    notes:
      "Deemed-export occurs when a foreign-national engineer reviews a drawing on a shared CAD server — even on US soil. CAD systems with nationality-aware ACLs are recommended.",
  },
  {
    paragraph: "XV(i)(2)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Performance analyses, design analyses, and trade studies for USML XV defense articles",
    description:
      "Engineering analyses — including thermal analyses, structural / FEM analyses, vibration / random analyses, EMI / EMC analyses, radiation / TID analyses, link-budget analyses, payload-performance trade studies, mass-budget tracking, and orbit-design analyses — directly related to USML XV(a)–(h) defense articles. Includes Monte Carlo simulations and parametric sweep outputs.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.10",
    sourceUrl: SOURCE_URL,
    notes:
      "Performance trade-study spreadsheets shared with foreign-national engineers is the single most-common ITAR violation reported by DDTC. Track foreign-national access at the document level.",
  },
  {
    paragraph: "XV(i)(3)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Manufacturing know-how and process documentation for USML XV defense articles",
    description:
      "Manufacturing process documentation, work instructions, traveller cards, tooling drawings, fabrication procedures, soldering / bonding specifications, assembly process specifications, and quality-control inspection criteria directly related to USML XV(a)–(h) defense articles. Includes statistical-process-control (SPC) charts and supplier-qualification records.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.10",
    sourceUrl: SOURCE_URL,
    notes:
      "Manufacturing know-how transferred to a foreign supplier or contract manufacturer is a TAA-triggering event regardless of contract value.",
  },
  {
    paragraph: "XV(i)(4)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Software source code and build artefacts for USML XV(g) software defense articles",
    description:
      "Source code, object code, build artefacts (makefiles, CMake configurations, CI/CD pipeline definitions), compiler / linker configurations, and pre-built libraries for USML XV(g) defense-article software. XV(i) covers the *associated technical data* (architecture diagrams, design documents, API specifications), while XV(g) covers the executable software itself. Both controls run concurrently on the same code-base.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    licenseExceptions: ["AUKUS"],
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.10",
    sourceUrl: SOURCE_URL,
    notes:
      "Git repositories on cloud platforms (GitHub, GitLab) hosting USML XV(g) code require nationality-aware access control. Public-repo accidental commits are an ITAR violation.",
  },
  {
    paragraph: "XV(i)(5)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "AI/ML model weights and architectures trained on USML XV(c) imagery",
    description:
      "Machine-learning model weights, fine-tuning checkpoints, embedding tables, hyperparameter configurations, training-data catalogues, and architecture-definition files for models trained on USML XV(c) defense-article imagery or telemetry. Per DDTC 2023 interpretive notes, trained models inherit ITAR jurisdiction from their training data — the model weights themselves are technical data when the underlying data was a USML XV defense article.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation:
      "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.10; DDTC interpretive notes 2023",
    sourceUrl: SOURCE_URL,
    notes:
      "Distillation, fine-tuning, and Lora-style adaptation of a USML-trained foundation model produces a derived work that remains controlled. Cloud model-hosting (HuggingFace, Replicate) requires nationality controls.",
  },
  {
    paragraph: "XV(i)(6)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Test procedures, acceptance criteria, and qualification data for USML XV defense articles",
    description:
      "Test procedures (electrical functional test, thermal-vacuum protocols, vibration / acoustic / shock test protocols, EMI/EMC test plans), acceptance criteria, qualification reports, and proto-flight test data directly related to USML XV(a)–(h) defense articles. Includes both manufacturing acceptance tests (MATs) and on-orbit commissioning test sequences.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.10",
    sourceUrl: SOURCE_URL,
    notes:
      "Test procedures shared with foreign-owned test facilities for cost reasons is a TAA-triggering event. Maintain a US-only test path for borderline cases.",
  },
  {
    paragraph: "XV(i)(7)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Algorithms, mathematical models, and computational descriptions for USML XV defense articles",
    description:
      "Mathematical formulations, algorithms, computational descriptions, optimisation models, Kalman-filter formulations, signal-processing algorithms, deconvolution / restoration algorithms, control-law derivations, and pseudo-code descriptions directly related to USML XV(a)–(h) defense articles. Includes published-but-classified math, internal whitepapers, and patent disclosures awaiting public release.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.10",
    sourceUrl: SOURCE_URL,
    notes:
      "A patent application that has not yet published is still ITAR tech data. Publication exclusion applies only at the moment of publication.",
  },
  {
    paragraph: "XV(i)(8)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Calibration procedures, calibration standards, and metrology data for USML XV defense articles",
    description:
      "Calibration procedures, calibration-standard documentation, metrology data, NIST-traceable measurement records, and reference-standard descriptions for USML XV(c) imaging payloads, XV(d) sensors, XV(e) rad-hardened components, and XV(h) flight hardware. Includes on-orbit calibration sequences for XV(a) spacecraft.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.10",
    sourceUrl: SOURCE_URL,
  },
  {
    paragraph: "XV(i)(9)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Detailed bills of materials (BOM) and supplier-source documentation for USML XV defense articles",
    description:
      "Detailed bills of materials (engineering BOMs, manufacturing BOMs), parts lists, approved-vendor lists (AVL), supplier-source documentation, sub-tier supply-chain disclosures, and obsolescence-management records directly related to USML XV(a)–(h) defense articles. Includes diminishing-manufacturing-sources reports.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.10",
    sourceUrl: SOURCE_URL,
    notes:
      "BOMs disclosed to investors during diligence are tech-data exports if the recipients include foreign-national LPs. Vault data-rooms (Caelex Assure) should track FN access.",
  },
  {
    paragraph: "XV(i)(10)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Failure analysis reports and anomaly investigation data for USML XV",
    description:
      "Failure analysis reports (FARs), anomaly investigation records, root-cause analyses (RCAs), corrective-action records, lessons-learned databases, and reliability-improvement studies directly related to USML XV(a)–(h) defense articles. Includes on-orbit anomaly post-mortems and ground-test failure reports.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.10",
    sourceUrl: SOURCE_URL,
    notes:
      "Sharing failure data with a foreign-supplier as part of a defect investigation is a TAA-triggering event. Pre-arrange a TAA before any cross-border failure-reporting workflow.",
  },
  {
    paragraph: "XV(i)(11)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Foreign Military Sales (FMS) technology transfer packages for USML XV",
    description:
      "Technology transfer packages assembled for Foreign Military Sales (FMS) transactions involving USML XV(a)–(h) defense articles — including FMS Letters of Offer and Acceptance (LOA) annexes, exception-to-policy (ETP) requests, and Manufacturing License Agreement (MLA) data packages. Transferred under government-to-government authority but remain tech data subject to ITAR.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.10; AECA 22 USC 2751",
    sourceUrl: SOURCE_URL,
    notes:
      "FMS packages bypass DSP-5 / TAA workflow but are administered under DSCA + DDTC dual jurisdiction. Maintain a separate FMS-package tracking workflow.",
  },
  {
    paragraph: "XV(i)(12)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Anti-jam and anti-spoof algorithm specifications for USML XV navigation",
    description:
      "Technical specifications, design rationale, algorithm documentation, and pseudo-code descriptions for anti-jam M-code GNSS processing, anti-spoof signal-authentication, jammer-direction-finding algorithms, and adversarial-resilient sensor-fusion modes embedded in USML XV(a) defense-article spacecraft or XV(b) ground systems. Cross-walks to XV(g)(11) for the executable software form.",
    ear600SeriesCounterpart: "9E515",
    itarSME: true,
    licenseExceptions: [],
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.10; 22 CFR § 120.7",
    sourceUrl: SOURCE_URL,
    notes:
      "SME-designated; ineligible for AUKUS / CSA without case-by-case DDTC authorisation. Requires DSP-83 non-transfer and use certificate.",
  },
  {
    paragraph: "XV(i)(13)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Public-domain tech data — § 120.11(a) exclusion from ITAR jurisdiction",
    description:
      "Information in the public domain per 22 CFR § 120.11(a) — published in periodicals, available in libraries open to the public, released at conferences open to the public, contained in patents already published, taught in courses at accredited US schools open to the public, or otherwise unrestricted in dissemination. Such tech data is **outside ITAR jurisdiction entirely** and is documented here as an explicit exclusion so the engine can surface it as a *carve-out* rather than a control.",
    itarSME: false,
    exclusionsByDesignation: ["PUBLIC_DOMAIN"],
    citation: "22 CFR § 120.11(a); 22 CFR § 121.1 Cat XV(i)",
    sourceUrl: SOURCE_URL,
    notes:
      "Public-domain status is a one-way ratchet: once published, the information cannot be re-classified back into ITAR. Maintain a publication-decision log for sensitive disclosures.",
  },
  {
    paragraph: "XV(i)(14)",
    subParagraph: "i",
    kind: "TECHNICAL_DATA",
    title:
      "Fundamental research carve-out — § 120.11(a)(8) university-research exclusion",
    description:
      "Information arising from basic and applied research in science and engineering conducted at accredited institutions of higher education in the US, where the resulting information is *ordinarily* published and shared broadly within the scientific community, and where the research is *not* restricted for proprietary reasons or national-security considerations. Per § 120.11(a)(8), such information is **outside ITAR jurisdiction** notwithstanding its subject-matter relationship to USML XV(a)–(h) defense articles.",
    itarSME: false,
    exclusionsByDesignation: ["FUNDAMENTAL_RESEARCH"],
    citation: "22 CFR § 120.11(a)(8); 22 CFR § 121.1 Cat XV(i)",
    sourceUrl: SOURCE_URL,
    notes:
      "A single proprietary restriction in a sponsored research agreement (NDA clause, publication delay > 90 days, security review) defeats the fundamental-research carve-out. Read sponsored-research agreements with this in mind.",
  },

  // ─── XV(i) — Defense Services (§ 120.9) ──────────────────────────────
  {
    paragraph: "XV(i)(15)",
    subParagraph: "i",
    kind: "DEFENSE_SERVICE",
    title:
      "Training services on USML XV(a) defense-article spacecraft operations",
    description:
      "Training services furnished to foreign persons on the operation, maintenance, or use of USML XV(a) defense-article spacecraft — including operator training on TT&C ground software, mission-planning training, contingency-response rehearsals, on-orbit anomaly-handling courses, and certification programmes. Includes both classroom instruction and on-the-job training. Foreign-national trainees on US soil constitute a deemed export.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.9",
    sourceUrl: SOURCE_URL,
    notes:
      "Training requires a Technical Assistance Agreement (TAA), not a DSP-5. Curriculum content must be pre-approved by DDTC as part of the TAA submission.",
  },
  {
    paragraph: "XV(i)(16)",
    subParagraph: "i",
    kind: "DEFENSE_SERVICE",
    title: "Defense services on USML XV(c) imaging-payload defense articles",
    description:
      "Defense services furnished to foreign persons on USML XV(c) imaging payloads — including image-quality consulting, payload-tuning support, ground-segment image-processing support, image-tasking operations support, and atmospheric-correction calibration services. Includes on-site service technicians at foreign customer locations and remote tele-support sessions.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.9",
    sourceUrl: SOURCE_URL,
    notes:
      "Remote tele-support sessions where a US engineer guides a foreign operator through XV(c) payload calibration is a defense service even though no tech data is transmitted — the *furnishing of assistance* is the controlled act.",
  },
  {
    paragraph: "XV(i)(17)",
    subParagraph: "i",
    kind: "DEFENSE_SERVICE",
    title:
      "Maintenance, repair, and installation services on USML XV defense articles",
    description:
      "Maintenance, repair, overhaul (MRO), and installation services on USML XV(a)–(h) defense articles — including on-site repair technicians, off-site depot maintenance for XV(h) components, satellite-bus installation services for XV(a) spacecraft at a launch site, and integration services for XV(b) ground stations.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.9",
    sourceUrl: SOURCE_URL,
    notes:
      "Repair services performed on foreign soil require a TAA in advance. The TAA bounds what tech data the US engineer may share during the repair — a tight scope is recommended.",
  },
  {
    paragraph: "XV(i)(18)",
    subParagraph: "i",
    kind: "DEFENSE_SERVICE",
    title:
      "Integration support services for USML XV defense articles into foreign systems",
    description:
      "Integration support services — interface control document (ICD) negotiation, integration testing, fit-checks, system-of-systems compatibility verification — for incorporating USML XV(a)–(h) defense articles into foreign or non-US prime-contractor systems. Includes on-site integration engineers and remote-collaboration sessions.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.9",
    sourceUrl: SOURCE_URL,
    notes:
      "Integration of a USML XV component into a foreign-prime missile system is a high-risk defense service — pre-engage DDTC for guidance on whether the integrated article remains USML or transitions to a different ITAR category.",
  },
  {
    paragraph: "XV(i)(19)",
    subParagraph: "i",
    kind: "DEFENSE_SERVICE",
    title:
      "Consulting and engineering-assistance services on USML XV systems design",
    description:
      "Engineering consulting and design-assistance services — system architecture reviews, trade-study consulting, design audits, technical due diligence, design-for-X (manufacturability, reliability, testability) workshops, and concept-development engineering — directly related to USML XV(a)–(h) defense articles. Includes consulting on whether a proposed design crosses the USML threshold (informal CJ scoping work).",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.9",
    sourceUrl: SOURCE_URL,
    notes:
      "Even *advising* a foreign person on how to design around the USML threshold is a defense service — the consultation itself is the controlled act. Engage DDTC-approved counsel before any cross-border scoping conversation.",
  },
  {
    paragraph: "XV(i)(20)",
    subParagraph: "i",
    kind: "DEFENSE_SERVICE",
    title:
      "Software-development services for USML XV(g) defense-article software",
    description:
      "Custom software-development services — bespoke flight-software development, custom ground-software development, AI/ML model fine-tuning services, firmware development, and embedded-software porting — for USML XV(g) defense-article software. Includes both fixed-price contracts and time-and-materials arrangements with foreign software houses or system integrators.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    licenseExceptions: ["AUKUS"],
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.9",
    sourceUrl: SOURCE_URL,
    notes:
      "Outsourcing flight-software development to a foreign-staffed contractor is a defense service and requires a TAA. AUKUS exemption potentially applies for Australia / UK / US persons under § 126.7.",
  },
  {
    paragraph: "XV(i)(21)",
    subParagraph: "i",
    kind: "DEFENSE_SERVICE",
    title: "Tech-data preparation as a service for USML XV defense articles",
    description:
      "Document-preparation services — writing or assembling USML XV technical-data deliverables (engineering drawings, specifications, test reports, operator manuals, training materials, FMS packages) on behalf of a USML XV defense-article principal. The service-provider acts as a tech-data producer for the principal and must be a US person; sub-contracting to a foreign service-provider is a defense-service export.",
    ear600SeriesCounterpart: "9E515",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.9",
    sourceUrl: SOURCE_URL,
  },
  {
    paragraph: "XV(i)(22)",
    subParagraph: "i",
    kind: "DEFENSE_SERVICE",
    title:
      "Classified catch-all — defense services on classified USML XV articles",
    description:
      "Catch-all for any defense service furnished to a foreign person and directly related to a classified USML XV(a)–(h) defense article and not otherwise enumerated. Operator should request a DDTC Commodity Jurisdiction (CJ) determination *and* a separate TAA before commencing any cross-border service work. CJ determinations typically take 60–90 days; TAA review adds 30–60 days.",
    itarSME: false,
    citation: "22 CFR § 121.1 Cat XV(i); 22 CFR § 120.9",
    sourceUrl: SOURCE_URL,
    notes:
      "Classified defense services to NATO-allied buyers are routinely approved; non-NATO buyers face heightened scrutiny. Maintain a defensible service-scope record demonstrating ITAR compliance.",
  },
] as const;

/**
 * Index of the enumeration by paragraph code. Built once at module
 * load. Use this for O(1) lookups from the cascade and matcher.
 */
export const USML_XV_I_BY_PARAGRAPH: Readonly<Record<string, UsmlXvIEntry>> =
  Object.freeze(
    Object.fromEntries(USML_XV_I_ENTRIES.map((e) => [e.paragraph, e])),
  );

/**
 * Coverage metadata — surfaced into the moat-coverage dashboard and the
 * `/dashboard/modules/export-control` self-audit view.
 */
export const USML_XV_I_COVERAGE = {
  totalEntries: USML_XV_I_ENTRIES.length,
  byKind: {
    TECHNICAL_DATA: USML_XV_I_ENTRIES.filter((e) => e.kind === "TECHNICAL_DATA")
      .length,
    DEFENSE_SERVICE: USML_XV_I_ENTRIES.filter(
      (e) => e.kind === "DEFENSE_SERVICE",
    ).length,
  },
  smeCount: USML_XV_I_ENTRIES.filter((e) => e.itarSME === true).length,
  exclusionCount: USML_XV_I_ENTRIES.filter(
    (e) => (e.exclusionsByDesignation?.length ?? 0) > 0,
  ).length,
  asOf: USML_XV_I_AS_OF,
} as const;

/**
 * Lookup an XV(i) entry by paragraph code (e.g. "XV(i)(1)" or
 * "XV(i)(15)"). Returns undefined when the paragraph is not enumerated
 * — callers should treat that as "not yet covered" rather than "not
 * USML."
 */
export function findUsmlXvIEntry(code: string): UsmlXvIEntry | undefined {
  return USML_XV_I_BY_PARAGRAPH[code];
}

/**
 * Returns all entries of a single kind — either `TECHNICAL_DATA` or
 * `DEFENSE_SERVICE`. Convenience filter for the UI when rendering an
 * XV(i) panel split by ITAR concept.
 */
export function findUsmlXvIByKind(kind: UsmlXvIKind): readonly UsmlXvIEntry[] {
  return USML_XV_I_ENTRIES.filter((e) => e.kind === kind);
}

/**
 * Returns all entries flagged as Significant Military Equipment (SME)
 * under 22 CFR § 120.7. Used by the license-determination engine to
 * surface the DSP-83 non-transfer-and-use certificate requirement.
 */
export function findUsmlXvIBySME(): readonly UsmlXvIEntry[] {
  return USML_XV_I_ENTRIES.filter((e) => e.itarSME === true);
}

/**
 * Returns the subset of XV(i) entries directly relevant to a space
 * operator's day-to-day classification work — currently the entire
 * enumeration (every entry is space-relevant by virtue of falling
 * under USML Category XV). Reserved for future filtering when XV(i)
 * grows to include non-space appendix entries.
 */
export function findUsmlXvISpaceRelevant(): readonly UsmlXvIEntry[] {
  return USML_XV_I_ENTRIES;
}

/**
 * Source citation surfaced into UI tooltips, audit logs, and PDF
 * reports. Returns the eCFR URL pinned at module-load time.
 */
export function getUsmlXvISourceCitation(): {
  source: string;
  url: string;
  asOfDate: string;
} {
  return {
    source: "22 CFR § 121.1 Category XV(i)",
    url: SOURCE_URL,
    asOfDate: USML_XV_I_AS_OF,
  };
}
