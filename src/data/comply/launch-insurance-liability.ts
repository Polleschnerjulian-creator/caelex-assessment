/**
 * Launch Insurance + Third-Party Liability Regulations
 * — first-class regulatory dataset.
 *
 * Covers the international + national liability + insurance regulatory
 * layer that gates every commercial spacecraft launch + on-orbit
 * operation. Spans the foundational UN treaty regime (Liability
 * Convention 1972 + OST Art. VI/VII), US (CSLA + 14 CFR Part 440 / FAA
 * AST MPL), UK (SIA 2018 + SI 2021/792), France (LOA + Décret 2009-643),
 * Germany (proposed Weltraumgesetz + SatDSiG + BGB overlay), Italy
 * (Codice Civile Art. 2050 strict liability), and the proposed EU
 * Space Act (COM(2025) 335) harmonised regime.
 *
 * The liability + insurance layer is the **single most decisive
 * commercial-feasibility gate** for new launches: no licence is granted
 * without proof of insurance, and no insurance is bound without the
 * MPL / national-cap determined by the regulator. Every operator
 * authorisation under the Outer Space Treaty's "appropriate State"
 * doctrine flows through this layer.
 *
 * **Major regulatory shifts (2020-2026):**
 *   - 51 U.S.C. § 50914 reauthorised the US Government Maximum
 *     Probable Loss (MPL) indemnification regime through 30 Sep 2025;
 *     reauthorisation through 30 Sep 2030 enacted via the FAA
 *     Reauthorization Act of 2024 (P.L. 118-63).
 *   - UK SIA 2018 + SI 2021/792 reg. 18-21 created the first explicit
 *     UK insurance regime for in-orbit operations (separate from
 *     launch insurance).
 *   - French LOA: Décret 2009-643 (amended 2020) consolidated the
 *     €60M state-indemnification cap and the mission-specific
 *     insurance requirement.
 *   - German draft Weltraumgesetz 2023 (referentenentwurf) proposed a
 *     €60M liability cap + state guarantee — currently in
 *     parliamentary review with adoption expected 2027.
 *   - EU Space Act COM(2025) 335: Articles 40-44 propose a
 *     harmonised insurance regime (€100M third-party / €15M property
 *     minimum) currently in trilogue (May 2026), expected adoption
 *     mid-2027.
 *   - CONFERS + industry consensus on cross-waiver clauses (51 U.S.C.
 *     § 50914(a)(4)-style) increasingly imported into commercial
 *     servicing contracts in Europe + Japan.
 *
 * **Quantitative thresholds that appear repeatedly:**
 *   - **1 year** — Liability Convention Art. XII claim window from
 *     damage occurrence (treaty-binding deadline).
 *   - **$500M USD** — US Government indemnification ceiling for
 *     claims above MPL (51 U.S.C. § 50914, typical MPL band for
 *     orbital launches).
 *   - **$100M USD** — Typical US Government-property insurance
 *     requirement for FAA AST commercial launches.
 *   - **£60M GBP** — UK Space Industry Act 2018 minimum third-party
 *     liability insurance for launch operations.
 *   - **£20M GBP** — UK SIA minimum in-orbit liability insurance
 *     (lower than launch reflecting reduced cumulative risk profile).
 *   - **€60M EUR** — French LOA + draft German Weltraumgesetz
 *     liability cap with state-indemnification beyond.
 *   - **€100M EUR** — EU Space Act COM(2025) 335 Art. 40 proposed
 *     minimum third-party liability insurance (under trilogue).
 *   - **€15M EUR** — EU Space Act proposed minimum property
 *     (government-asset) coverage.
 *   - **Joint + several liability** — Liability Convention Art. V
 *     when multiple states are co-launching states for the same
 *     space object.
 *
 * Sources (accessed 2026-05-23):
 *   - Convention on International Liability for Damage Caused by
 *     Space Objects (Liability Convention, 1972), entered into force
 *     1 Sep 1972; 95+ States Parties.
 *     https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html
 *   - Treaty on Principles Governing the Activities of States in the
 *     Exploration and Use of Outer Space (Outer Space Treaty, OST 1967)
 *     https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html
 *   - 51 U.S.C. §§ 50901-50923 (Commercial Space Launch Act,
 *     codified at Subtitle V, Chapter 509)
 *     https://www.law.cornell.edu/uscode/text/51/subtitle-V/chapter-509
 *   - 51 U.S.C. § 50914 — Liability insurance + financial
 *     responsibility requirements
 *     https://www.law.cornell.edu/uscode/text/51/50914
 *   - 14 CFR Part 440 — Financial responsibility (FAA AST)
 *     https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-440
 *   - UK Space Industry Act 2018, ss. 33-38
 *     https://www.legislation.gov.uk/ukpga/2018/5/part/2/crossheading/insurance-and-indemnities
 *   - The Space Industry Regulations 2021 (SI 2021/792), reg. 18-21
 *     https://www.legislation.gov.uk/uksi/2021/792/part/4
 *   - Loi n° 2008-518 du 3 juin 2008 relative aux opérations
 *     spatiales (LOA)
 *     https://www.legifrance.gouv.fr/loda/id/JORFTEXT000018931380
 *   - Décret n° 2009-643 du 9 juin 2009 — autorisations des
 *     opérations spatiales
 *     https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020715168
 *   - Referentenentwurf Weltraumgesetz (BMWK 2023) — draft German
 *     space act
 *     https://www.bmwk.de/Redaktion/DE/Downloads/W/weltraumgesetz-referentenentwurf.html
 *   - Satellitendatensicherheitsgesetz (SatDSiG)
 *     https://www.gesetze-im-internet.de/satdsig/
 *   - Codice Civile italiano Art. 2050 — responsabilità per
 *     l'esercizio di attività pericolose
 *     https://www.brocardi.it/codice-civile/libro-quarto/titolo-ix/capo-i/art2050.html
 *   - European Commission COM(2025) 335 — Proposal for an EU Space Act
 *     (Articles 40-44 — insurance + liability)
 *     https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0335
 *
 * NOT a verbatim transcription. Descriptions are paraphrased compliance-
 * level summaries; authoritative interpretation requires the specific
 * regulator's review (FAA AST MPL determination, UK CAA insurance
 * approval, French CNES inter-ministerial review, Italian ASI
 * authorisation, EU Commission COM(2025) 335 trilogue outcome).
 */

/** As-of date for the file as a whole. */
export const LAUNCH_INSURANCE_AS_OF = "2026-05-23";

/** Regime — the regulator or treaty issuing the requirement. */
export type InsuranceRegime =
  | "LIABILITY_CONVENTION" // UN 1972 Liability Convention (treaty)
  | "OST_VI_VII" // Outer Space Treaty 1967, Art. VI + VII (treaty)
  | "US-CSLA" // 51 U.S.C. §§ 50901-50923 + 14 CFR Part 440 (US)
  | "FR-LOA" // Loi sur les Opérations Spatiales + Décret 2009-643
  | "UK-SIA" // UK Space Industry Act 2018 + SI 2021/792
  | "DE-WELTRAUM" // Draft Weltraumgesetz + SatDSiG + BGB overlay
  | "IT-CODICE-CIVILE" // Italian Codice Civile Art. 2050 + ASI rules
  | "EU-SPACE-ACT"; // COM(2025) 335 Art. 40-44 (proposed)

/** Functional category of an insurance / liability requirement. */
export type InsuranceCategory =
  | "LIABILITY_ABSOLUTE" // strict / absolute liability (surface damage)
  | "LIABILITY_FAULT" // fault-based liability (in-orbit collisions)
  | "INSURANCE_MINIMUM_AMOUNT" // minimum third-party / property coverage
  | "STATE_INDEMNIFICATION" // state assumes liability above private cap
  | "CLAIM_WINDOW" // statute of limitations / treaty claim deadline
  | "CROSS_WAIVER" // cross-waiver of liability between participants
  | "MPL_DETERMINATION" // Maximum Probable Loss determination process
  | "COVERAGE_PERIOD" // pre-launch / launch / in-orbit / re-entry scope
  | "AUTHORIZATION_INSURANCE_LINK" // no licence without proof of insurance
  | "JOINT_LIABILITY" // joint + several liability between launching states
  | "DATA_LIABILITY" // satellite-data-related liability (SatDSiG)
  | "STATE_RESPONSIBILITY"; // state responsibility for national space activities

/** Mission phase the rule scopes to. */
export type InsurancePhase =
  | "PRE_LAUNCH" // pre-flight integration / fuelling / launch pad
  | "LAUNCH" // launch + ascent to orbit
  | "IN_ORBIT" // on-orbit operations
  | "REENTRY" // controlled / uncontrolled re-entry phase
  | "POST_MISSION"; // post-mission disposal / debris release

/** Binding nature — how strict the rule is. */
export type InsuranceBindingNature =
  | "TREATY" // International treaty (Liability Convention, OST)
  | "MANDATORY" // National statute / regulation (binding)
  | "PROPOSED" // Pending legislation (EU Space Act, draft German law)
  | "GUIDELINE"; // Non-binding guidance / industry practice

/** Operator scope categories — who the rule applies to. */
export type InsuranceOperatorScope =
  | "COMMERCIAL"
  | "GOVERNMENT"
  | "ACADEMIC"
  | "ALL";

/** One entry — a single insurance / liability requirement from one regime. */
export interface InsuranceRequirementEntry {
  /** Unique code, e.g. "LIAB-CONV-ART-II", "US-CSLA-MPL". */
  code: string;

  /** Regulator or treaty issuer. */
  regime: InsuranceRegime;

  /** Functional category. */
  category: InsuranceCategory;

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

  /** Mission phases the rule applies to. */
  applicablePhases: ReadonlyArray<InsurancePhase>;

  /** Quantitative threshold, if any. */
  threshold?: {
    /** Parameter name (e.g. "minimumCoverageThirdPartyUSD"). */
    parameter: string;
    /** Comparison operator. */
    operator: "<=" | ">=" | "<" | ">" | "=";
    /** Numeric value. */
    value: number;
    /** Unit (incl. currency annotation: USD/EUR/GBP/years etc.). */
    unit: string;
  };

  /** Binding nature. */
  bindingNature: InsuranceBindingNature;

  /** Operator scope this applies to. */
  operatorScope: ReadonlyArray<InsuranceOperatorScope>;

  /** Related codes in this dataset (cross-references). */
  relatedCodes?: ReadonlyArray<string>;

  /** Clarification notes. */
  notes?: string;
}

// ============================================================================
// Liability Convention 1972 — UN treaty (95+ ratifying States)
// ============================================================================

const LIABILITY_CONVENTION_ENTRIES: ReadonlyArray<InsuranceRequirementEntry> = [
  {
    code: "LIAB-CONV-ART-II-ABSOLUTE",
    regime: "LIABILITY_CONVENTION",
    category: "LIABILITY_ABSOLUTE",
    title:
      "Liability Convention Art. II — Absolute liability for damage on Earth's surface",
    description:
      "Article II of the 1972 Liability Convention imposes ABSOLUTE " +
      "(no-fault) liability on a launching State for damage caused by " +
      "its space object on the surface of the Earth or to aircraft in " +
      "flight. The injured party need only prove (a) the damage and " +
      "(b) the causal link to the launching State's space object — " +
      "no need to prove negligence or fault. This is the highest " +
      "standard of liability under international space law and " +
      "underpins every national insurance regime that requires " +
      "third-party liability coverage for launch + re-entry phases.",
    effectiveFrom: "1972-09-01",
    citation:
      "Convention on International Liability for Damage Caused by Space Objects, Art. II",
    sourceUrl:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "REENTRY"],
    bindingNature: "TREATY",
    operatorScope: ["ALL"],
    relatedCodes: [
      "LIAB-CONV-ART-III-FAULT",
      "OST-ART-VII",
      "LIAB-CONV-ART-XII-CLAIM",
    ],
    notes:
      "Absolute liability under Article II contrasts with the fault-" +
      "based standard of Article III for in-orbit collisions. The two " +
      "rules together create the binary liability architecture of the " +
      "international space-law regime.",
  },
  {
    code: "LIAB-CONV-ART-III-FAULT",
    regime: "LIABILITY_CONVENTION",
    category: "LIABILITY_FAULT",
    title:
      "Liability Convention Art. III — Fault-based liability for in-orbit damage",
    description:
      "Article III of the Liability Convention imposes FAULT-BASED " +
      "liability on a launching State for damage caused by its space " +
      "object to another State's space object in outer space (i.e. " +
      "off the Earth's surface). The claimant State must demonstrate " +
      "negligence or wrongful conduct by the launching State or its " +
      "national operators. This standard underpins on-orbit collision " +
      "claims (e.g. the Cosmos-2251 / Iridium-33 collision discussion) " +
      "and shapes RPO / IOS mission insurance design.",
    effectiveFrom: "1972-09-01",
    citation:
      "Convention on International Liability for Damage Caused by Space Objects, Art. III",
    sourceUrl:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html",
    applicablePhases: ["IN_ORBIT"],
    bindingNature: "TREATY",
    operatorScope: ["ALL"],
    relatedCodes: ["LIAB-CONV-ART-II-ABSOLUTE", "OST-ART-VII"],
  },
  {
    code: "LIAB-CONV-ART-V-JOINT",
    regime: "LIABILITY_CONVENTION",
    category: "JOINT_LIABILITY",
    title:
      "Liability Convention Art. V — Joint and several liability of co-launching States",
    description:
      "Article V provides that where two or more States jointly launch " +
      "a space object, they are JOINTLY AND SEVERALLY LIABLE for any " +
      "damage caused. A claimant State may seek the entire compensation " +
      "from any one of the co-launching States. Internal apportionment " +
      "of the loss between launching States is left to bilateral / " +
      "multilateral agreement (e.g. the Arianespace + ESA + CNES + " +
      "national launching-state architecture).",
    effectiveFrom: "1972-09-01",
    citation:
      "Convention on International Liability for Damage Caused by Space Objects, Art. V",
    sourceUrl:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "IN_ORBIT", "REENTRY"],
    bindingNature: "TREATY",
    operatorScope: ["ALL"],
    relatedCodes: ["LIAB-CONV-ART-II-ABSOLUTE", "OST-ART-VI"],
    notes:
      "Joint + several liability creates significant cross-border " +
      "exposure for any consortium launch and underpins the cross-" +
      "waiver of liability clauses (51 U.S.C. § 50914(a)(4)) that " +
      "operators include in commercial launch service agreements.",
  },
  {
    code: "LIAB-CONV-ART-XII-CLAIM",
    regime: "LIABILITY_CONVENTION",
    category: "CLAIM_WINDOW",
    title: "Liability Convention Art. XII — 1-year claim window from damage",
    description:
      "Article XII sets the procedural window for compensation claims: " +
      "a State may present a claim for compensation NOT LATER THAN ONE " +
      "YEAR following the date of occurrence of the damage, or NOT " +
      "LATER THAN ONE YEAR following the date on which the launching " +
      "State could reasonably be expected to have become aware of the " +
      "damage. Claims under the Convention are presented through " +
      "diplomatic channels; absent settlement within one year, a " +
      "Claims Commission may be requested under Articles XIV-XX.",
    effectiveFrom: "1972-09-01",
    citation:
      "Convention on International Liability for Damage Caused by Space Objects, Art. XII",
    sourceUrl:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html",
    applicablePhases: [
      "PRE_LAUNCH",
      "LAUNCH",
      "IN_ORBIT",
      "REENTRY",
      "POST_MISSION",
    ],
    threshold: {
      parameter: "claimWindowYears",
      operator: "<=",
      value: 1,
      unit: "years from damage occurrence",
    },
    bindingNature: "TREATY",
    operatorScope: ["ALL"],
    relatedCodes: ["LIAB-CONV-ART-II-ABSOLUTE", "LIAB-CONV-ART-III-FAULT"],
  },
];

// ============================================================================
// Outer Space Treaty 1967 — Articles VI + VII (treaty)
// ============================================================================

const OST_ENTRIES: ReadonlyArray<InsuranceRequirementEntry> = [
  {
    code: "OST-ART-VI",
    regime: "OST_VI_VII",
    category: "STATE_RESPONSIBILITY",
    title: "OST Art. VI — State responsibility for national space activities",
    description:
      "Article VI of the 1967 Outer Space Treaty establishes that " +
      "States Parties bear INTERNATIONAL RESPONSIBILITY for national " +
      "activities in outer space whether carried on by governmental " +
      "agencies or by NON-GOVERNMENTAL ENTITIES. The activities of " +
      "non-governmental entities require AUTHORIZATION AND CONTINUING " +
      "SUPERVISION by the appropriate State Party. This is the " +
      "doctrinal source of every national space-operator licensing " +
      "regime (US CSLA, UK SIA, French LOA, German Weltraumgesetz, " +
      "Italian ASI authorisations, etc.).",
    effectiveFrom: "1967-10-10",
    citation:
      "Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, Art. VI",
    sourceUrl:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html",
    applicablePhases: [
      "PRE_LAUNCH",
      "LAUNCH",
      "IN_ORBIT",
      "REENTRY",
      "POST_MISSION",
    ],
    bindingNature: "TREATY",
    operatorScope: ["ALL"],
    relatedCodes: [
      "OST-ART-VII",
      "LIAB-CONV-ART-II-ABSOLUTE",
      "US-CSLA-AUTHORIZATION",
    ],
    notes:
      "Article VI is the foundation of the 'appropriate State' " +
      "doctrine — the State that authorises + supervises private " +
      "space activities is internationally responsible for them.",
  },
  {
    code: "OST-ART-VII",
    regime: "OST_VI_VII",
    category: "LIABILITY_ABSOLUTE",
    title: "OST Art. VII — International liability for damage by space objects",
    description:
      "Article VII of the Outer Space Treaty establishes that each " +
      "State Party that launches or procures the launching of a space " +
      "object, and each State Party from whose territory or facility " +
      "a space object is launched, is INTERNATIONALLY LIABLE for " +
      "damage caused by that object or its component parts on Earth, " +
      "in air space, or in outer space. Article VII is operationalised " +
      "by the 1972 Liability Convention (Articles II + III). Notably, " +
      "Article VII places NO MONETARY CAP on state-to-state liability.",
    effectiveFrom: "1967-10-10",
    citation:
      "Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, Art. VII",
    sourceUrl:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html",
    applicablePhases: [
      "PRE_LAUNCH",
      "LAUNCH",
      "IN_ORBIT",
      "REENTRY",
      "POST_MISSION",
    ],
    bindingNature: "TREATY",
    operatorScope: ["ALL"],
    relatedCodes: [
      "OST-ART-VI",
      "LIAB-CONV-ART-II-ABSOLUTE",
      "LIAB-CONV-ART-III-FAULT",
    ],
    notes:
      "OST Article VII liability is uncapped state-to-state; national " +
      "operator regimes (CSLA / SIA / LOA / Weltraumgesetz) cap " +
      "PRIVATE operator liability and the State assumes residual " +
      "exposure above the cap.",
  },
];

// ============================================================================
// US Commercial Space Launch Act — 51 U.S.C. §§ 50901-50923 + 14 CFR Part 440
// ============================================================================

const US_CSLA_ENTRIES: ReadonlyArray<InsuranceRequirementEntry> = [
  {
    code: "US-CSLA-AUTHORIZATION",
    regime: "US-CSLA",
    category: "AUTHORIZATION_INSURANCE_LINK",
    title: "51 U.S.C. § 50904 — Licence required + insurance precondition",
    description:
      "51 U.S.C. § 50904 prohibits any person from launching a launch " +
      "vehicle, or operating a launch site or re-entry site, within " +
      "the United States or by a US citizen abroad, WITHOUT A LICENCE " +
      "OR PERMIT issued by the Secretary of Transportation (delegated " +
      "to FAA AST). The licence is conditioned on demonstrating " +
      "financial responsibility per § 50914 + 14 CFR Part 440; no " +
      "licence is issued without proof of insurance + cross-waiver " +
      "arrangements in place.",
    effectiveFrom: "1984-10-30",
    citation: "51 U.S.C. § 50904",
    sourceUrl: "https://www.law.cornell.edu/uscode/text/51/50904",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "REENTRY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["US-CSLA-MPL", "US-CSLA-CROSS-WAIVER", "OST-ART-VI"],
  },
  {
    code: "US-CSLA-MPL",
    regime: "US-CSLA",
    category: "MPL_DETERMINATION",
    title: "51 U.S.C. § 50914(a) — Maximum Probable Loss (MPL) determination",
    description:
      "51 U.S.C. § 50914(a) + 14 CFR Part 440.7-9 require FAA AST to " +
      "determine the MAXIMUM PROBABLE LOSS (MPL) for third-party " +
      "claims and US Government property claims arising from each " +
      "licensed launch / re-entry. The licensee must obtain liability " +
      "insurance + demonstrate financial responsibility in the amounts " +
      "of MPL, but NOT TO EXCEED $500 MILLION for third-party claims " +
      "and $100 MILLION for US Government property (or whichever lower " +
      "amount the insurance market reasonably bears). MPL is calculated " +
      "via FAA AST's MPL methodology (debris casualty area + population " +
      "density + property exposure).",
    effectiveFrom: "1984-10-30",
    citation: "51 U.S.C. § 50914(a)(1)-(3) + 14 CFR § 440.9",
    sourceUrl: "https://www.law.cornell.edu/uscode/text/51/50914",
    applicablePhases: ["LAUNCH", "REENTRY"],
    threshold: {
      parameter: "insuranceCoverageThirdPartyUSD",
      operator: ">=",
      value: 500_000_000,
      unit: "USD (MPL ceiling for third-party)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: [
      "US-CSLA-AUTHORIZATION",
      "US-CSLA-GOV-INDEMNIFICATION",
      "US-CSLA-CROSS-WAIVER",
    ],
    notes:
      "MPL is mission-specific and determined PER LAUNCH. A typical " +
      "orbital launch's MPL sits in the $100-300M range; the $500M " +
      "ceiling applies only to high-risk profiles (heavy lift over " +
      "populated areas, novel re-entry trajectories, etc.).",
  },
  {
    code: "US-CSLA-GOV-PROPERTY",
    regime: "US-CSLA",
    category: "INSURANCE_MINIMUM_AMOUNT",
    title:
      "14 CFR § 440.9(c) — US Government property insurance ($100M typical)",
    description:
      "14 CFR § 440.9(c) requires the licensee to demonstrate financial " +
      "responsibility for damage to US Government property used in " +
      "connection with the launch, in an amount equal to MPL for " +
      "Government property claims but NOT EXCEEDING $100 MILLION. " +
      "Coverage protects federal launch ranges (KSC, Vandenberg, " +
      "Wallops), Government-furnished equipment, and other US " +
      "property exposed during launch.",
    effectiveFrom: "1998-04-15",
    citation: "14 CFR § 440.9(c)",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-440/section-440.9",
    applicablePhases: ["LAUNCH", "REENTRY"],
    threshold: {
      parameter: "insuranceCoveragePropertyUSD",
      operator: ">=",
      value: 100_000_000,
      unit: "USD (MPL ceiling for Government property)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["US-CSLA-MPL", "US-CSLA-AUTHORIZATION"],
  },
  {
    code: "US-CSLA-GOV-INDEMNIFICATION",
    regime: "US-CSLA",
    category: "STATE_INDEMNIFICATION",
    title: "51 U.S.C. § 50914(b) — US Government indemnification above MPL",
    description:
      "51 U.S.C. § 50914(b) — the indemnification provision — authorises " +
      "the US Government to PAY THIRD-PARTY CLAIMS exceeding the MPL " +
      "insurance amount, subject to congressional appropriation, up to " +
      "approximately $3.0 billion (inflation-adjusted from the original " +
      "$1.5 billion 1988 figure). The provision was extended through " +
      "30 Sep 2030 by the FAA Reauthorization Act of 2024 (P.L. 118-63). " +
      "Indemnification protects the commercial-launch ecosystem from " +
      "catastrophic-loss scenarios beyond market-bearable insurance.",
    effectiveFrom: "1988-11-15",
    citation: "51 U.S.C. § 50914(b) + P.L. 118-63 § 624",
    sourceUrl: "https://www.law.cornell.edu/uscode/text/51/50914",
    applicablePhases: ["LAUNCH", "REENTRY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["US-CSLA-MPL", "OST-ART-VII"],
    notes:
      "Indemnification is NOT automatic — it requires congressional " +
      "appropriation and only covers claims above MPL but below the " +
      "statutory ceiling. The 2024 reauthorisation extended the regime " +
      "through Sep 2030; future reauthorisation is a known policy gap.",
  },
  {
    code: "US-CSLA-CROSS-WAIVER",
    regime: "US-CSLA",
    category: "CROSS_WAIVER",
    title:
      "51 U.S.C. § 50914(a)(4) — Cross-waiver of liability between participants",
    description:
      "51 U.S.C. § 50914(a)(4) + 14 CFR § 440.17 require RECIPROCAL " +
      "WAIVERS OF CLAIMS between the licensee, contractors, sub-" +
      "contractors, customers, AND the US Government for damage to " +
      "their respective property or employees arising from the " +
      "licensed launch / re-entry activities. The cross-waiver " +
      "internalises foreseeable participant-on-participant risk and " +
      "is the contractual backbone of commercial launch service " +
      "agreements (LSAs).",
    effectiveFrom: "1988-11-15",
    citation: "51 U.S.C. § 50914(a)(4) + 14 CFR § 440.17",
    sourceUrl: "https://www.law.cornell.edu/uscode/text/51/50914",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "REENTRY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["US-CSLA-MPL", "US-CSLA-AUTHORIZATION"],
  },
  {
    code: "US-CSLA-COVERAGE-PERIOD",
    regime: "US-CSLA",
    category: "COVERAGE_PERIOD",
    title:
      "14 CFR § 440.11 — Insurance coverage period (pre-launch through re-entry)",
    description:
      "14 CFR § 440.11 defines the licensed-activity coverage period " +
      "from the time hazardous pre-flight operations commence through " +
      "30 days after launch (or, for re-entry, through landing + 30 " +
      "days). Coverage must be in place THROUGHOUT THE COVERAGE " +
      "PERIOD; any policy lapse triggers FAA AST suspension of the " +
      "licence. The 30-day post-launch / post-landing tail accommodates " +
      "settlement of foreseeable claims arising during the launch window.",
    effectiveFrom: "1998-04-15",
    citation: "14 CFR § 440.11",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-440/section-440.11",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "REENTRY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["US-CSLA-MPL", "US-CSLA-AUTHORIZATION"],
  },
];

// ============================================================================
// French LOA — Loi sur les Opérations Spatiales (2008) + Décret 2009-643
// ============================================================================

const FR_LOA_ENTRIES: ReadonlyArray<InsuranceRequirementEntry> = [
  {
    code: "FR-LOA-ART-6-AUTH",
    regime: "FR-LOA",
    category: "AUTHORIZATION_INSURANCE_LINK",
    title: "LOA Art. 6-12 — Authorisation regime + insurance precondition",
    description:
      "Articles 6-12 of the French Loi n° 2008-518 du 3 juin 2008 " +
      "(Loi sur les Opérations Spatiales, LOA) establish the operator-" +
      "authorisation regime administered by the Ministry of Higher " +
      "Education + Research with technical review by CNES. Article 6 " +
      "requires every space operator subject to French jurisdiction " +
      "(operations from French territory, by French nationals abroad, " +
      "or under French control) to obtain authorisation, conditioned " +
      "on insurance proof per Articles 13-19.",
    effectiveFrom: "2008-12-10",
    citation: "Loi n° 2008-518 du 3 juin 2008, Art. 6-12",
    sourceUrl: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000018931380",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "IN_ORBIT", "REENTRY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FR-LOA-CAP", "FR-LOA-INDEMN", "OST-ART-VI"],
  },
  {
    code: "FR-LOA-CAP",
    regime: "FR-LOA",
    category: "INSURANCE_MINIMUM_AMOUNT",
    title:
      "LOA Art. 16 — €60M third-party liability cap + insurance requirement",
    description:
      "Article 16 of the LOA + Décret 2009-643 set a STATUTORY " +
      "CAP of €60 MILLION on the operator's third-party liability " +
      "for damage caused by licensed space operations to non-" +
      "participating third parties. The operator must demonstrate " +
      "insurance or equivalent financial guarantee for the full €60M " +
      "amount. Above this cap, the French State indemnifies (Article " +
      "14). The cap applies regardless of the mission's actual risk " +
      "profile, making French operations comparatively risk-attractive.",
    effectiveFrom: "2009-06-10",
    citation: "Loi n° 2008-518 du 3 juin 2008, Art. 16 + Décret 2009-643",
    sourceUrl: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020715168",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "IN_ORBIT", "REENTRY"],
    threshold: {
      parameter: "insuranceCoverageThirdPartyEUR",
      operator: ">=",
      value: 60_000_000,
      unit: "EUR (statutory liability cap)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FR-LOA-ART-6-AUTH", "FR-LOA-INDEMN"],
    notes:
      "The €60M cap is widely seen as the most operator-friendly cap " +
      "among European space-law regimes; the draft German Weltraum-" +
      "gesetz proposes to match it.",
  },
  {
    code: "FR-LOA-INDEMN",
    regime: "FR-LOA",
    category: "STATE_INDEMNIFICATION",
    title: "LOA Art. 14 — French State indemnification above the €60M cap",
    description:
      "Article 14 of the LOA establishes that the French State " +
      "indemnifies the licensed space operator for THIRD-PARTY " +
      "LIABILITY EXCEEDING THE €60M CAP, where the damage results " +
      "from licensed operations conducted without fault. This " +
      "state guarantee is the political-economic counterpart to the " +
      "low €60M cap: France attracts launches by absorbing tail risk. " +
      "Excluded: damage caused by intentional or wilful misconduct " +
      "of the operator.",
    effectiveFrom: "2008-12-10",
    citation: "Loi n° 2008-518 du 3 juin 2008, Art. 14",
    sourceUrl: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000018931380",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "IN_ORBIT", "REENTRY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FR-LOA-CAP", "OST-ART-VII"],
  },
  {
    code: "FR-LOA-DECRET-MISSION-INS",
    regime: "FR-LOA",
    category: "COVERAGE_PERIOD",
    title: "Décret 2009-643 — Mission-specific insurance coverage period",
    description:
      "Décret n° 2009-643 du 9 juin 2009 specifies the operational " +
      "insurance requirements implementing the LOA: coverage period " +
      "from initial integration / fuelling through final disposal or " +
      "transfer of ownership; insurance must name the French State + " +
      "CNES as additional insured; cross-waiver clauses must be " +
      "incorporated into all contracts with launch service providers " +
      "+ payload customers.",
    effectiveFrom: "2009-06-10",
    citation: "Décret n° 2009-643 du 9 juin 2009",
    sourceUrl: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020715168",
    applicablePhases: [
      "PRE_LAUNCH",
      "LAUNCH",
      "IN_ORBIT",
      "REENTRY",
      "POST_MISSION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FR-LOA-CAP", "FR-LOA-ART-6-AUTH"],
  },
];

// ============================================================================
// UK Space Industry Act 2018 + The Space Industry Regulations 2021 (SI 2021/792)
// ============================================================================

const UK_SIA_ENTRIES: ReadonlyArray<InsuranceRequirementEntry> = [
  {
    code: "UK-SIA-SEC-34-INSURANCE",
    regime: "UK-SIA",
    category: "AUTHORIZATION_INSURANCE_LINK",
    title: "UK SIA 2018 s. 34-37 — Insurance + indemnity requirements",
    description:
      "Sections 34-37 of the UK Space Industry Act 2018 require the " +
      "UK CAA to attach insurance + indemnity conditions to every " +
      "spaceflight licence (launch operator, range control, " +
      "spaceport, return-to-Earth, in-orbit licences). The licence " +
      "conditions specify minimum insurance amounts, the categories " +
      "of risk covered, and the duration of coverage. No licence is " +
      "valid without the insurance policy in force.",
    effectiveFrom: "2021-07-29",
    citation: "Space Industry Act 2018, ss. 34-37",
    sourceUrl:
      "https://www.legislation.gov.uk/ukpga/2018/5/part/2/crossheading/insurance-and-indemnities",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "IN_ORBIT", "REENTRY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["UK-SIA-LAUNCH-INS", "UK-SIA-IN-ORBIT-INS", "OST-ART-VI"],
  },
  {
    code: "UK-SIA-LAUNCH-INS",
    regime: "UK-SIA",
    category: "INSURANCE_MINIMUM_AMOUNT",
    title:
      "SI 2021/792 reg. 18 — £60M minimum third-party insurance for launch",
    description:
      "Regulation 18 of the Space Industry Regulations 2021 (SI " +
      "2021/792) sets the MINIMUM third-party liability insurance " +
      "for UK launch operator + spaceport licences at £60 MILLION " +
      "per launch / re-entry event. The actual amount required for " +
      "a specific licence may be higher if the UK CAA's MPL-style " +
      "assessment indicates higher exposure. The £60M floor is the " +
      "minimum entry condition for a UK launch licence.",
    effectiveFrom: "2021-07-29",
    citation: "The Space Industry Regulations 2021, reg. 18",
    sourceUrl: "https://www.legislation.gov.uk/uksi/2021/792/regulation/18",
    applicablePhases: ["LAUNCH", "REENTRY"],
    threshold: {
      parameter: "insuranceCoverageThirdPartyGBP",
      operator: ">=",
      value: 60_000_000,
      unit: "GBP (UK SIA launch floor)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["UK-SIA-SEC-34-INSURANCE", "UK-SIA-IN-ORBIT-INS"],
  },
  {
    code: "UK-SIA-IN-ORBIT-INS",
    regime: "UK-SIA",
    category: "INSURANCE_MINIMUM_AMOUNT",
    title: "SI 2021/792 reg. 19 — £20M minimum in-orbit liability insurance",
    description:
      "Regulation 19 of SI 2021/792 sets the MINIMUM third-party " +
      "liability insurance for UK in-orbit operations (satellite " +
      "operator licence) at £20 MILLION per spacecraft. The lower " +
      "floor relative to launch (£60M) reflects the reduced cumulative " +
      "risk profile of on-orbit operations vs. ascent + re-entry. " +
      "Operators of multiple spacecraft must demonstrate aggregate " +
      "coverage or per-spacecraft coverage of £20M.",
    effectiveFrom: "2021-07-29",
    citation: "The Space Industry Regulations 2021, reg. 19",
    sourceUrl: "https://www.legislation.gov.uk/uksi/2021/792/regulation/19",
    applicablePhases: ["IN_ORBIT"],
    threshold: {
      parameter: "insuranceCoverageThirdPartyGBP",
      operator: ">=",
      value: 20_000_000,
      unit: "GBP (UK SIA in-orbit floor)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["UK-SIA-LAUNCH-INS", "UK-SIA-SEC-34-INSURANCE"],
  },
  {
    code: "UK-SIA-MOD-EVAL",
    regime: "UK-SIA",
    category: "MPL_DETERMINATION",
    title: "SI 2021/792 reg. 20-21 — UK CAA modelled-loss evaluation",
    description:
      "Regulations 20-21 of SI 2021/792 require the UK CAA to assess " +
      "modelled-loss exposure for each licence application, considering " +
      "vehicle reliability data, trajectory + over-flight populations, " +
      "spaceport surroundings, return-to-Earth profiles, and the " +
      "operator's safety case. The minimum insurance amounts of reg. " +
      "18-19 are floors; the CAA may set higher amounts for specific " +
      "missions. This is the UK analogue of the US MPL process.",
    effectiveFrom: "2021-07-29",
    citation: "The Space Industry Regulations 2021, reg. 20-21",
    sourceUrl: "https://www.legislation.gov.uk/uksi/2021/792/part/4",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "REENTRY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["UK-SIA-LAUNCH-INS", "UK-SIA-IN-ORBIT-INS"],
  },
];

// ============================================================================
// German draft Weltraumgesetz + SatDSiG + BGB tort overlay
// ============================================================================

const DE_WELTRAUM_ENTRIES: ReadonlyArray<InsuranceRequirementEntry> = [
  {
    code: "DE-WELTRAUM-DRAFT-CAP",
    regime: "DE-WELTRAUM",
    category: "INSURANCE_MINIMUM_AMOUNT",
    title:
      "Draft Weltraumgesetz 2023 — €60M proposed liability cap + state guarantee",
    description:
      "The Referentenentwurf des Weltraumgesetzes (BMWK 2023) proposes " +
      "to introduce a comprehensive German national space law, with a " +
      "€60 MILLION CAP on operator third-party liability and a state " +
      "guarantee beyond the cap (mirroring the French LOA structure). " +
      "Currently in parliamentary review; expected adoption mid-2027. " +
      "Until adoption, German operators rely on general BGB tort " +
      "principles + SatDSiG data-side liability + Liability Convention.",
    effectiveFrom: "2027-06-01",
    citation:
      "Referentenentwurf Weltraumgesetz (BMWK 2023, in parliamentary review)",
    sourceUrl:
      "https://www.bmwk.de/Redaktion/DE/Downloads/W/weltraumgesetz-referentenentwurf.html",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "IN_ORBIT", "REENTRY"],
    threshold: {
      parameter: "insuranceCoverageThirdPartyEUR",
      operator: ">=",
      value: 60_000_000,
      unit: "EUR (proposed statutory cap)",
    },
    bindingNature: "PROPOSED",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["DE-SATDSIG-LIAB", "FR-LOA-CAP", "OST-ART-VI"],
    notes:
      "The draft explicitly references the French LOA's €60M cap + " +
      "state-guarantee architecture as the model and aims to make " +
      "Germany competitive with France for space-operator domicile.",
  },
  {
    code: "DE-SATDSIG-LIAB",
    regime: "DE-WELTRAUM",
    category: "DATA_LIABILITY",
    title: "SatDSiG §§ 11-13 — Satellite-data security liability",
    description:
      "§§ 11-13 of the Satellitendatensicherheitsgesetz (SatDSiG) " +
      "impose specific liability for operators of high-resolution " +
      "earth-observation satellites for damages arising from " +
      "unauthorised data dissemination or security breaches. " +
      "Operators must hold a Datensicherheitsbeauftragten (data " +
      "security officer), implement technical + organisational " +
      "measures, and bear civil + administrative liability for " +
      "breaches. The regime is the only operating German space-side " +
      "liability law pending adoption of the Weltraumgesetz.",
    effectiveFrom: "2007-12-01",
    citation: "Satellitendatensicherheitsgesetz §§ 11-13",
    sourceUrl: "https://www.gesetze-im-internet.de/satdsig/",
    applicablePhases: ["IN_ORBIT", "POST_MISSION"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["DE-WELTRAUM-DRAFT-CAP", "DE-BGB-TORT"],
  },
  {
    code: "DE-BGB-TORT",
    regime: "DE-WELTRAUM",
    category: "LIABILITY_FAULT",
    title: "BGB §§ 823, 826 — General tort liability overlay",
    description:
      "Pending adoption of the Weltraumgesetz, German space operators " +
      "are subject to the general tort-law regime of the BGB " +
      "(Bürgerliches Gesetzbuch). § 823 BGB establishes fault-based " +
      "liability for damages caused by negligent or intentional " +
      "conduct; § 826 BGB extends to wilful conduct causing damage " +
      "contra bonos mores. There is no statutory liability cap; " +
      "exposure is theoretically unlimited and shaped by case law.",
    effectiveFrom: "1900-01-01",
    citation: "BGB §§ 823, 826",
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__823.html",
    applicablePhases: [
      "PRE_LAUNCH",
      "LAUNCH",
      "IN_ORBIT",
      "REENTRY",
      "POST_MISSION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["ALL"],
    relatedCodes: ["DE-WELTRAUM-DRAFT-CAP", "DE-SATDSIG-LIAB"],
    notes:
      "The absence of a statutory cap is a known competitive " +
      "disadvantage for Germany vs. France / UK and is a primary " +
      "driver behind the proposed Weltraumgesetz cap.",
  },
];

// ============================================================================
// Italian Codice Civile + ASI authorisation regime
// ============================================================================

const IT_CODICE_CIVILE_ENTRIES: ReadonlyArray<InsuranceRequirementEntry> = [
  {
    code: "IT-CC-ART-2050-STRICT",
    regime: "IT-CODICE-CIVILE",
    category: "LIABILITY_ABSOLUTE",
    title:
      "Codice Civile Art. 2050 — Strict liability for dangerous activities",
    description:
      "Article 2050 of the Italian Codice Civile imposes STRICT " +
      "LIABILITY on persons conducting activities deemed dangerous " +
      "by their nature or by the means employed. Italian " +
      "jurisprudence has consistently classified space launch + " +
      "operation as a dangerous activity under Art. 2050, shifting " +
      "the burden of proof to the operator to demonstrate adoption " +
      "of every measure suitable to avoid the damage. No statutory " +
      "cap applies; exposure is shaped by case law + the operator's " +
      "ability to demonstrate due-diligence safeguards.",
    effectiveFrom: "1942-03-21",
    citation: "Codice Civile italiano Art. 2050",
    sourceUrl:
      "https://www.brocardi.it/codice-civile/libro-quarto/titolo-ix/capo-i/art2050.html",
    applicablePhases: [
      "PRE_LAUNCH",
      "LAUNCH",
      "IN_ORBIT",
      "REENTRY",
      "POST_MISSION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["ALL"],
    relatedCodes: ["IT-ASI-AUTH", "OST-ART-VII"],
  },
  {
    code: "IT-ASI-AUTH",
    regime: "IT-CODICE-CIVILE",
    category: "AUTHORIZATION_INSURANCE_LINK",
    title:
      "ASI authorisation regime — Insurance requirement for licensed missions",
    description:
      "The Italian Space Agency (Agenzia Spaziale Italiana, ASI) " +
      "administers an authorisation regime for Italian space " +
      "operators based on inter-ministerial regulation. Authorisation " +
      "is conditioned on demonstrating insurance coverage commensurate " +
      "with the modelled mission risk. Italy is the only major " +
      "European space-faring nation without a comprehensive national " +
      "space law (draft DDL S.658 has been in parliamentary review " +
      "since 2023); authorisations are administered case-by-case.",
    effectiveFrom: "2003-01-01",
    citation: "ASI Statuto + inter-ministerial regulations",
    sourceUrl: "https://www.asi.it/en/governance/",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "IN_ORBIT", "REENTRY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["IT-CC-ART-2050-STRICT", "OST-ART-VI"],
    notes:
      "The pending DDL S.658 (Italian national space law draft) " +
      "would introduce a statutory liability cap + state guarantee " +
      "structure similar to the French LOA; status as of May 2026 " +
      "is parliamentary review.",
  },
  {
    code: "IT-CC-ART-2050-CLAIM",
    regime: "IT-CODICE-CIVILE",
    category: "CLAIM_WINDOW",
    title: "Codice Civile Art. 2947 — 5-year tort claim window",
    description:
      "Article 2947 of the Italian Codice Civile sets the ordinary " +
      "prescription period for tort claims at 5 YEARS from the date " +
      "the damage occurred or could have been known to the claimant. " +
      "Compared with the 1-year Liability Convention claim window " +
      "(state-to-state), Art. 2947 is the longer private-law window " +
      "applicable to civil claims by injured private parties.",
    effectiveFrom: "1942-03-21",
    citation: "Codice Civile italiano Art. 2947",
    sourceUrl:
      "https://www.brocardi.it/codice-civile/libro-sesto/titolo-v/capo-ii/art2947.html",
    applicablePhases: ["IN_ORBIT", "POST_MISSION"],
    threshold: {
      parameter: "claimWindowYears",
      operator: "<=",
      value: 5,
      unit: "years from damage occurrence (civil claims)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["ALL"],
    relatedCodes: ["IT-CC-ART-2050-STRICT", "LIAB-CONV-ART-XII-CLAIM"],
  },
];

// ============================================================================
// EU Space Act COM(2025) 335 — proposed regime (trilogue May 2026)
// ============================================================================

const EU_SPACE_ACT_ENTRIES: ReadonlyArray<InsuranceRequirementEntry> = [
  {
    code: "EU-SA-ART-40-MIN-3P",
    regime: "EU-SPACE-ACT",
    category: "INSURANCE_MINIMUM_AMOUNT",
    title:
      "EU Space Act Art. 40 — €100M proposed minimum third-party insurance",
    description:
      "Article 40 of the proposed EU Space Act (COM(2025) 335) " +
      "harmonises the minimum third-party liability insurance amount " +
      "across the Union at €100 MILLION per launch / re-entry event. " +
      "Member State competent authorities may set higher amounts " +
      "for specific missions based on modelled risk. The €100M floor " +
      "is above the French / draft German €60M cap and above the UK " +
      "£60M minimum; transition arrangements allow Member States to " +
      "phase in the higher floor over 3 years from adoption.",
    effectiveFrom: "2027-07-01",
    citation: "COM(2025) 335 Art. 40",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0335",
    applicablePhases: ["LAUNCH", "REENTRY"],
    threshold: {
      parameter: "insuranceCoverageThirdPartyEUR",
      operator: ">=",
      value: 100_000_000,
      unit: "EUR (proposed harmonised floor)",
    },
    bindingNature: "PROPOSED",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: [
      "EU-SA-ART-41-PROPERTY",
      "EU-SA-ART-42-CROSS-WAIVER",
      "FR-LOA-CAP",
      "UK-SIA-LAUNCH-INS",
    ],
    notes:
      "The €100M figure is widely debated in trilogue — industry " +
      "groups argue for keeping the French / German €60M cap; the " +
      "Commission position favours the higher €100M floor to align " +
      "with international best practice + the Liability Convention.",
  },
  {
    code: "EU-SA-ART-41-PROPERTY",
    regime: "EU-SPACE-ACT",
    category: "INSURANCE_MINIMUM_AMOUNT",
    title: "EU Space Act Art. 41 — €15M proposed minimum property coverage",
    description:
      "Article 41 of COM(2025) 335 proposes a €15 MILLION minimum " +
      "for property (Government / Member State spaceport asset) " +
      "coverage. This is the EU analogue of the US 14 CFR § 440.9(c) " +
      "$100M Government-property requirement, scaled to European " +
      "spaceport infrastructure (smaller scale than the US ranges). " +
      "Member States operating spaceports may require higher amounts.",
    effectiveFrom: "2027-07-01",
    citation: "COM(2025) 335 Art. 41",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0335",
    applicablePhases: ["LAUNCH", "REENTRY"],
    threshold: {
      parameter: "insuranceCoveragePropertyEUR",
      operator: ">=",
      value: 15_000_000,
      unit: "EUR (proposed minimum)",
    },
    bindingNature: "PROPOSED",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["EU-SA-ART-40-MIN-3P", "US-CSLA-GOV-PROPERTY"],
  },
  {
    code: "EU-SA-ART-42-CROSS-WAIVER",
    regime: "EU-SPACE-ACT",
    category: "CROSS_WAIVER",
    title:
      "EU Space Act Art. 42 — Mandatory cross-waiver clause for licensed operations",
    description:
      "Article 42 of COM(2025) 335 mandates RECIPROCAL " +
      "CROSS-WAIVERS OF LIABILITY between licensed operators, " +
      "contractors, sub-contractors, and Member State spaceport " +
      "authorities for damages to their respective property + " +
      "employees arising from licensed activities. The clause " +
      "mirrors 51 U.S.C. § 50914(a)(4) and is intended to harmonise " +
      "the contractual liability architecture across EU launches.",
    effectiveFrom: "2027-07-01",
    citation: "COM(2025) 335 Art. 42",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0335",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "REENTRY"],
    bindingNature: "PROPOSED",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["EU-SA-ART-40-MIN-3P", "US-CSLA-CROSS-WAIVER"],
  },
  {
    code: "EU-SA-ART-43-STATE-GUARANTEE",
    regime: "EU-SPACE-ACT",
    category: "STATE_INDEMNIFICATION",
    title:
      "EU Space Act Art. 43 — Member State guarantee above the harmonised floor",
    description:
      "Article 43 of COM(2025) 335 establishes a framework under " +
      "which Member States MAY provide a state guarantee for " +
      "third-party claims exceeding the operator's insurance " +
      "amount, mirroring the French LOA Art. 14 + US CSLA § 50914(b) " +
      "indemnification structures. The Article does not mandate " +
      "Member State guarantees but provides a legal basis under EU " +
      "state-aid rules for those Member States that choose to " +
      "establish such guarantees (notably FR, ES, DE-draft).",
    effectiveFrom: "2027-07-01",
    citation: "COM(2025) 335 Art. 43",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0335",
    applicablePhases: ["LAUNCH", "REENTRY"],
    bindingNature: "PROPOSED",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: [
      "EU-SA-ART-40-MIN-3P",
      "FR-LOA-INDEMN",
      "US-CSLA-GOV-INDEMNIFICATION",
    ],
  },
  {
    code: "EU-SA-ART-44-XBORDER",
    regime: "EU-SPACE-ACT",
    category: "JOINT_LIABILITY",
    title:
      "EU Space Act Art. 44 — Cross-border liability + Member State coordination",
    description:
      "Article 44 of COM(2025) 335 sets the coordination rules for " +
      "missions involving multiple Member States as launching States " +
      "under the Liability Convention. The mission's authorising " +
      "Member State is the lead launching State, with bilateral " +
      "agreement on internal apportionment of any third-party loss. " +
      "This operationalises the joint + several liability rule of " +
      "Liability Convention Art. V within the EU institutional " +
      "framework.",
    effectiveFrom: "2027-07-01",
    citation: "COM(2025) 335 Art. 44",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0335",
    applicablePhases: ["PRE_LAUNCH", "LAUNCH", "IN_ORBIT", "REENTRY"],
    bindingNature: "PROPOSED",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["EU-SA-ART-40-MIN-3P", "LIAB-CONV-ART-V-JOINT"],
  },
];

// ============================================================================
// CONSOLIDATED EXPORT
// ============================================================================

/** All launch insurance + third-party liability requirements across all regimes. */
export const LAUNCH_INSURANCE_REQUIREMENTS: ReadonlyArray<InsuranceRequirementEntry> =
  [
    ...LIABILITY_CONVENTION_ENTRIES,
    ...OST_ENTRIES,
    ...US_CSLA_ENTRIES,
    ...FR_LOA_ENTRIES,
    ...UK_SIA_ENTRIES,
    ...DE_WELTRAUM_ENTRIES,
    ...IT_CODICE_CIVILE_ENTRIES,
    ...EU_SPACE_ACT_ENTRIES,
  ];

/** Coverage metadata. */
export const LAUNCH_INSURANCE_COVERAGE = {
  totalEntries: LAUNCH_INSURANCE_REQUIREMENTS.length,
  byRegime: {
    LIABILITY_CONVENTION: LAUNCH_INSURANCE_REQUIREMENTS.filter(
      (e) => e.regime === "LIABILITY_CONVENTION",
    ).length,
    OST_VI_VII: LAUNCH_INSURANCE_REQUIREMENTS.filter(
      (e) => e.regime === "OST_VI_VII",
    ).length,
    "US-CSLA": LAUNCH_INSURANCE_REQUIREMENTS.filter(
      (e) => e.regime === "US-CSLA",
    ).length,
    "FR-LOA": LAUNCH_INSURANCE_REQUIREMENTS.filter((e) => e.regime === "FR-LOA")
      .length,
    "UK-SIA": LAUNCH_INSURANCE_REQUIREMENTS.filter((e) => e.regime === "UK-SIA")
      .length,
    "DE-WELTRAUM": LAUNCH_INSURANCE_REQUIREMENTS.filter(
      (e) => e.regime === "DE-WELTRAUM",
    ).length,
    "IT-CODICE-CIVILE": LAUNCH_INSURANCE_REQUIREMENTS.filter(
      (e) => e.regime === "IT-CODICE-CIVILE",
    ).length,
    "EU-SPACE-ACT": LAUNCH_INSURANCE_REQUIREMENTS.filter(
      (e) => e.regime === "EU-SPACE-ACT",
    ).length,
  },
  asOf: LAUNCH_INSURANCE_AS_OF,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Find a single requirement by its code. */
export function findInsuranceEntry(
  code: string,
): InsuranceRequirementEntry | undefined {
  return LAUNCH_INSURANCE_REQUIREMENTS.find((entry) => entry.code === code);
}

/** Find all entries for a given regime. */
export function findInsuranceByRegime(
  regime: InsuranceRegime,
): ReadonlyArray<InsuranceRequirementEntry> {
  return LAUNCH_INSURANCE_REQUIREMENTS.filter(
    (entry) => entry.regime === regime,
  );
}

/** Find all entries for a given category. */
export function findInsuranceByCategory(
  category: InsuranceCategory,
): ReadonlyArray<InsuranceRequirementEntry> {
  return LAUNCH_INSURANCE_REQUIREMENTS.filter(
    (entry) => entry.category === category,
  );
}

/**
 * Find all entries that apply to a given mission phase.
 * Entries whose applicablePhases include the queried phase are returned.
 */
export function findInsuranceByPhase(
  phase: InsurancePhase,
): ReadonlyArray<InsuranceRequirementEntry> {
  return LAUNCH_INSURANCE_REQUIREMENTS.filter((entry) =>
    entry.applicablePhases.includes(phase),
  );
}

/** Find all entries by binding nature. */
export function findInsuranceByBindingNature(
  bindingNature: InsuranceBindingNature,
): ReadonlyArray<InsuranceRequirementEntry> {
  return LAUNCH_INSURANCE_REQUIREMENTS.filter(
    (entry) => entry.bindingNature === bindingNature,
  );
}

/**
 * Find mandatory + treaty-binding insurance requirements applicable
 * to a specific jurisdiction. Liability Convention + OST apply
 * universally to all jurisdictions ratifying them; national regimes
 * layer on top.
 */
export function findMandatoryInsuranceForJurisdiction(
  jurisdiction: string,
): ReadonlyArray<InsuranceRequirementEntry> {
  const jurisdictionRegimes: Record<string, ReadonlyArray<InsuranceRegime>> = {
    US: ["LIABILITY_CONVENTION", "OST_VI_VII", "US-CSLA"],
    GB: ["LIABILITY_CONVENTION", "OST_VI_VII", "UK-SIA"],
    UK: ["LIABILITY_CONVENTION", "OST_VI_VII", "UK-SIA"],
    DE: ["LIABILITY_CONVENTION", "OST_VI_VII", "DE-WELTRAUM", "EU-SPACE-ACT"],
    FR: ["LIABILITY_CONVENTION", "OST_VI_VII", "FR-LOA", "EU-SPACE-ACT"],
    IT: [
      "LIABILITY_CONVENTION",
      "OST_VI_VII",
      "IT-CODICE-CIVILE",
      "EU-SPACE-ACT",
    ],
    ES: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
    NL: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
    BE: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
    SE: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
    PL: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
    AT: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
    FI: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
    DK: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
    CH: ["LIABILITY_CONVENTION", "OST_VI_VII"],
    NO: ["LIABILITY_CONVENTION", "OST_VI_VII"],
    JP: ["LIABILITY_CONVENTION", "OST_VI_VII"],
  };
  const regimes = jurisdictionRegimes[jurisdiction.toUpperCase()] ?? [];
  return LAUNCH_INSURANCE_REQUIREMENTS.filter(
    (entry) =>
      regimes.includes(entry.regime) &&
      (entry.bindingNature === "MANDATORY" || entry.bindingNature === "TREATY"),
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
