/**
 * Batch 14 — USML Category XV Sub-categories (g) Software + (h)
 * Components, Parts, Accessories Full Enumeration.
 *
 * USML Category XV ("Spacecraft and Related Articles") is split into
 * seven sub-categories under 22 CFR § 121.1. With (a), (b), (c), (d),
 * (e), and (f) already enumerated in this codebase
 * (`usml-xv-a.ts` + `usml-xv-bcdf.ts` + `usml-xv-e.ts`), this file
 * closes the moat by enumerating the last two sub-categories:
 *
 *   - **XV(g)** Software specifically designed or modified for
 *     defense articles in XV(a)–(f). Includes spacecraft flight
 *     software (AOCS, propulsion sequencing, TT&C avionics), star-
 *     tracker / IMU sensor-fusion firmware, ground-segment mission
 *     planning software, image-processing pipelines and AI/ML models
 *     trained on USML XV(c) imagery, encrypted-bus driver firmware,
 *     and software-as-a-service offerings whose underlying system is
 *     a USML XV defense article.
 *   - **XV(h)** Components, parts, accessories, attachments, and
 *     associated equipment specifically designed or modified for
 *     USML XV(a)–(g) defense articles AND not otherwise enumerated.
 *     This is the catch-all sub-category — solar arrays, reaction
 *     wheels, control-moment gyroscopes, propellant tanks, thermal
 *     control hardware, single-board computers, harnesses, test
 *     equipment, ground support equipment, and mounting brackets all
 *     fall here when their design intent is a USML XV defense article.
 *
 * **Cross-walk to EAR 600-series:** When the USML threshold is missed
 * because the article is not "specifically designed" for a defense
 * article (see the § 120.41 "specially designed" five-step test) the
 * fallback ECCNs are typically:
 *
 *   - USML XV(g) software → EAR 9D515 (spacecraft software)
 *   - USML XV(h) components → EAR 9A515 (spacecraft components)
 *
 * Some XV(g) software items are carved out of "specially designed" via
 * § 120.41(b) exclusions — software released to the public, software
 * arising from fundamental research, software in the public domain.
 *
 * These are **regulatory list entries**, not defense-tech specs — terse
 * paraphrased headlines + operator-facing descriptions matching the
 * same format as `usml-xv-bcdf.ts` and `usml-xv-e.ts`. The official
 * 22 CFR text governs in any dispute; a DDTC commodity-jurisdiction
 * (CJ) determination is the authoritative path for borderline cases.
 *
 * **Source:** 22 CFR § 121.1 Category XV(g) and XV(h) (eCFR, accessed
 *   2026-05-23).
 *   https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1
 *
 * **See-through reminder:** Only XV(e)(17) (host satellite buses for
 * (a)(1)–(a)(13) spacecraft) carries the `isSeeThroughTrigger` flag —
 * the codified 22 CFR § 123.1(b) propagation rule. **None** of the
 * XV(g)/(h) entries here carry that flag; XV(g) software is ITAR by
 * specific-design intent and propagates jurisdiction via the technical-
 * data export rule (22 CFR § 120.10) rather than the see-through rule.
 *
 * **Significant Military Equipment (SME) flag:** Several XV(g)/(h)
 * articles are designated SME under 22 CFR § 120.7 — they require
 * additional reporting (DSP-83 non-transfer and use certificate) and
 * cannot ship under most license exceptions. The `itarSME` flag on
 * each entry surfaces this for the license-determination engine.
 *
 * **License exception strings:** AUKUS exemption (22 CFR § 126.7),
 * Canadian Exemption (CSA, 22 CFR § 126.5), Defense Trade Cooperation
 * Treaty (DTCT) with UK / Australia. Most SME-flagged items are
 * ineligible for these exemptions.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * Shape of one entry in `USML_XV_GH_ENUMERATION`.
 *
 * The `paragraph` field is the operator-visible citation — e.g.
 * "XV(g)(1)", "XV(h)(4)" — matching the regulation's printed form.
 */
export interface UsmlXvGhEntry {
  /**
   * Canonical paragraph reference. Format is one of:
   *
   *   - `XV(g)`, `XV(h)`                       (bare sub-category)
   *   - `XV(g)(N)`, `XV(h)(N)`                 (numbered sub-paragraph)
   *   - `XV(g)(N)(i|ii|iii)`, `XV(h)(N)(i|ii|iii)`  (nested)
   *
   * Tests enforce the regex.
   */
  paragraph: string;

  /**
   * Convenience field — the bare sub-paragraph letter (`"g"` or `"h"`).
   * Redundant with `paragraph` but useful for partition-by helpers
   * without re-parsing the paragraph string.
   */
  subParagraph: "g" | "h";

  /** Short headline (≤ 120 chars). Operator-facing. */
  title: string;

  /** Paraphrased description in plain language for an operator. */
  description: string;

  /**
   * EAR 600-series ECCN (typically 9A515.x for components or 9D515 for
   * software) that an item falls into if the USML threshold is missed.
   * Optional — many of these paragraphs are USML-only by design (no
   * EAR fallback).
   */
  ear600SeriesCounterpart?: string;

  /**
   * Significant Military Equipment flag per 22 CFR § 120.7. SME-
   * designated items require a DSP-83 non-transfer-and-use certificate
   * and cannot ship under most license exceptions. The license-
   * determination engine (B6) checks this flag and surfaces the
   * additional documentation requirement.
   */
  itarSME?: boolean;

  /**
   * List of ITAR license exceptions / exemptions that an entry is
   * potentially eligible for. Empty / undefined means the entry
   * requires a full DSP-5 (permanent export) or DSP-73 (temporary
   * export) license. Common values:
   *
   *   - `"AUKUS"`  — 22 CFR § 126.7 AUKUS exemption (Australia, UK, US)
   *   - `"CSA"`    — 22 CFR § 126.5 Canadian Exemption
   *   - `"DTCT"`   — Defense Trade Cooperation Treaty (UK / Australia)
   *
   * Note: most SME-flagged entries are ineligible for AUKUS/CSA/DTCT.
   */
  licenseExceptions?: readonly string[];

  /**
   * True iff this paragraph defines the ITAR see-through trigger at
   * 22 CFR § 123.1(b). By design only XV(e)(17) carries that flag —
   * the field is included on this interface for API consistency but
   * every entry here has it `false` or omitted.
   */
  isSeeThroughTrigger?: boolean;

  /**
   * Free-form operator-facing note — typically a CJ-recommendation
   * pointer, a "specially designed" carve-out reminder, or a cross-
   * walk caveat. Surfaced into UI tooltips and PDF reports.
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
export const USML_XV_GH_AS_OF = "2026-05-23";

/**
 * Full enumeration of USML Category XV(g) and XV(h) sub-paragraphs.
 *
 * Order:
 *   1. XV(g)  — Software for (a)–(f) defense articles  (12 entries)
 *   2. XV(h)  — Components / parts / accessories       (18 entries)
 *
 * **Do not remove or renumber entries** — paragraph codes are persisted
 * as `TradeItem.classification` strings and referenced by the
 * Three-Gate Cascade and the parametric cross-walk matcher. Removing
 * a paragraph code is a breaking change.
 */
export const USML_XV_GH_ENTRIES: readonly UsmlXvGhEntry[] = [
  // ─── XV(g) — Software for USML XV(a)–(f) Defense Articles ────────────
  {
    paragraph: "XV(g)(1)",
    subParagraph: "g",
    title:
      "Spacecraft Attitude and Orbit Control System (AOCS) software for USML XV defense articles",
    description:
      "Flight software implementing attitude determination, attitude control, and orbit-keeping for USML XV(a) defense-article spacecraft. Includes sensor-fusion algorithms (star-tracker quaternion estimation, gyrocompassing, sun-sensor reconstruction), control laws (PID, LQR, sliding-mode, momentum-management), actuator commands (reaction-wheel torque distribution, thruster pulse-width modulation), and on-board orbit propagators.",
    ear600SeriesCounterpart: "9D515",
    itarSME: false,
    notes:
      "Source code, object code, executables, and configuration files all controlled. Deemed export to foreign-national engineers requires DSP-5 or TAA authorisation.",
  },
  {
    paragraph: "XV(g)(2)",
    subParagraph: "g",
    title:
      "Star-tracker, IMU, and sun-sensor fusion firmware for USML XV defense articles",
    description:
      "Firmware embedded in star-tracker electronics units, inertial measurement units, and sun-sensor electronics for USML XV(a) spacecraft. Includes centroiding algorithms, pattern-recognition logic against on-board star catalogues, Kalman-filter fusion across multiple navigation sensors, and outlier rejection. Performance thresholds (sub-arcsecond knowledge) cross-walk to XV(d) and XV(e)(8) hardware.",
    ear600SeriesCounterpart: "9D515",
    itarSME: false,
  },
  {
    paragraph: "XV(g)(3)",
    subParagraph: "g",
    title: "Spacecraft propulsion sequencing and management software",
    description:
      "Software controlling chemical, electric, nuclear-thermal, and hybrid propulsion sub-systems on USML XV(a) defense-article spacecraft. Includes thruster firing-sequence generators, propellant-budget management, isp/throughput telemetry processing, plume-impingement avoidance logic, and end-of-life passivation sequences mandated by 22 CFR Part 121.1(a)(3).",
    ear600SeriesCounterpart: "9D515",
    itarSME: false,
  },
  {
    paragraph: "XV(g)(4)",
    subParagraph: "g",
    title:
      "TT&C ground software for USML XV defense-article spacecraft operations",
    description:
      "Telemetry, tracking, and command (TT&C) ground-segment software for routine and contingency operations of USML XV(a) defense-article spacecraft. Includes command-load generation, telemetry decommutation, limit-checking, autonomous anomaly-response trees, frame synchronisation, and CCSDS protocol stacks. Often a stand-alone server-side product distinct from XV(b)(4) mission-planning suites.",
    ear600SeriesCounterpart: "9D515",
    itarSME: false,
    notes:
      "Surface deployed on-premises in classified facilities; cloud-hosted SaaS variants still ITAR-controlled even when the operator never touches the source.",
  },
  {
    paragraph: "XV(g)(5)",
    subParagraph: "g",
    title:
      "Image-processing pipelines for USML XV(c) imaging payload defense articles",
    description:
      "Image-processing software for USML XV(c) imaging payloads — including radiometric calibration, MTF deconvolution, NIIRS-rating estimators, atmospheric-correction algorithms, change-detection routines, and target-acquisition automated tip-and-cue logic. Performance thresholds cross-walk to the parametric GSD limits in XV(c)(2)/(c)(3).",
    ear600SeriesCounterpart: "9D515",
    itarSME: false,
  },
  {
    paragraph: "XV(g)(6)",
    subParagraph: "g",
    title: "AI/ML models trained on USML XV(c) imagery or defense article data",
    description:
      "Machine-learning models — including neural-network weights, embedding tables, decision-tree ensembles, and fine-tuned foundation models — trained on data generated by USML XV(c) imaging payload defense articles or any USML XV defense article. Models inherit ITAR jurisdiction from their training data per DDTC interpretive guidance; export of the trained model itself is a controlled software export.",
    ear600SeriesCounterpart: "9D515",
    itarSME: false,
    notes:
      "Training pipelines, hyperparameters, and dataset-cataloguing tools may also be controlled when specifically designed for USML XV data.",
  },
  {
    paragraph: "XV(g)(7)",
    subParagraph: "g",
    title: "Embedded firmware for USML XV(b)/(c)/(d)/(e)/(f) hardware",
    description:
      "Firmware images (FPGA bitstreams, microcontroller HEX files, FPGA configuration ROMs, boot-loaders, hardware abstraction layers) specifically designed for USML XV(b) ground control hardware, XV(c) rad-hard microcircuits, XV(d) anti-tamper hardware, XV(e) components, and XV(f) tech-derived hardware. Cross-walk to XV(c) and XV(e)(8) when shipped pre-loaded.",
    ear600SeriesCounterpart: "9D515",
    itarSME: false,
  },
  {
    paragraph: "XV(g)(8)",
    subParagraph: "g",
    title:
      "Spacecraft source code, object code, compiled binaries, executables, scripts",
    description:
      "Any form of source code, object code, compiled binaries, executables, command scripts, configuration files, makefiles, or build artefacts specifically designed or modified for USML XV(a)–(f) defense articles. Includes interpreted languages (Python, Lua, JavaScript) embedded inside spacecraft on-board software stacks and CI/CD pipeline outputs.",
    ear600SeriesCounterpart: "9D515",
    itarSME: false,
    licenseExceptions: ["AUKUS"],
    notes:
      "AUKUS exemption potentially applies for transfers between Australia, UK, US persons under 22 CFR § 126.7; verify SME flag and end-use compliance.",
  },
  {
    paragraph: "XV(g)(9)",
    subParagraph: "g",
    title: "Software-as-a-Service offerings whose underlying system is USML XV",
    description:
      "Cloud-hosted software-as-a-service offerings whose underlying system is a USML XV(a)–(f) defense article. Includes operator-as-a-service spacecraft control products, mission-planning SaaS, imagery-tasking SaaS for USML XV(c) payloads, and tasking-orchestration platforms. DDTC interpretive guidance: deemed export occurs when a foreign-national operator logs into the SaaS even from a cleared US data centre.",
    ear600SeriesCounterpart: "9D515",
    itarSME: false,
    notes:
      "SaaS providers must implement nationality-aware access control to avoid deemed-export violations. Foreign access requires DSP-5 or TAA.",
  },
  {
    paragraph: "XV(g)(10)",
    subParagraph: "g",
    title: "Spacecraft autonomy, on-orbit AI, and autonomous decision software",
    description:
      "Software implementing on-board autonomous decision-making for USML XV(a) defense-article spacecraft — including autonomous orbit-correction, autonomous collision-avoidance manoeuvres, autonomous payload tasking, and reasoning frameworks (planners, schedulers, behaviour-trees, reinforcement-learning agents). Cross-walks to in-orbit-servicing software when applied to USML XV servicing platforms.",
    ear600SeriesCounterpart: "9D515",
    itarSME: false,
  },
  {
    paragraph: "XV(g)(11)",
    subParagraph: "g",
    title:
      "Anti-jam, anti-spoof, and adversarial-resilient navigation software",
    description:
      "Software specifically designed to harden USML XV defense-article spacecraft navigation against adversarial threats — anti-jam M-code GNSS receivers, anti-spoof signal-authentication processors, jammer-direction-finding algorithms, and resilient sensor-fusion modes that gracefully degrade when GNSS is denied. Performance thresholds cross-walk to XV(b)(5) ground timing references.",
    ear600SeriesCounterpart: "9D515",
    itarSME: true,
    notes:
      "Anti-jam navigation software is frequently SME-designated; ineligible for AUKUS / CSA without case-by-case DDTC authorisation.",
  },
  {
    paragraph: "XV(g)(12)",
    subParagraph: "g",
    title: "Classified catch-all (USML XV software)",
    description:
      "Catch-all for any software specifically designed or modified for classified USML XV defense-article spacecraft, ground control, rad-hard microelectronics, anti-tamper articles, components, or tech-derived hardware and not otherwise enumerated in XV(g)(1)–(11). Operator should request a DDTC Commodity Jurisdiction (CJ) determination.",
    itarSME: false,
    notes:
      "CJ determinations typically take 60-90 days. Maintain a defensible technical record demonstrating the specific-design intent.",
  },

  // ─── XV(h) — Components, Parts, Accessories for USML XV(a)–(g) ──────
  {
    paragraph: "XV(h)(1)",
    subParagraph: "h",
    title:
      "Solar arrays specifically designed for USML XV(a) defense spacecraft",
    description:
      "Solar arrays (panels, blankets, concentrators, and deployable structures) specifically designed for USML XV(a) defense-article spacecraft. Includes triple-junction GaInP/GaAs/Ge cells when radiation-hardened to USML XV specifications, deployment-mechanism harnesses, sun-tracking gimbals, and dedicated power-distribution shunts.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
    notes:
      "Commercial off-the-shelf solar arrays without USML-specific rad-hardening typically fall under EAR 9A515.x or 7A994.",
  },
  {
    paragraph: "XV(h)(2)",
    subParagraph: "h",
    title:
      "Reaction wheels, momentum wheels, and control-moment gyroscopes (CMGs) for USML XV defense articles",
    description:
      "Reaction wheels, momentum wheels, and control-moment gyroscopes specifically designed for USML XV(a) defense-article spacecraft attitude control. Cross-walks to USML XV(e) when performance thresholds (e.g., output-torque, rotor-momentum) exceed certain parametric limits. Includes wheel-drive electronics, lubrication-management hardware, and isolation mounts.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
  },
  {
    paragraph: "XV(h)(3)",
    subParagraph: "h",
    title:
      "Star trackers, sun sensors, and magnetometers (component-level) for USML XV defense articles",
    description:
      "Star trackers, sun sensors, and magnetometers at the component / sub-system level specifically designed for USML XV(a) defense-article spacecraft, when the full unit's performance does not exceed the XV(d) parametric thresholds. Includes optics, detectors, opto-mechanical mounts, and electronics that drive the unit.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
    notes:
      "If the star-tracker's performance exceeds XV(d) threshold (e.g., sub-arcsecond bias), classification escalates to XV(d).",
  },
  {
    paragraph: "XV(h)(4)",
    subParagraph: "h",
    title:
      "Propellant tanks, valves, regulators, and feed-system hardware for USML XV propulsion",
    description:
      "Propellant tanks (titanium, COPV, monolithic), valves (latch, pressure-regulator, solenoid), pressure regulators, fill-and-drain valves, and feed-system hardware specifically designed for USML XV defense-article spacecraft propulsion sub-systems. Includes hydrazine-compatible elastomers, electric-propulsion xenon tankage, and bipropellant manifolds.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
  },
  {
    paragraph: "XV(h)(5)",
    subParagraph: "h",
    title:
      "Thermal control hardware (heaters, radiators, MLI, heat pipes) for USML XV defense articles",
    description:
      "Thermal control hardware — including patch heaters, two-phase heat pipes, loop heat pipes, deployable radiators, multi-layer insulation (MLI) blankets, second-surface mirrors, and cryogenic-thermal straps — specifically designed for USML XV(a) defense-article spacecraft. Cross-walks to XV(e) cryocoolers when the assembly includes a sub-2K cryocooler.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
  },
  {
    paragraph: "XV(h)(6)",
    subParagraph: "h",
    title:
      "Single-board computers (SBC) and power-distribution units (PDU) for USML XV defense articles",
    description:
      "Bus electronics — single-board computers, power-distribution units, telemetry/command interfaces, payload-bus controllers, and DC/DC converter cards — specifically designed for USML XV(a) defense-article spacecraft. Includes rad-hardened processor cards meeting XV(c)(4) parametric thresholds when integrated into a defense article.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
  },
  {
    paragraph: "XV(h)(7)",
    subParagraph: "h",
    title:
      "Spacecraft harnesses, cables, connectors, and interconnects for USML XV defense articles",
    description:
      "Cable harnesses, electrical connectors, fibre-optic harnesses, RF interconnects, and EMI/EMP-protected cabling specifically designed for USML XV(a) defense-article spacecraft. Includes shielded-twisted-pair power harnesses, MIL-DTL-38999 connectors, optical fibre rotary joints, and Sub-D pyrotechnic firing connectors.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
  },
  {
    paragraph: "XV(h)(8)",
    subParagraph: "h",
    title: "Built-in-test (BIT) testers and on-orbit diagnostic equipment",
    description:
      "Built-in-test electronics, on-orbit fault-detection equipment, and continuous-monitoring sub-systems specifically designed for USML XV(a) defense-article spacecraft. Includes redundancy-management controllers, watchdog timers, and FDIR (Fault Detection, Isolation, and Recovery) circuit boards.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
  },
  {
    paragraph: "XV(h)(9)",
    subParagraph: "h",
    title:
      "Encryption hardware and firmware specifically designed for USML XV defense satellites",
    description:
      "Cryptographic hardware modules (HSMs), encryption ASICs/FPGAs, and pre-loaded firmware specifically designed for USML XV(a) defense-article spacecraft. Cross-walks to XV(b)(3) for ground-segment crypto and XV(d) for anti-tamper variants. Often Type 1 NSA-certified; subject to additional ECCN/CNSS coordination.",
    itarSME: true,
    licenseExceptions: [],
    notes:
      "SME-designated; requires DSP-83 non-transfer and use certificate. Type 1 crypto requires NSA coordination separate from DDTC authorisation.",
  },
  {
    paragraph: "XV(h)(10)",
    subParagraph: "h",
    title: "Test equipment for USML XV(a)–(g) defense articles",
    description:
      "Test equipment specifically designed for the development, production, or qualification of USML XV(a)–(g) defense articles. Includes thermal-vacuum chambers, vibration shakers, EMI/EMC test cells, magnetic-cleanliness chambers, and articulating mass-properties measurement systems when the configuration is specifically designed for a USML XV defense article.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
    notes:
      "Generic COTS test equipment is not controlled; only configurations specifically designed for USML XV defense articles.",
  },
  {
    paragraph: "XV(h)(11)",
    subParagraph: "h",
    title: "Ground support equipment (GSE) for USML XV defense spacecraft",
    description:
      "Mechanical, electrical, fluid, and pneumatic ground support equipment specifically designed for the assembly, integration, transportation, launch-pad processing, or pre-launch checkout of USML XV(a) defense-article spacecraft. Includes lifting fixtures, transport containers, fuelling carts, and umbilical interface panels.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
  },
  {
    paragraph: "XV(h)(12)",
    subParagraph: "h",
    title:
      "Mounting brackets, fasteners, and structural-interface hardware for USML XV defense articles",
    description:
      "Mounting brackets, structural fittings, fasteners, separation systems, and structural-interface hardware specifically designed for USML XV(a)–(g) defense articles. Includes deployment hinges, latch mechanisms, separation nuts, frangible bolts, and pyrotechnic actuators when their configuration is specifically designed for a defense article.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
  },
  {
    paragraph: "XV(h)(13)",
    subParagraph: "h",
    title:
      "Specialised antennas and RF aperture hardware (sub-system) for USML XV defense articles",
    description:
      "Spacecraft-mounted antennas, RF aperture hardware, beam-steering electronics, and feed networks specifically designed for USML XV(a) defense-article spacecraft. Includes phased-array elements, T/R modules below XV(e)(10) thresholds, helical antennas, and reflector dishes. Cross-walks to XV(e)(10) when MMIC count/performance exceeds threshold.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
  },
  {
    paragraph: "XV(h)(14)",
    subParagraph: "h",
    title:
      "Optical and laser sub-system components for USML XV defense articles",
    description:
      "Optical and laser sub-system components — lenses, mirrors, beam-splitters, photodetectors, laser diodes, electro-optic modulators, and gimbal/pointing assemblies — specifically designed for USML XV(a) defense-article spacecraft optical communication links, laser ranging, or LIDAR sub-systems. Cross-walks to XV(e)(2) directed-energy and XV(e)(8) imaging.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
  },
  {
    paragraph: "XV(h)(15)",
    subParagraph: "h",
    title:
      "Spacecraft batteries and power-storage devices for USML XV articles",
    description:
      "Spacecraft batteries (Li-ion, Li-polymer, NiCd) and power-storage devices specifically designed for USML XV(a) defense-article spacecraft. Includes battery management electronics, cell-balancing circuitry, charge controllers, and battery thermal-control hardware when specifically designed for a defense article.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
  },
  {
    paragraph: "XV(h)(16)",
    subParagraph: "h",
    title:
      "Inter-satellite link (ISL) hardware for USML XV defense-article spacecraft",
    description:
      "Inter-satellite link transceivers, antennas, beam-pointing assemblies, and optical-comms terminals specifically designed for USML XV(a) defense-article spacecraft constellation operations. Includes RF crosslinks, optical inter-satellite links (OISL), and on-board routing electronics. Often dual-use with commercial constellations — the specific-design test determines USML jurisdiction.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
    notes:
      "Commercial constellations with non-defense customers may receive a § 120.41(b) carve-out depending on the specific-design analysis.",
  },
  {
    paragraph: "XV(h)(17)",
    subParagraph: "h",
    title:
      "Spacecraft simulators, ground-truth replicas, and engineering development units",
    description:
      "Spacecraft simulators, ground-truth hardware replicas (FlatSats), engineering development units, and high-fidelity emulators specifically designed for USML XV(a)–(g) defense articles. Often used for training operators, validating software updates, and rehearsing on-orbit anomaly responses. Falls under USML by association with the defense article.",
    ear600SeriesCounterpart: "9A515",
    itarSME: false,
  },
  {
    paragraph: "XV(h)(18)",
    subParagraph: "h",
    title: "Classified catch-all (USML XV components, parts, accessories)",
    description:
      "Catch-all for any component, part, accessory, attachment, or associated equipment specifically designed or modified for classified USML XV(a)–(g) defense articles and not otherwise enumerated. Operator should request a DDTC Commodity Jurisdiction (CJ) determination. Cross-walks to XV(e) when the article is on the XV(e) sub-paragraph list.",
    itarSME: false,
    notes:
      "When in doubt between XV(e) and XV(h), the more specific XV(e) sub-paragraph governs. XV(h) is the residual.",
  },
] as const;

/**
 * Index of the enumeration by paragraph code. Built once at module
 * load. Use this for O(1) lookups from the cascade and matcher.
 */
export const USML_XV_GH_BY_PARAGRAPH: Readonly<Record<string, UsmlXvGhEntry>> =
  Object.freeze(
    Object.fromEntries(USML_XV_GH_ENTRIES.map((e) => [e.paragraph, e])),
  );

/**
 * Coverage metadata — surfaced into the moat-coverage dashboard and the
 * `/dashboard/modules/export-control` self-audit view.
 */
export const USML_XV_GH_COVERAGE = {
  totalEntries: USML_XV_GH_ENTRIES.length,
  byParagraph: {
    g: USML_XV_GH_ENTRIES.filter((e) => e.subParagraph === "g").length,
    h: USML_XV_GH_ENTRIES.filter((e) => e.subParagraph === "h").length,
  },
  smeCount: USML_XV_GH_ENTRIES.filter((e) => e.itarSME === true).length,
  asOf: USML_XV_GH_AS_OF,
} as const;

/**
 * Lookup an XV(g/h) entry by paragraph code (e.g. "XV(g)(1)" or
 * "XV(h)(4)"). Returns undefined when the paragraph is not enumerated
 * — callers should treat that as "not yet covered" rather than "not
 * USML."
 */
export function findUsmlXvGhEntry(code: string): UsmlXvGhEntry | undefined {
  return USML_XV_GH_BY_PARAGRAPH[code];
}

/**
 * Returns all entries belonging to a single sub-paragraph, "g" or "h".
 * Convenience filter for the UI when rendering an XV sub-category
 * panel.
 */
export function findUsmlXvGhByParagraph(
  sub: "g" | "h",
): readonly UsmlXvGhEntry[] {
  return USML_XV_GH_ENTRIES.filter((e) => e.subParagraph === sub);
}

/**
 * Returns all entries flagged as Significant Military Equipment (SME)
 * under 22 CFR § 120.7. Used by the license-determination engine to
 * surface the DSP-83 non-transfer-and-use certificate requirement.
 */
export function findUsmlXvGhBySME(): readonly UsmlXvGhEntry[] {
  return USML_XV_GH_ENTRIES.filter((e) => e.itarSME === true);
}

/**
 * Returns the subset of XV(g/h) entries directly relevant to a space
 * operator's day-to-day classification work — currently the entire
 * enumeration (every entry is space-relevant by virtue of falling
 * under USML Category XV). Reserved for future filtering when XV(g/h)
 * grows to include non-space appendix entries.
 */
export function findUsmlXvGhSpaceRelevant(): readonly UsmlXvGhEntry[] {
  return USML_XV_GH_ENTRIES;
}

/**
 * Source citation surfaced into UI tooltips, audit logs, and PDF
 * reports. Returns the eCFR URL pinned at module-load time.
 */
export function getUsmlXvGhSourceCitation(): {
  source: string;
  url: string;
  asOfDate: string;
} {
  return {
    source: "22 CFR § 121.1 Category XV(g) and XV(h)",
    url: SOURCE_URL,
    asOfDate: USML_XV_GH_AS_OF,
  };
}
