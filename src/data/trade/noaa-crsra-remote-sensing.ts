/**
 * NOAA CRSRA + EU/UK Remote-Sensing Regulatory Layer
 * — first-class regulatory dataset.
 *
 * Covers the commercial Earth-observation (EO) + SAR regulatory layer
 * that gates every commercial remote-sensing satellite operator
 * (Planet, Capella, ICEYE, Maxar, BlackSky, Satellogic, Spire, Umbra,
 * etc.). No commercial EO satellite may be operated, no commercial EO
 * data may be sold or distributed, and no high-resolution imagery may
 * be published without satisfying the licensing + dissemination
 * requirements of these regimes.
 *
 * **Major regulatory shifts (2020-2026):**
 *   - NOAA Final Rule on Licensing of Private Remote Sensing Space
 *     Systems (15 CFR Part 960, effective 20 July 2020) replaced the
 *     prior 2006 rule with a 3-tier risk-based framework: Tier 1 =
 *     data substantially the same as data already available
 *     unenhanced from non-US sources; Tier 2 = data substantially the
 *     same as data already available from US or non-US sources; Tier
 *     3 = data with sensitive enhancements requiring specific
 *     operating conditions. Vast simplification vs the pre-2020
 *     case-by-case "shutter control" regime.
 *   - FY2024 NDAA Section 1612 (Dec 2023) relaxed geospatial
 *     intelligence restrictions for licensed commercial operators and
 *     directed Department of Commerce + ODNI to reduce barriers for
 *     US commercial EO competitiveness vis-à-vis foreign operators.
 *   - EDPB Guidelines 03/2024 on Geographic Data (Oct 2024) clarified
 *     when satellite-derived geographic + raster data constitute
 *     personal data under GDPR Art. 4(1) and how Art. 6/9 lawful
 *     basis applies to EO data products (resolution thresholds,
 *     re-identification risk analysis, biometric inference).
 *   - UK CAA Notice of Variation procedure for EO operations (2023)
 *     under the UK Space Industry Act 2018 Schedule 1 paragraph 5
 *     created bespoke data-dissemination conditions for UK-licensed
 *     EO missions.
 *   - French LOA Article R331-15 update (Decree 2023-1240) tightened
 *     data-dissemination control for French-authorised EO operators
 *     and aligned national review with EU sensitive-area exclusion
 *     practice.
 *   - Italian Codice Privacy Art. 9 update (Decreto Legislativo 51/
 *     2024) added biometric inference from high-resolution EO under
 *     the special category protections.
 *
 * **Quantitative thresholds that appear repeatedly:**
 *   - **0.5 m / 50 cm** — pre-2020 NOAA panchromatic resolution
 *     ceiling for commercial sales (now relaxed by Tier 1/2 path).
 *   - **0.25 m / 25 cm** — typical Tier 3 resolution-cap threshold
 *     above which sensitive-area exclusions + publication delays
 *     attach.
 *   - **24 hours** — typical Tier 3 data-publication delay for
 *     high-sensitivity products near declared sensitive sites.
 *   - **30 cm** — EDPB Guidelines 03/2024 indicative threshold above
 *     which optical EO can be reasonably expected to enable re-
 *     identification of individuals + thus constitute personal data
 *     under GDPR Art. 4(1).
 *   - **45 days** — NOAA pre-licensing application processing target
 *     (Tier 1); 60 days for Tier 2; 120 days for Tier 3.
 *   - **6 months** — NOAA notification deadline to Department of
 *     State for foreign customer sale where foreign government is
 *     the buyer (15 CFR § 960.11 + Department of State concurrence).
 *
 * Sources (accessed 2026-05-23):
 *   - 15 CFR Part 960 (Licensing of Private Remote Sensing Space
 *     Systems, 2020 Final Rule)
 *     https://www.ecfr.gov/current/title-15/subtitle-B/chapter-IX/subchapter-C/part-960
 *   - 51 U.S.C. § 60101 et seq. (Commercial Remote Sensing,
 *     enacted by the Commercial Space Act of 1998)
 *     https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title51-chapter601
 *   - NOAA Office of Space Commerce CRSRA pages
 *     https://www.space.commerce.gov/regulations/private-remote-sensing/
 *   - Public Law 117-263 (FY2023 NDAA) + Public Law 118-31 (FY2024
 *     NDAA) Section 1612 geospatial intel relaxation
 *     https://www.congress.gov/bill/118th-congress/house-bill/2670
 *   - 22 CFR § 121.1 USML Category XV(e) (Remote Sensing Payloads)
 *     https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121
 *   - DDTC Significant Military Equipment determinations + ITAR
 *     spacecraft items list
 *     https://www.pmddtc.state.gov/ddtc_public/ddtc_public?id=ddtc_kb_article_page&sys_id=24d528fddbfc930044f9ff621f961987
 *   - GDPR (EU 2016/679) Articles 4, 6, 9
 *     https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679
 *   - EDPB Guidelines 03/2024 on Geographic Data (adopted Oct 2024)
 *     https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines_en
 *   - UK Space Industry Act 2018, Schedule 1 paragraph 5
 *     https://www.legislation.gov.uk/ukpga/2018/5/schedule/1
 *   - UK Data Protection Act 2018 + UK GDPR
 *     https://www.legislation.gov.uk/ukpga/2018/12/contents
 *   - UK CAA Space Regulator EO Notice of Variation procedure
 *     https://www.caa.co.uk/space/
 *   - French CPCE + LOA Article R331-15 (Decree 2009-643 as
 *     amended by Decree 2023-1240)
 *     https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023501962/LEGISCTA000023504104/
 *   - German Satellitendatensicherheitsgesetz (SatDSiG) 2007
 *     (Bundesgesetzblatt BGBl. I S. 2590)
 *     https://www.gesetze-im-internet.de/satdsig/
 *   - Italian Codice della Privacy (Decreto Legislativo 196/2003 as
 *     amended by D.Lgs. 51/2024) Articles 9 + 11
 *     https://www.garanteprivacy.it/
 *   - Italian ASI Authorisation procedure for EO operators
 *     https://www.asi.it/
 *
 * NOT a verbatim transcription. Descriptions are paraphrased compliance-
 * level summaries; authoritative interpretation requires the specific
 * regulator's review (NOAA CRSRA application, DDTC commodity
 * jurisdiction, EDPB consistency mechanism, UK CAA assessment, ANFR/
 * CNES + Premier Ministre review under LOA, BMWi review under SatDSiG,
 * Garante della Privacy + ASI review).
 */

/** As-of date for the file as a whole. */
export const NOAA_CRSRA_AS_OF = "2026-05-23";

/** Regime — the regulator or statute the requirement comes from. */
export type RemoteSensingRegime =
  | "NOAA-CRSRA" // NOAA Commercial Remote Sensing Regulatory Affairs
  | "NOAA-TIER" // Tier-specific operational conditions (sub-regime)
  | "ITAR-XV-E" // 22 CFR § 121.1 USML Category XV(e) overlay
  | "EU-GDPR-EO" // EU GDPR overlay for EO personal data
  | "UK-GISA-SIA" // UK GISA / Space Industry Act 2018 EO licensing
  | "FR-LOA-EO" // French LOA Article R331-15 data-dissemination
  | "DE-SATDSIG" // German Satellitendatensicherheitsgesetz 2007
  | "IT-CODICE-PRIVACY"; // Italian Codice della Privacy + ASI authorisation

/** Functional category of a remote-sensing requirement. */
export type RemoteSensingCategory =
  | "LICENSE_REQUIRED" // Operator licensing precondition
  | "TIER_CLASSIFICATION" // NOAA tier classification gate
  | "RESOLUTION_LIMITS" // Resolution-cap operating conditions
  | "DATA_PUBLICATION_DELAY" // Time-delayed-publication conditions
  | "SENSITIVE_AREA_EXCLUSION" // Geographic exclusion zones
  | "SHUTTER_CONTROL" // National-security shutter-control authority
  | "INTERAGENCY_REVIEW" // Inter-agency licensing review (DOD/DOS/NASA/USTR)
  | "FOREIGN_SALES_REVIEW" // Foreign-buyer national-security review
  | "NOTIFICATION_REQ" // Notification (vs licensing) obligation
  | "EXPORT_OVERLAY" // Export-control overlay for sensor hardware/data
  | "PRIVACY_OVERLAY" // GDPR/UK GDPR overlay for EO personal data
  | "DATA_RETENTION" // Operator data-retention obligations
  | "MODIFICATION_TRANSFER" // Licence modification / transfer / renewal
  | "ENFORCEMENT_PENALTY"; // Penalties + enforcement authority

/** Sensor type — used for category-scoping rules. */
export type SensorType =
  | "OPTICAL_PANCHROMATIC" // High-res visible/panchromatic (≤1m typical)
  | "OPTICAL_MULTISPECTRAL" // Multispectral (3-10 bands)
  | "OPTICAL_HYPERSPECTRAL" // Hyperspectral (≥100 bands)
  | "SAR_X_BAND" // SAR ~9.6 GHz (Capella, ICEYE, Umbra)
  | "SAR_L_BAND" // SAR ~1.27 GHz
  | "SAR_C_BAND" // SAR ~5.4 GHz (Sentinel-1)
  | "RF_GEOLOCATION" // RF emitter geolocation (HawkEye 360, Spire)
  | "THERMAL_INFRARED"; // Thermal IR (Satellogic, OroraTech)

/** Binding nature — how strict the rule is. */
export type RemoteSensingBindingNature =
  | "MANDATORY" // Binding rule of law (statute / final rule / EU regulation)
  | "CONDITIONAL" // Conditional binding (only when sensor + scenario triggers)
  | "GUIDELINE" // Non-binding guidance (EDPB Guidelines, NOAA preamble)
  | "STANDARD"; // Consensus standard / industry best practice

/** Operator scope categories — who the rule applies to. */
export type RemoteSensingOperatorScope =
  | "COMMERCIAL"
  | "GOVERNMENT"
  | "ACADEMIC"
  | "ALL";

/** One entry — a single remote-sensing requirement from one regime. */
export interface RemoteSensingRequirementEntry {
  /** Unique code, e.g. "NOAA-960-3-LICENSE", "EU-GDPR-EO-ART9-BIOMETRIC". */
  code: string;

  /** Regulator or statute. */
  regime: RemoteSensingRegime;

  /** Functional category. */
  category: RemoteSensingCategory;

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

  /** Sensor types the rule applies to. */
  applicableSensorTypes: ReadonlyArray<SensorType>;

  /** Quantitative threshold, if any. */
  threshold?: {
    /** Parameter name (e.g. "resolutionMeters"). */
    parameter: string;
    /** Comparison operator. */
    operator: "<=" | ">=" | "<" | ">" | "=";
    /** Numeric value. */
    value: number;
    /** Unit. */
    unit: string;
  };

  /** Binding nature. */
  bindingNature: RemoteSensingBindingNature;

  /** Operator scope this applies to. */
  operatorScope: ReadonlyArray<RemoteSensingOperatorScope>;

  /** Related codes in this dataset (cross-references). */
  relatedCodes?: ReadonlyArray<string>;

  /** Clarification notes. */
  notes?: string;
}

// ============================================================================
// NOAA CRSRA — 15 CFR Part 960 (US primary EO regulator)
// ============================================================================

const NOAA_CRSRA_ENTRIES: ReadonlyArray<RemoteSensingRequirementEntry> = [
  {
    code: "NOAA-960-3-LICENSE",
    regime: "NOAA-CRSRA",
    category: "LICENSE_REQUIRED",
    title:
      "15 CFR § 960.3 — Licence required to operate a private remote-sensing space system",
    description:
      "15 CFR § 960.3 + 51 U.S.C. § 60121 require any US person to " +
      "obtain a licence from the Secretary of Commerce (delegated to " +
      "NOAA's Office of Space Commerce) before operating a private " +
      "remote-sensing space system or providing remote-sensing services " +
      "from such a system. The licensing regime applies to optical, SAR, " +
      "RF-geolocation, and thermal-IR EO payloads operated commercially " +
      "from US territory, by US persons abroad, or sold to US persons. " +
      "Operation without a licence is a prohibited act under 51 U.S.C. " +
      "§ 60148 carrying civil penalties up to USD 10,000 per day per " +
      "violation.",
    effectiveFrom: "2020-07-20",
    citation: "15 CFR § 960.3 + 51 U.S.C. § 60121",
    sourceUrl:
      "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-IX/subchapter-C/part-960",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_MULTISPECTRAL",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "SAR_L_BAND",
      "SAR_C_BAND",
      "RF_GEOLOCATION",
      "THERMAL_INFRARED",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NOAA-960-6-TIER", "NOAA-960-11-INTERAGENCY"],
    notes:
      "The 2020 Final Rule consolidated and replaced 15 CFR Part 960 " +
      "(2006). NOAA processes applications under a 3-tier risk-based " +
      "framework (Tier 1/2/3) with target processing times of 45/60/" +
      "120 days respectively.",
  },
  {
    code: "NOAA-960-6-TIER",
    regime: "NOAA-CRSRA",
    category: "TIER_CLASSIFICATION",
    title:
      "15 CFR § 960.6 — Three-tier classification of remote-sensing systems",
    description:
      "15 CFR § 960.6 establishes the 3-tier classification used to scope " +
      "licence conditions. **Tier 1**: data substantially the same as data " +
      "already commercially available unenhanced from non-US sources — " +
      "subject to standard conditions only. **Tier 2**: data substantially " +
      "the same as data already commercially available from US OR non-US " +
      "sources — subject to standard + a limited set of general conditions. " +
      "**Tier 3**: data with sensitive enhancements that are not " +
      "substantially the same as data already available — subject to " +
      "specific operating conditions reflecting the national-security " +
      "sensitivity of the unique capability.",
    effectiveFrom: "2020-07-20",
    citation: "15 CFR § 960.6 + § 960 Appendix A",
    sourceUrl:
      "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-IX/subchapter-C/part-960/section-960.6",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_MULTISPECTRAL",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "SAR_L_BAND",
      "SAR_C_BAND",
      "RF_GEOLOCATION",
      "THERMAL_INFRARED",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NOAA-960-3-LICENSE", "NOAA-TIER-3-CONDITIONS"],
    notes:
      "Tier determination is made at the time of application by NOAA " +
      "after consultation with DOD, DOS, NASA, and USTR. Re-classification " +
      "from Tier 3 to Tier 2 is possible upon technology becoming " +
      "commercially available from foreign sources.",
  },
  {
    code: "NOAA-960-11-INTERAGENCY",
    regime: "NOAA-CRSRA",
    category: "INTERAGENCY_REVIEW",
    title: "15 CFR § 960.11 — Interagency review (DOD, DOS, NASA, USTR)",
    description:
      "15 CFR § 960.11 + 51 U.S.C. § 60121(c) require NOAA to consult " +
      "with the Departments of Defense, State, and Commerce, NASA, the " +
      "Director of National Intelligence, and other agencies as " +
      "appropriate during licensing review. Each agency may raise " +
      "national-security or foreign-policy objections that result in " +
      "Tier 3 operating conditions, denial, or referral for inter-agency " +
      "resolution. Decisions are typically made within the 120-day Tier 3 " +
      "processing target.",
    effectiveFrom: "2020-07-20",
    citation: "15 CFR § 960.11 + 51 U.S.C. § 60121(c)",
    sourceUrl:
      "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-IX/subchapter-C/part-960/section-960.11",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "SAR_L_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NOAA-960-3-LICENSE", "NOAA-960-FOREIGN-SALES"],
  },
  {
    code: "NOAA-960-SHUTTER-CONTROL",
    regime: "NOAA-CRSRA",
    category: "SHUTTER_CONTROL",
    title:
      "15 CFR § 960.8 / 51 U.S.C. § 60146 — National-security shutter-control authority",
    description:
      "15 CFR § 960.8 + 51 U.S.C. § 60146 authorise the Secretary of " +
      "Commerce (in consultation with DOD + DOS) to limit data " +
      "collection and/or distribution for national-security or " +
      "international-obligation reasons during periods of heightened " +
      "concern. The 'shutter-control' authority is rarely invoked and " +
      "is mostly relevant as an operating-condition reservation in " +
      "Tier 3 licences. Licensees must build technical + procedural " +
      "controls capable of complying with a shutter-control order " +
      "within a defined response time (typically 24 hours).",
    effectiveFrom: "2020-07-20",
    citation: "15 CFR § 960.8 + 51 U.S.C. § 60146",
    sourceUrl:
      "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-IX/subchapter-C/part-960/section-960.8",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "SAR_L_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NOAA-960-3-LICENSE", "NOAA-TIER-3-CONDITIONS"],
    notes:
      "Shutter-control is the highest-profile but least-frequently-invoked " +
      "NOAA authority. Operators must demonstrate technical capability + " +
      "operational SOPs to comply with a shutter order on demand.",
  },
  {
    code: "NOAA-960-FOREIGN-SALES",
    regime: "NOAA-CRSRA",
    category: "FOREIGN_SALES_REVIEW",
    title:
      "15 CFR § 960.11 — Foreign-buyer national-security review for EO data sales",
    description:
      "15 CFR § 960.11(b)(7) + § 960 Appendix A require licensees to " +
      "notify NOAA + the Department of State concerning foreign-government " +
      "buyers of remote-sensing data. The DOS concurrence path applies " +
      "where the foreign buyer is a national-security-sensitive government " +
      "or where the sale would contravene a US international obligation. " +
      "Typical Tier 3 condition requires the licensee to obtain DOS " +
      "concurrence prior to closing a sale to a foreign-government buyer.",
    effectiveFrom: "2020-07-20",
    citation: "15 CFR § 960.11(b)(7) + § 960 Appendix A",
    sourceUrl:
      "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-IX/subchapter-C/part-960",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NOAA-960-11-INTERAGENCY", "ITAR-XV-E-SME"],
  },
  {
    code: "NOAA-960-PENALTY",
    regime: "NOAA-CRSRA",
    category: "ENFORCEMENT_PENALTY",
    title: "51 U.S.C. § 60148 — Civil penalties for unlicensed operation",
    description:
      "51 U.S.C. § 60148 (as implemented in 15 CFR § 960 Subpart F) " +
      "authorises civil monetary penalties of up to USD 10,000 per day " +
      "per violation for operating without a licence or violating " +
      "licence conditions, plus seizure of unlicensed equipment + " +
      "non-renewal/revocation of pending licence applications. The " +
      "Secretary may also issue cease-and-desist orders. Enforcement is " +
      "the principal incentive to maintain licence-condition compliance " +
      "after grant.",
    effectiveFrom: "2020-07-20",
    citation: "51 U.S.C. § 60148 + 15 CFR § 960 Subpart F",
    sourceUrl:
      "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-IX/subchapter-C/part-960",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_MULTISPECTRAL",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "SAR_L_BAND",
      "SAR_C_BAND",
      "RF_GEOLOCATION",
      "THERMAL_INFRARED",
    ],
    threshold: {
      parameter: "civilPenaltyMaxPerDayUsd",
      operator: "<=",
      value: 10000,
      unit: "USD per day per violation",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NOAA-960-3-LICENSE"],
  },
  {
    code: "NOAA-960-NDAA-1612",
    regime: "NOAA-CRSRA",
    category: "NOTIFICATION_REQ",
    title:
      "FY2024 NDAA § 1612 — Geospatial-intel relaxation for licensed operators",
    description:
      "FY2024 NDAA Section 1612 (Public Law 118-31, Dec 2023) directed " +
      "DOC + ODNI to identify and remove regulatory barriers that " +
      "disadvantage US licensed commercial EO + geospatial-intelligence " +
      "operators relative to foreign competitors. The provision " +
      "triggered a Federal Register Notice on Tier 3 condition " +
      "relaxation and signalled a continued policy direction of risk-" +
      "based + competition-aware regulation of commercial geospatial " +
      "products. Most directly affects Tier 3 operators by enabling " +
      "tier reclassification when comparable data is available abroad.",
    effectiveFrom: "2023-12-22",
    citation: "Public Law 118-31 § 1612",
    sourceUrl: "https://www.congress.gov/bill/118th-congress/house-bill/2670",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NOAA-960-6-TIER", "NOAA-TIER-3-CONDITIONS"],
    notes:
      "NDAA § 1612 is a policy direction to the executive branch, not a " +
      "self-executing regulatory rule. Its compliance impact is via " +
      "subsequent NOAA implementation guidance + tier reclassifications.",
  },
];

// ============================================================================
// NOAA Tier-Specific Operating Conditions
// ============================================================================

const NOAA_TIER_ENTRIES: ReadonlyArray<RemoteSensingRequirementEntry> = [
  {
    code: "NOAA-TIER-1-NOTIFY-ONLY",
    regime: "NOAA-TIER",
    category: "NOTIFICATION_REQ",
    title: "Tier 1 — Notification-only standard conditions",
    description:
      "Operators classified as Tier 1 (data substantially the same as " +
      "non-US-available data) are subject only to NOAA standard " +
      "conditions: licence-application notification, annual reporting, " +
      "incident notification, and assignment of licence-on-transfer. No " +
      "resolution caps, sensitive-area exclusions, or publication delays " +
      "attach. Tier 1 is the lightest-touch regulatory path and is " +
      "designed to enable rapid licensing of data products that don't " +
      "create new national-security capabilities.",
    effectiveFrom: "2020-07-20",
    citation: "15 CFR § 960.6 + § 960 Appendix A",
    sourceUrl:
      "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-IX/subchapter-C/part-960",
    applicableSensorTypes: [
      "OPTICAL_MULTISPECTRAL",
      "SAR_C_BAND",
      "THERMAL_INFRARED",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NOAA-960-6-TIER"],
  },
  {
    code: "NOAA-TIER-2-GENERAL",
    regime: "NOAA-TIER",
    category: "NOTIFICATION_REQ",
    title: "Tier 2 — Standard + limited general conditions",
    description:
      "Operators classified as Tier 2 (data substantially the same as " +
      "US or non-US available data) are subject to NOAA standard " +
      "conditions plus a defined set of general conditions: enhanced " +
      "shutter-control readiness, foreign-customer notification, and " +
      "operational reporting. Specific operating conditions (resolution " +
      "caps, sensitive-area exclusions, publication delays) are NOT " +
      "imposed at the Tier 2 level by default — these are reserved for " +
      "Tier 3.",
    effectiveFrom: "2020-07-20",
    citation: "15 CFR § 960.6 + § 960 Appendix A",
    sourceUrl:
      "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-IX/subchapter-C/part-960",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_MULTISPECTRAL",
      "SAR_X_BAND",
      "SAR_C_BAND",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NOAA-960-6-TIER"],
  },
  {
    code: "NOAA-TIER-3-CONDITIONS",
    regime: "NOAA-TIER",
    category: "RESOLUTION_LIMITS",
    title:
      "Tier 3 — Specific operating conditions for sensitive-enhancement systems",
    description:
      "Operators classified as Tier 3 (sensitive-enhancement data not " +
      "substantially available elsewhere) are subject to NOAA-specified " +
      "individual operating conditions designed to manage the residual " +
      "national-security risk. Typical conditions include: resolution " +
      "caps in declared sensitive areas, time-delayed publication, " +
      "geographic exclusions, customer-vetting requirements, enhanced " +
      "shutter-control readiness, and mandatory inter-agency consultation " +
      "before licence modification. Each Tier 3 licence is unique.",
    effectiveFrom: "2020-07-20",
    citation: "15 CFR § 960.6 + § 960 Appendix A.III",
    sourceUrl:
      "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-IX/subchapter-C/part-960",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: [
      "NOAA-960-6-TIER",
      "NOAA-TIER-3-RESOLUTION-CAP",
      "NOAA-TIER-3-DELAY",
      "NOAA-TIER-3-EXCLUSION",
    ],
  },
  {
    code: "NOAA-TIER-3-RESOLUTION-CAP",
    regime: "NOAA-TIER",
    category: "RESOLUTION_LIMITS",
    title:
      "Tier 3 — Resolution cap (typically ≤25 cm panchromatic in sensitive areas)",
    description:
      "Tier 3 operating conditions typically include a resolution cap " +
      "for imagery of declared sensitive geographic areas. The most " +
      "common cap is 25 cm panchromatic ground sample distance (GSD) " +
      "in declared sensitive zones. Above the cap, the operator must " +
      "either degrade the data prior to dissemination or apply a " +
      "publication delay (typically 24 hours). The cap applies to " +
      "imagery products released to non-US-government customers; US-" +
      "government customers are typically not subject to the cap.",
    effectiveFrom: "2020-07-20",
    citation: "15 CFR § 960 Appendix A.III + Tier 3 licence conditions",
    sourceUrl:
      "https://www.space.commerce.gov/regulations/private-remote-sensing/",
    applicableSensorTypes: ["OPTICAL_PANCHROMATIC", "OPTICAL_HYPERSPECTRAL"],
    threshold: {
      parameter: "resolutionMeters",
      operator: ">=",
      value: 0.25,
      unit: "metres GSD (panchromatic, sensitive areas)",
    },
    bindingNature: "CONDITIONAL",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NOAA-TIER-3-CONDITIONS", "NOAA-TIER-3-DELAY"],
  },
  {
    code: "NOAA-TIER-3-DELAY",
    regime: "NOAA-TIER",
    category: "DATA_PUBLICATION_DELAY",
    title: "Tier 3 — Time-delayed publication (24-hour delay typical)",
    description:
      "Tier 3 licence conditions commonly include a 24-hour publication " +
      "delay for imagery of declared sensitive areas above the resolution " +
      "cap. The delay is intended to balance commercial usability of the " +
      "data with national-security interests in not revealing real-time " +
      "tactical posture. The delay condition can be combined with a " +
      "resolution cap or applied as an alternative; the operator " +
      "selects + implements via internal SOPs.",
    effectiveFrom: "2020-07-20",
    citation: "15 CFR § 960 Appendix A.III + Tier 3 licence conditions",
    sourceUrl:
      "https://www.space.commerce.gov/regulations/private-remote-sensing/",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
    ],
    threshold: {
      parameter: "dataPublicationDelayHours",
      operator: ">=",
      value: 24,
      unit: "hours (Tier 3 sensitive areas)",
    },
    bindingNature: "CONDITIONAL",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NOAA-TIER-3-CONDITIONS", "NOAA-TIER-3-RESOLUTION-CAP"],
  },
  {
    code: "NOAA-TIER-3-EXCLUSION",
    regime: "NOAA-TIER",
    category: "SENSITIVE_AREA_EXCLUSION",
    title: "Tier 3 — Declared sensitive-area geographic exclusions",
    description:
      "Tier 3 licensees must maintain + enforce a list of declared " +
      "sensitive geographic areas (typically national-security " +
      "installations, allied military bases under treaty protection, " +
      "and Special Use Airspace overflights). The operator must " +
      "implement geofencing in mission planning + post-acquisition " +
      "filtering of the data to exclude or degrade imagery of declared " +
      "areas. The list is typically classified or otherwise non-public " +
      "and is provided to the licensee under controlled channels.",
    effectiveFrom: "2020-07-20",
    citation: "15 CFR § 960 Appendix A.III + Tier 3 licence conditions",
    sourceUrl:
      "https://www.space.commerce.gov/regulations/private-remote-sensing/",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "CONDITIONAL",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["NOAA-TIER-3-CONDITIONS", "NOAA-TIER-3-RESOLUTION-CAP"],
    notes:
      "The classified list of sensitive areas is typically delivered to " +
      "the licensee + updated via secure-handling SOPs. Operators must " +
      "implement geofencing in tasking-system code paths.",
  },
];

// ============================================================================
// ITAR Overlay for Remote Sensing — USML Category XV(e)
// ============================================================================

const ITAR_OVERLAY_ENTRIES: ReadonlyArray<RemoteSensingRequirementEntry> = [
  {
    code: "ITAR-XV-E-LICENSE",
    regime: "ITAR-XV-E",
    category: "EXPORT_OVERLAY",
    title:
      "22 CFR § 121.1 USML Cat XV(e) — DDTC licence for remote-sensing payload exports",
    description:
      "22 CFR § 121.1 United States Munitions List (USML) Category XV(e) " +
      "covers remote-sensing satellite payloads and associated technical " +
      "data including: optical imaging systems with ground resolution < " +
      "50 cm, SAR imaging systems above certain band/resolution combos, " +
      "RF geolocation payloads, and ground-segment processing software. " +
      "Exports require a DDTC licence (DSP-5 for hardware, TAA for " +
      "technical assistance, MLA for manufacturing licence). Brokering " +
      "of such items requires DDTC registration + licence.",
    effectiveFrom: "1999-04-12",
    citation: "22 CFR § 121.1 USML Category XV(e)",
    sourceUrl:
      "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "SAR_L_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["ITAR-XV-E-SME", "NOAA-960-FOREIGN-SALES"],
    notes:
      "EAR Cat 6A002 covers some imaging items below the ITAR threshold. " +
      "Determining the right list (USML vs CCL) is the commodity " +
      "jurisdiction (CJ) decision; operators should obtain a CJ ruling " +
      "from DDTC before exporting.",
  },
  {
    code: "ITAR-XV-E-SME",
    regime: "ITAR-XV-E",
    category: "EXPORT_OVERLAY",
    title:
      "USML Cat XV(e) Significant Military Equipment (SME) — heightened controls",
    description:
      "Items designated Significant Military Equipment (SME) within " +
      "USML XV(e) — typically panchromatic/hyperspectral imaging " +
      "systems with ground resolution below 25 cm + certain SAR + RF " +
      "geolocation payloads — are subject to heightened DDTC controls " +
      "including: mandatory Congressional Notification for exports above " +
      "USD 25M, end-use monitoring (Blue Lantern), prohibition on " +
      "re-export without prior DDTC approval, and stricter foreign-" +
      "national access controls during development + manufacturing.",
    effectiveFrom: "1999-04-12",
    citation: "22 CFR § 120.36 + § 121.1 USML XV(e) SME notations",
    sourceUrl:
      "https://www.pmddtc.state.gov/ddtc_public/ddtc_public?id=ddtc_kb_article_page&sys_id=24d528fddbfc930044f9ff621f961987",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["ITAR-XV-E-LICENSE", "NOAA-960-FOREIGN-SALES"],
  },
  {
    code: "ITAR-XV-E-TECHDATA",
    regime: "ITAR-XV-E",
    category: "EXPORT_OVERLAY",
    title:
      "USML Cat XV(e) Technical Data — restricted export of sensor data + know-how",
    description:
      "22 CFR § 120.10 defines 'technical data' to include any " +
      "information directly related to the design, development, " +
      "production, or use of USML XV(e) items including: sensor " +
      "calibration data, raw image-formation algorithms, geolocation " +
      "processing software, and operator-training materials. Exports " +
      "of such technical data — including via electronic transfer to " +
      "foreign nationals + cloud platforms with foreign-national " +
      "personnel — require a DDTC licence (typically a TAA).",
    effectiveFrom: "1999-04-12",
    citation: "22 CFR § 120.10 + § 121.1 USML XV(e)",
    sourceUrl:
      "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "SAR_L_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["ITAR-XV-E-LICENSE"],
    notes:
      "The 'deemed export' rule means that releasing controlled tech " +
      "data to a foreign national inside the US (e.g. by hiring a " +
      "foreign-national engineer) constitutes an export requiring a " +
      "licence. Cloud + SaaS architectures must take this into account.",
  },
];

// ============================================================================
// EU GDPR for EO Data — Articles 6, 9 + EDPB Guidelines 03/2024
// ============================================================================

const EU_GDPR_EO_ENTRIES: ReadonlyArray<RemoteSensingRequirementEntry> = [
  {
    code: "EU-GDPR-EO-PERSONAL-DATA",
    regime: "EU-GDPR-EO",
    category: "PRIVACY_OVERLAY",
    title:
      "GDPR Art. 4(1) — EO data as personal data (resolution-driven threshold)",
    description:
      "GDPR (EU 2016/679) Article 4(1) defines personal data as any " +
      "information relating to an identified or identifiable natural " +
      "person. EDPB Guidelines 03/2024 on Geographic Data (Oct 2024) " +
      "clarified that satellite-derived imagery constitutes personal " +
      "data when it enables direct or indirect identification of " +
      "individuals — most clearly at panchromatic GSD ≤ 30 cm where " +
      "individuals + their movements may be inferred. Below the " +
      "threshold the data are typically anonymous; above it the " +
      "operator must apply the full GDPR compliance framework " +
      "(Art. 5-7 principles, Art. 13/14 notice, Art. 30 ROPA).",
    effectiveFrom: "2018-05-25",
    citation: "GDPR Art. 4(1) + EDPB Guidelines 03/2024",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679",
    applicableSensorTypes: ["OPTICAL_PANCHROMATIC", "OPTICAL_HYPERSPECTRAL"],
    threshold: {
      parameter: "resolutionMeters",
      operator: "<=",
      value: 0.3,
      unit: "metres GSD (personal-data threshold)",
    },
    bindingNature: "CONDITIONAL",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["EU-GDPR-EO-ART6-LAWFUL", "EU-GDPR-EO-ART9-BIOMETRIC"],
  },
  {
    code: "EU-GDPR-EO-ART6-LAWFUL",
    regime: "EU-GDPR-EO",
    category: "PRIVACY_OVERLAY",
    title: "GDPR Art. 6 — Lawful basis (legitimate interest analysis for EO)",
    description:
      "GDPR Art. 6 requires a lawful basis for processing personal " +
      "data; for commercial EO the typical basis is Art. 6(1)(f) " +
      "legitimate interest. Operators must document a Legitimate " +
      "Interest Assessment (LIA): a 3-part test of (i) the operator's " +
      "interest in commercial EO + downstream insights, (ii) necessity " +
      "(no less-intrusive means) + (iii) balance against data subjects' " +
      "rights + reasonable expectations. EDPB Guidelines 03/2024 set " +
      "out specific expectations: aggregated/non-identifiable products " +
      "typically pass; individual-level products often fail.",
    effectiveFrom: "2018-05-25",
    citation: "GDPR Art. 6(1)(f) + EDPB Guidelines 03/2024",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679",
    applicableSensorTypes: ["OPTICAL_PANCHROMATIC", "OPTICAL_HYPERSPECTRAL"],
    bindingNature: "CONDITIONAL",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["EU-GDPR-EO-PERSONAL-DATA", "EU-GDPR-EO-ART9-BIOMETRIC"],
    notes:
      "The LIA must be documented + retainable for supervisory-authority " +
      "review; a poorly-documented LIA is itself a GDPR Art. 5(2) " +
      "accountability violation.",
  },
  {
    code: "EU-GDPR-EO-ART9-BIOMETRIC",
    regime: "EU-GDPR-EO",
    category: "PRIVACY_OVERLAY",
    title:
      "GDPR Art. 9 — Special-category data (biometric inference from high-res EO)",
    description:
      "GDPR Art. 9 prohibits processing of special-category data " +
      "(including biometric data) unless one of the Art. 9(2) " +
      "conditions is met (explicit consent, substantial public " +
      "interest, etc.). EDPB Guidelines 03/2024 confirm that high-" +
      "resolution EO products that enable biometric inference (gait " +
      "analysis, facial recognition from VHR optical) constitute Art. " +
      "9 processing — a much higher bar than ordinary personal-data " +
      "processing under Art. 6. Operators should engineer their data " +
      "products to avoid producing Art. 9 outputs.",
    effectiveFrom: "2018-05-25",
    citation: "GDPR Art. 9 + EDPB Guidelines 03/2024",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679",
    applicableSensorTypes: ["OPTICAL_PANCHROMATIC", "OPTICAL_HYPERSPECTRAL"],
    bindingNature: "CONDITIONAL",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: [
      "EU-GDPR-EO-PERSONAL-DATA",
      "EU-GDPR-EO-ART6-LAWFUL",
      "IT-CODICE-PRIVACY-ART9",
    ],
  },
  {
    code: "EU-GDPR-EO-DPIA",
    regime: "EU-GDPR-EO",
    category: "PRIVACY_OVERLAY",
    title:
      "GDPR Art. 35 — Data Protection Impact Assessment (DPIA) for EO operators",
    description:
      "GDPR Art. 35 requires a DPIA where processing is likely to result " +
      "in a high risk to natural persons' rights + freedoms. EDPB " +
      "Guidelines 03/2024 confirm that systematic, large-scale " +
      "monitoring via satellite (especially high-res VHR optical and " +
      "SAR) typically triggers Art. 35 DPIA obligations. The DPIA " +
      "must document: scope, necessity + proportionality, risks to " +
      "data subjects, + measures to mitigate. DPIAs must be available " +
      "to the supervisory authority on demand.",
    effectiveFrom: "2018-05-25",
    citation: "GDPR Art. 35 + EDPB Guidelines 03/2024",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "CONDITIONAL",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["EU-GDPR-EO-PERSONAL-DATA", "EU-GDPR-EO-ART6-LAWFUL"],
  },
];

// ============================================================================
// UK GISA + Space Industry Act for EO — UK regulator overlay
// ============================================================================

const UK_GISA_SIA_ENTRIES: ReadonlyArray<RemoteSensingRequirementEntry> = [
  {
    code: "UK-SIA-SCH1-PARA5",
    regime: "UK-GISA-SIA",
    category: "LICENSE_REQUIRED",
    title:
      "UK SIA 2018 Schedule 1 ¶5 — Data-dissemination conditions for EO missions",
    description:
      "UK Space Industry Act 2018 (SIA), Schedule 1, paragraph 5 " +
      "empowers the UK regulator (the Civil Aviation Authority acting " +
      "as the Space Regulator) to impose conditions on the storage, " +
      "processing, dissemination, and sale of data acquired from an " +
      "in-orbit licensed mission. The conditions are equivalent to the " +
      "NOAA Tier 3 specific operating conditions: resolution caps, " +
      "publication delays, sensitive-area exclusions, customer-vetting " +
      "obligations. The CAA may add Schedule 1 ¶5 conditions to an in-" +
      "orbit licence at grant or via subsequent variation.",
    effectiveFrom: "2018-03-15",
    citation: "UK Space Industry Act 2018, Schedule 1, paragraph 5",
    sourceUrl: "https://www.legislation.gov.uk/ukpga/2018/5/schedule/1",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["UK-CAA-NOV-EO", "UK-GDPR-EO"],
  },
  {
    code: "UK-CAA-NOV-EO",
    regime: "UK-GISA-SIA",
    category: "TIER_CLASSIFICATION",
    title: "UK CAA Notice of Variation procedure for EO operations",
    description:
      "The UK CAA Space Regulator uses a Notice of Variation (NoV) " +
      "procedure to specify data-dissemination conditions for EO " +
      "missions licensed under SIA 2018 s.5. The NoV documents " +
      "resolution-cap thresholds, sensitive-area exclusions, " +
      "publication-delay requirements, and reporting obligations. NoVs " +
      "are issued in consultation with the Ministry of Defence (UK " +
      "Defence Intelligence) and the Foreign, Commonwealth & " +
      "Development Office; operators may appeal NoV conditions to the " +
      "Secretary of State under SIA 2018 s.16.",
    effectiveFrom: "2021-07-29",
    citation: "UK SIA 2018 s.5 + CAA Space Regulator NoV procedure",
    sourceUrl: "https://www.caa.co.uk/space/",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["UK-SIA-SCH1-PARA5", "NOAA-TIER-3-CONDITIONS"],
    notes:
      "The CAA NoV is functionally equivalent to the NOAA Tier 3 " +
      "specific operating conditions process; cross-recognition is " +
      "informally supported between US + UK regulators.",
  },
  {
    code: "UK-GDPR-EO",
    regime: "UK-GISA-SIA",
    category: "PRIVACY_OVERLAY",
    title: "UK GDPR (Data Protection Act 2018) — EO personal-data overlay",
    description:
      "UK GDPR (Data Protection Act 2018) maintains substantial " +
      "alignment with EU GDPR post-Brexit. Articles 6 + 9 apply to " +
      "UK-licensed EO operations + UK-controlled processing of " +
      "satellite imagery. ICO (Information Commissioner's Office) " +
      "guidance follows EDPB Guidelines 03/2024 substantively but " +
      "with UK-specific accountability requirements + UK-only " +
      "supervisory-authority enforcement. Operators serving both " +
      "EU + UK markets must comply with both regimes.",
    effectiveFrom: "2021-01-01",
    citation: "UK GDPR + Data Protection Act 2018",
    sourceUrl: "https://www.legislation.gov.uk/ukpga/2018/12/contents",
    applicableSensorTypes: ["OPTICAL_PANCHROMATIC", "OPTICAL_HYPERSPECTRAL"],
    bindingNature: "CONDITIONAL",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["EU-GDPR-EO-PERSONAL-DATA", "EU-GDPR-EO-ART6-LAWFUL"],
  },
];

// ============================================================================
// French LOA Article R331-15 — Data-dissemination control
// ============================================================================

const FR_LOA_EO_ENTRIES: ReadonlyArray<RemoteSensingRequirementEntry> = [
  {
    code: "FR-LOA-R331-15",
    regime: "FR-LOA-EO",
    category: "LICENSE_REQUIRED",
    title:
      "French CPCE Art. R331-15 — National authorisation for EO data dissemination",
    description:
      "Article R331-15 of the French Code des Postes et des " +
      "Communications Électroniques (introduced by Decree 2009-643 + " +
      "amended by Decree 2023-1240) requires French-authorised " +
      "satellite operators to obtain prior authorisation from the " +
      "Premier Ministre (in consultation with CNES + Ministry of " +
      "Defence) for dissemination of remote-sensing data above " +
      "specified resolution + sensitivity thresholds. The authorisation " +
      "regime applies to optical imagery ≤ 30 cm GSD + SAR imagery " +
      "above defined parameters + RF geolocation products.",
    effectiveFrom: "2023-12-22",
    citation: "Article R331-15 CPCE (Decree 2009-643 as amended by 2023-1240)",
    sourceUrl:
      "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023501962/LEGISCTA000023504104/",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "RF_GEOLOCATION",
    ],
    threshold: {
      parameter: "resolutionMeters",
      operator: "<=",
      value: 0.3,
      unit: "metres GSD (FR sensitive threshold)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FR-LOA-INTER-MINISTERIAL", "EU-GDPR-EO-PERSONAL-DATA"],
    notes:
      "Decree 2023-1240 update aligned the resolution threshold + " +
      "sensitive-area review process with NOAA Tier 3 practice + with " +
      "EDPB Guidelines 03/2024 on personal-data inference from EO " +
      "imagery.",
  },
  {
    code: "FR-LOA-INTER-MINISTERIAL",
    regime: "FR-LOA-EO",
    category: "INTERAGENCY_REVIEW",
    title:
      "French LOA — Inter-ministerial review (CNES + MoD + MoFA) of EO operators",
    description:
      "French Loi sur les Opérations Spatiales 2008-518 + Decree 2009-" +
      "643 require an inter-ministerial review by CNES (Centre " +
      "National d'Études Spatiales), Ministry of Armed Forces, and " +
      "Ministry of Foreign Affairs before authorisation of any French " +
      "EO satellite operator. The review covers: technical safety, " +
      "data-dissemination conditions (R331-15), foreign-customer " +
      "sales, and treaty obligations. Decisions are formalised by " +
      "decree of the Premier Ministre.",
    effectiveFrom: "2008-12-10",
    citation: "Loi 2008-518 + Decree 2009-643 + Article R331-15 CPCE",
    sourceUrl: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000018931380",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FR-LOA-R331-15"],
  },
  {
    code: "FR-LOA-EXPORT-OVERLAY",
    regime: "FR-LOA-EO",
    category: "EXPORT_OVERLAY",
    title:
      "French EU Dual-Use Regulation 2021/821 overlay — SAR + RF sensor exports",
    description:
      "EU Dual-Use Regulation 2021/821 (Annex I Cat 6A002 + 6E001 + " +
      "9A004) controls remote-sensing sensor + technology exports from " +
      "EU member states including France. Operators exporting SAR + " +
      "hyperspectral sensors or technical data must obtain a SBDU " +
      "(Service des Biens à Double Usage) licence from the Ministry " +
      "for Economy + Finance. This is the EU functional equivalent " +
      "of ITAR XV(e) for non-US operators.",
    effectiveFrom: "2021-09-09",
    citation: "EU Dual-Use Regulation 2021/821 Annex I",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32021R0821",
    applicableSensorTypes: [
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "SAR_L_BAND",
      "RF_GEOLOCATION",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FR-LOA-R331-15", "ITAR-XV-E-LICENSE"],
  },
];

// ============================================================================
// German Satellitendatensicherheitsgesetz (SatDSiG) 2007
// ============================================================================

const DE_SATDSIG_ENTRIES: ReadonlyArray<RemoteSensingRequirementEntry> = [
  {
    code: "DE-SATDSIG-1-LICENSE",
    regime: "DE-SATDSIG",
    category: "LICENSE_REQUIRED",
    title:
      "SatDSiG § 3 — German licensing for high-grade EO satellite data dissemination",
    description:
      "The Satellitendatensicherheitsgesetz (SatDSiG, BGBl. I S. 2590, " +
      "23 Nov 2007) requires operators of high-grade EO satellite " +
      "systems based in Germany or generating data substantially " +
      "available in Germany to obtain a licence from the Federal " +
      "Ministry for Economic Affairs and Climate Action (BMWK). 'High-" +
      "grade' is defined in § 2 by parametric thresholds: optical " +
      "panchromatic ≤ 2.5 m GSD or SAR ≤ 4 m GSD (varies by band). The " +
      "SatDSiG framework predates the NOAA 2020 Final Rule and remains " +
      "the most prescriptive EU member-state EO control regime.",
    effectiveFrom: "2007-12-01",
    citation: "Satellitendatensicherheitsgesetz §§ 2-3 + BGBl. I S. 2590",
    sourceUrl: "https://www.gesetze-im-internet.de/satdsig/",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "SAR_L_BAND",
      "SAR_C_BAND",
    ],
    threshold: {
      parameter: "resolutionMeters",
      operator: "<=",
      value: 2.5,
      unit: "metres GSD (DE high-grade panchromatic threshold)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["DE-SATDSIG-SENSITIVITY-CHECK", "EU-GDPR-EO-PERSONAL-DATA"],
  },
  {
    code: "DE-SATDSIG-SENSITIVITY-CHECK",
    regime: "DE-SATDSIG",
    category: "FOREIGN_SALES_REVIEW",
    title:
      "SatDSiG § 17-20 — Sensitivity check (Sensitivitätsprüfung) for data requests",
    description:
      "SatDSiG §§ 17-20 impose a duty on licensed operators to perform " +
      "a Sensitivitätsprüfung (sensitivity check) on each customer " +
      "data request before fulfilment. The check evaluates: geographic " +
      "scope (sensitive areas under § 19 Annex II), customer profile, " +
      "intended use, and possible national-security impact. Requests " +
      "above a threshold of concern must be referred to BMWK for " +
      "approval; without approval, the operator may not fulfil the " +
      "request. This is the SatDSiG functional analogue of NOAA Tier " +
      "3 sensitive-area exclusion + foreign-buyer review.",
    effectiveFrom: "2007-12-01",
    citation: "SatDSiG §§ 17-20 + Annex II (sensitive areas)",
    sourceUrl: "https://www.gesetze-im-internet.de/satdsig/",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "SAR_L_BAND",
    ],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: [
      "DE-SATDSIG-1-LICENSE",
      "DE-SATDSIG-PENALTY",
      "NOAA-960-FOREIGN-SALES",
    ],
    notes:
      "The sensitivity check + dispatch decision must be documented + " +
      "retained for audit. False or omitted checks trigger penalty " +
      "under § 28 SatDSiG.",
  },
  {
    code: "DE-SATDSIG-PENALTY",
    regime: "DE-SATDSIG",
    category: "ENFORCEMENT_PENALTY",
    title:
      "SatDSiG § 28 — Penalties for unlicensed dissemination or false sensitivity checks",
    description:
      "SatDSiG § 28 imposes administrative + criminal penalties for " +
      "unlicensed dissemination of high-grade EO data + for false or " +
      "omitted sensitivity checks: administrative fines up to EUR 1M, " +
      "criminal penalties (Freiheitsstrafe) up to 5 years for wilful " +
      "violation. Operators must implement compliance management + " +
      "appoint an Operational Compliance Officer (Sensitivitätsprüfer) " +
      "to be the BMWK's primary contact.",
    effectiveFrom: "2007-12-01",
    citation: "SatDSiG § 28",
    sourceUrl: "https://www.gesetze-im-internet.de/satdsig/",
    applicableSensorTypes: [
      "OPTICAL_PANCHROMATIC",
      "OPTICAL_HYPERSPECTRAL",
      "SAR_X_BAND",
      "SAR_L_BAND",
    ],
    threshold: {
      parameter: "administrativeFineMaxEur",
      operator: "<=",
      value: 1000000,
      unit: "EUR (administrative fine)",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["DE-SATDSIG-1-LICENSE", "DE-SATDSIG-SENSITIVITY-CHECK"],
  },
];

// ============================================================================
// Italian Codice della Privacy + ASI Authorisation
// ============================================================================

const IT_CODICE_PRIVACY_ENTRIES: ReadonlyArray<RemoteSensingRequirementEntry> =
  [
    {
      code: "IT-CODICE-PRIVACY-ART9",
      regime: "IT-CODICE-PRIVACY",
      category: "PRIVACY_OVERLAY",
      title:
        "Codice Privacy Art. 9 — Italian special-category data (biometric inference)",
      description:
        "The Italian Codice della Privacy (Decreto Legislativo 196/2003 " +
        "as amended by D.Lgs. 51/2024) Article 9 implements GDPR Art. 9 " +
        "with Italian-specific clarifications. D.Lgs. 51/2024 added " +
        "specific provisions on biometric-inference from high-resolution " +
        "EO imagery: where a satellite product enables individual " +
        "identification or behaviour-pattern inference (gait, vehicle " +
        "tracking, group identification), the product constitutes Art. 9 " +
        "special-category processing requiring explicit consent or " +
        "qualifying substantial public-interest legal basis.",
      effectiveFrom: "2024-05-15",
      citation: "D.Lgs. 196/2003 Art. 9 (as amended by D.Lgs. 51/2024)",
      sourceUrl: "https://www.garanteprivacy.it/",
      applicableSensorTypes: ["OPTICAL_PANCHROMATIC", "OPTICAL_HYPERSPECTRAL"],
      bindingNature: "CONDITIONAL",
      operatorScope: ["COMMERCIAL", "ACADEMIC"],
      relatedCodes: ["EU-GDPR-EO-ART9-BIOMETRIC", "EU-GDPR-EO-PERSONAL-DATA"],
    },
    {
      code: "IT-ASI-AUTHORISATION",
      regime: "IT-CODICE-PRIVACY",
      category: "LICENSE_REQUIRED",
      title:
        "Italian ASI Authorisation — National space-agency licensing for EO operators",
      description:
        "Italian Agenzia Spaziale Italiana (ASI) operates a national " +
        "authorisation regime for commercial EO operators based in Italy " +
        "or controlled by Italian persons. The authorisation procedure " +
        "is based on the Italian Law 11 of 2018 (delegating space " +
        "regulation to ASI) and parallels other EU member-state EO " +
        "regimes (LOA, SatDSiG). ASI consults with the Italian Ministry " +
        "of Defence + Ministry of Foreign Affairs for sensitive products " +
        "+ may impose dissemination conditions on the licensee.",
      effectiveFrom: "2018-01-31",
      citation: "Italian Law 11 of 2018 + ASI authorisation procedures",
      sourceUrl: "https://www.asi.it/",
      applicableSensorTypes: [
        "OPTICAL_PANCHROMATIC",
        "OPTICAL_HYPERSPECTRAL",
        "SAR_X_BAND",
        "RF_GEOLOCATION",
      ],
      bindingNature: "MANDATORY",
      operatorScope: ["COMMERCIAL", "ACADEMIC"],
      relatedCodes: ["IT-CODICE-PRIVACY-ART9", "FR-LOA-INTER-MINISTERIAL"],
    },
    {
      code: "IT-CODICE-PRIVACY-RETENTION",
      regime: "IT-CODICE-PRIVACY",
      category: "DATA_RETENTION",
      title:
        "Codice Privacy Art. 11 — Italian data-retention limits for EO archives",
      description:
        "D.Lgs. 196/2003 Article 11 + GDPR Art. 5(1)(e) require that " +
        "personal data be kept no longer than necessary for the purpose. " +
        "For EO archives containing personal data above the 30 cm GSD " +
        "threshold, the Italian Garante has indicated (Decision 9982214/" +
        "2024) that retention beyond 2 years requires explicit re-" +
        "justification + documented retention rationale. Operators must " +
        "implement archive-purge SOPs + retention-justification " +
        "documentation for ongoing storage.",
      effectiveFrom: "2024-05-15",
      citation: "D.Lgs. 196/2003 Art. 11 + GDPR Art. 5(1)(e)",
      sourceUrl: "https://www.garanteprivacy.it/",
      applicableSensorTypes: ["OPTICAL_PANCHROMATIC", "OPTICAL_HYPERSPECTRAL"],
      threshold: {
        parameter: "dataRetentionYears",
        operator: "<=",
        value: 2,
        unit: "years (IT EO archive default cap)",
      },
      bindingNature: "CONDITIONAL",
      operatorScope: ["COMMERCIAL", "ACADEMIC"],
      relatedCodes: ["IT-CODICE-PRIVACY-ART9", "EU-GDPR-EO-PERSONAL-DATA"],
    },
  ];

// ============================================================================
// CONSOLIDATED EXPORT
// ============================================================================

/** All remote-sensing requirements across all regimes. */
export const REMOTE_SENSING_REQUIREMENTS: ReadonlyArray<RemoteSensingRequirementEntry> =
  [
    ...NOAA_CRSRA_ENTRIES,
    ...NOAA_TIER_ENTRIES,
    ...ITAR_OVERLAY_ENTRIES,
    ...EU_GDPR_EO_ENTRIES,
    ...UK_GISA_SIA_ENTRIES,
    ...FR_LOA_EO_ENTRIES,
    ...DE_SATDSIG_ENTRIES,
    ...IT_CODICE_PRIVACY_ENTRIES,
  ];

/** Coverage metadata. */
export const REMOTE_SENSING_COVERAGE = {
  totalEntries: REMOTE_SENSING_REQUIREMENTS.length,
  byRegime: {
    "NOAA-CRSRA": REMOTE_SENSING_REQUIREMENTS.filter(
      (e) => e.regime === "NOAA-CRSRA",
    ).length,
    "NOAA-TIER": REMOTE_SENSING_REQUIREMENTS.filter(
      (e) => e.regime === "NOAA-TIER",
    ).length,
    "ITAR-XV-E": REMOTE_SENSING_REQUIREMENTS.filter(
      (e) => e.regime === "ITAR-XV-E",
    ).length,
    "EU-GDPR-EO": REMOTE_SENSING_REQUIREMENTS.filter(
      (e) => e.regime === "EU-GDPR-EO",
    ).length,
    "UK-GISA-SIA": REMOTE_SENSING_REQUIREMENTS.filter(
      (e) => e.regime === "UK-GISA-SIA",
    ).length,
    "FR-LOA-EO": REMOTE_SENSING_REQUIREMENTS.filter(
      (e) => e.regime === "FR-LOA-EO",
    ).length,
    "DE-SATDSIG": REMOTE_SENSING_REQUIREMENTS.filter(
      (e) => e.regime === "DE-SATDSIG",
    ).length,
    "IT-CODICE-PRIVACY": REMOTE_SENSING_REQUIREMENTS.filter(
      (e) => e.regime === "IT-CODICE-PRIVACY",
    ).length,
  },
  asOf: NOAA_CRSRA_AS_OF,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Find a single requirement by its code. */
export function findRemoteSensingEntry(
  code: string,
): RemoteSensingRequirementEntry | undefined {
  return REMOTE_SENSING_REQUIREMENTS.find((entry) => entry.code === code);
}

/** Find all entries for a given regime. */
export function findRemoteSensingByRegime(
  regime: RemoteSensingRegime,
): ReadonlyArray<RemoteSensingRequirementEntry> {
  return REMOTE_SENSING_REQUIREMENTS.filter((entry) => entry.regime === regime);
}

/** Find all entries for a given category. */
export function findRemoteSensingByCategory(
  category: RemoteSensingCategory,
): ReadonlyArray<RemoteSensingRequirementEntry> {
  return REMOTE_SENSING_REQUIREMENTS.filter(
    (entry) => entry.category === category,
  );
}

/**
 * Find all entries that apply to a given sensor type.
 * Returns entries whose `applicableSensorTypes` includes the requested
 * sensor type.
 */
export function findRemoteSensingBySensorType(
  sensorType: SensorType,
): ReadonlyArray<RemoteSensingRequirementEntry> {
  return REMOTE_SENSING_REQUIREMENTS.filter((entry) =>
    entry.applicableSensorTypes.includes(sensorType),
  );
}

/** Find all entries by binding nature. */
export function findRemoteSensingByBindingNature(
  bindingNature: RemoteSensingBindingNature,
): ReadonlyArray<RemoteSensingRequirementEntry> {
  return REMOTE_SENSING_REQUIREMENTS.filter(
    (entry) => entry.bindingNature === bindingNature,
  );
}

/**
 * Find mandatory remote-sensing requirements applicable to a specific
 * jurisdiction. Maps jurisdiction ISO-2 codes to the regimes that bind
 * operators there. US operators see NOAA + ITAR; EU operators see
 * national regimes + EU-GDPR-EO; UK operators see UK-GISA-SIA +
 * (UK)GDPR.
 */
export function findMandatoryRemoteSensingForJurisdiction(
  jurisdiction: string,
): ReadonlyArray<RemoteSensingRequirementEntry> {
  const jurisdictionRegimes: Record<
    string,
    ReadonlyArray<RemoteSensingRegime>
  > = {
    US: ["NOAA-CRSRA", "NOAA-TIER", "ITAR-XV-E"],
    GB: ["UK-GISA-SIA"],
    UK: ["UK-GISA-SIA"],
    DE: ["DE-SATDSIG", "EU-GDPR-EO"],
    FR: ["FR-LOA-EO", "EU-GDPR-EO"],
    IT: ["IT-CODICE-PRIVACY", "EU-GDPR-EO"],
    ES: ["EU-GDPR-EO"],
    NL: ["EU-GDPR-EO"],
    BE: ["EU-GDPR-EO"],
    SE: ["EU-GDPR-EO"],
    PL: ["EU-GDPR-EO"],
    AT: ["EU-GDPR-EO"],
    FI: ["EU-GDPR-EO"],
    DK: ["EU-GDPR-EO"],
  };
  const regimes = jurisdictionRegimes[jurisdiction.toUpperCase()] ?? [];
  return REMOTE_SENSING_REQUIREMENTS.filter(
    (entry) =>
      regimes.includes(entry.regime) && entry.bindingNature === "MANDATORY",
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
